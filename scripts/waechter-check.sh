#!/data/data/com.termux/files/usr/bin/sh
# Aufpasser: läuft alle 15 Min. über den Android-Jobplaner (termux-job-scheduler, braucht die App Termux:API).
# Läuft der Dauerlauf nicht mehr (Android hat Termux beendet, Energiesparen, Wegwischen …), wird er neu gestartet.
pidfile=~/.restock-radar.pid
if [ -f "$pidfile" ] && grep -q handy-dauerlauf "/proc/$(cat "$pidfile")/cmdline" 2>/dev/null; then
  exit 0 # läuft noch – nichts zu tun
fi
echo "$(date '+%d.%m. %H:%M') Aufpasser: Wächter lief nicht – starte neu" >> ~/restock-radar.log
nohup sh ~/Pokemon-Restock-Radar/scripts/handy-dauerlauf.sh >> ~/restock-radar.log 2>&1 &
