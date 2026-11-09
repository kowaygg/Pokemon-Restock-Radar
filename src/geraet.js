// Erkennt am Handy (Termux): WLAN oder mobile Daten, Akkustand, lädt gerade? – und wählt daraus den Spar-Takt.
// Genau mit der App „Termux:API“ (termux-battery-status / termux-wifi-connectioninfo), sonst Ersatzwege.
// Unbekannt gilt als „mobil, ohne Strom“ – also lieber sparsam.
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ausfuehren = promisify(execFile);
const json = async (befehl) => { try { return JSON.parse((await ausfuehren(befehl, [], { timeout: 8000 })).stdout); } catch { return null; } };
const datei = async (pfad) => { try { return (await readFile(pfad, 'utf8')).trim(); } catch { return null; } };

export async function geraetErkennen() {
  const akkuApi = await json('termux-battery-status');
  const wlanApi = akkuApi ? await json('termux-wifi-connectioninfo') : null;
  let akku = akkuApi?.percentage ?? null;
  let laden = akkuApi ? /CHARGING|FULL/.test(akkuApi.status || '') || (akkuApi.plugged && akkuApi.plugged !== 'UNPLUGGED') : null;
  if (akku == null) {
    const kap = await datei('/sys/class/power_supply/battery/capacity');
    if (kap && /^\d+$/.test(kap)) akku = Number(kap);
    const status = await datei('/sys/class/power_supply/battery/status');
    if (status) laden = /Charging|Full/i.test(status);
  }
  let wlan = wlanApi ? wlanApi.supplicant_state === 'COMPLETED' && !!wlanApi.ip && wlanApi.ip !== '0.0.0.0' : null;
  if (wlan == null) {
    try { wlan = Object.entries(networkInterfaces()).some(([name, a]) => /^wlan/.test(name) && a.some((x) => x.family === 'IPv4' && !x.internal)); } catch { wlan = null; }
  }
  return { wlan: wlan === true, akku, laden: laden === true, genau: !!akkuApi, unbekannt: wlan == null || akku == null };
}

// Spar-Stufe aus Gerätezustand + Einstellungen (config/einstellungen.json → handySpar)
export function sparStufe(g, s) {
  if (g.akku != null && !g.laden && g.akku < s.akkuPause) return { name: `Akku ${g.akku} % – Pause`, minuten: s.pauseMinuten, pause: true, wachHalten: false };
  if (g.akku != null && !g.laden && g.akku < s.akkuNiedrig) return { name: `Akku niedrig (${g.akku} %)`, minuten: s.taktAkkuNiedrig, spar: true, newsMinuten: s.newsMobil, wachHalten: false };
  if (!g.wlan) return { name: 'mobile Daten', minuten: s.taktMobil, spar: true, newsMinuten: s.newsMobil, wachHalten: false };
  if (g.laden) return { name: 'WLAN + lädt', minuten: s.taktWlanLaden, spar: false, wachHalten: true };
  return { name: 'WLAN', minuten: s.taktWlan, spar: false, wachHalten: false };
}
