// Ein Durchlauf: alle aktiven Shopify-Händler abfragen, Änderungen erkennen, bewerten, pushen, Feed speichern.
// Fehler eines Händlers stoppen nie den ganzen Ablauf.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { shopifyHolen } from './shopify.js';
import { istPokemon, produktArt, sprache, istVorbestellung } from './produkt.js';
import { uvpFinden, preisBewertung } from './uvp.js';
import { aenderungen } from './aenderungen.js';
import { pushNachricht, pushSenden } from './push.js';

const lies = async (pfad, ersatz) => { try { return JSON.parse(await readFile(pfad, 'utf8')); } catch { return ersatz; } };
const { haendler } = await lies('config/haendler.json');
const uvpListe = await lies('config/uvp.json');
const einst = await lies('config/einstellungen.json');
const zustand = await lies('data/zustand.json', { haendler: {}, feed: [] });
const kanal = process.env.NTFY_KANAL || '';
const jetzt = new Date();

const bericht = [];
let pushes = 0;
for (const h of haendler.filter((x) => x.status === 'aktiv' && x.abfrage === 'shopify')) {
  try {
    const roh = await shopifyHolen(h, { maxSeiten: einst.maxSeiten });
    const sealed = roh.filter(istPokemon).map((p) => ({ ...p, ...produktArt(p.titel) })).filter((p) => p.art)
      .map((p) => ({ ...p, sprache: sprache(p.titel), vorbestellung: istVorbestellung(p), haendler: h.name, haendlerId: h.id }));
    const alt = zustand.haendler[h.id]?.produkte || {};
    const ersterLauf = !zustand.haendler[h.id];
    const { meldungen, merker } = aenderungen(alt, sealed, { ersterLauf });
    zustand.haendler[h.id] = { produkte: merker, stand: jetzt.toISOString(), fehler: null };
    for (const m of meldungen) {
      m.bewertung = preisBewertung(m.preis, uvpFinden(m.titel, m.art, uvpListe), uvpListe.spielraumEuro);
      m.zeit = jetzt.toISOString();
      zustand.feed.unshift({ zeit: m.zeit, typ: m.typ, haendler: m.haendler, titel: m.titel, art: m.art, prioritaet: m.prioritaet, preis: m.preis, bewertung: m.bewertung, sprache: m.sprache, link: m.link });
      if (pushes < einst.maxPushProLauf && !(einst.pushNurUvp && m.bewertung.stufe === 'drueber')) {
        if (await pushSenden(pushNachricht(m), { kanal })) pushes++;
      }
    }
    bericht.push(`| ${h.name} | ✅ | ${roh.length} | ${sealed.length} | ${sealed.filter((p) => p.verfuegbar).length} | ${ersterLauf ? 'erster Lauf (nur merken)' : meldungen.length} |`);
  } catch (e) {
    zustand.haendler[h.id] = { ...(zustand.haendler[h.id] || {}), fehler: e.message, fehlerZeit: jetzt.toISOString() };
    bericht.push(`| ${h.name} | ❌ ${e.message} | – | – | – | – |`);
  }
}
const grenze = jetzt.getTime() - einst.feedTage * 86400000;
zustand.feed = zustand.feed.filter((f) => Date.parse(f.zeit) >= grenze).slice(0, 500);
zustand.letzterLauf = jetzt.toISOString();
await mkdir('data', { recursive: true });
await writeFile('data/zustand.json', JSON.stringify(zustand));

const md = ['| Händler | Status | Produkte gesamt | Pokémon-Sealed | davon lieferbar | Meldungen |', '|---|---|---|---|---|---|', ...bericht,
  '', `Push: ${kanal ? `${pushes} gesendet` : 'Probelauf (kein Kanal eingerichtet)'}`, '',
  '**Letzte Meldungen:**', ...zustand.feed.slice(0, 15).map((f) => `- ${f.zeit.slice(0, 16)} · ${f.typ} · ${f.haendler} · ${f.titel} · ${Number.isFinite(f.preis) ? f.preis + ' €' : '?'} · ${f.bewertung?.stufe}`)].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Pokémon-Restock-Radar\n\n' + md + '\n');
