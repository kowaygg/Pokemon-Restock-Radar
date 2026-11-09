// Findet Produkt-URLs über die öffentliche Sitemap eines Shops (robots.txt → Sitemap: …). Unterstützt Sitemap-Index und .gz.
import { gunzipSync } from 'node:zlib';
import { USER_AGENT } from './haendler-pruefen.js';

export const locs = (xml) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
export const istIndex = (xml) => /<sitemapindex/i.test(xml);
export const pokemonUrl = (u) => /pok[eé%]?[ée]?mon|pokemon/i.test(decodeURIComponent(u));

async function holenText(url, holen) {
  const r = await holen(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return (url.endsWith('.gz') || (buf[0] === 0x1f && buf[1] === 0x8b)) ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
}

// Ergebnis: { sitemaps: [...], gelesen: n, urls: [pokemon-urls] }
export async function sitemapPokemon(origin, { holen = fetch, maxDateien = 25 } = {}) {
  let start = [];
  try {
    const robots = await holenText(origin + '/robots.txt', holen);
    start = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  } catch {}
  if (!start.length) start = [origin + '/sitemap.xml'];
  const warteschlange = [...start];
  const gesehen = new Set();
  const urls = new Set();
  let gelesen = 0;
  while (warteschlange.length && gelesen < maxDateien) {
    const s = warteschlange.shift();
    if (gesehen.has(s)) continue;
    gesehen.add(s);
    let xml;
    try { xml = await holenText(s, holen); gelesen++; } catch { continue; }
    if (istIndex(xml)) {
      // Produkt-Sitemaps zuerst
      const kinder = locs(xml).sort((a, b) => Number(/produc|artikel|item|p-|article/i.test(b)) - Number(/produc|artikel|item|p-|article/i.test(a)));
      warteschlange.unshift(...kinder);
    } else for (const u of locs(xml)) if (pokemonUrl(u)) urls.add(u);
  }
  return { sitemaps: start, gelesen, urls: [...urls] };
}
