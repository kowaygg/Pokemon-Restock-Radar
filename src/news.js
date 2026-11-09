// News & Leaks: liest offizielle Feeds (RSS/Atom) und die öffentliche News-Liste von pokemon.com/de,
// filtert auf Sammelkarten-Themen und ordnet jede Meldung ein (Leak/Ankündigung, Release/Vorbestellung, Deal, Pokémon Center).
// Community-Quellen (Stufe C) gelten als „unbestätigt“, bis der Shop-Wächter Preis/Verfügbarkeit selbst sieht.
import { USER_AGENT } from './haendler-pruefen.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const entities = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const feld = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? entities(m[1]) : ''; };

// RSS <item> und Atom <entry> → { titel, link, zeit, text }
export function feedEintraege(xml) {
  const bloecke = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return bloecke.map((b) => {
    const atomLink = b.match(/<link[^>]*href="([^"]+)"/i);
    const link = feld(b, 'link') || (atomLink ? atomLink[1] : '');
    const zeit = feld(b, 'pubDate') || feld(b, 'published') || feld(b, 'updated') || feld(b, 'dc:date');
    return { titel: feld(b, 'title'), link: link.replace(/&amp;/g, '&'), zeit: zeit && !Number.isNaN(Date.parse(zeit)) ? new Date(zeit).toISOString() : null, text: feld(b, 'description').slice(0, 300) };
  }).filter((e) => e.titel && /^https?:\/\//.test(e.link));
}

// Öffentliche News-Liste von pokemon.com: Artikel-Links /de/news/<slug> → Titel aus dem Slug
export function pokemonNewsEintraege(html, basis = 'https://www.pokemon.com') {
  const slugs = [...new Set([...html.matchAll(/href="(\/de\/news\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  return slugs.map((p) => {
    const t = p.split('/').pop().replace(/-/g, ' ');
    return { titel: t.charAt(0).toUpperCase() + t.slice(1), link: basis + p, zeit: null, text: '' };
  });
}

const TCG = /sammelkart|kartenspiel|\btcg\b|booster|display|top.?trainer|elite.?trainer|\betb\b|\btins?\b|kollektion|collection|bundle|erweiterung|karten|card|pokemon.?center/;
const POKEMON = /pokemon|pokémon/;

// Einordnung einer Meldung; null = nicht relevant
export function einordnen(e, quelle) {
  const t = norm(`${e.titel} ${e.text}`);
  const titel = norm(e.titel);
  if (quelle.nurPokemon && !POKEMON.test(titel)) return null;
  if (!TCG.test(t)) return null;
  if (/pokemon go\b|legenden z.?a|pokopia|champions|unite|karmesin|purpur.*spiel|nintendo switch/.test(titel) && !/sammelkart|tcg|karten/.test(titel)) return null;
  const pc = /pokemon.?center/.test(t);
  let art = 'news';
  if (/vorbestell|pre.?order|vorverkauf|preorder/.test(t)) art = 'vorbestellung';
  else if (/jetzt erhaltlich|ist jetzt|ab heute|erscheint|veroffentlicht|release|verfugbar|wieder da|restock|lieferbar/.test(t)) art = 'release';
  else if (/enthullt|angekundigt|vorschau|leak|geleakt|revealed|announced|japan|kartenliste|neue .*karten/.test(t)) art = 'leak';
  if (quelle.deal) art = 'deal';
  const ttb = /top.?trainer|elite.?trainer|\betb\b|\bttb\b/.test(t);
  return { art, pokemonCenter: pc, ttb };
}

async function textHolen(url, holen) {
  const r = await holen(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/atom+xml, text/xml, text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// alt: { gesehen: {link: zeit}, zeit } je Quelle. Ergebnis: { neu: [...], stand, fehler }
export async function newsAbruf(quellen, alt = {}, { jetzt = new Date(), holen = fetch } = {}) {
  const stand = {};
  const neu = [];
  const fehler = {};
  for (const q of quellen) {
    const vorher = alt[q.id];
    try {
      const roh = await textHolen(q.url, holen);
      const eintraege = q.typ === 'pokemon-news' ? pokemonNewsEintraege(roh) : feedEintraege(roh);
      const gesehen = { ...(vorher?.gesehen || {}) };
      for (const [i, e] of eintraege.entries()) {
        if (gesehen[e.link]) continue;
        gesehen[e.link] = jetzt.toISOString();
        // Erster Lauf: nichts pushen, aber Meldungen der letzten 7 Tage (ohne Datum: die ersten 10) schon anzeigen
        const still = !vorher;
        if (still && (e.zeit ? jetzt - Date.parse(e.zeit) > 7 * 86400000 : i >= 10)) continue;
        const einordnung = einordnen(e, q);
        if (einordnung) neu.push({ ...e, ...einordnung, zeit: e.zeit || jetzt.toISOString(), quelle: q.name, quelleId: q.id, stufe: q.stufe, bestaetigt: q.stufe !== 'C', still });
      }
      // Gedächtnis begrenzen (älteste zuerst raus)
      const liste = Object.entries(gesehen).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 400);
      stand[q.id] = { gesehen: Object.fromEntries(liste), zeit: jetzt.toISOString() };
    } catch (err) {
      fehler[q.id] = err.message;
      if (vorher) stand[q.id] = vorher;
    }
  }
  return { neu, stand, fehler };
}

// Push nur für das Wichtige: Vorbestellung/Release, Pokémon Center, Top-Trainer-Box-Deals
export function newsPushWert(n) {
  return n.pokemonCenter || n.art === 'vorbestellung' || n.art === 'release' || (n.art === 'deal' && n.ttb);
}

export function newsPushNachricht(n) {
  const art = { vorbestellung: 'VORBESTELLUNG', release: 'RELEASE', leak: 'Leak/Ankündigung', deal: 'Deal-Hinweis', news: 'News' }[n.art];
  const dringend = n.pokemonCenter || (n.ttb && n.art !== 'leak');
  return {
    title: `${dringend ? '🚨 ' : '📰 '}${n.pokemonCenter ? 'Pokémon Center · ' : ''}${art} · ${n.quelle}`.slice(0, 250),
    message: [n.titel, n.bestaetigt ? null : '(Community-Hinweis – Preis beim Händler prüfen)'].filter(Boolean).join('\n').slice(0, 2000),
    priority: dringend ? 5 : 4,
    tags: [dringend ? 'rotating_light' : 'newspaper'],
    click: n.link,
  };
}
