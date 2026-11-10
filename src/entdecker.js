// Händler-Entdecker: sammelt Shops aus Deal-Meldungen (Händlername + Links) und prüft neue Shops,
// ob sie die öffentliche Shopify-Produktliste haben (dann leicht mit Preis einzubinden).
// Aktiviert wird nichts automatisch – erst nach Seriositätsprüfung (Impressum, Bewertungen).
import { USER_AGENT } from './haendler-pruefen.js';

const IGNORIEREN = /(^|\.)(mydealz|dealdoktor|monsterdealz|reddit|redd\.it|imgur|youtube|youtu\.be|instagram|tiktok|facebook|twitter|x\.com|bit\.ly|amzn|amazon|ebay|google|apple|t\.co|discord|whatsapp|telegram|pinterest|static|cloudfront|shopify|idealo|brickmerge|geizhals|billiger|guenstiger|preisvergleich|check24|tcgcheck|cardmarket|pricecharting)\b/;
// Händlername nur übernehmen, wenn er zur Adresse passt (Deal von Shop A kann auf Preisvergleich B verlinken)
const passt = (name, dom) => { const n = String(name || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, ''); return n.length > 2 && dom.replace(/[^a-z0-9]/g, '').includes(n.slice(0, 6)); };

export const domainAus = (url) => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };

// deals: [{ titel, link, haendler, links: [...] }]; bekannt: Set bereits geführter Domains (haendler.json)
export async function haendlerEntdecken(alt = {}, deals, bekannt, { jetzt = new Date(), holen = fetch, maxProben = 2 } = {}) {
  const liste = { ...alt };
  for (const d of deals) {
    for (const link of d.links || []) {
      const dom = domainAus(link);
      if (!dom || IGNORIEREN.test(dom) || bekannt.has(dom)) continue;
      const e = liste[dom] || { domain: dom, name: passt(d.haendler, dom) ? d.haendler : dom, titel: [], zuerst: jetzt.toISOString(), shopify: null };
      // Anzahl = verschiedene Deals (wiederholte Abrufe desselben Deals zählen nicht)
      if (!e.titel.includes(d.titel)) e.titel = [d.titel, ...e.titel].slice(0, 20);
      Object.assign(e, { anzahl: e.titel.length, zuletzt: jetzt.toISOString(), beispiel: link, name: e.name === dom && passt(d.haendler, dom) ? d.haendler : e.name });
      liste[dom] = e;
    }
  }
  // Wenige neue Shops pro Lauf prüfen: öffentliche Shopify-Produktliste vorhanden?
  let proben = 0;
  for (const e of Object.values(liste).filter((x) => x.shopify === null).sort((a, b) => b.anzahl - a.anzahl)) {
    if (proben++ >= maxProben) break;
    try {
      const r = await holen(`https://${e.domain}/products.json?limit=1`, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      e.shopify = r.ok && Array.isArray((await r.json().catch(() => ({}))).products);
    } catch { e.shopify = false; }
    e.geprueft = jetzt.toISOString();
  }
  return liste;
}
