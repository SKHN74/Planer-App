import { describe, expect, it } from 'vitest';
import { occursOn, repeatLabel } from './recurrence';

describe('Wiederholungen', () => {
  it('einmaliger Termin', () => {
    const e = { date: '2026-11-17' };
    expect(occursOn(e, '2026-11-17')).toBe(true);
    expect(occursOn(e, '2026-11-18')).toBe(false);
  });

  it('täglich mit Ende und Ausnahme', () => {
    const e = { date: '2026-11-17', repeat: { kind: 'taeglich' as const, until: '2026-11-20' }, exceptions: ['2026-11-19'] };
    expect(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'].map((d) => occursOn(e, d)))
      .toEqual([false, true, true, false, true, false]);
  });

  it('wöchentlich an bestimmten Wochentagen (Mo, Mi, Fr)', () => {
    const e = { date: '2026-11-16', repeat: { kind: 'woechentlich' as const, weekdays: [0, 2, 4] } };
    expect(occursOn(e, '2026-11-18')).toBe(true); // Mi
    expect(occursOn(e, '2026-11-19')).toBe(false); // Do
    expect(occursOn(e, '2026-12-25')).toBe(true); // Fr
  });

  it('wöchentlich ohne Tage = Wochentag des Starts, alle 2 Wochen', () => {
    const e = { date: '2026-11-17', repeat: { kind: 'woechentlich' as const, interval: 2 } };
    expect(occursOn(e, '2026-11-24')).toBe(false);
    expect(occursOn(e, '2026-12-01')).toBe(true);
  });

  it('monatlich am 31. fällt in kurzen Monaten auf den letzten Tag', () => {
    const e = { date: '2027-01-31', repeat: { kind: 'monatlich' as const } };
    expect(occursOn(e, '2027-02-28')).toBe(true);
    expect(occursOn(e, '2027-03-31')).toBe(true);
    expect(occursOn(e, '2027-04-30')).toBe(true);
    expect(occursOn(e, '2027-04-29')).toBe(false);
  });

  it('über die Zeitumstellung hinweg (29.03.2027)', () => {
    const e = { date: '2027-03-27', repeat: { kind: 'taeglich' as const, interval: 2 } };
    expect(occursOn(e, '2027-03-29')).toBe(true);
    expect(occursOn(e, '2027-03-30')).toBe(false);
  });

  it('Beschriftung', () => {
    expect(repeatLabel({ kind: 'woechentlich', weekdays: [0, 2, 4] })).toBe('Wöchentlich (Mo, Mi, Fr)');
    expect(repeatLabel({ kind: 'taeglich', until: '2026-12-31' })).toBe('Täglich bis 31.12.2026');
  });
});
