// Prüft für Nicht-Shopify-Händler: Gibt es eine Sitemap mit Pokémon-Produkten? Liefern Produktseiten JSON-LD (Preis + Verfügbarkeit)?
// Aufruf: node scripts/erkunden.js [id ...]   (ohne Angabe: alle Kandidaten ohne Shopify)
import { readFile, appendFile } from 'node:fs/promises';
import { sitemapPokemon } from '../src/sitemap.js';
import { produktAusHtml } from '../src/jsonld.js';
import { USER_AGENT } from '../src/haendler-pruefen.js';

const { haendler } = JSON.parse(await readFile(new URL('../config/haendler.json', import.meta.url)));
const ids = process.argv.slice(2);
const liste = haendler.filter((h) => (ids.length ? ids.includes(h.id) : h.abfrage !== 'shopify'));
const zeilen = ['| Händler | Sitemap-Dateien gelesen | Pokémon-URLs | Beispiel | JSON-LD | Preis | Status |', '|---|---|---|---|---|---|---|'];
for (const h of liste) {
  const origin = new URL(h.url).origin;
  try {
    const s = await sitemapPokemon(origin, { maxDateien: 25 });
    const sealed = s.urls.filter((u) => /trainer|display|bundle|tin|kollektion|collection|box/i.test(u));
    const probe = (sealed.length ? sealed : s.urls).slice(0, 3);
    let jl = null; let beispiel = probe[0] || '–';
    for (const u of probe) {
      try {
        const r = await fetch(u, { headers: { 'user-agent': USER_AGENT, 'accept-language': 'de-DE' }, signal: AbortSignal.timeout(20000) });
        jl = produktAusHtml(await r.text()); beispiel = `${u} (${r.status})`;
        if (jl) break;
      } catch {}
      await new Promise((res) => setTimeout(res, 1000));
    }
    zeilen.push(`| ${h.name} | ${s.gelesen} | ${s.urls.length} (sealed-ähnlich ${sealed.length}) | ${beispiel} | ${jl ? '✅' : '❌'} | ${jl?.preis ?? '–'} | ${jl?.status ?? '–'} |`);
  } catch (e) { zeilen.push(`| ${h.name} | Fehler: ${e.message} | | | | | |`); }
  await new Promise((res) => setTimeout(res, 1500));
}
const md = zeilen.join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Erkundung Sitemap + JSON-LD\n\n' + md + '\n');
