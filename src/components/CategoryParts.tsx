import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, now } from '../db/db';
import type { Category, CategoryColor } from '../db/types';
import { CATEGORY_COLORS, deleteCategory } from '../lib/categories';
import { Sheet } from './Sheet';

function CategoryForm({ category, onClose }: { category?: Category; onClose: () => void }) {
  const used = useLiveQuery(() => db.categories.toArray(), [], []);
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<CategoryColor>(() => category?.color ?? CATEGORY_COLORS.find((c) => !used.some((u) => u.color === c.key))?.key ?? 'gruen');
  const count = useLiveQuery(() => (category?.id ? db.events.filter((e) => e.categoryId === category.id).count() : Promise.resolve(0)), [category?.id], 0);

  async function save() {
    if (!name.trim()) return;
    if (category?.id) await db.categories.update(category.id, { name: name.trim(), color, updatedAt: now() });
    else {
      const last = await db.categories.orderBy('order').last();
      await db.categories.add({ name: name.trim(), color, order: (last?.order ?? 0) + 1, createdAt: now(), updatedAt: now() });
    }
    onClose();
  }

  return (
    <Sheet title={category ? 'Kategorie' : 'Neue Kategorie'} onClose={onClose} canSave={!!name.trim()} onSave={save}>
      <div className="field-group">
        <input className="title-input" placeholder="Name, z. B. Arbeit" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!category} />
        <div className="chips" role="radiogroup" aria-label="Farbe">
          {CATEGORY_COLORS.map((c) => (
            <button key={c.key} type="button" role="radio" className={'color-swatch cat-' + c.key} aria-checked={color === c.key} aria-pressed={color === c.key} aria-label={c.label} onClick={() => setColor(c.key)} />
          ))}
        </div>
      </div>
      {category && (
        <>
          <button className="btn secondary block" style={{ color: 'var(--danger)' }} onClick={async () => { await deleteCategory(db, category.id!); onClose(); }}>Kategorie löschen</button>
          <p className="small muted" style={{ margin: '-8px 4px 0' }}>{count > 0 ? `${count} ${count === 1 ? 'Termin bleibt' : 'Termine bleiben'} erhalten, nur ohne Kategorie.` : 'Keine Termine in dieser Kategorie.'}</p>
        </>
      )}
    </Sheet>
  );
}

export function CategorySettings() {
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), [], []);
  const [open, setOpen] = useState<{ category?: Category } | null>(null);
  return (
    <section>
      <div className="section-label">Termin-Kategorien</div>
      <div className="list">
        {categories.map((c) => (
          <button key={c.id} className={'row cat-' + c.color} onClick={() => setOpen({ category: c })}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="cat-dot" />{c.name}</span>
            <span className="small muted">{CATEGORY_COLORS.find((x) => x.key === c.color)?.label}</span>
          </button>
        ))}
        <button className="row" style={{ color: 'var(--accent)', fontWeight: 600 }} onClick={() => setOpen({})}>+ Kategorie hinzufügen</button>
      </div>
      <p className="small muted" style={{ margin: '6px 4px 0' }}>Termine ohne Kategorie erscheinen blau.</p>
      {open && <CategoryForm key={open.category?.id ?? 'new'} category={open.category} onClose={() => setOpen(null)} />}
    </section>
  );
}
