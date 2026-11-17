import { DATA_TABLES, type PlanerDB } from '../db/db';

/** Zählt alle als Testdaten markierten Einträge. */
export async function countDemo(d: PlanerDB): Promise<number> {
  let n = 0;
  for (const t of DATA_TABLES) n += await d.table(t).filter((x) => x.isDemo === true).count();
  return n;
}

/** Löscht nur Testdaten. Eigene Einträge (ohne isDemo) bleiben unberührt. */
export async function clearDemo(d: PlanerDB): Promise<number> {
  let removed = 0;
  await d.transaction('rw', DATA_TABLES.map((t) => d.table(t)), async () => {
    for (const t of DATA_TABLES) removed += await d.table(t).filter((x) => x.isDemo === true).delete();
  });
  return removed;
}
