import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { dueReminders, relativeLabel } from '../lib/reminders';
import { useNow } from '../useToday';

const STORE = 'planer.reminders.seen';

function loadSeen(): Record<string, 'notified' | 'dismissed'> {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}'); } catch { return {}; }
}
function saveSeen(s: Record<string, string>) {
  try {
    // nur die letzten 200 Einträge behalten
    const entries = Object.entries(s).slice(-200);
    localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* privater Modus */ }
}

/**
 * Zeigt fällige Erinnerungen, solange die App offen ist.
 * Mit erlaubten Mitteilungen erscheint zusätzlich eine iOS-Mitteilung.
 * Bei geschlossener App gibt es bewusst keine Erinnerung (kein Server).
 */
export function ReminderBanner({ enabled }: { enabled: boolean }) {
  const now = useNow();
  const events = useLiveQuery(() => db.events.toArray(), [], []);
  const todos = useLiveQuery(() => db.todos.toArray(), [], []);
  const [seen, setSeen] = useState(loadSeen);
  const due = enabled ? dueReminders(events, todos, now).filter((r) => seen[r.key] !== 'dismissed') : [];

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const fresh = due.filter((r) => !seen[r.key]);
    if (!fresh.length) return;
    navigator.serviceWorker?.ready.then((reg) => {
      for (const r of fresh) reg.showNotification(r.title, { body: relativeLabel(r.startsAt, new Date()), tag: r.key, icon: 'icons/icon-192.png' });
    }).catch(() => undefined);
    const next = { ...seen };
    for (const r of fresh) next[r.key] = 'notified';
    setSeen(next);
    saveSeen(next);
  });

  if (!due.length) return null;
  const dismiss = (key: string) => {
    const next = { ...seen, [key]: 'dismissed' as const };
    setSeen(next);
    saveSeen(next);
  };
  return (
    <div className="reminders" role="status" aria-live="polite">
      {due.map((r) => (
        <div key={r.key} className="reminder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{r.title}</strong>
            <div className="small">{r.kind === 'todo' ? 'To-do ' : ''}{relativeLabel(r.startsAt, now)}</div>
          </div>
          <button className="link-btn" onClick={() => dismiss(r.key)}>OK</button>
        </div>
      ))}
    </div>
  );
}
