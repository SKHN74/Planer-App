import { addDays } from 'date-fns';
import type { ISODate, PlanSession, Program, ProgramRun, UnitTemplate, Workout, WorkoutSet } from '../db/types';
import { fromKey, toKey, weekStart } from './dates';
import { occursOn } from './recurrence';

export const INTENSITY_LABEL: Record<number, string> = { 1: 'sehr locker', 2: 'locker', 3: 'mittel', 4: 'hart', 5: 'sehr hart' };

/** Geplante Einheiten an einem Tag, mit dem erledigenden Training (falls vorhanden). */
export interface PlanView { session: PlanSession; done?: Workout }

export function plansOn(sessions: PlanSession[], workouts: Workout[], day: ISODate): PlanView[] {
  return sessions
    .filter((s) => occursOn(s, day))
    .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
    .map((session) => ({ session, done: workouts.find((w) => w.date === day && !w.isRestDay && (w.planSessionId === session.id || matchesUnit(w, session))) }));
}

/** Ein frei eingetragenes Training mit derselben Vorlage erledigt die geplante Einheit auch. */
function matchesUnit(w: Workout, s: PlanSession): boolean {
  return w.planSessionId == null && s.unitTemplateId != null && w.programId === s.programId && w.unitTemplateId === s.unitTemplateId;
}

export function workoutsOn(workouts: Workout[], day: ISODate): Workout[] {
  return workouts.filter((w) => w.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

/** Obere Grenze einer Wiederholungsangabe wie „10–12“ oder „8–10 pro Bein“. */
export function topReps(reps: string): number | undefined {
  const nums = reps.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : undefined;
}

/** Sätze, die zuletzt (vor `before`) für diese Übung eingetragen wurden. */
export function lastSets(workouts: Workout[], exerciseId: number, before: ISODate, excludeId?: number): { date: ISODate; sets: WorkoutSet[] } | undefined {
  const hits = workouts
    .filter((w) => w.id !== excludeId && w.date <= before && w.sets?.some((s) => s.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
  const w = hits[0];
  return w ? { date: w.date, sets: w.sets!.filter((s) => s.exerciseId === exerciseId) } : undefined;
}

/**
 * Progressionshinweis nach der Regel aus dem Programm: Schaffst du in allen Sätzen
 * die obere Wiederholungszahl, nimm beim nächsten Mal etwas mehr Gewicht.
 */
export function progressionHint(target: { sets: number; reps: string }, last?: WorkoutSet[]): string | undefined {
  const top = topReps(target.reps);
  if (!last || !top || last.length < target.sets) return undefined;
  if (!last.every((s) => (s.reps ?? 0) >= top)) return undefined;
  const w = Math.max(...last.map((s) => s.weightKg ?? 0));
  if (w <= 0) return 'Letztes Mal alles geschafft – nimm die nächste Stufe.';
  return `Letztes Mal alle Sätze geschafft – probier ${fmtKg(w + 2.5)} kg.`;
}

export function fmtKg(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export interface WeekSummary { count: number; minutes: number; km: number; restDays: number }

export function weekSummary(workouts: Workout[], day: ISODate): WeekSummary {
  const from = toKey(weekStart(fromKey(day)));
  const to = toKey(addDays(fromKey(from), 6));
  const inWeek = workouts.filter((w) => w.date >= from && w.date <= to);
  const trainings = inWeek.filter((w) => !w.isRestDay);
  return {
    count: trainings.length,
    minutes: trainings.reduce((s, w) => s + (w.durationMin || 0), 0),
    km: trainings.reduce((s, w) => s + (w.distanceKm || 0), 0),
    restDays: inWeek.length - trainings.length
  };
}

/** Der laufende Programm-Durchlauf (der neueste, nicht beendete). */
export function activeRun(runs: ProgramRun[]): ProgramRun | undefined {
  return runs.filter((r) => !r.finishedAt).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

/** Alle Vorlagen (Einheiten) aller Programme, mit eindeutigem Schlüssel. */
export interface UnitRef { key: string; program: Program; unit: UnitTemplate }

export function allUnits(programs: Program[]): UnitRef[] {
  return programs.flatMap((program) => program.units.map((unit) => ({ key: `${program.id}:${unit.id}`, program, unit })));
}

export function findUnit(programs: Program[], programId?: number, unitId?: number): UnitRef | undefined {
  if (programId == null || unitId == null) return undefined;
  return allUnits(programs).find((u) => u.program.id === programId && u.unit.id === unitId);
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}
