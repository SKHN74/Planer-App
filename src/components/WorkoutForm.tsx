import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Exercise, PlanSession, Workout, WorkoutSet } from '../db/types';
import { formatShort, fromKey } from '../lib/dates';
import { INTENSITY_LABEL, allUnits, findUnit, fmtKg, lastSets, progressionHint } from '../lib/sport';
import { Sheet } from './Sheet';

interface Props {
  workout?: Workout;
  day: string;
  /** Geplante Einheit, die mit diesem Training erledigt wird. */
  plan?: PlanSession;
  onClose: () => void;
}

type SetRow = { weight: string; reps: string };

const num = (s: string): number | undefined => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function WorkoutForm({ workout, day, plan, onClose }: Props) {
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);

  const [rest, setRest] = useState(workout?.isRestDay ?? false);
  const [sportId, setSportId] = useState<number | undefined>(workout?.sportTypeId ?? plan?.sportTypeId);
  const [unitKey, setUnitKey] = useState(() => {
    const p = workout?.programId ?? plan?.programId;
    const u = workout?.unitTemplateId ?? plan?.unitTemplateId;
    return p != null && u != null ? `${p}:${u}` : '';
  });
  const [date, setDate] = useState(workout?.date ?? day);
  const [time, setTime] = useState(workout?.time ?? plan?.time ?? '');
  const [duration, setDuration] = useState(String(workout?.durationMin ?? plan?.targetDurationMin ?? ''));
  const [distance, setDistance] = useState(workout?.distanceKm != null ? fmtKg(workout.distanceKm) : plan?.targetDistanceKm != null ? fmtKg(plan.targetDistanceKm) : '');
  const [intensity, setIntensity] = useState<number | undefined>(workout?.intensity);
  const [note, setNote] = useState(workout?.note ?? '');
  const [sets, setSets] = useState<Record<number, SetRow[]> | null>(null);
  const [info, setInfo] = useState<number | null>(null);

  const units = allUnits(programs);
  const [pId, uId] = unitKey ? unitKey.split(':').map(Number) : [];
  const unitRef = findUnit(programs, pId, uId);
  const unit = unitRef?.unit;
  const sport = sports.find((s) => s.id === sportId);
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id!, e])), [exercises]);

  // Sätze erst füllen, wenn Vorlage und Verlauf geladen sind: vorhandene Werte oder Gewicht vom letzten Mal
  const rows: Record<number, SetRow[]> = sets ?? (() => {
    const init: Record<number, SetRow[]> = {};
    for (const e of unit?.exercises ?? []) {
      const own = workout?.sets?.filter((s) => s.exerciseId === e.exerciseId);
      const last = lastSets(workouts, e.exerciseId, date, workout?.id)?.sets;
      init[e.exerciseId] = Array.from({ length: Math.max(e.sets, own?.length ?? 0) }, (_, i) => ({
        weight: own?.[i]?.weightKg != null ? fmtKg(own[i].weightKg!) : last?.[i]?.weightKg != null ? fmtKg(last[i].weightKg!) : '',
        reps: own?.[i]?.reps != null ? String(own[i].reps) : ''
      }));
    }
    return init;
  })();

  function pickUnit(key: string) {
    setUnitKey(key);
    setSets(null);
    const ref = units.find((u) => u.key === key);
    if (ref) {
      setSportId(ref.unit.sportTypeId);
      if (ref.unit.durationMin && !duration) setDuration(String(ref.unit.durationMin));
    }
  }

  function setRow(exId: number, i: number, patch: Partial<SetRow>) {
    const next = { ...rows, [exId]: rows[exId].map((r, j) => (j === i ? { ...r, ...patch } : r)) };
    setSets(next);
  }

  const canSave = rest || (!!sportId && (num(duration) ?? 0) > 0);

  async function save() {
    if (!canSave) return;
    const logged: WorkoutSet[] = [];
    if (!rest && unit) {
      for (const e of unit.exercises) {
        for (const r of rows[e.exerciseId] ?? []) {
          const weightKg = num(r.weight);
          const reps = num(r.reps);
          if (reps != null) logged.push({ exerciseId: e.exerciseId, weightKg, reps });
        }
      }
    }
    const restSport = sports.find((s) => s.name === 'Sonstiges') ?? sports[0];
    const data: Omit<Workout, 'id' | 'createdAt'> = rest
      ? { sportTypeId: restSport?.id ?? 0, date, durationMin: 0, isRestDay: true, note: note.trim() || undefined, planSessionId: workout?.planSessionId ?? plan?.id, updatedAt: now(), isDemo: workout?.isDemo }
      : {
          sportTypeId: sportId!, date, time: time || undefined, durationMin: Math.round(num(duration)!),
          distanceKm: sport?.hasDistance ? num(distance) : undefined,
          intensity: intensity as Workout['intensity'], note: note.trim() || undefined,
          programId: unit ? pId : undefined, unitTemplateId: unit ? uId : undefined,
          planSessionId: workout?.planSessionId ?? plan?.id,
          sets: logged.length ? logged : undefined, isRestDay: undefined,
          updatedAt: now(), isDemo: workout?.isDemo
        };
    if (workout?.id) await db.workouts.update(workout.id, data);
    else await db.workouts.add({ ...data, createdAt: now() });
    onClose();
  }

  async function remove() {
    if (workout?.id) await db.workouts.delete(workout.id);
    onClose();
  }

  return (
    <Sheet title={workout ? 'Training bearbeiten' : plan ? plan.title : 'Training eintragen'} onClose={onClose} canSave={canSave} onSave={save}>
      <div className="segmented" role="group" aria-label="Art">
        <button aria-pressed={!rest} onClick={() => setRest(false)}>Training</button>
        <button aria-pressed={rest} onClick={() => setRest(true)}>Bewusste Pause</button>
      </div>

      {rest ? (
        <>
          <div className="field-group">
            <label className="field"><span>Datum</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
          </div>
          <p className="small muted" style={{ margin: '0 4px' }}>Eine bewusste Pause hält deine Kette am Leben – Erholung gehört zum Plan.</p>
        </>
      ) : (
        <>
          <div className="field-group">
            <div className="field small muted" style={{ minHeight: 36 }}>Sportart</div>
            <div className="chips" role="group" aria-label="Sportart" style={{ paddingTop: 0 }}>
              {sports.map((s) => (
                <button key={s.id} type="button" className="chip" aria-pressed={s.id === sportId}
                  onClick={() => { setSportId(s.id); if (unit && unit.sportTypeId !== s.id) setUnitKey(''); }}>{s.name}</button>
              ))}
            </div>
            {units.length > 0 && (
              <label className="field">
                <span>Vorlage</span>
                <select value={unitKey} onChange={(e) => pickUnit(e.target.value)}>
                  <option value="">Keine</option>
                  {units.map((u) => <option key={u.key} value={u.key}>{u.unit.name}{programs.length > 1 ? ` (${u.program.name})` : ''}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="field-group">
            <label className="field"><span>Datum</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
            <label className="field"><span>Uhrzeit</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="field"><span>Dauer (Min)</span><input inputMode="numeric" placeholder="z. B. 45" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
            {sport?.hasDistance && <label className="field"><span>Distanz (km)</span><input inputMode="decimal" placeholder="optional" value={distance} onChange={(e) => setDistance(e.target.value)} /></label>}
          </div>

          <div className="field-group">
            <div className="field small muted" style={{ minHeight: 36 }}>Intensität{intensity ? ` · ${INTENSITY_LABEL[intensity]}` : ''}</div>
            <div className="chips" role="group" aria-label="Intensität" style={{ paddingTop: 0 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={intensity === n} aria-label={INTENSITY_LABEL[n]} onClick={() => setIntensity(intensity === n ? undefined : n)}>{n}</button>
              ))}
            </div>
          </div>

          {unit && unit.exercises.length > 0 && (
            <div className="gym-log">
              <div className="section-label">Übungen · {unit.name}</div>
              {unit.note && <p className="small muted" style={{ margin: '0 4px 8px' }}>{unit.note}</p>}
              {unit.exercises.map((e) => {
                const ex = exById.get(e.exerciseId);
                const last = lastSets(workouts, e.exerciseId, date, workout?.id);
                const hint = progressionHint(e, last?.sets);
                return (
                  <div key={e.exerciseId} className="field-group exercise">
                    <div className="exercise-head">
                      <div style={{ minWidth: 0 }}>
                        <strong>{ex?.name ?? 'Übung'}</strong>
                        <div className="small muted">{e.sets} × {e.reps}</div>
                      </div>
                      {ex && (ex.howTo || ex.watchOut) && <button type="button" className="link-btn" aria-expanded={info === e.exerciseId} onClick={() => setInfo(info === e.exerciseId ? null : e.exerciseId)}>{info === e.exerciseId ? 'Weniger' : 'So geht’s'}</button>}
                    </div>
                    {info === e.exerciseId && ex && <ExerciseDetails ex={ex} />}
                    {last && <div className="small muted exercise-last">Letztes Mal ({formatShort(fromKey(last.date)).slice(0, 6)}): {last.sets.map((s) => (s.weightKg ? `${fmtKg(s.weightKg)} kg × ` : '') + (s.reps ?? '–')).join(', ')}</div>}
                    {hint && <div className="small exercise-hint">{hint}</div>}
                    <div className="set-rows">
                      {(rows[e.exerciseId] ?? []).map((r, i) => (
                        <div key={i} className="set-row">
                          <span className="small muted">Satz {i + 1}</span>
                          <label><input inputMode="decimal" placeholder="–" aria-label={`Satz ${i + 1} Gewicht`} value={r.weight} onChange={(ev) => setRow(e.exerciseId, i, { weight: ev.target.value })} /><span>kg</span></label>
                          <label><input inputMode="numeric" placeholder="–" aria-label={`Satz ${i + 1} Wiederholungen`} value={r.reps} onChange={(ev) => setRow(e.exerciseId, i, { reps: ev.target.value })} /><span>{/Sek/.test(e.reps) ? 'Sek.' : 'Wdh.'}</span></label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="field-group"><textarea className="note-input" placeholder="Notiz" value={note} onChange={(e) => setNote(e.target.value)} /></div>

      {workout && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={remove}>Eintrag löschen</button>}
    </Sheet>
  );
}

export function ExerciseDetails({ ex }: { ex: Exercise }) {
  return (
    <div className="exercise-details small">
      {ex.muscles && <p><strong>Trainiert:</strong> {ex.muscles}</p>}
      {ex.howTo && <p><strong>So geht’s:</strong> {ex.howTo}</p>}
      {ex.watchOut && <p><strong>Achte auf:</strong> {ex.watchOut}</p>}
      {ex.alternative && <p><strong>Alternative:</strong> {ex.alternative}</p>}
    </div>
  );
}
