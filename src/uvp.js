// Vergleicht einen Preis mit der UVP-Liste (config/uvp.json).
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');

// Bestes passendes Produkt aus der Liste: gleiche Art und alle Wörter des Set-Namens im Titel
export function uvpFinden(titel, art, liste) {
  const t = norm(titel);
  const passend = liste.produkte.filter((p) => p.art === art && norm(p.set).split(/\s+/).filter((w) => w.length > 3 && !['mega', 'entwicklung'].includes(w)).every((w) => t.includes(w)));
  if (passend.length) return { ...passend.sort((a, b) => a.uvp - b.uvp)[0], quelle: 'produkt' };
  const std = liste.standardUvp.find((s) => s.art === art);
  return std ? { ...std, name: 'Standard-UVP ' + art, quelle: 'standard' } : null;
}

// Ergebnis: 'uvp' (≤ UVP + Spielraum), 'drueber' oder 'unbekannt'
export function preisBewertung(preis, uvp, spielraum) {
  if (!uvp || !Number.isFinite(preis)) return { stufe: 'unbekannt' };
  const differenz = Math.round((preis - uvp.uvp) * 100) / 100;
  return { stufe: preis <= uvp.uvp + spielraum ? 'uvp' : 'drueber', differenz, uvp: uvp.uvp, sicherheit: uvp.sicherheit };
}
