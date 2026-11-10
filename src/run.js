// Ein Durchlauf: alle aktiven Händler (Shopify + Sitemap/JSON-LD) abfragen, Änderungen erkennen, bewerten, pushen, Feed speichern.
// Fehler eines Händlers stoppen nie den ganzen Ablauf.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { shopifyHolen } from './shopify.js';
import { istPokemon, produktArt, sprache, istVorbestellung } from './produkt.js';
import { uvpFinden, preisBewertung, pushWert, versandFuer } from './uvp.js';
import { aenderungen } from './aenderungen.js';
import { sitemapWaechter, titelAusUrl } from './sitemap-waechter.js';
import { newsAbruf, newsPushWert, newsPushNachricht } from './news.js';
import { mediamarktHolen } from './mediamarkt.js';
import { neueSetCodes } from './setcodes.js';
import { haendlerEntdecken, domainAus } from './entdecker.js';
import { ebaySuche, ebayGraded, serioes } from './ebay.js';
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
    if (m.quelle !== 'ebay') Object.assign(m, (({ bewertung, versand }) => ({ bewertung, versand }))(bewerteGesamt(m.titel, m.art, m.preis, m.haendlerId)));
    else m.bewertung = preisBewertung(m.preis, uvpFinden(m.titel, m.art, uvpListe), uvpListe.spielraumEuro);
    m.zeit = jetzt.toISOString();
    zustand.feed.unshift({ id: m.id, haendlerId: m.haendlerId, zeit: m.zeit, typ: m.typ, haendler: m.haendler, titel: m.titel, art: m.art, prioritaet: m.prioritaet, preis: m.preis, versand: m.versand ?? null, bewertung: m.bewertung, sprache: m.sprache, link: m.link, warenkorb: m.warenkorb || null, quelle: m.quelle || 'shop', vorOrt: !!m.vorOrt });
    if (pushes < einst.maxPushProLauf && (!einst.pushNurUvp || pushWert(m))) {
      if (gemeldet.has(m.link)) continue;
      if (await pushSenden(pushNachricht(m), { kanal })) { pushes++; gemeldet.add(m.link); }
    }
  }
}
const lieferbar = [];
const haendlerNach = Object.fromEntries(haendler.map((h) => [h.id, h]));
// Wechselkurse (EZB, offiziell, kostenlos) für UVPs in Yen/Won – einmal am Tag
if (!zustand.kurse || jetzt - Date.parse(zustand.kurse.zeit) > 20 * 3600000) {
  try {
    const xml = await (await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', { signal: AbortSignal.timeout(15000) })).text();
    const werte = Object.fromEntries([...xml.matchAll(/currency='([A-Z]{3})' rate='([\d.]+)'/g)].map((m) => [m[1], Number(m[2])]));
    if (werte.JPY) zustand.kurse = { zeit: jetzt.toISOString(), stand: (xml.match(/time='([\d-]+)'/) || [])[1], werte };
  } catch {}
}
uvpListe.kurse = zustand.kurse?.werte || {};
// Bewertung mit Versand: gesamt = Preis + Versand (falls bekannt); unbekannter Versand wird angezeigt, nicht geraten
function bewerteGesamt(titel, art, preis, haendlerId) {
  const versand = Number.isFinite(preis) ? versandFuer(haendlerNach[haendlerId], preis) : null;
  const gesamt = Number.isFinite(preis) ? Math.round((preis + (versand ?? 0)) * 100) / 100 : NaN;
  return { bewertung: preisBewertung(gesamt, uvpFinden(titel, art, uvpListe), uvpListe.spielraumEuro), versand, gesamt };
}
const top = []; // jetzt bestellbar, sealed, ≤ UVP + Spielraum
const setQuellen = []; // Produktnamen/-links für das Set-Code-Radar
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
    for (const p of sealed) setQuellen.push({ titel: p.titel, link: p.link, haendler: h.name });
    for (const p of sealed.filter((x) => x.verfuegbar)) {
      const { bewertung: b, versand } = bewerteGesamt(p.titel, p.art, p.preis, h.id);
      if (b.stufe === 'uvp') top.push({ haendler: p.haendler, titel: p.titel, art: p.art, prioritaet: p.prioritaet, preis: p.preis, versand, bewertung: b, sprache: p.sprache, vorbestellung: p.vorbestellung, link: p.link, warenkorb: p.warenkorb });
      if (p.prioritaet !== 1 || b.stufe === 'unplausibel') continue; // leere/kaputte Boxen o. Ä. nie anzeigen
      lieferbar.push({ haendler: p.haendler, titel: p.titel, art: p.art, prioritaet: p.prioritaet, preis: p.preis, versand, bewertung: b, link: p.link });
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
// Sitemap-Händler: GitHub immer, Handy nur im WLAN (unterwegs spart das Datenvolumen)
for (const h of haendler.filter((x) => x.status === 'aktiv' && /^sitemap/.test(x.abfrage) && !spar)) {
  try {
    const alt = zustand.haendler[h.id]?.sitemap;
    const { meldungen, stand, info } = await sitemapWaechter(h, alt, { jetzt, sitemapMinuten: einst.sitemapMinuten, seitenProLauf: handy ? einst.seitenProLaufHandy : einst.seitenProLauf });
    zustand.haendler[h.id] = { sitemap: stand, stand: jetzt.toISOString(), fehler: null };
    await melden(meldungen);
    for (const url of Object.keys(stand.urls)) setQuellen.push({ titel: titelAusUrl(url), link: url, haendler: h.name });
    for (const [url, z] of Object.entries(stand.urls)) {
      const a = produktArt(titelAusUrl(url));
      if (!z.v || !a) continue;
      const { bewertung: b, versand } = bewerteGesamt(titelAusUrl(url), a.art, z.p, h.id);
      if (b.stufe === 'uvp') top.push({ haendler: h.name, titel: titelAusUrl(url), art: a.art, prioritaet: a.prioritaet, preis: z.p, versand, bewertung: b, sprache: sprache(titelAusUrl(url)), link: url, warenkorb: null });
      if (a.prioritaet !== 1 || b.stufe === 'unplausibel') continue;
      lieferbar.push({ haendler: h.name, titel: titelAusUrl(url), art: a.art, prioritaet: 1, preis: z.p, versand, bewertung: b, link: url });
      lieferbarTop.push(`- ${b.stufe === 'uvp' ? '✅' : '⚠'} ${h.name}: ${titelAusUrl(url)} · ${z.p} €`);
    }
    bericht.push(`| ${h.name} | ✅ ${h.abfrage}${info.sitemapGelesen ? ' (Sitemap gelesen)' : ''} | ${info.kandidaten} URLs | ${info.seiten} Seiten geprüft | – | ${alt ? meldungen.length : 'erster Lauf (nur merken)'} |`);
  } catch (e) {
    zustand.haendler[h.id] = { ...(zustand.haendler[h.id] || {}), fehler: e.message, fehlerZeit: jetzt.toISOString() };
    bericht.push(`| ${h.name} | ❌ ${e.message} | – | – | – | – |`);
  }
}
// MediaMarkt/Saturn: nur Handy im WLAN (GitHub ist dort gesperrt), alle mmMinuten; nur eigene Angebote zum UVP zählen
for (const h of haendler.filter((x) => x.status === 'aktiv' && x.abfrage === 'mediamarkt' && handy && !spar)) {
  const vorher = zustand.haendler[h.id];
  if (vorher?.stand && jetzt - Date.parse(vorher.stand) < einst.mmMinuten * 60000 - 30000) continue;
  try {
    const bewerte = (p) => { const a = produktArt(p.titel); return a ? bewerteGesamt(p.titel, a.art, p.preis, h.id).bewertung : { stufe: 'unbekannt' }; };
    const roh = await mediamarktHolen(h, { suchen: einst.mmSuchen, pruefen: (p) => bewerte(p).stufe === 'uvp' });
    const sealed = roh.filter((p) => istPokemon(p)).map((p) => ({ ...p, ...produktArt(p.titel) })).filter((p) => p.art)
      .map((p) => ({ ...p, sprache: sprache(p.titel), haendler: h.name, haendlerId: h.id, quelle: 'shop' }));
    for (const p of sealed.filter((x) => x.verfuegbar)) {
      const b = bewerte(p);
      if (b.stufe === 'uvp') top.push({ haendler: h.name, titel: p.titel, art: p.art, prioritaet: p.prioritaet, preis: p.preis, versand: versandFuer(h, p.preis), bewertung: b, sprache: p.sprache, vorbestellung: p.vorbestellung, link: p.link, warenkorb: null });
    }
    const alt = vorher?.produkte || {};
    const { meldungen, merker } = aenderungen(alt, sealed, { ersterLauf: !vorher?.produkte, jetzt });
    zustand.haendler[h.id] = { produkte: { ...alt, ...merker }, stand: jetzt.toISOString(), fehler: null };
    await melden(meldungen.filter((m) => !m.marktplatz && m.verfuegbar));
    bericht.push(`| ${h.name} | ✅ Suche | ${roh.length} | ${sealed.length} | ${sealed.filter((p) => p.verfuegbar).length} eigene zum UVP | ${vorher?.produkte ? meldungen.length : 'erster Lauf (nur merken)'} |`);
  } catch (e) {
    zustand.haendler[h.id] = { ...(vorher || {}), stand: jetzt.toISOString(), fehler: e.message };
    bericht.push(`| ${h.name} | ❌ ${e.message} | – | – | – | – |`);
  }
}

// eBay (offizielle Browse API) – nur wenn Schlüssel vorhanden; unterwegs seltener
zustand.ebay ||= { gesehen: {} };
const eb = einst.ebay || {};
const ebayAktiv = !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) && eb.aktiv !== false;
const ebayTakt = (spar ? eb.minutenMobil : eb.minuten) || 5;
if (ebayAktiv && (!zustand.ebay.zeit || jetzt - Date.parse(zustand.ebay.zeit) >= ebayTakt * 60000 - 30000)) {
  const ersterEbay = !zustand.ebay.zeit;
  const sofort = [];
  const auktionen = [];
  const graded = [];
  const fehler = [];
  const bewerte = (a) => { const art = produktArt(a.titel); if (!art) return null; return { ...art, bewertung: preisBewertung(a.gesamt, uvpFinden(a.titel, art.art, uvpListe), uvpListe.spielraumEuro) }; };
  for (const s of eb.suchen || []) {
    try {
      const liste = await ebaySuche(s.q, { art: s.art, maxPreis: s.maxPreis });
      for (const a of liste || []) {
        const b = bewerte(a);
        if (!b || b.bewertung.stufe !== 'uvp' || a.versandUnbekannt || !serioes(a, eb)) continue;
        const eintrag = { ...a, art: b.art, prioritaet: b.prioritaet, bewertung: b.bewertung, sprache: sprache(a.titel), haendler: 'eBay' };
        if (a.auktion) {
          const rest = (Date.parse(a.endet) - jetzt) / 60000;
          if (rest > 0 && rest <= eb.auktionMinuten) auktionen.push({ ...eintrag, restMinuten: Math.round(rest) });
        } else sofort.push(eintrag);
      }
    } catch (e) { fehler.push(`${s.q}: ${e.message}`); }
  }
  for (const s of eb.graded?.suchen || []) {
    try {
      for (const a of (await ebayGraded(s, { maxPreis: eb.graded.maxPreis })) || []) {
        if (!/\b(psa|cgc|bgs|beckett|tag)\s?\d/i.test(a.titel) || !serioes({ ...a, titel: a.titel.replace(/graded/ig, '') }, eb)) continue;
        graded.push({ ...a, haendler: 'eBay', suche: s });
      }
    } catch (e) { fehler.push(`Graded ${s}: ${e.message}`); }
  }
  // Push: neue Sofortkauf-Treffer, Auktionen einmal beim Eintritt ins Zeitfenster, neue Graded-Treffer
  const neu = [...sofort.map((a) => ({ ...a, typ: 'ebay-sofort' })), ...auktionen.map((a) => ({ ...a, typ: 'ebay-auktion' })), ...graded.map((a) => ({ ...a, typ: 'graded', prioritaet: 2 }))]
    .filter((a) => !zustand.ebay.gesehen[a.typ + a.id]);
  for (const a of neu) zustand.ebay.gesehen[a.typ + a.id] = jetzt.toISOString();
  if (!ersterEbay) {
    await melden(neu.map((a) => ({ ...a, verfuegbar: true, preis: a.gesamt, quelle: 'ebay',
      titel: `${a.titel} · inkl. ${(a.versand ?? 0).toFixed(2).replace('.', ',')} € Versand${a.auktion ? ` · ${a.gebote ?? 0} Gebote · endet ${new Date(a.endet).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}` : ''}`,
      bewertung: a.bewertung || { stufe: 'unbekannt' } })));
  }
  const grenzeEbay = jetzt.getTime() - 3 * 86400000;
  zustand.ebay.gesehen = Object.fromEntries(Object.entries(zustand.ebay.gesehen).filter(([, z]) => Date.parse(z) >= grenzeEbay));
  Object.assign(zustand.ebay, { zeit: jetzt.toISOString(), sofort, auktionen, graded, fehler });
  bericht.push(`| eBay | ${fehler.length ? '⚠ ' + fehler.join('; ') : '✅'} | ${(eb.suchen || []).length} Suchen | ${sofort.length} Sofortkauf | ${auktionen.length} Auktionen | ${graded.length} Graded |`);
}

// Set-Code-Radar: neue Set-Codes in Händler-Produkten = Leak-Hinweis (News-Reiter + Push)
if (setQuellen.length && !handy) { // nur vollständige Durchläufe (GitHub), sonst Fehlalarme durch Teilansichten
  const { bekannt, neu } = neueSetCodes(zustand.setCodes, setQuellen, { jetzt });
  zustand.setCodes = { bekannt };
  zustand.news ||= [];
  if (neu.length && !gemeldet) gemeldet = await bereitsGemeldet(kanal);
  for (const s of neu.slice(0, 5)) {
    const n = { titel: `Neuer Set-Code entdeckt: ${s.code} – „${s.titel}“ bei ${s.haendler}`, link: s.link, zeit: jetzt.toISOString(), art: 'leak', quelle: 'Set-Code-Radar', quelleId: 'setcodes', stufe: 'B', bestaetigt: false, pokemonCenter: false, ttb: false, vorOrt: false };
    zustand.news.unshift(n);
    if (!gemeldet.has(s.link) && await pushSenden({ title: `🔮 Leak: neuer Set-Code ${s.code}`, message: `${s.titel}
entdeckt bei ${s.haendler} – womöglich ein kommendes Set`, priority: 4, tags: ['crystal_ball'], click: s.link }, { kanal })) { pushes++; gemeldet.add(s.link); }
  }
  bericht.push(`| Set-Code-Radar | ✅ | ${Object.keys(bekannt).length} bekannte Codes | ${neu.length} neu | – | – |`);
}

// News & Leaks (alle newsMinuten)
zustand.news ||= [];
const newsFaellig = !zustand.newsZeit || jetzt - Date.parse(zustand.newsZeit) >= einst.newsMinuten * 60000 - 30000;
if (newsFaellig && newsFeeds.length) {
  const { neu, stand, fehler, deals } = await newsAbruf(newsFeeds, zustand.newsStand, { jetzt });
  // Händler-Entdecker: Shops aus Deal-Meldungen sammeln, neue auf Shopify prüfen (nur GitHub – schont Handy-Daten)
  if (!handy && deals.length) {
    const bekannt = new Set(haendler.map((h) => domainAus(h.url)).filter(Boolean));
    zustand.entdeckt = await haendlerEntdecken(zustand.entdeckt, deals, bekannt, { jetzt });
  }
  zustand.newsStand = stand;
  zustand.newsFehler = fehler;
  zustand.newsZeit = jetzt.toISOString();
  let newsPushes = 0;
  if (neu.length && !gemeldet) gemeldet = await bereitsGemeldet(kanal);
  for (const n of neu) {
    const { still, push, ...eintrag } = n;
    zustand.news.unshift(eintrag);
    if (!n.still && n.push !== false && newsPushWert(n) && newsPushes < einst.maxNewsPushProLauf && !gemeldet.has(n.link)) {
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
// Push für JEDEN neuen Top-Eintrag – egal ob neu, wieder da, Preis auf UVP gefallen oder schon beim ersten Lauf da.
// „Neu“ = Link war in den letzten 6 Stunden nicht in der Top-Liste (das Handy sieht pro Minute nur Ausschnitte → kein Dauer-Push).
zustand.topBekannt ||= {};
{
  if (top.length && !gemeldet) gemeldet = await bereitsGemeldet(kanal);
  for (const t of top.sort((a, b) => a.prioritaet - b.prioritaet)) {
    const vorher = zustand.topBekannt[t.link];
    zustand.topBekannt[t.link] = jetzt.toISOString();
    if (vorher && jetzt - Date.parse(vorher) < 6 * 3600000) continue;
    if (gemeldet.has(t.link) || pushes >= einst.maxPushProLauf) continue;
    const gesamt = Number.isFinite(t.versand) ? t.preis + t.versand : t.preis;
    if (await pushSenden(pushNachricht({ ...t, typ: 'top', preis: gesamt, verfuegbar: true }), { kanal })) { pushes++; gemeldet.add(t.link); }
  }
  const alt = jetzt.getTime() - 3 * 86400000;
  zustand.topBekannt = Object.fromEntries(Object.entries(zustand.topBekannt).filter(([, z]) => Date.parse(z) >= alt));
}

// Öffentlicher Auszug für die App (nur Produktdaten, nichts Persönliches)
const oeffentlich = {
  letzterLauf: zustand.letzterLauf,
  // jetzt = laut letztem Stand noch kaufbar (Meldungen von vorhin können schon ausverkauft sein)
  feed: zustand.feed.slice(0, 300).map((f) => {
    const hz = zustand.haendler[f.haendlerId] || {};
    const z = hz.produkte?.[f.id] || hz.sitemap?.urls?.[f.id];
    return { ...f, jetzt: f.typ === 'angekuendigt' ? false : z ? z.v === true : null };
  }),
  top: top.sort((a, b) => a.prioritaet - b.prioritaet || a.bewertung.differenz - b.bewertung.differenz).slice(0, 100),
  lieferbar: lieferbar.sort((a, b) => (a.bewertung?.differenz ?? 999) - (b.bewertung?.differenz ?? 999)),
  haendler: haendler.map((h) => ({ id: h.id, name: h.name, url: h.url, art: h.art, status: h.status, grund: h.grund || null, versand: h.versand || null, abfrage: h.abfrage || null, stand: zustand.haendler[h.id]?.stand || null, fehler: zustand.haendler[h.id]?.fehler || null })),
  uvp: { ...uvpListe, kurseStand: zustand.kurse?.stand || null },
  news: zustand.news.slice(0, 200),
  ebay: { aktiv: ebayAktiv || !!zustand.ebay.zeit, zeit: zustand.ebay.zeit || null, sofort: zustand.ebay.sofort || [], auktionen: zustand.ebay.auktionen || [], graded: zustand.ebay.graded || [], fehler: zustand.ebay.fehler || [], gradedEingerichtet: !!(eb.graded?.suchen || []).length },
  newsFehler: zustand.newsFehler || {},
  entdeckt: Object.values(zustand.entdeckt || {}).sort((a, b) => b.anzahl - a.anzahl).slice(0, 40),
};
await writeFile('data/oeffentlich.json', JSON.stringify(oeffentlich));

const md = ['| Händler | Status | Produkte gesamt | Pokémon-Sealed | davon lieferbar | Meldungen |', '|---|---|---|---|---|---|', ...bericht,
  '', `Push: ${kanal ? `${pushes} gesendet` : 'Probelauf (kein Kanal eingerichtet)'}`, '',
  `**Jetzt lieferbare Top-Trainer-Boxen (${lieferbarTop.length}):**`, ...lieferbarTop.slice(0, 60), '',
  '**Letzte Meldungen:**', ...zustand.feed.slice(0, 15).map((f) => `- ${f.zeit.slice(0, 16)} · ${f.typ} · ${f.haendler} · ${f.titel} · ${Number.isFinite(f.preis) ? f.preis + ' €' : '?'} · ${f.bewertung?.stufe}`)].join('\n');
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Pokémon-Restock-Radar\n\n' + md + '\n');
