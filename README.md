# GLUTMASS

**Richtig rechnen. Satt grillen.**

Grillgut-Rechner für glutmass.de: sagt in Stückzahlen, was für eine Grillparty eingekauft werden muss, und zeigt, wie viel weniger es ist als nach der 400-g-Faustregel.

## Aufbau

```
public/                  wird 1:1 auf den Strato-Webspace geladen
  index.html             Rechner
  so-rechnen-wir.html    offene Methode (Pflicht wegen UWG/EmpCo)
  datenschutz.html       Datenschutzerklärung
  404.html, robots.txt, favicon.svg, .htaccess
  assets/css/            Stylesheet (CI-Farben, hell/dunkel)
  assets/js/calc.js      Rechenlogik, reine Funktionen
  assets/js/app.js       Oberfläche
  assets/fonts/          lokale Schriften (woff2, SIL OFL)
  api/zaehler.php        gemeinsamer Zähler (anonyme Summe)
  api/data/              Zählerdatei, per .htaccess gesperrt, nicht im Repo
tests/                   node --test
prototype/               ursprünglicher Klick-Prototyp (Oktober 2026)
```

## Entwickeln

Statische Seite, kein Build. Zum Ansehen einen beliebigen lokalen Webserver auf `public/` richten, z. B.:

```bash
php -S localhost:8000 -t public
```

Mit PHP läuft auch der Zähler. Ohne PHP (z. B. `npx serve public`) zeigt der Rechner „Zähler gerade nicht erreichbar“, alles andere funktioniert.

Tests (Node 20+):

```bash
npm test
```

`tests/methode.test.mjs` prüft, dass die Zahlen auf „So rechnen wir“ mit `calc.js` übereinstimmen. Wer einen Wert ändert, ändert ihn an beiden Stellen.

Nach Änderungen an CSS/JS die Versionsnummer `?v=N` in den HTML-Dateien (und im Import in `app.js`) hochzählen, damit Browser die neue Datei laden.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) testet bei jedem Push und lädt bei Push auf `main` den Ordner `public/` per SFTP hoch. Dafür unter **Settings → Secrets and variables → Actions** anlegen:

| Secret | Beispiel |
| --- | --- |
| `SFTP_HOST` | `ssh.strato.de` |
| `SFTP_USER` | SFTP-Benutzer aus dem Strato-Kundenbereich |
| `SFTP_PASSWORD` | zugehöriges Passwort |
| `SFTP_PATH` | Zielordner der Domain, z. B. `/` oder `/glutmass` |

Solange die Secrets fehlen, wird das Deployment mit einer Warnung übersprungen. Auf dem Server wird nichts gelöscht, und die Zählerdatei wird nie überschrieben.
