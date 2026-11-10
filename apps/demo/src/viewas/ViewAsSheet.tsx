/**
 * View as (D1): the fifteen roles, each with its avatar in its colour, its domain, what it is given and how much of the platform it
 * reaches (V2.5.3 rolesPanel). A dialog: focus moves in, Tab stays inside, Escape and the close button return focus to the opener.
 * Switching is transparent and grants nothing (D1); the page and every button re-render from the policy for the new role (D44).
 */
import { useEffect, useRef, useState } from 'react';
import type { RoleKey } from '../registry.types.js';
import { ROLES, ROLE_KEYS, DEFAULT_ROLE, surfaces } from '../access/policy.js';
import { Icon } from '@empathia/ui';
import { scope } from './scope.js';

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return; const back = document.activeElement as HTMLElement | null; const el = ref.current!;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,input,[tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null || x === document.activeElement);
    (el.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]') || focusables()[0] || el).focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return; const f = focusables(); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1]!.focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0]!.focus(); }
    };
    document.addEventListener('keydown', key); document.body.classList.add('has-dialog');
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('has-dialog'); if (back && document.contains(back)) back.focus(); };
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

export function ViewAsSheet({ open, role, onPick, onClose }: { open: boolean; role: RoleKey; onPick: (r: RoleKey) => void; onClose: () => void }) {
  const ref = useDialog(open, onClose);
  // the records each role may see, counted from the demo's own records (V2.5.3 azRecords) — loaded with the sheet's first opening
  const [cov, setCov] = useState<null | ((r: RoleKey) => { records: number; of: number })>(null);
  useEffect(() => { if (!open || cov) return; let live = true; import('../shell/records.js').then((m) => { if (live) setCov(() => m.coverage); }).catch(() => undefined); return () => { live = false; }; }, [open, cov]);
  if (!open) return null;
  const pct = (a: number, b: number) => Math.max(1, Math.round((a / Math.max(1, b)) * 20)) * 5;
  const nf = (n: number) => n.toLocaleString('en-GB');
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div ref={ref} className="sheet viewas" role="dialog" aria-modal="true" aria-labelledby="viewas-h" tabIndex={-1} onClick={(e) => e.stopPropagation()} data-testid="viewas-sheet">
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head"><h2 id="viewas-h">View as</h2><button type="button" className="sheet__x" onClick={onClose} aria-label="Close View as"><Icon name="close" size={20} /></button></div>
        <p className="viewas__lede">Each role is given its own share of the same records. Choose one to see the demonstration as that role is shown it — you can switch back at any time.</p>
        {role !== DEFAULT_ROLE && (
          <div className="viewas__now" data-r={role}>
            <p>Product Architect viewing as <b>{ROLES[role].label}</b>. The platform is drawn as that role receives it.</p>
            <button type="button" className="ui-btn ui-btn--primary" onClick={() => onPick(DEFAULT_ROLE)}>Return to Product Architect</button>
          </div>
        )}
        <ul className="viewas__list">
          {ROLE_KEYS.map((k) => { const r = ROLES[k]; const sc = scope(k); const su = surfaces(k); const rc = cov?.(k); return (
            <li key={k}>
              <button type="button" className="viewas__opt" data-r={k} aria-pressed={k === role} onClick={() => onPick(k)} data-role-key={k}>
                <span className="ava" aria-hidden="true">{r.initials}</span>
                <span className="viewas__b"><span className="viewas__t">{r.label}{r.internal && <span className="role-internal" data-testid="role-internal">Internal role</span>}</span><span className="viewas__s">{r.domain} · {r.blurb}</span>
                  <span className="viewas__scope" aria-hidden="true"><i data-pct={rc ? pct(rc.records, rc.of) : pct(su.surfaces, su.of)} /></span>
                  <span className="viewas__n" data-testid="viewas-coverage">{rc ? `${nf(rc.records)} of ${nf(rc.of)} records · ` : ''}{su.surfaces} of {su.of} surfaces · {sc.pages} of {sc.of} pages</span></span>
                {k === role && <span className="viewas__check" aria-hidden="true"><Icon name="check" size={18} /></span>}
              </button>
            </li>); })}
        </ul>
        <p className="viewas__note">A role is given what its work needs and nothing else. Switching here is a demonstration: it grants nothing, and the authenticated application's server decides real access.</p>
      </div>
    </div>
  );
}
