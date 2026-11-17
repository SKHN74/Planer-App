import { getSettings, updateSettings, type PlanerDB } from '../db/db';
import type { Category, CategoryColor } from '../db/types';

export const CATEGORY_COLORS: { key: CategoryColor; label: string }[] = [
  { key: 'blau', label: 'Blau' }, { key: 'gruen', label: 'Grün' }, { key: 'orange', label: 'Orange' }, { key: 'lila', label: 'Lila' },
  { key: 'rot', label: 'Rot' }, { key: 'tuerkis', label: 'Türkis' }, { key: 'gelb', label: 'Gelb' }, { key: 'grau', label: 'Grau' }
];

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { name: 'Uni', color: 'blau', order: 1 },
  { name: 'Privat', color: 'lila', order: 2 },
  { name: 'Freizeit', color: 'tuerkis', order: 3 }
];

/** CSS-Klasse, die --cat, --cat-bg und --cat-fg setzt. Ohne Kategorie: Blau. */
export function catClass(categories: Category[], id?: number): string {
  const c = id != null ? categories.find((x) => x.id === id) : undefined;
  return 'cat-' + (c?.color ?? 'blau');
}

/** Legt Uni, Privat und Freizeit einmalig an. Später gelöschte kommen nicht wieder. */
export async function ensureDefaultCategories(d: PlanerDB): Promise<void> {
  if ((await getSettings(d)).categoriesSeeded) return;
  if ((await d.categories.count()) === 0) {
    const ts = new Date().toISOString();
    await d.categories.bulkAdd(DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: ts, updatedAt: ts })));
  }
  await updateSettings({ categoriesSeeded: true }, d);
}

/** Löscht eine Kategorie; ihre Termine bleiben, nur ohne Kategorie. */
export async function deleteCategory(d: PlanerDB, id: number): Promise<void> {
  await d.transaction('rw', d.categories, d.events, async () => {
    await d.events.filter((e) => e.categoryId === id).modify((e) => { delete e.categoryId; });
    await d.categories.delete(id);
  });
}
