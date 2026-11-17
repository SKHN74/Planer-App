import type { ThemeMode } from './db/types';

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let current: ThemeMode = 'hell';

function resolve(mode: ThemeMode): 'hell' | 'dunkel' {
  if (mode === 'auto') return media?.matches ? 'dunkel' : 'hell';
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  current = mode;
  const r = resolve(mode);
  document.documentElement.dataset.theme = r;
  const color = r === 'dunkel' ? '#0F1115' : '#F4F5F7';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

media?.addEventListener('change', () => {
  if (current === 'auto') applyTheme('auto');
});
