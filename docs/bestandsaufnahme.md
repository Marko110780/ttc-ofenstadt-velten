# Bestandsaufnahme vom 02.08.2026

## Gepruefte Orte

- `G:\Projekte`
- `G:\Projekte\Website`
- `G:\Projekte\TTC-Spielbericht-Agent`
- lokale Parallel-Website: `G:\Projekte\Website\ttc-ofenstadt-velten-lokal`
- Live-Website: `https://www.tischtennis-velten.de`
- Verbands-/Stadtquellen: Stadt Velten und click-TT

## Live-Website: Struktur

Die aktuelle Live-Seite nutzt WordPress/Astra und fuehrt im Hauptmenue:

- Startseite
- Ueber uns
- News
- Galerie
- Trainingszeiten
- Mannschaften
- 1. Mannschaft
- 2. Mannschaft
- 3. Mannschaft
- 4. Mannschaft
- U15 Jugend
- Kontakt
- Impressum
- Datenschutz

Aus aelteren gecrawlten Seiten sind zusaetzlich Unterpunkte wie Vorstand, Halle, Aufnahmeantrag, Protokolle, Satzung, Sponsoren & Spender und Facebook bekannt. Diese Struktur wirkt teilweise durch Weiterleitungen oder Theme-Umbau veraendert.

## Live-Website: gepruefte Inhalte

### Startseite

- Hinweis: Aus Oberhavelcup wird "Veltener Ofencup"
- Linktext: Ausschreibung Ofencup 2026
- Hinweis: Die Saison 2025 / 2026 ist beendet
- Linktext: Live Spiele unserer Mannschaften

### Trainingszeiten

- Montag: 17:00-18:30 Uhr Nachwuchstraining
- Montag: 18:30-22:00 Uhr Erwachsenentraining
- Mittwoch: 19:00-22:30 Uhr Erwachsenentraining
- Freitag: 17:30-19:00 Uhr Nachwuchstraining
- Freitag: 19:00-22:30 Uhr Erwachsenentraining

### Trainingsort

- Ofenstadthalle Velten
- Am Katersteig 3
- 16727 Velten

### Kontakt

- Postadresse: Am Markt 1A, 16727 Velten
- 1. Vorsitzender: Dirk Mueller
- Telefon: 0176 21192678
- E-Mail: info@ttov.de
- Bankverbindung: TTC Ofenstadt Velten e.V., Mittelbrandenburgische Sparkasse Potsdam, DE91 1605 0000 1000 5481 94

### Bilder/Logos

- Bestehendes Vereinslogo liegt lokal unter `public\assets\logo.png` und `public\assets\logo.jpeg`.
- Hero-Motiv wurde von der Live-Seite lokal gespiegelt: `public\assets\hero-training.png`.
- Lokale Redaktionsbilder liegen unter `public\content\bilder`.

## Mannschaften

Die Live-Navigation nennt nach erneuter Pruefung am 02.08.2026:

- 1. Mannschaft
- 2. Mannschaft
- 3. Mannschaft
- 4. Mannschaft
- U15 Jugend

Die einzelnen Mannschaftsseiten enthalten aktuell folgende sichtbare Angaben:

- 1. Mannschaft in der 2. Landesklasse
- 2. Mannschaft in der Kreisliga
- 3. Mannschaft in der 4. Kreisklasse
- 4. Mannschaft in der 5. Kreisklasse
- U15 Jugend in der Kreisliga

Der lokale strukturierte Mannschafts-Snapshot wurde darauf angepasst. Eine U19-Mannschaft steht in der aktuellen Live-Navigation nicht mehr sichtbar. Die Live-Seite nennt bei den Mannschaften keine explizite Saison; deshalb ist die Saison im lokalen Snapshot bewusst als "Live-Seite ohne Saisonangabe" markiert.

## Termine und Spielberichte

- Vorschauen werden aus `public\content\vorschauen.json` geladen.
- Spielberichte werden aus `public\content\spiele.json` geladen.
- Eintraege mit Demo-ID, ungeprueftem Importstatus oder nicht redaktionell bewerteten Texten werden in der neuen Startseite als "zu pruefen" markiert.
- Umlaute in einigen importierten JSON-Feldern sind falsch codiert; die Startseite normalisiert sie fuer die Anzeige konservativ.

## Externe Bestaetigungen

- Stadt Velten listet TTC Ofenstadt Velten e.V. als Tischtennisverein mit `info@ttov.de` und `www.tischtennis-velten.de`.
- click-TT bestaetigt den Verein TTC Ofenstadt Velten, VNr. 1409, Gruendungsjahr 2019.
- click-TT nennt als Spiellokale Ofenstadthalle Velten, Katersteig 3, und Rathaushalle, Rathausstrasse 2.

## Nicht beruehrt

- produktive Website
- WordPress-Installation
- bestehendes Redaktions-Tool
- Zaehltafel-Projekte
