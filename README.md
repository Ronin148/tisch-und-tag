# Tisch & Tag

Persönliches Rezeptbuch als deutschsprachige, mobile Web-App. Für Safari auf dem iPhone vorbereitet; auf dem Home-Bildschirm installierbar. Das Kochbuch startet leer. Ideen aus dem Web werden erst nach ausdrücklicher Auswahl übernommen.

## Funktionen

- **Meine Rezepte:** Fotos/Originalseiten und eigenes Rezeptbild speichern und anzeigen, Text einfügen, Rezepte bearbeiten, Favoriten und frei editierbare Schlagwörter.
- **Entdecken:** 15 automatisiert aus dem deutschsprachigen Wikibooks-Kochbuch strukturierte Rezepte, separat vom persönlichen Buch; Filter wie Vegetarisch und Low Carb. Sechs eigene Beispielrezepte in einem separaten Bereich. Live-Suche über TheMealDB in englischer Sprache mit Originalbildern.
- **Bildübernahme:** Bilder werden beim Import heruntergeladen, komprimiert und als Bilddaten im Rezept gespeichert. Ein fehlgeschlagener Bilddownload wird angezeigt. Bilder bleiben beim Export und Wiederherstellen erhalten.
- **Fotoimport:** Bis zu sechs Seiten pro Rezept; JPG, PNG, WebP und HEIC. Texterkennung auf dem Gerät mit Tesseract und deutschem Sprachmodell. HEIC wird möglichst nativ, andernfalls lokal über heic2any umgewandelt. Originaldatei-Metadaten werden dabei nicht übernommen. Die erkannten Angaben bleiben vor dem Speichern bearbeitbar.
- **Wochenplan und Einkaufsliste:** Portionen ändern, Zutatenmengen zusammenführen, gleiche Maßeinheiten umrechnen, Einkäufe abhaken und eigene Artikel hinzufügen. Mengenbereiche bleiben als unbestimmte Angaben erhalten.
- **Sicherung:** IndexedDB auf dem jeweiligen Gerät, vollständiger JSON-Export/-Import. Ein Speicherfehler bleibt sichtbar und bietet die Sicherung der Eingaben an.
- **Optionaler Geräteabgleich:** Vorbereitete Supabase-Anmeldung und manueller Upload/Download des Kochbuchs mit Schutz gegen veraltete Überschreibungen. Ohne Konfiguration ausdrücklich als noch nicht eingerichtet angezeigt.

## Aktueller Stand und Grenzen

Die Veröffentlichung über GitHub Pages ist vorbereitet. Die Repository-Erstellung in GitHub scheiterte am 13.09.2026 mit „Repository creation failed“; deshalb wird eine private Sites-Vorschau vorbereitet. Das eigene GitHub-Repository und die Supabase-Online-Speicherung sind noch nicht eingerichtet. Persönliche Rezeptdaten sind niemals Bestandteil des Git-Repositorys.

Die erste Version importiert kopierten Text von Webseiten, Social-Media-Beschreibungen oder KI-Ausgaben. Sie extrahiert keine Rezepte automatisch aus beliebigen URLs, Instagram-/TikTok-Videos oder geschützten Seiten. Der mitgelieferte Scraper verarbeitet ausgewählte öffentliche Wikibooks-Seiten. Fridge-/Vorratsfoto-Erkennung, automatische Wochenvorschläge, Nährwertberechnung und Thermomix/Cookidoo bleiben spätere Ausbauschritte.

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

36 automatisierte Prüfungen decken Rezept- und Mengenimport, Portionsberechnung, Wochenabgrenzung, Sicherungsvalidierung, Bildübernahme, getrennten Katalog, fehlerhafte Web-Daten sowie echte PostgreSQL-RLS-Regeln in PGlite ab. Zusätzlich Produktions-Build und GitHub-Unterpfad prüfen. Ein Test an einem physischen iPhone ist noch offen. Die Supabase-Anbindung wurde bisher nur lokal auf Datenbankebene, nicht mit einem eingerichteten Cloud-Projekt geprüft.
