# Tisch & Tag: Funktionsprüfung und UX-Test

Stand: 13. September 2026 · geprüfter Code: `89ebdb33e8ec1292f126bd89ac78fb7204bdf6ea`

Die Grundabläufe funktionieren. Für den Alltag haben zuverlässiges Speichern, ein kürzerer Einstieg auf dem Handy und der Abgleich zwischen Vorrat und Einkauf den höchsten Nutzen. Mehr Rezeptquellen und ein flexibler Wochenplan folgen danach.

## Was tatsächlich geprüft wurde

Browserprüfung mit 390 × 844, 360 × 800 und 320 × 568 Pixeln, zusätzlich Querformat 844 × 390 und Desktop 1280 × 800. Das sind Ansichten im eingebauten Browser, keine Tests auf einem physischen iPhone oder Android-Gerät und keine vollständige Prüfung mit VoiceOver/TalkBack.

Schreibende Tests liefen in einer getrennten lokalen App auf Port 5174 mit künstlichen Rezepten und einem mitgelieferten Bild. Auf der veröffentlichten App wurde das angebotene Update aktiviert und ein öffentlicher Rezeptlink eingelesen, ohne ihn zu speichern. Keine Familienrezepte oder Zugangsdaten wurden geändert. Ergänzend wurden der Quellcode geprüft und alle 58 bestehenden Tests erfolgreich ausgeführt.

