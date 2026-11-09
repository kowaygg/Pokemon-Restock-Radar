// Set-Code-Radar (Leak-Radar, nur öffentliche Daten): sammelt Set-Codes wie „ME06“, „SV10“, „M5“ aus Produktnamen/-URLs der Händler.
// Taucht ein bisher unbekannter Code auf, ist das oft der erste Hinweis auf ein kommendes Set – noch vor der offiziellen Ankündigung.
const MUSTER = /\b(me|sv|swsh|m|kp)\s?-?(\d{1,2})(?:[.,](5))?\b/gi;

export function setCodes(text) {
  const t = String(text || '').replace(/[-_/]/g, ' ');
  const codes = new Set();
  for (const m of t.matchAll(MUSTER)) {
    const nr = Number(m[2]);
    if (nr === 0 || nr > 30) continue; // Jahreszahlen, Mengen usw. ausschließen
    codes.add(`${m[1].toUpperCase()}${nr}${m[3] ? '.5' : ''}`);
  }
  return [...codes];
}

// alt: { bekannt: {CODE: {zeit, beispiel}} }; quellen: [{ titel, link, haendler }]. Erster Lauf: nur merken.
export function neueSetCodes(alt, quellen, { jetzt = new Date() } = {}) {
  const ersterLauf = !alt?.bekannt;
  const bekannt = { ...(alt?.bekannt || {}) };
  const neu = [];
  for (const q of quellen) {
    for (const code of setCodes(`${q.titel} ${q.link || ''}`)) {
      if (bekannt[code]) continue;
      bekannt[code] = { zeit: jetzt.toISOString(), beispiel: q.titel, haendler: q.haendler, link: q.link };
      if (!ersterLauf) neu.push({ code, ...q });
    }
  }
  return { bekannt, neu };
}
