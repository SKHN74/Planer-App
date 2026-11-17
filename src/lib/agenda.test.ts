import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Todo } from '../db/types';
import { eventsOn, somedayTodos, todosOn } from './agenda';

const ts = '2026-11-01T00:00:00.000Z';
const todo = (p: Partial<Todo>): Todo => ({ title: 'x', priority: 2, createdAt: ts, updatedAt: ts, ...p });
const ev = (p: Partial<CalendarEvent>): CalendarEvent => ({ title: 'x', date: '2026-11-17', allDay: false, createdAt: ts, updatedAt: ts, ...p });

describe('To-dos', () => {
  const today = '2026-11-17';
  const list = [
    todo({ id: 1, title: 'Steuer', date: '2026-11-16', priority: 1 }),
    todo({ id: 2, title: 'Geschenk', date: '2026-11-17' }),
    todo({ id: 3, title: 'Reifen', date: '2026-11-19', priority: 3 }),
    todo({ id: 4, title: 'Erledigt gestern', date: '2026-11-16', doneAt: '2026-11-16T18:00:00.000Z' }),
    todo({ id: 5, title: 'Spät erledigt', date: '2026-11-15', doneAt: '2026-11-17T08:00:00.000Z' }),
    todo({ id: 6, title: 'Irgendwann' })
  ];

  it('unerledigte wandern auf heute und sind als überfällig markiert', () => {
    const v = todosOn(list, today, today);
    expect(v.map((x) => x.todo.title)).toEqual(['Steuer', 'Geschenk', 'Spät erledigt']);
    expect(v[0].overdueSince).toBe('2026-11-16');
    expect(v[2].done).toBe(true);
  });

  it('vergangene Tage zeigen nur dort Erledigtes', () => {
    expect(todosOn(list, '2026-11-16', today).map((x) => x.todo.title)).toEqual(['Erledigt gestern']);
    expect(todosOn(list, '2026-11-15', today)).toEqual([]);
  });

  it('zukünftige Tage', () => {
    expect(todosOn(list, '2026-11-19', today).map((x) => x.todo.title)).toEqual(['Reifen']);
  });

  it('Irgendwann-Liste', () => {
    expect(somedayTodos(list).map((x) => x.title)).toEqual(['Irgendwann']);
  });
});

describe('Termine', () => {
  it('ganztägig zuerst, dann nach Uhrzeit, mit Wiederholung', () => {
    const list = [
      ev({ title: 'Mittag', start: '12:00' }),
      ev({ title: 'Geburtstag', allDay: true }),
      ev({ title: 'Zahnarzt', start: '08:30' }),
      ev({ title: 'Yoga', date: '2026-11-10', start: '07:00', repeat: { kind: 'woechentlich' } }),
      ev({ title: 'Morgen', date: '2026-11-18' })
    ];
    expect(eventsOn(list, '2026-11-17').map((e) => e.title)).toEqual(['Geburtstag', 'Yoga', 'Zahnarzt', 'Mittag']);
  });
});
