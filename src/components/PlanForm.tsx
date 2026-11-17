import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { PlanSession } from '../db/types';
import { fromKey } from '../lib/dates';
import { weekdayMon0 } from '../lib/recurrence';
import { allUnits } from '../lib/sport';
import { Sheet } from './Sheet';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props { session?: PlanSession; day: string; onClose: () => void }

/** Trainingsplan: eine geplante Einheit, einmalig oder jede Woche an festen Tagen. */
export function PlanForm({ session, day, onClose }: Props) {
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);
  const units = allUnits(programs);

  const [title, setTitle] = useState(session?.title ?? '');
  const [sportId, setSportId] = useState<number | undefined>(session?.sportTypeId);
  const [unitKey, setUnitKey] = useState(session?.programId != null && session.unitTemplateId != null ? `${session.programId}:${session.unitTemplateId}` : '');
  const [date, setDate] = useState(session?.date ?? day);
  const [time, setTime] = useState(session?.time ?? '');
  const [weekly, setWeekly] = useState(session ? !!session.repeat : true);
  const [weekdays, setWeekdays] = useState<number[]>(session?.repeat?.weekdays ?? [weekdayMon0(fromKey(day))]);
  const [until, setUntil] = useState(session?.repeat?.until ?? '');
  const [duration, setDuration] = useState(session?.targetDurationMin ? String(session.targetDurationMin) : '');
  const [note, setNote] = useState(session?.note ?? '');
  const [ask, setAsk] = useState(false);

  const unitRef = units.find((u) => u.key === unitKey);
  const sportName = sports.find((s) => s.id === sportId)?.name ?? '';
  const effectiveTitle = title.trim() || unitRef?.unit.name || sportName;
  const canSave = !!sportId && !!effectiveTitle;

  function pickUnit(key: string) {
    setUnitKey(key);
    const ref = units.find((u) => u.key === key);
    if (ref) {
      setSportId(ref.unit.sportTypeId);
      if (ref.unit.durationMin) setDuration(String(ref.unit.durationMin));
    }
  }

  async function save() {
    if (!canSave) return;
    const data: Omit<PlanSession, 'id' | 'createdAt'> = {
      title: effectiveTitle, sportTypeId: sportId!, date, time: time || undefined,
      programId: unitRef?.program.id, unitTemplateId: unitRef?.unit.id,
      repeat: weekly ? { kind: 'woechentlich', weekdays: [...weekdays].sort(), until: until || undefined } : undefined,
      exceptions: session?.exceptions, targetDurationMin: Number(duration) || undefined,
      note: note.trim() || undefined, programRunId: session?.programRunId, updatedAt: now(), isDemo: session?.isDemo
    };
    if (session?.id) await db.planSessions.update(session.id, data);
    else await db.planSessions.add({ ...data, createdAt: now() });
    onClose();
  }

  async function remove(single: boolean) {
    if (!session?.id) return;
    if (single) await db.planSessions.update(session.id, { exceptions: [...(session.exceptions ?? []), day], updatedAt: now() });
    else await db.planSessions.delete(session.id);
    onClose();
  }

  if (ask) {
    return (
      <Sheet title="Geplantes Training löschen" onClose={() => setAsk(false)}>
        <p style={{ margin: 0 }}>Das Training wiederholt sich jede Woche.</p>
        <div className="choice">
          <button className="btn block" onClick={() => remove(true)}>Nur an diesem Tag</button>
          <button className="btn secondary block" onClick={() => remove(false)}>Ganzen Plan löschen</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={session ? 'Geplantes Training' : 'Training planen'} onClose={onClose} canSave={canSave} onSave={save}>
      <div className="field-group">
        <input className="title-input" placeholder={unitRef?.unit.name || sportName || 'Titel, z. B. Gym A'} value={title} onChange={(e) => setTitle(e.target.value)} />
        {units.length > 0 && (
          <label className="field">
            <span>Vorlage</span>
            <select value={unitKey} onChange={(e) => pickUnit(e.target.value)}>
              <option value="">Keine</option>
              {units.map((u) => <option key={u.key} value={u.key}>{u.unit.name}{programs.length > 1 ? ` (${u.program.name})` : ''}</option>)}
            </select>
          </label>
        )}
        <div className="chips" role="group" aria-label="Sportart">
          {sports.map((s) => <button key={s.id} type="button" className="chip" aria-pressed={s.id === sportId} onClick={() => setSportId(s.id)}>{s.name}</button>)}
        </div>
      </div>

      <div className="field-group">
        <label className="field"><span>Jede Woche</span><input type="checkbox" className="switch" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} /></label>
        {weekly && (
          <div className="chips" role="group" aria-label="Wochentage">
            {WD.map((w, i) => (
              <button key={w} type="button" className="chip" aria-pressed={weekdays.includes(i)}
                onClick={() => setWeekdays(weekdays.includes(i) ? (weekdays.length > 1 ? weekdays.filter((x) => x !== i) : weekdays) : [...weekdays, i])}>{w}</button>
            ))}
          </div>
        )}
        <label className="field"><span>{weekly ? 'Ab' : 'Datum'}</span><input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        {weekly && <label className="field"><span>Bis</span><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>}
        <label className="field"><span>Uhrzeit</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field"><span>Dauer (Min)</span><input inputMode="numeric" placeholder="optional" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
      </div>

      <div className="field-group"><textarea className="note-input" placeholder="Notiz" value={note} onChange={(e) => setNote(e.target.value)} /></div>

      {session && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={() => (session.repeat ? setAsk(true) : remove(false))}>Löschen</button>}
    </Sheet>
  );
}
