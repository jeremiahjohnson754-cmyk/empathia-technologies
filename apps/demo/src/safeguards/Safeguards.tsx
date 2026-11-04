/**
 * Destructive-action safeguards for the operational workspaces. The rule: nothing irreversible happens without a named confirmation, and
 * whatever can be undone offers Undo right where it happened.
 *
 *  - `ConfirmDialog`: a modal dialog that names the action and the object it acts on, says what will change and whether it can be undone,
 *    and, for an irreversible action (or a reset of everything), asks for the object's name to be typed before the button works. Escape or
 *    Cancel closes it with nothing changed and focus returns to the control that opened it. Focus stays inside while it is open.
 *  - `UndoBar`: after a reversible action, a polite status line "Done: … · Undo" that stays until it is used, dismissed or replaced (no
 *    timer: an Undo that vanishes on its own is a time limit).
 *  - `SAFEGUARDS`: every destructive action of these workspaces and the safeguard it carries (the resilience page lists them; the
 *    destructive-action browser suite drives each one).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export type Reversibility = 'undo' | 'never';
export interface SafeguardSpec { key: string; area: string; action: string; reversibility: Reversibility; named: boolean; why: string }

/** Every destructive action in the operational workspaces: named = the object's name must be typed to confirm. */
export const SAFEGUARDS: readonly SafeguardSpec[] = Object.freeze([
  { key: 'dispatch.reset', area: 'Dispatch board', action: 'Reset the demonstration workspace', reversibility: 'undo', named: true, why: 'Returns every incident, work order, assignment and decision of this browser to the seed; Undo restores what was there.' },
  { key: 'dispatch.unassign', area: 'Dispatch board', action: 'Withdraw an assignment', reversibility: 'undo', named: false, why: 'Takes the job back from the technician with a recorded reason; Undo puts it back.' },
  { key: 'servicehands.cancel', area: 'ServiceHands', action: 'Cancel a work order', reversibility: 'undo', named: true, why: 'Stops the work; the record and its history are kept and the cancellation is in the ledger.' },
  { key: 'servicehands.close', area: 'ServiceHands', action: 'Close an incident', reversibility: 'never', named: true, why: 'A closed incident only comes back by reopening it, which starts a new service activity with its reason.' },
  { key: 'decisions.reject', area: 'Decision desk', action: 'Reject a project', reversibility: 'never', named: true, why: 'A rejection is history; the project returns only as a new scope revision with a new approval chain.' },
  { key: 'decisions.reset', area: 'Decisions', action: 'Reset the decisions', reversibility: 'undo', named: true, why: 'Returns every project, decision, funding signature and Decision Memory record of this browser to the seed; Undo restores them.' },
  { key: 'decisions.withdraw', area: 'Decision Memory', action: 'Withdraw a decision you recorded', reversibility: 'undo', named: false, why: 'Only the person who recorded it (or the Product Architect) can withdraw it; Undo restores it.' },
  { key: 'replay.apply', area: 'Core Replay', action: 'Apply a scenario to the room', reversibility: 'undo', named: true, why: 'Watching or scrubbing never changes the room; applying a scenario does, so it is a separate, named step.' },
  { key: 'labs.reset', area: 'Learn labs', action: 'Clear your lab results', reversibility: 'undo', named: true, why: 'Removes this browser’s lab evidence; Undo restores it.' },
]);
export const safeguard = (key: string) => SAFEGUARDS.find((s) => s.key === key)!;

export interface ConfirmRequest {
  key: string;                 // a SAFEGUARDS key
  title: string;               // "Cancel work order WO-0088?"
  object: string;              // the object's name or id, typed to confirm when the safeguard is named
  consequence: ReactNode;      // what changes
  actionLabel: string;         // the confirm button: "Cancel the work order"
  reason?: { label: string; min: number } | null;   // a recorded reason, when the action needs one
  onConfirm: (reason: string) => void;
}

/** The confirmation dialog. Rendered by `useConfirm`; one at a time. */
export function ConfirmDialog({ req, onClose }: { req: ConfirmRequest; onClose: () => void }) {
  const spec = safeguard(req.key);
  const [typed, setTyped] = useState(''); const [reason, setReason] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const id = useId(); const named = spec.named; const reasonOk = !req.reason || reason.trim().length >= req.reason.min;
  const ok = (!named || typed.trim() === req.object) && reasonOk;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    (box.current?.querySelector<HTMLElement>('textarea, input') || box.current?.querySelector<HTMLElement>('[data-testid=confirm-cancel]') || box.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const f = Array.from(box.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, [href]'));
      if (!f.length) return; const a = f[0]!, z = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (opener && document.contains(opener)) opener.focus(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="sg-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sg-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} ref={box} tabIndex={-1} data-testid="confirm-dialog" data-safeguard={spec.key}>
        <h2 id={`${id}-t`}>{req.title}</h2>
        <div id={`${id}-d`} className="sg-dialog__body">
          <p>{req.consequence}</p>
          <p className={spec.reversibility === 'never' ? 'sg-never' : 'sg-undo'}><b>{spec.reversibility === 'never' ? 'This cannot be undone.' : 'You can undo this right after.'}</b> {spec.why}</p>
        </div>
        {req.reason && <label className="sg-field">{req.reason.label} <span className="ui-meta">(at least {req.reason.min} characters, recorded with the action)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} data-testid="confirm-reason" /></label>}
        {named && <label className="sg-field">Type <code className="sg-name">{req.object}</code> to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} data-testid="confirm-name" aria-describedby={`${id}-h`} />
          <span id={`${id}-h`} className="ui-meta">{typed && typed.trim() !== req.object ? 'Not the same name yet.' : 'The button works once the name matches exactly.'}</span></label>}
        <div className="sg-dialog__acts">
          <button type="button" className={`ui-btn ${spec.reversibility === 'never' ? 'ui-btn--danger' : 'ui-btn--primary'}`} disabled={!ok} onClick={() => { req.onConfirm(reason.trim()); onClose(); }} data-testid="confirm-go">{req.actionLabel}</button>
          <button type="button" className="ui-btn" onClick={onClose} data-testid="confirm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/** `ask(req)` opens the dialog; render `dialog` once in the workspace. */
export function useConfirm() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  return { ask: setReq, dialog: req ? <ConfirmDialog key={req.title} req={req} onClose={() => setReq(null)} /> : null };
}

export interface UndoState { label: string; undo: () => void }
/** The undo line: `offer({label, undo})` after a reversible action; it stays until used, dismissed or replaced. */
export function useUndo() {
  const [u, setU] = useState<UndoState | null>(null);
  const bar = (
    <div className="sg-undo-bar" role="status" aria-live="polite" data-testid="undo-bar">{u ? <>
      <span>Done: {u.label}.</span>
      <button type="button" className="ui-btn ui-btn--sm" data-testid="undo" onClick={() => { const f = u.undo; setU(null); f(); }}>Undo</button>
      <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => setU(null)} aria-label="Dismiss the undo offer">Dismiss</button></> : null}
    </div>
  );
  return { offer: setU, clear: () => setU(null), bar, pending: u };
}
