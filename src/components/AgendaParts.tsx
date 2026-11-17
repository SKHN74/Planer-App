import { db, now } from '../db/db';
import type { CalendarEvent } from '../db/types';
import { PRIORITY_LABEL, type TodoView } from '../lib/agenda';
import { formatShort, fromKey, weekdayShort } from '../lib/dates';

export function TestBadge({ show }: { show?: boolean }) {
  return show ? <span className="test-badge">TEST</span> : null;
}

export function eventTimeLabel(e: CalendarEvent): string {
  if (e.allDay) return 'ganztägig';
  return e.end ? `${e.start}–${e.end}` : e.start ?? '';
}

export function TodoRow({ v, onOpen }: { v: TodoView; onOpen: () => void }) {
  const t = v.todo;
  const toggle = () => db.todos.update(t.id!, { doneAt: v.done ? undefined : now(), updatedAt: now() });
  const sub = v.overdueSince
    ? (v.done ? 'erledigt, geplant war ' : 'überfällig seit ') + weekdayShort(fromKey(v.overdueSince)) + ', ' + formatShort(fromKey(v.overdueSince)).slice(0, 6)
    : t.time ? t.time + ' Uhr' : '';
  return (
    <div className={'todo-row' + (v.done ? ' done' : '')}>
      <button className="check" role="checkbox" aria-checked={v.done} aria-label={`${t.title} erledigt`} onClick={toggle}>
        {v.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
      </button>
      <button className="todo-text" onClick={onOpen}>
        <div className="t">{t.title}</div>
        {sub && <div className={'s' + (v.overdueSince && !v.done ? ' over' : '')}>{sub}</div>}
      </button>
      <span className={'prio prio-' + t.priority}>{PRIORITY_LABEL[t.priority]}</span>
      <TestBadge show={t.isDemo} />
    </div>
  );
}
