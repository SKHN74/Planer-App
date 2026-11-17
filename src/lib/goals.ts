import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Goal, Habit, HabitLog, ISODate, Workout } from '../db/types';
import { fromKey, isoWeek, toKey, weekStart } from './dates';
import { isDone } from './habits';
import { fmtKg } from './sport';

export interface GoalData { workouts: Workout[]; habits: Habit[]; habitLogs: HabitLog[] }

export interface GoalView {
  /** Fortschritt 0…1 */
  progress: number;
  /** z. B. „1 von 3 Einheiten · KW 47“ */
  valueLabel: string;
  onTrack: boolean;
  /** z. B. „im Plan“, „geschafft“, „5,3 km hinter Plan“ */
  status: string;
  /** z. B. „Serie: 2 Wochen“ oder „134 Tage übrig“ */
  extra: string;
}

interface Range { from: ISODate; to: ISODate; label: string }

function periodRange(period: 'woche' | 'monat', day: ISODate): Range {
  const d = fromKey(day);
  if (period === 'woche') {
    const s = weekStart(d);
    return { from: toKey(s), to: toKey(addDays(s, 6)), label: `KW ${isoWeek(d)}` };
  }
  return { from: toKey(startOfMonth(d)), to: toKey(endOfMonth(d)), label: format(d, 'MMMM', { locale: de }) };
}

function previousPeriodDay(period: 'woche' | 'monat', r: Range): ISODate {
  return period === 'woche' ? toKey(addDays(fromKey(r.from), -1)) : toKey(addMonths(fromKey(r.from), -1));
}

/** Passt ein Training zum Ziel (Sportart / Vorlage)? Pausen zählen nie. */
function matches(g: Goal, w: Workout): boolean {
  if (w.isRestDay) return false;
  if (g.sportTypeId != null && w.sportTypeId !== g.sportTypeId) return false;
  if (g.unitTemplateId != null && w.unitTemplateId !== g.unitTemplateId) return false;
  return true;
}

/** Ist-Wert eines Ziels in einem Zeitraum. */
export function amount(g: Goal, data: GoalData, r: Range): number {
  if (g.type === 'gewohnheit') {
    const h = data.habits.find((x) => x.id === g.habitId);
    if (!h) return 0;
    return data.habitLogs.filter((l) => l.habitId === h.id && l.date >= r.from && l.date <= r.to && isDone(h, l.value)).length;
  }
  const ws = data.workouts.filter((w) => w.date >= r.from && w.date <= r.to && matches(g, w));
  if (g.type === 'haeufigkeit') return ws.length;
  if (g.metric === 'km') return ws.reduce((s, w) => s + (w.distanceKm ?? 0), 0);
  return ws.reduce((s, w) => s + (w.durationMin || 0), 0);
}

const UNIT: Record<string, [string, string]> = { einheiten: ['Einheit', 'Einheiten'], minuten: ['Min', 'Min'], km: ['km', 'km'], erledigt: ['Tag', 'Tagen'] };

function unitLabel(g: Goal, n: number): string {
  const metric = g.type === 'haeufigkeit' ? 'einheiten' : g.type === 'gewohnheit' ? 'erledigt' : g.metric;
  const [one, many] = UNIT[metric] ?? ['', ''];
  return n === 1 ? one : many;
}

const num = (n: number) => fmtKg(Math.round(n * 10) / 10);

/** Bestzeit hochgerechnet auf die Zieldistanz, aus allen Trainings mit mindestens dieser Distanz. */
export function bestTime(g: Goal, workouts: Workout[], until?: ISODate): number | undefined {
  const dist = g.distanceKm ?? 0;
  const times = workouts
    .filter((w) => matches(g, w) && (w.distanceKm ?? 0) >= dist && dist > 0 && w.durationMin > 0 && (!until || w.date <= until))
    .map((w) => (w.durationMin * dist) / w.distanceKm!);
  return times.length ? Math.min(...times) : undefined;
}

