import test from 'node:test';
import assert from 'node:assert/strict';
import { marktSpannen } from '../src/markt.js';

test('Marktspanne je Art und Sprache, erst ab 3 Angeboten', () => {
  const a = [29.9, 34.9, 39.9, 99.9, 119.9].map((preis) => ({ art: 'display-36', sprache: 'CN', preis }))
    .concat([{ art: 'tin', sprache: 'DE', preis: 20 }, { art: 'tin', sprache: 'DE', preis: 25 }]);
  const m = marktSpannen(a);
  assert.deepEqual(m['CN|display-36'], { von: 29.9, bis: 119.9, mitte: 39.9, n: 5 });
  assert.equal(m['DE|tin'], undefined);
});
