// Wächter für Händler ohne Shopify: öffentliche Sitemap (neue Produkt-URLs = Frühwarnung) + JSON-LD der Produktseite (Preis/Bestand).
// abfrage "sitemap-jsonld": neue URLs + Produktseiten rotierend prüfen (Restock). abfrage "sitemap": nur neue URLs melden.
// Sitemap nur alle sitemapMinuten neu lesen (schont Händler + Datenvolumen), Produktseiten höchstens seitenProLauf pro Lauf.
import { sitemapPokemon } from './sitemap.js';
import { produktAusHtml } from './jsonld.js';
import { produktArt, sprache, istVorbestellung } from './produkt.js';
import { USER_AGENT } from './haendler-pruefen.js';

const STANDARD_FILTER = 'tcg|sammelkart|trading.?card|booster|trainer|display|tin|kollektion|collection|bundle';

// Lesbarer Titel aus der URL: längster Pfadteil, ohne Endungen/Nummern
export function titelAusUrl(url) {
  const teile = decodeURIComponent(new URL(url).pathname).split('/').filter((t) => t && !/^(html|product|produkt|p|de|artikel)$/i.test(t) && !/^\d+$/.test(t));
  const t = teile.sort((a, b) => b.length - a.length)[0] || '';
  return t.replace(/\.(html?|php)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Sealed-Kandidaten aus einer URL-Liste: richtige Domain, Filterwort im Pfad, als Produktart erkannt
export function sealedUrls(urls, h) {
  const host = new URL(h.url).host.replace(/^www\./, '');
  const filter = new RegExp(h.urlFilter || STANDARD_FILTER, 'i');
  const aus = [];
  for (const u of urls) {
    let url;
    try { url = new URL(u); } catch { continue; }
    if (url.host.replace(/^www\./, '') !== host) continue;
    const titel = titelAusUrl(u);
    if (!filter.test(decodeURIComponent(url.pathname))) continue;
    const art = produktArt(titel);
    if (art) aus.push({ url: u, titel, ...art });
  }
  return aus;
}

async function seiteLesen(url, holen) {
  const r = await holen(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'de-DE' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return produktAusHtml(await r.text());
}

// alt: gemerkter Stand { urls: {url: {v, p, g}}, sitemapZeit, zeiger }. Ergebnis: { meldungen, stand, info }
export async function sitemapWaechter(h, alt, { jetzt = new Date(), holen = fetch, sitemapMinuten = 30, seitenProLauf = 10, pause = 1000, maxDateien = 25 } = {}) {
  const stand = { urls: { ...(alt?.urls || {}) }, sitemapZeit: alt?.sitemapZeit || null, zeiger: alt?.zeiger || 0 };
  const ersterLauf = !alt;
  const meldungen = [];
  const info = { sitemapGelesen: false, kandidaten: Object.keys(stand.urls).length, seiten: 0 };
  const mitPreis = h.abfrage === 'sitemap-jsonld';

  // 1) Sitemap: neue URLs finden
  const faellig = !stand.sitemapZeit || jetzt - Date.parse(stand.sitemapZeit) >= sitemapMinuten * 60000;
  const neueUrls = [];
  if (faellig) {
    const s = await sitemapPokemon(new URL(h.url).origin, { holen, maxDateien });
    const sealed = sealedUrls(s.urls, h);
    if (!sealed.length && s.gelesen === 0) throw new Error('Sitemap nicht lesbar');
    for (const k of sealed) {
      if (stand.urls[k.url]) continue;
      stand.urls[k.url] = { g: jetzt.toISOString(), v: null, p: null };
      if (!ersterLauf) neueUrls.push(k);
    }
    stand.sitemapZeit = jetzt.toISOString();
    info.sitemapGelesen = true;
    info.kandidaten = Object.keys(stand.urls).length;
  }

  const meldung = (k, typ, p) => ({
    typ, id: k.url, titel: p?.name || k.titel, art: k.art, prioritaet: k.prioritaet, link: k.url,
    preis: p ? p.preis : NaN, verfuegbar: !!p?.verfuegbar, vorbestellung: !!p?.vorbestellung,
    sprache: sprache(p?.name || k.titel), haendler: h.name, haendlerId: h.id, quelle: 'sitemap',
  });

  // 2) Nur Sitemap: jede neue URL ist eine Frühwarnung
  if (!mitPreis) {
    for (const k of neueUrls) meldungen.push(meldung(k, 'angekuendigt', null));
    return { meldungen, stand, info };
  }

  // 3) Mit Preis: neue URLs sofort prüfen, danach bekannte rotierend (wichtige zuerst)
  const bekannt = Object.keys(stand.urls).map((url) => ({ url, titel: titelAusUrl(url), ...(produktArt(titelAusUrl(url)) || { prioritaet: 9 }) }))
    .sort((a, b) => a.prioritaet - b.prioritaet || a.url.localeCompare(b.url));
  const neuSet = new Set(neueUrls.map((k) => k.url));
  const rest = Math.max(0, seitenProLauf - neueUrls.length);
  const rotation = bekannt.filter((k) => !neuSet.has(k.url));
  const auswahl = [...neueUrls];
  for (let i = 0; i < Math.min(rest, rotation.length); i++) auswahl.push(rotation[(stand.zeiger + i) % rotation.length]);
  stand.zeiger = rotation.length ? (stand.zeiger + rest) % rotation.length : 0;

  for (const k of auswahl) {
    let p = null;
    try { p = await seiteLesen(k.url, holen); } catch { continue; }
    info.seiten++;
    const vorher = stand.urls[k.url] || {};
    if (p) {
      p.vorbestellung = p.vorbestellung || istVorbestellung({ titel: p.name });
      const war = vorher.v;
      stand.urls[k.url] = { ...vorher, v: p.verfuegbar || p.vorbestellung, p: p.preis };
      if (neuSet.has(k.url)) meldungen.push(meldung(k, p.vorbestellung ? 'vorbestellung' : p.verfuegbar ? 'neu' : 'angekuendigt', p));
      else if (war === false && (p.verfuegbar || p.vorbestellung)) meldungen.push(meldung(k, p.vorbestellung ? 'vorbestellung' : 'wieder-da', p));
    } else if (neuSet.has(k.url)) meldungen.push(meldung(k, 'angekuendigt', null));
    if (pause) await new Promise((res) => setTimeout(res, pause));
  }
  return { meldungen, stand, info };
}
