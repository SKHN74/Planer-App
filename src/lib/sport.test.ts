import { describe, expect, it } from 'vitest';
import type { PlanSession, Workout } from '../db/types';
import { activeRun, lastSets, plansOn, progressionHint, topReps, weekSummary } from './sport';
import { runWeek } from './programs';

const ts = '2026-11-01T10:00:00.000Z';
const w = (p: Partial<Workout>): Workout => ({ sportTypeId: 1, date: '2026-11-17', durationMin: 30, createdAt: ts, updatedAt: ts, ...p });

describe('Sport', () => {
  it('liest die obere Wiederholungszahl', () => {
    expect(topReps('10–12')).toBe(12);
    expect(topReps('8–10 pro Bein')).toBe(10);
    expect(topReps('Stufe')).toBeUndefined();
  });

  it('schlägt mehr Gewicht nur vor, wenn alle Sätze geschafft sind', () => {
    const t = { sets: 3, reps: '10–12' };
    const s = (reps: number[]) => reps.map((r) => ({ exerciseId: 1, weightKg: 20, reps: r }));
    expect(progressionHint(t, s([12, 12, 12]))).toBe('Letztes Mal alle Sätze geschafft – probier 22,5 kg.');
    expect(progressionHint(t, s([12, 12, 11]))).toBeUndefined();
    expect(progressionHint(t, s([12, 12]))).toBeUndefined();
    expect(progressionHint(t, undefined)).toBeUndefined();
  });

  it('findet die letzten Sätze einer Übung', () => {
    const list = [
      w({ id: 1, date: '2026-11-10', sets: [{ exerciseId: 5, weightKg: 20, reps: 10 }] }),
      w({ id: 2, date: '2026-11-13', sets: [{ exerciseId: 5, weightKg: 22.5, reps: 9 }, { exerciseId: 6, reps: 8 }] }),
      w({ id: 3, date: '2026-11-20', sets: [{ exerciseId: 5, weightKg: 25, reps: 8 }] })
    ];
    expect(lastSets(list, 5, '2026-11-17')).toEqual({ date: '2026-11-13', sets: [{ exerciseId: 5, weightKg: 22.5, reps: 9 }] });
    expect(lastSets(list, 5, '2026-11-13', 2)?.date).toBe('2026-11-10');
    expect(lastSets(list, 7, '2026-11-17')).toBeUndefined();
  });

  it('fasst die Woche (Mo–So) zusammen, Pausen zählen nicht als Training', () => {
    const list = [
      w({ date: '2026-11-16', durationMin: 45 }),
      w({ date: '2026-11-18', durationMin: 30, distanceKm: 5.5 }),
      w({ date: '2026-11-19', durationMin: 0, isRestDay: true }),
      w({ date: '2026-11-15', durationMin: 60 }),
      w({ date: '2026-11-23', durationMin: 60 })
    ];
    expect(weekSummary(list, '2026-11-17')).toEqual({ count: 2, minutes: 75, km: 5.5, restDays: 1 });
  });

  it('zeigt geplante Einheiten und erkennt erledigte', () => {
    const plan: PlanSession = { id: 9, title: 'Gym A', sportTypeId: 1, date: '2026-11-02', repeat: { kind: 'woechentlich', weekdays: [1, 4] }, createdAt: ts, updatedAt: ts };
    expect(plansOn([plan], [], '2026-11-17')).toHaveLength(1); // Dienstag
    expect(plansOn([plan], [], '2026-11-18')).toHaveLength(0);
    const done = plansOn([plan], [w({ planSessionId: 9, date: '2026-11-17' })], '2026-11-17');
    expect(done[0].done).toBeDefined();
    const unitPlan = { ...plan, programId: 1, unitTemplateId: 2 };
    expect(plansOn([unitPlan], [w({ programId: 1, unitTemplateId: 2 })], '2026-11-17')[0].done).toBeDefined();
    expect(plansOn([unitPlan], [w({ programId: 1, unitTemplateId: 3 })], '2026-11-17')[0].done).toBeUndefined();
  });

  it('rechnet Programmwochen und den aktiven Durchlauf', () => {
    expect(runWeek('2026-11-17', '2026-11-17')).toBe(1);
    expect(runWeek('2026-11-17', '2026-11-23')).toBe(1);
    expect(runWeek('2026-11-17', '2026-11-24')).toBe(2);
    const r = (id: number, startDate: string, finishedAt?: string) => ({ id, programId: 1, startDate, ladderLevels: {}, finishedAt, createdAt: ts, updatedAt: ts });
    expect(activeRun([r(1, '2026-01-01'), r(2, '2026-06-01', ts)])?.id).toBe(1);
    expect(activeRun([r(2, '2026-06-01', ts)])).toBeUndefined();
  });
});
