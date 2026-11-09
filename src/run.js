// Ein Durchlauf: alle aktiven Händler (Shopify + Sitemap/JSON-LD) abfragen, Änderungen erkennen, bewerten, pushen, Feed speichern.
// Fehler eines Händlers stoppen nie den ganzen Ablauf.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { shopifyHolen } from './shopify.js';
import { istPokemon, produktArt, sprache, istVorbestellung } from './produkt.js';
import { uvpFinden, preisBewertung, pushWert } from './uvp.js';
import { aenderungen } from './aenderungen.js';
import { sitemapWaechter, titelAusUrl } from './sitemap-waechter.js';
import { newsAbruf, newsPushWert, newsPushNachricht } from './news.js';
import { pushNachricht, pushSenden, bereitsGemeldet } from './push.js';

const lies = async (pfad, ersatz) => { try { return JSON.parse(await readFile(pfad, 'utf8')); } catch { return ersatz; } };
const { haendler } = await lies('config/haendler.json');
const uvpListe = await lies('config/uvp.json');
const { newsFeeds = [] } = await lies('config/release-quellen.json', {});
const einst = await lies('config/einstellungen.json');
const zustand = await lies('data/zustand.json', { haendler: {}, feed: [] });
if (zustand.version !== 2) { zustand.feed = []; zustand.version = 2; }
const kanal = process.env.NTFY_KANAL || '';
// Handy-Wächter (MODUS=handy): jede Minute Schnellcheck der neuesten Produkte, alle handyVollMinuten ein kompletter Durchlauf
const handy = process.env.MODUS === 'handy';
// Sparmodus (mobile Daten / Akku niedrig): keine großen Durchläufe, News seltener
const spar = handy && process.env.SPAR === '1';
if (process.env.NEWS_MINUTEN) einst.newsMinuten = Number(process.env.NEWS_MINUTEN);
const jetzt = new Date();

