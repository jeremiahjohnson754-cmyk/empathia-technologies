/**
 * System / Light / Dark (D9): follow the system by default; a manual choice always wins and is remembered per browser under
 * localStorage "empathia.theme". The choice is applied to <html> before first paint by @empathia/design-tokens/theme-init.js (load it
 * as a blocking <script> in <head>, before the stylesheets); this module keeps it in step afterwards — across tabs (storage events) and
 * when the system scheme changes — and renders the switch. Storage can throw (private mode, blocked site data): the switch still works
 * for the page's lifetime.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'empathia.theme';
export const THEME_EVENT = 'empathia:theme';
const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
/** the browser bar colour for each theme (tokens.json → theme.*.meta) */
const META: Record<'light' | 'dark', string> = { dark: '#0e1012', light: '#f7f5f1' };
let memory: ThemeChoice = 'system';   // used when storage is unavailable

const isChoice = (v: unknown): v is ThemeChoice => typeof v === 'string' && (CHOICES as readonly string[]).includes(v);

export function readThemeChoice(): ThemeChoice {
  try { const v = globalThis.localStorage?.getItem(THEME_KEY); return isChoice(v) ? v : 'system'; } catch { return memory; }
}

const systemDark = (): boolean => { try { return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true; } catch { return true; } };

/** the theme actually in force for a choice */
export function effectiveTheme(choice: ThemeChoice = readThemeChoice()): 'light' | 'dark' {
  return choice === 'system' ? (systemDark() ? 'dark' : 'light') : choice;
}

/** apply a choice to <html> (and the browser bar colour); store it unless `persist` is false */
export function applyThemeChoice(choice: ThemeChoice, { persist = true }: { persist?: boolean } = {}): void {
  if (!isChoice(choice)) return;
  memory = choice;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', choice);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META[effectiveTheme(choice)]);
  if (persist) { try { globalThis.localStorage?.setItem(THEME_KEY, choice); } catch { /* storage blocked: kept in memory */ } }
  try { window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { choice, theme: effectiveTheme(choice) } })); } catch { /* old engine */ }
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY || e.key === null) { applyThemeChoice(readThemeChoice(), { persist: false }); } };
  const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const onSystem = () => { applyThemeChoice(readThemeChoice(), { persist: false }); };
  window.addEventListener('storage', onStorage); window.addEventListener(THEME_EVENT, onChange); mq?.addEventListener?.('change', onSystem);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(THEME_EVENT, onChange); mq?.removeEventListener?.('change', onSystem); };
}

/** [choice, setChoice, effective theme] — stays in step with other tabs and the system setting */
export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void, 'light' | 'dark'] {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => 'system' as ThemeChoice);
  const theme = useSyncExternalStore(subscribe, () => effectiveTheme(), () => 'dark' as const);
  const set = useCallback((c: ThemeChoice) => applyThemeChoice(c), []);
  return [choice, set, theme];
}

const LABEL: Record<ThemeChoice, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const ICON: Record<ThemeChoice, string> = {
  system: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 4v8a4 4 0 0 0 0-8z',
  light: 'M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7.25 1h1.5v2h-1.5zM7.25 13h1.5v2h-1.5zM1 7.25h2v1.5H1zM13 7.25h2v1.5h-2zM2.7 3.76l1.06-1.06 1.42 1.41-1.07 1.07zM10.82 11.89l1.07-1.07 1.41 1.42-1.06 1.06zM2.7 12.24l1.41-1.42 1.07 1.07-1.42 1.41zM10.82 4.11l1.42-1.41 1.06 1.06-1.41 1.42z',
  dark: 'M10.9 1.6A6.5 6.5 0 1 0 14.4 10 5.2 5.2 0 0 1 10.9 1.6z',
};

/**
 * The theme switch: a radio group of three (System, Light, Dark). Arrow keys move and choose, as a radio group should; each option has
 * a visible icon and an accessible name, and `labels` shows the words too. 44 px targets on coarse pointers (ui.css).
 */
export function ThemeSwitch({ labels = false, className = '' }: { labels?: boolean; className?: string }) {
  const [choice, setChoice] = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = choice;
  const onKey = (e: { key: string; preventDefault(): void }) => {
    const k = e.key; const i = CHOICES.indexOf(current);
    const next = k === 'ArrowRight' || k === 'ArrowDown' ? (i + 1) % 3 : k === 'ArrowLeft' || k === 'ArrowUp' ? (i + 2) % 3 : k === 'Home' ? 0 : k === 'End' ? 2 : -1;
    if (next < 0) return;
    e.preventDefault(); setChoice(CHOICES[next]!); refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Theme" className={`ui-theme${labels ? ' ui-theme--labels' : ''}${className ? ' ' + className : ''}`} onKeyDown={onKey} data-testid="theme-switch">
      {CHOICES.map((c, i) => (
        <button key={c} ref={(el: HTMLButtonElement | null) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={current === c} tabIndex={current === c ? 0 : -1}
          className="ui-theme__opt" title={c === 'system' ? 'Follow the system setting' : `${LABEL[c]} theme`} data-theme-choice={c} onClick={() => setChoice(c)}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d={ICON[c]} fill="currentColor" fillRule="evenodd" /></svg>
          <span className={labels ? 'ui-theme__label' : 'ui-sr'}>{LABEL[c]}</span>
        </button>
      ))}
    </div>
  );
}