| Ablauf | Beobachtetes Ergebnis |
| --- | --- |
| Rezepttext einfügen | Titel, zwei Portionen, 20 Minuten, drei Zutaten und drei Schritte korrekt zugeordnet. |
| Bild ergänzen und speichern | Bild sichtbar; Rezept und Bild nach Neuladen weiterhin vorhanden. |
| Foto mit Texterkennung | Klare Testseite erkannt; Titel und Zutaten richtig. Die Zeile „Fuer 2 Portionen“ wurde zusätzlich als Kochschritt übernommen. Keine Aussage zu schrägen, mehrspaltigen Magazinseiten. |
| Portionen ändern | Von zwei auf drei: 200 g Reis → 300 g, zwei Paprika → drei, 1 EL Öl → 1,5 EL. |
| Kochmodus und Timer | Schrittwechsel und automatisch vorgeschlagene Zeit funktionieren; ein Sechs-Sekunden-Timer zeigt „Zeit abgelaufen“. Ton, Vibration und Sperrbildschirm nicht auf echten Geräten geprüft. |
| Meal Prep | Zwei Tage mit je drei Portionen ergeben sechs Portionen und insgesamt 600 g Reis, sechs Paprika, 3 EL Öl. |
| Einkauf abhaken | Abgehakte Paprika bleiben nach Bereichswechsel erledigt. |
| Vorrat erfassen | 500 g Reis manuell gespeichert; eigenes Rezept als passender Treffer angezeigt. |
| Web-Rezepte auswählen | Nur das ausgewählte Ratatouille wird ins Testkochbuch übernommen; danach Kennzeichnung „Im Kochbuch“. |
| Live-Websuche | „curry“ liefert Rezepte mit Bildern von TheMealDB, in englischer Sprache. |
| Profil speichern | Explizit gespeicherte Vorliebe bleibt beim Bereichswechsel erhalten; ungespeicherte Änderung geht verloren. |
| Linkimport live | [Getesteter Link](https://www.bbcgoodfoodme.com/recipes/easy-pancakes/): App meldet, dass keine strukturierten Rezeptdaten erkannt wurden. Der Editor bleibt bedienbar. Das belegt eine Importgrenze für diesen Link, keinen generellen Ausfall aller Linkimporte. |

## Priorisierte Befunde

### 1. Profiländerungen gehen ohne Hinweis verloren — hoch

**Nachgestellt:** Küche → Profile → Anne → Vorliebe eingeben → Vorräte → Profile. Das Feld ist wieder leer. Der Speichern-Knopf steht weit unten.

**Vorschlag:** Entwürfe beim Bereichswechsel erhalten und entweder automatisch speichern oder beim Verlassen sichtbar „Speichern / Verwerfen“ anbieten. Den Speicherstatus direkt am Profil anzeigen.

**Abnahme:** Dieselbe Folge darf keine Eingabe still verwerfen; Fehlermeldungen beim Speichern müssen erhalten bleiben. Ursache: Profilentwurf lebt nur in der unmontierten Komponente, siehe `src/Profiles.tsx` und `src/Household.tsx`.

### 2. Vorräte werden nicht von der Einkaufsliste abgezogen — hoch

**Nachgestellt:** Für den Plan werden 600 g Reis benötigt. Trotz eingetragener 500 g Reis zeigt die Einkaufsliste weiterhin 600 g als offen. Der aktuelle Hinweis fordert zum manuellen Abhaken auf; eine fehlende Teilmenge lässt sich damit nicht darstellen.

**Vorschlag:** Mengen und Einheiten strukturiert speichern; „Benötigt 600 g · vorhanden 500 g · kaufen 100 g“. Vorhandene Vorräte bearbeitbar machen und deren Verwendung bestätigen lassen. Grundlage: `src/domain.ts:63` und `src/kitchen.ts`.

### 3. Rezepte liegen auf dem Handy zu weit unten — hoch

**Gemessen bei 390 × 844:** Erste eigene Rezeptkarte beginnt bei etwa 920 px; erste Karte unter Entdecken bei etwa 843 px. Die untere Navigation beansprucht zusätzlich Bildschirmhöhe. Der erste Bildschirm zeigt keine Rezeptkarte.

**Vorschlag:** Den grossen Begrüssungsblock nach dem ersten Rezept durch eine kurze Zeile ersetzen. Suche und „+ Rezept“ nach oben, Filter hinter „Filter“ zusammenfassen. Bei Entdecken drei häufige Filter zeigen, den Rest aufklappbar machen.

**Abnahme:** Bei 390 × 844 sind Suche und mindestens eine Rezeptkarte ohne Scrollen sichtbar. [Screenshot Entdecken](entdecken-iphone-390.png)

### 4. Querformat verwendet wieder kleine Desktop-Bedienelemente — mittel

**Nachgestellt:** Bei 844 × 390 erscheint die Seitenleiste; Profilfilter sind nur ungefähr 31 px hoch. Im Hochformat greifen grössere Schaltflächen. Bei 320 px wurden in der geprüften Profilansicht keine horizontal abgeschnittenen Formularelemente gemessen.

**Vorschlag:** Touch-Bedienung und geringe Bildschirmhöhe bei den Umbrüchen berücksichtigen. Die grossen Tippflächen auch im Querformat erhalten. [Screenshot Querformat](profile-querformat-844.png)

### 5. Saisonfilter verwechselt Zutaten — mittel

**Nachgestellt:** September → Lauch schlägt Guacamole vor. Das Rezept enthält als Alternative Bärlauch, aber keinen Lauch. Der Filter sucht einfache Wortteile. Dadurch kann auch Knoblauch als Lauch zählen. Ein Spargelgericht wird bereits wegen enthaltenem Spinat als Septembertreffer geführt.

**Vorschlag:** Lebensmittel mit eindeutigen Namen und Synonymen zuordnen, alternative Zutaten getrennt behandeln und saisonale Hauptzutaten höher gewichten. `src/seasons.ts:37`, `src/SeasonCalendar.tsx:11`.

### 6. Import endet zu leicht bei einer Fehlermeldung — mittel

Der getestete Link wird nicht eingelesen. Foto/Text sind zwar oben als Tabs vorhanden, im Fehlerzustand fehlt jedoch ein direkter nächster Schritt.

**Vorschlag:** Direkt unter der Meldung „Rezepttext einfügen“ und „Foto verwenden“ anbieten; Link als Quelle erhalten. Später eine Vorschau mit optionaler KI-Strukturierung ergänzen. Bei Fotos Zuschneiden/Drehen, bessere Erkennung von Spalten und ein klarer Vergleich zwischen Scan und Ergebnis. [Screenshot Linkimport](linkimport-fehler-390.png)

### 7. Familienverbindung ist schwer auffindbar — mittel

Das Einstellungssymbol öffnet „Sicherung und Geräte“, verweist aber für die Verbindung weiter auf Küche → Familie & KI. Dort wird auf einen privaten Einrichtungslink aus dem Chat verwiesen. Der Kopfbereich am Desktop zeigt weiterhin pauschal „Auf diesem Gerät“; der Verbindungszustand wird dort nicht abgebildet.

**Vorschlag:** Ein gemeinsamer Einrichtungsbereich mit „Verbunden / Nicht verbunden / Abgleich nötig“, direkter Hilfe und kurzer Anleitung für das zweite Handy. OpenRouter-Verbindung, Familiencode und Sicherungen an einer Stelle verwalten.

### 8. Timer und Navigation brauchen mehr Kontinuität — mittel, Quellcodebefund

Timer werden beim Verlassen des Kochmodus dort nicht weiter überwacht. Die Restzeit wird beim erneuten Öffnen wiederhergestellt; eine permanente Timeranzeige ausserhalb des Kochmodus fehlt. App-Bereiche und Rezepte haben keine eigene Navigation über URLs; ein Neuladen startet bei „Rezepte“.

**Vorschlag:** Laufende Timer appweit sichtbar halten, beim Schliessen darauf hinweisen und den zuletzt geöffneten Bereich wiederherstellen. Zurück-Geste und Rezeptlinks unterstützen. `src/CookingMode.tsx`, `src/App.tsx:27` und `src/App.tsx:58`.

## Welche Funktionen noch fehlen oder nur teilweise vorhanden sind

| Priorität | Funktion | Stand und sinnvoller nächster Schritt |
| --- | --- | --- |
| Zuerst | Gemeinsame Nutzung zuverlässig abschliessen | Verbindung ist implementiert. Echte OpenRouter-Aufrufe und Abgleich zwischen zwei Geräten wurden in diesem UX-Test nicht verifiziert. Gleichzeitige Änderungen, Offline-Rückkehr und Bilderübertragung gezielt prüfen. |
| Zuerst | Vorrat → Einkauf → Verbrauch | Mengenabzug, Bearbeiten von Vorräten und Verbrauch beim Kochen fehlen. Die Basis oben ergänzen. |
| Danach | Wochenplan gezielt anpassen | Einzelnes Gericht austauschen, verschieben, Tage sperren, Personen pro Mahlzeit sowie Mittag-/Abendessen manuell wählen. Bisher ist Meal Prep auf Abendessen festgelegt; KI-Vorschläge werden als ganzer Plan übernommen. |
| Danach | Breitere deutsche Rezeptsuche | Deutscher Katalog enthält 20 eingelesene Wikibooks-Rezepte, Live-Suche ist englisch. Mehr Quellen, deutsche Suche und optionale Übersetzung ergänzen; Web-Auswahl weiterhin vom Kochbuch trennen. |
| Danach | Unterschiedliche Portionen pro Person | Profile und Kalorienziele existieren, die Planung vergibt aber dieselbe Portionsgrösse an alle ausgewählten Personen. Individuelle Anteile und nachvollziehbare Tageswerte fehlen. Kalorien sind bisher manuelle Angaben oder KI-Schätzungen. |
| Danach | Meal Prep bis zum Verzehr | „Gekocht“, verfügbare Portionen, Kühlschrank/Gefrierfach, Verzehr- und Auftauftermine fehlen. Kochdatum, Mahlzeit und Einkauf auch über Wochengrenzen zusammenführen. |
| Danach | Viele Fotos dauerhaft verwalten | Der gemeinsame Stand inklusive Bildern ist derzeit auf 15 MB begrenzt. Für die grosse Magazinsammlung Bilder separat speichern, Vorschaubilder verwenden und nur Änderungen übertragen. Quellcode: `src/family-server.ts:55`. |
| Später | Einfaches Teilen vom Handy | Direkt aus dem Teilen-Menü einen Link/Text an die App übergeben. Automatischer Import aus Instagram-/TikTok-Videos besteht bisher nicht. |
| Später | Wiederfinden und Feedback | Eigene Notizen, Bewertung, „Schon gekocht“, Sammlungen und Dublettenhinweise. |
| Später | OpenRouter-Verwaltung | Schlüsselwechsel, Wiederherstellung des Familienzugangs und eine Kosten-/Nutzungsübersicht fehlen. |
| Ganz zuletzt | Thermomix/Cookidoo | Noch keine Anbindung. Eine spätere Umsetzung hängt von den verfügbaren offiziellen Schnittstellen ab; hier nicht neu geprüft. |

## Empfohlene nächste Arbeitsrunde

1. Profilentwürfe sichern, Saisonzuordnung korrigieren, mobilen Einstieg verkürzen und Querformat verbessern.
2. Familienverbindung mit zwei echten Geräten und echtem KI-Aufruf abnehmen.
3. Vorratsmengen mit Einkauf verbinden und Mahlzeiten im Plan einfach austauschbar machen.
4. Danach Rezeptquellen, Fotospeicherung und Meal-Prep-Verbrauch ausbauen.

Auf echten Handys bleiben Kamera/HEIC, Tastatur und Dialoge, Installation auf dem Startbildschirm, Offline-Start sowie Timer bei gesperrtem Bildschirm zu prüfen. Der Testbericht ist eine Bewertung mit reproduzierbaren Befunden; die vorgeschlagenen Änderungen wurden damit noch nicht umgesetzt.
