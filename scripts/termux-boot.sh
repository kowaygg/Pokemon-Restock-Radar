#!/data/data/com.termux/files/usr/bin/sh
# Termux:Boot – startet den Handy-Wächter automatisch nach einem Neustart des Handys.
# Einrichten (einmalig, in Termux): siehe docs/handy-waechter.md, Abschnitt „Autostart“.
cd ~/Pokemon-Restock-Radar || exit 1
sleep 30 # WLAN/Netz abwarten
nohup npm run handy >> ~/restock-radar.log 2>&1 &
