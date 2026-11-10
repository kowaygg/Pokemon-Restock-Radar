import test from 'node:test';
import assert from 'node:assert/strict';
import { haendlerEntdecken } from '../src/entdecker.js';
import { feedEintraege } from '../src/news.js';

test('Händler und Links aus mydealz-RSS lesen', () => {
  const xml = '<rss><item><pepper:merchant name="Lucky Bricks" price="49,99€"/><title><![CDATA[Pokémon TTB bei Lucky Bricks]]></title><link>https://www.mydealz.de/deals/1</link><description><![CDATA[<a href="https://www.luckybricks.de/p/ttb?ref=x&amp;y=1">Link</a>]]></description></item></rss>';
  const [e] = feedEintraege(xml);
  assert.equal(e.haendler, 'Lucky Bricks');
  assert.deepEqual(e.links, ['https://www.luckybricks.de/p/ttb?ref=x&y=1']);
});

test('Entdecker: zählt verschiedene Deals, ignoriert Bekannte/Plattformen, prüft Shopify', async () => {
  const deals = [
    { titel: 'TTB A', haendler: 'Lucky Bricks', links: ['https://www.luckybricks.de/p/1', 'https://www.amazon.de/x'] },
    { titel: 'TTB A', haendler: 'Lucky Bricks', links: ['https://www.luckybricks.de/p/1'] },
    { titel: 'Display B', haendler: 'Lucky Bricks', links: ['https://luckybricks.de/p/2'] },
    { titel: 'Display C', haendler: 'TCGViert', links: ['https://tcgviert.com/p/3'] },
  ];
  const holen = async (url) => ({ ok: true, json: async () => (url.includes('luckybricks') ? { products: [] } : {}) });
  const l = await haendlerEntdecken({}, deals, new Set(['tcgviert.com']), { holen });
  assert.deepEqual(Object.keys(l), ['luckybricks.de']);
  assert.equal(l['luckybricks.de'].anzahl, 2);
  assert.equal(l['luckybricks.de'].shopify, true);
});

test('Preisvergleiche ignorieren, Name nur wenn passend', async () => {
  const deals = [{ titel: 'TTB', haendler: 'Foot Locker', links: ['https://www.idealo.de/x', 'https://www.footlocker.de/p', 'https://www.expert.de/p'] }];
  const l = await haendlerEntdecken({}, deals, new Set(), { holen: async () => ({ ok: false }), maxProben: 0 });
  assert.deepEqual(Object.keys(l).sort(), ['expert.de', 'footlocker.de']);
  assert.equal(l['footlocker.de'].name, 'Foot Locker');
  assert.equal(l['expert.de'].name, 'expert.de');
});

test('Händlername ohne Shop-Link wird gemerkt, bekannte Namen nicht', async () => {
  const deals = [{ titel: 'Display bei Coolblue', haendler: 'Coolblue', link: 'https://www.mydealz.de/d/1', links: [] }, { titel: 'TTB Amazon', haendler: 'Amazon', links: [] }, { titel: 'X', haendler: 'TCGViert', links: [] }];
  const l = await haendlerEntdecken({}, deals, new Set(), { maxProben: 0, bekanntNamen: new Set(['amazon', 'tcgviert']) });
  assert.deepEqual(Object.values(l).map((e) => e.name), ['Coolblue']);
});
