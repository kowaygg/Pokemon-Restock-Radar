// Kleiner Test-Server nur für diesen PC (http://localhost:8090): zeigt web/ und die Daten aus data/. Aufruf: npm run vorschau
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASIS = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8090;
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

createServer(async (anfrage, antwort) => {
  const pfad = decodeURIComponent(new URL(anfrage.url, 'http://localhost').pathname);
  const ordner = pfad.startsWith('/data/') ? BASIS : join(BASIS, 'web');
  const datei = normalize(join(ordner, pfad.endsWith('/') ? `${pfad}index.html` : pfad));
  if (!datei.startsWith(ordner + sep)) return antwort.writeHead(403).end();
  try {
    const inhalt = await readFile(datei);
    antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(inhalt);
  } catch { antwort.writeHead(404).end('Nicht gefunden'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Vorschau: http://localhost:${PORT}`));
