import { addDays } from 'date-fns';
import { getSettings, updateSettings, type PlanerDB } from '../db/db';
import type { Habit, HabitLog, ISODate, Workout } from '../db/types';
import { fromKey, toKey } from './dates';

export const DEFAULT_HABITS: Omit<Habit, 'createdAt' | 'updatedAt'>[] = [
  { name: 'Schritte', hint: '8.000 Schritte', kind: 'abhaken', active: true, order: 1 },
  { name: 'Wasser', hint: '8 Gläser ≈ 2 Liter', kind: 'zaehler', target: 8, unitLabel: 'Gläser', active: true, order: 2 },
  { name: 'Schlaf', hint: '7 Stunden oder mehr', kind: 'abhaken', active: true, order: 3 }
];

/** Gilt die Gewohnheit an diesem Tag als erfüllt? */
export function isDone(h: Habit, value: number | undefined): boolean {
  if (!value) return false;
  return h.kind === 'abhaken' ? value >= 1 : value >= (h.target ?? 1);
}

export function logValue(logs: HabitLog[], habitId: number, day: ISODate): number {
  return logs.find((l) => l.habitId === habitId && l.date === day)?.value ?? 0;
}

/**
 * Zählt aufeinanderfolgende erfüllte Tage bis heute. Ist heute noch offen,
 * zählt die Serie bis gestern – sie reißt erst, wenn der Tag vorbei ist.
 */
function streak(ok: (day: ISODate) => boolean, today: ISODate): number {
  let d = fromKey(today);
  if (!ok(today)) d = addDays(d, -1);
  let n = 0;
  while (ok(toKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function habitStreak(h: Habit, logs: HabitLog[], today: ISODate): number {
  const done = new Set(logs.filter((l) => l.habitId === h.id && isDone(h, l.value)).map((l) => l.date));
  return streak((d) => done.has(d), today);
}

/** Tage mit Training oder bewusster Pause. */
export function chainDays(workouts: Workout[]): Set<ISODate> {
  return new Set(workouts.map((w) => w.date));
}

/** Die Kette: Tage am Stück mit Training oder bewusster Pause. */
export function chainLength(workouts: Workout[], today: ISODate): number {
  const days = chainDays(workouts);
  return streak((d) => days.has(d), today);
}

/** Setzt den Tageswert einer Gewohnheit (0 löscht den Eintrag). */
export async function setHabitValue(d: PlanerDB, habitId: number, date: ISODate, value: number): Promise<void> {
  const ts = new Date().toISOString();
  await d.transaction('rw', d.habitLogs, async () => {
    const existing = await d.habitLogs.where('[habitId+date]').equals([habitId, date]).first();
    if (value <= 0) { if (existing?.id) await d.habitLogs.delete(existing.id); return; }
    if (existing?.id) await d.habitLogs.update(existing.id, { value, updatedAt: ts });
    else await d.habitLogs.add({ habitId, date, value, createdAt: ts, updatedAt: ts });
  });
}

/** Legt Schritte, Wasser und Schlaf einmalig an. Später gelöschte kommen nicht wieder. */
export async function ensureDefaultHabits(d: PlanerDB): Promise<void> {
  if ((await getSettings(d)).habitsSeeded) return;
  if ((await d.habits.count()) === 0) {
    const ts = new Date().toISOString();
    await d.habits.bulkAdd(DEFAULT_HABITS.map((h) => ({ ...h, createdAt: ts, updatedAt: ts })));
  }
  await updateSettings({ habitsSeeded: true }, d);
}
