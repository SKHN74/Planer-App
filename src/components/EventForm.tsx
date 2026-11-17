import { useState } from 'react';
import { db, now } from '../db/db';
import type { CalendarEvent, ReminderMin, RepeatKind } from '../db/types';
import { fromKey } from '../lib/dates';
import { weekdayMon0 } from '../lib/recurrence';
import { Sheet } from './Sheet';
import { shareIcs } from '../lib/ics';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  event?: CalendarEvent;
  /** Tag, an dem ein (wiederkehrender) Termin angetippt wurde. */
  day: string;
  onClose: () => void;
}

type Scope = 'single' | 'all';

export function EventForm({ event, day, onClose }: Props) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event ? (event.repeat ? day : event.date) : day);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [start, setStart] = useState(event?.start ?? '09:00');
  const [end, setEnd] = useState(event?.end ?? '10:00');
  const [location, setLocation] = useState(event?.location ?? '');
  const [note, setNote] = useState(event?.note ?? '');
  const [repeat, setRepeat] = useState<RepeatKind | ''>(event?.repeat?.kind ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(event?.repeat?.weekdays ?? [weekdayMon0(fromKey(day))]);
  const [until, setUntil] = useState(event?.repeat?.until ?? '');
  const [reminder, setReminder] = useState<string>(event?.reminderMin ? String(event.reminderMin) : '');
  const [ask, setAsk] = useState<null | 'save' | 'delete'>(null);

  const isRecurring = !!event?.repeat;
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const endBeforeStart = !allDay && !!start && !!end && toMin(end) <= toMin(start);

  /** Beim Verschieben des Beginns bleibt die Dauer gleich (wie in Kalender-Apps). */
  function changeStart(v: string) {
    if (v && start && end) {
      const dur = Math.max(15, toMin(end) - toMin(start));
      setEnd(fromMin(Math.min(toMin(v) + dur, 23 * 60 + 59)));
    }
    setStart(v);
  }

  function build(): Omit<CalendarEvent, 'id' | 'createdAt'> {
    return {
      title: title.trim(),
      date,
      allDay,
      start: allDay ? undefined : start,
      end: allDay ? undefined : end,
      location: location.trim() || undefined,
      note: note.trim() || undefined,
      repeat: repeat ? { kind: repeat, weekdays: repeat === 'woechentlich' ? [...weekdays].sort() : undefined, until: until || undefined } : undefined,
      exceptions: event?.exceptions,
      reminderMin: reminder ? (Number(reminder) as ReminderMin) : undefined,
      updatedAt: now(),
      isDemo: event?.isDemo
    };
  }

  async function save(scope: Scope = 'all') {
    if (!title.trim()) return;
    const data = build();
    if (!event?.id) {
      await db.events.add({ ...data, createdAt: now() });
    } else if (isRecurring && scope === 'single') {
      // nur dieses Vorkommen: Ausnahme in der Serie, Einzeltermin neu
      await db.events.update(event.id, { exceptions: [...(event.exceptions ?? []), day], updatedAt: now() });
      await db.events.add({ ...data, repeat: undefined, exceptions: undefined, createdAt: now() });
    } else {
      // ganze Serie: Startdatum der Serie bleibt, außer es wurde bewusst geändert
      const keepStart = isRecurring && date === day ? event.date : date;
      await db.events.update(event.id, { ...data, date: keepStart });
    }
    onClose();
  }

  async function remove(scope: Scope = 'all') {
    if (!event?.id) return;
    if (isRecurring && scope === 'single') await db.events.update(event.id, { exceptions: [...(event.exceptions ?? []), day], updatedAt: now() });
    else await db.events.delete(event.id);
    onClose();
  }

  if (ask) {
    const act = ask === 'save' ? save : remove;
    return (
      <Sheet title={ask === 'save' ? 'Änderung speichern' : 'Termin löschen'} onClose={() => setAsk(null)}>
        <p style={{ margin: 0 }}>Das ist ein wiederkehrender Termin.</p>
        <div className="choice">
          <button className="btn block" onClick={() => act('single')}>Nur diesen Termin</button>
          <button className="btn secondary block" onClick={() => act('all')}>Alle Termine der Serie</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={event ? 'Termin bearbeiten' : 'Neuer Termin'} onClose={onClose} canSave={!!title.trim() && !endBeforeStart} onSave={() => (isRecurring ? setAsk('save') : save())}>
      <div className="field-group">
        <input className="title-input" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!event} />
        <label className="field"><span>Ort</span><input placeholder="optional" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
      </div>

      <div className="field-group">
        <label className="field"><span>Ganztägig</span><input type="checkbox" className="switch" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /></label>
        <label className="field"><span>Datum</span><input type="date" value={date} required onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
        {!allDay && (
          <>
            {endBeforeStart && <div className="field small" style={{ color: 'var(--danger)' }}>Das Ende liegt vor dem Beginn.</div>}
            <label className="field"><span>Von</span><input type="time" value={start} onChange={(e) => changeStart(e.target.value)} /></label>
            <label className="field"><span>Bis</span><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </>
        )}
      </div>

      <div className="field-group">
        <label className="field">
          <span>Wiederholung</span>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatKind | '')}>
            <option value="">Keine</option>
            <option value="taeglich">Täglich</option>
            <option value="woechentlich">Wöchentlich</option>
            <option value="monatlich">Monatlich</option>
          </select>
        </label>
        {repeat === 'woechentlich' && (
          <div className="chips" role="group" aria-label="Wochentage">
            {WD.map((w, i) => (
              <button key={w} type="button" className="chip" aria-pressed={weekdays.includes(i)}
                onClick={() => setWeekdays(weekdays.includes(i) ? (weekdays.length > 1 ? weekdays.filter((x) => x !== i) : weekdays) : [...weekdays, i])}>{w}</button>
            ))}
          </div>
        )}
        {repeat && <label className="field"><span>Endet am</span><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></label>}
      </div>

      <div className="field-group">
        <label className="field">
          <span>Erinnerung</span>
          <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
            <option value="">Keine</option>
            <option value="10">10 Min vorher</option>
            <option value="60">1 Std vorher</option>
            <option value="1440">1 Tag vorher</option>
          </select>
        </label>
      </div>

      <div className="field-group"><textarea className="note-input" placeholder="Notiz" value={note} onChange={(e) => setNote(e.target.value)} /></div>

      <div>
        <button className="btn secondary block" disabled={!title.trim() || endBeforeStart} onClick={() => shareIcs({ ...build(), id: event?.id, createdAt: event?.createdAt ?? now() })}>In iOS-Kalender übernehmen</button>
        <p className="small muted" style={{ margin: '6px 4px 0' }}>Der iOS-Kalender erinnert dich auch, wenn diese App geschlossen ist.</p>
      </div>

      {event && <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={() => (isRecurring ? setAsk('delete') : remove())}>Termin löschen</button>}
    </Sheet>
  );
}
