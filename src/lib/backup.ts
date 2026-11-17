import { DATA_TABLES, SCHEMA_VERSION, type PlanerDB } from '../db/db';

export interface BackupFile {
  app: 'planer-app';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
  settings?: unknown;
}

export async function createBackup(d: PlanerDB): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const t of DATA_TABLES) tables[t] = await d.table(t).toArray();
  return { app: 'planer-app', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables, settings: await d.settings.get('main') };
}

export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges Backup (kein JSON).');
  }
  const b = data as Partial<BackupFile>;
  if (b.app !== 'planer-app' || typeof b.schemaVersion !== 'number' || typeof b.tables !== 'object' || b.tables === null) {
    throw new Error('Die Datei ist kein Backup der Planer-App.');
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new Error('Das Backup stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.');
  }
  return b as BackupFile;
}

/** Ersetzt alle Daten durch den Inhalt des Backups. */
export async function restoreBackup(d: PlanerDB, b: BackupFile): Promise<void> {
  await d.transaction('rw', [...DATA_TABLES.map((t) => d.table(t)), d.settings], async () => {
    for (const t of DATA_TABLES) {
      await d.table(t).clear();
      const rows = b.tables[t];
      if (Array.isArray(rows) && rows.length) await d.table(t).bulkAdd(rows);
    }
    if (b.settings && typeof b.settings === 'object') await d.settings.put({ ...(b.settings as object), id: 'main' } as never);
  });
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `planer-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}
