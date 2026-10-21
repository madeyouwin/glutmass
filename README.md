# GLUTMASS

**Richtig rechnen. Satt grillen.**

Grillgut-Rechner für glutmass.de: sagt in Stückzahlen, was für eine Grillparty eingekauft werden muss, und zeigt, wie viel weniger es ist als nach der 400-g-Faustregel.

## Aufbau

```
public/                  statische Seite, wird von Vercel 1:1 ausgeliefert
  index.html             Rechner
  so-rechnen-wir.html    offene Methode (Pflicht wegen UWG/EmpCo)
  datenschutz.html       Datenschutzerklärung
  404.html, robots.txt, favicon.svg
  assets/css/            Stylesheet (CI-Farben, hell/dunkel)
  assets/js/calc.js      Rechenlogik, reine Funktionen
  assets/js/app.js       Oberfläche
  assets/fonts/          lokale Schriften (woff2, SIL OFL)
api/zaehler.js           gemeinsamer Zähler (Vercel Function, Upstash Redis)
vercel.json              Ausgabeordner, Region fra1, Sicherheits-Header
tests/                   node --test
prototype/               ursprünglicher Klick-Prototyp (Oktober 2026)
```

## Entwickeln

Statische Seite, kein Build. Mit der Vercel CLI läuft alles lokal inklusive Zähler:

```bash
npx vercel dev
```

Ohne Speicher-Variablen zeigt der Rechner „Zähler gerade nicht erreichbar“, alles andere funktioniert. Nur die Seite ansehen geht auch mit `npx serve public`.

Tests (Node 20+):

```bash
npm test
```

`tests/methode.test.mjs` prüft, dass die Zahlen auf „So rechnen wir“ mit `calc.js` übereinstimmen. Wer einen Wert ändert, ändert ihn an beiden Stellen.

Nach Änderungen an CSS/JS die Versionsnummer `?v=N` in den HTML-Dateien (und im Import in `app.js`) hochzählen, damit Browser die neue Datei laden.

## Deployment

Vercel ist mit diesem Repository verbunden: Jeder Push auf `main` geht automatisch live, Pull Requests bekommen eine Vorschau. GitHub Actions (`.github/workflows/tests.yml`) führt parallel die Tests aus.

Der Zähler braucht Upstash Redis aus dem Vercel Marketplace (Region Frankfurt). Die Integration setzt `KV_REST_API_URL` und `KV_REST_API_TOKEN` (oder `UPSTASH_REDIS_REST_URL`/`_TOKEN`) selbst.

Die Domain bleibt bei Strato. Dort zeigen nur A-Record und www-CNAME auf Vercel; die MX-Records für das Postfach bleiben unverändert.
