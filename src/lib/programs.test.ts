import { describe, expect, it } from 'vitest';
import { PlanerDB } from '../db/db';
import { DEFAULT_SPORTS, WINTER_ARC, ensureDefaults, installProgram } from './programs';

describe('Programme', () => {
  it('legt Sportarten und Winter-Arc genau einmal an', async () => {
    const d = new PlanerDB('test-prog-' + Math.random());
    await Promise.all([ensureDefaults(d), ensureDefaults(d)]);
    await ensureDefaults(d);
    expect(await d.sportTypes.count()).toBe(DEFAULT_SPORTS.length);
    expect(await d.programs.count()).toBe(1);
    const p = (await d.programs.toArray())[0];
    expect(p.units.map((u) => u.name)).toEqual(['Gym A', 'Gym B', 'Zuhause']);
    expect(p.ladders).toHaveLength(2);
    expect(p.isDemo).toBeUndefined();
  });

  it('verknüpft Vorlagen mit Übungen und Sportarten', async () => {
    const d = new PlanerDB('test-prog-' + Math.random());
    await ensureDefaults(d);
    const p = (await d.programs.toArray())[0];
    const gym = await d.sportTypes.where('name').equals('Gym').first();
    const a = p.units[0];
    expect(a.sportTypeId).toBe(gym!.id);
    const names = await Promise.all(a.exercises.map(async (e) => (await d.exercises.get(e.exerciseId))!.name));
    expect(names[0]).toBe('Kniebeuge (Goblet Squat)');
    expect((await d.exercises.get(a.exercises[0].exerciseId))!.howTo).toMatch(/Kurzhantel/);
  });

  it('nutzt beim zweiten Programm vorhandene Übungen wieder', async () => {
    const d = new PlanerDB('test-prog-' + Math.random());
    await ensureDefaults(d);
    const before = await d.exercises.count();
    await installProgram(d, { ...WINTER_ARC, name: 'Kopie' });
    expect(await d.exercises.count()).toBe(before);
    expect(await d.programs.count()).toBe(2);
  });
});
