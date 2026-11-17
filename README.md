# Planer-App

Persönliche Planer-App als PWA fürs iPhone: Kalender, To-dos, Sport, Ziele und Statistik.
Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Kein Konto, kein Sync, Backup als JSON-Datei.

## Entwicklung

```bash
npm install
npm run dev        # lokaler Server
npm test           # Tests (Vitest)
npm run build      # Typprüfung + Produktions-Build nach dist/
```

Die App nutzt relative Pfade und läuft daher unter https://skhn74.github.io/Planer-App/ wie auch lokal.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/db` | Datenmodell (`types.ts`) und Dexie-Datenbank (`db.ts`) |
| `src/lib` | Datumsfunktionen (Woche ab Montag, ISO-KW), Testdaten, Backup |
| `src/screens` | Heute, Kalender, Sport, Ziele, Statistik, Einstellungen |
| `src/components` | Tab-Leiste, Icons, Testdaten-Hinweis |

Testdaten tragen `isDemo: true` und lassen sich in den Einstellungen gesammelt löschen.

## Veröffentlichung

Jeder Push auf `main` testet, baut und veröffentlicht die App über GitHub Pages
(einmalig: Repository → Settings → Pages → Source: „GitHub Actions“).
