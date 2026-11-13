/**
 * The room's controls on the room itself (13 Nov 2026, founder: "I want the toggles for coverages in lite much closer to the action so it's
 * easy for an engineer to use"; V2.5.3 put a Layers button on the stage that opens a sheet with the room's states, its layers and its
 * assurance marks). On the stage: one-tap coverage chips (camera, microphone, loudspeaker…) with their figure, and a Layers button that opens
 * a sheet over the room with the four states, every coverage, the X-ray views and every layer — the same switches as the panel beside the
 * room, so either can be used and they always agree. While the sheet is open the chips step aside (the sheet holds the same switches);
 * the number on the Layers button is how many coverages are drawn over the room. Escape or the close button shuts the sheet and returns focus to the Layers button.
 */
import { useEffect, useRef, useState } from 'react';

export interface StageSwitch { key: string; label: string; on: boolean; value?: string; says?: string; onToggle: () => void }
export interface StageState { key: string; label: string; on: boolean; onPick: () => void }

export function StageLayers({ coverage, states, xray, layers }: { coverage: StageSwitch[]; states: StageState[]; xray: StageSwitch[]; layers: StageSwitch[] }) {
  const [open, setOpen] = useState(false); const btn = useRef<HTMLButtonElement>(null); const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; sheet.current?.querySelector<HTMLElement>('button')?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  const onCount = coverage.filter((c) => c.on).length;   // what is drawn over the room now: the coverage shown
  const sw = (s: StageSwitch, id: string) => <button key={s.key} type="button" role="switch" aria-checked={s.on} className={`sl-sw${s.on ? ' on' : ''}`} onClick={s.onToggle} title={s.says} data-testid={`${id}-${s.key}`}>
    <span className="sl-sw__k" aria-hidden="true" /><span className="sl-sw__n">{s.label}</span>{s.value ? <span className="sl-sw__v">{s.value}</span> : null}{s.says ? <span className="sl-sw__s">{s.says}</span> : null}</button>;
  return <>
    {coverage.length > 0 && !open && <div className="sl-chips" role="group" aria-label="Coverage on the room" data-testid="stage-coverage">
      {coverage.map((c) => <button key={c.key} type="button" role="switch" aria-checked={c.on} className={`sl-chip sl-chip--${c.key}${c.on ? ' on' : ''}`} onClick={c.onToggle} title={c.says} data-testid={`stage-ov-${c.key}`}><i aria-hidden="true" />{c.label}{c.on && c.value ? <b>{c.value}</b> : null}</button>)}
    </div>}
    <button ref={btn} type="button" className={`sl-open${open ? ' on' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="stage-layers-open">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>Layers{onCount ? <b aria-label={`${onCount} coverage shown`}>{onCount}</b> : null}</button>
    {open && <div ref={sheet} className="sl-sheet" role="dialog" aria-modal="false" aria-label="Layers, coverage and the room's state" data-testid="stage-layers">
      <div className="sl-head"><b>Layers</b><button type="button" className="sl-x" aria-label="Close layers" onClick={() => { setOpen(false); btn.current?.focus(); }} data-testid="stage-layers-close">×</button></div>
      <div className="sl-states" role="radiogroup" aria-label="Room state">{states.map((s) => <button key={s.key} type="button" role="radio" aria-checked={s.on} className={`sl-state${s.on ? ' on' : ''}`} onClick={s.onPick} data-testid={`stage-state-${s.key}`}>{s.label}</button>)}</div>
      {coverage.length > 0 && <><p className="sl-l">Coverage</p><div className="sl-list">{coverage.map((c) => sw(c, 'stage-sw-ov'))}</div></>}
      {xray.length > 0 && <><p className="sl-l">X-ray</p><div className="sl-list">{xray.map((c) => sw(c, 'stage-sw-x'))}</div></>}
      {layers.length > 0 && <><p className="sl-l">Layers</p><div className="sl-list">{layers.map((c) => sw(c, 'stage-sw-ly'))}</div></>}
    </div>}
  </>;
}
