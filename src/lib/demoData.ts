import { addDays } from 'date-fns';
import type { PlanerDB } from '../db/db';
import type { CalendarEvent, HabitLog, PlanSession, Todo, Workout } from '../db/types';
import { ensureDefaults, WINTER_ARC } from './programs';
import { toKey } from './dates';
import { weekdayMon0 } from './recurrence';

/**
 * Lädt klar gekennzeichnete Beispieldaten (isDemo = true) rund um das heutige Datum.
 * Sie lassen sich in den Einstellungen mit einem Klick wieder löschen.
 */
export async function loadDemo(d: PlanerDB, today = new Date()): Promise<number> {
  const ts = new Date().toISOString();
  const day = (n: number) => toKey(addDays(today, n));
  const base = { createdAt: ts, updatedAt: ts, isDemo: true };

  const events: CalendarEvent[] = [
    { ...base, title: 'Zahnarzt', date: day(0), allDay: false, start: '08:30', end: '09:00', location: 'Praxis Dr. Weber', reminderMin: 60 },
    { ...base, title: 'Mittagessen mit Anna', date: day(0), allDay: false, start: '12:00', end: '13:00', location: 'Café Rosa' },
    { ...base, title: 'Yoga', date: day(-14), allDay: false, start: '07:00', end: '08:00', repeat: { kind: 'woechentlich', weekdays: [weekdayMon0(addDays(today, 2))] } },
    { ...base, title: 'Geburtstag Lisa', date: day(3), allDay: true },
    { ...base, title: 'Kino', date: day(3), allDay: false, start: '18:30', end: '21:00', location: 'Cinemaxx' },
    { ...base, title: 'Elternabend', date: day(-5), allDay: false, start: '19:00', end: '20:30', location: 'Grundschule' },
    { ...base, title: 'Termin Steuerberater', date: day(9), allDay: false, start: '10:00', end: '11:00', reminderMin: 1440 },
    { ...base, title: 'Wochenende Harz', date: day(4), allDay: true, repeat: { kind: 'taeglich', until: day(5) } },
    { ...base, title: 'Miete prüfen', date: toKey(new Date(today.getFullYear(), today.getMonth(), 1)), allDay: true, repeat: { kind: 'monatlich' } }
  ];
  const todos: Todo[] = [
    { ...base, title: 'Steuerunterlagen sortieren', date: day(-1), originalDate: day(-1), priority: 1 },
    { ...base, title: 'Geschenk für Lisa bestellen', date: day(0), priority: 2 },
    { ...base, title: 'Fahrrad aufpumpen', date: day(0), priority: 3 },
    { ...base, title: 'Reifen wechseln', date: day(2), time: '17:00', priority: 2 },
    { ...base, title: 'Wäsche abholen', date: day(-1), priority: 2, doneAt: addDays(today, -1).toISOString() },
    { ...base, title: 'Fotobuch gestalten', priority: 3 }
  ];

  // Sport: braucht Sportarten und die Winter-Arc-Vorlage
  await ensureDefaults(d);
  const sport = async (name: string) => (await d.sportTypes.where('name').equals(name).first())!.id!;
  const program = (await d.programs.where('name').equals(WINTER_ARC.name).first())!;
  const unit = (name: string) => program.units.find((u) => u.name === name)!;
  const gymA = unit('Gym A');
  const [squat, lat, press, row, plank] = gymA.exercises.map((e) => e.exerciseId);
  const sets3 = (exerciseId: number, weightKg: number | undefined, reps: number[]) => reps.map((r) => ({ exerciseId, weightKg, reps: r }));
  const wd = (n: number) => weekdayMon0(addDays(today, n));

  const workouts: Workout[] = [
    { ...base, sportTypeId: await sport('Gym'), programId: program.id, unitTemplateId: gymA.id, date: day(-6), time: '18:00', durationMin: 55, intensity: 3,
      sets: [...sets3(squat, 12, [12, 12, 12]), ...sets3(lat, 30, [12, 11, 10]), ...sets3(press, 25, [12, 12, 10]), ...sets3(row, 30, [12, 12, 12]), ...sets3(plank, undefined, [40, 35, 30])] },
    { ...base, sportTypeId: await sport('Laufen'), date: day(-4), time: '07:00', durationMin: 32, distanceKm: 5.2, intensity: 3, note: 'Runde am Fluss' },
    { ...base, sportTypeId: await sport('Zuhause'), programId: program.id, unitTemplateId: unit('Zuhause').id, date: day(-3), durationMin: 25, intensity: 4 },
    { ...base, sportTypeId: await sport('Sonstiges'), date: day(-2), durationMin: 0, isRestDay: true },
    { ...base, sportTypeId: await sport('Radfahren'), date: day(-1), time: '16:30', durationMin: 60, distanceKm: 21.5, intensity: 2 }
  ];
  const sessions: PlanSession[] = [
    { ...base, title: 'Gym A', sportTypeId: await sport('Gym'), programId: program.id, unitTemplateId: gymA.id, date: day(-14), time: '18:00', targetDurationMin: 55, repeat: { kind: 'woechentlich', weekdays: [wd(0), wd(3)].sort() } },
    { ...base, title: 'Laufen', sportTypeId: await sport('Laufen'), date: day(1), time: '07:00', targetDurationMin: 30, targetDistanceKm: 5 }
  ];

  // Gewohnheiten der letzten Tage (nur die Standard-Gewohnheiten, falls vorhanden)
  const habitLogs: HabitLog[] = [];
  const pattern: Record<string, number[]> = { Schritte: [1, 1, 0, 1, 1, 1], Wasser: [8, 6, 8, 5, 8, 8], Schlaf: [1, 0, 1, 1, 0, 1] };
  for (const h of await d.habits.toArray()) {
    pattern[h.name]?.forEach((value, i) => value && habitLogs.push({ ...base, habitId: h.id!, date: day(i - 6), value }));
  }

  await d.transaction('rw', [d.events, d.todos, d.workouts, d.planSessions, d.habitLogs], async () => {
    await d.habitLogs.bulkAdd(habitLogs);
    await d.events.bulkAdd(events);
    await d.todos.bulkAdd(todos);
    await d.workouts.bulkAdd(workouts);
    await d.planSessions.bulkAdd(sessions);
  });
  return events.length + todos.length + workouts.length + sessions.length + habitLogs.length;
}
