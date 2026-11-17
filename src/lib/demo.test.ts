import { beforeEach, describe, expect, it } from 'vitest';
import { PlanerDB } from '../db/db';
import { clearDemo, countDemo } from './demo';

const ts = '2026-11-17T10:00:00.000Z';
let d: PlanerDB;

beforeEach(async () => {
  d = new PlanerDB('test-demo-' + Math.random());
  await d.todos.bulkAdd([
    { title: 'Test-To-do', priority: 2, createdAt: ts, updatedAt: ts, isDemo: true },
    { title: 'Echtes To-do', priority: 1, createdAt: ts, updatedAt: ts }
  ]);
  await d.events.add({ title: 'Test-Termin', date: '2026-11-17', allDay: true, createdAt: ts, updatedAt: ts, isDemo: true });
});

describe('Testdaten', () => {
  it('zählt nur markierte Einträge', async () => {
    expect(await countDemo(d)).toBe(2);
  });

  it('löscht nur Testdaten, echte Daten bleiben', async () => {
    expect(await clearDemo(d)).toBe(2);
    expect(await countDemo(d)).toBe(0);
    const rest = await d.todos.toArray();
    expect(rest.map((x) => x.title)).toEqual(['Echtes To-do']);
    expect(await d.events.count()).toBe(0);
  });
});
