#!/data/data/com.termux/files/usr/bin/sh
# Dauerlauf: startet den Handy-Wächter und startet ihn nach einem Absturz automatisch neu (Selbstheilung).
# Aufruf: npm run dauer   (Beenden: Lautstärke-runter + C zweimal)
cd ~/Pokemon-Restock-Radar || exit 1
while true; do
  git pull -q --ff-only 2>/dev/null
  DAUERLAUF=1 node scripts/handy-waechter.js
  echo "$(date +%H:%M) Wächter beendet/aktualisiert – Neustart in 5 Sekunden (zum Stoppen jetzt Lautstärke-runter + C)"
  sleep 5
done
