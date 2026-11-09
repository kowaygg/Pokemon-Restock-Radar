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
termux-wake-lock
npm run handy
```
- Termux offen lassen (darf im Hintergrund sein). In der Benachrichtigungsleiste steht dann „Termux – wake lock held“.
- Beenden: in Termux Lautstärke-runter + C drücken.
- Nach einem Neustart des Handys: Termux öffnen → `cd Pokemon-Restock-Radar` → `termux-wake-lock` → `npm run handy`

## Was der Wächter macht
- Jede Minute die 30 zuletzt geänderten Produkte je Shop (~50 KB), alle 30 Min. kompletter Durchlauf
- Holt sich stündlich selbst Updates (`git pull`)
- Meldet nichts doppelt (prüft den ntfy-Kanal der letzten 12 Stunden)
