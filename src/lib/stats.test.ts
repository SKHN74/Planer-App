import { describe, expect, it } from 'vitest';
import type { Workout } from '../db/types';
import { bars, bySport, delta, hoursLabel, period, shift, totals } from './stats';

const ts = '2026-11-01T10:00:00.000Z';
const w = (date: string, p: Partial<Workout> = {}): Workout => ({ sportTypeId: 1, date, durationMin: 30, createdAt: ts, updatedAt: ts, ...p });

describe('Statistik', () => {
  it('Zeiträume und Blättern', () => {
    expect(period('woche', '2026-11-17')).toMatchObject({ from: '2026-11-16', to: '2026-11-22', label: 'KW 47 · 16.–22.11.2026' });
    expect(period('woche', '2026-12-01').label).toBe('KW 49 · 30.11.–06.12.2026');
    expect(period('monat', '2026-11-17')).toMatchObject({ from: '2026-11-01', to: '2026-11-30', days: 30, label: 'November 2026' });
    expect(shift('woche', '2026-11-17', -1)).toBe('2026-11-10');
    expect(shift('monat', '2026-03-31', -1)).toBe('2026-02-01');
  });

  it('Summen und längste Kette', () => {
    const ws = [w('2026-11-16', { durationMin: 45 }), w('2026-11-17', { isRestDay: true, durationMin: 0 }), w('2026-11-18', { distanceKm: 5 }), w('2026-11-20')];
    expect(totals(ws, '2026-11-16', '2026-11-22')).toEqual({ count: 3, minutes: 105, km: 5, activeDays: 4, longestChain: 3 });
  });

  it('Balken pro Tag bzw. Kalenderwoche', () => {
    const ws = [w('2026-11-16', { durationMin: 45 }), w('2026-11-02', { durationMin: 60 })];
    const week = bars('woche', period('woche', '2026-11-17'), ws, '2026-11-17');
    expect(week.map((b) => b.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(week[0].minutes).toBe(45);
    expect(week[1].current).toBe(true);
    const month = bars('monat', period('monat', '2026-11-17'), ws, '2026-11-17');
    expect(month.map((b) => b.label)).toEqual(['KW 44', 'KW 45', 'KW 46', 'KW 47', 'KW 48', 'KW 49']);
    expect(month[1].minutes).toBe(60);
    expect(month[3].current).toBe(true);
  });

  it('nach Sportart und Texte', () => {
    const rows = bySport([w('2026-11-16', { sportTypeId: 2, durationMin: 60 }), w('2026-11-17'), w('2026-11-18')], [{ id: 1, name: 'Gym', hasDistance: false, createdAt: ts, updatedAt: ts }], '2026-11-16', '2026-11-22');
    expect(rows.map((r) => `${r.name} ${r.count} ${r.minutes}`)).toEqual(['Gym 2 60', 'Sonstiges 1 60']);
    expect(hoursLabel(246)).toBe('4:06 h');
    expect(delta(6, 5, 'woche', String)).toEqual({ text: '+1 zur Vorwoche', up: true });
    expect(delta(2, 5, 'monat', String)).toEqual({ text: '−3 zum Vormonat', up: false });
  });
});
