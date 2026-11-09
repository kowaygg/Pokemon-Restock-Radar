# CLAUDE.md – Pokémon-Restock-Radar

Gedächtnis des Projekts. Jede neue Claude-Code-Sitzung liest diese Datei zuerst.
Teil A = Auftrag des Nutzers (aus dem Gespräch vom 09.11.2026 zusammengefasst). Teil B = Projektstand.

> **Datenschutz-Regel:** Repo ist öffentlich. Niemals Schlüssel, ntfy-Kanalnamen, E-Mail-Adressen,
> Zugangsdaten, Kaufhistorie oder Budget ins Repo. Nur in GitHub Secrets bzw. lokal (`.env`, `*.local.*`).

---

## Teil A – Auftrag

**Ziel:** Pokémon-TCG-Produkte **original und sealed zum UVP** online ergattern (vorbestellen oder direkt kaufen).
Die App überwacht seriöse Händler, eBay und Release-Infos und meldet Chancen **so schnell wie möglich** per Push.
Eigenes, neues Projekt – hat NICHTS mit dem KI-Finanz-Radar zu tun.

**Nutzer:** privater Sammler, kein Programmierer, Windows 10 Home (schwache Hardware), Android-Handy (läuft immer).
Alles auf Deutsch erklären, kurz und in Stichpunkten. Alles **komplett kostenlos**, keine Kreditkarte bei Diensten.

**Zielprodukte (Priorität):**
1. Elite-Trainer-Boxen / Top-Trainer-Boxen (ETB) – Hauptziel
2. Displays, Booster-Bundles, Boxen/Kollektionen
3. Tins, Mini-Tins, Poster-Kollektionen, Pin-Kollektionen
- Sprache egal (Deutsch/Englisch, Pokémon Center auch USA/UK – Versand + Zoll werden in Kauf genommen)

**Quellen:**
- Seriöse Online-Händler (Handelsregister/Impressum, gute Bewertungen): z. B. Alternate, TCGViert, MediaMarkt, Saturn,
  Müller, Rossmann, Thalia, Rombach, Pokémon Center (DE/UK/US) – vollständige Liste wird recherchiert
- NICHT: Amazon (nur auf Einladung/Marktplatzpreise), Wiederverkäufer-Marktplätze als „Händler“
- eBay: Sofortkauf UND Auktionen, die in den nächsten Minuten enden – nur wenn Preis zum UVP
- Whatnot: nur wenn offizielle Schnittstelle existiert (prüfen), sonst weglassen
- Newsletter ALLER Händler auswerten, damit nichts verpasst wird
- Release-Infos: Set-Termine, Vorbestell-Starts

**Treffer-Regel:** Artikelpreis + Versand ≤ UVP + 5 € (Spielraum an EINER Stelle einstellbar).
UVP-Liste pflegbar (Produkt, Set, EAN, UVP, Quelle, Stand) – UVPs recherchieren, nie raten.

**Reiter der App (klar strukturiert):**
- Händler-Releases (neu bestellbar / Vorbestellung offen)
- Sofortkauf (eBay ≤ UVP + 5 €)
- Auktionen (eBay, enden bald, aktuell ≤ UVP + 5 €, Countdown)
- Releases & Kalender (Sets, Vorbestell-Starts, Newsletter-Ankündigungen)
- Newsfeed (geprüfte News aus offiziellen, Fach- und Community-Quellen)
- UVP-Liste (mit Wunsch-Häkchen)
- Händler (Seriosität, Status läuft/blockiert, Bereit-für-Drop-Checkliste)

**Community-Quellen + Newsfeed (Wunsch 09.11.2026):**
- Discord, Reddit, WhatsApp-Gruppen/-Kanäle, Telegram usw. mit auswerten – aber NUR über erlaubte Wege:
  - Reddit: offizielle API bzw. RSS der Subreddits
  - Discord: eigener Server des Nutzers + eigener Bot; Ankündigungskanäle fremder Server per „Kanal folgen“ hineinholen
    (kein Selfbot, kein Mitlesen mit Nutzerkonto)
  - Telegram: öffentliche Kanäle (offizielle Bot-/Client-API)
  - WhatsApp: keine erlaubte Lese-Schnittstelle → nicht automatisch (inoffizielle Werkzeuge = Sperrrisiko)
- Alles wird gefiltert und GEPRÜFT: Community-Hinweise gelten als „unbestätigt“, bis der Wächter Verfügbarkeit + Preis
  direkt auf der Händlerseite bzw. offiziellen Quelle bestätigt hat. Zahlen (Preis, UVP, Datum) nur aus geprüfter Quelle.
