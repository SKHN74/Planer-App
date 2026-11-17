import type { CalendarEvent, ISODate, Todo } from '../db/types';
import { occursOn } from './recurrence';

/** Termine an einem Tag: ganztägige zuerst, dann nach Uhrzeit. */
export function eventsOn(events: CalendarEvent[], day: ISODate): CalendarEvent[] {
  return events
    .filter((e) => occursOn(e, day))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.start ?? '').localeCompare(b.start ?? '') || a.title.localeCompare(b.title));
}

export interface TodoView {
  todo: Todo;
  done: boolean;
  /** Ursprüngliches Datum, wenn das To-do vom Vortag übernommen wurde. */
  overdueSince?: ISODate;
}

const doneDay = (t: Todo) => t.doneAt?.slice(0, 10);

/**
 * To-dos für einen Tag.
 * Unerledigte To-dos mit vergangenem Datum wandern auf „heute“ (nicht auf vergangene Tage).
 * Erledigte stehen an dem Tag, an dem sie erledigt wurden – höchstens aber ab ihrem Datum.
 */
export function todosOn(todos: Todo[], day: ISODate, today: ISODate): TodoView[] {
  const out: TodoView[] = [];
  for (const t of todos) {
    if (!t.date) continue;
    if (t.doneAt) {
      const shown = doneDay(t)! > t.date ? doneDay(t)! : t.date;
      if (shown === day) out.push({ todo: t, done: true, overdueSince: shown !== t.date ? t.date : undefined });
    } else if (t.date === day && day >= today) {
      out.push({ todo: t, done: false });
    } else if (day === today && t.date < today) {
      out.push({ todo: t, done: false, overdueSince: t.date });
    } else if (t.date === day && day < today) {
      // vergangener Tag: unerledigtes To-do wird dort nicht mehr gezeigt, es ist auf heute gewandert
    }
  }
  return out.sort((a, b) => Number(a.done) - Number(b.done) || a.todo.priority - b.todo.priority || (a.todo.time ?? '99').localeCompare(b.todo.time ?? '99') || a.todo.title.localeCompare(b.todo.title));
}

/** To-dos ohne Datum („Irgendwann“). */
export function somedayTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => !t.date && !t.doneAt).sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export const PRIORITY_LABEL: Record<number, string> = { 1: 'Hoch', 2: 'Mittel', 3: 'Niedrig' };
