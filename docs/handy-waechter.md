# Handy-Wächter einrichten (Android, Termux) – Stand 09.11.2026

Kostenlos, ohne Konto, ohne Kreditkarte. Der Kanalname steht NICHT hier – er kommt nur in die Datei `.env` auf dem Handy.

## 1. Apps installieren
1. Im Handy-Browser **f-droid.org** öffnen → „F-Droid herunterladen“ → Datei öffnen → Installieren
   (Android fragt: „Unbekannte Apps installieren“ für Chrome erlauben → zurück → Installieren)
2. F-Droid öffnen, oben suchen: **Termux** → Installieren (NICHT die alte Version aus dem Play Store)

## 2. Akku-Sparen für Termux ausschalten (sonst schläft der Wächter ein)
- Einstellungen → Apps → Termux → Akku → **Nicht eingeschränkt** (Samsung: „Uneingeschränkt“)

## 3. Einrichten (in Termux eintippen, nach jeder Zeile Enter)
```
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git
git clone https://github.com/kowaygg/Pokemon-Restock-Radar.git
cd Pokemon-Restock-Radar
echo "NTFY_KANAL=<dein-kanal>" > .env
npm run haendler-check
```
Fragt `pkg` nach einer Auswahl (Spiegelserver / Konfigurationsdatei): einfach Enter drücken.

## 4. Starten
```
npm run handy
```
- Termux offen lassen (darf im Hintergrund sein). Beenden: Lautstärke-runter + C.
- Nach einem Neustart des Handys: Termux öffnen → `cd Pokemon-Restock-Radar` → `npm run handy`

## 5. Sparmodus (automatisch)
| Lage | Takt | Umfang |
|---|---|---|
| WLAN + lädt | 1 Min. | alles, Handy bleibt wach (wake lock) |
| WLAN | 2 Min. | alles |
| mobile Daten | 5 Min. | nur Schnellcheck, News alle 15 Min. (ca. 20–30 MB/Tag bei ganztägig unterwegs) |
| Akku < 30 % | 10 Min. | nur Schnellcheck |
| Akku < 15 % | Pause | GitHub übernimmt |
Werte änderbar in `config/einstellungen.json` → `handySpar`.

Optional, für genaue Erkennung von WLAN/Akku: App **Termux:API** aus F-Droid installieren, dann in Termux `pkg install -y termux-api`.
Ohne sie schätzt der Wächter (im Zweifel sparsam).

## Was der Wächter macht
- Schnellcheck: die 30 zuletzt geänderten Produkte je Shop (~50 KB), im WLAN alle 30 Min. kompletter Durchlauf
- News & Leaks (offizielle News, Fachseiten, mydealz) alle 5 Min. (unterwegs 15 Min.)
- Holt sich stündlich selbst Updates (`git pull`, nur im WLAN)
- Meldet nichts doppelt (prüft den ntfy-Kanal der letzten 12 Stunden)

## 6. Autostart nach Handy-Neustart (Termux:Boot)
1. In **F-Droid** die App **Termux:Boot** installieren (Play Protect ggf. wie bei Termux bestätigen) und **einmal öffnen**
2. In Termux eingeben:
   ```
   mkdir -p ~/.termux/boot && cp ~/Pokemon-Restock-Radar/scripts/termux-boot.sh ~/.termux/boot/start-radar && chmod +x ~/.termux/boot/start-radar
   ```
3. Fertig: Nach jedem Neustart startet der Wächter nach ca. 30 Sekunden von selbst (Protokoll: `~/restock-radar.log`).

## 7. Selbstcheck
- Täglich prüft GitHub, ob der Handy-Wächter sich gemeldet hat (stilles Lebenszeichen alle 30 Min.) und ob der GitHub-Wächter läuft.
- Push nur bei Problemen, sonntags ein kurzer „Wochen-Check ok“.
