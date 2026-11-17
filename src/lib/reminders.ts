import { addDays } from 'date-fns';
import type { CalendarEvent, Todo } from '../db/types';
import { fromKey, toKey } from './dates';
import { occursOn } from './recurrence';

/** Ganztägige Einträge und To-dos ohne Uhrzeit gelten für Erinnerungen als 08:00 Uhr. */
export const DEFAULT_TIME = '08:00';

export interface DueReminder {
  /** Eindeutig pro Vorkommen, damit „Ausblenden“ nur dieses betrifft. */
  key: string;
  kind: 'event' | 'todo';
  title: string;
  startsAt: Date;
  remindAt: Date;
}

function at(day: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = fromKey(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Erinnerungen, die jetzt fällig sind: Erinnerungszeitpunkt erreicht, Beginn noch nicht vorbei.
 * Betrachtet werden Vorkommen von heute bis übermorgen (wegen „1 Tag vorher“).
 */
export function dueReminders(events: CalendarEvent[], todos: Todo[], now: Date): DueReminder[] {
  const out: DueReminder[] = [];
  const days = [0, 1, 2].map((n) => toKey(addDays(now, n)));
  for (const e of events) {
    if (!e.reminderMin) continue;
    for (const day of days) {
      if (!occursOn(e, day)) continue;
      const startsAt = at(day, e.allDay ? DEFAULT_TIME : e.start ?? DEFAULT_TIME);
      const remindAt = new Date(startsAt.getTime() - e.reminderMin * 60_000);
      if (now >= remindAt && now < startsAt) out.push({ key: `e${e.id}-${day}`, kind: 'event', title: e.title, startsAt, remindAt });
    }
  }
  for (const t of todos) {
    if (!t.reminderMin || !t.date || t.doneAt) continue;
    const startsAt = at(t.date, t.time ?? DEFAULT_TIME);
    const remindAt = new Date(startsAt.getTime() - t.reminderMin * 60_000);
    if (now >= remindAt && now < startsAt) out.push({ key: `t${t.id}-${t.date}`, kind: 'todo', title: t.title, startsAt, remindAt });
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** „in 10 Min“, „in 1 Std 5 Min“, „morgen 08:30“ */
export function relativeLabel(startsAt: Date, now: Date): string {
  const min = Math.round((startsAt.getTime() - now.getTime()) / 60_000);
  const hm = `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}`;
  if (toKey(startsAt) !== toKey(now)) return (toKey(startsAt) === toKey(addDays(now, 1)) ? 'morgen ' : 'übermorgen ') + hm;
  if (min < 60) return `in ${Math.max(1, min)} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `in ${h} Std${m ? ` ${m} Min` : ''} (${hm})`;
}
