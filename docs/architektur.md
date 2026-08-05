# Architektur

## Entscheidung

Die lokale Vereinswebsite wird als eigenstaendiges statisches Website-Projekt mit kleinem Node-Server aufgebaut.

## Begruendung

- Die produktive Website bleibt vollstaendig unangetastet.
- Das bestehende Redaktions-Tool bleibt die redaktionelle Quelle.
- Die neue Website liest eine lokale Kopie der Daten unter `public\content`.
- Dadurch kann die Website jederzeit getestet werden, ohne Entwuerfe, Backups oder Originaldaten zu veraendern.
- Fuer den aktuellen lokalen Start sind keine neuen externen Dienste und keine Zugangsdaten notwendig.

## Datenfluss

```text
G:\Projekte\TTC-Spielbericht-Agent\data
        |
        | npm run sync:redaktion
        v
G:\Projekte\Website\ttc-ofenstadt-velten-lokal\public\content
        |
        | Browser liest JSON
        v
Lokale Vereinswebsite unter http://127.0.0.1:5188
```

## Aktuelle Module

- `server.mjs`: lokaler statischer Server
- `scripts\sync-redaktion-data.mjs`: lesender Import aus dem Redaktions-Tool
- `public\index.html`: Seitenstruktur
- `public\aktuelles.html`: lokale News-/Aktuelles-Seite aus Live-Hinweisen und Vorschau-Snapshot
- `public\galerie.html`: lokale PDF-Galerie mit Links aus der Live-Website
- `public\mannschaften.html`: lokale Mannschaftsuebersicht auf Basis des strukturierten Snapshots
- `public\spielberichte.html`: lokale Berichtsliste mit Statusfilter aus dem Redaktions-Snapshot
- `public\training.html`: lokale Trainings-, Hallen- und Kontaktseite
- `public\verein.html`: lokale Ueber-uns-Seite mit Inhalten der Live-Website
- `public\sponsoren.html`: lokale Sponsorenuebersicht mit den im Projekt hinterlegten Logos
- `public\styles.css`: Gestaltung
- `public\app.js`: Laden und Rendern von Vorschauen, Berichten und Mannschaften
- `public\aktuelles.js`: Laden und Rendern kommender Spiele fuer die Aktuelles-Seite
- `public\mannschaften.js`: Laden und Rendern der Mannschafts-Unterseite
- `public\spielberichte.js`: Laden, Klassifizieren und Filtern der Spielberichte

## Spaetere Anbindung

Die naechste Stufe sollte das Redaktions-Tool nicht direkt aus der Website heraus beschreiben, sondern ueber eine definierte Export-Schnittstelle anbinden:

- Vorschau freigeben
- Spielbericht freigeben
- Website-Status setzen
- Cross-Posting-Text je Kanal ausgeben
- Bildkarte je Kanal ausgeben

Erst wenn diese Freigabe- und Statuslogik sauber definiert ist, sollte Schreiben zurueck ins Redaktions-Tool oder automatisches Posting ergaenzt werden.
