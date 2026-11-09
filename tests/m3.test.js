import test from 'node:test';
import assert from 'node:assert/strict';
import { locs, istIndex, pokemonUrl } from '../src/sitemap.js';
import { produktAusHtml } from '../src/jsonld.js';

test('Sitemap lesen', () => {
  const xml = '<urlset><url><loc>https://s.de/pokemon-ttb</loc></url><url><loc><![CDATA[https://s.de/x?a=1&amp;b=2]]></loc></url></urlset>';
  assert.deepEqual(locs(xml), ['https://s.de/pokemon-ttb', 'https://s.de/x?a=1&b=2']);
  assert.equal(istIndex('<sitemapindex>'), true);
  assert.equal(pokemonUrl('https://s.de/Pok%C3%A9mon-Display'), true);
  assert.equal(pokemonUrl('https://s.de/one-piece'), false);
});

test('JSON-LD Produkt lesen', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"Pokémon TTB","gtin13":"0820650","offers":{"@type":"Offer","price":"54.99","priceCurrency":"EUR","availability":"https://schema.org/InStock"}}]}</script>`;
  const p = produktAusHtml(html);
  assert.equal(p.preis, 54.99);
  assert.equal(p.verfuegbar, true);
  assert.equal(p.status, 'InStock');
  const vb = produktAusHtml('<script type="application/ld+json">{"@type":"Product","name":"X","offers":[{"price":10,"availability":"http://schema.org/PreOrder"}]}</script>');
  assert.equal(vb.vorbestellung, true);
  assert.equal(produktAusHtml('<html></html>'), null);
});
