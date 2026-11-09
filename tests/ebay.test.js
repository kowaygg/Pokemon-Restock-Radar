import test from 'node:test';
import assert from 'node:assert/strict';
import { angebot, serioes, ebaySuche, ebayToken, _tokenZuruecksetzen } from '../src/ebay.js';

const roh = {
  itemId: 'v1|1|0', title: 'Pokémon Delta-Herrschaft Top-Trainer-Box OVP deutsch', itemWebUrl: 'https://www.ebay.de/itm/1',
  price: { value: '52.00', currency: 'EUR' }, buyingOptions: ['FIXED_PRICE'], shippingOptions: [{ shippingCost: { value: '4.99' } }],
  seller: { username: 'x', feedbackPercentage: '99.8', feedbackScore: 1200 }, itemLocation: { country: 'DE' },
};

test('Angebot: Preis + Versand, Auktion mit aktuellem Gebot', () => {
  const a = angebot(roh);
  assert.equal(a.gesamt, 56.99);
  assert.equal(a.sofortkauf, true);
  const auk = angebot({ ...roh, buyingOptions: ['AUCTION'], currentBidPrice: { value: '30.00' }, bidCount: 4, itemEndDate: '2026-11-09T20:10:00Z' });
  assert.deepEqual([auk.auktion, auk.preis, auk.gesamt, auk.gebote], [true, 30, 34.99, 4]);
  assert.equal(angebot({ ...roh, shippingOptions: [] }).versandUnbekannt, true);
});

test('Seriös: Warnwörter und Verkäufer-Bewertung', () => {
  assert.equal(serioes(angebot(roh)), true);
  assert.equal(serioes(angebot({ ...roh, title: 'Top Trainer Box LEER ohne Booster' })), false);
  assert.equal(serioes(angebot({ ...roh, title: 'Pokemon Konvolut Lot Karten' })), false);
  assert.equal(serioes(angebot({ ...roh, title: 'Pikachu Pilot Box' })), true);
  assert.equal(serioes(angebot({ ...roh, seller: { feedbackPercentage: '95.0', feedbackScore: 3000 } })), false);
  assert.equal(serioes(angebot({ ...roh, seller: { feedbackPercentage: '100', feedbackScore: 3 } })), false);
});

test('Suche: Anmeldung, Filter, Marktplatz DE; ohne Schlüssel aus', async () => {
  _tokenZuruecksetzen();
  delete process.env.EBAY_CLIENT_ID;
  assert.equal(await ebaySuche('x', { holen: async () => { throw new Error('darf nicht'); } }), null);
  process.env.EBAY_CLIENT_ID = 'id'; process.env.EBAY_CLIENT_SECRET = 'geheim';
  const aufrufe = [];
  const holen = async (url, opt) => {
    aufrufe.push({ url, opt });
    if (url.includes('oauth2/token')) return { ok: true, json: async () => ({ access_token: 'T', expires_in: 7200 }) };
    return { ok: true, status: 200, json: async () => ({ itemSummaries: [roh] }) };
  };
  const l = await ebaySuche('pokemon top trainer box', { art: 'auktion', maxPreis: 70, holen });
  assert.equal(l.length, 1);
  assert.equal(aufrufe[0].opt.headers.authorization, 'Basic ' + Buffer.from('id:geheim').toString('base64'));
  const such = decodeURIComponent(aufrufe[1].url);
  assert.match(such, /buyingOptions:\{AUCTION\}/);
  assert.match(such, /price:\[\.\.70\]/);
  assert.match(such, /sort=endingSoonest/);
  assert.equal(aufrufe[1].opt.headers['x-ebay-c-marketplace-id'], 'EBAY_DE');
  assert.equal(await ebayToken({ holen }), 'T'); // zwischengespeichert, keine neue Anmeldung
  assert.equal(aufrufe.length, 2);
  delete process.env.EBAY_CLIENT_ID; delete process.env.EBAY_CLIENT_SECRET; _tokenZuruecksetzen();
});
