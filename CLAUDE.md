# GLUTMASS – Projektbriefing

Online-Grillgut-Rechner für den deutschsprachigen Raum mit Food-Waste-Fokus.
Domain: **glutmass.de** (registriert bei Strato, E-Mail-Postfach bei Strato). Hosting: **Vercel** (wie Marcs andere Projekte).
Inhaber: Marc Stephan, Saarbrücken. Privates Nebenprojekt, Kommunikation auf Deutsch, Du-Form.

## Idee in einem Satz

Der Rechner sagt in **Stückzahlen** (nicht Gramm), was man für eine Grillparty kaufen muss – so, wie man an der Fleischtheke bestellt – und zeigt, wie viel weniger man einkauft als nach der üblichen Faustregel. Claim: **„Richtig rechnen. Satt grillen.“**

## Positionierung (Wettbewerbsrecherche Okt. 2026)

- Grillfürst-Magazin: starker Rechner, aber Vehikel für den eigenen Grill-Shop.
- MiniWebtool: detailliert, aber aus dem US-Markt übersetzt (Pfund).
- Spitzenfleisch.de, Asado Grill (AT), Grübeln statt kübeln (AT): grob oder manuelle Mengen.
- Lücke: DACH-nativ + rechnerisch tief + Metzger-Logik (Stückgewichte, Kinder, Veggie) + Food Waste.

## Aktueller Stand

- `public/`: erste produktive Version (Okt. 2026): Rechner, „So rechnen wir“, Datenschutz, lokale Schriften, CSP-Header.
- `public/assets/js/calc.js`: Rechenlogik als Modul, Tests in `tests/` (laufen in GitHub Actions). `tests/methode.test.mjs` hält „So rechnen wir“ und `calc.js` synchron.
- `api/zaehler.js`: gemeinsamer Zähler als Vercel Function (Region fra1), Speicher Upstash Redis (Frankfurt) über REST, keine IP, Sperre pro Browser-Sitzung, max. 50 kg pro Liste, 30 Listen pro Minute. Ohne Speicher-Variablen antwortet er 503, die Seite zeigt dann „gerade nicht erreichbar“. Gezählt wird nur beim Kopieren/Teilen und nur mit Standardannahmen.
- „Werkstatt“ heißt jetzt „Eigene Annahmen“ (localStorage, nur wenn geändert).
- `vercel.json`: statische Ausgabe aus `public/`, Function-Region fra1, Sicherheits-Header (CSP usw.) und Caching.
- `.github/workflows/tests.yml`: nur Tests. Veröffentlicht wird über die Vercel-GitHub-Integration bei jedem Push auf `main`.
- `prototype/index.html`: ursprünglicher Klick-Prototyp, nur noch als Referenz.
- Design „Variante A · Grillabend“ (21.10.2026, Figma-Datei „GLUTMASS – Design-Vorschläge Rechner“): App als heller Teller mit runden Ecken auf Kohle-Hintergrund, Glut-Kreis oben rechts, heller Kopf mit Kohle-Linie, gewählte Optionen schwarz gefüllt, nummerierte Schritte 1 Gäste · 2 Die Runde · 3 Auf den Grill. Einkaufsliste als Kaufzettel (weißes Papier, gezackte Abrisskanten oben und unten, gestrichelte Trenner). Kompakt: Gäste in drei Spalten, Hunger/Anlass/Beilagen in einem Schritt. Keine feste Leiste am unteren Rand (von Marc abgelehnt).
- Food Waste: schmales grünes Band nur mit dem Satz „Kauf, was gegessen wird.“ (Marc: nicht überladen). Im Kaufzettel Vergleichsbalken Faustregel/GLUTMASS mit gemeinsamem Zähler darunter, aufklappbarer Reste-Plan je Artikel. Später: Teilen-Karte als Bild, Reste-Check am Tag danach.

## Rechenlogik (von Marc bestätigt, Okt. 2026)

