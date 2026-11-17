import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { isoWeek } from '../lib/dates';
import { DemoBanner } from '../components/DemoBanner';
import { IconGear } from '../components/icons';

export default function Heute() {
  const today = new Date();
  return (
    <main className="screen">
      <header className="screen-header">
        <div>
          <div className="eyebrow">{format(today, 'd. MMMM', { locale: de })} · KW {isoWeek(today)}</div>
          <h1 className="title">{format(today, 'EEEE', { locale: de })}</h1>
        </div>
        <a href="#/einstellungen" className="icon-btn" aria-label="Einstellungen"><IconGear /></a>
      </header>
      <DemoBanner />
      <section className="card"><h2>Termine</h2><div className="empty">Heute keine Termine</div></section>
      <section className="card"><h2>To-dos</h2><div className="empty">Nichts offen</div></section>
      <section className="card"><h2>Training heute</h2><div className="empty">Kein Training geplant</div></section>
      <section className="card"><h2>Gewohnheiten</h2><div className="empty">Schritte, Wasser und Schlaf folgen im nächsten Schritt</div></section>
    </main>
  );
}
