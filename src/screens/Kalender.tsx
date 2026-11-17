import { useMemo, useState } from 'react';
import { addMonths, isSameMonth } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { eventsOn, todosOn } from '../lib/agenda';
import { plansOn, workoutsOn } from '../lib/sport';
import { PlanItem, WorkoutItem, workoutTitle } from '../components/SportParts';
import { formatLong, formatMonth, fromKey, monthGrid, toKey } from '../lib/dates';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import { useEditor } from '../components/Editor';
import { TestBadge, TodoRow, eventTimeLabel } from '../components/AgendaParts';
import { useTodayKey } from '../useToday';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_CHIPS = 3;

interface Chip { key: string; label: string; cls: string; dot?: string }

export default function Kalender() {
  const todayKey = useTodayKey();
  const today = fromKey(todayKey);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayKey);
  const grid = useMemo(() => monthGrid(month.getFullYear(), month.getMonth()), [month]);
  const [name, year] = formatMonth(month).split(' ');
  const editor = useEditor();
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const todos = useLiveQuery(() => db.todos.toArray(), [], []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const sessions = useLiveQuery(() => db.planSessions.toArray(), [], []);
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);

  const chipsFor = (k: string): Chip[] => [
    ...eventsOn(events, k).map((e) => e.allDay
      ? { key: 'e' + e.id, label: e.title, cls: 'fill-blue' }
      : { key: 'e' + e.id, label: e.title, cls: '', dot: 'var(--blue)' }),
    ...workoutsOn(workouts, k).map((w) => ({ key: 'w' + w.id, label: workoutTitle(w, sports, programs), cls: w.isRestDay ? '' : 'fill-green', dot: w.isRestDay ? 'var(--muted)' : undefined })),
    ...plansOn(sessions, workouts, k).filter((p) => !p.done).map((p) => ({ key: 'p' + p.session.id, label: p.session.title, cls: '', dot: 'var(--green)' })),
    ...todosOn(todos, k, todayKey).filter((t) => !t.done).map((t) => ({ key: 't' + t.todo.id, label: t.todo.title, cls: '', dot: 'var(--orange)' }))
  ];

  const goToday = () => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(todayKey); };
  const selEvents = eventsOn(events, selected);
  const selTodos = todosOn(todos, selected, todayKey);
  const selPlans = plansOn(sessions, workouts, selected).filter((p) => !p.done);
  const selWorkouts = workoutsOn(workouts, selected);

  return (
    <main className="screen">
      <header className="screen-header">
        <h1 className="title" style={{ fontSize: 24, flex: 1, whiteSpace: 'nowrap' }}>{name} <span className="muted" style={{ fontWeight: 500 }}>{year}</span></h1>
        <button className="icon-btn" aria-label="Voriger Monat" onClick={() => setMonth(addMonths(month, -1))}><IconChevronLeft /></button>
        <button className="icon-btn" aria-label="Nächster Monat" onClick={() => setMonth(addMonths(month, 1))}><IconChevronRight /></button>
        <button className="btn secondary" style={{ minHeight: 36 }} onClick={goToday}>Heute</button>
      </header>

      <div className="calendar-card" role="grid" aria-label={formatMonth(month)}>
        <div className="month-head"><span>KW</span>{WD.map((w) => <span key={w}>{w}</span>)}</div>
        {grid.map((w) => (
          <div className="month-week" role="row" key={toKey(w.days[0])}>
            <span className="month-kw">{w.kw}</span>
            {w.days.map((d) => {
              const k = toKey(d);
              const chips = chipsFor(k);
              const cls = ['day-num', isSameMonth(d, month) ? '' : 'other', k === todayKey ? 'today' : ''].join(' ');
              return (
                <button key={k} role="gridcell" className="month-day" aria-selected={k === selected} aria-label={`${formatLong(d)}, ${chips.length} Einträge`}
                  onClick={() => setSelected(k)} onDoubleClick={() => editor.create(k)}>
                  <span className={cls}>{d.getDate()}</span>
                  {chips.slice(0, MAX_CHIPS).map((c) => (
                    <span key={c.key} className={'cal-chip ' + c.cls}>
                      {c.dot && <span className="dot" style={{ background: c.dot }} />}
                      <span className="lbl">{c.label}</span>
                    </span>
                  ))}
                  {chips.length > MAX_CHIPS && <span className="more">+{chips.length - MAX_CHIPS}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <section>
        <div className="card-head" style={{ margin: '4px 4px 10px' }}>
          <h2 style={{ fontSize: 18 }}>{formatLong(fromKey(selected))}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selEvents.length === 0 && selTodos.length === 0 && selPlans.length === 0 && selWorkouts.length === 0 && <div className="empty">Keine Einträge</div>}
          {selEvents.map((e) => (
            <button key={e.id} className="agenda-item" onClick={() => editor.editEvent(selected, e)}>
              <span className="dot" style={{ background: 'var(--blue)' }} />
              <span className="time">{eventTimeLabel(e)}</span>
              <span className="ttl">{e.title}</span>
              <TestBadge show={e.isDemo} />
            </button>
          ))}
          {selPlans.map((p) => <PlanItem key={'p' + p.session.id} s={p.session} sports={sports} onOpen={() => editor.editPlan(selected, p.session)} onDone={() => editor.editWorkout(selected, undefined, p.session)} />)}
          {selWorkouts.map((w) => <WorkoutItem key={'w' + w.id} w={w} sports={sports} programs={programs} onOpen={() => editor.editWorkout(selected, w)} />)}
          {selTodos.length > 0 && <div className="card" style={{ padding: '4px 14px' }}>{selTodos.map((v) => <TodoRow key={v.todo.id} v={v} onOpen={() => editor.editTodo(selected, v.todo)} />)}</div>}
          <button className="btn block" onClick={() => editor.create(selected)}>+ Neuer Eintrag</button>
        </div>
      </section>
    </main>
  );
}
