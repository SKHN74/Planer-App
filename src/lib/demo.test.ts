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

describe('Beispieldaten laden', () => {
  it('lädt markierte Daten, die sich vollständig wieder löschen lassen', async () => {
    const { loadDemo } = await import('./demoData');
    const x = new PlanerDB('test-demo-load-' + Math.random());
    await x.todos.add({ title: 'Mein To-do', priority: 1, createdAt: ts, updatedAt: ts });
    const n = await loadDemo(x, new Date(2026, 10, 17));
    expect(n).toBeGreaterThan(10);
    expect(await countDemo(x)).toBe(n);
    await clearDemo(x);
    expect((await x.todos.toArray()).map((t) => t.title)).toEqual(['Mein To-do']);
    expect(await x.events.count()).toBe(0);
  });
});
