# TTC Ofenstadt Velten - lokale Parallel-Website

Dieses Projekt ist die neue lokale Vereinswebsite fuer den TTC Ofenstadt Velten.
Sie liegt bewusst parallel zu vorhandenen Website-Dateien und zum Redaktions-Tool.

## Start

```powershell
cd G:\Projekte\Website\ttc-ofenstadt-velten-lokal
npm.cmd start
```

Danach im Browser oeffnen:

```text
http://127.0.0.1:5188
```

## Daten aus dem Redaktions-Tool aktualisieren

```powershell
npm.cmd run sync:redaktion
```

Die Synchronisation liest aus:

```text
G:\Projekte\TTC-Spielbericht-Agent\data
```

Sie schreibt nur Snapshots nach:

```text
public\content
```

Das bestehende Redaktions-Tool wird dabei nicht veraendert.

## Struktur

```text
public/
  index.html
  aktuelles.html
  galerie.html
  mannschaften.html
  spielberichte.html
  training.html
  verein.html
  sponsoren.html
  styles.css
  app.js
  aktuelles.js
  mannschaften.js
  spielberichte.js
  assets/
    logo.png
    logo.jpeg
  content/
    mannschaften.json
    spiele.json
    vorschauen.json
scripts/
  sync-redaktion-data.mjs
docs/
  bestandsaufnahme.md
  architektur.md
```

## Start per Doppelklick

- `Website starten.cmd`
- `Redaktionsdaten aktualisieren.cmd`

## Nicht beruehrt

- produktive Website
- WordPress-Dateien auf dem Desktop
- bestehendes Redaktions-Tool
- Zaehltafel-Projekte