export function minutesLabel(min: number): string {
  const total = Math.round(min * 60);
  // Laufzeiten unter 2 Stunden als mm:ss (z. B. 64:30), darüber h:mm:ss
  const h = total >= 7200 ? Math.floor(total / 3600) : 0;
  const m = Math.floor((total - h * 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function evaluateGoal(g: Goal, data: GoalData, today: ISODate): GoalView {
  if (g.type === 'leistung') {
    const best = bestTime(g, data.workouts);
    const left = g.deadline ? differenceInCalendarDays(fromKey(g.deadline), fromKey(today)) : undefined;
    const reached = best != null && best <= g.target;
    const progress = best ? Math.min(1, g.target / best) : 0;
    const extra = reached ? 'Ziel erreicht' : left == null ? '' : left >= 0 ? `${left} ${left === 1 ? 'Tag' : 'Tage'} übrig` : 'Stichtag vorbei';
    return {
      progress,
      valueLabel: (best ? `Bestzeit ${minutesLabel(best)}` : 'Noch keine Zeit') + (g.deadline ? ` · bis ${format(fromKey(g.deadline), 'dd.MM.yyyy')}` : ''),
      onTrack: reached || (left == null || left >= 0),
      status: reached ? 'geschafft' : best ? `noch ${minutesLabel(best - g.target)} schneller` : `noch keine Einheit ab ${num(g.distanceKm ?? 0)} km`,
      extra
    };
  }

  const period = g.period === 'monat' ? 'monat' : 'woche';
  const r = periodRange(period, today);
  const value = amount(g, data, r);
  const total = differenceInCalendarDays(fromKey(r.to), fromKey(r.from)) + 1;
  const elapsed = differenceInCalendarDays(fromKey(today), fromKey(r.from)); // volle Tage vor heute
  const expected = (g.target * elapsed) / total;
  const done = value >= g.target;
  const behind = expected - value;
  const onTrack = done || behind <= (g.type === 'summe' ? 0 : 0.5);

  // Serie: abgeschlossene Zeiträume davor, in denen das Ziel erreicht wurde (+ der aktuelle, wenn schon geschafft)
  let streak = done ? 1 : 0;
  let prev = periodRange(period, previousPeriodDay(period, r));
  for (let i = 0; i < 520 && amount(g, data, prev) >= g.target; i++) {
    streak++;
    prev = periodRange(period, previousPeriodDay(period, prev));
  }
  const unitWord = period === 'woche' ? (streak === 1 ? 'Woche' : 'Wochen') : (streak === 1 ? 'Monat' : 'Monate');

  return {
    progress: g.target > 0 ? Math.min(1, value / g.target) : 0,
    valueLabel: `${num(value)} von ${num(g.target)} ${unitLabel(g, g.target)} · ${r.label}`,
    onTrack,
    status: done ? 'geschafft' : onTrack ? 'im Plan' : behindLabel(g, behind),
    extra: streak > 0 ? `Serie: ${streak} ${unitWord}` : ''
  };
}

function behindLabel(g: Goal, behind: number): string {
  const n = g.type === 'summe' ? behind : Math.max(1, Math.round(behind));
  return `${num(n)} ${unitLabel(g, n)} hinter Plan`;
}

/** Vorschlag für den Titel, wenn keiner eingegeben wurde. */
export function goalTitle(g: Omit<Goal, 'title' | 'createdAt' | 'updatedAt'>, names: { sport?: string; unit?: string; habit?: string }): string {
  const per = g.period === 'monat' ? 'im Monat' : 'pro Woche';
  const what = names.unit ?? names.sport;
  switch (g.type) {
    case 'haeufigkeit': return `${g.target}× ${what ?? 'Training'} ${per}`;
    case 'summe': return `${num(g.target)} ${g.metric === 'km' ? 'km' : 'Min'} ${what ?? 'Sport'} ${per}`;
    case 'leistung': return `${num(g.distanceKm ?? 0)} km unter ${minutesLabel(g.target)}`;
    case 'gewohnheit': return `${names.habit ?? 'Gewohnheit'} ${g.target}× pro Woche`;
  }
}
