# Anleitung: Abwesenheitsplaner für Oberärzte (OA-Planer)

Willkommen im neuen Abwesenheitsplaner v2. Dieses Tool ist als Progressive Web App (PWA) konzipiert und kann auf Ihrem Smartphone oder PC wie eine App installiert werden.

## 1. Zugang & Anmeldung
**Link:** [https://lateina.github.io/urlaubsplaner-v2/](https://lateina.github.io/urlaubsplaner-v2/)

1.  **Planer-Code (Master Key):** Geben Sie den vom Administrator bereitgestellten Code ein. Dieser wird lokal gespeichert und muss normalerweise nur einmalig eingegeben werden.
2.  **Mitarbeiter-Auswahl:** Suchen oder wählen Sie Ihren Namen aus der alphabetisch sortierten Liste aus.
3.  **PIN:** Geben Sie Ihren persönlichen PIN ein, um sich anzumelden.

## 2. Funktionen

### Abwesenheit beantragen
Klicken Sie oben auf die Schaltfläche "Abwesenheit beantragen" oder nutzen Sie die **Drag-and-Drop-Funktion** direkt im Kalender-Grid (Klicken und Ziehen über den gewünschten Zeitraum).

### Besetzungs-Check (Neu)
Das System prüft bereits während der Datenauswahl im Antrag, ob durch Ihren Urlaub eine **Unterdeckung** in kritischen Bereichen entsteht. Eine Warnung erscheint im Fenster, falls Grenzwerte in folgenden Bereichen unterschritten werden:
- **TAVI, Privat, TEER, Echo** (mind. 1 Person erforderlich)
- **Herzkatheter / HK** (mind. 3 Personen erforderlich)
- **EPU** (mind. 2 Personen erforderlich)

### Vertreter-Regelung
Wählen Sie im Antragsformular einen Kollegen als Vertreter aus. Das System prüft automatisch, ob dieser im gewählten Zeitraum selbst anwesend und nicht bereits als Vertreter für jemanden anderen eingetragen ist.

## 3. Installation als App (Empfohlen)
Um den Planer wie eine App zu nutzen:
- **iOS (Safari):** Teilen-Icon (Viereck mit Pfeil) -> "Zum Home-Bildschirm hinzufügen".
- **Android (Chrome):** Drei Punkte -> "App installieren".
- **PC (Chrome/Edge):** Symbol in der Adressleiste -> "Installieren".

## 4. Status & Benachrichtigungen
Im Reiter **"Anfragen"** (Glocken-Symbol) sehen Sie den aktuellen Status Ihrer Anträge:
- `pending_vertreter`: Wartet auf Bestätigung durch Ihren Vertreter.
- `pending_admin`: Wartet auf finale Freigabe durch den Administrator (LOA).
- `approved`: Antrag ist genehmigt und fest im Kalender eingetragen.

---
*Bei technischen Problemen oder einem vergessenem PIN wenden Sie sich bitte an den Administrator.*