- Fleisch pro Erwachsenem: 250 g roh (normaler Hunger, Party, normale Beilagen).
- Faktoren: Hunger 0,8 / 1 / 1,25 · Anlass 0,85 / 1 / 1,3 · Beilagen wenig 1,12 / normal 1 / viel 0,85.
- Kinder (bis 12): 120 g, Bratwurst und Hähnchenspieß 70 : 30 (ohne Beilagen-Faktor). Fehlt eins davon, bekommt das andere alles; fehlen beide, das erste gewählte Fleisch.
- Vegetarier: 250 g Grillkäse + Gemüsespieß (50/50).
- Stückgewichte: Bratwurst 100 g, Nackensteak 200 g, Hähnchenspieß 150 g, Rumpsteak 250 g, Bauchscheiben 120 g, Grillkäse 100 g, Gemüsespieß 150 g.
- Fleischmix nach Anteilen (Bratwurst 35, Nacken 30, Hähnchen 20, Rumpsteak 15, Bauch 15), normalisiert auf die gewählten Artikel.
- Stückzahl = gerundet (Gewicht / Stückgewicht), mindestens 1.
- Beilagen: 1,5 Brötchen/Erw., 1/Kind, Salat 150 g p. P., Saucen 50 ml p. P.
- Preise sind Richtwerte in €/kg (siehe `public/assets/js/calc.js`).

**Entscheidungen (21.10.2026):** Bratwurst bleibt 100 g. Basis 250 g statt 300 g pro Erwachsenem. Kinder bekommen Bratwurst und Hähnchen.

## Food-Waste-Zähler

- Vergleichsbasis: Faustregel 400 g pro Erwachsenem, 150 g pro Kind (Vegetarier 75 % davon).
- Anzeige: „X kg **weniger eingekauft** als nach der 400-g-Faustregel“ + Euro-Betrag.
- **Nicht** „gerettet“, „klimafreundlich“, CO₂-Angaben o. ä. verwenden: Seit 27.09.2026 gelten verschärfte UWG-Regeln für Umweltaussagen (EmpCo-Richtlinie 2024/825). Jede Umweltaussage muss konkret und belegbar sein.
- Pflicht: eigene Seite „So rechnen wir“ mit offener Methode.
- Gemeinsamer Zähler: Vercel Function + Upstash Redis (Frankfurt), zählt nur anonyme Summen. Keine IP-Speicherung, keine Personendaten, einfache Sperre gegen Mehrfachzählung.
- Später optional: Reste-Feedback am Tag nach der Party (ohne Konto, Link mit Zufallskennung).
- Kontext: Private Haushalte in DE werfen 74,5 kg Lebensmittel pro Kopf und Jahr weg, 58 % aller Lebensmittelabfälle (BMLEH, Bezugsjahr 2022). Kooperationsidee: Aktionswoche „Zu gut für die Tonne!“.

## Corporate Identity (bestätigt)

| Token | Farbe | Verwendung |
| --- | --- | --- |
| Kohle | #171412 | Hintergrund dunkel, Text |
| Glut | #F2611D | Akzent, Zahlen, Buttons |
| Bernstein | #FFB547 | Claim, Highlights auf dunkel |
| Asche | #F4EEE6 | Hintergrund hell |
| Rauch | #6B625A | Sekundärtext |
| Kraut | #5A7D2A | Alles zu Resten / Food Waste / Veggie |

- Schriften: **Big Shoulders Display** (Überschriften, Zahlen, Wortmarke), **DM Sans** (Fließtext, UI), **Instrument Serif Italic** (Claim, Zitate).
- Wortmarke: „GLUT“ in Textfarbe + „MASS“ in Glut-Orange, Big Shoulders Display Black.
- Motiv: Glut-Kreis + Maßband (Lineal-Ticks in Glut-Orange).
- Tonalität: direkt wie an der Fleischtheke, Du-Form, konkrete Stückzahlen, kein Food-Porn.
- Hell- und Dunkelmodus unterstützen.

## Technische und rechtliche Leitplanken

