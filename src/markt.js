// Marktspanne: Was kostet eine Produktart je Sprache gerade wirklich bei den überwachten Händlern (DE/EU)?
// Aus echten Angeboten (Preis + Art + Sprache) → übliche Spanne (10.–90. Perzentil) und Mittelwert. Erst ab 3 Angeboten.
const quantil = (sortiert, q) => sortiert[Math.min(sortiert.length - 1, Math.max(0, Math.round((sortiert.length - 1) * q)))];

export function marktSpannen(angebote) {
  const gruppen = {};
  for (const a of angebote) {
    if (!a.art || !Number.isFinite(a.preis) || a.preis <= 0) continue;
    const k = `${a.sprache || 'DE'}|${a.art}`;
    (gruppen[k] ||= []).push(a.preis);
  }
  const aus = {};
  for (const [k, preise] of Object.entries(gruppen)) {
    if (preise.length < 3) continue;
    const s = preise.sort((x, y) => x - y);
    aus[k] = { von: Math.round(quantil(s, 0.1) * 100) / 100, bis: Math.round(quantil(s, 0.9) * 100) / 100, mitte: Math.round(quantil(s, 0.5) * 100) / 100, n: s.length };
  }
  return aus;
}
