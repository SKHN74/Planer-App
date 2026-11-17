import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Goal } from '../db/types';
import { evaluateGoal, type GoalView } from '../lib/goals';
import { GoalForm } from '../components/GoalForm';
import { TestBadge } from '../components/AgendaParts';
import { useTodayKey } from '../useToday';

const R = 26;
const C = 2 * Math.PI * R;

function GoalCard({ goal, v, onOpen }: { goal: Goal; v: GoalView; onOpen: () => void }) {
  const pct = Math.round(v.progress * 100);
  const color = v.onTrack ? 'var(--green)' : 'var(--orange)';
  return (
    <button className="goal-card" onClick={onOpen} aria-label={`${goal.title}: ${pct} Prozent, ${v.status}`}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="ring">
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface2)" strokeWidth="7" />
        {v.progress > 0 && <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(C * v.progress).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 32 32)" />}
        <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{pct} %</text>
      </svg>
      <span className="body">
        <span className="t">{goal.title} <TestBadge show={goal.isDemo} /></span>
        <span className="s">{v.valueLabel}</span>
        <span className="meta">
          <span className={'pill ' + (v.onTrack ? 'ok' : 'behind')}>{v.status}</span>
          {v.extra && <span className="small muted">{v.extra}</span>}
        </span>
      </span>
    </button>
  );
}

export default function Ziele() {
  const today = useTodayKey();
  const goals = useLiveQuery(() => db.goals.toArray(), [], []);
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const habits = useLiveQuery(() => db.habits.toArray(), [], []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [open, setOpen] = useState<{ goal?: Goal } | null>(null);
  const data = { workouts, habits, habitLogs };
  const active = goals.filter((g) => g.active);
  const paused = goals.filter((g) => !g.active);

  return (
    <main className="screen">
      <header className="screen-header">
        <h1 className="title">Ziele</h1>
        <button className="btn" style={{ minHeight: 38 }} onClick={() => setOpen({})}>+ Ziel</button>
      </header>

      {active.length === 0 ? (
        <div className="empty">
          Noch keine Ziele. Leg z. B. „3× Gym pro Woche“, „50 km im Monat“ oder „10 km unter 60 Minuten“ an.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {active.map((g) => <GoalCard key={g.id} goal={g} v={evaluateGoal(g, data, today)} onOpen={() => setOpen({ goal: g })} />)}
        </div>
      )}

      {paused.length > 0 && (
        <section>
          <div className="section-label">Pausiert</div>
          <div className="list">
            {paused.map((g) => <button key={g.id} className="row" onClick={() => setOpen({ goal: g })}><span className="muted">{g.title}</span><TestBadge show={g.isDemo} /></button>)}
          </div>
        </section>
      )}

      {open && <GoalForm key={open.goal?.id ?? 'new'} goal={open.goal} onClose={() => setOpen(null)} />}
    </main>
  );
}
