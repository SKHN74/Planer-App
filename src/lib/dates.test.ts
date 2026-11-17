import { describe, expect, it } from 'vitest';
import { formatLong, isoWeek, monthGrid, toKey, weekDays } from './dates';

describe('Datumsfunktionen', () => {
  it('Woche beginnt am Montag', () => {
    const days = weekDays(new Date(2026, 10, 17)); // Di 17.11.2026
    expect(toKey(days[0])).toBe('2026-11-16');
    expect(toKey(days[6])).toBe('2026-11-22');
  });

  it('Kalenderwoche nach ISO', () => {
    expect(isoWeek(new Date(2026, 10, 9))).toBe(46);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53); // Fr 01.01.2027 gehört zu KW 53/2026
  });

  it('Monatsraster November 2026: 6 Wochen ab Mo 26.10.', () => {
    const g = monthGrid(2026, 10);
    expect(g).toHaveLength(6);
    expect(toKey(g[0].days[0])).toBe('2026-10-26');
    expect(g[0].kw).toBe(44);
    expect(toKey(g[5].days[6])).toBe('2026-12-06');
  });

  it('Monatsraster, wenn der Erste ein Montag ist', () => {
    const g = monthGrid(2027, 2); // 01.03.2027 = Montag
    expect(toKey(g[0].days[0])).toBe('2027-03-01');
  });

  it('deutsches Datumsformat', () => {
    expect(formatLong(new Date(2026, 10, 17))).toBe('Dienstag, 17. November');
  });
});
