import { addDays } from 'date-fns';
import type { PlanerDB } from '../db/db';
import type { CalendarEvent, Todo } from '../db/types';
import { toKey } from './dates';
import { weekdayMon0 } from './recurrence';

/**
 * Lädt klar gekennzeichnete Beispieldaten (isDemo = true) rund um das heutige Datum.
 * Sie lassen sich in den Einstellungen mit einem Klick wieder löschen.
 */
export async function loadDemo(d: PlanerDB, today = new Date()): Promise<number> {
  const ts = new Date().toISOString();
  const day = (n: number) => toKey(addDays(today, n));
  const base = { createdAt: ts, updatedAt: ts, isDemo: true };

  const events: CalendarEvent[] = [
    { ...base, title: 'Zahnarzt', date: day(0), allDay: false, start: '08:30', end: '09:00', location: 'Praxis Dr. Weber', reminderMin: 60 },
    { ...base, title: 'Mittagessen mit Anna', date: day(0), allDay: false, start: '12:00', end: '13:00', location: 'Café Rosa' },
    { ...base, title: 'Yoga', date: day(-14), allDay: false, start: '07:00', end: '08:00', repeat: { kind: 'woechentlich', weekdays: [weekdayMon0(addDays(today, 2))] } },
    { ...base, title: 'Geburtstag Lisa', date: day(3), allDay: true },
    { ...base, title: 'Kino', date: day(3), allDay: false, start: '18:30', end: '21:00', location: 'Cinemaxx' },
    { ...base, title: 'Elternabend', date: day(-5), allDay: false, start: '19:00', end: '20:30', location: 'Grundschule' },
    { ...base, title: 'Termin Steuerberater', date: day(9), allDay: false, start: '10:00', end: '11:00', reminderMin: 1440 },
    { ...base, title: 'Wochenende Harz', date: day(4), allDay: true, repeat: { kind: 'taeglich', until: day(5) } },
    { ...base, title: 'Miete prüfen', date: toKey(new Date(today.getFullYear(), today.getMonth(), 1)), allDay: true, repeat: { kind: 'monatlich' } }
  ];
  const todos: Todo[] = [
    { ...base, title: 'Steuerunterlagen sortieren', date: day(-1), originalDate: day(-1), priority: 1 },
    { ...base, title: 'Geschenk für Lisa bestellen', date: day(0), priority: 2 },
    { ...base, title: 'Fahrrad aufpumpen', date: day(0), priority: 3 },
    { ...base, title: 'Reifen wechseln', date: day(2), time: '17:00', priority: 2 },
    { ...base, title: 'Wäsche abholen', date: day(-1), priority: 2, doneAt: addDays(today, -1).toISOString() },
    { ...base, title: 'Fotobuch gestalten', priority: 3 }
  ];
  await d.transaction('rw', d.events, d.todos, async () => {
    await d.events.bulkAdd(events);
    await d.todos.bulkAdd(todos);
  });
  return events.length + todos.length;
}
