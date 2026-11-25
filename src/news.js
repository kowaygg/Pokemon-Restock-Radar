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
    // Händlerangabe (mydealz: <pepper:merchant name="…">) und Shop-Links aus der Beschreibung → Händler-Entdecker
    const haendler = (b.match(/<pepper:merchant[^>]*name="([^"]+)"/) || [])[1] || null;
    const rohText = (b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || '';
    const links = [...rohText.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    return { titel: feld(b, 'title'), link: link.replace(/&amp;/g, '&'), zeit: zeit && !Number.isNaN(Date.parse(zeit)) ? new Date(zeit).toISOString() : null, text: feld(b, 'description').slice(0, 300), haendler, links };
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
  // Amazon „auf Einladung“: so früh wie möglich selbst anfragen – Zuteilung entscheidet Amazon
  const amazonEinladung = /amazon/.test(t) && /einladung|invite|invitation|request invite/.test(t);
  // Pokémon-Center-Drop (nicht nur Erwähnung): für Community-Quellen ohne eigene Push-Freigabe
  const pcDrop = pc && /restock|drop|\blive\b|in stock|available|queue|warteschlange|verfugbar|wieder da|jetzt/.test(t);
  let art = 'news';
  if (/vorbestell|pre.?order|vorverkauf|preorder/.test(t)) art = 'vorbestellung';
  else if (/jetzt erhaltlich|ist jetzt|ab heute|erscheint|veroffentlicht|release|verfugbar|wieder da|restock|lieferbar/.test(t)) art = 'release';
  else if (/enthullt|angekundigt|vorschau|leak|geleakt|revealed|announced|japan|kartenliste|neue .*karten/.test(t)) art = 'leak';
  if (quelle.deal) art = 'deal';
  const ttb = /top.?trainer|elite.?trainer|\betb\b|\bttb\b/.test(t);
  // „bei netto Online“ ist ein Online-Angebot – Ladenbezug nur ohne „online“ oder mit Filial-/Prospekt-Hinweis
  const vorOrt = VOR_ORT.test(t) && (!/\bonline\b/.test(t) || /filiale|prospekt|vor ort|im laden|in store|offline/.test(t));
  const abDatum = datumAus(e.titel);
  const fremd = fremdeRegion(`${e.titel} ${e.text}`);
  // Nutzer-Regel: nur was JETZT kaufbar ist – Vorbestellungen, „ab Montag“, „erscheint am …“ sind Zukunft
  const zukunft = !!abDatum || ZUKUNFT.test(titel);
  return { art, pokemonCenter: pc, pcDrop, amazonEinladung, ttb, vorOrt: vorOrt && regionPasst(`${e.titel} ${e.text}`), fremdeRegion: fremd, zukunft, ...(abDatum ? { abDatum } : {}) };
}

const ZUKUNFT = /vorbestell|pre.?order|vorverkauf|preorder|erscheint|ab (dem )?\d|ab (montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|nachster woche)|demnachst|coming soon|bald (erhaltlich|verfugbar)|angekundigt/;
// Stationäre Ketten / Filial-Hinweise (Prospekt-Aktionen)
const VOR_ORT = /\b(aldi|lidl|netto|penny|kaufland|rossmann|muller|thalia|rombach|edeka|rewe|globus|smyths|toys ?r ?us|mediamarkt|saturn|woolworth|tedi)\b|filiale|in store|offline|prospekt|vor ort|im laden/;

// Regionale Aktionen: Nutzer wohnt in Freiburg (79117) → nur Freiburg/Südbaden/Baden-Württemberg oder bundesweit interessant.
// Nennt eine Meldung eine andere Region/Stadt (z. B. „Region Berlin-Brandenburg“) und nicht unsere, wird sie ausgeblendet.
const EIGENE_REGION = /freiburg|breisgau|sudbaden|schwarzwald|baden.?wurttemberg|\bbw\b|bundesweit|deutschlandweit|ganz deutschland|alle (filialen|markte)/;
const FREMDE_REGION = /berlin|brandenburg|hamburg|bremen|niedersachsen|nordrhein|\bnrw\b|westfalen|hessen|thuringen|sachsen|mecklenburg|vorpommern|schleswig|holstein|bayern|munchen|nurnberg|saarland|rheinland|pfalz|koln|dusseldorf|dortmund|essen|frankfurt|leipzig|dresden|hannover|stuttgart|karlsruhe|mannheim|potsdam|paderborn|bielefeld|munster|osnabruck|kassel|erfurt|magdeburg|rostock|kiel|lubeck|bochum|duisburg|wuppertal|bonn|aachen|augsburg|regensburg|wurzburg|heilbronn|ulm|\bregion (nord|ost|west|mitte)\b|osterreich|schweiz/;
// Bundesweite Ketten mit Filialen im Raum Freiburg – deren Aktionen gelten meist überall
const KETTE_BUNDESWEIT = /\b(aldi|lidl|netto|penny|kaufland|rossmann|muller|thalia|rewe|globus|smyths|mediamarkt|saturn|woolworth|tedi|galeria|dm|action|expert)\b/;
// Einzelne Märkte/Lokal-Deals („[LOKAL Paderborn]“, „Edeka Gebauer“, „sb Lüning“) → nur, wenn unsere Region genannt ist
const LOKAL = /\blokal\b|\bregional\b|\beinzelnen? (filiale|filialen|markt|markten)\b/;
// Vor-Ort-Aktion anzeigen? Freiburg/Südbaden/BW genannt – oder bundesweite Kette ohne Lokal-/Fremd-Hinweis
export function regionPasst(text) {
  const t = norm(text);
  if (/freiburg|breisgau|sudbaden|schwarzwald|baden.?wurttemberg|\bbw\b/.test(t)) return true;
  if (FREMDE_REGION.test(t) || LOKAL.test(t)) return false;
  return KETTE_BUNDESWEIT.test(t);
}
export function fremdeRegion(text) {
  const t = norm(text);
  return FREMDE_REGION.test(t) && !EIGENE_REGION.test(t);
}

// „ab 16.11.“, „ab Montag“, „ab dem 3.12.2026“ → lesbarer Starttermin (oder null)
export function datumAus(text) {
  const t = String(text || '');
  const m = t.match(/\bab\s+(?:dem\s+|den\s+)?(\d{1,2}\.\s?\d{1,2}\.(?:\s?\d{2,4})?)/i) || t.match(/\b(\d{1,2}\.\s?\d{1,2}\.(?:\d{2,4})?)/);
  if (m) return m[1].replace(/\s/g, '');
  const w = t.match(/\bab\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|heute)\b/i);
  return w ? 'ab ' + w[1].charAt(0).toUpperCase() + w[1].slice(1).toLowerCase() : null;
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
  const gruppeDran = new Set();
  const deals = []; // alle Deal-Einträge (auch alte) für den Händler-Entdecker
  for (const q of quellen) {
    const vorher = alt[q.id];
    // Quellen mit eigenem Takt (z. B. Reddit, das schnell „429“ meldet) nur alle q.minuten abfragen
    if (q.minuten && vorher?.zeit && jetzt - Date.parse(vorher.zeit) < q.minuten * 60000 - 30000) { stand[q.id] = vorher; continue; }
    // Höchstens eine Quelle je Gruppe pro Durchlauf (Reddit: sonst 429)
    if (q.gruppe && gruppeDran.has(q.gruppe)) { if (vorher) stand[q.id] = vorher; continue; }
    if (q.gruppe) gruppeDran.add(q.gruppe);
    try {
      const roh = await textHolen(q.url, holen);
      const eintraege = q.typ === 'pokemon-news' ? pokemonNewsEintraege(roh) : feedEintraege(roh);
      if (q.deal) deals.push(...eintraege.filter((e) => /pok[eé]mon/i.test(e.titel)));
      const gesehen = { ...(vorher?.gesehen || {}) };
      for (const [i, e] of eintraege.entries()) {
        if (gesehen[e.link]) continue;
        gesehen[e.link] = jetzt.toISOString();
        // Erster Lauf: nichts pushen, aber Meldungen der letzten 7 Tage (ohne Datum: die ersten 10) schon anzeigen
        const still = !vorher;
        if (still && (e.zeit ? jetzt - Date.parse(e.zeit) > 7 * 86400000 : i >= 10)) continue;
        const einordnung = einordnen(e, q);
        if (einordnung) neu.push({ ...e, ...einordnung, zeit: e.zeit || jetzt.toISOString(), quelle: q.name, quelleId: q.id, stufe: q.stufe, bestaetigt: q.stufe !== 'C', still, push: q.push !== false });
      }
      // Gedächtnis begrenzen (älteste zuerst raus)
      const liste = Object.entries(gesehen).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 400);
      stand[q.id] = { gesehen: Object.fromEntries(liste), zeit: jetzt.toISOString() };
    } catch (err) {
      fehler[q.id] = err.message;
      if (vorher) stand[q.id] = vorher;
    }
  }
  return { neu, stand, fehler, deals };
}

