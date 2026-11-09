// eBay-Wächter über die offizielle Browse API (kostenloses Entwicklerkonto, ca. 5.000 Abfragen/Tag).
// Schlüssel NUR aus Umgebung/Secrets: EBAY_CLIENT_ID + EBAY_CLIENT_SECRET – nie ins Repo.
// Sofortkauf: Preis + Versand ≤ UVP + Spielraum. Auktionen: enden bald und stehen aktuell (inkl. Versand) ≤ UVP + Spielraum.
// Graded: eigene Suchbegriffe + Preisgrenze aus config/einstellungen.json → ebay.graded.
const API = 'https://api.ebay.com';

let token = null;
export async function ebayToken({ id = process.env.EBAY_CLIENT_ID, geheim = process.env.EBAY_CLIENT_SECRET, holen = fetch, jetzt = Date.now() } = {}) {
  if (!id || !geheim) return null;
  if (token && token.bis > jetzt + 60000) return token.wert;
  const r = await holen(`${API}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${id}:${geheim}`).toString('base64') },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`eBay-Anmeldung HTTP ${r.status}`);
  const j = await r.json();
  token = { wert: j.access_token, bis: jetzt + (j.expires_in || 7200) * 1000 };
  return token.wert;
}

// Ein Angebot aus itemSummaries → einheitliches Format
export function angebot(it) {
  const preis = Number(it.price?.value ?? it.currentBidPrice?.value);
  const versandOpt = (it.shippingOptions || []).map((o) => Number(o.shippingCost?.value)).filter(Number.isFinite);
  const versand = versandOpt.length ? Math.min(...versandOpt) : null;
  const auktion = (it.buyingOptions || []).includes('AUCTION');
  const gebot = Number(it.currentBidPrice?.value);
  return {
    id: it.itemId, titel: it.title, link: it.itemWebUrl,
    preis: auktion && Number.isFinite(gebot) ? gebot : preis,
    versand, gesamt: Number.isFinite(preis) ? Math.round(((auktion && Number.isFinite(gebot) ? gebot : preis) + (versand ?? 0)) * 100) / 100 : NaN,
    versandUnbekannt: versand == null,
    auktion, sofortkauf: (it.buyingOptions || []).includes('FIXED_PRICE'),
    gebote: it.bidCount ?? null, endet: it.itemEndDate || null,
    zustand: it.condition || null, bild: it.image?.imageUrl || null,
    verkaeufer: it.seller?.username || null, bewertungProzent: Number(it.seller?.feedbackPercentage), bewertungen: Number(it.seller?.feedbackScore),
    land: it.itemLocation?.country || null,
  };
}

const WARNWORTE = /reseal|leer|empty|ohne (booster|karten|inhalt)|nur (die )?(box|verpackung|hulle)|proxy|fake|replica|nachbau|repack|mystery|\blot\b|konvolut|beschadigt|damaged|defekt|geoffnet|opened|code ?karte|digital/i;

// Seriöser Verkäufer + kein Warnwort
export function serioes(a, { minProzent = 98, minBewertungen = 50 } = {}) {
  if (WARNWORTE.test(a.titel || '')) return false;
  if (Number.isFinite(a.bewertungProzent) && a.bewertungProzent < minProzent) return false;
  if (Number.isFinite(a.bewertungen) && a.bewertungen < minBewertungen) return false;
  return true;
}

export async function ebaySuche(q, { art = 'sofortkauf', maxPreis, holen = fetch, limit = 50, land = 'DE' } = {}) {
  const t = await ebayToken({ holen });
  if (!t) return null;
  const filter = [
    art === 'auktion' ? 'buyingOptions:{AUCTION}' : 'buyingOptions:{FIXED_PRICE}',
    maxPreis ? `price:[..${maxPreis}],priceCurrency:EUR` : null,
    `deliveryCountry:${land}`,
    'conditionIds:{1000}', // neu
  ].filter(Boolean).join(',');
  const sort = art === 'auktion' ? 'endingSoonest' : 'newlyListed';
  const url = `${API}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}&sort=${sort}&limit=${limit}`;
  const r = await holen(url, { headers: { authorization: `Bearer ${t}`, 'x-ebay-c-marketplace-id': 'EBAY_DE', 'accept-language': 'de-DE' }, signal: AbortSignal.timeout(20000) });
  if (r.status === 429) throw new Error('eBay-Kontingent erschöpft (429)');
  if (!r.ok) throw new Error(`eBay HTTP ${r.status}`);
  const j = await r.json();
  return (j.itemSummaries || []).map(angebot);
}

// Graded-Suche: gebrauchte/neue Einzelkarten mit Grading – ohne Zustandsfilter, eigene Preisgrenze
export async function ebayGraded(q, { maxPreis, holen = fetch, limit = 50 } = {}) {
  const t = await ebayToken({ holen });
  if (!t) return null;
  const filter = [maxPreis ? `price:[..${maxPreis}],priceCurrency:EUR` : null, 'deliveryCountry:DE'].filter(Boolean).join(',');
  const url = `${API}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}&sort=newlyListed&limit=${limit}`;
  const r = await holen(url, { headers: { authorization: `Bearer ${t}`, 'x-ebay-c-marketplace-id': 'EBAY_DE' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`eBay HTTP ${r.status}`);
  return ((await r.json()).itemSummaries || []).map(angebot);
}

export function _tokenZuruecksetzen() { token = null; }
