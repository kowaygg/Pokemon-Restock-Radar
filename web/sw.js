// Offline-Modus: zuerst aus dem Netz, ohne Verbindung die zuletzt geladene Fassung.
const SPEICHER = 'pkmn-radar-0.8.0';
const GRUNDGERUEST = ['./', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SPEICHER).then((c) => c.addAll(GRUNDGERUEST)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((namen) => Promise.all(namen.filter((n) => n.startsWith('pkmn-radar-') && n !== SPEICHER).map((n) => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        if (antwort.ok) caches.open(SPEICHER).then((c) => c.put(e.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
