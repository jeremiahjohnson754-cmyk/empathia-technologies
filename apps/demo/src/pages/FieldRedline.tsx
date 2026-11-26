/**
 * #/install/redline?room=… — Phase 1's field record, drawn as a redline over the Lite plan (founder, 14 Nov 2026: "have the lite design
 * become like a bluebeam redlining document"). The design is the black layer; what the installation team found and did is the red layer:
 * how each device is mounted, what it is hooked up to, devices moved from their designed position (a sprinkler, a diffuser, a beam) with
 * the reason, a photograph and an independent decision, and notes pinned to the plan. The record is in install/fieldRecord.ts.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, StatTile, Segmented, Tag, Notice } from '@empathia/ui';
import { roomRecord, type RoomRecord, type Position } from '../campus/design.js';
import { CAMPUS_ROOMS, SITE } from '../campus/canon.js';
import { scalePhoto } from '../campus/registerStore.js';
import { personaOf, personaLabel, holds } from '../build/store.js';
import { ExportMenu } from '../export/ExportMenu.js';
import type { Report } from '../export/model.js';
import * as F from '../install/fieldRecord.js';

type Mode = 'select' | 'note' | 'move';
const when = (s?: string) => (s ? s.slice(0, 16).replace('T', ' ') : '—');

export function FieldRedlinePage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const q = new URLSearchParams(hash.split('?')[1] || '');
  const roomId = q.get('room') || 'R-ATL-4-218'; const r = useMemo(() => roomRecord(roomId), [roomId]);
  if (!r) return <section className="wk" data-testid="field-redline"><Notice tone="bad">There is no room {roomId} on the campus record.</Notice></section>;
  return <Redline r={r} persona={persona} focus={q.get('device')} />;
}

function Redline({ r, persona, focus }: { r: RoomRecord; persona: string; focus: string | null }) {
  const room = r.outline.id; const [w, l] = r.outline.dims;
  const [tick, setTick] = useState(0); const s = useMemo(() => F.readField(room), [room, tick]);
  const devices = useMemo(() => F.devicesOf(r), [r]); const st = F.fieldStats(r, s);
  const [mode, setMode] = useState<Mode>('select'); const [sel, setSel] = useState<string | null>(focus && devices.some((d) => d.code === focus) ? focus : null);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null); const [err, setErr] = useState<string[] | null>(null); const [ok, setOk] = useState<string | null>(null);
  const canRecord = F.RECORD_AUTHORITIES.some((a) => holds(persona, a)); const canApprove = holds(persona, F.APPROVE_AUTHORITY);
  const run = (res: F.Result, msg: string) => { if (res.ok) { setErr(null); setOk(msg); setTick((t) => t + 1); return true; } setOk(null); setErr(res.why); setTick((t) => t + 1); return false; };
  const dev = devices.find((d) => d.code === sel) || null;

  // the plan: metres → SVG units (100 per metre), a margin for labels
  const S = 100, M = 40; const vw = w * S + 2 * M, vh = l * S + 2 * M; const X = (x: number) => M + x * S, Y = (y: number) => M + y * S;
  // a device's hit area is at least 26 px across when the plan is drawn 320 px wide (WCAG 2.2 target size on a phone), whatever the room's size
  const HIT = Math.max(22, Math.ceil((13.5 * vw) / 320));
  const onPlan = (e: { currentTarget: SVGSVGElement; clientX: number; clientY: number }) => {
    if (mode === 'select') return;
    const svg = e.currentTarget; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); if (!m) return;
    const p = pt.matrixTransform(m.inverse()); const x = Math.round(((p.x - M) / S) * 100) / 100, y = Math.round(((p.y - M) / S) * 100) / 100;
    if (x < 0 || y < 0 || x > w || y > l) return;
    if (mode === 'move' && !dev) { setErr(['choose the device first, then click where it went in']); return; }
    setPin({ x, y }); setErr(null);
  };

  const made = { role: personaLabel(persona), at: new Date().toISOString(), build: process.env.DEMO_BUILD_ID || 'dev' };
  const label = (code: string) => devices.find((d) => d.code === code)?.label || code;
  const report = (): Report => ({
    schema: 'empathia.report/1', id: `FIELD-${room}`, kind: 'field-record', title: 'Field record and redlines', subtitle: `${room} ${r.outline.name} · phase 1 installation documentation`,
    scope: { tenant: SITE.enterprise, site: SITE.name, building: r.outline.building, floor: String(r.outline.floor), room: r.outline.name, roomId: room },
    status: { label: `${st.mounted} of ${st.devices} mounted · ${st.proposed} moves waiting`, tone: st.proposed || st.openNotes ? 'warn' : 'muted', why: `${st.hookups} hookups (${st.notInDesign} not in the design); ${st.approved} approved moves; ${st.openNotes} open notes` },
    generatedAt: made.at, role: made.role, build: made.build,
    provenance: ['The design is the campus record’s (synthetic); the field record is what was typed or photographed in this browser, each entry with who and when.', 'An approved field move is the as-built position; it does not edit the design.', `Made as ${made.role}: a perspective on the record, which grants no permission.`],
    headline: `${room}: ${st.mounted} of ${st.devices} devices have their mounting recorded, ${st.hookups} hookups are recorded, ${st.approved} devices were moved in the field with approval and ${st.proposed} moves wait for a decision.`,
    kpis: [{ label: 'Mounted', value: `${st.mounted}/${st.devices}` }, { label: 'Hookups', value: String(st.hookups) }, { label: 'Not in the design', value: String(st.notInDesign) }, { label: 'Moves waiting', value: String(st.proposed) }, { label: 'Open notes', value: String(st.openNotes) }],
    primary: 'Mounting',
    sections: [
      { id: 'mounting', heading: 'How each device is mounted', table: { title: 'Mounting', cols: [{ key: 'd', label: 'Device' }, { key: 'm', label: 'Method' }, { key: 'h', label: 'Height (m AFF)' }, { key: 'f', label: 'Fixing' }, { key: 'b', label: 'Backing' }, { key: 't', label: 'Tether' }, { key: 'by', label: 'Recorded by' }, { key: 'at', label: 'When', kind: 'date' }],
        rows: devices.map((d) => { const m = F.mountOf(s, d.code); return { d: `${d.code} ${d.label}`, m: m ? F.MOUNTS.find((x) => x.id === m.method)?.label || m.method : 'not recorded', h: m?.heightM ?? '', f: m?.fixing || '', b: m?.backing || '', t: m?.tether || '', by: m ? personaLabel(m.by) : '', at: m?.at.slice(0, 10) || '' }; }) } },
      { id: 'hookups', heading: 'What each device is hooked up to', table: { title: 'Hookups', cols: [{ key: 'id', label: 'Hookup' }, { key: 'a', label: 'Device and port' }, { key: 'b', label: 'Other end' }, { key: 'c', label: 'Cable' }, { key: 'x', label: 'Against the design' }], rows: s.hookups.map((h) => ({ id: h.id, a: `${h.device} ${label(h.device)} · ${h.port}`, b: `${h.to}${F.ENDS_OUTSIDE.includes(h.to) ? '' : ` ${label(h.to)}`}${h.toPort ? ` · ${h.toPort}` : ''}`, c: h.cable, x: F.asDesigned(r, h) ? 'as designed' : 'not in the design' })) } },
      { id: 'moves', heading: 'Field moves', table: { title: 'Moves', cols: [{ key: 'id', label: 'Move' }, { key: 'd', label: 'Device' }, { key: 'm', label: 'Distance (m)', kind: 'number' }, { key: 'why', label: 'Reason' }, { key: 's', label: 'State', kind: 'status' }, { key: 'by', label: 'Recorded / decided' }], rows: s.moves.map((m) => ({ id: m.id, d: `${m.device} ${label(m.device)}`, m: Number(F.dist(m.from, m.to).toFixed(2)), why: `${m.reason}${m.note ? `: ${m.note}` : ''}`, s: m.state, by: `${personaLabel(m.by)}${m.decidedBy ? ` / ${personaLabel(m.decidedBy)}` : ''}` })) } },
      { id: 'notes', heading: 'Notes on the plan', table: { title: 'Notes', cols: [{ key: 'id', label: 'Note' }, { key: 't', label: 'Text' }, { key: 's', label: 'State', kind: 'status' }, { key: 'res', label: 'Resolution' }], rows: s.markups.map((m) => ({ id: m.id, t: m.text, s: m.state, res: m.resolution || '' })) } },
    ],
    dossier: { room, mount: s.mount, hookups: s.hookups, moves: s.moves.map((m) => ({ ...m, photo: m.photo ? { bytes: m.photo.bytes } : null })), markups: s.markups, synthetic: true },
  });

  return (
    <section className="wk san fr" data-native="workspace" data-testid="field-redline" data-room={room}>
      <PageHero product="lite" icon="map" eyebrow="Phase 1 · installation" title={`Field record · ${r.outline.name}`}
        lede={<>The design in black; what the installation team found and did in red: how each device is mounted, what it is hooked up to, devices moved from their designed position and why, and notes on the plan. Synthetic room; what you record stays in this browser. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <p className="build__row">
        <label className="kit-field">Room <select aria-label="Room" value={room} onChange={(e) => { location.hash = `#/install/redline?room=${e.target.value}`; }}>{CAMPUS_ROOMS.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select></label>
        <a className="ui-btn ui-btn--sm" href={`#/lite/room/${room}?mode=engineer`}>Open the room in Lite</a> <a className="ui-btn ui-btn--sm" href={`#/commissioning/room/${room}`}>Its commissioning record</a>
      </p>
      {!canRecord && !canApprove ? <Notice tone="info">You can read this record. The installation team records it (work.evidence or field.scan); the systems engineer or the designer of record decides field moves.</Notice> : null}
      <div className="kit-grid kit-grid--tiles wk-tiles5" data-testid="fr-kpis">
        <StatTile label="Mounting recorded" value={`${st.mounted}/${st.devices}`} tone={st.mounted === st.devices ? 'ok' : 'warn'} />
        <StatTile label="Hookups recorded" value={st.hookups} hint={st.needHookup ? `${st.needHookup} designed ends not yet recorded` : undefined} />
        <StatTile label="Not in the design" value={st.notInDesign} hint="hookups found in the field" tone={st.notInDesign ? 'warn' : undefined} />
        <StatTile label="Moves waiting" value={st.proposed} hint={`${st.approved} approved`} tone={st.proposed ? 'warn' : undefined} />
        <StatTile label="Open notes" value={st.openNotes} tone={st.openNotes ? 'warn' : undefined} />
      </div>
      {err ? <div role="alert"><Notice tone="bad"><b>Refused.</b> {err.join(' · ')}</Notice></div> : ok ? <Notice tone="ok">{ok}</Notice> : null}

      <div className="fr__grid">
        <Card icon="map" title="The plan, redlined" sub={mode === 'select' ? 'Choose a device to record it' : mode === 'note' ? 'Click the plan where the note belongs' : dev ? `Click where ${dev.code} actually went in` : 'Choose the device, then click where it went in'} testId="fr-plan">
          <Segmented label="Tool" value={mode} onChange={(v) => { setMode(v as Mode); setPin(null); setErr(null); }} options={[{ value: 'select', label: 'Select' }, { value: 'note', label: 'Add a note' }, { value: 'move', label: 'Record a move' }]} />
          <div className="fr__plan">
            <svg viewBox={`0 0 ${vw} ${vh}`} role="img" aria-label={`Plan of ${r.outline.name}, ${w} by ${l} meters, with the field redlines`} onClick={onPlan} data-testid="fr-svg" style={{ cursor: mode === 'select' ? 'default' : 'crosshair' }}>
              <rect x={M} y={M} width={w * S} height={l * S} className="fr__room" />
              {Array.from({ length: Math.floor(w) + 1 }, (_, i) => <line key={`gx${i}`} x1={X(i)} y1={M} x2={X(i)} y2={M + l * S} className="fr__grid1" />)}
              {Array.from({ length: Math.floor(l) + 1 }, (_, i) => <line key={`gy${i}`} x1={M} y1={Y(i)} x2={M + w * S} y2={Y(i)} className="fr__grid1" />)}
              <text x={M} y={M - 12} className="fr__dim">{w} m × {l} m · grid 1 m</text>
              {r.positions.filter((p) => p.furniture).map((p) => <rect key={p.code} x={X(p.x) - 30} y={Y(p.y) - 18} width={60} height={36} rx={6} className="fr__furn" />)}
              {s.moves.filter((m) => m.state !== 'REJECTED').map((m) => <g key={m.id} className={`fr__move fr__move--${m.state.toLowerCase()}`}>
                <circle cx={X(m.from.x)} cy={Y(m.from.y)} r={14} className="fr__ghost" />
                <line x1={X(m.from.x)} y1={Y(m.from.y)} x2={X(m.to.x)} y2={Y(m.to.y)} markerEnd="url(#fr-arrow)" />
                <text x={(X(m.from.x) + X(m.to.x)) / 2 + 8} y={(Y(m.from.y) + Y(m.to.y)) / 2 - 8}>{m.id} · {m.reason}</text>
              </g>)}
              <defs><marker id="fr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="fr__arrowhead" /></marker></defs>
              {devices.map((p) => { const b = F.asBuilt(s, p); const on = sel === p.code; const mounted = !!F.mountOf(s, p.code);
                return <g key={p.code} role="button" tabIndex={0} aria-label={`${p.code} ${p.label}${b.moved ? ', moved in the field' : ''}${mounted ? ', mounting recorded' : ''}`} aria-pressed={on} data-device={p.code}
                  className={`fr__dev${on ? ' is-on' : ''}${mounted ? ' is-mounted' : ''}${b.moved ? ' is-moved' : ''}`}
                  onClick={(e) => { if (mode === 'select' || (mode === 'move' && !dev)) { e.stopPropagation(); setSel(p.code); setPin(null); setErr(null); } }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(p.code); } }}>
                  <circle cx={X(b.x)} cy={Y(b.y)} r={HIT} className="fr__hit" /><circle cx={X(b.x)} cy={Y(b.y)} r={11} className="fr__dot" />
                  <text x={X(b.x) + 15} y={Y(b.y) + 4}>{p.code}</text>
                </g>; })}
              {s.markups.map((m, i) => <g key={m.id} className={`fr__note fr__note--${m.state.toLowerCase()}`} data-note={m.id}>
                <rect x={X(m.x) - 22} y={Y(m.y) - 16} width={44} height={32} rx={14} /><text x={X(m.x)} y={Y(m.y) + 5} textAnchor="middle">{i + 1}</text>
              </g>)}
              {pin ? <circle cx={X(pin.x)} cy={Y(pin.y)} r={10} className="fr__pin" /> : null}
            </svg>
          </div>
          <p className="ui-muted fr__legend"><span className="fr__k fr__k--dev" /> device as designed · <span className="fr__k fr__k--mounted" /> mounting recorded · <span className="fr__k fr__k--move" /> moved in the field (dashed while waiting for a decision) · <span className="fr__k fr__k--note" /> note</p>
          {pin && mode === 'note' ? <NoteForm onSave={(text) => run(F.addMarkup(r, persona, { ...pin, text }), 'Note pinned to the plan.') && setPin(null)} at={pin} /> : null}
          {pin && mode === 'move' && dev ? <MoveForm dev={dev} at={pin} onSave={(reason, note, photo) => run(F.proposeMove(r, persona, { device: dev.code, x: pin.x, y: pin.y, reason, note, photo }), `${dev.code}: field move recorded; it waits for a decision.`) && setPin(null)} /> : null}
        </Card>

        <Card icon="wrench" title={dev ? `${dev.code} · ${dev.label}` : 'Choose a device'} sub={dev ? `${dev.catLabel} · designed ${dev.mount}, ${dev.x} m across, ${dev.y} m deep${dev.z ? `, ${dev.z} m high` : ''}` : 'On the plan or from the list'} testId="fr-device">
          {!dev ? <ul className="build__list">{devices.map((d) => <li key={d.code}><button type="button" className="ui-btn ui-btn--sm" onClick={() => setSel(d.code)}>{d.code}</button> {d.label} {F.mountOf(s, d.code) ? <Tag tone="ok">mounted</Tag> : <Tag tone="muted">mounting not recorded</Tag>}</li>)}</ul>
            : <DevicePanel key={dev.code} r={r} s={s} dev={dev} persona={persona} canRecord={canRecord} run={run} onMove={() => { setMode('move'); setPin(null); }} />}
        </Card>
      </div>

      <Card icon="route" title={`Field moves (${s.moves.length})`} sub="Each move is decided by someone holding room.design.approve, never by its recorder; an approved move is the as-built position and the design is not edited" testId="fr-moves">
        {!s.moves.length ? <p className="ui-muted">No device has been moved from its designed position.</p> : <ul className="build__list">{s.moves.map((m) => <li key={m.id} data-move={m.id} data-state={m.state}>
          <b>{m.id}</b> <Tag tone={m.state === 'APPROVED' ? 'ok' : m.state === 'REJECTED' ? 'bad' : 'warn'}>{m.state}</Tag> {m.device} {label(m.device)} moved {F.dist(m.from, m.to).toFixed(2)} m · <b>{m.reason}</b>{m.note ? `: ${m.note}` : ''} <span className="ui-muted">· {personaLabel(m.by)}, {when(m.at)}{m.decidedBy ? ` · ${m.state.toLowerCase()} by ${personaLabel(m.decidedBy)}${m.decision ? `: ${m.decision}` : ''}` : ''}</span>
          {m.photo ? <img className="fr__photo" src={m.photo.dataUrl} alt={`Photograph for ${m.id}`} /> : null}
          {m.state === 'APPROVED' ? <span className="ui-muted"> · Checks that name it, to look at again: {F.checksNaming(r, m.device).join(', ') || 'none'}</span> : null}
          {m.state === 'PROPOSED' && canApprove ? <Decide onDecide={(yes, why) => run(F.decideMove(r, persona, m.id, yes, why), `${m.id} ${yes ? 'approved' : 'rejected'}.`)} id={m.id} /> : null}
        </li>)}</ul>}
      </Card>

      <Card icon="info" title={`Notes on the plan (${s.markups.length})`} sub="Clouds pinned where they apply; open until resolved" testId="fr-notes">
        {!s.markups.length ? <p className="ui-muted">No notes yet. Choose “Add a note” and click the plan.</p> : <ol className="build__list">{s.markups.map((m) => <li key={m.id} data-note={m.id} data-state={m.state}>
          <b>{m.id}</b> <Tag tone={m.state === 'OPEN' ? 'warn' : 'ok'}>{m.state}</Tag> {m.text} <span className="ui-muted">· {personaLabel(m.by)}, {when(m.at)}{m.resolution ? ` · resolved by ${m.resolvedBy ? personaLabel(m.resolvedBy) : ''}: ${m.resolution}` : ''}</span>
          {m.state === 'OPEN' && (canRecord || canApprove) ? <Resolve id={m.id} onSave={(t) => run(F.resolveMarkup(r, persona, m.id, t), `${m.id} resolved.`)} /> : null}
        </li>)}</ol>}
      </Card>

      <details className="ln-dom"><summary><b>Who recorded what</b> <span className="ui-meta">{s.log.length} entries, refusals included</span></summary>
        <ul className="build__list" data-testid="fr-log">{s.log.slice(0, 40).map((x, i) => <li key={i}><Tag tone={x.outcome === 'DENIED' ? 'bad' : 'muted'}>{x.outcome}</Tag> {personaLabel(x.by)} · {when(x.at)} · {x.what}</li>)}</ul></details>
      <ExportMenu testId="fr-export" title="Field record" by={personaLabel(persona)} sub="Mounting, hookups, field moves and notes, as six files" make={report} />
    </section>
  );
}

function DevicePanel({ r, s, dev, persona, canRecord, run, onMove }: { r: RoomRecord; s: F.FieldState; dev: Position; persona: string; canRecord: boolean; run: (x: F.Result, m: string) => boolean; onMove: () => void }) {
  const cur = F.mountOf(s, dev.code);
  const [m, setM] = useState({ method: cur?.method || '', heightM: cur?.heightM?.toString() || (dev.z ? String(dev.z) : ''), fixing: cur?.fixing || '', backing: cur?.backing || '', tether: cur?.tether || 'n/a', note: cur?.note || '' });
  const overhead = F.MOUNTS.find((x) => x.id === m.method)?.overhead;
  const [h, setH] = useState({ port: '', to: '', toPort: '', cable: '' });
  const mine = s.hookups.filter((x) => x.device === dev.code || x.to === dev.code);
  const designed = r.connections.filter((c) => c.from === dev.code || c.to === dev.code);
  const others = F.devicesOf(r).filter((d) => d.code !== dev.code);
  const name = (code: string) => (F.ENDS_OUTSIDE.includes(code) ? code : `${code} ${others.find((d) => d.code === code)?.label || ''}`);
  return <div className="fr__panel" data-device={dev.code}>
    <h3 className="build__h2">How it is mounted</h3>
    {cur ? <p data-testid="fr-mount-current"><Tag tone="ok">recorded</Tag> {F.MOUNTS.find((x) => x.id === cur.method)?.label}{cur.heightM !== null ? ` · ${cur.heightM} m AFF` : ''}{cur.fixing ? ` · ${cur.fixing}` : ''}{cur.backing ? ` · backing ${cur.backing}` : ''}{cur.tether !== 'n/a' ? ` · tether ${cur.tether}` : ''} <span className="ui-muted">· {personaLabel(cur.by)}, {when(cur.at)}{(s.mount[dev.code]?.length || 0) > 1 ? ` · ${s.mount[dev.code]!.length} versions` : ''}</span></p> : <p className="ui-muted">Not recorded yet.</p>}
    {canRecord ? <div className="fr__form">
      <label className="kit-field">Method <select aria-label={`Mounting method of ${dev.code}`} value={m.method} onChange={(e) => setM({ ...m, method: e.target.value })}><option value="">choose…</option>{F.MOUNTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      <label className="kit-field">Height (m above the finished floor) <input inputMode="decimal" aria-label={`Mounting height of ${dev.code}`} value={m.heightM} onChange={(e) => setM({ ...m, heightM: e.target.value })} /></label>
      <label className="kit-field">Fixing <input aria-label={`Fixing of ${dev.code}`} placeholder="bracket, anchors, hardware" value={m.fixing} onChange={(e) => setM({ ...m, fixing: e.target.value })} /></label>
      <label className="kit-field">Backing <input aria-label={`Backing of ${dev.code}`} placeholder="stud, blocking, plywood, tile bridge" value={m.backing} onChange={(e) => setM({ ...m, backing: e.target.value })} /></label>
      {overhead ? <label className="kit-field">Secondary safety tether <select aria-label={`Safety tether of ${dev.code}`} value={m.tether} onChange={(e) => setM({ ...m, tether: e.target.value as F.Mounting['tether'] })}><option value="n/a">choose…</option><option value="yes">yes, fitted</option><option value="no">no</option></select></label> : null}
      <label className="kit-field">Note <input aria-label={`Mounting note of ${dev.code}`} value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} /></label>
      <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => run(F.recordMounting(r, persona, dev.code, m), `${dev.code}: mounting recorded.`)}>Record the mounting</button>
    </div> : null}

    <h3 className="build__h2">Hooked up to</h3>
    {designed.length ? <p className="ui-muted">Designed: {designed.map((c) => { const o = c.from === dev.code ? c.to : c.from; const got = mine.some((x) => (x.device === dev.code && x.to === o) || (x.to === dev.code && x.device === o)); return <span key={c.id}>{c.kind} → {o} {got ? '✓' : '(not recorded)'}; </span>; })}</p> : <p className="ui-muted">The design proposes no connection for this device.</p>}
    {mine.length ? <ul className="build__list" data-testid="fr-hookups">{mine.map((x) => <li key={x.id}><b>{x.id}</b> {x.device}:{x.port} → {name(x.to)}{x.toPort ? `:${x.toPort}` : ''}{x.cable ? ` · cable ${x.cable}` : ''} {F.asDesigned(r, x) ? <Tag tone="ok">as designed</Tag> : <Tag tone="warn">not in the design</Tag>}</li>)}</ul> : null}
    {canRecord ? <div className="fr__form">
      <label className="kit-field">Port on {dev.code} <input aria-label={`Port on ${dev.code}`} placeholder="as labeled, e.g. HDMI IN 1, LAN" value={h.port} onChange={(e) => setH({ ...h, port: e.target.value })} /></label>
      <label className="kit-field">Other end <select aria-label={`Other end of the hookup from ${dev.code}`} value={h.to} onChange={(e) => setH({ ...h, to: e.target.value })}><option value="">choose…</option>{others.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.label}</option>)}{F.ENDS_OUTSIDE.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
      <label className="kit-field">Its port <input aria-label="Port at the other end" value={h.toPort} onChange={(e) => setH({ ...h, toPort: e.target.value })} /></label>
      <label className="kit-field">Cable label <input aria-label="Cable label" value={h.cable} onChange={(e) => setH({ ...h, cable: e.target.value })} /></label>
      <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => { if (run(F.recordHookup(r, persona, { device: dev.code, ...h }), `${dev.code}: hookup recorded.`)) setH({ port: '', to: '', toPort: '', cable: '' }); }}>Record the hookup</button>
    </div> : null}

    <h3 className="build__h2">Position</h3>
    {(() => { const b = F.asBuilt(s, dev); return b.moved ? <p><Tag tone="info">as built</Tag> {b.x} m across, {b.y} m deep · moved {F.dist(b.moved.from, b.moved.to).toFixed(2)} m ({b.moved.reason}, {b.moved.id})</p> : <p className="ui-muted">As designed{s.moves.some((x) => x.device === dev.code && x.state === 'PROPOSED') ? ' · a move is waiting for a decision' : ''}.</p>; })()}
    {canRecord ? <button type="button" className="ui-btn ui-btn--sm" onClick={onMove}>It went in somewhere else: record a move</button> : null}
  </div>;
}

function NoteForm({ at, onSave }: { at: { x: number; y: number }; onSave: (t: string) => void }) {
  const [t, setT] = useState('');
  return <div className="fr__form" data-testid="fr-note-form"><p className="ui-muted">Note at {at.x} m across, {at.y} m deep</p><label className="kit-field">Note <input aria-label="Note text" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. sprinkler head 300 mm from the designed camera position" /></label><button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => onSave(t)}>Pin the note</button></div>;
}
function MoveForm({ dev, at, onSave }: { dev: Position; at: { x: number; y: number }; onSave: (reason: string, note: string, photo: F.Photo | null) => void }) {
  const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const [photo, setPhoto] = useState<F.Photo | null>(null); const [busy, setBusy] = useState(false);
  return <div className="fr__form" data-testid="fr-move-form"><p className="ui-muted">{dev.code} went in at {at.x} m across, {at.y} m deep ({F.dist(dev, at).toFixed(2)} m from its designed position)</p>
    <label className="kit-field">Why <select aria-label="Reason for the move" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">choose…</option>{F.MOVE_REASONS.map((x) => <option key={x}>{x}</option>)}</select></label>
    <label className="kit-field">Note <input aria-label="Move note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="what was in the way, who agreed on site" /></label>
    <label className="kit-field">Photograph <input type="file" accept="image/*" aria-label="Photograph of the field condition" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { setPhoto(await scalePhoto(f)); } finally { setBusy(false); } }} /></label>
    <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" disabled={busy} onClick={() => onSave(reason, note, photo)}>Record the move</button></div>;
}
function Decide({ id, onDecide }: { id: string; onDecide: (yes: boolean, why: string) => void }) {
  const [why, setWhy] = useState('');
  return <span className="fr__decide"> <input aria-label={`Decision note for ${id}`} placeholder="decision note (required to reject)" value={why} onChange={(e) => setWhy(e.target.value)} /> <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={() => onDecide(true, why)}>Approve {id}</button> <button type="button" className="ui-btn ui-btn--sm" onClick={() => onDecide(false, why)}>Reject {id}</button></span>;
}
function Resolve({ id, onSave }: { id: string; onSave: (t: string) => void }) {
  const [t, setT] = useState('');
  return <span className="fr__decide"> <input aria-label={`Resolution of ${id}`} placeholder="how it was resolved" value={t} onChange={(e) => setT(e.target.value)} /> <button type="button" className="ui-btn ui-btn--sm" onClick={() => onSave(t)}>Resolve {id}</button></span>;
}
