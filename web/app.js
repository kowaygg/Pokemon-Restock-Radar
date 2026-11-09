// Pokémon-Restock-Radar – App. Liest data/oeffentlich.json (vom Wächter erzeugt) und zeigt die Reiter.
const ART_TEXT = {
  'top-trainer-box': 'Top-Trainer-Box', 'display-36': 'Display', 'booster-bundle': 'Booster-Bundle', 'mini-tin': 'Mini-Tin',
  tin: 'Tin', 'poster-kollektion': 'Poster-Kollektion', 'pin-kollektion': 'Pin-Kollektion', kollektion: 'Kollektion',
};
const TYP_TEXT = { neu: 'Neu lieferbar', 'wieder-da': 'Wieder da', vorbestellung: 'Vorbestellung offen', angekuendigt: 'Angekündigt' };
const SPRACHEN = [['DE', '🇩🇪 Deutsch'], ['EN', '🇬🇧 Englisch'], ['JP', '🇯🇵 Japanisch'], ['KR', '🇰🇷 Koreanisch'], ['CN', '🇨🇳 Chinesisch'], [null, 'Sprache nicht angegeben']];
const ABFRAGE_TEXT = { shopify: 'Shop-Feed', 'sitemap-jsonld': 'Sitemap + Preis', sitemap: 'nur Frühwarnung', mediamarkt: 'Suche – nur Handy im WLAN' };

