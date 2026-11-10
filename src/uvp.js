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
  const kurs = liste.kurse?.[p.waehrung];
  if (!Number.isFinite(p.betrag) || !kurs) return null;
  return { ...p, uvp: Math.round((p.betrag / kurs) * (1 + (liste.einfuhrUst ?? 0.19)) * 100) / 100 };
}

// Bestes passendes Produkt aus der Liste: gleiche Art und alle Wörter des Set-Namens im Titel
export function uvpFinden(titel, art, liste) {
  const t = norm(titel);
  const asia = ausgabe(t);
  const gleicheAusgabe = (p) => (p.sprache && ['JP', 'KR', 'CN', 'ANDERE'].includes(p.sprache) ? p.sprache : null) === asia;
  // Display-UVP (DE/EN) gilt für 36 Booster; 10er/18er/30er-Displays sind andere Produkte
  const anzahl = t.match(/\b(\d{1,2}) ?(er|booster|packs?|boosterpacks)\b/);
  if (!asia && art === 'display-36' && anzahl && anzahl[1] !== '36') return null;
  const passend = liste.produkte.filter((p) => p.art === art && gleicheAusgabe(p) && namePasst(p, t) && norm(p.set).split(/\s+/).filter((w) => w.length > 3 && !['mega', 'entwicklung'].includes(w)).every((w) => t.includes(w)))
    .map((p) => inEuro(p, liste)).filter(Boolean);
  if (passend.length) return { ...passend.sort((a, b) => a.uvp - b.uvp)[0], quelle: 'produkt' };
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

// Ergebnis: 'uvp' (≤ UVP + Spielraum), 'drueber', 'unplausibel' (weit unter UVP) oder 'unbekannt'
export function preisBewertung(preis, uvp, spielraum) {
  if (!uvp || !Number.isFinite(preis)) return { stufe: 'unbekannt' };
  const differenz = Math.round((preis - uvp.uvp) * 100) / 100;
  const stufe = preis < uvp.uvp * MINDEST_ANTEIL ? 'unplausibel' : preis <= uvp.uvp + spielraum ? 'uvp' : 'drueber';
  return { stufe, differenz, uvp: uvp.uvp, sicherheit: uvp.sicherheit };
}

// Push bei pushNurUvp: nur echte UVP-Treffer, Frühwarnungen ohne Preis und Graded-Treffer (eigene Preisgrenze)
export const pushWert = (m) => m.typ === 'graded' || m.bewertung.stufe === 'uvp' || (m.bewertung.stufe === 'unbekannt' && !Number.isFinite(m.preis));
