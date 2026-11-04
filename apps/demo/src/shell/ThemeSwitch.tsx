/**
 * System / Light / Dark (D9): follows the device until a person chooses; the choice always wins and is remembered under
 * localStorage['empathia.theme'] (the key packages/design-tokens and the website use). theme-boot.js applies it before first paint.
 * Changing the theme never changes the role colour's hue, only its light or dark step.
 */
import { useEffect, useId, useState } from 'react';

type Choice = 'system' | 'light' | 'dark';
const KEY = 'empathia.theme';
const read = (): Choice => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } };
const apply = (c: Choice) => { const d = document.documentElement; if (c === 'system') d.removeAttribute('data-theme'); else d.setAttribute('data-theme', c); };
const listeners = new Set<(c: Choice) => void>();

export function ThemeSwitch({ className = '', labelledBy }: { className?: string; labelledBy?: string }) {
  const [c, setC] = useState<Choice>(read); const id = useId();
  useEffect(() => { const f = (x: Choice) => setC(x); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  const choose = (x: Choice) => { apply(x); try { if (x === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, x); } catch { /* lasts the page */ } listeners.forEach((f) => f(x)); };
  return (
    <div className={`theme-switch ${className}`} role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Appearance'} data-testid="theme-switch">
      {(['system', 'light', 'dark'] as const).map((x) => (
        <label key={x} className={`theme-switch__opt${c === x ? ' on' : ''}`}>
          <input type="radio" name={`theme-${id}`} value={x} checked={c === x} onChange={() => choose(x)} />
          <span>{x === 'system' ? 'System' : x === 'light' ? 'Light' : 'Dark'}</span>
        </label>
      ))}
    </div>
  );
}
