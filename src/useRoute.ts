import { useEffect, useState } from 'react';
import type { Route } from './components/TabBar';

const ROUTES: Route[] = ['heute', 'kalender', 'sport', 'ziele', 'statistik', 'einstellungen'];

function read(): Route {
  const r = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(r) ? r : 'heute';
}

/** Einfaches Hash-Routing (#/kalender), funktioniert auch offline und auf GitHub Pages. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
