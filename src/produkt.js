// Erkennt Pokémon-Sealed-Produkte im Titel und ordnet sie einer Produktart + Priorität zu.

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_]/g, ' ');

// Reihenfolge wichtig: spezifisch vor allgemein
export const ARTEN = [
  { art: 'top-trainer-box', prioritaet: 1, muster: [/top ?trainer ?box/, /elite ?trainer ?box/, /\bttb\b/, /\betb\b/] },
  { art: 'display-36', prioritaet: 2, muster: [/\bdisplay\b/, /booster ?box/, /36 ?(booster|packs)/] },
  { art: 'booster-bundle', prioritaet: 2, muster: [/booster ?bundle/] },
  { art: 'mini-tin', prioritaet: 3, muster: [/mini ?tin/] },
  { art: 'tin', prioritaet: 3, muster: [/\btins?\b/, /\btin ?box/] },
  { art: 'poster-kollektion', prioritaet: 3, muster: [/poster/] },
  { art: 'pin-kollektion', prioritaet: 3, muster: [/\bpin\b.*(kollektion|collection|box)/, /pin ?(kollektion|collection)/] },
  { art: 'kollektion', prioritaet: 2, muster: [/kollektion/, /collection/, /premium/, /\bbox\b/, /blister/] },
];

// Ausschluss: keine Sealed-Ware oder unerwünscht
const AUSSCHLUSS = [/einzelkarte/, /\bsingle\b/, /\bpsa\b/, /\bcgc\b/, /\bbgs\b/, /graded/, /sleeves?\b/, /hullen/, /toploader/, /binder/, /sammelalbum/, /playmat/, /spielmatte/, /deckbox/, /plusch|plush/, /figur(?!en ?kollektion)/, /\bleer\b/, /\bempty\b/, /ohne booster/, /repack/, /proxy/, /\bcode ?karte|code card/, /einzelner? booster/, /\b1x booster\b/];

export function istPokemon(p) {
  const t = norm([p.titel, p.marke, ...(p.tags || [])].join(' '));
  return /pokemon/.test(t) && !/pokemon go(?! )|tcg pocket/.test(t);
}

export function produktArt(titel) {
  const t = norm(titel);
  if (AUSSCHLUSS.some((m) => m.test(t))) return null;
  for (const a of ARTEN) if (a.muster.some((m) => m.test(t))) return { art: a.art, prioritaet: a.prioritaet };
  return null;
}

export function sprache(titel) {
  const t = norm(titel);
  if (/\b(deutsch|\bde\b|german)/.test(t)) return 'DE';
  if (/\b(englisch|english|\ben\b)/.test(t)) return 'EN';
  if (/\b(japanisch|japanese|\bjp\b|\bjap\b)/.test(t)) return 'JP';
  return null;
}

export function istVorbestellung(p) {
  return /vorbestell|pre ?order|vorverkauf|preorder/.test(norm([p.titel, ...(p.tags || [])].join(' ')));
}
