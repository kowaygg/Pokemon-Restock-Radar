// Gibt die fertigen Such-Links für „Freiburg lokal“ aus (zum Anklicken / als Suchauftrag speichern).
import { readFileSync } from 'node:fs';
import { kleinanzeigenLink, ebayUmkreisLink } from '../src/lokal.js';
const lokal = JSON.parse(readFileSync(new URL('../config/lokal.json', import.meta.url)));
for (const s of lokal.suchen) console.log(`\n${s.begriff} (bis ${s.maxPreis} €)\n  Kleinanzeigen: ${kleinanzeigenLink(s, lokal)}\n  eBay:          ${ebayUmkreisLink(s, lokal)}`);
