import { addDays, format, getISOWeek, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';

/** Woche beginnt am Montag. */
const WEEK = { weekStartsOn: 1 as const };

export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function fromKey(key: string): Date {
  return parseISO(key);
}

export function weekStart(d: Date): Date {
  return startOfWeek(d, WEEK);
}

export function isoWeek(d: Date): number {
  return getISOWeek(d);
}

/** Montag bis Sonntag der Woche, in der `d` liegt. */
export function weekDays(d: Date): Date[] {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export interface MonthWeek {
  kw: number;
  days: Date[];
}

/** Immer 6 Wochen ab dem Montag vor (oder am) Monatsersten – wie in Kalender-Apps üblich. */
export function monthGrid(year: number, month0: number): MonthWeek[] {
  const first = weekStart(startOfMonth(new Date(year, month0, 1)));
  return Array.from({ length: 6 }, (_, w) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(first, w * 7 + i));
    return { kw: isoWeek(days[0]), days };
  });
}

export function formatLong(d: Date): string {
  return format(d, 'EEEE, d. MMMM', { locale: de });
}

export function formatMonth(d: Date): string {
  return format(d, 'MMMM yyyy', { locale: de });
}

export function formatShort(d: Date): string {
  return format(d, 'dd.MM.yyyy');
}

export function weekdayShort(d: Date): string {
  return format(d, 'EEEEEE', { locale: de });
}
