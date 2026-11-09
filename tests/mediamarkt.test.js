import test from 'node:test';
import assert from 'node:assert/strict';
import { sucheLesen, produktseiteLesen, mediamarktHolen } from '../src/mediamarkt.js';

const suche = (items) => `<script type="application/ld+json">${JSON.stringify({ '@type': 'ItemList', itemListElement: items.map(([name, price, id]) => ({ item: { '@type': 'Product', name, offers: { price }, url: `https://www.mediamarkt.de/de/product/_x-${id}.html` } })) })}</script>`;

test('Suche und Produktseite lesen', () => {
  const s = sucheLesen(suche([['POKEMON Delta Herrschaft Top Trainer Box', 54.99, 111]]), 'https://www.mediamarkt.de');
  assert.deepEqual(s[0], { id: '111', titel: 'POKEMON Delta Herrschaft Top Trainer Box', preis: 54.99, link: 'https://www.mediamarkt.de/de/product/_x-111.html' });
  assert.equal(produktseiteLesen('"sellerName":"Game World","availability":"https://schema.org/InStock"').eigen, false);
  const eigen = produktseiteLesen('"availability":"https://schema.org/InStock"');
  assert.equal(eigen.eigen && eigen.verfuegbar, true);
});

test('Nur UVP-Treffer werden geprüft, Marktplatz zählt nicht', async () => {
  const seiten = {
    'https://www.mediamarkt.de/de/search.html?query=q': suche([['TTB A', 54.99, 1], ['TTB B', 54.99, 2], ['TTB teuer', 999, 3]]),
    'https://www.mediamarkt.de/de/product/_x-1.html': '"availability":"https://schema.org/InStock"',
    'https://www.mediamarkt.de/de/product/_x-2.html': '"sellerName":"TCC-Shop","availability":"https://schema.org/InStock"',
  };
  const geoeffnet = [];
  const holen = async (url) => { geoeffnet.push(url); return { ok: true, text: async () => seiten[url] || '' }; };
  const l = await mediamarktHolen({ url: 'https://www.mediamarkt.de' }, { holen, suchen: ['q'], pruefen: (p) => p.preis < 100, pause: 0 });
  assert.deepEqual(l.map((p) => [p.id, p.verfuegbar, p.marktplatz]), [['1', true, false], ['2', false, true], ['3', false, true]]);
  assert.equal(geoeffnet.length, 3); // Suche + 2 Produktseiten, die teure nicht
});
