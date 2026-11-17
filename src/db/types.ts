// Datenmodell der Planer-App. Alle Datumswerte als 'yyyy-MM-dd', Uhrzeiten als 'HH:mm'.

export type ISODate = string;
export type Time = string;

/** Gemeinsame Felder aller Einträge. `isDemo` markiert Testdaten, die man gesammelt löschen kann. */
export interface Base {
  id?: number;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type RepeatKind = 'taeglich' | 'woechentlich' | 'monatlich';

export interface Repeat {
  kind: RepeatKind;
  /** Bei 'woechentlich': 0 = Montag … 6 = Sonntag. */
  weekdays?: number[];
  interval?: number;
  until?: ISODate;
}

/** Erinnerung in Minuten vor Beginn (10, 60, 1440). */
export type ReminderMin = 10 | 60 | 1440;

export interface CalendarEvent extends Base {
  title: string;
  date: ISODate;
  allDay: boolean;
  start?: Time;
  end?: Time;
  location?: string;
  note?: string;
  color?: string;
  repeat?: Repeat;
  /** Einzelne Tage, an denen eine Wiederholung ausfällt. */
  exceptions?: ISODate[];
  reminderMin?: ReminderMin;
  /** Kategorie (Uni, Privat, Freizeit …) bestimmt die Farbe. */
  categoryId?: number;
}

export type CategoryColor = 'blau' | 'gruen' | 'orange' | 'lila' | 'rot' | 'tuerkis' | 'gelb' | 'grau';

export interface Category extends Base {
  name: string;
  color: CategoryColor;
  order: number;
}

export type Priority = 1 | 2 | 3; // 1 = hoch, 2 = mittel, 3 = niedrig

export interface Todo extends Base {
  title: string;
  date?: ISODate;
  time?: Time;
  /** Ursprüngliches Datum, bleibt beim automatischen Übertrag erhalten. */
  originalDate?: ISODate;
  priority: Priority;
  note?: string;
  doneAt?: string;
  reminderMin?: ReminderMin;
}

export interface WorkoutSet {
  exerciseId: number;
  weightKg?: number;
  reps?: number;
  seconds?: number;
}

export interface Workout extends Base {
  sportTypeId: number;
  date: ISODate;
  time?: Time;
  durationMin: number;
  distanceKm?: number;
  intensity?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  /** Vorlage (Einheit) aus einem Programm, falls daraus eingetragen. */
  programId?: number;
  unitTemplateId?: number;
  /** Geplante Einheit, die hiermit erledigt wurde. */
  planSessionId?: number;
  sets?: WorkoutSet[];
  /** true = bewusste Pause statt Training (zählt für die Kette). */
  isRestDay?: boolean;
}

export interface PlanSession extends Base {
  title: string;
  sportTypeId: number;
  programId?: number;
  unitTemplateId?: number;
  date: ISODate;
  time?: Time;
  repeat?: Repeat;
  exceptions?: ISODate[];
  targetDurationMin?: number;
  targetDistanceKm?: number;
  note?: string;
  programRunId?: number;
}

export type GoalType = 'haeufigkeit' | 'summe' | 'leistung' | 'gewohnheit';
export type GoalPeriod = 'woche' | 'monat' | 'stichtag' | 'tag';
export type GoalMetric = 'einheiten' | 'minuten' | 'km' | 'zeit' | 'erledigt';

export interface Goal extends Base {
  title: string;
  type: GoalType;
  period: GoalPeriod;
  metric: GoalMetric;
  target: number;
  sportTypeId?: number;
  unitTemplateId?: number;
  habitId?: number;
  /** Bei 'leistung': Distanz der Strecke, Zielzeit steht in `target` (Minuten). */
  distanceKm?: number;
  deadline?: ISODate;
  active: boolean;
}

export interface SportType extends Base {
  name: string;
  hasDistance: boolean;
  color?: string;
}

export interface Exercise extends Base {
  name: string;
  muscles?: string;
  howTo?: string;
  watchOut?: string;
  alternative?: string;
}

export type HabitKind = 'abhaken' | 'zaehler';

export interface Habit extends Base {
  name: string;
  hint?: string;
  kind: HabitKind;
  /** Bei 'zaehler': Tagesziel, z. B. 8 Gläser. */
  target?: number;
  unitLabel?: string;
  active: boolean;
  order: number;
}

export interface HabitLog extends Base {
  habitId: number;
  date: ISODate;
  value: number; // 0/1 bei abhaken, Anzahl bei zaehler
}

export interface UnitTemplate {
  id: number;
  name: string;
  sportTypeId: number;
  durationMin?: number;
  note?: string;
  exercises: { exerciseId: number; sets: number; reps: string }[];
}

export interface Ladder {
  id: number;
  name: string;
  steps: { name: string; target: string }[];
}

/** Programm-Vorlage wie der Winter-Arc. Teilbar als Datei, enthält keine Einträge. */
export interface Program extends Base {
  name: string;
  weeks: number;
  why?: string;
  bigGoal?: string;
  rules: string[];
  units: UnitTemplate[];
  ladders: Ladder[];
  measureEveryWeeks?: number;
  measurements: string[];
  /** Ziele, die beim Start angelegt werden. */
  goalTemplates: Omit<Goal, keyof Base | 'active'>[];
}

/** Ein gestarteter Durchlauf eines Programms. */
export interface ProgramRun extends Base {
  programId: number;
  startDate: ISODate;
  /** Aktuelle Stufe je Leiter (Index ab 0). */
  ladderLevels: Record<number, number>;
  finishedAt?: string;
}

export interface Measurement extends Base {
  programRunId?: number;
  date: ISODate;
  values: Record<string, number | boolean>;
}

export type ThemeMode = 'hell' | 'dunkel' | 'auto';

export interface Settings {
  id: 'main';
  theme: ThemeMode;
  lastBackupAt?: string;
  defaultReminderMin?: ReminderMin;
  inAppHints: boolean;
  /** Standard-Gewohnheiten wurden einmal angelegt. */
  habitsSeeded?: boolean;
  /** Standard-Kategorien wurden einmal angelegt. */
  categoriesSeeded?: boolean;
}
