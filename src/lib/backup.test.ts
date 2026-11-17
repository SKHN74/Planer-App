import { describe, expect, it } from 'vitest';
import { PlanerDB, SCHEMA_VERSION } from '../db/db';
import { backupFileName, createBackup, parseBackup, restoreBackup } from './backup';

const ts = '2026-11-17T10:00:00.000Z';

describe('Backup', () => {
  it('Export und Import ergeben dieselben Daten', async () => {
    const a = new PlanerDB('test-backup-a-' + Math.random());
    await a.todos.add({ title: 'Steuer', priority: 1, createdAt: ts, updatedAt: ts });
    await a.workouts.add({ sportTypeId: 1, date: '2026-11-16', durationMin: 55, createdAt: ts, updatedAt: ts });
    await a.settings.put({ id: 'main', theme: 'dunkel', inAppHints: false });
    const file = JSON.stringify(await createBackup(a));

    const b = new PlanerDB('test-backup-b-' + Math.random());
    await b.todos.add({ title: 'wird ersetzt', priority: 3, createdAt: ts, updatedAt: ts });
    await restoreBackup(b, parseBackup(file));
    expect((await b.todos.toArray()).map((x) => x.title)).toEqual(['Steuer']);
    expect(await b.workouts.count()).toBe(1);
    expect((await b.settings.get('main'))?.theme).toBe('dunkel');
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseBackup('kein json')).toThrow(/kein gültiges Backup/);
    expect(() => parseBackup('{"foo":1}')).toThrow(/kein Backup der Planer-App/);
    expect(() => parseBackup(JSON.stringify({ app: 'planer-app', schemaVersion: SCHEMA_VERSION + 1, tables: {} }))).toThrow(/neueren App-Version/);
  });

  it('Dateiname mit Datum', () => {
    expect(backupFileName(new Date(2026, 10, 17))).toBe('planer-backup-2026-11-17.json');
  });
});
