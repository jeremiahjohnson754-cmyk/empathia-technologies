/**
 * Scouter, inside Lite (D41): pick a room; each of the catalogue's nine device classes is checked against that room's own recorded
 * requirement, and every check names its source and whether it is published or modelled. Address: #/campus/scouter?room=<template>,
 * and #/campus/scouter/<class>?room=<template> for one class's checks.
 */
import { useState } from 'react';
import { Tag, Button, Notice, Card } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { Action } from '../access/Gate.js';
import { evaluate, ranked, VERDICT, NOT_REBUILT, type Evaluation } from './evaluate.js';
import { ROOMS, cats, required } from './data.js';
import { ROLES, allows } from '../access/policy.js';
import * as PF from './profiles.js';
import type { RoleKey } from '../registry.types.js';

const PKEY = 'empathia.demo.scouterProfiles.v1';
const loadProfiles = (): PF.Profile[] => { try { const v = JSON.parse(localStorage.getItem(PKEY) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.kit) && Array.isArray(x.history)).slice(0, 40) : []; } catch { return []; } };
const saveProfiles = (l: PF.Profile[]) => { try { localStorage.setItem(PKEY, JSON.stringify(l.slice(0, 40))); } catch { /* lasts the page */ } };
const STUDIO_KEY = 'empathia.demo.studio.v1';
const STUDIO_KIND: Record<string, string> = { display: 'display', ledwall: 'display', projector: 'display', camera: 'camera', bar: 'camera', micceil: 'micceil', speaker: 'speaker' };
/** A Design a Space concept from an adopted profile (the studio's own saved-concept format), saved beside the reader's other concepts. */
function adoptIntoStudio(p: PF.Profile, kit: PF.KitLine[], dims: [number, number, number], seats: number): string | null {
  const [l, w, h] = dims; const items: Array<{ k: string; x: number; y: number; id: string }> = []; let n = 0;
  for (const k of kit) { const kind = STUDIO_KIND[k.key]; if (!kind) continue; for (let i = 0; i < k.count; i++) { n += 1; const f = (i + 1) / (k.count + 1);
    items.push({ k: kind, id: `o${n}`, x: Math.round(w * f * 100) / 100, y: Math.round((kind === 'display' ? 0.15 : kind === 'camera' ? 0.35 : kind === 'speaker' ? l * (i % 2 ? 0.7 : 0.3) : l * 0.55) * 100) / 100 }); } }
  items.push({ k: 'table', id: `o${n + 1}`, x: w / 2, y: Math.round(l * 0.55 * 100) / 100 });
  const c = { v: 1, id: `S-${p.id.toLowerCase()}-${Date.now().toString(36)}`, name: `${p.name}${p.version ? ` v${p.version}` : ''}`, from: `scouter:${p.id}`, w: Math.min(40, w), l: Math.min(40, l), h: Math.min(12, Math.max(2.2, h)), seats: Math.max(1, seats), items };
  try { const list = JSON.parse(localStorage.getItem(STUDIO_KEY) || '[]'); localStorage.setItem(STUDIO_KEY, JSON.stringify([c, ...(Array.isArray(list) ? list : [])].slice(0, 20))); return c.id; } catch { return null; }
}

const KEY = 'empathia.demo.scouter.v2';
type Proposals = Record<string, { key: string; by: string }[]>;
const load = (): Proposals => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

