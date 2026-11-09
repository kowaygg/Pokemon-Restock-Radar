# Übergabe an eine lokale Claude-Code-Sitzung (Stand 09.11.2026)

Alles Wichtige steht in `CLAUDE.md` (Auftrag + Projektstand) und `PLAN.md`. Ergebnisse in `docs/`.

## Sofort erledigen (Nutzer möchte nichts selbst klicken – per Browser-Steuerung/Remote erledigen, Nutzer bestätigt nur)
1. Neuen geheimen ntfy-Kanal erzeugen (z. B. `pkmn-` + 20 Zufallszeichen), als Repository-Secret `NTFY_KANAL` anlegen
   (Settings → Secrets and variables → Actions). Kanalname NIE ins Repo/Vault – nur in `.env` (ignoriert) und Secret.
2. Kanal in der ntfy-App auf dem Android-Handy abonnieren lassen (Link `ntfy://ntfy.sh/<kanal>` schicken), Test-Push senden.
3. Vault-Notizen anlegen: `Projekte/Pokemon-Restock-Radar/` (Projektidee, Recherche M1, Händler-Check, Erkundung) + Tagesnotiz 2026-11-09.

## Weiterbauen
- M2-Rest: Alternate (Sitemap + JSON-LD, nur .de) aktivieren; Frühwarnung über Sitemap-Neuzugänge (Card-Corner, TRADER, Gameshop Marli, Müller);
  Release-Kalender aus pokemon.com/de/news
- M3: Handy-Wächter (Termux, F-Droid) – erst `npm run haendler-check` auf dem Handy, um zu sehen, welche Cloudflare-Shops dort erreichbar sind
- Freiburg lokal: Such-Links (`npm run lokal-links`) testen; Kleinanzeigen nur Links/Suchaufträge (keine Schnittstelle)
- M4: eBay Browse API (Entwicklerkonto, Buy-API-Freigabe klären) inkl. Abhol-Umkreis 79117 / 20 km