let daten = null;
let reiter = 'top';
try { reiter = localStorage.getItem('reiter') || 'top'; } catch {}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => (Number.isFinite(n) ? n.toFixed(2).replace('.', ',') + ' €' : '–');
const zeit = (iso) => (iso ? new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
const sicherLink = (u) => (/^https:\/\//.test(u || '') ? u : null);

function bewertungHtml(b) {
  if (!b || b.stufe === 'unbekannt') return '<span class="unbekannt">UVP unbekannt</span>';
  if (b.stufe === 'unplausibel') return '<span class="unbekannt">weit unter UVP – vermutlich anderes Produkt</span>';
  const d = b.differenz;
  const text = d <= 0 ? `${euro(-d)} unter UVP` : `${euro(d)} über UVP`;
  return `<span class="${b.stufe === 'uvp' ? 'ok' : 'drueber'}">${b.stufe === 'uvp' ? '✅' : '⚠'} ${text} (UVP ${euro(b.uvp)})</span>`;
}

// Versand: bekannt → im Preis enthalten; 0 → versandkostenfrei; unbekannt → ehrlich „zzgl. Versand“
const versandText = (p) => p.versand === 0 ? '(versandkostenfrei)' : Number.isFinite(p.versand) ? `(inkl. ${euro(p.versand)} Versand)` : '(zzgl. Versand)';

function karte(p, { typ } = {}) {
  const link = sicherLink(p.link);
  const korb = sicherLink(p.warenkorb);
  return `<div class="karte${p.prioritaet === 1 ? ' ttb' : ''}">
    <div class="kopf"><span>${esc(p.haendler)}</span><span>${typ ? esc(TYP_TEXT[typ] || typ) + ' · ' : ''}${p.zeit ? zeit(p.zeit) : ''}</span></div>
    <div class="titel">${esc(p.titel)}</div>
    <div><span class="marke${p.prioritaet === 1 ? ' gelb' : ''}">${esc(ART_TEXT[p.art] || p.art || '?')}</span>${p.sprache ? `<span class="marke">${esc(p.sprache)}</span>` : ''}${p.vorbestellung ? '<span class="marke">Vorbestellung</span>' : ''}</div>
    <div><span class="preis">${euro(Number.isFinite(p.versand) ? p.preis + p.versand : p.preis)}</span> <span class="unbekannt">${versandText(p)}</span> · ${bewertungHtml(p.bewertung)}</div>
    <div class="knoepfe">${korb ? `<a class="knopf kauf" href="${esc(korb)}" target="_blank" rel="noopener">🛒 In den Warenkorb</a>` : ''}${link ? `<a class="knopf" href="${esc(link)}" target="_blank" rel="noopener">Zum Shop</a>` : ''}</div>
  </div>`;
}

const ansichten = {
  top() {
    const l = daten.top || [];
    const gruppen = SPRACHEN.map(([k, name]) => [name, l.filter((p) => (p.sprache || null) === k)]).filter(([, g]) => g.length);
    return `<p class="hinweis">Jetzt bestellbar, sealed, höchstens ${euro(daten.uvp?.spielraumEuro ?? 5)} über UVP – nach Sprache sortiert, Top-Trainer-Boxen zuerst. Preise inkl. Versand, wo der Händler ihn angibt.</p>`
      + (l.length ? gruppen.map(([name, g]) => `<h2>${esc(name)} (${g.length})</h2>${g.map((p) => karte(p)).join('')}`).join('')
        : '<div class="leer">Gerade kein Produkt zum UVP lieferbar. Sobald eins auftaucht, kommt sofort ein Push. 🔔</div>');
  },
  news() {
    const l = [...(daten.news || [])].sort((a, b) => b.zeit.localeCompare(a.zeit));
    const gruppen = [
      ['🚨 Pokémon Center', l.filter((n) => n.pokemonCenter)],
      ['📅 Releases & Vorbestellungen', l.filter((n) => !n.pokemonCenter && (n.art === 'release' || n.art === 'vorbestellung'))],
      ['🔮 Leaks & Ankündigungen', l.filter((n) => !n.pokemonCenter && n.art === 'leak')],
      ['💸 Deal-Hinweise (Community – Preis beim Händler prüfen)', l.filter((n) => !n.pokemonCenter && n.art === 'deal')],
      ['📰 Weitere News', l.filter((n) => !n.pokemonCenter && n.art === 'news')],
    ].filter(([, g]) => g.length);
    const STUFE = { A: 'offiziell', B: 'Fachseite', C: 'Community' };
    const eintrag = (n) => `<div class="karte${n.pokemonCenter || n.ttb ? ' ttb' : ''}">
      <div class="kopf"><span>${esc(n.quelle)} · ${esc(STUFE[n.stufe] || '')}</span><span>${zeit(n.zeit)}</span></div>
      <div class="titel">${esc(n.titel)}</div>
      ${n.bestaetigt ? '' : '<div><span class="marke">unbestätigt</span></div>'}
      <div class="knoepfe">${sicherLink(n.link) ? `<a class="knopf" href="${esc(n.link)}" target="_blank" rel="noopener">Lesen</a>` : ''}</div>
    </div>`;
    const links = [
      ['Pokémon Center DE', 'https://www.pokemoncenter.com/de-de'],
      ['Cardmarket: Top-Trainer-Boxen', 'https://www.cardmarket.com/de/Pokemon/Products/Search?searchString=Top-Trainer-Box'],
      ['Cardmarket: Elite Trainer Box', 'https://www.cardmarket.com/de/Pokemon/Products/Search?searchString=Elite+Trainer+Box'],
      ['mydealz Pokémon', 'https://www.mydealz.de/gruppe/pokemon'],
      ['Whatnot: Pokémon PSA', 'https://www.whatnot.com/search?query=pokemon%20psa'],
    ];
    return `<p class="hinweis">Offizielle News, Fachseiten und Community-Deals – neueste zuerst. Push kommt bei Vorbestellung/Release, Pokémon Center und Top-Trainer-Box-Deals. Leaks aus Shop-Quelltexten stehen im Reiter 🔭 Frühwarnung.</p>
      <div class="karte"><div class="titel">💡 Tipp: eBay, Whatnot &amp; eBay Live</div><div class="hinweis" style="margin:4px 0 0">Diese Plattformen darf das Radar nicht automatisch lesen. In der <b>eBay-App</b> eine Suche (z. B. „Pokémon Top Trainer Box“, Höchstpreis 60 €, Neu) speichern und Benachrichtigungen einschalten – dann meldet eBay neue Angebote selbst. In <b>Whatnot</b> und <b>eBay Live</b> Graded-Verkäufern folgen.</div></div>
      <div class="knoepfe" style="margin-bottom:12px">${links.map(([t, u]) => `<a class="knopf" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>`
      + (gruppen.length ? gruppen.map(([name, g]) => `<h2>${esc(name)} (${g.length})</h2>${g.slice(0, 40).map(eintrag).join('')}`).join('')
        : '<div class="leer">Noch keine News gesammelt.</div>');
  },
  vorort() {
    const news = [...(daten.news || [])].filter((n) => n.vorOrt).sort((a, b) => b.zeit.localeCompare(a.zeit));
    const neu = (daten.feed || []).filter((f) => f.vorOrt);
    const nachricht = (n) => `<div class="karte${n.ttb ? ' ttb' : ''}">
      <div class="kopf"><span>${esc(n.quelle)}</span><span>${zeit(n.zeit)}</span></div>
      <div class="titel">${esc(n.titel)}</div>
      <div>${n.abDatum ? `<span class="marke gelb">Start: ${esc(n.abDatum)}</span>` : ''}${n.bestaetigt ? '' : '<span class="marke">unbestätigt</span>'}</div>
      <div class="knoepfe">${sicherLink(n.link) ? `<a class="knopf" href="${esc(n.link)}" target="_blank" rel="noopener">Ansehen</a>` : ''}</div>
    </div>`;
    const laeden = [
      ['Müller Filialen', 'https://www.mueller.de/filialfinder/'],
      ['Rossmann Filialen', 'https://www.rossmann.de/de/filialen'],
      ['Thalia Freiburg', 'https://www.thalia.de/filialen'],
      ['Rombach Freiburg', 'https://www.rombach.de'],
      ['Aldi Süd Angebote', 'https://www.aldi-sued.de'],
      ['Lidl Angebote', 'https://www.lidl.de'],
      ['Kaufland Prospekt', 'https://www.kaufland.de'],
      ['Marktguru „Pokémon“', 'https://www.marktguru.de/search/pokemon'],
    ];
    return `<p class="hinweis">Aktionen und Neuheiten bei Ketten mit Filialen (Raum Freiburg 79117) – damit du als Erster im Laden stehst. Quellen: Deal-/News-Meldungen mit Ladenbezug und neue Pokémon-Produkte in den öffentlichen Seiten von Lidl, Aldi Süd, Rossmann und Müller.</p>
      <div class="karte"><div class="titel">💡 Tipp: Prospekt-Alarm</div><div class="hinweis" style="margin:4px 0 0">In den kostenlosen Apps <b>Marktguru</b> oder <b>kaufDA</b> „Pokémon“ als Favorit/Suchalarm speichern und Freiburg 79117 einstellen – die Apps melden dann neue Prospekt-Angebote. (Automatisch auslesen dürfen wir sie nicht.)</div></div>
      <div class="knoepfe" style="margin-bottom:12px">${laeden.map(([t, u]) => `<a class="knopf" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('')}</div>
      <h2>🗞️ Aktionen & Prospekt-Hinweise (${news.length})</h2>${news.length ? news.slice(0, 40).map(nachricht).join('') : '<div class="leer">Gerade keine Laden-Aktion gemeldet.</div>'}
      <h2>🆕 Neu bei den Ketten (${neu.length})</h2>${neu.length ? neu.slice(0, 40).map((f) => karte(f, { typ: f.typ })).join('') : '<div class="leer">Noch keine neuen Pokémon-Produkte bei Lidl, Aldi, Rossmann oder Müller entdeckt.</div>'}`;
  },
  meldungen() {
    const alle = (daten.feed || []).filter((f) => f.typ !== 'angekuendigt');
    const l = alle.filter((f) => f.jetzt === true);
    const weg = alle.length - l.length;
    return '<p class="hinweis">Neu lieferbar, wieder da oder Vorbestellung offen (letzte 14 Tage) – nur was laut letzter Prüfung <b>jetzt noch kaufbar</b> ist.</p>'
      + (l.length ? l.map((f) => karte(f, { typ: f.typ })).join('') : '<div class="leer">Gerade nichts davon kaufbar.</div>')
      + (weg ? `<p class="hinweis">${weg} ältere Meldung(en) ausgeblendet – inzwischen ausverkauft oder nicht mehr prüfbar.</p>` : '');
  },
  fruehwarnung() {
    const l = (daten.feed || []).filter((f) => f.typ === 'angekuendigt');
    return '<p class="hinweis">ℹ️ <b>Nur Info – noch nicht kaufbar.</b> Neue Produktseiten, oft Tage vor dem Verkaufsstart (aus öffentlichen Sitemaps). Sobald etwas kaufbar wird, kommt ein Push und es steht unter ⭐ Top.</p>'
      + (l.length ? l.map((f) => karte(f, { typ: f.typ })).join('') : '<div class="leer">Noch nichts Neues angekündigt.</div>');
  },
  markt() {
    const l = daten.lieferbar || [];
    return '<p class="hinweis">Alle gerade lieferbaren Top-Trainer-Boxen – auch über UVP, zum Vergleich.</p>'
      + (l.length ? l.map((p) => karte(p)).join('') : '<div class="leer">Keine lieferbar.</div>');
  },
  uvp() {
    const u = daten.uvp || { produkte: [], standardUvp: [] };
    // Asien-Ware: Yen/Won zum EZB-Kurs + Einfuhr-USt
    const inEuro = (p) => Number.isFinite(p.uvp) ? p.uvp : (u.kurse?.[p.waehrung] ? Math.round(p.betrag / u.kurse[p.waehrung] * (1 + (u.einfuhrUst ?? 0.19)) * 100) / 100 : NaN);
    const zeile = (p) => `<tr><td>${esc(p.name || ART_TEXT[p.art])}${p.sprache ? ` (${esc(p.sprache)})` : ''}</td><td>${euro(inEuro(p))}${p.betrag ? `<br><span class="unbekannt">${esc(p.betrag.toLocaleString('de-DE'))} ${esc(p.waehrung)}</span>` : ''}</td><td>${esc(p.sicherheit)}</td><td>${esc(p.erscheint || '')}</td></tr>`;
    return `<p class="hinweis">Treffer, wenn Preis + Versand ≤ UVP + ${euro(u.spielraumEuro)}. Stand ${esc(u.stand)}. Sicherheit „niedrig“ = noch nicht bestätigt. Asien-Ware: Preis in Yen/Won zum EZB-Kurs${u.kurseStand ? ` vom ${esc(u.kurseStand)}` : ''} + 19 % Einfuhr-USt.</p>
      <div class="tabelle"><table><tr><th>Produkt</th><th>UVP</th><th>Sicherheit</th><th>Erscheint</th></tr>
      ${u.produkte.map(zeile).join('')}${u.standardUvp.map((s) => zeile({ ...s, name: 'Standard: ' + (ART_TEXT[s.art] || s.art) })).join('')}</table></div>`;
  },
  haendler() {
    const l = daten.haendler || [];
    const status = (h) => h.status === 'gesperrt' ? `⛔ nicht abfragbar – ${esc(h.grund || '')}`
      : h.status === 'geplant' ? `🛠️ geplant – ${esc(h.grund || '')}`
      : h.status !== 'aktiv' ? '⚪ noch nicht geprüft'
      : h.abfrage === 'mediamarkt' ? '📱 läuft auf dem Handy (nur im WLAN, nur eigene Angebote)'
      : h.fehler ? `🔴 ${esc(h.fehler)}` : '🟢 läuft';
    const reihe = { aktiv: 0, geplant: 1, kandidat: 2, gesperrt: 3 };
    return `<p class="hinweis">Alle Händler mit Zustand. ⛔ = durch Bot-Schutz gesperrt (umgehen wir nie) – diese Shops decken News &amp; Leaks und der Reiter Vor Ort ab.</p>
      <div class="tabelle"><table><tr><th>Händler</th><th>Status</th><th>Art</th><th>Zuletzt</th></tr>
      ${l.sort((a, b) => (reihe[a.status] ?? 9) - (reihe[b.status] ?? 9)).map((h) => `<tr><td><a href="${esc(sicherLink(h.url) || '#')}" target="_blank" rel="noopener">${esc(h.name)}</a></td><td>${status(h)}</td><td>${esc(ABFRAGE_TEXT[h.abfrage] || '')}</td><td>${zeit(h.stand)}</td></tr>`).join('')}</table></div>`;
  },
};

function zeigen() {
  document.querySelectorAll('#reiter button').forEach((b) => b.classList.toggle('aktiv', b.dataset.reiter === reiter));
  document.getElementById('inhalt').innerHTML = daten ? (ansichten[reiter] || ansichten.top)() : '<div class="leer">Lade …</div>';
}

document.getElementById('reiter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  reiter = b.dataset.reiter;
  try { localStorage.setItem('reiter', reiter); } catch {}
  zeigen();
});

async function laden() {
  try {
    const r = await fetch('data/oeffentlich.json', { cache: 'no-store' });
    daten = await r.json();
    const min = Math.round((Date.now() - Date.parse(daten.letzterLauf)) / 60000);
    document.getElementById('stand').textContent = `Letzte Prüfung: ${zeit(daten.letzterLauf)} (vor ${min} Min.) · ${(daten.top || []).length} Top-Angebote`;
  } catch {
    document.getElementById('stand').textContent = 'Keine Verbindung – zeige letzten Stand.';
  }
  zeigen();
}

laden();
setInterval(laden, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) laden(); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
