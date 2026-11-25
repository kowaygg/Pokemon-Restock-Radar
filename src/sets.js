// Sprache aus dem Set-Namen, wenn der Titel keine Sprache nennt.
// Japanische Sets tragen eigene Namen (z. B. „Glory of Team Rocket“ = JP-Gegenstück zu „Ewige Rivalen“/„Destined Rivals“)
// und Codes wie „sv10“ ohne Zusatz – ohne diese Liste würde so ein JP-Display mit der deutschen UVP verglichen (Fehltreffer).
// Neue Sets hier nachtragen (kleingeschrieben, ohne Umlaute/Satzzeichen).

export const SET_NAMEN = {
  // Japan (nur Namen, die es so NICHT auf Deutsch/Englisch gibt)
  JP: [
    'glory of team rocket', 'mega brave', 'mega symphonia', 'inferno x', 'mega dream ex', 'munikis zero', 'nihil zero', 'ninja spinner',
    'terastal festival', 'battle partners', 'heat wave arena', 'hot air arena', 'paradise dragona', 'super electric breaker',
    'stellar miracle', 'night wanderer', 'crimson haze', 'mask of change', 'cyber judge', 'wild force', 'ancient roar',
    'future flash', 'raging surf', 'ruler of the black flame', 'triplet beat', 'snow hazard', 'clay burst', 'shiny treasure',
    'scarlet ex', 'violet ex', 'vstar universe', 'vmax climax', 'eevee heroes', 'blue sky stream', 'fusion arts', 'start deck 100',
  ],
  DE: [
    'mega entwicklung', 'fatale flammen', 'optimale ordnung', 'wachsendes chaos', 'dunkelnacht', 'delta herrschaft', 'illumina city',
    'karmesin', 'entwicklungen in paldea', 'obsidianflammen', 'paradoxrift', 'paldeas schicksale', 'gewalten der zeit',
    'maskerade im zwielicht', 'nebel der sagen', 'stellarkrone', 'sturmische funken', 'prismatische entwicklungen',
    'reisegefahrten', 'ewige rivalen', 'schwarze blitze', 'weisse flamme', 'zenit der konige',
  ],
  EN: [
    'mega evolution', 'phantasmal flames', 'ascended heroes', 'perfect order', 'lumiose city', 'destined rivals', 'journey together',
    'prismatic evolutions', 'surging sparks', 'stellar crown', 'shrouded fable', 'twilight masquerade', 'temporal forces',
    'paldean fates', 'paradox rift', 'obsidian flames', 'paldea evolved', 'scarlet violet', 'black bolt', 'white flare', 'crown zenith',
  ],
};

const norm = (s) => String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const MUSTER = Object.entries(SET_NAMEN).map(([sprache, namen]) => [sprache, new RegExp(`\\b(${namen.map((n) => n.replace(/ /g, ' ')).join('|')})\\b`)]);

// 'JP' | 'DE' | 'EN' | null – Japan zuerst (eindeutigste Namen)
export function setSprache(titel) {
  const t = ` ${norm(titel)} `;
  for (const [sprache, m] of MUSTER) if (m.test(t)) return sprache;
  return null;
}
