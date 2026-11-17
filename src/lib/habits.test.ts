import { describe, expect, it } from 'vitest';
import { PlanerDB } from '../db/db';
import type { Habit, HabitLog, Workout } from '../db/types';
import { chainLength, ensureDefaultHabits, habitStreak, isDone, setHabitValue } from './habits';

const ts = '2026-11-01T10:00:00.000Z';
const water: Habit = { id: 2, name: 'Wasser', kind: 'zaehler', target: 8, active: true, order: 2, createdAt: ts, updatedAt: ts };
const steps: Habit = { id: 1, name: 'Schritte', kind: 'abhaken', active: true, order: 1, createdAt: ts, updatedAt: ts };
const log = (habitId: number, date: string, value: number): HabitLog => ({ habitId, date, value, createdAt: ts, updatedAt: ts });
const w = (date: string, isRestDay = false): Workout => ({ sportTypeId: 1, date, durationMin: isRestDay ? 0 : 30, isRestDay, createdAt: ts, updatedAt: ts });

describe('Gewohnheiten', () => {
  it('erkennt erfüllte Tage', () => {
    expect(isDone(steps, 1)).toBe(true);
    expect(isDone(steps, 0)).toBe(false);
    expect(isDone(water, 7)).toBe(false);
    expect(isDone(water, 8)).toBe(true);
  });

  it('zählt Serien, ein offener heutiger Tag bricht sie nicht', () => {
    const logs = [log(1, '2026-11-14', 1), log(1, '2026-11-15', 1), log(1, '2026-11-16', 1), log(2, '2026-11-16', 5)];
    expect(habitStreak(steps, logs, '2026-11-17')).toBe(3);
    expect(habitStreak(steps, [...logs, log(1, '2026-11-17', 1)], '2026-11-17')).toBe(4);
    expect(habitStreak(water, logs, '2026-11-17')).toBe(0);
    expect(habitStreak(steps, logs, '2026-11-18')).toBe(0);
  });

  it('Kette zählt Training und bewusste Pause', () => {
    const list = [w('2026-11-13'), w('2026-11-15'), w('2026-11-16', true), w('2026-11-17')];
    expect(chainLength(list, '2026-11-17')).toBe(3);
    expect(chainLength(list.slice(0, 3), '2026-11-17')).toBe(2);
    expect(chainLength([], '2026-11-17')).toBe(0);
  });

  it('speichert Tageswerte und legt Standards nur einmal an', async () => {
    const d = new PlanerDB('test-habits-' + Math.random());
    await ensureDefaultHabits(d);
    expect((await d.habits.toArray()).map((h) => h.name)).toEqual(['Schritte', 'Wasser', 'Schlaf']);
    await d.habits.clear();
    await ensureDefaultHabits(d);
    expect(await d.habits.count()).toBe(0); // gelöschte kommen nicht zurück
    await setHabitValue(d, 2, '2026-11-17', 3);
    await setHabitValue(d, 2, '2026-11-17', 4);
    expect((await d.habitLogs.toArray()).map((l) => l.value)).toEqual([4]);
    await setHabitValue(d, 2, '2026-11-17', 0);
    expect(await d.habitLogs.count()).toBe(0);
  });
});
