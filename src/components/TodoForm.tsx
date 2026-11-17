import { useState } from 'react';
import { db, now } from '../db/db';
import type { Priority, ReminderMin, Todo } from '../db/types';
import { Sheet } from './Sheet';

interface Props {
  todo?: Todo;
  day?: string;
  onClose: () => void;
}

export function TodoForm({ todo, day, onClose }: Props) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [hasDate, setHasDate] = useState(todo ? !!todo.date : !!day);
  const [date, setDate] = useState(todo?.date ?? day ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(todo?.time ?? '');
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 2);
  const [note, setNote] = useState(todo?.note ?? '');
  const [reminder, setReminder] = useState<string>(todo?.reminderMin ? String(todo.reminderMin) : '');

  async function save() {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      date: hasDate ? date : undefined,
      time: hasDate && time ? time : undefined,
      priority,
      note: note.trim() || undefined,
      reminderMin: hasDate && reminder ? (Number(reminder) as ReminderMin) : undefined,
      updatedAt: now()
    };
    if (todo?.id) await db.todos.update(todo.id, data);
    else await db.todos.add({ ...data, createdAt: now() });
    onClose();
  }

  async function remove() {
    if (todo?.id) await db.todos.delete(todo.id);
    onClose();
  }

  return (
    <Sheet title={todo ? 'To-do bearbeiten' : 'Neues To-do'} onClose={onClose} onSave={save} canSave={!!title.trim()}>
      <div className="field-group">
        <input className="title-input" placeholder="Was ist zu tun?" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!todo} />
      </div>

      <div className="field-group">
        <label className="field"><span>Mit Datum</span><input type="checkbox" className="switch" checked={hasDate} onChange={(e) => setHasDate(e.target.checked)} /></label>
        {hasDate && (
          <>
            <label className="field"><span>Datum</span><input type="date" value={date} required onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
            <label className="field"><span>Uhrzeit</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="field">
              <span>Erinnerung</span>
              <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
                <option value="">Keine</option>
                <option value="10">10 Min vorher</option>
                <option value="60">1 Std vorher</option>
                <option value="1440">1 Tag vorher</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div>
        <div className="section-label">Priorität</div>
        <div className="segmented" role="group" aria-label="Priorität">
          {([1, 2, 3] as Priority[]).map((p) => (
            <button key={p} aria-pressed={priority === p} onClick={() => setPriority(p)}>{['Hoch', 'Mittel', 'Niedrig'][p - 1]}</button>
          ))}
        </div>
      </div>

      <div className="field-group"><textarea className="note-input" placeholder="Notiz" value={note} onChange={(e) => setNote(e.target.value)} /></div>

      {todo && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={remove}>To-do löschen</button>}
    </Sheet>
  );
}
