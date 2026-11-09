import test from 'node:test';
import assert from 'node:assert/strict';
import { titelAusUrl, sealedUrls, sitemapWaechter } from '../src/sitemap-waechter.js';

test('Titel aus URL', () => {
  assert.equal(titelAusUrl('https://www.alternate.de/Pok%C3%A9mon/Pok%C3%A9mon-TCG-Delta-Herrschaft-Top-Trainer-Box-Sammelkarten/html/product/100'), 'Pokémon TCG Delta Herrschaft Top Trainer Box Sammelkarten');
  assert.equal(titelAusUrl('https://trader-online.de/pokemon/displays-boxen/delta-herrschaft-top-trainer-box-deutsch.html'), 'delta herrschaft top trainer box deutsch');
});

test('Sealed-URLs: Domain (mit/ohne www), Filterwort, Zubehör raus', () => {
  const h = { url: 'https://www.trader-online.de' };
  const urls = [
    'https://trader-online.de/pokemon/displays-boxen/delta-herrschaft-top-trainer-box-deutsch.html',
    'https://trader-online.de/pokemon/zubehoer/deckboxen/pokemon-deck-box-pikachu.html',
    'https://andere-seite.de/pokemon/top-trainer-box.html',
  ];
  const s = sealedUrls(urls, h);
  assert.equal(s.length, 1);
  assert.equal(s[0].art, 'top-trainer-box');
  assert.equal(sealedUrls(['https://www.alternate.de/LEGO/Pokemon-Box/html/product/1'], { url: 'https://www.alternate.de', urlFilter: 'Sammelkarten|TCG' }).length, 0);
});

// Kleiner Fake-Server: robots.txt → Sitemap, Produktseiten mit JSON-LD
function fakeHolen(seiten) {
  return async (url) => {
    const text = seiten[url];
    if (text == null) return { ok: false, status: 404, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
    return { ok: true, status: 200, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
  };
}
const ld = (preis, verf) => `<script type="application/ld+json">{"@type":"Product","name":"Pokémon TCG Delta Herrschaft Top Trainer Box","offers":{"price":"${preis}","availability":"https://schema.org/${verf}"}}</script>`;

test('Sitemap-Wächter: erster Lauf merkt nur, danach neu + wieder da', async () => {
  const h = { id: 'x', name: 'Shop X', url: 'https://shop.de', abfrage: 'sitemap-jsonld' };
  const a = 'https://shop.de/pokemon-tcg-alt-top-trainer-box';
  const b = 'https://shop.de/pokemon-tcg-delta-herrschaft-top-trainer-box';
  const seiten = {
    'https://shop.de/robots.txt': 'Sitemap: https://shop.de/sitemap.xml',
    'https://shop.de/sitemap.xml': `<urlset><url><loc>${a}</loc></url></urlset>`,
    [a]: ld('54.99', 'OutOfStock'),
  };
  const opt = { pause: 0, sitemapMinuten: 0 };
  let r = await sitemapWaechter(h, undefined, { ...opt, holen: fakeHolen(seiten) });
  assert.equal(r.meldungen.length, 0);
  assert.equal(r.stand.urls[a].v, false);

  seiten['https://shop.de/sitemap.xml'] = `<urlset><url><loc>${a}</loc></url><url><loc>${b}</loc></url></urlset>`;
  seiten[b] = ld('54.99', 'PreOrder');
  seiten[a] = ld('54.99', 'InStock');
  r = await sitemapWaechter(h, r.stand, { ...opt, holen: fakeHolen(seiten) });
  const typen = r.meldungen.map((m) => `${m.typ}:${m.link}`).sort();
  assert.deepEqual(typen, [`vorbestellung:${b}`, `wieder-da:${a}`]);
  assert.equal(r.meldungen[0].preis, 54.99);
});

test('Nur-Sitemap-Händler: neue URL = Frühwarnung ohne Seitenabruf', async () => {
  const h = { id: 'y', name: 'Shop Y', url: 'https://y.de', abfrage: 'sitemap' };
  const seiten = { 'https://y.de/sitemap.xml': '<urlset></urlset>' };
  let r = await sitemapWaechter(h, undefined, { holen: fakeHolen(seiten), sitemapMinuten: 0, pause: 0 });
  seiten['https://y.de/sitemap.xml'] = '<urlset><url><loc>https://y.de/pokemon-delta-herrschaft-display-36-booster</loc></url></urlset>';
  r = await sitemapWaechter(h, r.stand, { holen: fakeHolen(seiten), sitemapMinuten: 0, pause: 0 });
  assert.equal(r.meldungen.length, 1);
  assert.equal(r.meldungen[0].typ, 'angekuendigt');
  assert.equal(r.meldungen[0].art, 'display-36');
});
