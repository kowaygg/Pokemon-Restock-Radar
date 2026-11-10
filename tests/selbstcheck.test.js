import test from 'node:test';
import assert from 'node:assert/strict';
import { bewerten } from '../scripts/selbstcheck.js';

const jetzt = new Date('2026-11-10T12:00:00Z');
test('Selbstcheck: alles gut', () => {
  const r = bewerten({ jetzt, letzterLauf: '2026-11-10T11:30:00Z', pulsAnzahl: 20, haendler: [{ id: 'a', name: 'A', status: 'aktiv' }], newsFehler: {} });
  assert.equal(r.probleme.length, 0);
});
test('Selbstcheck: GitHub steht, Handy still, Händler kaputt (Müller nur Handy → kein Alarm)', () => {
  const r = bewerten({ jetzt, letzterLauf: '2026-11-09T22:00:00Z', pulsAnzahl: 0, haendler: [{ id: 'mueller', name: 'Müller', status: 'aktiv', fehler: 'Sitemap nicht lesbar' }, { id: 'x', name: 'X', status: 'aktiv', fehler: 'HTTP 500' }], newsFehler: { reddit: 'HTTP 429' } });
  assert.equal(r.probleme.length, 4);
  assert.match(r.probleme[0], /vor 14 h/);
  assert.ok(!r.probleme.join(' ').includes('Müller'));
});
