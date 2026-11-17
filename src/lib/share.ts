import type { PlanerDB } from '../db/db';
import type { Program } from '../db/types';
import { installProgram, type PortableProgram } from './programs';

/** Wandelt ein gespeichertes Programm in eine teilbare Vorlage (ohne Einträge, ohne IDs). */
export async function exportProgram(d: PlanerDB, p: Program): Promise<PortableProgram> {
  const exIds = [...new Set(p.units.flatMap((u) => u.exercises.map((e) => e.exerciseId)))];
  const exercises = (await d.exercises.bulkGet(exIds)).filter((e) => !!e);
  const exName = new Map(exercises.map((e) => [e!.id!, e!.name]));
  const sports = await d.sportTypes.toArray();
  const sportName = (id: number) => sports.find((s) => s.id === id)?.name ?? 'Sonstiges';
  return {
    format: 'planer-programm',
    version: 1,
    name: p.name,
    weeks: p.weeks,
    why: p.why,
    bigGoal: p.bigGoal,
    rules: p.rules,
    measureEveryWeeks: p.measureEveryWeeks,
    measurements: p.measurements,
    exercises: exercises.map((e) => ({ name: e!.name, muscles: e!.muscles, howTo: e!.howTo, watchOut: e!.watchOut, alternative: e!.alternative })),
    units: p.units.map((u) => ({
      name: u.name, sport: sportName(u.sportTypeId), durationMin: u.durationMin, note: u.note,
      exercises: u.exercises.map((e) => ({ name: exName.get(e.exerciseId) ?? 'Übung', sets: e.sets, reps: e.reps }))
    })),
    ladders: p.ladders.map((l) => ({ name: l.name, steps: l.steps }))
  };
}

export function parseProgram(text: string): PortableProgram {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Die Datei ist keine gültige Programm-Datei.'); }
  const p = data as Partial<PortableProgram>;
  if (!p || p.format !== 'planer-programm') {
    if ((data as { app?: string })?.app === 'planer-app') throw new Error('Das ist ein Backup, kein Programm. Backups spielst du in den Einstellungen ein.');
    throw new Error('Die Datei ist keine Programm-Datei der Planer-App.');
  }
  if ((p.version ?? 0) > 1) throw new Error('Das Programm stammt aus einer neueren App-Version. Bitte die App aktualisieren.');
  if (typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.units)) throw new Error('Das Programm ist unvollständig.');
  return {
    format: 'planer-programm', version: 1, name: p.name.trim(), weeks: Math.max(1, Math.round(Number(p.weeks) || 1)),
    why: p.why, bigGoal: p.bigGoal, rules: Array.isArray(p.rules) ? p.rules.map(String) : [],
    measureEveryWeeks: p.measureEveryWeeks, measurements: Array.isArray(p.measurements) ? p.measurements.map(String) : [],
    exercises: Array.isArray(p.exercises) ? p.exercises.filter((e) => e && typeof e.name === 'string') : [],
    units: p.units.filter((u) => u && typeof u.name === 'string').map((u) => ({
      ...u, sport: typeof u.sport === 'string' ? u.sport : 'Sonstiges',
      exercises: Array.isArray(u.exercises) ? u.exercises.filter((e) => e && typeof e.name === 'string').map((e) => ({ name: e.name, sets: Number(e.sets) || 1, reps: String(e.reps ?? '') })) : []
    })),
    ladders: Array.isArray(p.ladders) ? p.ladders.filter((l) => l && typeof l.name === 'string' && Array.isArray(l.steps) && l.steps.length > 0) : []
  };
}

/** Importiert ein Programm; bei gleichem Namen wird „(2)“, „(3)“ … angehängt. */
export async function importProgram(d: PlanerDB, p: PortableProgram): Promise<{ id: number; name: string }> {
  let name = p.name;
  for (let i = 2; await d.programs.where('name').equals(name).first(); i++) name = `${p.name} (${i})`;
  const id = await installProgram(d, { ...p, name });
  return { id, name };
}

export function programFileName(name: string): string {
  const slug = name.toLowerCase().replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]!).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'programm'}.planer-programm.json`;
}

/** Teilen-Menü (iPhone) oder Download als Datei. Gibt false zurück, wenn abgebrochen. */
export async function shareFile(file: File, title: string): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return true; } catch { return false; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
