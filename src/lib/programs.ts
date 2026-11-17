import type { PlanerDB } from '../db/db';
import type { Exercise, Ladder, Program, UnitTemplate } from '../db/types';
import { ensureDefaultHabits } from './habits';
import { ensureDefaultCategories } from './categories';

/**
 * Programm-Vorlage in teilbarer Form: Übungen stehen direkt drin (statt IDs),
 * damit die Datei auch in einer anderen Installation funktioniert.
 */
export interface PortableProgram {
  format: 'planer-programm';
  version: 1;
  name: string;
  weeks: number;
  why?: string;
  bigGoal?: string;
  rules: string[];
  measureEveryWeeks?: number;
  measurements: string[];
  exercises: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'isDemo'>[];
  units: { name: string; sport: string; durationMin?: number; note?: string; exercises: { name: string; sets: number; reps: string }[] }[];
  ladders: { name: string; steps: { name: string; target: string }[] }[];
}

export const WINTER_ARC: PortableProgram = {
  format: 'planer-programm',
  version: 1,
  name: 'Winter-Arc',
  weeks: 20,
  rules: [
    'Nie zweimal hintereinander auslassen.',
    'Training steht im Kalender wie ein Termin.',
    'Alkohol: max. 1 Abend, Limit vorher festlegen.',
    'Nach jedem Drink ein Glas Wasser.',
    'Ausrutscher? Nächste Mahlzeit ganz normal weiter.',
    'Waage max. 1× pro Woche – Fotos lügen nicht.'
  ],
  measureEveryWeeks: 4,
  measurements: ['Gewicht (kg)', 'Taille (cm)', 'Fotos gemacht', 'An Stange hängen (Sek.)', 'Seilspringen am Stück (Min.)', 'Gefühl / Energie (1–10)'],
  exercises: [
    { name: 'Kniebeuge (Goblet Squat)', muscles: 'Beine & Po', howTo: 'Kurzhantel senkrecht vor der Brust halten, Füße schulterbreit, Zehen leicht nach außen. Po nach hinten-unten setzen wie auf einen Stuhl, bis die Oberschenkel etwa waagrecht sind. Über die ganze Fußsohle wieder hochdrücken.', watchOut: 'Knie zeigen in Richtung Zehen, Fersen bleiben am Boden, Brust bleibt oben.', alternative: 'Beinpresse' },
    { name: 'Latzug', muscles: 'Oberer Rücken & Arme', howTo: 'Stange etwas breiter als schulterbreit greifen, Knie fixieren. Brust raus, Stange zur oberen Brust ziehen, Ellbogen nach unten. Langsam (2 Sek.) wieder hochlassen.', watchOut: 'Nicht mit Schwung nach hinten werfen, nie in den Nacken ziehen. Schultern weg von den Ohren.', alternative: 'Klimmzug-Maschine mit Unterstützung' },
    { name: 'Brustpresse (Maschine)', muscles: 'Brust, Schultern, Trizeps', howTo: 'Griffe auf Brusthöhe. Schulterblätter leicht nach hinten-unten, Griffe nach vorne drücken bis die Arme fast gestreckt sind, 2 Sek. kontrolliert zurück.', watchOut: 'Rücken bleibt an der Lehne, Ellbogen etwas unter Schulterhöhe.', alternative: 'Liegestütze mit Händen auf einer Bank' },
    { name: 'Rudern am Kabel (sitzend)', muscles: 'Mittlerer Rücken & Haltung', howTo: 'Aufrecht sitzen, Knie leicht gebeugt. Griff zum Bauchnabel ziehen, Schulterblätter zusammendrücken, 1 Sek. halten. Langsam nach vorne lassen.', watchOut: 'Oberkörper bleibt ruhig, nicht schaukeln.', alternative: 'Rudermaschine mit Brustpolster' },
    { name: 'Plank', muscles: 'Bauch & Rumpf', howTo: 'Unterarme auf den Boden, Ellbogen unter den Schultern. Gerade Linie von Kopf bis Fersen, Bauch und Po anspannen, ruhig atmen.', watchOut: 'Hüfte nicht durchhängen lassen und nicht nach oben schieben.', alternative: 'Knie-Plank' },
    { name: 'Hip Thrust', muscles: 'Po & hintere Oberschenkel', howTo: 'Oberen Rücken an eine Bank lehnen, Hantel mit Polster auf die Hüfte, Füße hüftbreit. Hüfte hochdrücken bis Knie, Hüfte und Schultern eine Linie bilden. Oben 1 Sek. anspannen.', watchOut: 'Kinn leicht zur Brust, kein Hohlkreuz.', alternative: 'Hip-Thrust-Maschine oder Glute Bridge' },
    { name: 'Rumänisches Kreuzheben', muscles: 'Hintere Oberschenkel, Po, Rücken', howTo: 'Zwei Kurzhanteln vor den Oberschenkeln, Knie leicht gebeugt. Po weit nach hinten schieben, Hanteln gleiten nah an den Beinen bis unter die Knie. Durch Po-Anspannung aufrichten.', watchOut: 'Rücken bleibt die ganze Zeit gerade. Bewusst leicht starten.', alternative: 'Beinbeuger-Maschine' },
    { name: 'Schulterdrücken', muscles: 'Schultern & Trizeps', howTo: 'Aufrecht auf einer Bank mit Lehne, Kurzhanteln auf Schulterhöhe. Nach oben drücken bis die Arme fast gestreckt sind, kontrolliert zurück.', watchOut: 'Kein Hohlkreuz, Rücken an der Lehne, Bauch fest.', alternative: 'Schulterpresse an der Maschine' },
    { name: 'Latzug eng (V-Griff)', muscles: 'Rücken & Bizeps', howTo: 'V-Griff einhängen, Knie fixieren. Griff zur oberen Brust ziehen, Ellbogen eng am Körper. Unten kurz halten, langsam hochlassen.', watchOut: 'Leicht zurückgelehnt, aber nicht schaukeln. Schultern unten lassen.', alternative: 'Assistierte Klimmzüge' },
    { name: 'Ausfallschritte', muscles: 'Beine & Po', howTo: 'Großer Schritt nach vorne, beide Knie beugen bis das hintere Knie knapp über dem Boden ist. Über die vordere Ferse zurückdrücken, Bein wechseln.', watchOut: 'Vorderes Knie bleibt über dem Fuß, Oberkörper aufrecht.', alternative: 'Step-ups auf eine Bank' },
    { name: 'Seilspringen', muscles: 'Ausdauer', howTo: '10 × 1 Min springen, dazwischen 30 Sek. Pause.' },
    { name: 'Klimmzug-Leiter', muscles: 'Rücken & Arme', howTo: 'Übung deiner aktuellen Stufe der Klimmzug-Leiter.' },
    { name: 'Liegestütz-Leiter', muscles: 'Brust & Arme', howTo: 'Übung deiner aktuellen Stufe der Liegestütz-Leiter, 3 Sätze.' }
  ],
  units: [
    { name: 'Gym A', sport: 'Gym', durationMin: 55, note: 'Ganzkörper · Pause 60–90 Sek. · erst 5–8 Min aufwärmen', exercises: [
      { name: 'Kniebeuge (Goblet Squat)', sets: 3, reps: '10–12' }, { name: 'Latzug', sets: 3, reps: '10–12' }, { name: 'Brustpresse (Maschine)', sets: 3, reps: '10–12' },
      { name: 'Rudern am Kabel (sitzend)', sets: 3, reps: '10–12' }, { name: 'Plank', sets: 3, reps: '30–45 Sek.' }] },
    { name: 'Gym B', sport: 'Gym', durationMin: 55, note: 'Erst aufwärmen wie bei A · Pause 60–90 Sek.', exercises: [
      { name: 'Hip Thrust', sets: 3, reps: '10–12' }, { name: 'Rumänisches Kreuzheben', sets: 3, reps: '10' }, { name: 'Schulterdrücken', sets: 3, reps: '10–12' },
      { name: 'Latzug eng (V-Griff)', sets: 3, reps: '10–12' }, { name: 'Ausfallschritte', sets: 3, reps: '8–10 pro Bein' }] },
    { name: 'Zuhause', sport: 'Zuhause', durationMin: 25, exercises: [
      { name: 'Seilspringen', sets: 10, reps: '1 Min' }, { name: 'Klimmzug-Leiter', sets: 3, reps: 'Stufe' }, { name: 'Liegestütz-Leiter', sets: 3, reps: 'Stufe' }] }
  ],
  ladders: [
    { name: 'Klimmzug-Leiter', steps: [
      { name: 'Hängen an der Stange', target: '3 × 30 Sek.' }, { name: 'Schulterblatt-Züge', target: '3 × 8' }, { name: 'Negative Klimmzüge', target: '3 × 5, je 5 Sek. runter' },
      { name: 'Mit Band oder Maschine', target: '3 × 8' }, { name: 'Erster echter Klimmzug!', target: '1 sauberer Klimmzug' }] },
    { name: 'Liegestütz-Leiter', steps: [
      { name: 'An der Wand', target: '3 × 12' }, { name: 'An der Küchentheke', target: '3 × 12' }, { name: 'An Bank oder Stuhl', target: '3 × 12' },
      { name: 'Negative am Boden', target: '3 × 5, je 3 Sek. runter' }, { name: 'Echte Liegestütze', target: '3 × 10' }] }
  ]
};

