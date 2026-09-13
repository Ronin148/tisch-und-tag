# Tisch & Tag

Persönliches Rezeptbuch als deutschsprachige, mobile Web-App. Für Safari auf dem iPhone vorbereitet; auf dem Home-Bildschirm installierbar. Das Kochbuch startet leer. Ideen aus dem Web werden erst nach ausdrücklicher Auswahl übernommen.

## Funktionen

- **Meine Rezepte:** Fotos/Originalseiten und eigenes Rezeptbild speichern und anzeigen, Rezept per Link importieren, Text einfügen, Rezepte bearbeiten, Favoriten und frei editierbare Schlagwörter.
- **Entdecken:** 20 automatisiert aus dem deutschsprachigen Wikibooks-Kochbuch strukturierte Rezepte, separat vom persönlichen Buch; Filter wie Vegetarisch und Low Carb. Sechs eigene Beispielrezepte in einem separaten Bereich. Live-Suche über TheMealDB in englischer Sprache mit Originalbildern.
- **Bildübernahme:** Bilder werden beim Import heruntergeladen, komprimiert und als Bilddaten im Rezept gespeichert. Ein fehlgeschlagener Bilddownload wird angezeigt. Bilder bleiben beim Export und Wiederherstellen erhalten.
- **Fotoimport:** Bis zu sechs Seiten pro Rezept; JPG, PNG, WebP und HEIC. Texterkennung auf dem Gerät mit Tesseract und deutschem Sprachmodell. HEIC wird möglichst nativ, andernfalls lokal über heic2any umgewandelt. Originaldatei-Metadaten werden dabei nicht übernommen. Die erkannten Angaben bleiben vor dem Speichern bearbeitbar.
- **Wochenplan und Einkaufsliste:** Portionen ändern, Zutatenmengen zusammenführen, gleiche Maßeinheiten umrechnen, Einkäufe abhaken und eigene Artikel hinzufügen. Mengenbereiche bleiben als unbestimmte Angaben erhalten.
- **Sicherung:** IndexedDB auf dem jeweiligen Gerät, vollständiger JSON-Export/-Import. Ein Speicherfehler bleibt sichtbar und bietet die Sicherung der Eingaben an.
- **Optionaler Geräteabgleich:** Vorbereitete Supabase-Anmeldung und manueller Upload/Download des Kochbuchs mit Schutz gegen veraltete Überschreibungen. Ohne Konfiguration ausdrücklich als noch nicht eingerichtet angezeigt.

## Familienküche und mobile Nutzung

