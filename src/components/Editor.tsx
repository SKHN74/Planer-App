import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CalendarEvent, Todo } from '../db/types';
import { EventForm } from './EventForm';
import { TodoForm } from './TodoForm';
import { Sheet } from './Sheet';

type Open =
  | { kind: 'event'; event?: CalendarEvent; day: string }
  | { kind: 'todo'; todo?: Todo; day?: string }
  | { kind: 'pick'; day: string };

interface EditorApi {
  editEvent: (day: string, event?: CalendarEvent) => void;
  editTodo: (day?: string, todo?: Todo) => void;
  /** Auswahl „Termin oder To-do?“ für den Plus-Knopf. */
  create: (day: string) => void;
}

const Ctx = createContext<EditorApi | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  const api: EditorApi = {
    editEvent: (day, event) => setOpen({ kind: 'event', event, day }),
    editTodo: (day, todo) => setOpen({ kind: 'todo', todo, day }),
    create: (day) => setOpen({ kind: 'pick', day })
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      {open?.kind === 'event' && <EventForm key={open.event?.id ?? 'new'} event={open.event} day={open.day} onClose={close} />}
      {open?.kind === 'todo' && <TodoForm key={open.todo?.id ?? 'new'} todo={open.todo} day={open.day} onClose={close} />}
      {open?.kind === 'pick' && (
        <Sheet title="Neu" onClose={close}>
          <div className="choice">
            <button className="btn block" onClick={() => setOpen({ kind: 'event', day: open.day })}>Termin</button>
            <button className="btn block" style={{ background: 'var(--orange)', color: '#fff' }} onClick={() => setOpen({ kind: 'todo', day: open.day })}>To-do</button>
          </div>
        </Sheet>
      )}
    </Ctx.Provider>
  );
}

export function useEditor(): EditorApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('EditorProvider fehlt');
  return c;
}
