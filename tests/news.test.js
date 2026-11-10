import test from 'node:test';
import assert from 'node:assert/strict';
import { feedEintraege, pokemonNewsEintraege, einordnen, newsAbruf, newsPushWert, newsPushNachricht } from '../src/news.js';

const rss = (titel, link) => `<rss><channel><item><title><![CDATA[${titel}]]></title><link>${link}</link><pubDate>Mon, 09 Nov 2026 10:00:00 +0100</pubDate><description>&lt;p&gt;Text&lt;/p&gt;</description></item></channel></rss>`;

test('RSS und Atom lesen', () => {
  const e = feedEintraege(rss('Pokémon &#8222;Delta&#8220; Top Trainer Box', 'https://a.de/1'));
  assert.equal(e[0].titel, 'Pokémon „Delta“ Top Trainer Box');
  assert.equal(e[0].zeit, '2026-11-09T09:00:00.000Z');
  const a = feedEintraege('<feed><entry><title>Pokemon ETB deal</title><link href="https://r.com/x"/><updated>2026-11-09T10:00:00Z</updated></entry></feed>');
  assert.equal(a[0].link, 'https://r.com/x');
  assert.equal(pokemonNewsEintraege('<a href="/de/news/kartenvorschau-mega-rayquaza">x</a><a href="/de/news/kartenvorschau-mega-rayquaza">').length, 1);
});

test('Einordnung: Pokémon Center, Vorbestellung, Leak, Deal, irrelevant', () => {
  const q = { stufe: 'B' };
  assert.equal(einordnen({ titel: '[Pokemon Center] Display Delta-Herrschaft wieder da', text: '' }, { stufe: 'C', deal: true }).pokemonCenter, true);
  assert.equal(einordnen({ titel: 'Top-Trainer-Box Aura Seeker: Vorbestellung gestartet', text: '' }, q).art, 'vorbestellung');
  assert.equal(einordnen({ titel: 'Neue Karten aus „Aura Seeker“ enthüllt!', text: '' }, q).art, 'leak');
  assert.equal(einordnen({ titel: 'Pokémon Legenden Z-A Update', text: '' }, q), null);
  assert.equal(einordnen({ titel: 'Lego Angebot', text: 'Karten' }, { stufe: 'B', nurPokemon: true }), null);
});

test('News-Abruf: erster Lauf still, danach neu + Push-Regeln', async () => {
  const quellen = [{ id: 'q', name: 'Q', typ: 'rss', url: 'https://q.de/feed', stufe: 'C', deal: true, nurPokemon: true }];
  let xml = rss('Pokemon Top Trainer Box 49,99€', 'https://q.de/1');
  const holen = async () => ({ ok: true, text: async () => xml });
  const jetzt = new Date('2026-11-09T12:00:00Z');
  let r = await newsAbruf(quellen, {}, { holen, jetzt });
  assert.equal(r.neu.length, 1);
  assert.equal(r.neu[0].still, true);
  xml = rss('Pokemon Center: Display wieder verfügbar', 'https://q.de/2') + rss('Pokemon Top Trainer Box 49,99€', 'https://q.de/1');
  r = await newsAbruf(quellen, r.stand, { holen, jetzt });
  assert.equal(r.neu.length, 1);
  assert.equal(r.neu[0].still, false);
  assert.equal(newsPushWert(r.neu[0]), true);
  assert.equal(newsPushNachricht(r.neu[0]).priority, 5);
  assert.match(newsPushNachricht(r.neu[0]).message, /Community-Hinweis/);
});

test('Vor Ort: Ketten erkennen, Startdatum lesen, Push', async () => {
  const { datumAus } = await import('../src/news.js');
  const n = einordnen({ titel: '[Aldi Süd] Pokémon Top-Trainer-Box ab 16.11. für 39,99€', text: '' }, { stufe: 'C', deal: true, nurPokemon: true });
  assert.equal(n.vorOrt, true);
  assert.equal(n.abDatum, '16.11.');
  assert.equal(newsPushWert({ ...n, art: 'deal' }), true);
  assert.match(newsPushNachricht({ ...n, titel: 'x', quelle: 'mydealz', bestaetigt: false }).message, /Start: 16\.11\./);
  assert.equal(datumAus('Lidl: Pokémon Kollektion ab Montag'), 'ab Montag');
  assert.equal(einordnen({ titel: 'Pokémon Display online bei TCGViert', text: '' }, { stufe: 'B' }).vorOrt, false);
});

test('Reddit-Gruppe: pro Durchlauf nur eine Quelle, eigener Takt', async () => {
  const quellen = ['a', 'b'].map((id) => ({ id, name: id, typ: 'rss', url: `https://r/${id}`, stufe: 'C', gruppe: 'reddit', minuten: 20 }));
  const geholt = [];
  const holen = async (url) => { geholt.push(url); return { ok: true, text: async () => '<rss></rss>' }; };
  const t0 = new Date('2026-11-09T12:00:00Z');
  let r = await newsAbruf(quellen, {}, { holen, jetzt: t0 });
  assert.deepEqual(geholt, ['https://r/a']);
  r = await newsAbruf(quellen, r.stand, { holen, jetzt: new Date(t0.getTime() + 60000) });
  assert.deepEqual(geholt, ['https://r/a', 'https://r/b']);
  r = await newsAbruf(quellen, r.stand, { holen, jetzt: new Date(t0.getTime() + 120000) });
  assert.equal(geholt.length, 2); // beide im 20-Minuten-Takt noch nicht wieder dran
});

test('Amazon-Einladung und Pokémon Center aus Reddit lösen Push aus', () => {
  const r = einordnen({ titel: 'Pokémon Delta Herrschaft ETB on Amazon – request invite now', text: '' }, { stufe: 'C', push: false });
  assert.equal(r.amazonEinladung, true);
  assert.equal(newsPushWert(r), true);
  const p = newsPushNachricht({ ...r, titel: 'x', quelle: 'Reddit', bestaetigt: false });
  assert.match(p.title, /Amazon-Einladung anfragen/);
  assert.equal(p.priority, 5);
  assert.equal(einordnen({ titel: 'Pokémon Display bei Amazon für 179 €', text: '' }, { stufe: 'C', deal: true }).amazonEinladung, false);
});

test('Regionsfilter: nur Freiburg/Südbaden/BW oder bundesweit', async () => {
  const { fremdeRegion } = await import('../src/news.js');
  assert.equal(fremdeRegion('Netto: Pokémon Illumina City Mini Tin ab 16.11. – Region Berlin-Brandenburg'), true);
  assert.equal(fremdeRegion('Kaufland Prospekt Bayern: Pokémon Display ab Montag'), true);
  assert.equal(fremdeRegion('Kaufland Baden-Württemberg und Bayern: Pokémon TTB'), false);
  assert.equal(fremdeRegion('Aldi Süd bundesweit: Pokémon Top-Trainer-Box ab 16.11.'), false);
  assert.equal(fremdeRegion('Müller Freiburg: Pokémon Restock'), false);
  assert.equal(fremdeRegion('Lidl: Pokémon Kollektion ab Montag'), false);
  const n = einordnen({ titel: '[Netto] Pokémon Mini Tin ab 16.11. (Region Berlin-Brandenburg)', text: '' }, { stufe: 'C', deal: true, nurPokemon: true });
  assert.deepEqual([n.vorOrt, n.fremdeRegion, newsPushWert(n)], [false, true, false]);
});
