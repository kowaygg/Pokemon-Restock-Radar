#!/data/data/com.termux/files/usr/bin/sh
# Dauerlauf: startet den Handy-Wächter und startet ihn nach Absturz oder Update automatisch neu (Selbstheilung).
# Stürzt er immer wieder sofort ab (z. B. kaputtes Update), wartet die Schleife immer länger (bis 10 Min.) – schont den Akku.
# Aufruf: npm run dauer   (Beenden: Lautstärke-runter + C zweimal)
cd ~/Pokemon-Restock-Radar || exit 1
# Nie zwei Wächter gleichzeitig: läuft schon einer (Autostart/Aufpasser), nicht noch einen starten
pidfile=~/.restock-radar.pid
if [ -f "$pidfile" ] && grep -q handy-dauerlauf "/proc/$(cat "$pidfile")/cmdline" 2>/dev/null; then
  echo "Der Wächter läuft bereits im Hintergrund – alles gut, nichts zu tun."
  exit 0
fi
echo $$ > "$pidfile"
pause=5
while true; do
  # Logdatei klein halten (nur die letzten 2.000 Zeilen)
  if [ -f ~/restock-radar.log ] && [ "$(wc -l < ~/restock-radar.log)" -gt 5000 ]; then
    tail -n 2000 ~/restock-radar.log > ~/restock-radar.log.neu && mv ~/restock-radar.log.neu ~/restock-radar.log
  fi
  git pull -q --ff-only 2>/dev/null
  start=$(date +%s)
  DAUERLAUF=1 node scripts/handy-waechter.js
  # lief er länger als 10 Min., war es ein normales Ende (Update) → gleich weiter; sonst Pause verdoppeln
  if [ $(( $(date +%s) - start )) -gt 600 ]; then pause=5; else pause=$(( pause * 2 )); [ $pause -gt 600 ] && pause=600; fi
  echo "$(date +%H:%M) Wächter beendet/aktualisiert – Neustart in $pause Sekunden (zum Stoppen jetzt Lautstärke-runter + C)"
  sleep $pause
done
