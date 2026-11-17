import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { PlanerDB } from '../db/db';
import { catClass, deleteCategory, ensureDefaultCategories } from './categories';
import { createBackup, parseBackup, restoreBackup } from './backup';

const ts = '2026-11-17T10:00:00.000Z';

describe('Kategorien', () => {
  it('legt Uni, Privat, Freizeit einmalig an', async () => {
    const d = new PlanerDB('test-cat-' + Math.random());
    await ensureDefaultCategories(d);
    expect((await d.categories.orderBy('order').toArray()).map((c) => c.name)).toEqual(['Uni', 'Privat', 'Freizeit']);
    await d.categories.clear();
    await ensureDefaultCategories(d);
    expect(await d.categories.count()).toBe(0);
  });

  it('Löschen behält die Termine, nur ohne Kategorie', async () => {
    const d = new PlanerDB('test-cat-' + Math.random());
    const id = (await d.categories.add({ name: 'Uni', color: 'blau', order: 1, createdAt: ts, updatedAt: ts })) as number;
    await d.events.add({ title: 'Vorlesung', date: '2026-11-17', allDay: true, categoryId: id, createdAt: ts, updatedAt: ts });
    await deleteCategory(d, id);
    const [e] = await d.events.toArray();
    expect(e.title).toBe('Vorlesung');
    expect(e.categoryId).toBeUndefined();
  });

  it('Farbklasse mit Blau als Standard', () => {
    const cats = [{ id: 1, name: 'Freizeit', color: 'orange' as const, order: 1, createdAt: ts, updatedAt: ts }];
    expect(catClass(cats, 1)).toBe('cat-orange');
    expect(catClass(cats, undefined)).toBe('cat-blau');
    expect(catClass(cats, 99)).toBe('cat-blau');
  });

  it('bestehende Daten (Version 1) bleiben beim Update erhalten', async () => {
    const name = 'test-upgrade-' + Math.random();
    const old = new Dexie(name);
    old.version(1).stores({ events: '++id, date, isDemo', settings: 'id' });
    await old.table('events').add({ title: 'Alt', date: '2026-11-17', allDay: true, createdAt: ts, updatedAt: ts });
    old.close();
    const d = new PlanerDB(name);
    expect((await d.events.toArray())[0].title).toBe('Alt');
    expect(await d.categories.count()).toBe(0);
  });

  it('ein Backup aus Version 1 lässt sich einspielen', async () => {
    const d = new PlanerDB('test-cat-' + Math.random());
    const b = await createBackup(d);
    const v1 = { ...b, schemaVersion: 1, tables: { ...b.tables, events: [{ id: 1, title: 'Aus Backup', date: '2026-11-17', allDay: true, createdAt: ts, updatedAt: ts }] } };
    delete (v1.tables as Record<string, unknown>).categories;
    await restoreBackup(d, parseBackup(JSON.stringify(v1)));
    expect((await d.events.toArray())[0].title).toBe('Aus Backup');
  });
});
