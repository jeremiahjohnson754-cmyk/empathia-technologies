/**
 * Scouter, inside Lite (D41): pick a room; each of the catalogue's nine device classes is checked against that room's own recorded
 * requirement, and every check names its source and whether it is published or modelled. Address: #/campus/scouter?room=<template>,
 * and #/campus/scouter/<class>?room=<template> for one class's checks.
 */
import { useState } from 'react';
import { Tag, Button, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { Action } from '../access/Gate.js';
import { evaluate, ranked, VERDICT, NOT_REBUILT, type Evaluation } from './evaluate.js';
import { ROOMS, cats, required } from './data.js';
import { ROLES } from '../access/policy.js';

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
