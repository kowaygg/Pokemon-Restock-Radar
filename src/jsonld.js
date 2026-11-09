// Liest Produktdaten (Name, Preis, Verfügbarkeit) aus dem öffentlichen schema.org-JSON-LD einer Produktseite.
export function produktAusHtml(html) {
  const bloecke = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const kandidaten = [];
  const sammle = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(sammle);
    const typ = [].concat(o['@type'] || []);
    if (typ.includes('Product') || typ.includes('ProductGroup')) kandidaten.push(o);
    if (o['@graph']) sammle(o['@graph']);
    if (o.hasVariant) sammle(o.hasVariant);
  };
  for (const b of bloecke) { try { sammle(JSON.parse(b.trim())); } catch {} }
  for (const p of kandidaten) {
    const angebote = [].concat(p.offers?.offers || p.offers || []);
    const a = angebote.find((x) => x && (x.price || x.lowPrice)) || angebote[0];
    if (!a) continue;
    const preis = Number(String(a.price ?? a.lowPrice).replace(',', '.'));
    const verf = String(a.availability || '');
    return {
      name: p.name, preis, waehrung: a.priceCurrency,
      verfuegbar: /InStock|LimitedAvailability|OnlineOnly/i.test(verf),
      vorbestellung: /PreOrder|PreSale/i.test(verf),
      status: verf.replace(/^https?:\/\/schema\.org\//, ''),
      ean: p.gtin13 || p.gtin || p.ean || null,
    };
  }
  return null;
}