const bericht = [];
const lieferbarTop = [];
let pushes = 0;
let gemeldet = null;
async function melden(meldungen) {
  if (meldungen.length && !gemeldet) gemeldet = await bereitsGemeldet(kanal);
  for (const m of meldungen) {
    m.bewertung = preisBewertung(m.preis, uvpFinden(m.titel, m.art, uvpListe), uvpListe.spielraumEuro);
    m.zeit = jetzt.toISOString();
    zustand.feed.unshift({ zeit: m.zeit, typ: m.typ, haendler: m.haendler, titel: m.titel, art: m.art, prioritaet: m.prioritaet, preis: m.preis, bewertung: m.bewertung, sprache: m.sprache, link: m.link, warenkorb: m.warenkorb || null, quelle: m.quelle || 'shop' });
    if (pushes < einst.maxPushProLauf && (!einst.pushNurUvp || pushWert(m))) {
      if (gemeldet.has(m.link)) continue;
      if (await pushSenden(pushNachricht(m), { kanal })) { pushes++; gemeldet.add(m.link); }
    }
  }
}
const lieferbar = [];
const top = []; // jetzt bestellbar, sealed, ≤ UVP + Spielraum
for (const h of haendler.filter((x) => x.status === 'aktiv' && x.abfrage === 'shopify')) {
  // Nach „zu viele Anfragen“ (HTTP 429) den Händler eine Weile in Ruhe lassen
  const pause = zustand.haendler[h.id]?.pauseBis;
  if (pause && jetzt < Date.parse(pause)) { bericht.push(`| ${h.name} | ⏸ Pause bis ${pause.slice(11, 16)} UTC (zu viele Anfragen) | – | – | – | – |`); continue; }
  try {
    const vollZeit = zustand.haendler[h.id]?.vollScan;
    const voll = !handy || (!spar && (!vollZeit || jetzt - Date.parse(vollZeit) >= einst.handyVollMinuten * 60000));
    const roh = await shopifyHolen(h, voll ? { maxSeiten: einst.maxSeiten } : { maxSeiten: 1, limit: einst.handyLimit });
    const sealed = roh.filter(istPokemon).map((p) => ({ ...p, ...produktArt(p.titel) })).filter((p) => p.art)
      .map((p) => ({ ...p, sprache: sprache(p.titel), vorbestellung: istVorbestellung(p), haendler: h.name, haendlerId: h.id }));
    for (const p of sealed.filter((x) => x.verfuegbar)) {
      const b = preisBewertung(p.preis, uvpFinden(p.titel, p.art, uvpListe), uvpListe.spielraumEuro);
      if (b.stufe === 'uvp') top.push({ haendler: p.haendler, titel: p.titel, art: p.art, prioritaet: p.prioritaet, preis: p.preis, bewertung: b, sprache: p.sprache, vorbestellung: p.vorbestellung, link: p.link, warenkorb: p.warenkorb });
      if (p.prioritaet !== 1) continue;
      lieferbar.push({ haendler: p.haendler, titel: p.titel, art: p.art, prioritaet: p.prioritaet, preis: p.preis, bewertung: b, link: p.link });
      lieferbarTop.push(`- ${b.stufe === 'uvp' ? '✅' : '⚠'} ${p.haendler}: ${p.titel} · ${p.preis} €${b.stufe === 'drueber' ? ` (+${b.differenz} € über UVP)` : ''}`);
    }
    const alt = zustand.haendler[h.id]?.produkte || {};
    const ersterLauf = !zustand.haendler[h.id];
    const { meldungen, merker } = aenderungen(alt, sealed, { ersterLauf, jetzt });
    // Schnellcheck sieht nur einen Ausschnitt → Gedächtnis behalten, damit Restocks alter Produkte erkannt werden
    zustand.haendler[h.id] = { produkte: voll ? merker : { ...alt, ...merker }, stand: jetzt.toISOString(), fehler: null, vollScan: voll ? jetzt.toISOString() : vollZeit };
    await melden(meldungen);
    bericht.push(`| ${h.name} | ✅ | ${roh.length} | ${sealed.length} | ${sealed.filter((p) => p.verfuegbar).length} | ${ersterLauf ? 'erster Lauf (nur merken)' : meldungen.length} |`);
  } catch (e) {
    // Pause wächst bei wiederholtem 429: 10 → 20 → 40 → … höchstens 120 Min.
    const stufe429 = /429/.test(e.message) ? (zustand.haendler[h.id]?.stufe429 || 0) + 1 : 0;
    const pauseMin = stufe429 ? Math.min(120, einst.pauseNach429Minuten * 2 ** (stufe429 - 1)) : 0;
    const pauseBis = pauseMin ? new Date(jetzt.getTime() + pauseMin * 60000).toISOString() : null;
    zustand.haendler[h.id] = { ...(zustand.haendler[h.id] || {}), fehler: e.message, fehlerZeit: jetzt.toISOString(), pauseBis, stufe429 };
    bericht.push(`| ${h.name} | ❌ ${e.message}${pauseBis ? ` → Pause ${pauseMin} Min.` : ''} | – | – | – | – |`);
  }
}
// Sitemap-Händler macht der GitHub-Wächter (Handy spart Datenvolumen)
for (const h of haendler.filter((x) => x.status === 'aktiv' && /^sitemap/.test(x.abfrage) && !handy)) {
  try {
    const alt = zustand.haendler[h.id]?.sitemap;
    const { meldungen, stand, info } = await sitemapWaechter(h, alt, { jetzt, sitemapMinuten: einst.sitemapMinuten, seitenProLauf: einst.seitenProLauf });
    zustand.haendler[h.id] = { sitemap: stand, stand: jetzt.toISOString(), fehler: null };
    await melden(meldungen);
    for (const [url, z] of Object.entries(stand.urls)) {
      const a = produktArt(titelAusUrl(url));
      if (!z.v || !a) continue;
      const b = preisBewertung(z.p, uvpFinden(titelAusUrl(url), a.art, uvpListe), uvpListe.spielraumEuro);
      if (b.stufe === 'uvp') top.push({ haendler: h.name, titel: titelAusUrl(url), art: a.art, prioritaet: a.prioritaet, preis: z.p, bewertung: b, sprache: sprache(titelAusUrl(url)), link: url, warenkorb: null });
      if (a.prioritaet !== 1) continue;
      lieferbar.push({ haendler: h.name, titel: titelAusUrl(url), art: a.art, prioritaet: 1, preis: z.p, bewertung: b, link: url });
      lieferbarTop.push(`- ${b.stufe === 'uvp' ? '✅' : '⚠'} ${h.name}: ${titelAusUrl(url)} · ${z.p} €`);
    }
    bericht.push(`| ${h.name} | ✅ ${h.abfrage}${info.sitemapGelesen ? ' (Sitemap gelesen)' : ''} | ${info.kandidaten} URLs | ${info.seiten} Seiten geprüft | – | ${alt ? meldungen.length : 'erster Lauf (nur merken)'} |`);
  } catch (e) {
    zustand.haendler[h.id] = { ...(zustand.haendler[h.id] || {}), fehler: e.message, fehlerZeit: jetzt.toISOString() };
    bericht.push(`| ${h.name} | ❌ ${e.message} | – | – | – | – |`);
  }
}
// News & Leaks (alle newsMinuten)
zustand.news ||= [];
const newsFaellig = !zustand.newsZeit || jetzt - Date.parse(zustand.newsZeit) >= einst.newsMinuten * 60000 - 30000;
if (newsFaellig && newsFeeds.length) {
  const { neu, stand, fehler } = await newsAbruf(newsFeeds, zustand.newsStand, { jetzt });
  zustand.newsStand = stand;
  zustand.newsFehler = fehler;
  zustand.newsZeit = jetzt.toISOString();
  let newsPushes = 0;
  if (neu.length && !gemeldet) gemeldet = await bereitsGemeldet(kanal);
  for (const n of neu) {
    const { still, ...eintrag } = n;
    zustand.news.unshift(eintrag);
    if (!n.still && newsPushWert(n) && newsPushes < einst.maxNewsPushProLauf && !gemeldet.has(n.link)) {
      if (await pushSenden(newsPushNachricht(n), { kanal })) { newsPushes++; pushes++; gemeldet.add(n.link); }
    }
  }
  bericht.push(`| News & Leaks | ${Object.keys(fehler).length ? '⚠ ' + Object.entries(fehler).map(([k, v]) => k + ': ' + v).join(', ') : '✅'} | ${newsFeeds.length} Quellen | ${neu.length} neu | – | – |`);
}
zustand.news = zustand.news.filter((n) => Date.parse(n.zeit) >= jetzt.getTime() - einst.newsTage * 86400000).slice(0, 300);
const grenze = jetzt.getTime() - einst.feedTage * 86400000;
zustand.feed = zustand.feed.filter((f) => Date.parse(f.zeit) >= grenze).slice(0, 500);
zustand.letzterLauf = jetzt.toISOString();
await mkdir('data', { recursive: true });
await writeFile('data/zustand.json', JSON.stringify(zustand));
// Öffentlicher Auszug für die App (nur Produktdaten, nichts Persönliches)
const oeffentlich = {
  letzterLauf: zustand.letzterLauf, feed: zustand.feed.slice(0, 300),
  top: top.sort((a, b) => a.prioritaet - b.prioritaet || a.bewertung.differenz - b.bewertung.differenz).slice(0, 100),
  lieferbar: lieferbar.sort((a, b) => (a.bewertung?.differenz ?? 999) - (b.bewertung?.differenz ?? 999)),
  haendler: haendler.map((h) => ({ id: h.id, name: h.name, url: h.url, art: h.art, status: h.status, abfrage: h.abfrage || null, stand: zustand.haendler[h.id]?.stand || null, fehler: zustand.haendler[h.id]?.fehler || null })),
  uvp: uvpListe,
  news: zustand.news.slice(0, 200),
  newsFehler: zustand.newsFehler || {},
};
await writeFile('data/oeffentlich.json', JSON.stringify(oeffentlich));

const md = ['| Händler | Status | Produkte gesamt | Pokémon-Sealed | davon lieferbar | Meldungen |', '|---|---|---|---|---|---|', ...bericht,
  '', `Push: ${kanal ? `${pushes} gesendet` : 'Probelauf (kein Kanal eingerichtet)'}`, '',
  `**Jetzt lieferbare Top-Trainer-Boxen (${lieferbarTop.length}):**`, ...lieferbarTop.slice(0, 60), '',
  '**Letzte Meldungen:**', ...zustand.feed.slice(0, 15).map((f) => `- ${f.zeit.slice(0, 16)} · ${f.typ} · ${f.haendler} · ${f.titel} · ${Number.isFinite(f.preis) ? f.preis + ' €' : '?'} · ${f.bewertung?.stufe}`)].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Pokémon-Restock-Radar\n\n' + md + '\n');
