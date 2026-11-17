import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Goal, GoalMetric, GoalType } from '../db/types';
import { goalTitle, minutesLabel } from '../lib/goals';
import { allUnits, fmtKg } from '../lib/sport';
import { Sheet } from './Sheet';

const TYPES: { v: GoalType; l: string }[] = [
  { v: 'haeufigkeit', l: 'Häufigkeit' }, { v: 'summe', l: 'Umfang' }, { v: 'leistung', l: 'Bestzeit' }, { v: 'gewohnheit', l: 'Gewohnheit' }
];

/** „62:30“, „62“ oder „1:02:30“ → Minuten */
export function parseTime(s: string): number | undefined {
  const parts = s.trim().split(':').map((x) => Number(x.replace(',', '.')));
  if (!s.trim() || parts.some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  return undefined;
}

const numIn = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined; };

export function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const sports = useLiveQuery(() => db.sportTypes.toArray(), [], []);
  const programs = useLiveQuery(() => db.programs.toArray(), [], []);
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), [], []);
  const units = allUnits(programs);

  const [type, setType] = useState<GoalType>(goal?.type ?? 'haeufigkeit');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [period, setPeriod] = useState<'woche' | 'monat'>(goal?.period === 'monat' ? 'monat' : 'woche');
  const [metric, setMetric] = useState<GoalMetric>(goal?.type === 'summe' ? goal.metric : 'km');
  const [target, setTarget] = useState(goal && goal.type !== 'leistung' ? fmtKg(goal.target) : '');
  const [time, setTime] = useState(goal?.type === 'leistung' ? minutesLabel(goal.target) : '');
  const [sportId, setSportId] = useState(goal?.sportTypeId != null ? String(goal.sportTypeId) : '');
  const [unitKey, setUnitKey] = useState(goal?.unitTemplateId != null ? units.find((u) => u.unit.id === goal.unitTemplateId && u.unit.sportTypeId === goal.sportTypeId)?.key ?? '' : '');
  const [distance, setDistance] = useState(goal?.distanceKm != null ? fmtKg(goal.distanceKm) : '10');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [habitId, setHabitId] = useState(goal?.habitId != null ? String(goal.habitId) : '');
  const [active, setActive] = useState(goal?.active ?? true);

  const unitRef = units.find((u) => u.key === unitKey);
  const habit = habits.find((h) => String(h.id) === (habitId || String(habits[0]?.id ?? '')));

  function build(): Omit<Goal, 'title' | 'createdAt' | 'updatedAt'> | null {
    const sportTypeId = unitRef ? unitRef.unit.sportTypeId : sportId ? Number(sportId) : undefined;
    switch (type) {
      case 'haeufigkeit': {
        const t = numIn(target); if (!t) return null;
        return { type, period, metric: 'einheiten', target: Math.round(t), sportTypeId, unitTemplateId: unitRef?.unit.id, active };
      }
      case 'summe': {
        const t = numIn(target); if (!t) return null;
        return { type, period, metric: metric === 'minuten' ? 'minuten' : 'km', target: t, sportTypeId, active };
      }
      case 'leistung': {
        const t = parseTime(time); const d = numIn(distance); if (!t || !d) return null;
        return { type, period: 'stichtag', metric: 'zeit', target: t, distanceKm: d, sportTypeId, deadline: deadline || undefined, active };
      }
      case 'gewohnheit': {
        const t = numIn(target); if (!t || !habit) return null;
        return { type, period: 'woche', metric: 'erledigt', target: Math.min(7, Math.round(t)), habitId: habit.id, active };
      }
    }
  }

  const built = build();
  const auto = built ? goalTitle(built, { sport: sports.find((s) => s.id === built.sportTypeId)?.name, unit: unitRef?.unit.name, habit: habit?.name }) : '';

  async function save() {
    if (!built) return;
    const data = { ...built, title: title.trim() || auto, updatedAt: now(), isDemo: goal?.isDemo };
    // Felder des alten Typs entfernen
    const clean: Goal = { sportTypeId: undefined, unitTemplateId: undefined, habitId: undefined, distanceKm: undefined, deadline: undefined, ...data, createdAt: goal?.createdAt ?? now() };
    if (goal?.id) await db.goals.update(goal.id, clean);
    else await db.goals.add(clean);
    onClose();
  }

  async function remove() {
    if (goal?.id) await db.goals.delete(goal.id);
    onClose();
  }

  const sportSelect = (onlyDistance = false) => (
    <label className="field">
      <span>Sportart</span>
      <select value={sportId} onChange={(e) => { setSportId(e.target.value); setUnitKey(''); }}>
        {!onlyDistance && <option value="">Alle</option>}
        {onlyDistance && <option value="">Bitte wählen</option>}
        {sports.filter((s) => !onlyDistance || s.hasDistance).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
  const periodSeg = (
    <div className="field">
      <span>Zeitraum</span>
      <div className="segmented" role="group" aria-label="Zeitraum" style={{ minWidth: 170 }}>
        <button aria-pressed={period === 'woche'} onClick={() => setPeriod('woche')}>Woche</button>
        <button aria-pressed={period === 'monat'} onClick={() => setPeriod('monat')}>Monat</button>
      </div>
    </div>
  );

  return (
    <Sheet title={goal ? 'Ziel bearbeiten' : 'Neues Ziel'} onClose={onClose} canSave={!!built && (type !== 'leistung' || !!sportId)} onSave={save}>
      <div className="segmented" role="group" aria-label="Art des Ziels">
        {TYPES.map((t) => <button key={t.v} aria-pressed={type === t.v} onClick={() => { setType(t.v); if (t.v === 'gewohnheit' && !target) setTarget('7'); }}>{t.l}</button>)}
      </div>
      <p className="small muted" style={{ margin: '-6px 4px 0' }}>
        {type === 'haeufigkeit' && 'Wie oft du trainieren willst, z. B. 3× Gym pro Woche.'}
        {type === 'summe' && 'Wie viel insgesamt, z. B. 50 km Laufen im Monat.'}
        {type === 'leistung' && 'Eine Zeit für eine Strecke, z. B. 10 km unter 60 Minuten. Längere Läufe werden auf die Strecke umgerechnet.'}
        {type === 'gewohnheit' && 'An wie vielen Tagen pro Woche du eine Gewohnheit schaffen willst.'}
      </p>

      <div className="field-group">
        <input className="title-input" placeholder={auto || 'Titel'} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {type === 'haeufigkeit' && (
        <div className="field-group">
          <label className="field"><span>Anzahl</span><input inputMode="numeric" placeholder="z. B. 3" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          {periodSeg}
          {sportSelect()}
          {units.length > 0 && (
            <label className="field">
              <span>Nur Vorlage</span>
              <select value={unitKey} onChange={(e) => setUnitKey(e.target.value)}>
                <option value="">Egal</option>
                {units.filter((u) => !sportId || String(u.unit.sportTypeId) === sportId).map((u) => <option key={u.key} value={u.key}>{u.unit.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {type === 'summe' && (
        <div className="field-group">
          <div className="field">
            <span>Messen in</span>
            <div className="segmented" role="group" aria-label="Messen in" style={{ minWidth: 170 }}>
              <button aria-pressed={metric === 'km'} onClick={() => setMetric('km')}>km</button>
              <button aria-pressed={metric === 'minuten'} onClick={() => setMetric('minuten')}>Minuten</button>
            </div>
          </div>
          <label className="field"><span>Ziel ({metric === 'km' ? 'km' : 'Min'})</span><input inputMode="decimal" placeholder={metric === 'km' ? 'z. B. 50' : 'z. B. 300'} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
          {periodSeg}
          {sportSelect()}
        </div>
      )}

      {type === 'leistung' && (
        <div className="field-group">
          {sportSelect(true)}
          <label className="field"><span>Strecke (km)</span><input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} /></label>
          <label className="field"><span>Zielzeit</span><input inputMode="numeric" placeholder="mm:ss, z. B. 59:59" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="field"><span>Bis</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        </div>
      )}

      {type === 'gewohnheit' && (
        <div className="field-group">
          {habits.length === 0 ? <div className="field small muted">Lege zuerst in den Einstellungen eine Gewohnheit an.</div> : (
            <>
              <label className="field">
                <span>Gewohnheit</span>
                <select value={habit?.id ?? ''} onChange={(e) => setHabitId(e.target.value)}>
                  {habits.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Tage pro Woche</span><input inputMode="numeric" placeholder="1–7" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
            </>
          )}
        </div>
      )}

      {goal && (
        <>
          <div className="field-group">
            <label className="field"><span>Aktiv</span><input type="checkbox" className="switch" checked={active} onChange={(e) => setActive(e.target.checked)} /></label>
          </div>
          <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={remove}>Ziel löschen</button>
        </>
      )}
    </Sheet>
  );
}
