// Restock-Muster: zählt je Händler, an welchem Wochentag und zu welcher Stunde (deutsche Zeit) Ware neu/wieder kam.
// Daraus: häufigster Wochentag + Uhrzeit und der nächste wahrscheinliche Termin. Aussagekräftig erst ab einigen Meldungen.
export const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const ZAEHLT = new Set(['neu', 'wieder-da', 'vorbestellung']);

// Wochentag (0 = Montag) und Stunde in Europe/Berlin
export function berlinZeit(datum) {
  const teile = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(datum).map((p) => [p.type, p.value]));
  return { tag: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(teile.weekday), stunde: Number(teile.hour) };
}

export function musterZaehlen(statistik = {}, m, jetzt = new Date()) {
  if (!ZAEHLT.has(m.typ) || !m.haendlerId) return statistik;
  const s = statistik[m.haendlerId] || { name: m.haendler, anzahl: 0, tage: Array(7).fill(0), stunden: Array(24).fill(0), letzte: null };
  const { tag, stunde } = berlinZeit(jetzt);
  s.anzahl++; s.tage[tag]++; s.stunden[stunde]++; s.letzte = jetzt.toISOString();
  return { ...statistik, [m.haendlerId]: s };
}

const maxIndex = (a) => a.reduce((best, v, i) => (v > a[best] ? i : best), 0);

// Auswertung je Händler (für die App)
export function musterAuswerten(statistik = {}, jetzt = new Date()) {
  return Object.entries(statistik).map(([id, s]) => {
    const tag = maxIndex(s.tage);
    const stunde = maxIndex(s.stunden);
    // Nächster Termin: kommender häufigster Wochentag zur häufigsten Stunde
    const { tag: heute, stunde: jetztStunde } = berlinZeit(jetzt);
    let tageBis = (tag - heute + 7) % 7;
    if (tageBis === 0 && jetztStunde >= stunde) tageBis = 7;
    return {
      id, name: s.name, anzahl: s.anzahl, letzte: s.letzte,
      tag: TAGE[tag], stunde, anteilTag: Math.round((s.tage[tag] / s.anzahl) * 100),
      naechster: tageBis === 0 ? `heute ab ${stunde} Uhr` : tageBis === 1 ? `morgen ab ${stunde} Uhr` : `${TAGE[tag]} ab ${stunde} Uhr`,
      sicher: s.anzahl >= 5,
    };
  }).sort((a, b) => b.anzahl - a.anzahl);
}
