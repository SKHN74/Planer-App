import { describe, expect, it } from 'vitest';
import type { Goal, Habit, HabitLog, Workout } from '../db/types';
import { bestTime, evaluateGoal, goalTitle, minutesLabel } from './goals';

const ts = '2026-11-01T10:00:00.000Z';
const g = (p: Partial<Goal>): Goal => ({ title: 'Ziel', type: 'haeufigkeit', period: 'woche', metric: 'einheiten', target: 3, active: true, createdAt: ts, updatedAt: ts, ...p });
const w = (date: string, p: Partial<Workout> = {}): Workout => ({ sportTypeId: 1, date, durationMin: 45, createdAt: ts, updatedAt: ts, ...p });
const data = (workouts: Workout[], habits: Habit[] = [], habitLogs: HabitLog[] = []) => ({ workouts, habits, habitLogs });

// 2026-11-17 ist ein Dienstag (KW 47, Woche 16.–22.11.)
describe('Ziele', () => {
  it('Häufigkeit pro Woche mit Status und Serie', () => {
    const ws = [w('2026-11-16'), w('2026-11-09'), w('2026-11-10'), w('2026-11-12'), w('2026-11-03'), w('2026-11-17', { sportTypeId: 2 })];
    const v = evaluateGoal(g({ sportTypeId: 1 }), data(ws), '2026-11-17');
    expect(v.valueLabel).toBe('1 von 3 Einheiten · KW 47');
    expect(v.progress).toBeCloseTo(1 / 3);
    expect(v.status).toBe('im Plan');
    expect(v.extra).toBe('Serie: 1 Woche'); // KW 46 geschafft, KW 45 nicht
    expect(evaluateGoal(g({ target: 9 }), data(ws), '2026-11-17').extra).toBe('');
  });

  it('meldet Rückstand, wenn die Woche fast rum ist', () => {
    const v = evaluateGoal(g({}), data([w('2026-11-16')]), '2026-11-22');
    expect(v.onTrack).toBe(false);
    expect(v.status).toBe('2 Einheiten hinter Plan');
  });

  it('Pausen zählen nicht als Einheit', () => {
    const v = evaluateGoal(g({ target: 1 }), data([w('2026-11-17', { isRestDay: true, durationMin: 0 })]), '2026-11-17');
    expect(v.status).not.toBe('geschafft');
  });

  it('Summe km im Monat', () => {
    const ws = [w('2026-11-02', { distanceKm: 10 }), w('2026-11-10', { distanceKm: 13 }), w('2026-10-30', { distanceKm: 40 })];
    const v = evaluateGoal(g({ type: 'summe', period: 'monat', metric: 'km', target: 50 }), data(ws), '2026-11-17');
    expect(v.valueLabel).toBe('23 von 50 km · November');
    expect(v.onTrack).toBe(false);
    expect(v.status).toBe('3,7 km hinter Plan'); // 16 von 30 Tagen vorbei → 26,7 km erwartet
  });

  it('Bestzeit wird auf die Zieldistanz hochgerechnet', () => {
    const goal = g({ type: 'leistung', period: 'stichtag', metric: 'zeit', target: 60, distanceKm: 10, deadline: '2027-03-31' });
    const ws = [w('2026-11-01', { distanceKm: 5, durationMin: 30 }), w('2026-11-10', { distanceKm: 10, durationMin: 64.5 }), w('2026-11-12', { distanceKm: 12, durationMin: 75 })];
    expect(bestTime(goal, ws)).toBeCloseTo(62.5);
    const v = evaluateGoal(goal, data(ws), '2026-11-17');
    expect(v.valueLabel).toBe('Bestzeit 62:30 · bis 31.03.2027');
    expect(v.status).toBe('noch 2:30 schneller');
    expect(v.extra).toBe('134 Tage übrig');
  });

  it('Gewohnheit: Tage pro Woche', () => {
    const water: Habit = { id: 2, name: 'Wasser', kind: 'zaehler', target: 8, active: true, order: 2, createdAt: ts, updatedAt: ts };
    const logs: HabitLog[] = [8, 8, 4].map((value, i) => ({ habitId: 2, date: `2026-11-1${6 + i}`, value, createdAt: ts, updatedAt: ts }));
    const v = evaluateGoal(g({ type: 'gewohnheit', metric: 'erledigt', habitId: 2, target: 7 }), data([], [water], logs), '2026-11-18');
    expect(v.valueLabel).toBe('2 von 7 Tagen · KW 47');
    expect(v.onTrack).toBe(true);
  });

  it('formatiert Zeiten und Titel', () => {
    expect(minutesLabel(64.5)).toBe('64:30');
    expect(minutesLabel(125)).toBe('2:05:00');
    expect(goalTitle({ type: 'haeufigkeit', period: 'woche', metric: 'einheiten', target: 3, active: true }, { sport: 'Gym' })).toBe('3× Gym pro Woche');
    expect(goalTitle({ type: 'leistung', period: 'stichtag', metric: 'zeit', target: 60, distanceKm: 10, active: true }, {})).toBe('10 km unter 60:00');
  });
});
