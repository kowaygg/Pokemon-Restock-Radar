import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kleinanzeigenLink, ebayUmkreisLink, angebotBewerten } from '../src/lokal.js';
const lokal = JSON.parse(readFileSync(new URL('../config/lokal.json', import.meta.url)));
const r = lokal.bewertung;

test('Such-Links enthalten PLZ, Umkreis und Höchstpreis', () => {
  const s = lokal.suchen[0];
  assert.match(kleinanzeigenLink(s, lokal), /locationStr=79117.*radius=20.*maxPrice=60/);
  assert.match(ebayUmkreisLink(s, lokal), /_stpos=79117.*_sadis=20/);
});

test('Angebote bewerten', () => {
  assert.equal(angebotBewerten({ text: 'Top Trainer Box OVP mit Kassenbon', preis: 54, uvp: 54.99 }, r).stufe, 'gut');
  assert.equal(angebotBewerten({ text: 'Top Trainer Box OVP mit Kassenbon', preis: 54, uvp: 54.99 }, r).beleg, true);
  assert.equal(angebotBewerten({ text: 'TTB sealed', preis: 59, uvp: 54.99 }, r).stufe, 'ok');
  assert.equal(angebotBewerten({ text: 'TTB sealed', preis: 25, uvp: 54.99 }, r).stufe, 'zu-billig');
  assert.equal(angebotBewerten({ text: 'TTB leer, ohne Booster', preis: 20, uvp: 54.99 }, r).stufe, 'warnung');
  assert.equal(angebotBewerten({ text: 'Versand nur PayPal Freunde', preis: 50, uvp: 54.99 }, r).stufe, 'warnung');
  assert.equal(angebotBewerten({ text: 'Booster offene Fragen gerne', preis: 50, uvp: 54.99 }, r).stufe, 'gut');
});
