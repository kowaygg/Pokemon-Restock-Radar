import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { istPokemon, produktArt, sprache, istVorbestellung } from '../src/produkt.js';
import { uvpFinden, preisBewertung } from '../src/uvp.js';
import { produkteAusShopify } from '../src/shopify.js';
import { aenderungen } from '../src/aenderungen.js';
import { pushNachricht, pushSenden } from '../src/push.js';

const uvp = JSON.parse(readFileSync(new URL('../config/uvp.json', import.meta.url)));

test('Produktart erkennen', () => {
  assert.equal(produktArt('Pokémon Delta-Herrschaft Top-Trainer-Box (deutsch)').art, 'top-trainer-box');
  assert.equal(produktArt('Pokemon Mega Evolution Elite Trainer Box EN').art, 'top-trainer-box');
  assert.equal(produktArt('Pokémon Delta-Herrschaft Booster Display 36 Packs').art, 'display-36');
  assert.equal(produktArt('Pokémon Booster-Bundle Delta-Herrschaft').art, 'booster-bundle');
  assert.equal(produktArt('Pokémon Mini Tin Glurak').art, 'mini-tin');
  assert.equal(produktArt('Pokémon 30 Jahre Figuren-Kollektion Mew').art, 'kollektion');
  assert.equal(produktArt('Pokémon Pin-Kollektion Pikachu').art, 'pin-kollektion');
  assert.equal(produktArt('Glurak ex 199/165 Einzelkarte'), null);
  assert.equal(produktArt('Pokémon Top-Trainer-Box LEER ohne Booster'), null);
  assert.equal(produktArt('Pokémon Kartenhüllen 65 Sleeves'), null);
  assert.equal(produktArt('Pikachu Plüsch 20 cm'), null);
  assert.equal(produktArt('The Acrylic Box – Elite Trainer Box Case'), null);
  assert.equal(produktArt('Ultra Pro - Acrylic Display Case für Pokemon Elite Trainer Boxen'), null);
});

test('Pokémon, Sprache, Vorbestellung', () => {
  assert.equal(istPokemon({ titel: 'Pokémon TCG ETB' }), true);
  assert.equal(istPokemon({ titel: 'One Piece Display', tags: [] }), false);
  assert.equal(sprache('Top-Trainer-Box (Deutsch)'), 'DE');
  assert.equal(sprache('Elite Trainer Box English'), 'EN');
  assert.equal(istVorbestellung({ titel: 'VORBESTELLUNG Pokémon Display' }), true);
  assert.equal(istVorbestellung({ titel: 'Pokémon Display', tags: ['Pre-Order'] }), true);
});

test('UVP-Vergleich mit Spielraum 5 €', () => {
  const u = uvpFinden('Pokémon Delta-Herrschaft Top-Trainer-Box', 'top-trainer-box', uvp);
  assert.equal(u.uvp, 54.99);
  assert.equal(preisBewertung(59.99, u, 5).stufe, 'uvp');
  assert.equal(preisBewertung(60.0, u, 5).stufe, 'drueber');
  assert.equal(uvpFinden('Unbekanntes Set Top-Trainer-Box', 'top-trainer-box', uvp).quelle, 'standard');
  assert.equal(preisBewertung(NaN, u, 5).stufe, 'unbekannt');
});

test('Shopify-Produkte lesen', () => {
  const p = produkteAusShopify({ products: [{ id: 1, title: 'Pokémon ETB', vendor: 'Pokémon', tags: ['a'], handle: 'etb', variants: [{ available: false, price: '54.99' }, { available: true, price: '56.00' }] }] }, 'https://shop.de');
  assert.equal(p[0].verfuegbar, true);
  assert.equal(p[0].preis, 56);
  assert.equal(p[0].link, 'https://shop.de/products/etb');
});

test('Änderungen: erster Lauf still, danach neu/wieder-da/angekündigt', () => {
  const a = [{ id: '1', verfuegbar: false, preis: 50 }];
  const r1 = aenderungen({}, a, { ersterLauf: true });
  assert.equal(r1.meldungen.length, 0);
  const b = [{ id: '1', verfuegbar: true, preis: 50 }, { id: '2', verfuegbar: false }, { id: '3', verfuegbar: true, vorbestellung: true }];
  const typen = aenderungen(r1.merker, b, { ersterLauf: false }).meldungen.map((m) => m.typ);
  assert.deepEqual(typen, ['wieder-da', 'angekuendigt', 'vorbestellung']);
  const alt = [{ id: '9', verfuegbar: true, veroeffentlicht: '2025-01-01T00:00:00Z' }];
  assert.equal(aenderungen({ 1: { v: true } }, alt, { ersterLauf: false, jetzt: new Date('2026-11-09') }).meldungen.length, 0);
  assert.equal(aenderungen({ 1: { v: true } }, [{ id: '1', verfuegbar: true }], { ersterLauf: false }).meldungen.length, 0);
});

test('Push: ETB zum UVP = dringend; Probelauf ohne Kanal', async () => {
  const n = pushNachricht({ typ: 'wieder-da', haendler: 'Shop', titel: 'ETB', preis: 54.99, prioritaet: 1, bewertung: { stufe: 'uvp', uvp: 54.99 }, link: 'https://x' });
  assert.equal(n.priority, 5);
  assert.match(n.title, /🚨 WIEDER DA/);
  assert.equal(await pushSenden(n, { kanal: '', protokoll: () => {} }), false);
});
