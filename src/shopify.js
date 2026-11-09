// Liest die öffentliche Produktliste eines Shopify-Shops (/products.json) – offizielles Format, kein Scraping von HTML.
import { USER_AGENT } from './haendler-pruefen.js';

export function produkteAusShopify(json, basis) {
  return (json.products || []).map((p) => {
    const varianten = p.variants || [];
    const verfuegbar = varianten.some((v) => v.available);
    const preise = varianten.filter((v) => v.available).map((v) => Number(v.price)).filter(Number.isFinite);
    const allePreise = varianten.map((v) => Number(v.price)).filter(Number.isFinite);
    const kaufVariante = varianten.find((v) => v.available);
    return {
      id: String(p.id),
      titel: p.title,
      marke: p.vendor,
      tags: Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',').map((s) => s.trim()),
      verfuegbar,
      preis: (preise.length ? Math.min(...preise) : allePreise.length ? Math.min(...allePreise) : NaN),
      link: `${basis}/products/${p.handle}`,
      // Shopify-Warenkorb-Link: legt die Variante direkt in den Warenkorb und öffnet die Kasse
      warenkorb: kaufVariante ? `${basis}/cart/${kaufVariante.id}:1` : null,
      veroeffentlicht: p.published_at,
    };
  });
}

// limit < 250: nur die zuletzt geänderten Produkte (Schnellcheck des Handy-Wächters, spart Datenvolumen)
export async function shopifyHolen(haendler, { holen = fetch, maxSeiten = 8, limit = 250 } = {}) {
  const basis = new URL(haendler.url).origin;
  const pfad = haendler.sammlung ? `/collections/${haendler.sammlung}/products.json` : '/products.json';
  const alle = [];
  for (let seite = 1; seite <= maxSeiten; seite++) {
    const r = await holen(`${basis}${pfad}?limit=${limit}&page=${seite}`, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const teil = produkteAusShopify(await r.json(), basis);
    alle.push(...teil);
    if (teil.length < limit) break;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return alle;
}
