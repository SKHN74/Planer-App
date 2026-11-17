import type { ReactElement } from 'react';
import { IconCalendar, IconGoal, IconHome, IconSport, IconStats } from './icons';

export type Route = 'heute' | 'kalender' | 'sport' | 'ziele' | 'statistik' | 'einstellungen' | 'irgendwann';

const TABS: { route: Route; label: string; icon: () => ReactElement }[] = [
  { route: 'heute', label: 'Heute', icon: IconHome },
  { route: 'kalender', label: 'Kalender', icon: IconCalendar },
  { route: 'sport', label: 'Sport', icon: IconSport },
  { route: 'ziele', label: 'Ziele', icon: IconGoal },
  { route: 'statistik', label: 'Statistik', icon: IconStats }
];

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      <div className="tabbar-inner">
        {TABS.map(({ route: r, label, icon: Icon }) => (
          <a key={r} href={`#/${r}`} className="tab" aria-current={route === r ? 'page' : undefined}>
            <Icon />
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
