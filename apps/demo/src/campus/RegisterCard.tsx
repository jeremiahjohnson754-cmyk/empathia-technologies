/**
 * Where commissioning starts: the room register, the device register the installation team fills, the retired register, and phase 1's
 * install documentation (a photograph before and after the installation). Shown at the top of a room's commissioning page.
 */
import { useMemo, useState } from 'react';
import { Card, Facts, Tag, Notice } from '@empathia/ui';
import type { RoomRecord } from './design.js';
import { deviceRegister, retiredRegister, roomRegister, registerStats, codesOnRecord, type RegisterRow } from './registers.js';
import { readRegister, writeEntry, setInstallPhoto, scalePhoto, type Patch } from './registerStore.js';
import { personaLabel } from '../build/store.js';

const FIELDS: Array<[keyof Patch, string, string]> = [['serial', 'Serial', 'as printed on the label'], ['hostname', 'Hostname', 'networked devices'], ['ip', 'IP address', 'networked devices'], ['firmware', 'Firmware', 'version read on the unit'], ['location', 'Mounting location', 'e.g. ceiling tile C4, credenza rack U12']];
const when = (s?: string | null) => (s ? s.slice(0, 16).replace('T', ' ') : '—');

export function Registers({ r, persona, canFill, onRecord }: { r: RoomRecord; persona: string; canFill: boolean; onRecord: (type: string, detail: string) => void }) {
  const room = r.outline.id;
  const [tick, setTick] = useState(0);
  const st = useMemo(() => readRegister(room), [room, tick]);
  const rows = useMemo(() => deviceRegister(r, st.entries), [r, st]);
  const retired = useMemo(() => retiredRegister(r), [r]);
  const s = registerStats(rows);
  const [edit, setEdit] = useState<string | null>(null); const [form, setForm] = useState<Patch>({}); const [err, setErr] = useState<string[] | null>(null); const [busy, setBusy] = useState(false);
  const open = (x: RegisterRow) => { setEdit(x.device); setErr(null); setForm({ serial: x.entry?.serial || '', hostname: x.entry?.hostname || '', ip: x.entry?.ip || '', firmware: x.entry?.firmware || '', location: x.entry?.location || '' }); };
  const saveRow = (x: RegisterRow) => {
    const patch: Patch = {}; for (const [k] of FIELDS) { if (!x.networked && (k === 'ip' || k === 'hostname')) continue; const v = (form[k] || '').trim(); if (v || x.entry?.[k]) patch[k] = v; }
    const why = writeEntry(room, x.device, x.category, x.networked, patch, persona);
    if (why) { setErr(why); return; }
    onRecord('register.device_recorded', `${room} ${x.device} (${x.asset || 'no unit'}): ${Object.entries(patch).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}`);
    setEdit(null); setErr(null); setTick((t) => t + 1);
  };
  const photo = async (which: 'before' | 'after', f: File | undefined, note: string) => {
    if (!f) return; setBusy(true); setErr(null);
    try { const p = await scalePhoto(f); const why = setInstallPhoto(room, which, { ...p, by: persona, note }); if (why) setErr(why); else { onRecord('register.install_photo', `${room}: ${which}-installation photograph (${p.bytes.toLocaleString('en-US')} bytes)`); setTick((t) => t + 1); } }
    catch (e) { setErr([e instanceof Error ? e.message : String(e)]); } finally { setBusy(false); }
  };
  const [notes, setNotes] = useState({ before: '', after: '' });
  return (
    <Card icon="device" title="Start here: room and device registers" sub={`Every phase is keyed by ${room}; the installation team registers every device and its asset ID first`} testId="cx-registers">
      <div className="reg-head" data-testid="reg-stats" data-pct={s.pct}>
        <span><b>{s.done} of {s.total}</b> devices registered <span className="ui-meta">({s.pct}%)</span></span>
        <span><b>{s.netDone} of {s.networked}</b> networked devices with hostname and address</span>
        <span>Install photographs: <Tag tone={st.photos.before ? 'ok' : 'muted'}>{st.photos.before ? 'before ✓' : 'before —'}</Tag> <Tag tone={st.photos.after ? 'ok' : 'muted'}>{st.photos.after ? 'after ✓' : 'after —'}</Tag></span>
        <span className="ui-meta">{codesOnRecord(r).length} asset codes on record · {retired.length} retired</span>
      </div>
      <div className="reg-meter" aria-hidden="true"><span style={{ width: `${s.pct}%` }} /></div>
      {s.done < s.total ? <Notice tone="warn"><b>Phase 1 is not ready to start.</b> {s.missingSerial ? `${s.missingSerial} device${s.missingSerial === 1 ? '' : 's'} without a serial` : ''}{s.missingSerial && s.missingIp ? '; ' : ''}{s.missingIp ? `${s.missingIp} networked device${s.missingIp === 1 ? '' : 's'} without an IP address` : ''}. Networked devices need a hostname and an IP address (the v1.3 rule).{canFill ? '' : ` The installation team records them (${personaLabel('installer')}).`}</Notice> : null}
      {err ? <div role="alert" data-testid="reg-error"><Notice tone="bad"><b>Not kept.</b> {err.join(' ')}</Notice></div> : null}
      <details className="ln-dom" data-testid="reg-room"><summary><b>Room register</b> <span className="ui-meta">read from the record</span></summary><Facts items={roomRegister(r)} /></details>
      <div className="reg-wrap">
        <table className="pa-table reg-table" data-testid="reg-devices">
          <caption>Device register · device ID is the position, asset ID the unit installed there (both from the record, never typed)</caption>
          <thead><tr><th scope="col">Device</th><th scope="col">Asset ID</th><th scope="col">What</th><th scope="col">Serial</th><th scope="col">Hostname</th><th scope="col">IP address</th><th scope="col">Firmware</th><th scope="col">Location</th><th scope="col">State</th>{canFill ? <th scope="col"><span className="ui-visually-hidden">Record</span></th> : null}</tr></thead>
          <tbody>{rows.map((x) => edit === x.device ? (
            <tr key={x.device} data-testid="reg-row" data-device={x.device} data-editing="">
              <th scope="row">{x.device}</th><td><code>{x.asset || '—'}</code></td><td>{x.label}<div className="ui-meta">{x.category}{x.networked ? ' · networked' : ''}</div></td>
              {FIELDS.map(([k, label, hint]) => <td key={k}>{!x.networked && (k === 'ip' || k === 'hostname') ? <span className="ui-meta">not networked</span> : <input aria-label={`${label} of ${x.device}`} placeholder={hint} value={form[k] || ''} readOnly={k === 'serial' && !!x.entry?.serial} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-field={k} />}</td>)}
              <td>—</td><td><button type="button" className="ui-btn ui-btn--primary" data-testid="reg-save" onClick={() => saveRow(x)}>Save</button> <button type="button" className="ui-btn" onClick={() => { setEdit(null); setErr(null); }}>Cancel</button></td>
            </tr>) : (
            <tr key={x.device} data-testid="reg-row" data-device={x.device} data-complete={x.complete ? 'yes' : 'no'}>
              <th scope="row">{x.device}</th><td><code>{x.asset || '—'}</code></td><td>{x.label}<div className="ui-meta">{x.category}{x.networked ? ' · networked' : ''}</div></td>
              <td>{x.entry?.serial || <span className="ui-meta">—</span>}</td><td>{x.networked ? x.entry?.hostname || <span className="ui-meta">needed</span> : <span className="ui-meta">n/a</span>}</td><td>{x.networked ? x.entry?.ip || <span className="ui-meta">needed</span> : <span className="ui-meta">n/a</span>}</td>
              <td>{x.entry?.firmware || <span className="ui-meta">—</span>}</td><td>{x.entry?.location || <span className="ui-meta">{x.mount}</span>}</td>
              <td><Tag tone={x.complete ? 'ok' : 'warn'}>{x.complete ? 'Registered' : `Needs ${x.missing.join(', ')}`}</Tag>{x.entry ? <div className="ui-meta">{personaLabel(x.entry.by)} · {when(x.entry.at)}</div> : null}</td>
              {canFill ? <td><button type="button" className="ui-btn" data-testid="reg-edit" onClick={() => open(x)}>{x.entry ? 'Update' : 'Register'}</button></td> : null}
            </tr>))}</tbody>
        </table>
      </div>
      <details className="ln-dom" data-testid="reg-retired" open={!!retired.length}><summary><b>Retired register</b> <span className="ui-meta">{retired.length ? `${retired.length} unit${retired.length === 1 ? '' : 's'} out of the inventory; codes reserved, never reused` : 'no unit has left this room'}</span></summary>
        {retired.length ? <ul className="plain">{retired.map((x) => <li key={x.asset + x.retiredAt} data-testid="reg-retired-row" data-asset={x.asset}><code>{x.asset}</code> · {x.label} ({x.device}) · installed {x.installedAt.slice(0, 10)}, {x.reason.toLowerCase()} {x.retiredAt.slice(0, 10)}{x.replacedBy ? <> by <code>{x.replacedBy}</code></> : null} <Tag tone="muted">Retired · code never reused</Tag></li>)}</ul> : <p className="ui-meta">A unit taken out of a position leaves the inventory here, with its history; its asset ID is never issued again.</p>}
      </details>
      <div className="reg-photos" data-testid="reg-photos">
        <h3 className="reg-h">Phase 1 · install documentation <span className="ui-meta">by anyone on the installation team</span></h3>
        <div className="reg-photo-grid">{(['before', 'after'] as const).map((w) => { const p = st.photos[w]; return (
          <figure key={w} className="reg-photo" data-testid={`reg-photo-${w}`} data-has={p ? 'yes' : 'no'}>
            {p ? <img src={p.dataUrl} alt={`${w === 'before' ? 'Before' : 'After'} the installation, ${r.outline.name}${p.note ? `: ${p.note}` : ''}`} /> : <div className="reg-photo__empty">{w === 'before' ? 'Before the installation' : 'After the installation'}</div>}
            <figcaption>{p ? <>{personaLabel(p.by)} · {when(p.at)}{p.note ? ` · ${p.note}` : ''}</> : w === 'after' && !st.photos.before ? 'Taken after the before photograph' : 'Not yet taken'}</figcaption>
            {canFill ? <div className="reg-photo__add"><input aria-label={`Note for the ${w}-installation photograph`} placeholder="Note (optional)" value={notes[w]} onChange={(e) => setNotes({ ...notes, [w]: e.target.value })} />
              <label className="ui-btn">{p ? 'Replace photograph' : 'Add photograph'}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="ui-visually-hidden" data-testid={`reg-photo-input-${w}`} disabled={busy} onChange={(e) => { void photo(w, e.target.files?.[0], notes[w]); e.target.value = ''; }} /></label></div> : null}
          </figure>); })}</div>
      </div>
      {st.log.length ? <details className="ln-dom" data-testid="reg-log"><summary><b>Who recorded what</b> <span className="ui-meta">{st.log.length} entr{st.log.length === 1 ? 'y' : 'ies'} in this browser</span></summary><ul className="plain">{st.log.slice(0, 20).map((l, i) => <li key={i}>{when(l.at)} · {personaLabel(l.by)} · {l.what}</li>)}</ul></details> : null}
      <p className="wk-note">Synthetic: values typed here describe a demonstration connected to no system, and nothing contacts a device. A recorded serial is final; a serial, hostname or address already registered to another device is refused.</p>
    </Card>
  );
}
