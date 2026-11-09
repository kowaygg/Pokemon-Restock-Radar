// Handy-Wächter für Termux (Android): ruft den Durchlauf regelmäßig auf (MODUS=handy) und holt stündlich Updates per git pull.
// Sparmodus: Takt richtet sich nach WLAN/mobilen Daten und Akku (Einstellungen: config/einstellungen.json → handySpar).
// Wach halten (wake lock) nur beim Laden im WLAN – sonst darf Android Strom sparen.
// Aufruf: npm run handy · Kanal kommt aus der Datei .env (NTFY_KANAL=...) – diese Datei bleibt nur auf dem Handy.
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { geraetErkennen, sparStufe } from '../src/geraet.js';

const ausfuehren = promisify(execFile);
const lies = async (pfad, ersatz) => { try { return await readFile(pfad, 'utf8'); } catch { return ersatz; } };
const uhr = () => new Date().toLocaleTimeString('de-DE');

for (const zeile of (await lies('.env', '')).split(/\r?\n/)) {
  const m = zeile.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
if (!process.env.NTFY_KANAL) console.log('⚠ Keine .env mit NTFY_KANAL gefunden – Probelauf ohne Push.');

let letztesUpdate = 0;
let wach = null;
let letzteStufe = '';
console.log(`${uhr()} Handy-Wächter gestartet. Beenden: Lautstärke-runter + C.`);
for (;;) {
  const einst = JSON.parse(await lies('config/einstellungen.json', '{}'));
  const geraet = await geraetErkennen();
  const stufe = sparStufe(geraet, einst.handySpar);
  if (stufe.name !== letzteStufe) {
    console.log(`${uhr()} Modus: ${stufe.name} → ${stufe.pause ? 'Pause' : `alle ${stufe.minuten} Min.`}${geraet.genau ? '' : ' (ohne Termux:API geschätzt)'}`);
    letzteStufe = stufe.name;
  }
  if (wach !== stufe.wachHalten) {
    try { await ausfuehren(stufe.wachHalten ? 'termux-wake-lock' : 'termux-wake-unlock', [], { timeout: 10000 }); } catch {}
    wach = stufe.wachHalten;
  }
  const start = Date.now();
  if (!stufe.pause) {
    if (start - letztesUpdate > 3600000 && geraet.wlan) {
      try { await ausfuehren('git', ['pull', '-q', '--ff-only'], { timeout: 60000 }); } catch (e) { console.log(`${uhr()} Update übersprungen: ${e.message.split('\n')[0]}`); }
      letztesUpdate = start;
    }
    try {
      const env = { ...process.env, MODUS: 'handy', SPAR: stufe.spar ? '1' : '', NEWS_MINUTEN: stufe.newsMinuten ? String(stufe.newsMinuten) : '' };
      const { stdout } = await ausfuehren(process.execPath, ['src/run.js'], { env, timeout: 5 * 60000, maxBuffer: 10 * 1024 * 1024 });
      const zeilen = stdout.split('\n');
      const fehler = zeilen.filter((z) => z.includes('❌')).map((z) => z.split('|')[1].trim() + (z.includes('429') ? ' (zu viele Anfragen)' : ''));
      const pausen = zeilen.filter((z) => z.includes('⏸')).length;
      const push = (stdout.match(/Push: (.*)/) || [])[1] || '';
      console.log(`${uhr()} geprüft in ${Math.round((Date.now() - start) / 1000)} s · ${push}${fehler.length ? ` · Fehler: ${fehler.join(', ')}` : ''}${pausen ? ` · ${pausen} Händler in Pause` : ''}`);
    } catch (e) {
      console.log(`${uhr()} Durchlauf fehlgeschlagen: ${e.message.split('\n')[0]}`);
    }
  }
  await new Promise((res) => setTimeout(res, Math.max(5000, stufe.minuten * 60000 - (Date.now() - start))));
}
