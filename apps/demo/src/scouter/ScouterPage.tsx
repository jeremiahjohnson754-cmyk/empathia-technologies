/**
 * Scouter, inside Lite (D41): pick a room and a category; every candidate is gated, then scored, then ranked, and every score says
 * what it rests on. Address: #/campus/scouter?room=<id>&cat=<category>, and #/campus/scouter/<candidate> for one candidate's evidence.
 */
import { useState } from 'react';
import { Tag, Button, Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { Section, Action } from '../access/Gate.js';
import { evaluate, STATES, CATEGORY_LABEL, DIMS, money, fiveYear, type Category, type Evaluation } from './evaluate.js';
import { ROOMS, REQUIREMENTS, CANDIDATES } from './data.js';
import { ROLES } from '../access/policy.js';

const CATS = Object.keys(CATEGORY_LABEL) as Category[];
const KEY = 'empathia.demo.scouter.v1';
interface Picks { [roomCat: string]: { id: string; by: string } }
const load = (): Picks => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const BASIS_TONE = { MEASURED: 'ok', VERIFIED: 'ok', DECLARED: 'muted', MODELED: 'info', UNKNOWN: 'warn' } as const;

export default function ScouterPage({ role, params, query }: PageProps) {
  const room = ROOMS.find((r) => r.id === query.get('room')) ?? ROOMS[0]!;
  const cat = (CATS as string[]).includes(query.get('cat') || '') ? query.get('cat') as Category : 'camera';
  const [picks, setPicks] = useState<Picks>(load);
  const [asked, setAsked] = useState<string | null>(null);
  const results = evaluate(room, REQUIREMENTS[cat], CANDIDATES);
  const open = results.find((e) => e.candidate.id === params.candidate) ?? null;
  const go = (p: { room?: string; cat?: string; candidate?: string | null }) => {
    const q = new URLSearchParams({ room: p.room ?? room.id, cat: p.cat ?? cat });
    location.hash = `#/campus/scouter${p.candidate ? `/${encodeURIComponent(p.candidate)}` : ''}?${q}`;
  };
  const pick = (e: Evaluation) => { const next = { ...picks, [`${room.id}:${cat}`]: { id: e.candidate.id, by: ROLES[role].label } }; setPicks(next); try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* the choice lasts the page */ } };
  const chosen = picks[`${room.id}:${cat}`];
  return (
    <section className="scouter" aria-labelledby="scouter-h">
      <p className="kicker product-kicker" data-product="lite">Lite · Scouter</p>
      <h1 id="scouter-h">Which device for this room?</h1>
      <p className="lead">Every candidate passes the hard gates first — lifecycle, room type, ports, power, must-haves, budget — and only then is scored on fifteen dimensions. A dimension without a score is left out and the coverage says so; spatial fit is modelled from the room, never measured.</p>
      <p className="ui-meta">Acting as {ROLES[role].label}. Synthetic candidates and rooms.</p>
      <form className="scouter__pick" onSubmit={(e) => e.preventDefault()}>
        <label className="scouter__field">Room
          <select value={room.id} onChange={(e) => go({ room: e.target.value })}>{ROOMS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </label>
        <fieldset className="scouter__cats"><legend>Category</legend>
          {CATS.map((c) => <label key={c} className={`scouter__cat${c === cat ? ' on' : ''}`}><input type="radio" name="scouter-cat" value={c} checked={c === cat} onChange={() => go({ cat: c })} />{CATEGORY_LABEL[c]}</label>)}
        </fieldset>
      </form>
      <p className="ui-meta">{room.name}: {room.seats} seats, {room.lengthM} × {room.widthM} m, {room.freePorts} free ports, {room.poeBudgetW} W of network power left{room.pilotPlan ? ', pilot plan in place' : ''}. Must-haves: {REQUIREMENTS[cat].mustHave.map((m) => `${DIMS.find((d) => d[0] === m.dim)![1]} ≥ ${m.min}`).join(', ')}; unit budget {money(REQUIREMENTS[cat].budget)}.</p>
      {chosen && <Notice tone="ok"><b>Chosen for this room:</b> {CANDIDATES.find((c) => c.id === chosen.id)?.model} — by {chosen.by}, in this browser only (synthetic).</Notice>}
      <ol className="scouter__list" aria-label={`${CATEGORY_LABEL[cat]} candidates for ${room.name}`}>
        {results.map((e) => (
          <li key={e.candidate.id} className={`scouter__row${e.eligible ? '' : ' scouter__row--out'}${open?.candidate.id === e.candidate.id ? ' on' : ''}`}>
            <div className="scouter__rank" aria-hidden="true">{e.rank ?? '—'}</div>
            <div className="scouter__main">
              <a href={`#/campus/scouter/${encodeURIComponent(e.candidate.id)}?room=${room.id}&cat=${cat}`} className="scouter__name"><b>{e.candidate.brand} {e.candidate.model}</b></a>
              <span className="scouter__tags"><Tag tone={STATES[e.candidate.state].tone}>{STATES[e.candidate.state].label}</Tag>{e.eligible ? <Tag tone="ok">rank {e.rank}</Tag> : <Tag tone="bad">not eligible</Tag>}</span>
              <p className="scouter__why">{e.eligible ? `All ${e.gates.length} gates met.` : e.gates.filter((g) => !g.met).map((g) => `${g.label}: ${g.why}`).join(' ')}</p>
            </div>
            <div className="scouter__score"><b>{e.score == null ? 'no score' : e.score}</b><span>{Math.round(e.coverage * 100)}% of the weight · {e.confidence} confidence</span></div>
          </li>
        ))}
      </ol>
      {open && <Detail e={open} roomName={room.name} chosen={chosen?.id === open.candidate.id} onPick={() => pick(open)} onVerify={(dim) => setAsked(`${open.candidate.model}: ${dim}`)} onClose={() => go({ candidate: null })} />}
      {asked && <p role="status" className="ui-meta">Verification requested for {asked}. The score keeps its basis until a reviewer has checked it. Synthetic.</p>}
    </section>
  );
}

function Detail({ e, roomName, chosen, onPick, onVerify, onClose }: { e: Evaluation; roomName: string; chosen: boolean; onPick: () => void; onVerify: (dim: string) => void; onClose: () => void }) {
  const c = e.candidate;
  return (
    <article className="scouter__detail" aria-labelledby="scouter-d">
      <header className="scouter__dhead"><h2 id="scouter-d">{c.brand} {c.model}</h2><Button small kind="quiet" onClick={onClose}>Close</Button></header>
      <p className="ui-meta">{CATEGORY_LABEL[c.category]} · {STATES[c.state].meaning}{c.condition ? ` Condition: ${c.condition.text}.` : ''}</p>
      <h3>Gates for {roomName}</h3>
      <ul className="scouter__gates">{e.gates.map((g) => <li key={g.id}><Tag tone={g.met ? 'ok' : 'bad'}>{g.met ? 'met' : 'not met'}</Tag> <b>{g.label}.</b> {g.why}</li>)}</ul>
      <div className="ui-table-wrap"><table className="ui-table">
        <caption className="ui-sr">Scores by dimension, with the basis of each</caption>
        <thead><tr><th scope="col">Dimension</th><th scope="col">Weight</th><th scope="col">Score</th><th scope="col">Basis</th><th scope="col">Why</th></tr></thead>
        <tbody>{e.dims.map((d) => <tr key={d.dim}><th scope="row">{d.label}</th><td>{d.weight}</td><td>{d.value ?? '—'}</td><td><Tag tone={BASIS_TONE[d.basis]}>{d.basis}</Tag></td><td>{d.note}{d.basis === 'DECLARED' && <Action id="scout.verify"> <Button small kind="quiet" onClick={() => onVerify(d.label)}>Verify</Button></Action>}</td></tr>)}</tbody>
      </table></div>
      <Section id="scouter.cost"><h3>Cost of ownership</h3><p>Unit {money(c.unitCost)}, installation {money(c.install)}, five years of running {money(c.run5y)}: <b>{money(fiveYear(c))}</b> over five years (modelled).</p></Section>
      <Section id="scouter.evidence"><h3>In this estate</h3><p>{c.installed ? `${c.installed.units} units installed; ${c.installed.incidents12m} incidents in the last 12 months.` : 'Not installed anywhere on the campus yet: no operational evidence.'}</p></Section>
      {e.eligible
        ? <Action id="scout.pick"><p><Button kind="primary" onClick={onPick} disabled={chosen}>{chosen ? 'Chosen for this room' : 'Choose for the design'}</Button></p></Action>
        : <p className="ui-meta">Not eligible here, so it cannot be chosen for this room.</p>}
    </article>
  );
}
