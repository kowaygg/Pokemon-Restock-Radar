// MediaMarkt/Saturn: öffentliche Suche (schema.org-ItemList mit Name, Preis, Link). Die meisten Treffer sind Marktplatz-Händler
// mit Scalper-Preisen – deshalb wird nur bei einem UVP-Treffer die Produktseite geöffnet und geprüft, ob MediaMarkt/Saturn selbst
// verkauft und es lieferbar ist. Von GitHub aus durch Bot-Schutz gesperrt → läuft nur im Handy-Wächter (im WLAN).
import { USER_AGENT } from './haendler-pruefen.js';

export function sucheLesen(html, basis) {
  const m = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  let ld;
  try { ld = JSON.parse(m[1]); } catch { return []; }
  return (ld.itemListElement || []).map((e) => e.item).filter((p) => p?.url && p.offers).map((p) => ({
    id: (p.url.match(/-(\d+)\.html/) || [])[1] || p.url,
    titel: p.name,
    preis: Number(p.offers.price),
    link: p.url.startsWith('http') ? p.url : basis + p.url,
  }));
}

// Produktseite: verkauft MediaMarkt/Saturn selbst? lieferbar?
export function produktseiteLesen(html) {
  const verkaeufer = (html.match(/"sellerName":"([^"]+)"/) || [])[1] || null;
  const eigen = !verkaeufer || /media ?markt|saturn/i.test(verkaeufer);
  const verfuegbar = /"availability":"https?:\/\/schema\.org\/(InStock|LimitedAvailability|OnlineOnly)"/.test(html);
  const vorbestellung = /"availability":"https?:\/\/schema\.org\/(PreOrder|PreSale)"/.test(html);
  return { verkaeufer, eigen, verfuegbar, vorbestellung };
}

async function text(url, holen) {
  const r = await holen(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'de-DE' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// pruefen(p) → true, wenn der Preis ein UVP-Treffer ist (nur dann wird die Produktseite geöffnet)
export async function mediamarktHolen(h, { holen = fetch, suchen = ['pokemon top trainer box'], pruefen = () => false, pause = 1500 } = {}) {
  const basis = new URL(h.url).origin;
  const produkte = new Map();
  for (const q of suchen) {
    const html = await text(`${basis}/de/search.html?query=${encodeURIComponent(q)}`, holen);
    for (const p of sucheLesen(html, basis)) produkte.set(p.id, p);
    if (pause) await new Promise((res) => setTimeout(res, pause));
  }
  const liste = [...produkte.values()];
  for (const p of liste) {
    p.marktplatz = true; p.verfuegbar = false;
    if (!pruefen(p)) continue;
    try {
      const s = produktseiteLesen(await text(p.link, holen));
      Object.assign(p, { marktplatz: !s.eigen, verkaeufer: s.verkaeufer, verfuegbar: s.eigen && (s.verfuegbar || s.vorbestellung), vorbestellung: s.vorbestellung });
    } catch {}
    if (pause) await new Promise((res) => setTimeout(res, pause));
  }
  return liste;
}
