// Vergleicht einen Preis mit der UVP-Liste (config/uvp.json).
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');

// Asiatische Ausgaben (JP/KR/CN …) haben andere Inhalte und Preise → nur mit Einträgen derselben Sprache vergleichen
// (Feld "sprache" in config/uvp.json). Ohne passenden Eintrag: UVP unbekannt, also nie ein falscher Treffer.
// Japanische Set-Codes haben einen Buchstaben-Zusatz (M6a, SV8a, S12a) – deutsche/englische nicht (ME06, SV10)
const ASIA = { JP: /\b(jp|jpn|jap|japanisch|japanese|m\d{1,2}[a-z]|sv\d{1,2}[a-z]|s\d{1,2}[a-z])\b/, KR: /\b(kor|korean|koreanisch)\b/, CN: /\b(chn|cn|chinese|chinesisch|simplified|traditional)\b/, ANDERE: /\b(thai|indonesisch|indonesian)\b/ };
const ausgabe = (t) => Object.keys(ASIA).find((k) => ASIA[k].test(t)) || null;
// Wörter, die in jedem Produktnamen vorkommen können – alle übrigen Namenswörter müssen im Titel stehen
const ALLGEMEIN = new Set(['kollektion', 'collection', 'booster', 'boosters', 'display', 'bundle', 'trainer', 'elite', 'mini', 'promo', 'promos', 'pokemon', 'pack', 'packs', 'korea', 'japan', 'china']);
const namePasst = (p, t) => norm(p.name).split(/\s+/).filter((w) => w.length > 3 && !/^\d+$/.test(w) && !ALLGEMEIN.has(w) && !norm(p.set).includes(w)).every((w) => t.includes(w));
// Preis weit unter UVP = vermutlich anderes/kleineres Produkt (z. B. Mini-Display) → nicht als Treffer werten
const MINDEST_ANTEIL = 0.7;

// Einträge in Fremdwährung (betrag + waehrung, z. B. 6000 JPY) → Euro zum EZB-Tageskurs (liste.kurse) + Einfuhr-USt
// (liste.einfuhrUst, Standard 19 %), weil Ware in der EU immer mit Mehrwertsteuer verkauft wird. Ohne Kurs: Eintrag zählt nicht.
function inEuro(p, liste) {
  if (Number.isFinite(p.uvp)) return p;
  if (p.waehrung === 'EUR' && Number.isFinite(p.betrag)) return { ...p, uvp: Math.round(p.betrag * 100) / 100, ...(Number.isFinite(p.betragVon) ? { uvpVon: Math.round(p.betragVon * 100) / 100 } : {}) };
  const kurs = liste.kurse?.[p.waehrung];
  if (!Number.isFinite(p.betrag) || !kurs) return null;
  const euro = (b) => Math.round((b / kurs) * (1 + (liste.einfuhrUst ?? 0.19)) * 100) / 100;
  return { ...p, uvp: euro(p.betrag), ...(Number.isFinite(p.betragVon) ? { uvpVon: euro(p.betragVon) } : {}) };
}

// Packzahl aus dem Titel („30er“, „18 Booster“, „10 Packs“) – nicht Bandnummern („Gem Pack Vol. 2 Booster Box“);
// ein Display hat mindestens 6 Packs, kleinere Zahlen sind keine Packzahl der Box
function packZahl(t, art) {
  const m = t.match(/(?<!vol\s{0,2})\b(\d{1,2}) ?(er|booster|packs?|boosterpacks|pack box)\b/);
  const n = m ? Number(m[1]) : null;
  return n && (art !== 'display-36' || n >= 6) ? n : null;
}