- Vertrauensstufen: A = offiziell (Pokémon, Händlerseite), B = Fachseite, C = Community (nur mit Bestätigung)
- Eigener Reiter „Newsfeed“: geprüfte News (Set-Ankündigungen, Release-Termine, Vorbestellungen, Restock-Hinweise)
  mit Quelle, Vertrauensstufe und Status bestätigt/unbestätigt

**Frühwarnung / „Leaks“ (Wunsch 09.11.2026) – nur aus öffentlich ausgelieferten Daten:**
- Erlaubt: öffentlichen Seitenquelltext, `sitemap.xml`, öffentliche Produkt-Feeds, „Demnächst“-/Vorbestellseiten auswerten
  → neue Pokémon-Produkt-URLs erscheinen dort oft Tage vor dem Verkaufsstart
- Japanische Releases laufen dem DE/EN-Markt Monate voraus → Inhalt künftiger Sets früh bekannt (offizielle JP-Seite)
- Offizielle Produktvorschauen (pokemon.com/de/news), Händler-Ankündigungen, EAN tauchen bei Händlern auf
- NICHT erlaubt: Bot-Schutz/IP-Sperren umgehen (wechselnde Proxys, Captcha-Löser), nicht-öffentliche Schnittstellen,
  massenhaftes Raten versteckter URLs, Zugriff auf geschützte Bereiche (§ 202a StGB, AGB, Hausrecht)

**Push:** ntfy, sofort, mit Direktlink; ETB als „dringend“ (eigener Ton, auch bei Nicht-stören).

**Ergänzungen (vom Nutzer am 09.11.2026 freigegeben):**
Release-Kalender + Vorbestell-Alarm (Priorität 1), Kauf-Vorbereitung (Konten, PayPal, Checkliste),
Newsletter-Auswertung, Restock-Muster/Statistik, Gesamtkosten Ausland (Versand + Zoll + 19 % EUSt),
Fakeshop-Finder-Prüfung, Wächter-Selbstüberwachung, optional Budget-/Gekauft-Liste (nur lokal).

**Wünsche vom 09.11.2026 (abends):**
- App-Symbol auf Handy-Startseite + Desktop (PWA) – Symbol soll an einen orangen Feuerdrachen erinnern (eigene Figur, KEIN Glurak-Nachbau)
- Reiter „Top“: bester aktuell bestellbarer Deal nach unseren Kriterien (sealed, ≤ UVP + 5 €), TTB zuerst, dann Displays/Bundles/Rest;
  Link möglichst direkt in den Warenkorb. Keine Einzelkarten, kein Reseal/geöffnet/beschädigt, keine Scalper-Preise.
- Sprachen DE, EN, JP, KR, CN alle erlaubt – in der App klar nach Sprache gegliedert. Asiatische Ware braucht EIGENE UVPs (Feld `sprache` in uvp.json).
- Große chinesische Plattformen (Alibaba, AliExpress …) sind erlaubt, wenn wirklich UVP-Preis – Achtung Fälschungen, nur offizielle Shops.
- Updates so schnell wie möglich – am besten im Minutentakt → Handy-Wächter (M3) hat hohe Priorität.
- Reiter „News & Leaks“: was in Quelltexten/Sitemaps, Newslettern und offiziellen Ankündigungen gefunden wurde und in den
  nächsten Stunden/Tagen/Wochen kommt; beim Release sofort Push mit Link, um als einer der Ersten zum UVP zu bestellen.
- **Cardmarket ganz wichtig:** jede Top-/Elite-Trainer-Box (auch alte Sets) bis 60 € ohne Versand anzeigen („lieber mehr anzeigen“),
  dazu Displays, Booster-Bundles, Pin-/Poster-Kollektionen im Blick. Nur erlaubte Wege (offizielle API prüfen, kein Scraping gegen AGB/Bot-Schutz).
- Eigener Reiter „Graded & Live“ (Wunsch 09.11.2026): gegradete Pokémon-Einzelkarten (PSA, CGC, BGS …) und Live-Shows (Whatnot, eBay Live).
  Whatnot + eBay Live: keine offizielle Schnittstelle → nicht automatisch auslesen; stattdessen Folgen/Benachrichtigen in deren Apps + Such-Links.
  Graded-Angebote (Sofortkauf + Auktionen) über die offizielle eBay Browse API (gleiches Entwicklerkonto wie M4). Getrennt vom Sealed-Filter.
