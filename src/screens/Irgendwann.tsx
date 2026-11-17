import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { somedayTodos } from '../lib/agenda';
import { TodoRow } from '../components/AgendaParts';
import { useEditor } from '../components/Editor';
import { IconChevronLeft } from '../components/icons';

export default function Irgendwann() {
  const editor = useEditor();
  const todos = useLiveQuery(() => db.todos.toArray(), [], []);
  const open = somedayTodos(todos);
  return (
    <main className="screen">
      <header>
        <a href="#/heute" className="row" style={{ width: 'auto', minHeight: 44, padding: '0 4px', color: 'var(--accent)', textDecoration: 'none', justifyContent: 'flex-start', gap: 2 }}><IconChevronLeft />Heute</a>
        <h1 className="title" style={{ margin: '4px 4px 0' }}>Irgendwann</h1>
        <p className="small muted" style={{ margin: '4px 4px 0' }}>To-dos ohne Datum</p>
      </header>
      <section className="card">
        {open.length === 0 ? <div className="empty">Keine offenen To-dos ohne Datum</div> :
          open.map((t) => <TodoRow key={t.id} v={{ todo: t, done: false }} onOpen={() => editor.editTodo(undefined, t)} />)}
        <button className="btn secondary block" style={{ marginTop: 10 }} onClick={() => editor.editTodo(undefined)}>+ To-do ohne Datum</button>
      </section>
    </main>
  );
}
