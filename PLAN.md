# Plan – Pokémon-Restock-Radar (Stand 09.11.2026)

| # | Meilenstein | Inhalt | Gratis-Grenzen |
|---|---|---|---|
| M0 | Start | Repo, CLAUDE.md, Plan, .gitignore, Tests-Grundgerüst | – |
| M1 | Recherche | Händlerliste (Seriosität + technisch/rechtlich abfragbar?), UVP-Liste, Release-Kalender-Quellen, eBay Browse API, Whatnot, Newsletter-Auswertung, Termux | – |
| M2 | Release-Kalender + Vorbestell-Alarm | Kommende Sets, Vorbestell-Start bei Händlern → Push | GitHub Actions reicht |
| M2b | Frühwarnung | sitemap.xml + Vorbestell-/Demnächst-Seiten der Händler auf neue Pokémon-URLs, JP-Releases, offizielle Produktvorschauen | GitHub Actions reicht |
| M3 | Shop-Wächter (Handy) | Termux + Node.js, Shops alle 2–5 Min., Meldung bei „neu bestellbar“, ntfy-Push (ETB dringend) | Datenvolumen begrenzen: nur Pokémon-Kategorie, „nur wenn geändert“, gestaffelte Abstände |
| M4 | eBay-Wächter | Sofortkauf + Auktionen (≤ 10 Min.), Preis + Versand ≤ UVP + 5 €, Verkäufer-/Warnwort-Filter | ca. 5.000 Abfragen/Tag (prüfen) |
| M5 | Newsletter-Auswertung | Eigene Postfach-Adresse nur für Newsletter, Auswertung → Releases-Reiter + Push | prüfen |
| M5b | Community + Newsfeed | Reddit (API/RSS), Discord (eigener Bot + Kanal folgen), Telegram; Prüfung jedes Hinweises direkt beim Händler; Vertrauensstufen A/B/C | Reddit-API gratis (nicht kommerziell, prüfen) |
| M6 | PWA | Reiter: Händler-Releases · Sofortkauf · Auktionen · Releases & Kalender · Newsfeed · UVP-Liste · Händler; Offline, Installierbar | GitHub Pages |
| M7 | Statistik + Selbstcheck | Restock-Muster pro Shop, wöchentlicher Check (Shops, eBay, Wächter läuft?) | GitHub Actions |

Jeder Meilenstein: testen, dem Nutzer zeigen, erst nach OK veröffentlichen.
