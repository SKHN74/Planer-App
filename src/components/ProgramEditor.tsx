import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Program, UnitTemplate } from '../db/types';
import { Sheet } from './Sheet';

interface ExRow { exerciseId?: number; newName: string; sets: string; reps: string }
interface UnitRow { id: number; name: string; sportTypeId?: number; duration: string; note: string; exercises: ExRow[] }

const NEW = '__neu';
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** Eigenes Programm anlegen oder bearbeiten: Einheiten mit Übungen, Regeln, Messungen. Leitern bleiben erhalten. */
export function ProgramEditor({ program, onClose }: { program?: Program; onClose: () => void }) {
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);
  const [name, setName] = useState(program?.name ?? '');
  const [weeks, setWeeks] = useState(String(program?.weeks ?? 8));
  const [why, setWhy] = useState(program?.why ?? '');
  const [rules, setRules] = useState((program?.rules ?? []).join('\n'));
  const [measurements, setMeasurements] = useState((program?.measurements ?? []).join('\n'));
  const [every, setEvery] = useState(program?.measureEveryWeeks ? String(program.measureEveryWeeks) : '');
  const [units, setUnits] = useState<UnitRow[]>(() => (program?.units ?? []).map((u) => ({
    id: u.id, name: u.name, sportTypeId: u.sportTypeId, duration: u.durationMin ? String(u.durationMin) : '', note: u.note ?? '',
    exercises: u.exercises.map((e) => ({ exerciseId: e.exerciseId, newName: '', sets: String(e.sets), reps: e.reps }))
  })));
  const [error, setError] = useState('');

  const nextId = () => Math.max(0, ...units.map((u) => u.id)) + 1;
  const patchUnit = (i: number, p: Partial<UnitRow>) => setUnits(units.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const patchEx = (i: number, k: number, p: Partial<ExRow>) => patchUnit(i, { exercises: units[i].exercises.map((e, j) => (j === k ? { ...e, ...p } : e)) });

  const canSave = !!name.trim() && Number(weeks) > 0 && units.every((u) => u.name.trim() && u.sportTypeId);

  async function save() {
    if (!canSave) return;
    const clash = await db.programs.where('name').equals(name.trim()).first();
    if (clash && clash.id !== program?.id) { setError('Es gibt schon ein Programm mit diesem Namen.'); return; }
    const ts = now();
    await db.transaction('rw', db.programs, db.exercises, async () => {
      const built: UnitTemplate[] = [];
      for (const u of units) {
        const exs = [];
        for (const e of u.exercises) {
          let id = e.exerciseId;
          const nn = e.newName.trim();
          if (!id && nn) {
            id = (await db.exercises.where('name').equals(nn).first())?.id ?? ((await db.exercises.add({ name: nn, createdAt: ts, updatedAt: ts })) as number);
          }
          if (id) exs.push({ exerciseId: id, sets: Math.max(1, Math.round(Number(e.sets) || 1)), reps: e.reps.trim() || '10' });
        }
        built.push({ id: u.id, name: u.name.trim(), sportTypeId: u.sportTypeId!, durationMin: Number(u.duration) || undefined, note: u.note.trim() || undefined, exercises: exs });
      }
      const data = {
        name: name.trim(), weeks: Math.round(Number(weeks)), why: why.trim() || undefined, rules: lines(rules), units: built,
        measurements: lines(measurements), measureEveryWeeks: Number(every) || undefined, updatedAt: ts
      };
      if (program?.id) await db.programs.update(program.id, data);
      else await db.programs.add({ ...data, ladders: [], goalTemplates: [], createdAt: ts });
    });
    onClose();
  }

  return (
    <Sheet title={program ? 'Programm bearbeiten' : 'Eigenes Programm'} onClose={onClose} canSave={canSave} onSave={save}>
      {error && <div className="banner" role="alert">{error}</div>}
      <div className="field-group">
        <input className="title-input" placeholder="Name, z. B. Frühjahrs-Lauf" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!program} />
        <label className="field"><span>Dauer (Wochen)</span><input inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></label>
        <label className="field"><span>Warum</span><input placeholder="optional" value={why} onChange={(e) => setWhy(e.target.value)} /></label>
      </div>

      <div className="section-label" style={{ marginBottom: -8 }}>Einheiten (Vorlagen)</div>
      {units.length === 0 && <p className="small muted" style={{ margin: 0 }}>Lege z. B. „Gym A“ oder „Lauf locker“ an. Beim Eintragen eines Trainings stehen die Übungen dann direkt bereit.</p>}
      {units.map((u, i) => (
        <div key={u.id} className="field-group">
          <input className="title-input" placeholder="Name der Einheit" aria-label="Name der Einheit" value={u.name} onChange={(e) => patchUnit(i, { name: e.target.value })} />
          <label className="field">
            <span>Sportart</span>
            <select value={u.sportTypeId ?? ''} onChange={(e) => patchUnit(i, { sportTypeId: Number(e.target.value) || undefined })}>
              <option value="">Bitte wählen</option>
              {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Dauer (Min)</span><input inputMode="numeric" placeholder="optional" value={u.duration} onChange={(e) => patchUnit(i, { duration: e.target.value })} /></label>
          <label className="field"><span>Hinweis</span><input placeholder="optional" value={u.note} onChange={(e) => patchUnit(i, { note: e.target.value })} /></label>
          {u.exercises.map((e, k) => (
            <div key={k} className="field ex-edit">
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <select aria-label="Übung" value={e.exerciseId ?? NEW} onChange={(ev) => patchEx(i, k, { exerciseId: ev.target.value === NEW ? undefined : Number(ev.target.value) })}>
                  <option value={NEW}>Neue Übung …</option>
                  {exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                {!e.exerciseId && <input placeholder="Name der neuen Übung" aria-label="Name der neuen Übung" value={e.newName} onChange={(ev) => patchEx(i, k, { newName: ev.target.value })} />}
              </div>
              <input className="mini" inputMode="numeric" aria-label="Sätze" value={e.sets} onChange={(ev) => patchEx(i, k, { sets: ev.target.value })} />
              <span className="small muted">×</span>
              <input className="mini wide" aria-label="Wiederholungen" placeholder="10–12" value={e.reps} onChange={(ev) => patchEx(i, k, { reps: ev.target.value })} />
              <button type="button" className="link-btn" aria-label="Übung entfernen" style={{ color: 'var(--danger)', minHeight: 36, padding: '0 4px' }} onClick={() => patchUnit(i, { exercises: u.exercises.filter((_, j) => j !== k) })}>✕</button>
            </div>
          ))}
          <div className="field" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="link-btn" style={{ padding: 0 }} onClick={() => patchUnit(i, { exercises: [...u.exercises, { exerciseId: exercises[0]?.id, newName: '', sets: '3', reps: '10–12' }] })}>+ Übung</button>
            <button type="button" className="link-btn" style={{ padding: 0, color: 'var(--danger)' }} onClick={() => setUnits(units.filter((_, j) => j !== i))}>Einheit entfernen</button>
          </div>
        </div>
      ))}
      <button className="btn secondary block" onClick={() => setUnits([...units, { id: nextId(), name: '', sportTypeId: sports[0]?.id, duration: '', note: '', exercises: [] }])}>+ Einheit</button>

      <div className="field-group">
        <div className="field small muted" style={{ minHeight: 36 }}>Regeln (eine pro Zeile)</div>
        <textarea className="note-input" placeholder="z. B. Nie zweimal hintereinander auslassen." value={rules} onChange={(e) => setRules(e.target.value)} />
      </div>
      <div className="field-group">
        <div className="field small muted" style={{ minHeight: 36 }}>Messungen (eine pro Zeile, Zahlen mit Einheit in Klammern)</div>
        <textarea className="note-input" placeholder={'Gewicht (kg)\nFotos gemacht'} value={measurements} onChange={(e) => setMeasurements(e.target.value)} />
        <label className="field"><span>Messen alle … Wochen</span><input inputMode="numeric" placeholder="optional" value={every} onChange={(e) => setEvery(e.target.value)} /></label>
      </div>
      {program && program.ladders.length > 0 && <p className="small muted" style={{ margin: 0 }}>Die {program.ladders.length} Leitern des Programms bleiben unverändert.</p>}
    </Sheet>
  );
}
