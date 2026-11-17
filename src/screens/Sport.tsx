import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Exercise, Measurement, Program } from '../db/types';
import { formatShort, fromKey, isoWeek } from '../lib/dates';
import { activeRun, fmtKg, plansOn, weekSummary } from '../lib/sport';
import { runWeek } from '../lib/programs';
import { useEditor } from '../components/Editor';
import { TestBadge } from '../components/AgendaParts';
import { ExerciseSheet, MeasurementForm, PlanItem, StartProgramSheet, WorkoutItem } from '../components/SportParts';
import { useTodayKey } from '../useToday';

type Open = { kind: 'start'; program: Program } | { kind: 'measure'; measurement?: Measurement } | { kind: 'exercise'; ex: Exercise };

export default function Sport() {
  const today = useTodayKey();
  const editor = useEditor();
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const sessions = useLiveQuery(() => db.planSessions.toArray(), [], []);
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);
  const runs = useLiveQuery(() => db.programRuns.toArray(), [], []);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);
  const measurements = useLiveQuery(() => db.measurements.toArray(), [], []);
  const [open, setOpen] = useState<Open | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showExercises, setShowExercises] = useState(false);

  const week = weekSummary(workouts, today);
  const todayPlans = plansOn(sessions, workouts, today).filter((p) => !p.done);
  const recent = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0)).slice(0, 8);
  const upcoming = sessions.filter((s) => s.repeat ? !s.repeat.until || s.repeat.until >= today : s.date >= today);

  const run = activeRun(runs);
  const program = run ? programs.find((p) => p.id === run.programId) : undefined;
  const wk = run ? runWeek(run.startDate, today) : 0;
  const runMeasurements = run ? measurements.filter((m) => m.programRunId === run.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const measureDue = !!program?.measureEveryWeeks && wk >= 1 && (wk - 1) % program.measureEveryWeeks === 0 && !runMeasurements.some((m) => runWeek(run!.startDate, m.date) === wk);

  async function setLevel(ladderId: number, level: number) {
    if (!run?.id) return;
    await db.programRuns.update(run.id, { ladderLevels: { ...run.ladderLevels, [ladderId]: level }, updatedAt: now() });
  }
  async function finishRun() {
    if (run?.id) await db.programRuns.update(run.id, { finishedAt: now(), updatedAt: now() });
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <div>
          <div className="eyebrow">KW {isoWeek(fromKey(today))}</div>
          <h1 className="title">Sport</h1>
        </div>
      </header>

      <section className="card">
        <h2>Diese Woche</h2>
        <div className="stat-row">
          <div className="stat"><div className="v">{week.count}</div><div className="l">Trainings</div></div>
          <div className="stat"><div className="v">{week.minutes}</div><div className="l">Minuten</div></div>
          <div className="stat"><div className="v">{fmtKg(Math.round(week.km * 10) / 10)}</div><div className="l">km</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button className="btn" style={{ background: 'var(--green)', color: 'var(--on-green)' }} onClick={() => editor.editWorkout(today)}>Eintragen</button>
          <button className="btn secondary" onClick={() => editor.editPlan(today)}>Planen</button>
        </div>
      </section>

      {todayPlans.length > 0 && (
        <section>
          <div className="section-label">Heute geplant</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayPlans.map((p) => <PlanItem key={p.session.id} s={p.session} sports={sports} onOpen={() => editor.editPlan(today, p.session)} onDone={() => editor.editWorkout(today, undefined, p.session)} />)}
          </div>
        </section>
      )}

      {run && program ? (
        <section className="card">
          <div className="card-head">
            <h2>{program.name}</h2>
            <span className="small muted">{wk < 1 ? `startet ${formatShort(fromKey(run.startDate))}` : wk > program.weeks ? 'geschafft' : `Woche ${wk} von ${program.weeks}`}</span>
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={program.weeks} aria-valuenow={Math.max(0, Math.min(wk, program.weeks))}>
            <span style={{ width: `${Math.max(0, Math.min(1, wk / program.weeks)) * 100}%` }} />
          </div>

          {program.ladders.map((l) => {
            const lvl = Math.min(run.ladderLevels[l.id] ?? 0, l.steps.length - 1);
            const step = l.steps[lvl];
            return (
              <div key={l.id} className="ladder">
                <div className="body">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{l.name} · Stufe {lvl + 1}/{l.steps.length}</div>
                  <div className="small muted">{step.name} – Ziel {step.target}</div>
                </div>
                <div className="stepper">
                  <button aria-label={`${l.name} eine Stufe zurück`} disabled={lvl === 0} onClick={() => setLevel(l.id, lvl - 1)}>−</button>
                  <button aria-label={`${l.name} nächste Stufe`} disabled={lvl >= l.steps.length - 1} onClick={() => setLevel(l.id, lvl + 1)}>+</button>
                </div>
              </div>
            );
          })}

          {program.measurements.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <div className="card-head" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: 15 }}>Messungen</strong>
                <button className="link-btn" style={{ minHeight: 36, fontSize: 15 }} onClick={() => setOpen({ kind: 'measure' })}>+ Messen</button>
              </div>
              {measureDue && <div className="banner" style={{ marginBottom: 6 }}>Diese Woche ist Messwoche.</div>}
              {runMeasurements.length === 0 ? <div className="small muted">Noch keine Messung – am besten gleich in Woche 1.</div> :
                runMeasurements.slice(0, 3).map((m) => (
                  <button key={m.id} className="row" style={{ padding: 0, minHeight: 40 }} onClick={() => setOpen({ kind: 'measure', measurement: m })}>
                    <span className="small">{formatShort(fromKey(m.date))} · Woche {runWeek(run.startDate, m.date)}</span>
                    <span className="small muted" style={{ textAlign: 'right' }}>{Object.entries(m.values).filter(([, v]) => typeof v === 'number').slice(0, 2).map(([k, v]) => `${k.replace(/\s*\(.*\)/, '')} ${fmtKg(v as number)}`).join(' · ')}</span>
                  </button>
                ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {program.rules.length > 0 && <button className="btn secondary" style={{ flex: 1 }} onClick={() => setShowRules(!showRules)}>{showRules ? 'Regeln ausblenden' : 'Regeln'}</button>}
            <button className="btn secondary" style={{ flex: 1 }} onClick={finishRun}>Beenden</button>
          </div>
          {showRules && <ul className="rules" style={{ marginTop: 10 }}>{program.rules.map((r) => <li key={r}>{r}</li>)}</ul>}
        </section>
      ) : (
        <section>
          <div className="section-label">Programme</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {programs.length === 0 && <div className="empty">Noch kein Programm</div>}
            {programs.map((p) => (
              <div key={p.id} className="card">
                <div className="card-head"><h2>{p.name} · {p.weeks} Wochen</h2><TestBadge show={p.isDemo} /></div>
                <div className="small muted">Vorlagen {p.units.map((u) => u.name).join(', ')}{p.ladders.length ? ` · ${p.ladders.length} Leitern` : ''}{p.measurements.length ? ' · Messungen' : ''}</div>
                <button className="btn block" style={{ marginTop: 12 }} onClick={() => setOpen({ kind: 'start', program: p })}>Programm starten · Startdatum wählen</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="section-label">Trainingsplan</div>
          <div className="list">
            {upcoming.map((s) => (
              <button key={s.id} className="row" onClick={() => editor.editPlan(s.date, s)}>
                <span>{s.title} <TestBadge show={s.isDemo} /></span>
                <span className="small muted">{s.repeat ? (s.repeat.weekdays ?? []).map((d) => ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][d]).join(', ') : formatShort(fromKey(s.date))}{s.time ? ` · ${s.time}` : ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-label">Letzte Einträge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.length === 0 && <div className="empty">Noch keine Trainings eingetragen</div>}
          {recent.map((w) => <WorkoutItem key={w.id} w={w} sports={sports} programs={programs} showDate onOpen={() => editor.editWorkout(w.date, w)} />)}
        </div>
      </section>

      <section>
        <div className="list">
          <button className="row" style={{ fontWeight: 600 }} aria-expanded={showExercises} onClick={() => setShowExercises(!showExercises)}>
            <span>Übungen</span><span className="small muted">{exercises.length} · {showExercises ? 'ausblenden' : 'anzeigen'}</span>
          </button>
        </div>
        {showExercises && (
          <div className="list" style={{ marginTop: 8 }}>
            {exercises.map((ex) => (
              <button key={ex.id} className="row" onClick={() => setOpen({ kind: 'exercise', ex })}>
                <span>{ex.name}</span><span className="small muted" style={{ textAlign: 'right' }}>{ex.muscles}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {open?.kind === 'start' && <StartProgramSheet program={open.program} today={today} onClose={() => setOpen(null)} />}
      {open?.kind === 'measure' && run && program && <MeasurementForm program={program} run={run} measurement={open.measurement} today={today} onClose={() => setOpen(null)} />}
      {open?.kind === 'exercise' && <ExerciseSheet ex={open.ex} onClose={() => setOpen(null)} />}
    </main>
  );
}