- Auf dem Telefon 17 px Fliesstext, 18 px Zutaten und Kochschritte, grössere Buttons, einspaltige Rezeptkarten und sicherer Abstand zur unteren Navigation. iPhone/Safari und Android/Chrome nutzen dieselbe Web-App.
- Saisonkalender für Deutschland mit getrennten Ernte- und Lagerzeiten, Monats- und Zutatenwahl und passenden Rezepten aus dem gescrapten Web-Katalog. Ungefähre Zeitfenster nach dem [Kalender der Verbraucherzentrale](https://www.verbraucherzentrale.de/sites/default/files/2023-01/saisonkalender_poster_a3.pdf).
- Drei Profile: Anne, Joel und Mathis. Eigene Tageskalorienziele, Vorlieben, ausgeschlossene Zutaten und Ernährungsformen. Keine vorgegebenen Kalorienziele; Vorschläge sind keine medizinische Beratung oder Allergenzertifizierung.
- Vorräte per Eingabe oder bis zu sechs Fotos. KI-Erkennung bleibt vor dem Speichern einzeln bearbeitbar; unsichere Lebensmittel sind zunächst abgewählt. Mengen/Frische werden nicht als sicher erkannt behauptet. Lokale Zutaten-Treffer und echte OpenRouter-Vorschläge werden getrennt bezeichnet.
- KI-Wochenvorschläge aus eigenen Rezepten, dem Web-Katalog, beiden oder neuen KI-Gerichten; sieben Abendessen oder sieben vollständige Tage. Vorschau vor dem Übernehmen, danach Speicherung ausgewählter neuer Rezepte samt Bild und Aktualisierung der Einkaufsliste.
- Meal Prep: Essens- und Kochtage, Portionen je Mahlzeit und Vorkochrunden mit Gesamtmenge. KI-Meal-Prep gruppiert wiederholte Gerichte in der Wochenhälfte. Die Einkaufsliste zählt die verzehrten Portionen genau einmal.
- Kochmodus mit einzelnen grossen Schritten, Zutaten nach Portionen, mehreren pausierbaren Timern und Screen Wake Lock, soweit unterstützt. Timer verwenden Endzeitpunkte und behalten beim Schrittwechsel ihre Restzeit; Töne bei Hintergrund/gesperrtem Telefon sind nicht garantiert. Sitzung und Timer werden im Browser-Tab wiederhergestellt.

## UX-Verbesserungen nach dem Handytest

- Kompakte Rezeptübersicht mit Suche, Foto/Link/Text und aufklappbaren Filtern. Rezeptnamen übernehmen wieder die grössere Überschriftenschrift. Touch-Navigation und mindestens 44 px hohe Filter bleiben im schmalen Querformat erhalten.
- Profilentwürfe bleiben beim Bereichswechsel erhalten, werden nach Möglichkeit im selben Browser-Tab zwischengespeichert und vor dem Schliessen gewarnt. Speichern und Verwerfen sind sichtbar. Änderungen auf einem anderen Gerät werden weiterhin auf Konflikte geprüft.
- Vorräte lassen sich bearbeiten. Die Einkaufsliste zeigt Wochenbedarf, abgezogenen Vorrat und Restmenge. Der Abzug lässt sich ausschalten. Er gilt für die ausgewählte Woche, reserviert keine Bestände über mehrere Wochen und verändert den Vorrat nicht; Verbrauch nach dem Kochen manuell anpassen.
- Vorratsabzug nur bei gleichem Lebensmittelnamen und passenden Einheiten; kg/g und l/ml werden umgerechnet. Unklare Mengen und vor dem benötigten Datum ablaufende Vorräte bleiben unberücksichtigt. Keine Umrechnung zwischen Packungen, Gewicht und Volumen ohne belastbare Angaben.
- Saison- und Vorratstreffer erkennen Lebensmittelwörter statt beliebiger Wortteile; Knoblauch/Bärlauch zählen nicht als Lauch. Optionale Alternativen zählen nicht als saisonale Hauptzutat.
- Importfehler bieten den direkten Wechsel zu Text oder Foto; der Quellenlink bleibt erhalten. OCR-Schreibweise „Fuer 4 Portionen“ wird als Metadatum erkannt.
- Familienverbindung ist direkt über die Einstellungen erreichbar; dort wird der tatsächliche Verbindungsstatus angezeigt.

## OpenRouter und gemeinsamer Geräteabgleich

Die private Einrichtungsseite verwendet einen einmaligen Link mit Token im URL-Fragment. Der Token wird aus der Adresszeile entfernt, sobald das Formular geladen ist. Der OpenRouter-Schlüssel wird über HTTPS geprüft und zusammen mit dem Familiencode mit AES-GCM verschlüsselt in einem privaten R2-Objekt gespeichert. Der separate Verschlüsselungsschlüssel und der Einrichtungs-Token sind Sites-Secrets. Keine Schlüssel in GitHub, Frontend-Bundles oder Kochbuchsicherungen.

Erforderliche Serverwerte: `TISCH_SETUP_TOKEN` (mindestens 16 zufällige Zeichen), `TISCH_CONFIG_ENCRYPTION_KEY` (64 Hexzeichen) und optional `OPENROUTER_MODEL` (Standard `openai/gpt-4.1-mini`). Für Tests und alternative Konfiguration können `OPENROUTER_API_KEY` und `TISCH_ACCESS_KEY` als Server-Secrets gesetzt werden. Die logische R2-Bindung ist `BUCKET`.

Auf jedem Gerät unter **Unsere Küche → Familie & KI** denselben Familiencode eingeben. Das komplette private Kochbuch inklusive Bildern, Profilen, Vorräten und Plan wird als R2-JSON-Snapshot gespeichert (15 MB Obergrenze für diese erste Familienversion). Online und bei geöffneter App erfolgt der Abgleich alle 15 Sekunden und beim Zurückkehren in die App. Geräte behalten eine lokale Offline-Kopie. ETags verhindern konkurrierende Überschreibungen; Änderungen auf beiden Geräten führen zu einer ausdrücklichen Auswahl samt Sicherungsmöglichkeit. Ein Familiencode gewährt allen drei Profilen Zugriff auf dasselbe Kochbuch, keine getrennten Benutzerrechte. Bei der ersten Verbindung mit vorhandenen Daten auf beiden Seiten werden diese nicht automatisch zusammengeführt.

OpenRouter erhält nur die Angaben für die jeweilige aktiv ausgelöste KI-Aktion. Provider ohne passende JSON-Schema-Unterstützung bzw. mit Datensammlung werden ausgeschlossen. Eigene Rezeptbilder werden bei der Planung nicht übertragen; Vorratsfotos nur bei der Fotoerkennung. Kosten richten sich nach dem OpenRouter-Konto. Private R2-Pfade werden niemals als öffentliche Assets angeboten. Das endgültige Testen mit einem echten API-Schlüssel erfordert die Einrichtung durch den Besitzer.

## Aktueller Stand und Grenzen

Die App ist über GitHub Pages und Sites veröffentlicht. Der Link-Import nutzt auf GitHub Pages den veröffentlichten Sites-Worker als Backend, weil GitHub Pages selbst keine Serverfunktion ausführt. Die Supabase-Online-Speicherung ist noch nicht eingerichtet. Persönliche Rezeptdaten sind niemals Bestandteil des Git-Repositorys.

Der Link-Import liest öffentliche Rezeptseiten aus, wenn sie strukturierte Schema.org-Rezeptdaten enthalten, und speichert ein öffentlich abrufbares Rezeptbild mit. Geschützte Seiten, Instagram-/TikTok-Videos und Seiten ohne strukturierte Rezeptdaten müssen weiterhin per Textimport oder Foto übernommen werden. Der mitgelieferte Scraper verarbeitet ausgewählte öffentliche Wikibooks-Seiten. Fotoerkennung von Vorräten und Wochenvorschläge nutzen OpenRouter nach der Einrichtung. Nährwerte aus KI sind Schätzungen; eine validierte Nährwertberechnung und Thermomix/Cookidoo bleiben spätere Ausbauschritte.

Tags sind redaktionelle oder persönliche Schlagwörter. „Low Carb“ ist keine berechnete Nährwertangabe. Fehlende Portionszahlen werden klar als vorläufig gekennzeichnet. Deutsche Katalogbilder sind Symbolbilder und als solche beschriftet. TheMealDB liefert englische Originaltexte und häufig keine Portionszahl oder Zeitangabe.

## Entwicklung

Voraussetzung: Node.js 24 und npm.

```sh
npm ci
npm run prepare:ocr
npm run dev
```

```sh
npm test
npm run build
```

`prepare:ocr` kopiert den Worker, WASM-Dateien und das Sprachmodell aus den fest versionierten npm-Paketen nach `public/ocr`. Diese Dateien sind nicht im Git-Repository, werden aber ausgeliefert. Die Texterkennung braucht beim ersten Aufruf einen Download. Die PWA hält App und Bilder lokal vor; OCR-Dateien werden bei Nutzung zwischengespeichert. Browser können ihren Speicher löschen: regelmäßige Sicherungen sind sinnvoll.

`node scripts/scrape-web.mjs` aktualisiert den deutschen Katalog. Die bisherigen Daten werden bei zu wenigen vollständigen Treffern nicht überschrieben. Änderungen vor Veröffentlichung prüfen; Zeit und Portionszahl werden nur aus entsprechenden Angaben übernommen.

## GitHub Pages

Nach Anlegen eines Repositorys die Quellen dorthin übertragen. Unter Settings → Pages die Quelle **GitHub Actions** wählen. `.github/workflows/pages.yml` prüft, baut und veröffentlicht bei Änderungen auf `main`. Die Basis-URL wird aus dem Repositorynamen gesetzt. Für eine eigene Domain oder ein Repository `username.github.io` die Basis-URL auf `/` anpassen.

Für einen lokalen Test des Unterpfads:

```sh
VITE_BASE_PATH=/tisch-und-tag/ npm run build
```

## Optionale Supabase-Einrichtung

Ein eigenes Supabase-Projekt verwenden. `database/schema.sql` erzeugt eine einzelne Tabelle mit RLS und Zugriff nur auf den eigenen angemeldeten Nutzer. Keine bestehenden App-Tabellen ändern.

1. Schema im neuen Projekt ausführen.
2. Eigenen Auth-Nutzer im Dashboard anlegen/einladen. Die App erlaubt keine öffentliche Selbstregistrierung (`shouldCreateUser: false`).
3. App-URL und erlaubte Redirect-URL unter Authentication konfigurieren.
4. `.env.example` nach `.env` kopieren; Projekt-URL und **publishable key** eintragen. Niemals Service-Role-/Secret-Schlüssel im Frontend oder Repository speichern.
5. Bei GitHub die entsprechenden `VITE_SUPABASE_*` Repository-Variablen hinterlegen und neu bauen.

Diese Startversion sichert bis zu 15 MB pro Kochbuch als privaten Datensatz. Für eine umfangreiche Sammlung sollten Bilder später in privaten Objektspeicher ausgelagert werden. Die Buttons „Hochladen“ und „Herunterladen“ sind ein manueller Abgleich, keine automatische Hintergrundsynchronisation.

## Quellen und Bildnachweise

- Rezepttexte in `src/web-catalog.json`: [Wikibooks-Kochbuch](https://de.wikibooks.org/wiki/Kochbuch), Wikibooks-Mitwirkende, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Jede Übernahme enthält den Seitenlink bzw. Permalink und Datum; die Versionsgeschichte der jeweiligen Quellseite nennt die Mitwirkenden. Die Texte wurden automatisch strukturiert, Schlagwörter und Symbolbilder ergänzt. Abgeleitete Rezepttexte stehen weiter unter CC BY-SA 4.0.
- Live-Rezepte/Bilder: [TheMealDB](https://www.themealdb.com/api.php). Die persönliche Testversion verwendet den dokumentierten Testschlüssel `1`. Für eine spätere öffentliche App-Store-Veröffentlichung ist ein Supporter-Schlüssel erforderlich. Verfügbarkeit und Vollständigkeit hängen von der Quelle ab.
- Lokale Symbolfotos: Unsplash, unter der [Unsplash-Lizenz](https://unsplash.com/license). Verwendete Bild-IDs: `photo-1512621776951-a57141f2eefd` (Bowl), `photo-1473093295043-cdd812d0e601` (Pasta), `photo-1547592180-85f173990554` (Salat), `photo-1517673132405-a56a62b18caf` (Porridge), `photo-1540189549336-e6e99c3679fe` (Gemüse), `photo-1603894584373-5ac82b2ae398` (Curry). Die Bilder stellen nicht die exakten importierten Gerichte dar.
- Schriftarten: DM Sans und Lora über lokale Fontsource-Pakete. Icons: Lucide.

## Prüfung

Automatisierte Prüfungen decken Rezept- und Mengenimport, Portionsberechnung, Wochenabgrenzung, Sicherungsvalidierung, Bildübernahme, Link-Import, getrennten Katalog, fehlerhafte Web-Daten sowie echte PostgreSQL-RLS-Regeln in PGlite ab. Zusätzlich Produktions-Build und GitHub-Unterpfad prüfen. Ein Test an einem physischen iPhone ist noch offen. Die Supabase-Anbindung wurde bisher nur lokal auf Datenbankebene, nicht mit einem eingerichteten Cloud-Projekt geprüft.

Neue Prüfungen decken Familienzugriff, verschlüsselte einmalige Einrichtung, konkurrierende Speicherungen, OpenRouter-Fehler, erfundene Rezept-IDs, Profile, Vorräte, Meal-Prep-Mengen, Saisonzuordnung und Timer nach einer Hintergrundpause ab. Ein Test auf physischen iPhone-/Android-Geräten ist noch offen.
