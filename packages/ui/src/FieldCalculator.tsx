/**
 * SIGNAL's field calculator (restored 18 Nov 2026 from the standalone's buildCalc / calcButton / the 🧮 button): a panel with an
 * expression line, the answer, a 5 × 5 key pad, the field helpers and the last six results (tap one to use it again). Enter runs the
 * expression, as the reference does; Escape closes the panel and returns focus to whatever opened it (the reference closes with ✕
 * only; Escape is added for keyboard users). The round button appears where math is needed, as in the reference: labs, calculate
 * actions, Practice, Service Mode and Case Files, and in the story only while a lab is on screen (`showWhen`). Values are for learning,
 * not for real systems, in the reference's own words.
 */
import { useEffect, useRef, useState } from 'react';
import { calcRun, CALC_KEYS, HELPERS, helperRun } from './fieldcalc.js';

export function FieldCalculatorPanel({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: string }) {
  const [expr, setExpr] = useState(''); const [out, setOut] = useState('0'); const [hist, setHist] = useState<{ e: string; t: string }[]>([]);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { if (prefill) setExpr(prefill); setTimeout(() => field.current?.focus(), 0); } }, [open, prefill]);
  const run = () => { const r = calcRun(expr); setOut(r.text); if (r.ok) setHist((h) => [{ e: expr, t: r.text }, ...h].slice(0, 6)); };
  const key = (k: string) => { if (k === '=') run(); else if (k === 'C') { setExpr(''); setOut('0'); } else if (k === '⌫') setExpr((x) => x.slice(0, -1)); else setExpr((x) => x + k); field.current?.focus(); };
  if (!open) return null;
  return <div className="fcalc" role="dialog" aria-label="Calculator" data-testid="field-calc" onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
    <div className="fcalc__top"><b>🧮 FIELD CALCULATOR</b><button type="button" className="fcalc__x" aria-label="Close calculator" onClick={onClose}>✕</button></div>
    <input ref={field} className="fcalc__in" type="text" inputMode="decimal" aria-label="Expression" placeholder="e.g. 1.7/343*1000" autoComplete="off" value={expr} onChange={(e) => setExpr(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }} data-testid="field-calc-in" />
    <div className="fcalc__out" aria-live="polite" data-testid="field-calc-out">{out}</div>
    <div className="fcalc__keys">{CALC_KEYS.map((k) => <button key={k} type="button" className={k === '=' ? 'eq' : undefined} onClick={() => key(k)} aria-label={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : undefined}>{k}</button>)}</div>
    <details className="fcalc__more"><summary>Field helpers (dB, delay, Hz, amps, subnets, intermod…)</summary>{HELPERS.map((h) => <Helper key={h.label} h={h} />)}</details>
    <p className="fcalc__note">Functions: sqrt( ) log( ) ln( ) sin( ) cos( ) tan( ) (degrees), ^ for powers, π. Values are for learning, not for real systems.</p>
    {hist.length > 0 && <ol className="fcalc__hist" data-testid="field-calc-hist">{hist.map((h, i) => <li key={i}><button type="button" onClick={() => { setExpr(h.t); field.current?.focus(); }}>{h.e} = {h.t}</button></li>)}</ol>}
  </div>;
}

function Helper({ h }: { h: (typeof HELPERS)[number] }) {
  const [v, setV] = useState<string[]>(h.fields.map(() => '')); const [res, setRes] = useState('—');
  return <div className="fcalc__hrow"><b>{h.label}</b>{h.fields.map((f, i) => <input key={f} type="text" inputMode="decimal" placeholder={f} aria-label={f} value={v[i]} onChange={(e) => setV((x) => x.map((y, j) => (j === i ? e.target.value : y)))} />)}
    <button type="button" onClick={() => setRes(helperRun(h, v))} aria-label={`Work out ${h.label}`}>=</button><span className="fcalc__hres">{res}</span></div>;
}

/** the round 🧮 button and its panel; with `showWhen`, the button shows only while an element matching it is on screen */
export function FieldCalculator({ showWhen }: { showWhen?: string }) {
  const [open, setOpen] = useState(false); const [vis, setVis] = useState(!showWhen); const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showWhen || typeof IntersectionObserver === 'undefined') { setVis(true); return; }
    const seen = new Set<Element>(); const io = new IntersectionObserver((es) => { for (const e of es) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); setVis(seen.size > 0); });
    const watch = () => document.querySelectorAll(showWhen).forEach((n) => io.observe(n)); watch();
    const mo = new MutationObserver(watch); mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [showWhen]);
  useEffect(() => { if (!vis && showWhen) setOpen(false); }, [vis, showWhen]);
  const close = () => { setOpen(false); btn.current?.focus(); };
  return <>
    {vis && <button ref={btn} type="button" className="fcalc-fab" aria-label="Open the field calculator" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="field-calc-fab">🧮</button>}
    <FieldCalculatorPanel open={open && vis} onClose={close} />
  </>;
}
