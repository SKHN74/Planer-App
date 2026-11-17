import { addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Habit, HabitLog, ISODate, SportType, Workout } from '../db/types';
import { fromKey, isoWeek, toKey, weekStart } from './dates';
import { isDone } from './habits';

export type Mode = 'woche' | 'monat';

export interface Period { from: ISODate; to: ISODate; label: string; days: number }

export function period(mode: Mode, anchor: ISODate): Period {
  const d = fromKey(anchor);
  if (mode === 'woche') {
    const s = weekStart(d);
    const e = addDays(s, 6);
    const sameMonth = s.getMonth() === e.getMonth();
    return { from: toKey(s), to: toKey(e), days: 7, label: `KW ${isoWeek(d)} · ${format(s, sameMonth ? 'dd.' : 'dd.MM.')}–${format(e, 'dd.MM.yyyy')}` };
  }
  const s = startOfMonth(d);
  const e = endOfMonth(d);
  return { from: toKey(s), to: toKey(e), days: differenceInCalendarDays(e, s) + 1, label: format(d, 'MMMM yyyy', { locale: de }) };
}

export function shift(mode: Mode, anchor: ISODate, n: number): ISODate {
  const d = fromKey(anchor);
  return toKey(mode === 'woche' ? addDays(d, 7 * n) : addMonths(startOfMonth(d), n));
}

export interface Totals { count: number; minutes: number; km: number; activeDays: number; longestChain: number }

/** Summen eines Zeitraums. Bei laufendem Zeitraum zählt nur bis `today`. */
export function totals(workouts: Workout[], from: ISODate, to: ISODate): Totals {
  const ws = workouts.filter((w) => w.date >= from && w.date <= to);
  const trainings = ws.filter((w) => !w.isRestDay);
  const days = new Set(ws.map((w) => w.date));
  let longest = 0;
  let run = 0;
  for (let d = fromKey(from); toKey(d) <= to; d = addDays(d, 1)) {
    run = days.has(toKey(d)) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return {
    count: trainings.length,
    minutes: trainings.reduce((s, w) => s + (w.durationMin || 0), 0),
    km: trainings.reduce((s, w) => s + (w.distanceKm ?? 0), 0),
    activeDays: days.size,
    longestChain: longest
  };
}

export interface Bar { label: string; minutes: number; current: boolean }

/** Woche: Minuten pro Tag. Monat: Minuten pro Kalenderwoche (Mo–So, auf den Monat begrenzt). */
export function bars(mode: Mode, p: Period, workouts: Workout[], today: ISODate): Bar[] {
  const mins = (from: ISODate, to: ISODate) => workouts.filter((w) => !w.isRestDay && w.date >= from && w.date <= to).reduce((s, w) => s + (w.durationMin || 0), 0);
  if (mode === 'woche') {
    return eachDayOfInterval({ start: fromKey(p.from), end: fromKey(p.to) }).map((d) => {
      const k = toKey(d);
      return { label: format(d, 'EEEEEE', { locale: de }), minutes: mins(k, k), current: k === today };
    });
  }
  const out: Bar[] = [];
  for (let s = weekStart(fromKey(p.from)); toKey(s) <= p.to; s = addDays(s, 7)) {
    const from = toKey(s) < p.from ? p.from : toKey(s);
    const end = toKey(addDays(s, 6));
    const to = end > p.to ? p.to : end;
    out.push({ label: `KW ${isoWeek(s)}`, minutes: mins(from, to), current: today >= from && today <= to });
  }
  return out;
}

export interface SportRow { name: string; count: number; minutes: number; km: number }

export function bySport(workouts: Workout[], sports: SportType[], from: ISODate, to: ISODate): SportRow[] {
  const map = new Map<number, SportRow>();
  for (const w of workouts) {
    if (w.isRestDay || w.date < from || w.date > to) continue;
    const row = map.get(w.sportTypeId) ?? { name: sports.find((s) => s.id === w.sportTypeId)?.name ?? 'Sonstiges', count: 0, minutes: 0, km: 0 };
    row.count++;
    row.minutes += w.durationMin || 0;
    row.km += w.distanceKm ?? 0;
    map.set(w.sportTypeId, row);
  }
  return [...map.values()].sort((a, b) => b.minutes - a.minutes || b.count - a.count);
}

export interface HabitRow { name: string; done: number; days: number }

/** Erfüllte Tage je aktiver Gewohnheit; laufende Zeiträume nur bis heute. */
export function habitRows(habits: Habit[], logs: HabitLog[], from: ISODate, to: ISODate, today: ISODate): HabitRow[] {
  const end = to > today ? today : to;
  const days = end < from ? 0 : differenceInCalendarDays(fromKey(end), fromKey(from)) + 1;
  return habits.filter((h) => h.active).sort((a, b) => a.order - b.order).map((h) => ({
    name: h.name,
    done: logs.filter((l) => l.habitId === h.id && l.date >= from && l.date <= end && isDone(h, l.value)).length,
    days
  }));
}

export function hoursLabel(min: number): string {
  if (min < 60) return `${Math.round(min)} Min`;
  const h = Math.floor(min / 60);
  return `${h}:${String(Math.round(min % 60)).padStart(2, '0')} h`;
}

/** „+1 zur Vorwoche“, „−3,1 km zum Vormonat“ */
export function delta(cur: number, prev: number, mode: Mode, fmt: (n: number) => string): { text: string; up: boolean } | null {
  const diff = cur - prev;
  if (Math.abs(diff) < 0.05) return { text: `wie ${mode === 'woche' ? 'Vorwoche' : 'Vormonat'}`, up: true };
  return { text: `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} zu${mode === 'woche' ? 'r Vorwoche' : 'm Vormonat'}`, up: diff > 0 };
}
