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
  return produktAusMicrodata(html);
}

// Ersatz für Shops ohne JSON-LD (z. B. JTL/Shopware): schema.org-Microdata (itemprop="price"/"availability") bzw. Meta-Tags
export function produktAusMicrodata(html) {
  const attr = (prop) => {
    const m = html.match(new RegExp(`itemprop="${prop}"[^>]*?(?:content|href)="([^"]+)"`)) || html.match(new RegExp(`(?:content|href)="([^"]+)"[^>]*?itemprop="${prop}"`));
    return m ? m[1] : null;
  };
  const preisText = attr('price') || (html.match(/(?:product:price:amount|og:price:amount)"\s+content="([^"]+)"/) || [])[1];
  const preis = Number(String(preisText || '').replace(',', '.'));
  if (!Number.isFinite(preis) || preis <= 0) return null;
  const verf = attr('availability') || (html.match(/product:availability"\s+content="([^"]+)"/) || [])[1] || '';
  const name = (html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) || [])[1] || (html.match(/itemprop="name"[^>]*>([^<]+)</) || [])[1] || null;
  return {
    name: name ? name.replace(/&amp;/g, '&').trim() : null, preis, waehrung: attr('priceCurrency') || 'EUR',
    verfuegbar: /InStock|LimitedAvailability|OnlineOnly|in stock/i.test(verf),
    vorbestellung: /PreOrder|PreSale|preorder/i.test(verf),
    status: verf.replace(/^https?:\/\/schema\.org\//, '') || 'unbekannt',
    ean: attr('gtin13') || attr('gtin') || null,
  };
}