// Push nur für das Wichtige: Vorbestellung/Release, Pokémon Center, Top-Trainer-Box-Deals
// Nutzer-Regel 25.11.2026: nur pushen, was JETZT kaufbar ist – Pokémon-Center-Drop live, Top-Trainer-Box-Deal,
// Laden-Deal in unserer Region. Keine Vorbestellungen, Ankündigungen, Release-News oder Newsletter-Infos.
export function newsPushWert(n) {
  if (n.fremdeRegion || n.zukunft) return false;
  return !!(n.pcDrop || (n.art === 'deal' && (n.ttb || n.vorOrt)));
}
// Für die App: beschreibt die Meldung etwas, das man jetzt kaufen kann?
// Ältere gespeicherte Meldungen mit den aktuellen Regeln neu einordnen (Zukunft, Region)
export const nachbewerten = (n) => ({ ...n, zukunft: !!n.zukunft || !!n.abDatum || ZUKUNFT.test(norm(n.titel)), vorOrt: !!n.vorOrt && regionPasst(`${n.titel} ${n.text || ''}`) });
export const jetztKaufbarNews = (n) => !n.fremdeRegion && !n.zukunft && !!(n.pcDrop || n.art === 'deal');

export function newsPushNachricht(n) {
  const art = { vorbestellung: 'VORBESTELLUNG', release: 'RELEASE', leak: 'Leak/Ankündigung', deal: 'Deal-Hinweis', news: 'News' }[n.art];
  const dringend = n.pokemonCenter || n.amazonEinladung || (n.ttb && n.art !== 'leak');
  return {
    title: `${dringend ? '🚨 ' : n.vorOrt ? '📍 ' : '📰 '}${n.amazonEinladung ? 'Amazon-Einladung anfragen · ' : n.pokemonCenter ? 'Pokémon Center · ' : n.vorOrt ? 'Vor Ort · ' : ''}${art} · ${n.quelle}`.slice(0, 250),
    message: [n.titel, n.amazonEinladung ? '👉 Jetzt auf Amazon „Einladung anfordern“ klicken – je früher, desto besser' : null, n.abDatum ? `Start: ${n.abDatum}` : null, n.bestaetigt ? null : '(Community-Hinweis – Preis beim Händler prüfen)'].filter(Boolean).join('\n').slice(0, 2000),
    priority: dringend ? 5 : 4,
    tags: [dringend ? 'rotating_light' : 'newspaper'],
    click: n.link,
  };
}
