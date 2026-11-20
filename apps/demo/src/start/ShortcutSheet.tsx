/**
 * The shortcut layer of the shell: listens for "g then a letter" and "?", and shows the list of shortcuts for the current role with
 * the switch that turns single-key shortcuts off (start/shortcuts.ts has the rules).
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { useDialog } from '../viewas/ViewAsSheet.js';
import { jumpsFor, homeName } from '../campus/rolehome.js';
import { onKey, setShortcuts, shortcutsOn, typingIn, type Machine } from './shortcuts.js';

export function Shortcuts({ role, opens }: { role: RoleKey; opens: (href: string) => boolean }) {
  const [open, setOpen] = useState(false); const [on, setOn] = useState(shortcutsOn); const [armed, setArmed] = useState(false);
  const jumps = jumpsFor(role, (h) => opens(h.split('?')[0]!)); const m = useRef<Machine>({ armed: 0 });
  const ref = useDialog(open, () => setOpen(false));
  useEffect(() => { const f = () => setOn(shortcutsOn()); const o = () => setOpen(true); window.addEventListener('empathia:shortcuts', f); window.addEventListener('empathia:shortcuts-open', o); return () => { window.removeEventListener('empathia:shortcuts', f); window.removeEventListener('empathia:shortcuts-open', o); }; }, []);
  useEffect(() => {
    const map = Object.fromEntries(jumps.map((j) => [j.key, j.href])); let t: ReturnType<typeof setTimeout> | undefined;
    const k = (e: KeyboardEvent) => {
      const r = onKey(m.current, { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, typing: typingIn(e.target), dialog: document.body.classList.contains('has-dialog'), at: Date.now() }, map, shortcutsOn());
      m.current = r.m; if (t) clearTimeout(t);
      if (!r.act) { setArmed(false); return; }
      if (r.act.kind === 'armed') { setArmed(true); t = setTimeout(() => { setArmed(false); m.current = { armed: 0 }; }, 1500); return; }
      e.preventDefault(); setArmed(false);
      if (r.act.kind === 'help') setOpen(true); else location.hash = r.act.href;
    };
    addEventListener('keydown', k); return () => { removeEventListener('keydown', k); if (t) clearTimeout(t); };
  }, [role, jumps.map((j) => j.key + j.href).join('|')]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (<>
    {/* what "g" is waiting for, said and shown: a shortcut that is half-typed must not be a mystery */}
    <p className="sk-armed" role="status" aria-live="polite" data-testid="shortcut-armed" data-on={armed}>{armed ? `Go to… ${jumps.map((j) => `${j.key} ${j.label}`).join(' · ')} · h ${homeName(role)}` : ''}</p>
    {open && <div className="sheet-scrim" onClick={() => setOpen(false)}>
      <div ref={ref} className="sheet sk" role="dialog" aria-modal="true" aria-labelledby="sk-h" tabIndex={-1} onClick={(e) => e.stopPropagation()} data-testid="shortcuts-sheet">
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head"><h2 id="sk-h">Keyboard shortcuts</h2><button type="button" className="sheet__x" onClick={() => setOpen(false)} aria-label="Close keyboard shortcuts"><Icon name="close" size={20} /></button></div>
        <p className="viewas__lede">For the {ROLES[role].label}. Press <kbd>g</kbd> and then a letter to go straight to a place; every one of them is also a button on your start page.</p>
        <dl className="sk-list" data-testid="shortcuts-list">
          <div><dt><kbd>/</kbd> <span className="ui-meta">or</span> <kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Search</dd></div>
          <div><dt><kbd>g</kbd> <kbd>h</kbd></dt><dd>{homeName(role)} (your start page)</dd></div>
          {jumps.map((j) => <div key={j.key} data-key={j.key}><dt><kbd>g</kbd> <kbd>{j.key}</kbd></dt><dd><a href={j.href} onClick={() => setOpen(false)}>{j.label}</a><span className="ui-meta"> {j.sub}</span></dd></div>)}
          <div><dt><kbd>?</kbd></dt><dd>This list</dd></div>
        </dl>
        <label className="sk-switch"><input type="checkbox" checked={on} onChange={(e) => setShortcuts(e.target.checked)} data-testid="shortcuts-toggle" /> <span>Single-key shortcuts are on<span className="ui-meta"> Turn them off if you use speech input or keys are pressed by accident. <kbd>/</kbd>, <kbd>Ctrl</kbd> <kbd>K</kbd> and <kbd>?</kbd> keep working.</span></span></label>
      </div>
    </div>}
  </>);
}
