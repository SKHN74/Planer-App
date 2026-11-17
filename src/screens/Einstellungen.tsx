import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import type { Settings, ThemeMode } from '../db/types';
import { clearDemo, countDemo } from '../lib/demo';
import { loadDemo } from '../lib/demoData';
import { backupFileName, createBackup, parseBackup, restoreBackup } from '../lib/backup';
import { formatShort } from '../lib/dates';
import { IconChevronLeft } from '../components/icons';
import { HabitSettings } from '../components/HabitParts';
import { CategorySettings } from '../components/CategoryParts';

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

  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  async function askPermission() {
    if (typeof Notification === 'undefined') return;
    setPerm(await Notification.requestPermission());
  }

  async function shareApp() {
    const url = location.origin + location.pathname;
    if (navigator.share) {
      try { await navigator.share({ title: 'Planer', text: 'Mein Planer für Kalender, Sport und Ziele – Daten bleiben auf deinem Gerät.', url }); } catch { /* abgebrochen */ }
    } else {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      setMsg('Link kopiert: ' + url);
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

      <CategorySettings />

      <HabitSettings />

      <section>
        <div className="section-label">Erinnerungen</div>
        <div className="list">
          <label className="row">
            <span>Erinnerungen bei geöffneter App</span>
            <input type="checkbox" className="switch" checked={settings.inAppHints} onChange={(e) => updateSettings({ inAppHints: e.target.checked })} />
          </label>
          {perm !== 'unsupported' && (
            <div className="row">
              <span>Zusätzlich als Mitteilung</span>
              {perm === 'granted' ? <span className="small muted">erlaubt</span>
                : perm === 'denied' ? <span className="small muted">abgelehnt</span>
                : <button className="btn secondary" style={{ minHeight: 36 }} onClick={askPermission}>Erlauben</button>}
            </div>
          )}
        </div>
        <p className="small muted" style={{ margin: '6px 4px 0' }}>
          Ist die App geschlossen, kann sie dich nicht erinnern. Für wichtige Termine nutze im Termin „In iOS-Kalender übernehmen“.
          {perm === 'unsupported' && ' Mitteilungen gibt es nur, wenn die App über „Zum Home-Bildschirm“ installiert ist.'}
        </p>
      </section>

      <section>
        <div className="section-label">App teilen</div>
        <div className="card">
          <div className="small">Schick jemandem den Link. Wer die App öffnet und zum Home-Bildschirm hinzufügt, hat seine eigene, leere App – deine Daten bleiben bei dir.</div>
          <button className="btn secondary block" style={{ marginTop: 12 }} onClick={shareApp}>Link teilen</button>
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
