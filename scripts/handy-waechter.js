// Handy-Wächter für Termux (Android): ruft den Durchlauf im Minutentakt auf (MODUS=handy) und holt stündlich Updates per git pull.
// Aufruf: npm run handy   (vorher einmal `termux-wake-lock`, damit Android den Wächter nicht schlafen legt)
// Kanal kommt aus der Datei .env (NTFY_KANAL=...) – diese Datei bleibt nur auf dem Handy.
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ausfuehren = promisify(execFile);
const lies = async (pfad, ersatz) => { try { return await readFile(pfad, 'utf8'); } catch { return ersatz; } };
const uhr = () => new Date().toLocaleTimeString('de-DE');

for (const zeile of (await lies('.env', '')).split(/\r?\n/)) {
  const m = zeile.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (!process.env.NTFY_KANAL) console.log('⚠ Keine .env mit NTFY_KANAL gefunden – Probelauf ohne Push.');

let letztesUpdate = 0;
console.log(`${uhr()} Handy-Wächter gestartet. Beenden: Strg+C (in Termux: Lautstärke-runter + C).`);
for (;;) {
  const einst = JSON.parse(await lies('config/einstellungen.json', '{}'));
  const takt = Math.max(1, einst.handyMinuten || 1) * 60000;
  const start = Date.now();
  if (start - letztesUpdate > 3600000) {
    try { await ausfuehren('git', ['pull', '-q', '--ff-only'], { timeout: 60000 }); } catch (e) { console.log(`${uhr()} Update übersprungen: ${e.message.split('\n')[0]}`); }
    letztesUpdate = start;
  }
  try {
    const { stdout } = await ausfuehren(process.execPath, ['src/run.js'], { env: { ...process.env, MODUS: 'handy' }, timeout: 5 * 60000, maxBuffer: 10 * 1024 * 1024 });
    const zeilen = stdout.split('\n');
    const fehler = zeilen.filter((z) => z.includes('❌')).map((z) => z.split('|')[1].trim() + (z.includes('429') ? ' (zu viele Anfragen)' : ''));
    const pausen = zeilen.filter((z) => z.includes('⏸')).length;
    const push = (stdout.match(/Push: (.*)/) || [])[1] || '';
    console.log(`${uhr()} geprüft in ${Math.round((Date.now() - start) / 1000)} s · ${push}${fehler.length ? ` · Fehler: ${fehler.join(', ')}` : ''}${pausen ? ` · ${pausen} Händler in Pause` : ''}`);
  } catch (e) {
    console.log(`${uhr()} Durchlauf fehlgeschlagen: ${e.message.split('\n')[0]}`);
  }
  await new Promise((res) => setTimeout(res, Math.max(5000, takt - (Date.now() - start))));
}