export default function ScouterPage({ role, params, query }: PageProps) {
  const room = ROOMS.find((r) => r.key === query.get('room')) ?? ROOMS[0]!;
  const [props, setProps] = useState<Proposals>(load);
  const list = ranked(evaluate(room.key, room, cats, required));
  const open = list.find((e) => e.key === params.candidate) ?? null;
  const href = (k?: string, r = room.key) => `#/campus/scouter${k ? `/${encodeURIComponent(k)}` : ''}?room=${encodeURIComponent(r)}`;
  const mine = props[room.key] || [];
  const propose = (e: Evaluation) => { if (mine.some((x) => x.key === e.key)) return; const next = { ...props, [room.key]: [...mine, { key: e.key, by: ROLES[role].label }] }; setProps(next); try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* lasts the page */ } };
  return (
    <section className="scouter" aria-labelledby="scouter-h">
      <p className="kicker product-kicker" data-product="lite"><a href="#/v25/build">Lite</a> · Scouter</p>
      <h1 id="scouter-h">Does this device suit this room?</h1>
      <p className="lead">Ask Scouter before anyone buys. Each of the catalogue’s nine device classes is checked against the room’s own requirement — not against each other — and every check says where its figure comes from and whether it is published or modelled.</p>
      <p className="ui-meta">Acting as {ROLES[role].label}. Synthetic rooms; this build’s device catalogue.</p>
      <p><a className="ui-btn ui-btn--quiet" href="#/scouter/anatomy" data-testid="scouter-anatomy">Anatomy: open a device class into its blocks</a></p>
      <label className="scouter__field">Room
        <select value={room.key} onChange={(e) => { location.hash = href(undefined, e.target.value); }}>{ROOMS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
      </label>
      <p className="ui-meta">{room.label}: {room.use}. {room.dims[0]} × {room.dims[1]} m, ceiling {room.dims[2]} m, {room.occ} seats{room.arch ? `, archetype ${room.arch} (requires ${(required[room.arch] || []).join(', ') || 'nothing'})` : ''}.</p>
      {mine.length > 0 && <Notice tone="ok"><b>Proposed for this room:</b> {mine.map((m) => `${cats[m.key]?.label} (by ${m.by})`).join('; ')} — in this browser only, for the discipline engineer’s review.</Notice>}
      <ol className="scouter__list" aria-label={`Device classes checked against ${room.label}`}>
        {list.map((e) => { const fail = e.checks.find((c) => c.id !== 'required' && !c.pass); return (
          <li key={e.key} className={`scouter__row${e.verdict === 'DOES_NOT_SUIT' || e.verdict === 'NOT_REQUIRED' ? ' scouter__row--out' : ''}${open?.key === e.key ? ' on' : ''}`} data-verdict={e.verdict}>
            <div className="scouter__main">
              <a href={href(e.key)} className="scouter__name"><b>{e.label}</b></a>
              <span className="scouter__tags"><Tag tone={VERDICT[e.verdict].tone}>{VERDICT[e.verdict].label}</Tag></span>
              <p className="scouter__why">{e.verdict === 'NOT_REQUIRED' ? e.checks[0]!.detail : fail ? `${fail.label}: ${fail.detail}` : e.condition || `All ${e.checks.length} checks pass.`}</p>
            </div>
            <div className="scouter__score"><b>{e.checks.filter((c) => c.pass).length}/{e.checks.length}</b><span>checks · {e.checks.filter((c) => c.basis === 'MODELED').length} modelled</span></div>
          </li>); })}
      </ol>
      {open && <Detail e={open} roomLabel={room.label} proposed={mine.some((m) => m.key === open.key)} onPropose={() => propose(open)} closeHref={href()} />}
      <Profiles role={role} room={room} list={list} />
      <section className="scouter__gap" aria-labelledby="scouter-gap"><h2 id="scouter-gap">Not rebuilt yet</h2>
        <p className="ui-meta">V2.5.3 Scouter also had these. This build’s data cannot back them honestly, so they are not shown.</p>
        <ul>{NOT_REBUILT.map((n) => <li key={n.what}>{n.what} <span className="ui-meta">(parity {n.rows})</span></li>)}</ul></section>
    </section>
  );
}

function Detail({ e, roomLabel, proposed, onPropose, closeHref }: { e: Evaluation; roomLabel: string; proposed: boolean; onPropose: () => void; closeHref: string }) {
  return (
    <article className="scouter__detail" aria-labelledby="scouter-d">
      <header className="scouter__dhead"><h2 id="scouter-d">{e.label} in {roomLabel}</h2><a className="ui-btn ui-btn--quiet" href={closeHref}>Close</a></header>
      <p><Tag tone={VERDICT[e.verdict].tone}>{VERDICT[e.verdict].label}</Tag>{e.condition ? ` ${e.condition}` : ''}</p>
      <div className="ui-table-wrap"><table className="ui-table">
        <caption className="ui-sr">Checks, each with its result, basis and source</caption>
        <thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Basis</th><th scope="col">Source</th><th scope="col">Why</th></tr></thead>
        <tbody>{e.checks.map((c) => <tr key={c.id}><th scope="row">{c.label}</th><td><Tag tone={c.pass ? 'ok' : 'bad'}>{c.pass ? 'pass' : 'fail'}</Tag></td><td><Tag tone={c.basis === 'MODELED' ? 'info' : 'muted'}>{c.basis}</Tag></td><td><code>{c.source}</code></td><td>{c.detail}</td></tr>)}</tbody>
      </table></div>
      {(e.verdict === 'SUITS' || e.verdict === 'SUITS_WITH_CONDITION')
        ? <Action id="scout.pick"><p><Button kind="primary" onClick={onPropose} disabled={proposed}>{proposed ? 'Proposed for this room' : 'Propose for the design'}</Button></p></Action>
        : <p className="ui-meta">{e.verdict === 'NOT_REQUIRED' ? 'Not required for this room, so there is nothing to propose.' : 'It does not suit this room, so it cannot be proposed for it.'}</p>}
    </article>
  );
}

