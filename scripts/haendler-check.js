// Aufruf: node scripts/haendler-check.js  → Ergebnis als Tabelle (und in der GitHub-Actions-Zusammenfassung)
import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { haendlerPruefen } from '../src/haendler-pruefen.js';

const { haendler } = JSON.parse(await readFile(new URL('../config/haendler.json', import.meta.url)));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const zeilen = ['| Händler | Start | System | Bot-Schutz | robots alles verboten | products.json | Impressum | Register | Gericht | USt-IdNr |', '|---|---|---|---|---|---|---|---|---|---|'];
const alle = [];
for (const h of haendler) {
  const e = await haendlerPruefen(h);
  alle.push(e);
  const pj = e.productsJson === undefined ? '–' : `${e.productsJson}${e.productsJsonErlaubt === false ? ' (robots: verboten)' : ''}`;
  zeilen.push(`| ${e.name} | ${e.start} | ${e.system.join('+') || '?'} | ${e.schutz.join(', ') || '–'} | ${e.robotsAllesVerboten ? 'JA' : 'nein'} | ${pj} | ${e.impressum} | ${e.register || '–'} | ${e.gericht || '–'} | ${e.ustId || '–'} |`);
  console.log(JSON.stringify(e));
  await pause(1500);
}
const md = zeilen.join('\n') + '\n';
console.log('\n' + md);
await writeFile('haendler-check.json', JSON.stringify(alle, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Händler-Check\n\n' + md);
