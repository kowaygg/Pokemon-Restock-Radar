// Push über ntfy. Kanalname NUR aus Secret/Umgebung NTFY_KANAL – nie im Repo. Ohne Kanal: Probelauf (nur Anzeige).
const TYP_TEXT = { neu: 'NEU lieferbar', 'wieder-da': 'WIEDER DA', vorbestellung: 'VORBESTELLUNG offen', angekuendigt: 'Angekündigt (noch nicht bestellbar)', 'ebay-sofort': 'eBay Sofortkauf', 'ebay-auktion': 'eBay Auktion endet bald', graded: 'Graded-Karte' };

export function pushNachricht(m) {
  const preis = Number.isFinite(m.preis) ? `${m.preis.toFixed(2).replace('.', ',')} €` : 'Preis ?';
  const bew = m.bewertung?.stufe === 'uvp' ? `✅ UVP-Preis (UVP ${m.bewertung.uvp.toFixed(2).replace('.', ',')} €)`
    : m.bewertung?.stufe === 'drueber' ? `⚠ ${m.bewertung.differenz.toFixed(2).replace('.', ',')} € über UVP` : 'UVP unbekannt';
  const dringend = m.prioritaet === 1 && m.bewertung?.stufe === 'uvp' && m.typ !== 'angekuendigt';
  return {
    title: `${dringend ? '🚨 ' : ''}${TYP_TEXT[m.typ]} · ${m.haendler}`.slice(0, 250),
    message: [m.titel, `${preis} · ${bew}`, m.sprache ? `Sprache: ${m.sprache}` : null].filter(Boolean).join('\n').slice(0, 2000),
    priority: dringend ? 5 : m.typ === 'angekuendigt' ? 3 : 4,
    tags: [dringend ? 'rotating_light' : 'package'],
    click: m.link,
    ...(m.warenkorb && m.verfuegbar ? { actions: [{ action: 'view', label: 'In den Warenkorb', url: m.warenkorb }] } : {}),
  };
}

// Links, die in den letzten 12 h schon auf dem Kanal gemeldet wurden (ntfy hält Nachrichten 12 h vor).
// Verhindert doppelte Pushes, wenn Handy-Wächter und GitHub-Wächter dasselbe finden.
export async function bereitsGemeldet(kanal, { server = 'https://ntfy.sh', holen = fetch } = {}) {
  if (!kanal) return new Set();
  try {
    const r = await holen(`${server}/${kanal}/json?poll=1&since=12h`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return new Set();
    const zeilen = (await r.text()).split(/\r?\n/).filter(Boolean);
    return new Set(zeilen.map((z) => { try { return JSON.parse(z).click; } catch { return null; } }).filter(Boolean));
  } catch { return new Set(); }
}

export async function pushSenden(nachricht, { kanal, server = 'https://ntfy.sh', holen = fetch, protokoll = console.log }) {
  if (!kanal) { protokoll(`(Probelauf) Push: ${nachricht.title} – ${nachricht.message.replace(/\n/g, ' | ')}`); return false; }
  try {
    const r = await holen(server, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: kanal, ...nachricht }), signal: AbortSignal.timeout(15000) });
    return r.ok;
  } catch { return false; }
}
