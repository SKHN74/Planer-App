import { useState } from 'react';
import { db, now } from '../db/db';
import type { Exercise, Measurement, PlanSession, Program, ProgramRun, SportType, Workout } from '../db/types';
import { formatShort, fromKey } from '../lib/dates';
import { INTENSITY_LABEL, durationLabel, fmtKg } from '../lib/sport';
import { TestBadge } from './AgendaParts';
import { ExerciseDetails } from './WorkoutForm';
import { Sheet } from './Sheet';

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export function workoutSubtitle(w: Workout): string {
  if (w.isRestDay) return 'Erholung zählt für die Kette';
  return [w.time, durationLabel(w.durationMin), w.distanceKm ? `${fmtKg(w.distanceKm)} km` : '', w.intensity ? INTENSITY_LABEL[w.intensity] : '', w.sets?.length ? `${w.sets.length} ${w.sets.length === 1 ? 'Satz' : 'Sätze'}` : '']
    .filter(Boolean).join(' · ');
}

export function workoutTitle(w: Workout, sports: SportType[], programs: Program[]): string {
  if (w.isRestDay) return 'Bewusste Pause';
  const unit = programs.find((p) => p.id === w.programId)?.units.find((u) => u.id === w.unitTemplateId);
  return unit?.name ?? sports.find((s) => s.id === w.sportTypeId)?.name ?? 'Training';
}

export function WorkoutItem({ w, sports, programs, showDate, onOpen }: { w: Workout; sports: SportType[]; programs: Program[]; showDate?: boolean; onOpen: () => void }) {
  const title = workoutTitle(w, sports, programs);
  return (
    <button className="workout-item" onClick={onOpen}>
      <span className="ic" aria-hidden="true">{w.isRestDay ? '–' : '✓'}</span>
      <span className="body">
        <div className="t">{title}</div>
        <div className="s">{[showDate ? formatShort(fromKey(w.date)).slice(0, 6) : '', workoutSubtitle(w)].filter(Boolean).join(' · ')}</div>
      </span>
      <TestBadge show={w.isDemo} />
    </button>
  );
}

export function PlanItem({ s, sports, onDone, onOpen }: { s: PlanSession; sports: SportType[]; onDone: () => void; onOpen: () => void }) {
  const sport = sports.find((x) => x.id === s.sportTypeId)?.name ?? '';
  return (
    <div className="workout-item">
      <span className="ic plan" aria-hidden="true">{initials(sport || s.title)}</span>
      <button className="body" style={{ border: 'none', background: 'transparent', textAlign: 'left', padding: 0, color: 'inherit' }} onClick={onOpen}>
        <div className="t">{s.title}</div>
        <div className="s">{['geplant', s.time, s.targetDurationMin ? durationLabel(s.targetDurationMin) : ''].filter(Boolean).join(' · ')}</div>
      </button>
      <TestBadge show={s.isDemo} />
      <button className="btn" style={{ minHeight: 36, padding: '0 12px', background: 'var(--green)', color: 'var(--on-green)' }} onClick={onDone}>Eintragen</button>
    </div>
  );
}

export function StartProgramSheet({ program, today, onClose }: { program: Program; today: string; onClose: () => void }) {
  const [start, setStart] = useState(today);
  async function go() {
    const ts = now();
    await db.programRuns.add({ programId: program.id!, startDate: start, ladderLevels: {}, createdAt: ts, updatedAt: ts, isDemo: program.isDemo });
    onClose();
  }
  return (
    <Sheet title={program.name} onClose={onClose} onSave={go} saveLabel="Starten">
      <div className="field-group">
        <label className="field"><span>Startdatum</span><input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></label>
      </div>
      <p className="small muted" style={{ margin: '0 4px' }}>
        {program.weeks} Wochen ab dem Startdatum. Deine Trainings trägst du selbst ein – die Vorlagen {program.units.map((u) => u.name).join(', ')} stehen dabei zur Auswahl.
        Wenn du feste Trainingstage willst, leg sie unter „Training planen“ an.
      </p>
      {program.rules.length > 0 && (
        <div className="card">
          <h2>Regeln</h2>
          <ul className="rules">{program.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </Sheet>
  );
}

export function MeasurementForm({ program, run, measurement, today, onClose }: { program: Program; run: ProgramRun; measurement?: Measurement; today: string; onClose: () => void }) {
  const [date, setDate] = useState(measurement?.date ?? today);
  const [vals, setVals] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(program.measurements.map((m) => {
      const v = measurement?.values[m];
      return [m, typeof v === 'boolean' ? v : v != null ? fmtKg(v) : isFlag(m) ? false : ''];
    })));
  async function save() {
    const values: Record<string, number | boolean> = {};
    for (const [k, v] of Object.entries(vals)) {
      if (typeof v === 'boolean') values[k] = v;
      else if (v.trim()) { const n = Number(v.replace(',', '.')); if (Number.isFinite(n)) values[k] = n; }
    }
    const ts = now();
    if (measurement?.id) await db.measurements.update(measurement.id, { date, values, updatedAt: ts });
    else await db.measurements.add({ programRunId: run.id, date, values, createdAt: ts, updatedAt: ts, isDemo: run.isDemo });
    onClose();
  }
  return (
    <Sheet title="Messung" onClose={onClose} onSave={save}>
      <div className="field-group">
        <label className="field"><span>Datum</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        {program.measurements.map((m) => (
          <label key={m} className="field">
            <span>{m}</span>
            {typeof vals[m] === 'boolean'
              ? <input type="checkbox" className="switch" checked={vals[m] as boolean} onChange={(e) => setVals({ ...vals, [m]: e.target.checked })} />
              : <input inputMode="decimal" placeholder="–" value={vals[m] as string} onChange={(e) => setVals({ ...vals, [m]: e.target.value })} />}
          </label>
        ))}
      </div>
      {measurement && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={async () => { await db.measurements.delete(measurement.id!); onClose(); }}>Messung löschen</button>}
    </Sheet>
  );
}

/** Messpunkte ohne Zahl (z. B. „Fotos gemacht“) werden als Schalter erfasst. */
export function isFlag(label: string): boolean {
  return !/\(.+\)/.test(label);
}

export function ExerciseSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="card"><ExerciseDetails ex={ex} /></div>
    </Sheet>
  );
}