export const DEFAULT_SPORTS: { name: string; hasDistance: boolean }[] = [
  { name: 'Gym', hasDistance: false }, { name: 'Zuhause', hasDistance: false }, { name: 'Laufen', hasDistance: true },
  { name: 'Radfahren', hasDistance: true }, { name: 'Schwimmen', hasDistance: true }, { name: 'Yoga', hasDistance: false },
  { name: 'Wandern', hasDistance: true }, { name: 'Sonstiges', hasDistance: false }
];

async function sportId(d: PlanerDB, name: string): Promise<number> {
  const found = await d.sportTypes.where('name').equals(name).first();
  if (found?.id) return found.id;
  const ts = new Date().toISOString();
  return (await d.sportTypes.add({ name, hasDistance: false, createdAt: ts, updatedAt: ts })) as number;
}

/** Legt ein Programm samt fehlender Übungen und Sportarten an. Gibt die Programm-ID zurück. */
export async function installProgram(d: PlanerDB, p: PortableProgram, opts: { isDemo?: boolean } = {}): Promise<number> {
  const ts = new Date().toISOString();
  return d.transaction('rw', d.programs, d.exercises, d.sportTypes, async () => {
    const exId = new Map<string, number>();
    for (const ex of p.exercises) {
      const existing = await d.exercises.where('name').equals(ex.name).first();
      exId.set(ex.name, existing?.id ?? ((await d.exercises.add({ ...ex, createdAt: ts, updatedAt: ts })) as number));
    }
    const units: UnitTemplate[] = [];
    for (const [i, u] of p.units.entries()) {
      const exercises = [];
      for (const e of u.exercises) {
        let id = exId.get(e.name);
        if (!id) { id = (await d.exercises.add({ name: e.name, createdAt: ts, updatedAt: ts })) as number; exId.set(e.name, id); }
        exercises.push({ exerciseId: id, sets: e.sets, reps: e.reps });
      }
      units.push({ id: i + 1, name: u.name, sportTypeId: await sportId(d, u.sport), durationMin: u.durationMin, note: u.note, exercises });
    }
    const ladders: Ladder[] = p.ladders.map((l, i) => ({ id: i + 1, ...l }));
    const program: Program = {
      name: p.name, weeks: p.weeks, why: p.why, bigGoal: p.bigGoal, rules: p.rules, units, ladders,
      measureEveryWeeks: p.measureEveryWeeks, measurements: p.measurements, goalTemplates: [],
      createdAt: ts, updatedAt: ts, isDemo: opts.isDemo
    };
    return (await d.programs.add(program)) as number;
  });
}

const pending = new WeakMap<PlanerDB, Promise<void>>();

/** Grunddaten beim ersten Start: Sportarten und die Winter-Arc-Vorlage. Mehrfach aufrufbar. */
export function ensureDefaults(d: PlanerDB): Promise<void> {
  // gleichzeitige Aufrufe (z. B. React StrictMode) teilen sich einen Durchlauf
  const running = pending.get(d);
  if (running) return running;
  const p = (async () => {
    const ts = new Date().toISOString();
    if ((await d.sportTypes.count()) === 0) {
      await d.sportTypes.bulkAdd(DEFAULT_SPORTS.map((s) => ({ ...s, createdAt: ts, updatedAt: ts })));
    }
    if (!(await d.programs.where('name').equals(WINTER_ARC.name).first())) {
      await installProgram(d, WINTER_ARC);
    }
    await ensureDefaultHabits(d);
    await ensureDefaultCategories(d);
  })().finally(() => pending.delete(d));
  pending.set(d, p);
  return p;
}

/** Woche des Durchlaufs (1-basiert) für ein Datum. */
export function runWeek(startDate: string, day: string): number {
  const ms = new Date(day + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime();
  return Math.floor(Math.round(ms / 86_400_000) / 7) + 1;
}
