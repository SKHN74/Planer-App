import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { countDemo } from '../lib/demo';

/** Hinweis, solange Testdaten geladen sind. */
export function DemoBanner() {
  const n = useLiveQuery(() => countDemo(db), [], 0);
  if (!n) return null;
  return (
    <div className="banner" role="status">
      <span><strong>Testdaten aktiv.</strong> Alles mit TEST ist ein Beispiel.</span>
      <a href="#/einstellungen">Löschen</a>
    </div>
  );
}