- Regel-Ergänzung: Top-Trainer-Boxen bis 60 € (ohne Versand) gelten immer als Treffer, egal welches Set.
- **Pokémon Center ganz wichtig** (z. B. Dunkelnacht- und Delta-Herrschaft-Displays DE, Stand 09.11.2026 noch verfügbar) – ständig prüfen.
  Von GitHub aus durch DataDome geblockt → nur über Handy-Wächter, Bot-Schutz nie umgehen.
- **Daueraufgabe:** Immer prüfen, ob verfügbare Schnittstellen, APIs, MCP-Server/Konnektoren oder Downloads das Projekt verbessern,
  und sie dem Nutzer jeweils als Hinweis vorschlagen (nicht ungefragt einrichten).

**Feste Regeln:**
- Nur MELDEN, nie automatisch kaufen
- Kein Umgehen von Bot-Schutz (Cloudflare, Warteschlangen, Captchas); Nutzungsbedingungen je Shop beachten;
  bevorzugt offizielle Schnittstellen, öffentliche Produkt-Feeds (z. B. Shopify `products.json`), RSS, Newsletter
- Eigener User-Agent, vernünftige Abstände, „nur wenn geändert“-Abfragen (Datenvolumen Handy!)
- Fehler einer Quelle stoppen nie den ganzen Ablauf
- Abhängigkeiten minimal, Versionen fest; Actions auf Commit-SHA gepinnt, minimale Rechte
- Vor Installationen/Löschungen auf dem Gerät des Nutzers: erklären und OK abwarten
- Wichtige Entscheidungen zusätzlich im Obsidian-Vault des Nutzers (`Projekte/Pokemon-Restock-Radar/`) –
  aus der Cloud kein Zugriff → Notizen zum Übertragen bereitstellen

---

## Teil B – Projektstand

### Entscheidungen
- 09.11.2026: Name „Pokémon-Restock-Radar“, Repo `kowaygg/Pokemon-Restock-Radar` (öffentlich – Actions/Pages kostenlos)
- 09.11.2026: Technik: Node.js ohne Zusatzpakete (wie bewährt); Wächter läuft auf dem Android-Handy (Termux, alle 2–5 Min.),
  GitHub Actions als langsamer Ersatz (real 15–50 Min.), Push über ntfy, später PWA auf GitHub Pages
- 09.11.2026: eBay über offizielle Browse API (kostenloses Entwicklerkonto)

- 09.11.2026: Whatnot nicht einbauen (keine offizielle Schnittstelle). WhatsApp nicht (keine erlaubte Lese-Schnittstelle).
- 09.11.2026 (M2, 0.1.0): GitHub-Wächter alle 5 Min. (Cron, real verzögert) für Shopify-Händler TCGViert, Geeks Heaven,
  Cardcosmos über /products.json (bis 20 Seiten). Stand im Actions-Cache (data/zustand.json). Erster Lauf je Händler nur merken.
  „Neu“ nur wenn published_at ≤ 72 h. Push nur bei Preis ≤ UVP + 5 € (pushNurUvp). Kanal nur im Secret NTFY_KANAL.
- 09.11.2026: Erkenntnis erster Lauf: Fachhändler verkaufen ältere/beliebte ETBs weit über UVP (+35 bis +245 €) → UVP-Filter ist zentral.
- 09.11.2026: Von GitHub aus geblockt (Cloudflare/DataDome/Imperva): MediaMarkt, Saturn, Thalia, Galeria, Kaufland,
  Spiele-Offensive, Fantasywelt, Pokémon Center, Smyths → nur über Handy-Wächter (M3) testen, Bot-Schutz NIE umgehen.

- 09.11.2026 (0.2.0): Sitemap-Wächter (`src/sitemap-waechter.js`): Alternate als `sitemap-jsonld` (neue URLs + Preis/Bestand aus JSON-LD,
  10 Produktseiten pro Lauf rotierend), Card-Corner/TRADER/Gameshop Marli/Müller als `sitemap` (nur Frühwarnung). Sitemap alle 15 Min.
- 09.11.2026: UVP-Bewertung strenger: Preis < 70 % UVP = „unplausibel“; 10er/18er/30er-Displays ≠ 36er; Kollektionen brauchen passende Namenswörter;
  JP/KR/CN nur gegen UVP-Einträge derselben Sprache. Push nur bei echtem UVP-Treffer (oder Frühwarnung ohne Preis).
- 09.11.2026: Shopify-Warenkorb-Link `/cart/<variante>:1` als Knopf in App + Push („In den Warenkorb“).
- 09.11.2026: PWA in `web/`, wird bei jedem Abruf mit `data/oeffentlich.json` auf GitHub Pages veröffentlicht.