/** Standard kits for a kind of room: propose, send to review, decide (another role), publish, mark stale, adopt into a concept. */
function Profiles({ role, room, list }: { role: RoleKey; room: (typeof ROOMS)[number]; list: Evaluation[] }) {
  const [all, setAll] = useState<PF.Profile[]>(loadProfiles); const [note, setNote] = useState<Record<string, string>>({}); const [said, setSaid] = useState('');
  const mayPropose = allows({ action: 'scout.pick' }, role), mayDecide = allows({ action: 'design.decide' }, role);
  const put = (r: PF.Result<PF.Profile>, ok: string) => { if (!r.ok) { setSaid(r.why); return; } const n = all.some((x) => x.id === r.value.id) ? all.map((x) => (x.id === r.value.id ? r.value : x)) : [r.value, ...all]; setAll(n); saveProfiles(n); setSaid(ok); };
  const here = all.filter((p) => p.roomKey === room.key);
  const seq = Math.max(0, ...all.map((p) => Number(p.id.slice(3)) || 0)) + 1;
  return <Card title="Standard kits for this kind of room" sub="Proposed from Scouter’s evaluations; device classes only, no makes or models; nothing is bought or pushed to a device" icon="layers" testId="scouter-profiles">
    {mayPropose ? <p><Button kind="primary" onClick={() => put(PF.propose(room.key, room, list, role, seq), 'Proposed. Send it to engineering review when it is ready.')} testId="scouter-propose-kit">Draft a standard kit for {room.label.toLowerCase()}</Button></p>
      : <p className="ui-meta">{ROLES[role].label} reads the kits; proposing one is for the design roles.</p>}
    <p className="ui-meta" aria-live="polite" data-testid="scouter-pf-said">{said}</p>
    {here.length === 0 ? <p className="ui-meta">No kit proposed for this kind of room yet.</p> : <ul className="plain stack">{here.map((p) => { const st = PF.STATE_LABEL[p.state]; const pr = PF.problems(p); const n = note[p.id] || '';
      return <li key={p.id} className="scouter__kit" data-profile={p.id} data-state={p.state}>
        <p><b>{p.id} · {p.name}</b> <Tag tone={st.tone}>{st.label}{p.version ? ` · v${p.version}` : ''}</Tag> <span className="ui-meta">proposed by {ROLES[p.proposedBy]?.label || p.proposedBy}</span></p>
        <ul>{p.kit.map((k) => <li key={k.key}>{k.count} × {k.label}{k.condition ? <span className="ui-meta"> · condition: {k.condition}</span> : null}</li>)}</ul>
        <p className="ui-meta">{p.basis}. Expected tests: {p.expectedTests.join('; ')}.</p>
        {pr.length > 0 && p.state === 'ENGINEERING_REVIEW' && <Notice tone="warn"><b>For the reviewer:</b> {pr.join(' · ')}</Notice>}
        <div className="scouter__acts">
          {p.state === 'PROPOSED' && mayPropose && <Button onClick={() => put(PF.send(p, role), 'Sent to engineering review.')} testId="scouter-pf-send">Send to engineering review</Button>}
          {(p.state === 'ENGINEERING_REVIEW' || p.state === 'APPROVED' || p.state === 'PUBLISHED') && mayDecide && <label className="scouter__field">{p.state === 'ENGINEERING_REVIEW' ? 'Reason or note' : 'Why it is stale'}<input type="text" value={n} maxLength={200} onChange={(e) => setNote({ ...note, [p.id]: e.target.value })} data-testid="scouter-pf-note" /></label>}
          {p.state === 'ENGINEERING_REVIEW' && mayDecide && <><Button kind="primary" onClick={() => put(PF.review(p, 'approve', role, n), 'Approved.')} testId="scouter-pf-approve">Approve</Button><Button onClick={() => put(PF.review(p, 'reject', role, n), 'Rejected.')} testId="scouter-pf-reject">Reject</Button></>}
          {p.state === 'APPROVED' && mayDecide && <Button kind="primary" onClick={() => put(PF.publish(p, role, all), 'Published.')} testId="scouter-pf-publish">Publish</Button>}
          {(p.state === 'APPROVED' || p.state === 'PUBLISHED') && mayDecide && <Button onClick={() => put(PF.stale(p, role, n), 'Marked stale.')} testId="scouter-pf-stale">Mark stale</Button>}
          {(p.state === 'APPROVED' || p.state === 'PUBLISHED') && allows({ area: 'studio' }, role) && <Button onClick={() => { const k = PF.adoptable(p); if (!k.ok) { setSaid(k.why); return; } const id = adoptIntoStudio(p, k.value, room.dims, room.occ); if (!id) { setSaid('This browser would not keep the concept (storage is blocked).'); return; } put({ ok: true, value: { ...p, adopted: p.adopted + 1 } }, 'Adopted into a new Design a Space concept.'); location.hash = `#/studio/new/saved:${id}`; }} testId="scouter-pf-adopt">Adopt into a concept</Button>}
        </div>
        <details><summary className="ui-meta">History · {p.history.length}</summary><ol className="ui-meta">{p.history.map((h, i) => <li key={i}>{h.at.slice(0, 16).replace('T', ' ')} · {ROLES[h.by]?.label || h.by} · {PF.STATE_LABEL[h.to].label.toLowerCase()}{h.note ? ` · ${h.note}` : ''}</li>)}</ol></details>
      </li>; })}</ul>}
    <p className="ui-meta">The role that proposes a kit cannot decide it: switch to another engineering role to review. Kept in this browser; simulated.</p>
  </Card>;
}
