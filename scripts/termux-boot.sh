#!/data/data/com.termux/files/usr/bin/sh
# Termux:Boot – startet den Handy-Wächter (mit Selbstheilung) automatisch nach einem Neustart des Handys.
# Einrichten (einmalig, in Termux): siehe docs/handy-waechter.md, Abschnitt „Autostart“.
termux-wake-lock
sleep 30 # WLAN/Netz abwarten
nohup sh ~/Pokemon-Restock-Radar/scripts/handy-dauerlauf.sh >> ~/restock-radar.log 2>&1 &
