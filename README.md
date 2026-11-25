# Memory – Was tut mir gut?

Persönliches Ursache-Wirkungs-Tagebuch: Jeden Morgen den Vortag erfassen (Essen, Schlaf, Sport, Stress,
Meditation, Getränke …) und wie man sich nach dem Aufstehen fühlt. Später zeigt die Statistik, welche
Lebensmittel und Gewohnheiten mit besserem oder schlechterem Befinden einhergehen.

Alle Daten bleiben **lokal auf dem Gerät** (IndexedDB). Es gibt keinen Server und kein Konto.

## Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS v4 + shadcn-vue (reka-ui)
- Dexie.js (IndexedDB)
- vite-plugin-pwa (offline-fähig, installierbar)

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173 (auch im WLAN erreichbar)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal testen
```

## Aufs iPhone bringen

Der Service Worker (Offline-Modus) braucht HTTPS. Deshalb wird die App einmal statisch gehostet:

1. `npm run build` ausführen und den Ordner `dist/` hochladen, z. B. auf **Netlify Drop**
   (app.netlify.com/drop, per Drag & Drop), **Cloudflare Pages** oder **GitHub Pages**.
2. Die URL am iPhone in **Safari** öffnen.
3. Teilen → **„Zum Home-Bildschirm“**.
4. Die App ab jetzt nur noch über das Icon öffnen. So läuft sie offline, und iOS löscht die Daten nicht automatisch.

Nur der App-Code liegt beim Hoster, die Einträge verlassen das iPhone nie.
**Wichtig:** Unter *Daten → Backup* regelmäßig exportieren („In Dateien sichern“ → iCloud Drive).

## Datenmodell

| Tabelle      | Inhalt |
|--------------|--------|
| `days`       | ein Eintrag pro Tag: Mahlzeiten, Aktivitäten, Schlaf, Stress, Meditation, Getränke, Bildschirmzeit, Zeit draußen, letzte Mahlzeit, Befinden (Körper/Mental), Notiz |
| `foods`      | wiederverwendbare Lebensmittel/Gerichte mit Tags |
| `activities` | wiederverwendbare Aktivitäten |
| `meta`       | z. B. Zeitpunkt des letzten Backups |

`date` ist der **beschriebene Tag** (meist gestern). Schlaf ist die Nacht danach, das Befinden der Morgen danach.

## Roadmap

- [x] Phase 1: Setup, Datenbank, PWA
- [x] Phase 2: Tageseingabe mit Vorschlägen, Tippfehler-Suche, Dubletten-Warnung, „Wie Vortag“
- [x] Phase 3: Verlauf, Lebensmittel/Aktivitäten verwalten (umbenennen, Tags, zusammenführen), Backup
- [ ] Phase 4: Statistik (Mit/Ohne-Vergleich pro Lebensmittel/Tag/Gewohnheit, Zeitversatz, Korrelationen, Verlauf)
- [ ] Phase 5: Feinschliff (Erinnerungen, Regression, ggf. Import von Gesundheitsdaten)
