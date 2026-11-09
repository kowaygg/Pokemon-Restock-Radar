# M1 – Recherche (Teil 1, Stand 09.11.2026)

Status-Zeichen: ✅ geprüft · ⚠ teilweise/widersprüchlich · ❓ noch offen

## eBay (Browse API)
- ✅ Kontingent: 5.000 Aufrufe pro Tag pro Anwendung (offizielle eBay-Seite „API call limits“) → reicht für eine Suche alle ~20 s, real planen wir 1–2 Min.
- ⚠ Browse API gehört zu den „Buy APIs“: laut eBay-Fußnote ist für die Produktionsnutzung eine **zusätzliche Lizenz/Freigabe** nötig. → Beim Anlegen des Entwicklerkontos prüfen, ob die Freigabe für privaten Gebrauch erteilt wird. Erhöhung über „Application Growth Check“.
- Quellen: https://developer.ebay.com/develop/api/buy/api_call_limits · https://developer.ebay.com/develop/get-started/api-call-limits

## Pokémon Center
- ✅ **Pokémon Center Deutschland** gibt es seit Oktober 2025 (Beta), liefert nur an deutsche Adressen, Abwicklung über Global-E, Sortiment anfangs vor allem Plüsch.
- ✅ **Pokémon Center USA** liefert nicht direkt nach Deutschland → nur über Paketweiterleiter (z. B. MyUS, Forward2Me). Ausländische Kreditkarten wurden teils abgelehnt (❓ aktueller Stand).
- US-ETBs haben teils US-exklusiven Inhalt (Grund, warum Sammler dort kaufen).
- Quellen: https://www.elitefourum.com/t/pokemoncenter-germany-is-open-now/58751 · https://mein-mmo.de/en/pokemon-finally-opens-its-notorious-online-shop-in-germany-it-might-cost-you-your-savings,1531316 · https://www.comgateway.com/ru/blogs/logistics-pros-save-65-on-the-mega-evolution-perfect-order-elite-trainer-box-by-shipping-from-the-us-to-germany/

## Whatnot
- ❌ Keine offizielle öffentliche Schnittstelle für Käufer gefunden; alle Werkzeuge sind inoffizielle Scraper (interne GraphQL-Schnittstelle). → **Nicht einbauen** (Regel: kein verbotenes Scraping).

## Reddit
- ⚠ Kostenlose Data API: 100 Abfragen/Min., nur nicht-kommerziell, App-Registrierung mit manueller Freigabe (Berichte: 2–4 Wochen). Ein Bericht nennt Einstellung neuer öffentlicher Anfragen zum 31.10.2026 – **nicht offiziell bestätigt**.
- Plan: zuerst RSS-Feeds der Subreddits testen, offizielle API beantragen, falls nötig. ❓ Prüfen beim Einbau.

## UVP (erste Werte – vor Übernahme in die UVP-Liste je Produkt nochmals prüfen)
- ⚠ Top-Trainer-Box (normale Sets): mehrfach **54,99 €** genannt; Großhandel 55,00 €
- ⚠ Display (36 Booster): **179,99 €**
- ⚠ „30 Jahre“ Top-Trainer-Box: Angaben schwanken **52,99 € / 54,99 €**
- ⚠ Pokémon-Center-Top-Trainer-Box (z. B. Delta-Herrschaft): laut einer Quelle **61,99 €**
- Aktuelles Set November 2026: **Delta-Herrschaft**
- Kaufland: TTB „30 Jahre“ zur UVP, aber nur in Filialen, nicht online
- Quellen: https://soleback.com/de/artikel/pokemon-tcg-november-2026-delta-herrschaft-release · https://www.dealdoktor.de/magazin/pokemon-top-trainer-box/ · https://www.tcgcheck.de/pokemon/set/de/30-jahre/30-jahre-top-trainer-box · https://www.monsterdealz.de/magazin/pokemon-30-jahre

## Händler-Kandidaten (❓ alle noch NICHT geprüft: Impressum, Handelsregister, Bewertungen, Abfragbarkeit, Nutzungsbedingungen)
- Ketten: MediaMarkt, Saturn, Müller, Thalia, Smyths Toys, Galeria, Otto, Kaufland (online?), Rossmann (online?), Rombach (online?)
- Fachhandel: Alternate, TCGViert, Card-Corner, Gate to the Games, Spiele-Offensive, Fantasywelt, Gameshop Marli, Cardmex, Geeks Heaven
- Hilfsquellen (kein Händler): TCGCHECK (Preisvergleich mit UVP-Angaben – Nutzungsbedingungen prüfen), DealDoktor/MyDealz/Monsterdealz (Deal-Artikel → Newsfeed)

## Nächste Schritte
1. Händler einzeln prüfen (Seriosität + Shop-System + robots.txt/AGB)
2. UVP-Liste mit Quellen anlegen (`config/uvp.json`)
3. Release-Kalender-Quelle festlegen
