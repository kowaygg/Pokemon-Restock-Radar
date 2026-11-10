import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinZeit, musterZaehlen, musterAuswerten } from '../src/muster.js';

test('Berliner Zeit: Wochentag + Stunde', () => {
  assert.deepEqual(berlinZeit(new Date('2026-11-10T09:30:00Z')), { tag: 1, stunde: 10 }); // Dienstag 10 Uhr (MEZ)
});

test('Muster zählen und Prognose', () => {
  let s = {};
  for (const iso of ['2026-11-03T09:10:00Z', '2026-11-10T09:05:00Z', '2026-11-10T09:40:00Z', '2026-11-05T15:00:00Z', '2026-11-17T09:20:00Z']) {
    s = musterZaehlen(s, { typ: 'wieder-da', haendlerId: 'x', haendler: 'Shop X' }, new Date(iso));
  }
  s = musterZaehlen(s, { typ: 'angekuendigt', haendlerId: 'x', haendler: 'Shop X' }, new Date());
  const [a] = musterAuswerten(s, new Date('2026-11-11T12:00:00Z')); // Mittwoch
  assert.deepEqual([a.anzahl, a.tag, a.stunde, a.sicher], [5, 'Dienstag', 10, true]);
  assert.equal(a.naechster, 'Dienstag ab 10 Uhr');
  assert.equal(musterAuswerten(s, new Date('2026-11-16T12:00:00Z'))[0].naechster, 'morgen ab 10 Uhr');
});
