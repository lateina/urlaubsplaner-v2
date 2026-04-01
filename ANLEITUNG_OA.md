# Anleitung: Abwesenheitsplaner für Oberärzte (OA-Planer)

Willkommen im neuen Abwesenheitsplaner. Dieses Tool ist als Progressive Web App (PWA) konzipiert und kann auf Ihrem Smartphone oder PC wie eine App installiert werden.

## 1. Zugang & Anmeldung

**Link:** [https://lateina.github.io/urlaubsplaner-v2/](https://lateina.github.io/urlaubsplaner-v2/)

1.  **Planer-Code (Master Key):** Geben Sie den bereitgestellten Code ein. Dieser wird lokal gespeichert und muss normalerweise nur einmalig eingegeben werden.
2.  **Mitarbeiter-Auswahl:** Suchen oder wählen Sie Ihren Namen aus der alphabetisch sortierten Liste aus.
3.  **PIN:** Geben Sie Ihren persönlichen PIN ein, um sich anzumelden.

## 2. Navigation & Bedienung

Der Kalender bietet intuitive Möglichkeiten zur Steuerung:

- **Heute-Button:** Ein Klick auf "Heute" bringt Sie sofort zum aktuellen Datum. Ein roter Pfeil markiert kurzzeitig den heutigen Tag.
- **Farben:** Wochenenden sind grau hinterlegt, bayerische Feiertage hellrot. Ihre eigene Zeile ist dezent markiert.

## 3. Abwesenheit beantragen

Klicken Sie oben auf die Schaltfläche "Abwesenheit beantragen".

### Besetzungs-Check

Das System prüft bereits während der Datenauswahl im Antrag, ob durch Ihren Urlaub eine **Unterdeckung** in kritischen Bereichen entsteht. Eine Warnung erscheint im Fenster, falls Grenzwerte in folgenden Bereichen unterschritten werden:

- **TAVI, Privat, TEER, Echo** (mind. 1 Person erforderlich)
- **Herzkatheter / HK** (mind. 3 Personen erforderlich)
- **EPU** (mind. 2 Personen erforderlich)

### Vertreter-Regelung

Wählen Sie im Antragsformular einen Kollegen als Vertreter aus. Das System prüft automatisch, ob dieser im gewählten Zeitraum selbst anwesend und nicht bereits als Vertreter für jemanden anderen eingetragen ist.
**Hinweis:** Ihr Vertreter muss der Anfrage erst im System zustimmen, bevor sie zur finalen Freigabe an den Leitenden OA weitergeleitet wird.

### Selbst als Vertreter zustimmen

Wenn ein Kollege Sie als Vertreter anfragt, sehen Sie dies unter dem Reiter **"Anfragen"** (Glocken-Symbol) im Bereich "Vertretungsanfragen". Dort können Sie zustimmen oder die Vertretung ablehnen.

## 3. Installation als App (Empfohlen)

Um den Planer wie eine App zu nutzen:

- **iOS (Safari):** Teilen-Icon (Viereck mit Pfeil) -> "Zum Home-Bildschirm hinzufügen".
- **Android (Chrome):** Drei Punkte -> "App installieren".
- **PC (Chrome/Edge):** Symbol in der Adressleiste -> "Installieren".

## 4. Status & Benachrichtigungen

Im Reiter **"Anfragen"** (Glocken-Symbol) sehen Sie den Status Ihrer Anträge:

- **Wartet auf Vertreter (`pending_vertreter`):** Ihr gewählter Vertreter muss der Anfrage noch zustimmen.
- **Wartet auf Admin (`pending_admin`):** Der Vertreter hat zugestimmt; die finale Freigabe durch den Administrator (LOA) steht noch aus.
- **Genehmigt (`approved`):** Der Antrag ist final bestätigt und fest im Kalender eingetragen.
- **Abgelehnt (`rejected`):** Der Wunsch konnte nicht erfüllt werden (siehe Begründung im Tool).

### PO-Eintragung (Personal-Oberarzt/Organisation)
Nach der finalen Genehmigung im Urlaubsplaner muss der Urlaub noch im offiziellen Dienstplan-System (PO) hinterlegt werden. 
- Für **Anwender**: Sobald dies erledigt ist, erscheint bei Ihrem Antrag im System ein grüner Haken mit dem Hinweis: *"In PO eingetragen von [Kürzel] am [Datum]"*.
- Für **Administratoren/Sekretariat**: Unter dem Reiter **"Anfragen"** gibt es für berechtigte Personen den Tab **"PO-Übertragung"**. Hier können alle genehmigten Urlaube gesammelt abgearbeitet und mit einem Klick auf "In PO?" markiert werden. Zudem kann hier eine PDF für die PO-Karte erstellt werden.

---

_Bei technischen Problemen oder einem vergessenem PIN wenden Sie sich bitte an den Administrator._
