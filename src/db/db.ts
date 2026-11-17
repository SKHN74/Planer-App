import Dexie, { type EntityTable } from 'dexie';
import type {
  CalendarEvent, Todo, Workout, PlanSession, Goal, SportType, Exercise,
  Habit, HabitLog, Program, ProgramRun, Measurement, Settings
} from './types';

export const SCHEMA_VERSION = 1;

/** Tabellen mit Benutzer- oder Testdaten (alles außer Einstellungen). */
export const DATA_TABLES = [
  'events', 'todos', 'workouts', 'planSessions', 'goals', 'sportTypes', 'exercises',
  'habits', 'habitLogs', 'programs', 'programRuns', 'measurements'
] as const;
export type DataTable = (typeof DATA_TABLES)[number];

export class PlanerDB extends Dexie {
  events!: EntityTable<CalendarEvent, 'id'>;
  todos!: EntityTable<Todo, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  planSessions!: EntityTable<PlanSession, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  sportTypes!: EntityTable<SportType, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  habits!: EntityTable<Habit, 'id'>;
  habitLogs!: EntityTable<HabitLog, 'id'>;
  programs!: EntityTable<Program, 'id'>;
  programRuns!: EntityTable<ProgramRun, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'planer') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      events: '++id, date, isDemo',
      todos: '++id, date, doneAt, isDemo',
      workouts: '++id, date, sportTypeId, isDemo',
      planSessions: '++id, date, programRunId, isDemo',
      goals: '++id, active, isDemo',
      sportTypes: '++id, name, isDemo',
      exercises: '++id, name, isDemo',
      habits: '++id, order, isDemo',
      habitLogs: '++id, [habitId+date], date, isDemo',
      programs: '++id, name, isDemo',
      programRuns: '++id, programId, isDemo',
      measurements: '++id, date, programRunId, isDemo',
      settings: 'id'
    });
  }
}

export const db = new PlanerDB();

export const DEFAULT_SETTINGS: Settings = { id: 'main', theme: 'hell', inAppHints: true };

export async function getSettings(d: PlanerDB = db): Promise<Settings> {
  return (await d.settings.get('main')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>, d: PlanerDB = db): Promise<void> {
  const cur = await getSettings(d);
  await d.settings.put({ ...cur, ...patch, id: 'main' });
}

export function now(): string {
  return new Date().toISOString();
}
