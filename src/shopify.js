// Liest die öffentliche Produktliste eines Shopify-Shops (/products.json) – offizielles Format, kein Scraping von HTML.
import { USER_AGENT } from './haendler-pruefen.js';

export function produkteAusShopify(json, basis) {
  return (json.products || []).map((p) => {
    const varianten = p.variants || [];
    const verfuegbar = varianten.some((v) => v.available);
    const preise = varianten.filter((v) => v.available).map((v) => Number(v.price)).filter(Number.isFinite);
    const allePreise = varianten.map((v) => Number(v.price)).filter(Number.isFinite);
    return {
      id: String(p.id),
      titel: p.title,
      marke: p.vendor,
      tags: Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((s) => s.trim()),
      verfuegbar,
      preis: (preise.length ? Math.min(...preise) : allePreise.length ? Math.min(...allePreise) : NaN),
      link: `${basis}/products/${p.handle}`,
      veroeffentlicht: p.published_at,
    };
  });
}

export async function shopifyHolen(haendler, { holen = fetch, maxSeiten = 8 } = {}) {
  const basis = new URL(haendler.url).origin;
  const pfad = haendler.sammlung ? `/collections/${haendler.sammlung}/products.json` : '/products.json';
  const alle = [];
  for (let seite = 1; seite <= maxSeiten; seite++) {
    const r = await holen(`${basis}${pfad}?limit=250&page=${seite}`, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const teil = produkteAusShopify(await r.json(), basis);
    alle.push(...teil);
    if (teil.length < 250) break;
    await new Promise((res) => setTimeout(res, 800));
  }
  return alle;
}
