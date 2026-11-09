// Prüft Händler-Kandidaten technisch: erreichbar? Shop-System? Bot-Schutz? robots.txt? Impressum mit Registereintrag?
// Nur lesende Abrufe der Startseite, robots.txt, products.json (Shopify) und Impressum – mit Pause zwischen Händlern.

export const USER_AGENT = 'PokemonRestockRadar/0.2 (+https://github.com/kowaygg/Pokemon-Restock-Radar; privat, nicht-kommerziell)';

export function shopSystem(html) {
  const s = [];
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) s.push('Shopify');
  if (/shopware/i.test(html)) s.push('Shopware');
  if (/woocommerce/i.test(html)) s.push('WooCommerce');
  if (/magento|mage\/cookies/i.test(html)) s.push('Magento');
  if (/jtl-shop|jtlshop/i.test(html)) s.push('JTL');
  if (/salesforce|demandware/i.test(html)) s.push('Salesforce');
  return s;
}

export function botSchutz(status, html, headers) {
  const h = [];
  if (status === 403 || status === 429 || status === 503) h.push('HTTP ' + status);
  if (/Just a moment|cf-chl|challenge-platform/i.test(html)) h.push('Cloudflare-Challenge');
  if (/_Incapsula_Resource|incap_ses/i.test(html)) h.push('Imperva');
  if (/akamai|_abck/i.test(html) || /akamai/i.test(headers.get?.('server') || '')) h.push('Akamai');
  if (/datadome/i.test(html) || headers.get?.('x-datadome')) h.push('DataDome');
  if (/queue-it/i.test(html)) h.push('Queue-it');
  if (status !== 200 && /captcha/i.test(html) && !h.length) h.push('Captcha');
  return h;
}

// Liefert die Disallow-Regeln für "User-agent: *"
export function robotsRegeln(txt) {
  const regeln = []; let aktiv = false; let vorherAgent = false;
  for (const roh of txt.split(/\r?\n/)) {
    const zeile = roh.replace(/#.*/, '').trim();
    const m = zeile.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m; const key = k.toLowerCase();
    if (key === 'user-agent') { if (!vorherAgent) aktiv = false; aktiv = aktiv || v.trim() === '*'; vorherAgent = true; continue; }
    vorherAgent = false;
    if (aktiv && key === 'disallow' && v.trim()) regeln.push(v.trim());
  }
  return regeln;
}

export function erlaubt(regeln, pfad) {
  return !regeln.some((r) => {
    const muster = '^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp(muster).test(pfad);
  });
}

export function impressumLink(html, basis) {
  const m = html.match(/href="([^"]*(impressum|imprint|legal-notice|legal)[^"]*)"/i);
  if (!m) return null;
  try { return new URL(m[1].replace(/&amp;/g, '&'), basis).href; } catch { return null; }
}

export function registerAngaben(text) {
  const t = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const hr = t.match(/\b(HR[AB])\s*(Nr\.?)?\s*:?\s*(\d{2,7}\s?[A-Z]?)\b/);
  const gericht = t.match(/Amtsgericht\s+([A-ZÄÖÜ][\wäöüß.-]+(?:\s[a-zäöü]+\s[A-ZÄÖÜ][\wäöüß.-]+)?)/);
  const ust = t.match(/\bDE\s?\d{3}\s?\d{3}\s?\d{3}\b/);
  return { register: hr ? `${hr[1]} ${hr[3].trim()}` : null, gericht: gericht ? gericht[1] : null, ustId: ust ? ust[0].replace(/\s/g, '') : null };
}

async function holen(url, ms = 15000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'de-DE,de;q=0.9' }, redirect: 'follow', signal: ctrl.signal });
    const text = await r.text();
    return { status: r.status, text: text.slice(0, 600000), headers: r.headers, url: r.url };
  } catch (e) { return { status: 0, text: '', headers: new Headers(), fehler: e.name === 'AbortError' ? 'Zeitlimit' : e.message }; }
  finally { clearTimeout(t); }
}

export async function haendlerPruefen(h) {
  const erg = { id: h.id, name: h.name, url: h.url };
  const start = await holen(h.url);
  erg.start = start.status || start.fehler;
  erg.system = shopSystem(start.text);
  erg.schutz = botSchutz(start.status, start.text, start.headers);
  const origin = new URL(start.url || h.url).origin;
  const robots = await holen(origin + '/robots.txt');
  const regeln = robots.status === 200 ? robotsRegeln(robots.text) : [];
  erg.robots = robots.status;
  erg.robotsAllesVerboten = regeln.includes('/');
  if (erg.system.includes('Shopify')) {
    erg.productsJsonErlaubt = erlaubt(regeln, '/products.json');
    const pj = await holen(origin + '/products.json?limit=1');
    erg.productsJson = pj.status === 200 && pj.text.trim().startsWith('{') ? 'ok' : pj.status;
  }
  const link = impressumLink(start.text, origin);
  if (link) {
    const imp = await holen(link);
    erg.impressum = imp.status;
    Object.assign(erg, registerAngaben(imp.text));
  } else erg.impressum = 'kein Link gefunden';
  return erg;
}
