// Pokémon-Restock-Radar – App. Liest data/oeffentlich.json (vom Wächter erzeugt) und zeigt die Reiter.
const ART_TEXT = {
  'top-trainer-box': 'Top-Trainer-Box', 'display-36': 'Display', 'booster-bundle': 'Booster-Bundle', 'mini-tin': 'Mini-Tin',
  tin: 'Tin', 'poster-kollektion': 'Poster-Kollektion', 'pin-kollektion': 'Pin-Kollektion', kollektion: 'Kollektion',
};
const TYP_TEXT = { neu: 'Neu lieferbar', 'wieder-da': 'Wieder da', vorbestellung: 'Vorbestellung offen', angekuendigt: 'Angekündigt' };
const SPRACHEN = [['DE', '🇩🇪 Deutsch'], ['EN', '🇬🇧 Englisch'], ['JP', '🇯🇵 Japanisch'], ['KR', '🇰🇷 Koreanisch'], ['CN', '🇨🇳 Chinesisch'], [null, 'Sprache nicht angegeben']];
const ABFRAGE_TEXT = { shopify: 'Shop-Feed', 'sitemap-jsonld': 'Sitemap + Preis', sitemap: 'nur Frühwarnung' };

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

function karte(p, { typ } = {}) {
  const link = sicherLink(p.link);
  const korb = sicherLink(p.warenkorb);
  return `<div class="karte${p.prioritaet === 1 ? ' ttb' : ''}">
    <div class="kopf"><span>${esc(p.haendler)}</span><span>${typ ? esc(TYP_TEXT[typ] || typ) + ' · ' : ''}${p.zeit ? zeit(p.zeit) : ''}</span></div>
    <div class="titel">${esc(p.titel)}</div>
    <div><span class="marke${p.prioritaet === 1 ? ' gelb' : ''}">${esc(ART_TEXT[p.art] || p.art || '?')}</span>${p.sprache ? `<span class="marke">${esc(p.sprache)}</span>` : ''}${p.vorbestellung ? '<span class="marke">Vorbestellung</span>' : ''}</div>
    <div><span class="preis">${euro(p.preis)}</span> · ${bewertungHtml(p.bewertung)}</div>
    <div class="knoepfe">${korb ? `<a class="knopf kauf" href="${esc(korb)}" target="_blank" rel="noopener">🛒 In den Warenkorb</a>` : ''}${link ? `<a class="knopf" href="${esc(link)}" target="_blank" rel="noopener">Zum Shop</a>` : ''}</div>
  </div>`;
}

const ansichten = {
  top() {
    const l = daten.top || [];
    const gruppen = SPRACHEN.map(([k, name]) => [name, l.filter((p) => (p.sprache || null) === k)]).filter(([, g]) => g.length);
    return `<p class="hinweis">Jetzt bestellbar, sealed, höchstens ${euro(daten.uvp?.spielraumEuro ?? 5)} über UVP – nach Sprache sortiert, Top-Trainer-Boxen zuerst. Versand kommt beim Händler noch dazu.</p>`
      + (l.length ? gruppen.map(([name, g]) => `<h2>${esc(name)} (${g.length})</h2>${g.map((p) => karte(p)).join('')}`).join('')
        : '<div class="leer">Gerade kein Produkt zum UVP lieferbar. Sobald eins auftaucht, kommt sofort ein Push. 🔔</div>');
  },
  meldungen() {
    const l = (daten.feed || []).filter((f) => f.typ !== 'angekuendigt');
    return '<p class="hinweis">Neu lieferbar, wieder da oder Vorbestellung offen (letzte 14 Tage).</p>'
      + (l.length ? l.map((f) => karte(f, { typ: f.typ })).join('') : '<div class="leer">Noch keine Meldungen.</div>');
  },
  fruehwarnung() {
    const l = (daten.feed || []).filter((f) => f.typ === 'angekuendigt');
    return '<p class="hinweis">Neue Produktseiten, die noch nicht bestellbar sind – oft Tage vor dem Verkaufsstart (aus öffentlichen Sitemaps).</p>'
      + (l.length ? l.map((f) => karte(f, { typ: f.typ })).join('') : '<div class="leer">Noch nichts Neues angekündigt.</div>');
  },
  markt() {
    const l = daten.lieferbar || [];
    return '<p class="hinweis">Alle gerade lieferbaren Top-Trainer-Boxen – auch über UVP, zum Vergleich.</p>'
      + (l.length ? l.map((p) => karte(p)).join('') : '<div class="leer">Keine lieferbar.</div>');
  },
  uvp() {
    const u = daten.uvp || { produkte: [], standardUvp: [] };
    const zeile = (p) => `<tr><td>${esc(p.name || ART_TEXT[p.art])}</td><td>${euro(p.uvp)}</td><td>${esc(p.sicherheit)}</td><td>${esc(p.erscheint || '')}</td></tr>`;
    return `<p class="hinweis">Treffer, wenn Preis + Versand ≤ UVP + ${euro(u.spielraumEuro)}. Stand ${esc(u.stand)}. Sicherheit „niedrig“ = noch nicht bestätigt.</p>
      <div class="tabelle"><table><tr><th>Produkt</th><th>UVP</th><th>Sicherheit</th><th>Erscheint</th></tr>
      ${u.produkte.map(zeile).join('')}${u.standardUvp.map((s) => zeile({ ...s, name: 'Standard: ' + (ART_TEXT[s.art] || s.art) })).join('')}</table></div>`;
  },
  haendler() {
    const l = daten.haendler || [];
    const status = (h) => h.status !== 'aktiv' ? '⚪ noch nicht überwacht' : h.fehler ? `🔴 ${esc(h.fehler)}` : '🟢 läuft';
    return `<p class="hinweis">Überwachte Händler und ihr Zustand. Geschützte Shops (MediaMarkt, Saturn, Pokémon Center …) kommen mit dem Handy-Wächter.</p>
      <div class="tabelle"><table><tr><th>Händler</th><th>Status</th><th>Art</th><th>Zuletzt</th></tr>
      ${l.sort((a, b) => (a.status === 'aktiv' ? 0 : 1) - (b.status === 'aktiv' ? 0 : 1)).map((h) => `<tr><td><a href="${esc(sicherLink(h.url) || '#')}" target="_blank" rel="noopener">${esc(h.name)}</a></td><td>${status(h)}</td><td>${esc(ABFRAGE_TEXT[h.abfrage] || '')}</td><td>${zeit(h.stand)}</td></tr>`).join('')}</table></div>`;
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
