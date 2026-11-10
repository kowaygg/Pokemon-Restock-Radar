// Täglicher Selbstcheck (GitHub): Läuft der GitHub-Wächter? Meldet sich der Handy-Wächter (Puls)? Fallen Händler/Quellen aus?
// Hält außerdem die geplanten Abläufe aktiv (GitHub schaltet sie nach 60 Tagen ohne Änderung sonst ab).
// Push nur bei Problemen – sonntags zusätzlich ein kurzes „alles ok“. Ändert nie Code.
import { appendFile } from 'node:fs/promises';

const APP_DATEN = 'https://kowaygg.github.io/Pokemon-Restock-Radar/data/oeffentlich.json';
// Shops, die GitHub bewusst nicht lesen kann (laufen auf dem Handy) – kein Alarm
const NUR_HANDY = new Set(['mueller', 'vedes', 'mediamarkt', 'saturn']);

// Reine Bewertung (testbar): fakten → { probleme: [...], ok: [...] }
export function bewerten({ jetzt, letzterLauf, pulsAnzahl, haendler = [], newsFehler = {} }) {
  const probleme = [];
  const ok = [];
  const stunden = letzterLauf ? (jetzt - Date.parse(letzterLauf)) / 3600000 : Infinity;
  if (stunden > 6) probleme.push(`GitHub-Wächter: letzter Lauf vor ${Number.isFinite(stunden) ? Math.round(stunden) + ' h' : 'unbekannt'}`);
  else ok.push(`GitHub-Wächter lief vor ${Math.round(stunden * 60)} Min.`);
  if (pulsAnzahl === 0) probleme.push('Handy-Wächter: kein Lebenszeichen in den letzten 12 h – Termux öffnen: cd ~/Pokemon-Restock-Radar && npm run dauer');
  else if (pulsAnzahl > 0) ok.push(`Handy-Wächter aktiv (${pulsAnzahl} Lebenszeichen in 12 h)`);
  const kaputt = haendler.filter((h) => h.status === 'aktiv' && h.fehler && !NUR_HANDY.has(h.id));
  if (kaputt.length) probleme.push(`Händler mit Fehler: ${kaputt.map((h) => `${h.name} (${h.fehler})`).join(', ')}`);
  else ok.push(`${haendler.filter((h) => h.status === 'aktiv').length} Händler ohne Fehler`);
  const nf = Object.entries(newsFehler);
  if (nf.length) probleme.push(`News-Quellen mit Fehler: ${nf.map(([k, v]) => `${k} (${v})`).join(', ')}`);
  return { probleme, ok };
}

async function main() {
  const jetzt = new Date();
  const kanal = process.env.NTFY_KANAL || '';
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  // 1) Keep-alive: geplante Abläufe aktiv halten (60-Tage-Regel)
  const keepAlive = [];
  for (const wf of ['abruf.yml', 'selbstcheck.yml']) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${wf}/enable`, { method: 'PUT', headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
      keepAlive.push(`${wf}: ${r.status === 204 ? 'aktiv gehalten' : 'HTTP ' + r.status}`);
    } catch (e) { keepAlive.push(`${wf}: ${e.message}`); }
  }
  // 2) Daten der App, 3) Handy-Puls
  let daten = {};
  try { daten = await (await fetch(APP_DATEN, { signal: AbortSignal.timeout(20000) })).json(); } catch {}
  let pulsAnzahl = null;
  if (kanal) {
    try {
      const t = await (await fetch(`https://ntfy.sh/${kanal}-puls/json?poll=1&since=12h`, { signal: AbortSignal.timeout(20000) })).text();
      pulsAnzahl = t.split(/\r?\n/).filter(Boolean).length;
    } catch {}
  }
  const { probleme, ok } = bewerten({ jetzt, letzterLauf: daten.letzterLauf, pulsAnzahl, haendler: daten.haendler, newsFehler: daten.newsFehler });
  const bericht = [`**Selbstcheck ${jetzt.toISOString().slice(0, 16)} UTC**`, '', ...probleme.map((p) => `- 🔴 ${p}`), ...ok.map((o) => `- 🟢 ${o}`), '', ...keepAlive.map((k) => `- ${k}`)].join('\n');
  console.log(bericht);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, bericht + '\n');
  const sonntag = jetzt.getUTCDay() === 0;
  if (kanal && (probleme.length || sonntag)) {
    await fetch('https://ntfy.sh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      topic: kanal, title: probleme.length ? '⚠️ Restock-Radar: bitte prüfen' : '✅ Restock-Radar: Wochen-Check ok',
      message: (probleme.length ? probleme : ok).join('\n').slice(0, 2000), priority: probleme.length ? 4 : 2, tags: [probleme.length ? 'warning' : 'white_check_mark'],
    }) }).catch(() => {});
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('selbstcheck.js')) await main();
