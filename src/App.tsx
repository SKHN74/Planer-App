import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS, getSettings } from './db/db';
import { applyTheme } from './theme';
import { TabBar } from './components/TabBar';
import { useRoute } from './useRoute';
import Heute from './screens/Heute';
import Kalender from './screens/Kalender';
import Sport from './screens/Sport';
import Ziele from './screens/Ziele';
import Statistik from './screens/Statistik';
import Einstellungen from './screens/Einstellungen';
import Irgendwann from './screens/Irgendwann';
import { EditorProvider } from './components/Editor';

export default function App() {
  const route = useRoute();
  const settings = useLiveQuery(() => getSettings(db), [], DEFAULT_SETTINGS);

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  return (
    <EditorProvider>
    <div className="app">
      {route === 'heute' && <Heute />}
      {route === 'kalender' && <Kalender />}
      {route === 'sport' && <Sport />}
      {route === 'ziele' && <Ziele />}
      {route === 'statistik' && <Statistik />}
      {route === 'einstellungen' && <Einstellungen settings={settings} />}
      {route === 'irgendwann' && <Irgendwann />}
      <TabBar route={route} />
    </div>
    </EditorProvider>
  );
}
