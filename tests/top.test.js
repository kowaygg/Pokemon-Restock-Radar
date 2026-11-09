import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uvpFinden, preisBewertung, pushWert } from '../src/uvp.js';
import { produktArt } from '../src/produkt.js';
import { pushNachricht } from '../src/push.js';

const liste = JSON.parse(readFileSync(new URL('../config/uvp.json', import.meta.url)));
const bew = (titel, preis) => { const a = produktArt(titel); return preisBewertung(preis, uvpFinden(titel, a.art, liste), 5); };

test('Top: nur echte UVP-Treffer', () => {
  assert.equal(bew('Pokémon TCG Delta Herrschaft Top Trainer Box (DE)', 54.99).stufe, 'uvp');
  assert.equal(bew('Pokémon Delta Herrschaft 36er Display (DE)', 179.99).stufe, 'uvp');
  assert.equal(bew('Pokémon - Shiny Treasure EX 10er Display - JPN', 139.9).stufe, 'unbekannt');
  assert.equal(bew('Pokémon - Ewige Rivalen 18er Booster Display - DE', 139.9).stufe, 'unbekannt');
  assert.equal(bew('Pokémon - Collect 151 Glumanda Display Set - CHN', 19.99).stufe, 'unbekannt');
  assert.equal(bew('Pokémon 30 Jahre Tech-Sticker-Kollektion (deutsch)', 29.99).stufe, 'unbekannt');
  assert.equal(bew('Pokémon 30 Jahre Figuren-Kollektion Mew', 36.99).stufe, 'uvp');
  assert.equal(bew('Pokémon Top Trainer Box Delta Herrschaft', 25).stufe, 'unplausibel');
});

test('Reseal, geöffnete Ware und Zubehör fliegen raus', () => {
  for (const t of ['Pokémon Top Trainer Box resealed', 'Pokémon Display geöffnet', 'Pokémon Deck Box Pikachu', 'LEGO Pokémon Box']) assert.equal(produktArt(t), null, t);
});

test('Push nur bei UVP-Treffer, mit Warenkorb-Knopf', () => {
  const m = { typ: 'neu', haendler: 'Shop', titel: 'Delta Herrschaft Top Trainer Box', prioritaet: 1, preis: 54.99, verfuegbar: true, link: 'https://s.de/p', warenkorb: 'https://s.de/cart/1:1', bewertung: { stufe: 'uvp', uvp: 54.99, differenz: 0 } };
  assert.equal(pushWert(m), true);
  assert.equal(pushWert({ ...m, bewertung: { stufe: 'drueber' } }), false);
  assert.equal(pushWert({ ...m, bewertung: { stufe: 'unbekannt' } }), false);
  assert.equal(pushWert({ ...m, preis: NaN, bewertung: { stufe: 'unbekannt' } }), true);
  const n = pushNachricht(m);
  assert.equal(n.priority, 5);
  assert.equal(n.actions[0].url, 'https://s.de/cart/1:1');
});

test('Doppel-Push-Schutz liest gemeldete Links aus ntfy', async () => {
  const { bereitsGemeldet } = await import('../src/push.js');
  const holen = async (url) => { assert.match(url, /\/kanal\/json\?poll=1&since=12h$/); return { ok: true, text: async () => '{"click":"https://a.de/1"}\n{"event":"message"}\nkaputt\n' }; };
  assert.deepEqual([...await bereitsGemeldet('kanal', { holen })], ['https://a.de/1']);
  assert.equal((await bereitsGemeldet('', { holen })).size, 0);
});

test('Sparmodus: Takt nach WLAN und Akku', async () => {
  const { sparStufe } = await import('../src/geraet.js');
  const s = { taktWlanLaden: 1, taktWlan: 2, taktMobil: 5, taktAkkuNiedrig: 10, akkuNiedrig: 30, akkuPause: 15, pauseMinuten: 10, newsMobil: 15 };
  assert.deepEqual([sparStufe({ wlan: true, laden: true, akku: 50 }, s).minuten, sparStufe({ wlan: true, laden: true, akku: 50 }, s).wachHalten], [1, true]);
  assert.equal(sparStufe({ wlan: true, laden: false, akku: 80 }, s).minuten, 2);
  assert.equal(sparStufe({ wlan: false, laden: false, akku: 80 }, s).spar, true);
  assert.equal(sparStufe({ wlan: false, laden: false, akku: 80 }, s).minuten, 5);
  assert.equal(sparStufe({ wlan: true, laden: false, akku: 20 }, s).minuten, 10);
  assert.equal(sparStufe({ wlan: true, laden: false, akku: 10 }, s).pause, true);
  assert.equal(sparStufe({ wlan: true, laden: true, akku: 10 }, s).pause, undefined);
  assert.equal(sparStufe({ wlan: false, laden: false, akku: null }, s).minuten, 5);
});

test('Asien-UVP: Yen/Won zum EZB-Kurs + 19 % EUSt, ohne Kurs kein Treffer', async () => {
  const { readFileSync } = await import('node:fs');
  const liste = { ...JSON.parse(readFileSync(new URL('../config/uvp.json', import.meta.url))), kurse: { JPY: 176.79, KRW: 1507.46 } };
  const jp = uvpFinden('Pokemon Paradise Dragona 30er Display - JPN', 'display-36', liste);
  assert.equal(jp.uvp, 40.39); // 6000 / 176.79 × 1,19
  assert.equal(uvpFinden('Pokémon 30th Celebration Booster Box JP', 'display-36', liste).uvp, 48.46);
  assert.equal(uvpFinden('Pokémon 30th Celebration Booster Box Korean', 'display-36', liste).uvp, 55.26);
  assert.equal(uvpFinden('Pokémon Gem Pack Display CHN', 'display-36', liste), null);
  assert.equal(uvpFinden('Pokemon Paradise Dragona Display JPN', 'display-36', { ...liste, kurse: {} }), null);
});

test('Versand: Pauschale, frei ab, unbekannt', async () => {
  const { versandFuer } = await import('../src/uvp.js');
  assert.equal(versandFuer({ versand: { euro: 4.99, freiAb: 69 } }, 54.99), 4.99);
  assert.equal(versandFuer({ versand: { euro: 4.99, freiAb: 69 } }, 179.99), 0);
  assert.equal(versandFuer({ versand: { euro: null, freiAb: 150 } }, 54.99), null);
  assert.equal(versandFuer({ versand: { euro: null, freiAb: 150 } }, 179.99), 0);
  assert.equal(versandFuer({}, 10), null);
});

test('Zubehör „für Top Trainer Box“ ist kein Produkt', () => {
  assert.equal(produktArt('Pokemon Deluxe Faltboxen fuer Top Trainer Box 10 Stück'), null);
  assert.equal(produktArt('Aufbewahrungsbox für Elite Trainer Box'), null);
  assert.equal(produktArt('Pokémon Delta-Herrschaft Top-Trainer-Box').art, 'top-trainer-box');
});