- Statische Seite (HTML/CSS/JS), Rechnung komplett im Browser. Kein Framework nötig.
- **Keine Cookies, kein Tracking-Pixel, keine Einbindung externer Dienste.** Damit ist kein Consent-Banner nötig.
- **Schriften lokal hosten** (woff2 im Repo), nicht von Google Fonts laden (DSGVO, Abmahnrisiko). Der Prototyp lädt sie noch von Google – in der Produktivversion ersetzen.
- Besucherstatistik höchstens cookielos und EU-gehostet, oder Server-Logs.
- Datenschutzerklärung ist Pflicht (Server-Logs bei Vercel, Zähler-Summen bei Upstash; beide mit AV-Vertrag, Vercel DPF-zertifiziert, Upstash mit Standardvertragsklauseln). Keine Vercel Web Analytics / Speed Insights aktivieren, ohne die Datenschutzerklärung anzupassen. Impressum: als rein privates, werbefreies Projekt nach überwiegender Auffassung nicht zwingend; Kontaktmöglichkeit trotzdem angeben. Mit erster Monetarisierung wird Impressum Pflicht.
- **Keine Affiliate-Links, keine Werbung, kein Bezahlprodukt**, solange kein Gewerbe angemeldet ist. Start als privates Projekt ohne Gewinnerzielungsabsicht.
- Barrierearm bauen (Kontraste, Tastaturbedienung, Labels), auch wenn Kleinstunternehmen vom BFSG ausgenommen sind.
- Mobile first.
- Keine Inhalte, Daten oder Produkte von Marcs Arbeitgeber verwenden.

## Deployment

- Vercel-Projekt ist mit dem GitHub-Repo verbunden; jeder Push auf `main` wird automatisch veröffentlicht, Pull Requests bekommen Vorschau-Links.
- Domain bleibt bei Strato registriert. Im Strato-DNS zeigen nur der A-Record (glutmass.de) und der CNAME (www) auf Vercel; die genauen Werte stehen in Vercel unter Project → Settings → Domains. **MX-Records nicht anfassen**, sonst geht das Postfach kontakt@glutmass.de verloren.
- Zähler-Speicher: Upstash Redis über den Vercel Marketplace, Region Frankfurt (eu-central-1), mit dem Projekt verbunden. Die Integration setzt die Umgebungsvariablen selbst; nie Tokens im Code oder Chat.
- **Vercel Hobby ist nur für nicht kommerzielle, private Nutzung.** Vor dem ersten Affiliate-Link, Werbung oder Bezahlprodukt auf Vercel Pro wechseln (ca. 20 $/Monat) – gleichzeitig mit Gewerbeanmeldung und Impressum.

## Roadmap

- Nov–Dez 2026: MVP bauen (Rechner, Stücklogik, Teilen, Zähler, Datenschutz, „So rechnen wir“).
- Jan–Feb 2027: Inhalte (Garzeiten, ca. 10 Ratgeberseiten).
- Mär 2027: Launch-Kommunikation (Pinterest, Grillforen, Vereine). Ggf. Gewerbe anmelden und Nebentätigkeit anzeigen, bevor monetarisiert wird.
- Apr–Aug 2027: Grillsaison messen.
- Sep 2027: Go/No-Go. Annahmen: 5.000 Nutzer/Monat in der Saison, 2 % Klicks auf Partnerlinks, erste 50 € Provision, 1 t „weniger eingekauft“ laut Zähler.

## Spätere Ausbaustufen (nicht jetzt bauen)

Grillplaner + Garzeiten (Premium-PDF) → weitere Anlässe (Raclette, Fondue, Buffet, Hochzeit) → White-Label-Widget für Metzgereien und Hofläden → AT und CH.

## Erledigt

- 21.10.2026: erste produktive Version (Projektstruktur, Rechenmodul mit Tests, Zähler).
- 21.10.2026: Umstellung von Strato-Webspace/SFTP/PHP auf Vercel + Upstash.

## Offene To-dos für Marc

1. Auf vercel.com: Add New → Project → Repo `madeyouwin/glutmass` importieren (Framework: Other, keine Build-Einstellungen nötig, `vercel.json` regelt alles).
2. Im Vercel-Projekt unter Storage (Marketplace) „Upstash for Redis“ hinzufügen, kostenloser Tarif, Region Frankfurt, mit dem Projekt verbinden, danach einmal neu deployen.
3. Domain `glutmass.de` und `www.glutmass.de` im Vercel-Projekt hinzufügen und die angezeigten DNS-Werte im Strato-Kundenbereich eintragen (MX-Records unverändert lassen).
4. Postfach `kontakt@glutmass.de` bei Strato prüfen (Test-Mail).
5. Nach dem Go-live testen: Liste teilen → Zähler steigt; `https://glutmass.de/api/zaehler` liefert JSON.