// Asien-Ware ohne eigenen Eintrag: UVP = Packzahl × offizieller Packpreis (liste.packPreise je Sprache).
// Packzahl aus dem Titel („30er Display“, „10 Booster“), sonst Standard-Box der Sprache (JP: 30 Packs).
function ausPackpreis(t, art, asia, liste) {
  let pp = liste.packPreise?.[asia];
  if (!pp || !['display-36', 'booster-bundle'].includes(art)) return null;
  const imTitel = packZahl(t, art);
  // Packzahl: aus dem Titel, sonst Standard-Box der Sprache, sonst angenommene Box (→ nur Richtwert, kein Treffer)
  const angenommen = !imTitel && !pp.standardBox && art === 'display-36' ? pp.angenommeneBox : null;
  const n = imTitel || (art === 'display-36' ? pp.standardBox : null) || angenommen;
  if (!n) return null;
  if (angenommen) pp = { ...pp, richtwert: true, notiz: `${pp.notiz || ''} Packzahl nicht im Titel – ${angenommen} angenommen`.trim() };
  const e = inEuro({ betrag: n * pp.betrag, ...(pp.betragVon ? { betragVon: n * pp.betragVon } : {}), waehrung: pp.waehrung }, liste);
  return e ? { ...e, art, name: `${n} Packs × ${pp.betragVon ? pp.betragVon + '–' : ''}${pp.betrag} ${pp.waehrung}`, sicherheit: pp.sicherheit, richtwert: !!pp.richtwert, quellen: pp.quellen, quelle: 'packpreis' } : null;
}

// Bestes passendes Produkt aus der Liste: gleiche Art und alle Wörter des Set-Namens im Titel
export function uvpFinden(titel, art, liste) {
  const t = norm(titel);
  const asia = ausgabe(t);
  const gleicheAusgabe = (p) => (p.sprache && ['JP', 'KR', 'CN', 'ANDERE'].includes(p.sprache) ? p.sprache : null) === asia;
  // Display-UVP (DE/EN) gilt für 36 Booster; 10er/18er/30er-Displays sind andere Produkte
  const anzahl = packZahl(t, art);
  if (!asia && art === 'display-36' && anzahl && anzahl !== 36) return ausPackpreis(t, art, 'DE', liste);
  const passend = liste.produkte.filter((p) => p.art === art && gleicheAusgabe(p) && namePasst(p, t) && norm(p.set).split(/\s+/).filter((w) => w.length > 3 && !['mega', 'entwicklung'].includes(w)).every((w) => t.includes(w)))
    .map((p) => inEuro(p, liste)).filter(Boolean);
  if (passend.length) return { ...passend.sort((a, b) => a.uvp - b.uvp)[0], quelle: 'produkt' };
  if (asia) { const pp = ausPackpreis(t, art, asia, liste); if (pp) return pp; }
  const std = inEuro(liste.standardUvp.find((s) => s.art === art && gleicheAusgabe(s)) || {}, liste);
  return std?.art ? { ...std, name: 'Standard-UVP ' + art, quelle: 'standard' } : null;
}

// Versandkosten eines Händlers (config/haendler.json → versand: { euro, freiAb }); null = unbekannt
export function versandFuer(h, preis) {
  const v = h?.versand;
  if (!v) return null;
  if (Number.isFinite(v.freiAb) && preis >= v.freiAb) return 0;
  return Number.isFinite(v.euro) ? v.euro : null;
}

// Ergebnis: 'uvp' (≤ UVP + Spielraum), 'drueber', 'unplausibel' (weit unter UVP), 'spanne' oder 'unbekannt'.
// 'spanne' = Preis liegt in einer breiten UVP-Spanne bzw. nur Richtwert → anzeigen, aber kein Treffer/Push (sonst Fehlalarme).
export function preisBewertung(preis, uvp, spielraum) {
  if (!uvp || !Number.isFinite(preis)) return { stufe: 'unbekannt' };
  const differenz = Math.round((preis - uvp.uvp) * 100) / 100;
  const unten = uvp.uvpVon ?? uvp.uvp;
  const breit = uvp.richtwert || (Number.isFinite(uvp.uvpVon) && uvp.uvp - uvp.uvpVon > 6);
  const stufe = preis < unten * MINDEST_ANTEIL ? 'unplausibel' : preis > uvp.uvp + spielraum ? 'drueber' : breit ? 'spanne' : 'uvp';
  return { stufe, differenz, basis: uvp.name || null, betrag: uvp.betrag ?? null, waehrung: uvp.waehrung ?? null, uvp: uvp.uvp, ...(Number.isFinite(uvp.uvpVon) ? { uvpVon: uvp.uvpVon } : {}), sicherheit: uvp.sicherheit, ...(uvp.richtwert ? { richtwert: true } : {}) };
}

// Push bei pushNurUvp: nur echte UVP-Treffer, Frühwarnungen ohne Preis und Graded-Treffer (eigene Preisgrenze)
export const pushWert = (m) => m.typ === 'graded' || m.bewertung.stufe === 'uvp' || (m.bewertung.stufe === 'unbekannt' && !Number.isFinite(m.preis));
