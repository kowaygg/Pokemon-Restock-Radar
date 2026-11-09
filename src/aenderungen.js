// Vergleicht den neuen Stand eines Händlers mit dem gemerkten und erzeugt Meldungen.
// Typen: neu (neues Produkt, lieferbar), vorbestellung (neu + Vorbestellung), wieder-da (vorher ausverkauft, jetzt lieferbar),
//        angekuendigt (neu, aber noch nicht lieferbar → Frühwarnung)
// Ein Produkt, das zum ersten Mal gesehen wird, aber schon länger als maxNeuStunden veröffentlicht ist, ist nicht „neu“
// (z. B. weil der Wächter mehr Seiten liest) – es wird nur gemerkt.
export function aenderungen(alt, neu, { ersterLauf, jetzt = new Date(), maxNeuStunden = 72 }) {
  const meldungen = [];
  const merker = {};
  for (const p of neu) {
    const vorher = alt[p.id];
    merker[p.id] = { v: p.verfuegbar, p: p.preis };
    if (ersterLauf) continue;
    let typ = null;
    const frisch = !p.veroeffentlicht || jetzt - Date.parse(p.veroeffentlicht) <= maxNeuStunden * 3600000;
    if (!vorher && !frisch) continue;
    if (!vorher) typ = p.verfuegbar ? (p.vorbestellung ? 'vorbestellung' : 'neu') : 'angekuendigt';
    else if (!vorher.v && p.verfuegbar) typ = p.vorbestellung ? 'vorbestellung' : 'wieder-da';
    if (typ) meldungen.push({ typ, ...p });
  }
  return { meldungen, merker };
}
