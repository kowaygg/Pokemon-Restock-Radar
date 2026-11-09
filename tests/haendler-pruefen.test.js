import test from 'node:test';
import assert from 'node:assert/strict';
import { shopSystem, botSchutz, robotsRegeln, erlaubt, impressumLink, registerAngaben } from '../src/haendler-pruefen.js';

test('Shop-System erkennen', () => {
  assert.deepEqual(shopSystem('<script src="//cdn.shopify.com/x.js">'), ['Shopify']);
  assert.deepEqual(shopSystem('<html>nichts</html>'), []);
});

test('Bot-Schutz erkennen', () => {
  assert.deepEqual(botSchutz(403, '<title>Just a moment...</title>', new Headers()), ['HTTP 403', 'Cloudflare-Challenge']);
  assert.deepEqual(botSchutz(200, 'ok', new Headers()), []);
});

test('robots.txt: nur Regeln für alle Bots', () => {
  const txt = 'User-agent: Googlebot\nDisallow: /geheim\n\nUser-agent: *\nDisallow: /checkout\nDisallow: /*?sort=\n';
  const r = robotsRegeln(txt);
  assert.deepEqual(r, ['/checkout', '/*?sort=']);
  assert.equal(erlaubt(r, '/products.json'), true);
  assert.equal(erlaubt(r, '/checkout/1'), false);
  assert.equal(erlaubt(r, '/x?sort=preis'), false);
});

test('Impressum-Link und Registerangaben', () => {
  assert.equal(impressumLink('<a href="/pages/impressum">Impressum</a>', 'https://shop.de'), 'https://shop.de/pages/impressum');
  const a = registerAngaben('<p>Amtsgericht Freiburg</p><p>HRB 712345</p><p>USt-IdNr.: DE 123 456 789</p>');
  assert.equal(a.register, 'HRB 712345');
  assert.equal(a.gericht, 'Freiburg');
  assert.equal(a.ustId, 'DE123456789');
});
