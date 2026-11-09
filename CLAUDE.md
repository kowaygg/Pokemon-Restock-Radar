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

### Aufbau
- `CLAUDE.md` – diese Datei
- `PLAN.md` – Meilensteine
- `.gitignore`

### Offene Punkte
- Repo auf GitHub anlegen (Nutzer) und Code hochladen
- M1 Recherche: Händler, UVP-Liste, eBay-API-Bedingungen, Whatnot, Newsletter-Weg, Termux
