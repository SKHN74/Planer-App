import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import type { Settings, ThemeMode } from '../db/types';
import { clearDemo, countDemo } from '../lib/demo';
import { loadDemo } from '../lib/demoData';
import { backupFileName, createBackup, parseBackup, restoreBackup } from '../lib/backup';
import { formatShort } from '../lib/dates';
import { IconChevronLeft } from '../components/icons';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'hell', label: 'Hell' },
  { value: 'dunkel', label: 'Dunkel' },
  { value: 'auto', label: 'Automatisch' }
];

export default function Einstellungen({ settings }: { settings: Settings }) {
  const demoCount = useLiveQuery(() => countDemo(db), [], 0);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function exportBackup() {
    const json = JSON.stringify(await createBackup(db), null, 2);
    const file = new File([json], backupFileName(), { type: 'application/json' });
    // Auf dem iPhone öffnet sich das Teilen-Menü (z. B. „In Dateien sichern“).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Planer-Backup' });
      } catch {
        return; // abgebrochen
      }
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
    await updateSettings({ lastBackupAt: new Date().toISOString() });
    setMsg('Backup erstellt.');
  }

  async function importBackup(f: File) {
    try {
      const b = parseBackup(await f.text());
      if (!confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return;
      await restoreBackup(db, b);
      setMsg('Backup wiederhergestellt.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function removeDemo() {
    const n = await clearDemo(db);
    setMsg(`${n} Testeinträge gelöscht. Deine eigenen Einträge sind unverändert.`);
  }

  return (
    <main className="screen">
      <header>
        <a href="#/heute" className="row" style={{ width: 'auto', minHeight: 44, padding: '0 4px', color: 'var(--accent)', textDecoration: 'none', justifyContent: 'flex-start', gap: 2 }}>
          <IconChevronLeft />Heute
        </a>
        <h1 className="title" style={{ margin: '4px 4px 0' }}>Einstellungen</h1>
      </header>

      {msg && <div className="card small" role="status">{msg}</div>}

      <section>
        <div className="section-label">Darstellung</div>
        <div className="segmented" role="group" aria-label="Darstellung">
          {MODES.map((m) => (
            <button key={m.value} aria-pressed={settings.theme === m.value} onClick={() => updateSettings({ theme: m.value })}>{m.label}</button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-label">Testdaten</div>
        <div className="card">
          {demoCount > 0 ? (
            <>
              <div>{demoCount} Testeinträge sind geladen, alle mit TEST markiert. Löschen entfernt nur diese.</div>
              <button className="btn danger block" style={{ marginTop: 12 }} onClick={removeDemo}>Testdaten löschen</button>
            </>
          ) : (
            <>
              <div className="muted">Keine Testdaten geladen. Beispiele helfen beim Ausprobieren und sind mit TEST markiert.</div>
              <button className="btn secondary block" style={{ marginTop: 12 }} onClick={async () => setMsg(`${await loadDemo(db)} Testeinträge geladen.`)}>Testdaten laden</button>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="section-label">Backup</div>
        <div className="list">
          <button className="row" onClick={exportBackup}>
            <span>Backup exportieren</span>
            <span className="small muted">{settings.lastBackupAt ? 'zuletzt ' + formatShort(new Date(settings.lastBackupAt)) : 'noch nie'}</span>
          </button>
          <button className="row" onClick={() => fileInput.current?.click()}>
            <span>Backup importieren</span>
            <span className="small muted">.json-Datei</span>
          </button>
        </div>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ''; }} />
        <p className="small muted" style={{ margin: '6px 4px 0' }}>Deine Daten bleiben auf diesem Gerät. Sichere das Backup z. B. in iCloud Drive.</p>
      </section>

      <p className="small muted" style={{ textAlign: 'center' }}>Planer · Version {__APP_VERSION__}</p>
    </main>
  );
}
