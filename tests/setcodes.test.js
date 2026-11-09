import test from 'node:test';
import assert from 'node:assert/strict';
import { setCodes, neueSetCodes } from '../src/setcodes.js';

test('Set-Codes erkennen, Jahreszahlen/Mengen ignorieren', () => {
  assert.deepEqual(setCodes('Pokemon ME04 Mega Entwicklung Wachsendes Chaos Display'), ['ME4']);
  assert.deepEqual(setCodes('Pokemon ME2.5 Mega Entwicklung Erhabene Helden TTB'), ['ME2.5']);
  assert.deepEqual(setCodes('pokemon-kp10-5-top-trainer-box'), ['KP10']);
  assert.deepEqual(setCodes('Scarlet & Violet SV10 Destined Rivals'), ['SV10']);
  assert.deepEqual(setCodes('Display 36 Booster 2026'), []);
});

test('Neue Codes: erster Lauf still, danach Meldung', () => {
  let r = neueSetCodes(undefined, [{ titel: 'ME06 Delta Herrschaft Display', link: 'https://a/1', haendler: 'A' }]);
  assert.equal(r.neu.length, 0);
  r = neueSetCodes({ bekannt: r.bekannt }, [{ titel: 'ME06 Display', link: 'https://a/1', haendler: 'A' }, { titel: 'Pokemon ME07 Top Trainer Box', link: 'https://b/2', haendler: 'B' }]);
  assert.deepEqual(r.neu.map((n) => n.code), ['ME7']);
});
