import { useState } from 'react';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { fromKey, toKey } from '../lib/dates';
import { evaluateGoal } from '../lib/goals';
import { fmtKg } from '../lib/sport';
import { bars, bySport, delta, habitRows, hoursLabel, period, shift, totals, type Mode } from '../lib/stats';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import { useTodayKey } from '../useToday';

const km = (n: number) => `${fmtKg(Math.round(n * 10) / 10)} km`;

export default function Statistik() {
  const today = useTodayKey();
  const [mode, setMode] = useState<Mode>('woche');
  const [anchor, setAnchor] = useState(today);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const habits = useLiveQuery(() => db.habits.toArray(), [], []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const goals = useLiveQuery(() => db.goals.filter((g) => g.active).toArray(), [], []);

  const p = period(mode, anchor);
  const running = today >= p.from && today <= p.to;
  const isFuture = p.from > today;
  const prev = period(mode, shift(mode, anchor, -1));
  // laufender Zeitraum: fair mit demselben Stück des Vorzeitraums vergleichen
  const prevTo = running ? toKey(addDays(fromKey(prev.from), Math.min(differenceInCalendarDays(fromKey(today), fromKey(p.from)), prev.days - 1))) : prev.to;
  const cur = totals(workouts, p.from, running ? today : p.to);
  const before = totals(workouts, prev.from, prevTo);
  const chart = bars(mode, p, workouts, today);
  const maxMin = Math.max(30, ...chart.map((b) => b.minutes));
  const sportRows = bySport(workouts, sports, p.from, p.to);
  const maxSport = Math.max(1, ...sportRows.map((r) => r.minutes));
  const hRows = habitRows(habits, habitLogs, p.from, p.to, today);
  const chainSpan = running ? differenceInCalendarDays(fromKey(today), fromKey(p.from)) + 1 : p.days;

  const kpis = [
    { label: 'Einheiten', value: String(cur.count), d: delta(cur.count, before.count, mode, (n) => String(n)) },
    { label: 'Trainingszeit', value: hoursLabel(cur.minutes), d: delta(cur.minutes, before.minutes, mode, hoursLabel) },
    { label: 'Distanz', value: km(cur.km), d: delta(cur.km, before.km, mode, km) },
    mode === 'woche'
      ? { label: 'Kette', value: `${cur.activeDays} / ${chainSpan}`, d: { text: cur.activeDays === chainSpan ? 'alle Tage gehalten' : 'Tage mit Training oder Pause', up: cur.activeDays === chainSpan } }
      : { label: 'Längste Kette', value: `${cur.longestChain} ${cur.longestChain === 1 ? 'Tag' : 'Tage'}`, d: { text: `${cur.activeDays} von ${chainSpan} Tagen aktiv`, up: true } }
  ];

  const goalDay = running ? today : p.to;

  return (
    <main className="screen">
      <header className="screen-header"><h1 className="title">Statistik</h1></header>

      <div className="segmented" role="group" aria-label="Zeitraum">
        <button aria-pressed={mode === 'woche'} onClick={() => { setMode('woche'); setAnchor(today); }}>Woche</button>
        <button aria-pressed={mode === 'monat'} onClick={() => { setMode('monat'); setAnchor(today); }}>Monat</button>
      </div>

      <div className="period-nav">
        <button className="icon-btn" aria-label={mode === 'woche' ? 'Vorige Woche' : 'Voriger Monat'} onClick={() => setAnchor(shift(mode, anchor, -1))}><IconChevronLeft /></button>
        <div className="period-label">
          <strong>{p.label}</strong>
          {running && <span className="small muted">bis heute</span>}
        </div>
        <button className="icon-btn" aria-label={mode === 'woche' ? 'Nächste Woche' : 'Nächster Monat'} disabled={running || isFuture} onClick={() => setAnchor(shift(mode, anchor, 1))}><IconChevronRight /></button>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="l">{k.label}</div>
            <div className="v">{k.value}</div>
            {k.d && <div className="d" style={{ color: k.d.up ? 'var(--green)' : 'var(--orange)' }}>{k.d.text}</div>}
          </div>
        ))}
      </div>

      <section className="card">
        <h2>{mode === 'woche' ? 'Minuten pro Tag' : 'Minuten pro Woche'}</h2>
        <div className="bars" role="img" aria-label={chart.map((b) => `${b.label}: ${b.minutes} Minuten`).join(', ')}>
          {chart.map((b) => (
            <div key={b.label} className="bar-col">
              <span className="bar-v">{b.minutes || ''}</span>
              <span className={'bar' + (b.current ? ' current' : '')} style={{ height: `${Math.round((b.minutes / maxMin) * 110)}px` }} />
              <span className="bar-l">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Nach Sportart</h2>
        {sportRows.length === 0 ? <div className="small muted">Keine Trainings in diesem Zeitraum</div> : sportRows.map((r) => (
          <div key={r.name} className="sport-row">
            <div className="card-head" style={{ marginBottom: 4 }}>
              <strong style={{ fontSize: 15 }}>{r.name}</strong>
              <span className="small muted">{[`${r.count}×`, `${r.minutes} Min`, r.km ? km(r.km) : ''].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="progress"><span style={{ width: `${(r.minutes / maxSport) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      {hRows.length > 0 && !isFuture && (
        <section className="card">
          <h2>Gewohnheiten</h2>
          {hRows.map((r) => (
            <div key={r.name} className="stat-line">
              <span>{r.name}</span>
              <span className="small muted">{r.done} / {r.days} Tage</span>
            </div>
          ))}
        </section>
      )}

      {goals.length > 0 && !isFuture && (
        <section className="card">
          <h2>Ziele</h2>
          {goals.map((g) => {
            const v = evaluateGoal(g, { workouts: workouts.filter((w) => w.date <= goalDay), habits, habitLogs: habitLogs.filter((l) => l.date <= goalDay) }, goalDay);
            return (
              <div key={g.id} className="stat-line">
                <span>{g.title}</span>
                <span className={'pill ' + (v.onTrack ? 'ok' : 'behind')}>{g.type === 'leistung' ? v.valueLabel.split(' · ')[0] : `${Math.round(v.progress * 100)} %`}</span>
              </div>
            );
          })}
          {!running && <p className="small muted" style={{ margin: '8px 0 0' }}>Stand am Ende des Zeitraums.</p>}
        </section>
      )}
    </main>
  );
}
