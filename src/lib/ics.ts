import type { CalendarEvent } from '../db/types';

const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const day = (k: string) => k.replace(/-/g, '');
const local = (k: string, t: string) => `${day(k)}T${t.replace(':', '')}00`;

function nextDay(k: string): string {
  const d = new Date(k + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Erzeugt eine .ics-Datei, die iOS direkt in den Kalender übernehmen kann (mit Erinnerung). */
export function eventToIcs(e: CalendarEvent, stamp = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planer-App//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:planer-${e.id ?? 'neu'}-${e.date}@planer-app`,
    `DTSTAMP:${stamp.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `SUMMARY:${esc(e.title)}`
  ];
  if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${day(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
  else lines.push(`DTSTART;TZID=Europe/Berlin:${local(e.date, e.start ?? '09:00')}`, `DTEND;TZID=Europe/Berlin:${local(e.date, e.end ?? e.start ?? '10:00')}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.note) lines.push(`DESCRIPTION:${esc(e.note)}`);
  if (e.repeat) {
    const freq = { taeglich: 'DAILY', woechentlich: 'WEEKLY', monatlich: 'MONTHLY' }[e.repeat.kind];
    let rule = `RRULE:FREQ=${freq}`;
    if (e.repeat.interval && e.repeat.interval > 1) rule += `;INTERVAL=${e.repeat.interval}`;
    if (e.repeat.kind === 'woechentlich' && e.repeat.weekdays?.length) rule += ';BYDAY=' + e.repeat.weekdays.map((i) => ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][i]).join(',');
    if (e.repeat.until) rule += `;UNTIL=${day(e.repeat.until)}T235959`;
    lines.push(rule);
    for (const x of e.exceptions ?? []) lines.push(e.allDay ? `EXDATE;VALUE=DATE:${day(x)}` : `EXDATE;TZID=Europe/Berlin:${local(x, e.start ?? '09:00')}`);
  }
  if (e.reminderMin) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-PT${e.reminderMin}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Teilt die Datei über das iOS-Teilen-Menü oder lädt sie herunter. */
export async function shareIcs(e: CalendarEvent): Promise<void> {
  const name = (e.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'termin') + '.ics';
  const file = new File([eventToIcs(e)], name, { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: e.title }); } catch { /* abgebrochen */ }
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
