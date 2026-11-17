import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  canSave?: boolean;
  children: ReactNode;
}

/** Bottom-Sheet wie unter iOS: Abbrechen links, Sichern rechts. */
export function Sheet({ title, onClose, onSave, saveLabel = 'Sichern', canSave = true, children }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <button className="link-btn" style={{ justifySelf: 'start' }} onClick={onClose}>Abbrechen</button>
          <h2>{title}</h2>
          {onSave ? <button className="link-btn strong" disabled={!canSave} onClick={onSave}>{saveLabel}</button> : <span />}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
