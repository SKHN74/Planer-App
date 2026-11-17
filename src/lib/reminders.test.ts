import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Todo } from '../db/types';
import { dueReminders, relativeLabel } from './reminders';
import { eventToIcs } from './ics';

const ts = '2026-11-01T00:00:00.000Z';
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ id: 1, title: 'Zahnarzt', date: '2026-11-17', allDay: false, start: '08:30', createdAt: ts, updatedAt: ts, ...p });
const at = (h: number, m: number, d = 17) => new Date(2026, 10, d, h, m);

describe('Erinnerungen', () => {
  it('fällig ab Erinnerungszeit bis Beginn', () => {
    const e = [ev({ reminderMin: 60 })];
    expect(dueReminders(e, [], at(7, 29))).toHaveLength(0);
    expect(dueReminders(e, [], at(7, 30))).toHaveLength(1);
    expect(dueReminders(e, [], at(8, 29))[0].key).toBe('e1-2026-11-17');
    expect(dueReminders(e, [], at(8, 30))).toHaveLength(0);
  });

  it('1 Tag vorher, auch für wiederkehrende Termine', () => {
    const e = [ev({ date: '2026-11-03', start: '18:00', reminderMin: 1440, repeat: { kind: 'woechentlich' } })];
    const due = dueReminders(e, [], at(18, 30, 16)); // Mo 18:30 -> Di 18:00
    expect(due.map((d) => d.key)).toEqual(['e1-2026-11-17']);
  });

  it('ohne Erinnerung, erledigte To-dos und ganztägige um 08:00', () => {
    const todos: Todo[] = [
      { id: 5, title: 'Reifen', date: '2026-11-17', time: '17:00', priority: 2, reminderMin: 10, createdAt: ts, updatedAt: ts },
      { id: 6, title: 'Fertig', date: '2026-11-17', time: '17:00', priority: 2, reminderMin: 10, doneAt: ts, createdAt: ts, updatedAt: ts }
    ];
    expect(dueReminders([ev({})], todos, at(16, 55)).map((d) => d.title)).toEqual(['Reifen']);
    expect(dueReminders([ev({ allDay: true, reminderMin: 60 })], [], at(7, 15))).toHaveLength(1);
  });

  it('relative Beschriftung', () => {
    expect(relativeLabel(at(8, 30), at(8, 20))).toBe('in 10 Min');
    expect(relativeLabel(at(9, 35), at(8, 30))).toBe('in 1 Std 5 Min (09:35)');
    expect(relativeLabel(at(8, 30, 18), at(20, 0))).toBe('morgen 08:30');
  });
});

describe('iOS-Kalender-Export (.ics)', () => {
  it('enthält Zeit, Wiederholung und Erinnerung', () => {
    const s = eventToIcs(ev({ end: '09:00', location: 'Praxis, Dr. Weber', reminderMin: 60, repeat: { kind: 'woechentlich', weekdays: [1, 3] }, exceptions: ['2026-11-24'] }), new Date(Date.UTC(2026, 10, 17, 10)));
    expect(s).toContain('DTSTART;TZID=Europe/Berlin:20261117T083000');
    expect(s).toContain('DTEND;TZID=Europe/Berlin:20261117T090000');
    expect(s).toContain('LOCATION:Praxis\\, Dr. Weber');
    expect(s).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU,TH');
    expect(s).toContain('EXDATE;TZID=Europe/Berlin:20261124T083000');
    expect(s).toContain('TRIGGER:-PT60M');
    expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('ganztägig über den Monatswechsel', () => {
    const s = eventToIcs(ev({ allDay: true, date: '2026-11-30' }));
    expect(s).toContain('DTSTART;VALUE=DATE:20261130');
    expect(s).toContain('DTEND;VALUE=DATE:20261201');
  });
});
