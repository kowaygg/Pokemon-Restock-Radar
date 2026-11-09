# eBay-Zugang einrichten (kostenlos, ohne Kreditkarte) – Stand 09.11.2026

Die Schlüssel stehen NIE im Repo oder Vault – nur als GitHub-Secret und in der .env auf dem Handy.
Die eBay-Seiten sind englisch; Bezeichnungen können leicht abweichen.

1. **developer.ebay.com** öffnen → oben rechts **Register** → Formular ausfüllen → E-Mail bestätigen (kostenlos)
2. Einloggen → oben rechts auf den Namen → **Application Keysets**
3. App-Namen eintragen (z. B. `RestockRadar`) → bei **Production** auf **Create a keyset**
4. eBay fragt nach „Marketplace Account Deletion“ → **Exemption** (Ausnahme) wählen:
   „I do not persist eBay data“ (das Radar speichert keine eBay-Nutzerdaten)
5. Danach zeigt **Production** zwei Werte: **App ID (Client ID)** und **Cert ID (Client Secret)**
6. In GitHub eintragen: Repo → Settings → Secrets and variables → Actions → New repository secret
   - `EBAY_CLIENT_ID` = App ID
   - `EBAY_CLIENT_SECRET` = Cert ID
7. Auf dem Handy in Termux (im Ordner Pokemon-Restock-Radar):
   ```
   echo "EBAY_CLIENT_ID=<App ID>" >> .env
   echo "EBAY_CLIENT_SECRET=<Cert ID>" >> .env
   ```
   Danach Wächter neu starten (Lautstärke-runter + C, `npm run handy`).

Kontingent: ca. 5.000 Abfragen pro Tag – der Wächter braucht bei 5-Minuten-Takt ca. 2.000.
