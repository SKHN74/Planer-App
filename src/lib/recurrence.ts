import { differenceInCalendarDays, getDaysInMonth } from 'date-fns';
import type { ISODate, Repeat } from '../db/types';
import { fromKey } from './dates';

export interface Recurring {
  date: ISODate;
  repeat?: Repeat;
  exceptions?: ISODate[];
}

/** Wochentag mit Montag = 0 … Sonntag = 6. */
export function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Findet ein (ggf. wiederkehrender) Eintrag an diesem Tag statt? */
export function occursOn(item: Recurring, day: ISODate): boolean {
  if (day < item.date) return false;
  if (item.exceptions?.includes(day)) return false;
  const r = item.repeat;
  if (!r) return day === item.date;
  if (r.until && day > r.until) return false;

  const start = fromKey(item.date);
  const d = fromKey(day);
  const interval = Math.max(1, r.interval ?? 1);

  switch (r.kind) {
    case 'taeglich':
      return differenceInCalendarDays(d, start) % interval === 0;
    case 'woechentlich': {
      const days = r.weekdays?.length ? r.weekdays : [weekdayMon0(start)];
      if (!days.includes(weekdayMon0(d))) return false;
      // Wochen ab dem Montag der Startwoche zählen
      const startMonday = differenceInCalendarDays(start, new Date(0)) - weekdayMon0(start);
      const dayMonday = differenceInCalendarDays(d, new Date(0)) - weekdayMon0(d);
      return ((dayMonday - startMonday) / 7) % interval === 0;
    }
    case 'monatlich': {
      const months = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
      if (months % interval !== 0) return false;
      // Am 31. angelegt: in kürzeren Monaten am letzten Tag
      const target = Math.min(start.getDate(), getDaysInMonth(d));
      return d.getDate() === target;
    }
  }
}

export function repeatLabel(r?: Repeat): string {
  if (!r) return 'Keine';
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const until = r.until ? ` bis ${r.until.split('-').reverse().join('.')}` : '';
  if (r.kind === 'taeglich') return 'Täglich' + until;
  if (r.kind === 'monatlich') return 'Monatlich' + until;
  const days = r.weekdays?.length ? ' (' + r.weekdays.map((i) => WD[i]).join(', ') + ')' : '';
  return 'Wöchentlich' + days + until;
}
