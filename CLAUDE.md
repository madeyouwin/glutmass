# GLUTMASS – Projektbriefing

Online-Grillgut-Rechner für den deutschsprachigen Raum mit Food-Waste-Fokus.
Domain: **glutmass.de** (registriert bei Strato, Webhosting bei Strato).
Inhaber: Marc Stephan, Saarbrücken. Privates Nebenprojekt, Kommunikation auf Deutsch, Du-Form.

## Idee in einem Satz

Der Rechner sagt in **Stückzahlen** (nicht Gramm), was man für eine Grillparty kaufen muss – so, wie man an der Fleischtheke bestellt – und zeigt, wie viel weniger man einkauft als nach der üblichen Faustregel. Claim: **„Richtig rechnen. Satt grillen.“**

## Positionierung (Wettbewerbsrecherche Okt. 2026)

- Grillfürst-Magazin: starker Rechner, aber Vehikel für den eigenen Grill-Shop.
- MiniWebtool: detailliert, aber aus dem US-Markt übersetzt (Pfund).
- Spitzenfleisch.de, Asado Grill (AT), Grübeln statt kübeln (AT): grob oder manuelle Mengen.
- Lücke: DACH-nativ + rechnerisch tief + Metzger-Logik (Stückgewichte, Kinder, Veggie) + Food Waste.

## Aktueller Stand

- `prototype/index.html`: klickbarer Prototyp (eine Datei, Vanilla JS). Rechenlogik, Werkstatt zum Ändern der Annahmen, Teilen per Kopieren/WhatsApp.
- Noch nicht gebaut: echte Seitenstruktur, gemeinsamer Zähler, Rechtstexte, Deployment.

## Rechenlogik (Prototyp-Standardwerte, noch nicht final bestätigt)

- Fleisch pro Erwachsenem: 300 g roh (normaler Hunger, Party, normale Beilagen).
- Faktoren: Hunger 0,8 / 1 / 1,25 · Anlass 0,85 / 1 / 1,3 · Beilagen wenig 1,12 / normal 1 / viel 0,85.
- Kinder (bis 12): 120 g, werden komplett als Bratwurst gerechnet.
- Vegetarier: 250 g Grillkäse + Gemüsespieß (50/50).
- Stückgewichte: Bratwurst 100 g, Nackensteak 200 g, Hähnchenspieß 150 g, Rumpsteak 250 g, Bauchscheiben 120 g, Grillkäse 100 g, Gemüsespieß 150 g.
- Fleischmix nach Anteilen (Bratwurst 35, Nacken 30, Hähnchen 20, Rumpsteak 15, Bauch 15), normalisiert auf die gewählten Artikel.
- Stückzahl = gerundet (Gewicht / Stückgewicht), mindestens 1.
- Beilagen: 1,5 Brötchen/Erw., 1/Kind, Salat 150 g p. P., Saucen 50 ml p. P.
- Preise sind Richtwerte in €/kg (siehe Prototyp).

**Offene fachliche Fragen an Marc (Fleischbranche, er kennt die Theke):**
1. Bratwurst eher 120–150 g statt 100 g?
2. 300 g Fleisch pro Erwachsenem realistisch?
3. Kinder nur Bratwurst, oder auch Hähnchen?

## Food-Waste-Zähler

- Vergleichsbasis: Faustregel 400 g pro Erwachsenem, 150 g pro Kind (Vegetarier 75 % davon).
- Anzeige: „X kg **weniger eingekauft** als nach der 400-g-Faustregel“ + Euro-Betrag.
- **Nicht** „gerettet“, „klimafreundlich“, CO₂-Angaben o. ä. verwenden: Seit 27.09.2026 gelten verschärfte UWG-Regeln für Umweltaussagen (EmpCo-Richtlinie 2024/825). Jede Umweltaussage muss konkret und belegbar sein.
- Pflicht: eigene Seite „So rechnen wir“ mit offener Methode.
- Gemeinsamer Zähler: winziges PHP-Skript auf Strato, das nur eine anonyme Summe hochzählt. Keine IP-Speicherung, keine Personendaten, einfache Sperre gegen Mehrfachzählung.
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
- Datenschutzerklärung ist Pflicht (Server-Logs bei Strato). Impressum: als rein privates, werbefreies Projekt nach überwiegender Auffassung nicht zwingend; Kontaktmöglichkeit trotzdem angeben. Mit erster Monetarisierung wird Impressum Pflicht.
- **Keine Affiliate-Links, keine Werbung, kein Bezahlprodukt**, solange kein Gewerbe angemeldet ist. Start als privates Projekt ohne Gewinnerzielungsabsicht.
- Barrierearm bauen (Kontraste, Tastaturbedienung, Labels), auch wenn Kleinstunternehmen vom BFSG ausgenommen sind.
- Mobile first.
- Keine Inhalte, Daten oder Produkte von Marcs Arbeitgeber verwenden.

## Deployment-Plan

- GitHub Actions lädt bei Push auf `main` per SFTP auf den Strato-Webspace.
- SFTP-Zugangsdaten trägt Marc **selbst** als GitHub-Secrets ein (z. B. `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_PATH`). Niemals Zugangsdaten im Code oder im Chat.
- Bis zum öffentlichen Start reicht eine schlichte Seite; Strato-Paket muss SFTP unterstützen (von Marc zu prüfen).

## Roadmap

- Nov–Dez 2026: MVP bauen (Rechner, Stücklogik, Teilen, Zähler, Datenschutz, „So rechnen wir“).
- Jan–Feb 2027: Inhalte (Garzeiten, ca. 10 Ratgeberseiten).
- Mär 2027: Launch-Kommunikation (Pinterest, Grillforen, Vereine). Ggf. Gewerbe anmelden und Nebentätigkeit anzeigen, bevor monetarisiert wird.
- Apr–Aug 2027: Grillsaison messen.
- Sep 2027: Go/No-Go. Annahmen: 5.000 Nutzer/Monat in der Saison, 2 % Klicks auf Partnerlinks, erste 50 € Provision, 1 t „weniger eingekauft“ laut Zähler.

## Spätere Ausbaustufen (nicht jetzt bauen)

Grillplaner + Garzeiten (Premium-PDF) → weitere Anlässe (Raclette, Fondue, Buffet, Hochzeit) → White-Label-Widget für Metzgereien und Hofläden → AT und CH.

## Nächste Aufgabe für Claude Code

Aus `prototype/index.html` die erste produktive Version bauen:
1. Projektstruktur: `public/` mit `index.html`, `so-rechnen-wir.html`, `datenschutz.html`, ausgelagertem CSS/JS, lokalen Schriften.
2. Rechenlogik in ein eigenes Modul mit kleinen Tests.
3. PHP-Endpunkt für den gemeinsamen Zähler (anonyme Summe, Datei-basiert).
4. GitHub-Action für SFTP-Deployment (Secrets-Platzhalter, Marc trägt Werte ein).
5. Vor dem Bauen die drei offenen fachlichen Fragen mit Marc klären.
