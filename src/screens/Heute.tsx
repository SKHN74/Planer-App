import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { eventsOn, todosOn } from '../lib/agenda';
import { plansOn, workoutsOn } from '../lib/sport';
import { PlanItem, WorkoutItem } from '../components/SportParts';
import { fromKey, isoWeek, toKey, weekDays, weekdayShort } from '../lib/dates';
import { DemoBanner } from '../components/DemoBanner';
import { IconGear } from '../components/icons';
import { useEditor } from '../components/Editor';
import { TestBadge, TodoRow, eventTimeLabel } from '../components/AgendaParts';
import { useNow } from '../useToday';

export default function Heute() {
  const nowDate = useNow();
  const todayKey = toKey(nowDate);
  const [dayKey, setDayKey] = useState(todayKey);
  const day = fromKey(dayKey);
  const editor = useEditor();
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const todos = useLiveQuery(() => db.todos.toArray(), [], []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const sessions = useLiveQuery(() => db.planSessions.toArray(), [], []);
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);

  const dayEvents = eventsOn(events, dayKey);
  const dayTodos = todosOn(todos, dayKey, todayKey);
  const dayPlans = plansOn(sessions, workouts, dayKey).filter((p) => !p.done);
  const dayWorkouts = workoutsOn(workouts, dayKey);
  const openCount = dayTodos.filter((t) => !t.done).length;
  const nowHM = format(nowDate, 'HH:mm');
  const isToday = dayKey === todayKey;
  // Position der Jetzt-Linie: vor dem ersten Termin, der noch nicht begonnen hat
  const nowIndex = isToday ? dayEvents.findIndex((e) => !e.allDay && (e.start ?? '') > nowHM) : -1;

  return (
    <main className="screen">
      <header className="screen-header">
        <div>
          <div className="eyebrow">{format(day, 'd. MMMM', { locale: de })} · KW {isoWeek(day)}</div>
          <h1 className="title">{format(day, 'EEEE', { locale: de })}</h1>
        </div>
        <a href="#/einstellungen" className="icon-btn" aria-label="Einstellungen"><IconGear /></a>
      </header>
      <DemoBanner />

      <div className="week-strip">
        {weekDays(day).map((d) => {
          const k = toKey(d);
          const hasEv = eventsOn(events, k).length > 0;
          const hasTodo = todosOn(todos, k, todayKey).some((t) => !t.done);
          const hasSport = workoutsOn(workouts, k).length > 0 || plansOn(sessions, workouts, k).length > 0;
          return (
            <button key={k} className={'week-day' + (k === todayKey ? ' today' : '')} aria-pressed={k === dayKey} aria-label={format(d, 'EEEE, d. MMMM', { locale: de })} onClick={() => setDayKey(k)}>
              <span className="wd">{weekdayShort(d)}</span>
              <span className="n">{d.getDate()}</span>
              <span className="dots">
                <span style={{ background: hasEv ? (k === dayKey ? 'currentColor' : 'var(--blue)') : 'transparent' }} />
                <span style={{ background: hasTodo ? (k === dayKey ? 'currentColor' : 'var(--orange)') : 'transparent' }} />
                <span style={{ background: hasSport ? (k === dayKey ? 'currentColor' : 'var(--green)') : 'transparent' }} />
              </span>
            </button>
          );
        })}
      </div>
      {!isSameDay(day, nowDate) && <button className="btn secondary" onClick={() => setDayKey(todayKey)}>Zurück zu heute</button>}

      <section className="card">
        <h2>Termine</h2>
        {dayEvents.length === 0 ? <div className="empty">Keine Termine</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayEvents.map((e, i) => (
              <div key={e.id} style={{ display: 'contents' }}>
                {i === nowIndex && <div className="now-line"><span>{nowHM}</span><span /></div>}
                <div className="event-row">
                  <div className="event-time">{e.allDay ? '' : e.start}</div>
                  <button className="event-box" onClick={() => editor.editEvent(dayKey, e)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}><strong>{e.title}</strong><TestBadge show={e.isDemo} /></div>
                    <div className="meta">{[eventTimeLabel(e), e.location].filter(Boolean).join(' · ')}</div>
                  </button>
                </div>
              </div>
            ))}
            {isToday && nowIndex === -1 && dayEvents.some((e) => !e.allDay) && <div className="now-line"><span>{nowHM}</span><span /></div>}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>To-dos</h2><span className="small muted">{openCount} offen</span></div>
        {dayTodos.length === 0 ? <div className="empty">Nichts zu tun</div> :
          dayTodos.map((v) => <TodoRow key={v.todo.id} v={v} onOpen={() => editor.editTodo(dayKey, v.todo)} />)}
        <button className="btn secondary block" style={{ marginTop: 10 }} onClick={() => editor.editTodo(dayKey)}>+ To-do</button>
        <a href="#/irgendwann" className="small" style={{ display: 'block', textAlign: 'center', marginTop: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>To-dos ohne Datum</a>
      </section>

      <section className="card">
        <h2>{isToday ? 'Training heute' : 'Training'}</h2>
        {dayPlans.length === 0 && dayWorkouts.length === 0 ? <div className="empty">Kein Training geplant</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayPlans.map((p) => <PlanItem key={'p' + p.session.id} s={p.session} sports={sports} onOpen={() => editor.editPlan(dayKey, p.session)} onDone={() => editor.editWorkout(dayKey, undefined, p.session)} />)}
            {dayWorkouts.map((w) => <WorkoutItem key={w.id} w={w} sports={sports} programs={programs} onOpen={() => editor.editWorkout(dayKey, w)} />)}
          </div>
        )}
        <button className="btn secondary block" style={{ marginTop: 10 }} onClick={() => editor.editWorkout(dayKey)}>+ Training</button>
      </section>

      <button className="fab" aria-label="Neuer Eintrag" onClick={() => editor.create(dayKey)}>+</button>
    </main>
  );
}
