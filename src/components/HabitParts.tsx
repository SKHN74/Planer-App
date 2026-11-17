import { useState } from 'react';
import { addDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Habit, HabitKind } from '../db/types';
import { fromKey, toKey, weekdayShort } from '../lib/dates';
import { chainDays, chainLength, habitStreak, isDone, logValue, setHabitValue } from '../lib/habits';
import { Sheet } from './Sheet';

const CHECK = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function HabitsCard({ day, today }: { day: string; today: string }) {
  const habits = useLiveQuery(() => db.habits.orderBy('order').filter((h) => h.active).toArray(), [], []);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  if (habits.length === 0) return null;
  const doneCount = habits.filter((h) => isDone(h, logValue(logs, h.id!, day))).length;
  return (
    <section className="card">
      <div className="card-head"><h2>Gewohnheiten</h2><span className="small muted">{doneCount} von {habits.length}</span></div>
      {habits.map((h) => {
        const v = logValue(logs, h.id!, day);
        const done = isDone(h, v);
        const s = day === today ? habitStreak(h, logs, today) : 0;
        const sub = [h.hint, s >= 2 ? `${s} Tage am Stück` : ''].filter(Boolean).join(' · ');
        return (
          <div key={h.id} className={'todo-row habit-row'}>
            {h.kind === 'abhaken' ? (
              <button className="check habit-check" role="checkbox" aria-checked={done} aria-label={`${h.name} erledigt`} onClick={() => setHabitValue(db, h.id!, day, done ? 0 : 1)}>{done && CHECK}</button>
            ) : (
              <span className={'habit-ring' + (done ? ' done' : '')} aria-hidden="true">{done ? CHECK : v}</span>
            )}
            <div className="todo-text" style={{ padding: '6px 0' }}>
              <div className="t">{h.name}</div>
              {sub && <div className="s">{sub}</div>}
            </div>
            {h.kind === 'zaehler' && (
              <div className="stepper" role="group" aria-label={h.name}>
                <button aria-label={`${h.name} weniger`} disabled={v <= 0} onClick={() => setHabitValue(db, h.id!, day, v - 1)}>−</button>
                <span className="count" aria-live="polite">{v}/{h.target ?? 1}</span>
                <button aria-label={`${h.name} mehr`} onClick={() => setHabitValue(db, h.id!, day, v + 1)}>+</button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** Kette: Tage am Stück mit Training oder bewusster Pause. */
export function ChainCard({ today }: { today: string }) {
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const n = chainLength(workouts, today);
  const days = chainDays(workouts);
  const last14 = Array.from({ length: 14 }, (_, i) => toKey(addDays(fromKey(today), i - 13)));
  const todayOpen = !days.has(today);
  const yesterdayMissed = !days.has(toKey(addDays(fromKey(today), -1)));

  async function restDay() {
    const other = (await db.sportTypes.where('name').equals('Sonstiges').first()) ?? (await db.sportTypes.toCollection().first());
    const ts = now();
    await db.workouts.add({ sportTypeId: other?.id ?? 0, date: today, durationMin: 0, isRestDay: true, createdAt: ts, updatedAt: ts });
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Kette</h2>
        <span className="chain-count"><strong>{n}</strong> {n === 1 ? 'Tag' : 'Tage'}</span>
      </div>
      <div className="chain" aria-label="Letzte 14 Tage">
        {last14.map((k) => (
          <span key={k} className={'chain-day' + (days.has(k) ? ' on' : '') + (k === today ? ' today' : '')} title={k}>
            <span className="small">{weekdayShort(fromKey(k)).slice(0, 1)}</span>
          </span>
        ))}
      </div>
      {todayOpen && (
        <>
          <p className="small" style={{ margin: '10px 0 0', color: yesterdayMissed ? 'var(--orange)' : 'var(--muted)' }}>
            {yesterdayMissed ? 'Gestern ausgelassen – nie zweimal hintereinander. Heute trainieren oder bewusst pausieren.' : 'Heute noch offen: Training oder bewusste Pause hält die Kette.'}
          </p>
          <button className="btn secondary block" style={{ marginTop: 10 }} onClick={restDay}>Heute bewusste Pause</button>
        </>
      )}
    </section>
  );
}

export function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [hint, setHint] = useState(habit?.hint ?? '');
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'abhaken');
  const [target, setTarget] = useState(String(habit?.target ?? 8));
  const [unit, setUnit] = useState(habit?.unitLabel ?? '');
  const canSave = !!name.trim() && (kind === 'abhaken' || Number(target) > 0);

  async function save() {
    if (!canSave) return;
    const data = {
      name: name.trim(), hint: hint.trim() || undefined, kind,
      target: kind === 'zaehler' ? Math.round(Number(target)) : undefined,
      unitLabel: kind === 'zaehler' ? unit.trim() || undefined : undefined, updatedAt: now()
    };
    if (habit?.id) await db.habits.update(habit.id, data);
    else {
      const last = await db.habits.orderBy('order').last();
      await db.habits.add({ ...data, active: true, order: (last?.order ?? 0) + 1, createdAt: now() });
    }
    onClose();
  }

  async function remove() {
    if (!habit?.id) return;
    await db.transaction('rw', db.habits, db.habitLogs, async () => {
      await db.habitLogs.where('[habitId+date]').between([habit.id!, ''], [habit.id!, '￿']).delete();
      await db.habits.delete(habit.id!);
    });
    onClose();
  }

  return (
    <Sheet title={habit ? 'Gewohnheit' : 'Neue Gewohnheit'} onClose={onClose} canSave={canSave} onSave={save}>
      <div className="field-group">
        <input className="title-input" placeholder="Name, z. B. Dehnen" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!habit} />
        <label className="field"><span>Hinweis</span><input placeholder="optional, z. B. 10 Minuten" value={hint} onChange={(e) => setHint(e.target.value)} /></label>
      </div>
      <div className="segmented" role="group" aria-label="Art">
        <button aria-pressed={kind === 'abhaken'} onClick={() => setKind('abhaken')}>Abhaken</button>
        <button aria-pressed={kind === 'zaehler'} onClick={() => setKind('zaehler')}>Zählen</button>
      </div>
      {kind === 'zaehler' && (
        <div className="field-group">
          <label className="field"><span>Tagesziel</span><input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          <label className="field"><span>Einheit</span><input placeholder="z. B. Gläser" value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
        </div>
      )}
      {habit && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={remove}>Gewohnheit löschen</button>}
      {habit && <p className="small muted" style={{ margin: '-8px 4px 0' }}>Löschen entfernt auch alle Häkchen dieser Gewohnheit. Wenn du sie nur pausieren willst, schalte sie in der Liste aus.</p>}
    </Sheet>
  );
}

export function HabitSettings() {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], []);
  const [open, setOpen] = useState<{ habit?: Habit } | null>(null);
  return (
    <section>
      <div className="section-label">Gewohnheiten</div>
      <div className="list">
        {habits.map((h) => (
          <div key={h.id} className="row">
            <button className="link-btn" style={{ color: 'var(--text)', padding: 0, textAlign: 'left', flex: 1 }} onClick={() => setOpen({ habit: h })}>
              {h.name}{h.kind === 'zaehler' && <span className="small muted"> · {h.target} {h.unitLabel ?? ''}</span>}
            </button>
            <input type="checkbox" className="switch" aria-label={`${h.name} anzeigen`} checked={h.active} onChange={(e) => db.habits.update(h.id!, { active: e.target.checked, updatedAt: now() })} />
          </div>
        ))}
        <button className="row" style={{ color: 'var(--accent)', fontWeight: 600 }} onClick={() => setOpen({})}>+ Gewohnheit hinzufügen</button>
      </div>
      {open && <HabitForm key={open.habit?.id ?? 'new'} habit={open.habit} onClose={() => setOpen(null)} />}
    </section>
  );
}
