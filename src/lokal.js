// Reiter „Freiburg lokal“: fertige Such-Links (Kleinanzeigen, eBay mit Umkreis) + Bewertung von Anzeigentexten.
const norm = (s) => String(s || '').toLowerCase();

export function kleinanzeigenLink(suche, lokal) {
  const q = new URLSearchParams({ keywords: suche.begriff, locationStr: lokal.plz, radius: String(lokal.radiusKm), maxPrice: String(suche.maxPreis) });
  return `https://www.kleinanzeigen.de/s-suchanfrage.html?${q}`;
}

export function ebayUmkreisLink(suche, lokal) {
  // Sortierung: neu eingestellt zuerst (_sop=10), Umkreis um PLZ, Höchstpreis, nur Neu (LH_ItemCondition=1000)
  const q = new URLSearchParams({ _nkw: suche.begriff, _stpos: lokal.plz, _sadis: String(lokal.radiusKm), _fspt: '1', _udhi: String(suche.maxPreis), _sop: '10', LH_ItemCondition: '1000', LH_PrefLoc: '99' });
  return `https://www.ebay.de/sch/i.html?${q}`;
}

// Bewertet ein Angebot (Titel + Beschreibung + Preis) gegen die UVP
export function angebotBewerten({ text, preis, uvp }, regeln) {
  const t = norm(text);
  const bonus = regeln.bonusWoerter.filter((w) => t.includes(w));
  const warn = regeln.warnWoerter.filter((w) => new RegExp(`(^|[^a-zäöü])${w}([^a-zäöü]|$)`).test(t));
  let stufe = 'unbekannt';
  if (Number.isFinite(preis) && uvp) {
    if (preis < uvp * regeln.zuBilligAnteil) stufe = 'zu-billig';
    else if (preis <= uvp) stufe = 'gut';
    else if (preis <= uvp + 5) stufe = 'ok';
    else stufe = 'drueber';
  }
  if (warn.length) stufe = 'warnung';
  return { stufe, bonus, warn, beleg: bonus.some((w) => ['rechnung', 'quittung', 'kassenbon', 'kaufbeleg'].includes(w)) };
}
