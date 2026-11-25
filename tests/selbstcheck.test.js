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
  // GitHub + Handy = Alarm; X erst seit eben kaputt und 1 News-Quelle → nur Hinweise
  assert.equal(r.probleme.length, 2);
  assert.match(r.probleme[0], /vor 14 h/);
  assert.ok(!r.probleme.join(' ').includes('Müller'));
  assert.match(r.hinweise.join(' '), /Kurze Störung.*X/);
  assert.match(r.hinweise.join(' '), /News-Quellen/);
});
test('Selbstcheck: Alarm erst bei Händler-Fehler über 24 h bzw. 3+ News-Quellen', () => {
  const r = bewerten({ jetzt, letzterLauf: '2026-11-10T11:30:00Z', pulsAnzahl: 9,
    haendler: [{ id: 'x', name: 'X', status: 'aktiv', fehler: 'HTTP 500', fehlerSeit: '2026-11-09T08:00:00Z' }, { id: 'y', name: 'Y', status: 'aktiv', fehler: 'HTTP 503', fehlerSeit: '2026-11-10T09:00:00Z' }],
    newsFehler: { a: 'HTTP 404', b: 'HTTP 429', c: 'Zeitüberschreitung' } });
  assert.equal(r.probleme.length, 2);
  assert.match(r.probleme[0], /seit über 24 h.*X/);
  assert.ok(!r.probleme[0].includes('Y'));
});
test('Selbstcheck: veraltete UVP-Liste nur als Hinweis', () => {
  const r = bewerten({ jetzt, letzterLauf: '2026-11-10T11:30:00Z', pulsAnzahl: 5, uvpStand: '2026-06-01' });
  assert.equal(r.probleme.length, 0);
  assert.match(r.hinweise[0], /163 Tage alt/);
});