- 09.11.2026 (0.3.0): Handy-Wächter `scripts/handy-waechter.js` (Termux, `npm run handy`): jede Minute Schnellcheck der 30 zuletzt
  geänderten Produkte je Shopify-Shop (~50 KB gzip), alle 30 Min. kompletter Durchlauf, Gedächtnis bleibt erhalten (Restocks alter Produkte).
  Sitemap-Händler nur auf GitHub. Stündlich `git pull`. Doppel-Push-Schutz: vor dem Senden ntfy-Kanal der letzten 12 h abfragen (gleicher Link → kein Push).

- 09.11.2026: Handy-Wächter läuft auf dem Handy des Nutzers (Termux aus F-Droid, Node v24.17). Händler-Check vom Handy (Heim-WLAN):
  MediaMarkt + Saturn 200 ohne Bot-Schutz → nur dort einbauen. Weiter gesperrt: Pokémon Center (DataDome), Thalia/Galeria/Kaufland/
  Fantasywelt/Spiele-Offensive (Cloudflare), Smyths (Imperva). Shopify products.json gab kurz 429 → 0.3.1: 10 Min. Pause nach 429,
  1,5 s zwischen Seiten. PC und Handy teilen evtl. dieselbe IP → vom PC nicht unnötig testen, solange das Handy läuft.

### Aufbau
- `config/haendler.json` – Händler (status kandidat/aktiv/gesperrt, abfrage shopify) · `config/uvp.json` – UVP-Liste mit Sicherheit + Quellen
- `config/einstellungen.json` – zentrale Werte · `config/release-quellen.json` – Quellen für Kalender/Newsfeed (Stufen A/B/C)
- `src/run.js` – Durchlauf · `src/shopify.js` · `src/produkt.js` (Erkennung Art/Sprache/Vorbestellung) · `src/uvp.js` · `src/aenderungen.js` · `src/push.js` (ntfy)
- `src/sitemap-waechter.js` (Sitemap + JSON-LD) · `web/` (App: Top · Meldungen · Frühwarnung · TTB-Markt · UVP-Liste · Händler) · `scripts/symbole.js` (App-Symbole) · `scripts/vorschau.js` (lokale Vorschau :8090)
- `src/haendler-pruefen.js` + `scripts/haendler-check.js` – technischer Händler-Check
- `.github/workflows/` – `abruf.yml` (alle 5 Min.), `haendler-check.yml`, `tests.yml`
- `docs/` – Recherche + Händler-Check-Ergebnisse

### Befehle
- `npm test` · `npm run abruf` · `npm run haendler-check` · `npm run vorschau` · `npm run symbole` · `npm run handy` (Handy-Wächter)

### Offene Punkte
- ✅ 09.11.2026: Secret NTFY_KANAL angelegt (Kanal nur in Secret + lokaler .env), Test-Push gesendet; Kanal in ntfy-App auf dem Handy abonniert, Test-Push angekommen ✅
- ✅ 09.11.2026: Vault-Notizen unter Projekte/Pokemon-Restock-Radar/ angelegt
- UVPs mit Sicherheit „niedrig“ bestätigen; Händler-Impressen von Hand + handelsregister.de prüfen
- ✅ 09.11.2026: Alternate + Sitemap-Frühwarnung (0.2.0), App mit Reiter Top
- M2 Rest: Release-Kalender (pokemon.com/de)
- UVPs für JP/KR/CN-Ware recherchieren (je Produkt, mit Quelle) – sonst erscheint Asien-Ware nie in „Top“
- Versandkosten je Händler erfassen (Regel: Preis + Versand ≤ UVP + 5 €) – bisher nur Artikelpreis geprüft
- Schneller als GitHub-Cron: Handy-Wächter (M3) oder externer Gratis-Taktgeber (cron-job.org → workflow_dispatch, braucht Token + Konto des Nutzers)
- ✅ Handy-Wächter läuft auf dem Handy (09.11.2026)
- MediaMarkt + Saturn in den Handy-Wächter (vom Handy aus erreichbar) – erlaubten Weg prüfen (öffentliche Produktseiten/JSON-LD, AGB)
- DANACH (Reihenfolge vom Nutzer): Reiter News & Leaks · Pokémon Center · Cardmarket
- Eigenes App-Symbol „Feuerdrache“ (lokal mit ComfyUI, nichts Geschütztes nachbauen)
- M3 Handy-Wächter (Termux) für Cloudflare-geschützte Ketten
