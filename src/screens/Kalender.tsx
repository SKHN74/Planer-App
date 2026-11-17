import { useMemo, useState } from 'react';
import { addMonths, isSameDay, isSameMonth } from 'date-fns';
import { formatLong, formatMonth, monthGrid, toKey } from '../lib/dates';
import { IconChevronLeft, IconChevronRight } from '../components/icons';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Kalender() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const grid = useMemo(() => monthGrid(month.getFullYear(), month.getMonth()), [month]);
  const [name, year] = formatMonth(month).split(' ');

  const goToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(today);
  };

  return (
    <main className="screen">
      <header className="screen-header">
        <h1 className="title" style={{ fontSize: 24, flex: 1, whiteSpace: 'nowrap' }}>{name} <span className="muted" style={{ fontWeight: 500 }}>{year}</span></h1>
        <button className="icon-btn" aria-label="Voriger Monat" onClick={() => setMonth(addMonths(month, -1))}><IconChevronLeft /></button>
        <button className="icon-btn" aria-label="Nächster Monat" onClick={() => setMonth(addMonths(month, 1))}><IconChevronRight /></button>
        <button className="btn secondary" style={{ minHeight: 36 }} onClick={goToday}>Heute</button>
      </header>

      <div className="calendar-card" role="grid" aria-label={formatMonth(month)}>
        <div className="month-head"><span>KW</span>{WD.map((w) => <span key={w}>{w}</span>)}</div>
        {grid.map((w) => (
          <div className="month-week" role="row" key={w.kw + toKey(w.days[0])}>
            <span className="month-kw">{w.kw}</span>
            {w.days.map((d) => {
              const cls = ['day-num', isSameMonth(d, month) ? '' : 'other', isSameDay(d, today) ? 'today' : ''].join(' ');
              return (
                <button key={toKey(d)} role="gridcell" className="month-day" aria-selected={isSameDay(d, selected)} aria-label={formatLong(d)} onClick={() => setSelected(d)}>
                  <span className={cls}>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <section>
        <h2 style={{ margin: '4px 4px 10px', fontSize: 18 }}>{formatLong(selected)}</h2>
        <div className="empty">Keine Einträge</div>
      </section>
    </main>
  );
}
