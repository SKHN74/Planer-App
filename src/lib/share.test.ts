import { describe, expect, it } from 'vitest';
import { PlanerDB } from '../db/db';
import { ensureDefaults, WINTER_ARC } from './programs';
import { exportProgram, importProgram, parseProgram, programFileName } from './share';

describe('Programme teilen', () => {
  it('exportiert ohne IDs und Einträge und importiert in eine andere Installation', async () => {
    const a = new PlanerDB('test-share-a-' + Math.random());
    await ensureDefaults(a);
    const p = (await a.programs.toArray())[0];
    await a.workouts.add({ sportTypeId: 1, date: '2026-11-17', durationMin: 30, createdAt: '', updatedAt: '' });
    const file = await exportProgram(a, p);
    const text = JSON.stringify(file);
    expect(text).not.toMatch(/"(id|exerciseId|sportTypeId)"/);
    expect(file.units[0].exercises[0].name).toBe('Kniebeuge (Goblet Squat)');
    expect(file.exercises.find((e) => e.name === 'Latzug')?.howTo).toMatch(/Stange/);

    const b = new PlanerDB('test-share-b-' + Math.random());
    const res = await importProgram(b, parseProgram(text));
    expect(res.name).toBe('Winter-Arc');
    expect(await b.workouts.count()).toBe(0);
    const imported = (await b.programs.get(res.id))!;
    expect(imported.units.map((u) => u.name)).toEqual(['Gym A', 'Gym B', 'Zuhause']);
    expect(await b.sportTypes.where('name').equals('Gym').count()).toBe(1);
    // nochmal importieren → neuer Name
    expect((await importProgram(b, parseProgram(text))).name).toBe('Winter-Arc (2)');
  });

  it('erkennt falsche Dateien', () => {
    expect(() => parseProgram('kein json')).toThrow('keine gültige Programm-Datei');
    expect(() => parseProgram('{"app":"planer-app","tables":{}}')).toThrow('Backup');
    expect(() => parseProgram(JSON.stringify({ ...WINTER_ARC, version: 2 }))).toThrow('neueren App-Version');
    expect(() => parseProgram('{"format":"planer-programm","version":1}')).toThrow('unvollständig');
  });

  it('Dateiname', () => {
    expect(programFileName('Winter-Arc')).toBe('winter-arc.planer-programm.json');
    expect(programFileName('Frühjahr Läufer')).toBe('fruehjahr-laeufer.planer-programm.json');
  });
});
