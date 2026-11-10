# Newsletter direkt als Push (Pokémon Center, Händler) – Stand 10.11.2026

ntfy wandelt E-Mails in Pushes um (offiziell: docs.ntfy.sh → „E-mail publishing“):
Jede E-Mail an `ntfy-<KANAL>@ntfy.sh` erscheint als Push, der Betreff ist der Titel. Kanalname steht NICHT hier (nur .env/Secret).

1. Newsletter abonnieren: Pokémon Center DE (pokemoncenter.com/de-de, Newsletter-Anmeldung), ggf. US, dazu Händler-Newsletter
2. Im E-Mail-Postfach (GMX: Einstellungen → Filterregeln) eine Regel anlegen:
   Absender enthält „pokemoncenter“ (bzw. Händlername) → **weiterleiten an** `ntfy-<KANAL>@ntfy.sh`
3. Testen: eine beliebige E-Mail mit Betreff „Test Newsletter-Push“ an diese Adresse schicken → Push muss ankommen

Hinweis: Weitergeleitet wird nur der Betreff als Titel (+ Anfang des Textes). Kosten: keine.
