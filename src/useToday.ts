import { useEffect, useState } from 'react';
import { toKey } from './lib/dates';

/** Heutiges Datum, aktualisiert sich jede Minute (z. B. über Mitternacht oder nach dem Aufwachen der App). */
export function useNow(): Date {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setD(new Date());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return d;
}

export function useTodayKey(): string {
  return toKey(useNow());
}
