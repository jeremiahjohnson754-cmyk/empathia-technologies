/**
 * A SIGNAL meltdown, drawn on the rules in meltdown.ts: the mission brief and Start; for Season 12 the year first (choices within a
 * budget and political capital); then the dependency map, the critical services' dark time, the objectives, the actions and two holds,
 * a calculation card, and the log; at the end the outcome, the grade, the score grid and the after-action review.
 * The story clock runs `rate` story-seconds per real second (half when relaxed; with the clock off it moves only with actions and
 * holds), in quarter-second ticks, paused by ⏸, when the card scrolls off screen, or when the page is hidden. SVG attributes only.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from './components.js';
import * as MD from './meltdown.js';

const fmt = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
type Props = { M: MD.Meltdown; factor?: number; resMet?: MD.ResMet; resWhy?: (req: unknown) => string; onEnd?: (state: MD.MState) => void; heading?: 'h2' | 'h4' };

export function MeltdownRunner(p: Props) { const [round, setRound] = useState(0); return <Inner key={round} {...p} again={() => setRound((r) => r + 1)} />; }
function Inner({ M, factor = 1, resMet = () => true, resWhy = () => '', onEnd, heading = 'h2', again }: Props & { again: () => void }) {
  const [phase, setPhase] = useState<'brief' | 'year' | 'run'>('brief'); const [year, setYear] = useState<string[]>([]);
  const [S, setS] = useState<MD.MState | null>(null); const [paused, setPaused] = useState(false); const [sel, setSel] = useState<string | null>(null);
  const [calc, setCalc] = useState<{ a: MD.MAction; v: string; tries: number; msg: string } | null>(null);
  const box = useRef<HTMLElement>(null); const seen = useRef(true); const reported = useRef<MD.MState | null>(null);
  const rate = factor ? M.rate / (factor === 2 ? 2 : 1) : 0;
  useEffect(() => { const el = box.current; if (!el || typeof IntersectionObserver === 'undefined') return undefined; const io = new IntersectionObserver((es) => { for (const e of es) seen.current = e.isIntersecting; }, { threshold: 0 }); io.observe(el); return () => io.disconnect(); }, []);
  useEffect(() => { if (phase !== 'run' || !rate || !S || S.over) return undefined; let acc = 0;
    const id = setInterval(() => { if (paused || !seen.current || (typeof document !== 'undefined' && document.hidden)) return; acc += rate / 4; const whole = Math.floor(acc); acc -= whole; if (whole) setS((s) => (s ? MD.advance(M, s, whole) : s)); }, 250);
    return () => clearInterval(id); }, [phase, rate, paused, S?.over, M]);
  useEffect(() => { if (S?.end && reported.current !== S) { reported.current = S; onEnd?.(S); } });
  const start = (y: string[]) => { setYear(y); setS(MD.begin(M, y, resMet)); setPhase('run'); };
  const crit = M.nodes.filter((n) => n.crit); const H = heading;
  const title = H === 'h2' ? <h2 className="build__h">{M.title}</h2> : <h4 className="build__h">{M.title}</h4>;
  return (
    <article ref={box} className="stack md" data-testid="meltdown" data-meltdown={M.id} data-state={S?.end ? S.end.outcome : phase}>
      <p className="lab__k">☢ Meltdown · mission-critical · {M.kicker || 'boss'}</p>{title}<p>{M.brief}</p>
      {phase === 'brief' && <div className="md__brief"><p className="lab__k">Mission</p><ul className="in__list">{crit.map((n) => <li key={n.id}>★ {n.label} — dark for more than {fmt(n.maxDown || 0)} in total fails the mission.</li>)}{M.objectives.filter((o) => o.crit).map((o) => <li key={o.id}>★ {o.label} (when it comes up, you have {fmt(o.by - o.at)}).</li>)}</ul>
        <p className="lab__k">Rules of the night</p><ul className="in__list"><li>{rate ? `The clock is story time: it runs by itself (${rate} story-seconds per real second), and every action spends it.` : 'The clock is story time; with the clock off it moves only when you act or hold, and every action spends it.'}</li><li>Anything whose inputs fail degrades, then goes down — and takes its dependents with it. Watch the map.</li><li>🔒 marks a system that belongs to someone else. You can ask. You never touch.</li><li>It pauses when it scrolls off screen. The ⏸ button pauses it too.</li></ul>
        {M.note && <p className="ui-meta">{M.note}</p>}<p><Button kind="primary" onClick={() => (M.turns ? setPhase('year') : start([]))}>▶ Start the meltdown</Button></p></div>}
      {phase === 'year' && M.turns && <Year M={M} onLock={start} />}
      {phase === 'run' && S && <Run M={M} S={S} setS={setS} rate={rate} paused={paused} setPaused={setPaused} sel={sel} setSel={setSel} calc={calc} setCalc={setCalc} resMet={resMet} resWhy={resWhy} year={year} again={again} />}
    </article>
  );
}

function Year({ M, onLock }: { M: MD.Meltdown; onLock: (y: string[]) => void }) {
  const T = M.turns!; const [picked, setPicked] = useState<string[]>([]); const cost = (k: 'cost' | 'capital') => picked.reduce((t, id) => t + (T.choices.find((c) => c.id === id)![k] || 0), 0);
  const money = (v: number) => `${T.pre != null ? T.pre : T.unit || ''}${v}${T.suf || ''}`;
  return <div className="md__year" data-testid="meltdown-year"><p className="lab__k">Phase 1 · {T.title || 'The year'}</p>{T.intro && <p>{T.intro}</p>}
    <p aria-live="polite" data-testid="meltdown-year-meter">Budget left {money(T.budget - cost('cost'))} of {money(T.budget)} · political capital left {T.capital - cost('capital')} of {T.capital} · {picked.length} chosen</p>
    <div className="in__acts">{T.choices.map((c) => { const on = picked.includes(c.id); const can = on || (cost('cost') + (c.cost || 0) <= T.budget && cost('capital') + (c.capital || 0) <= T.capital);
      return <button key={c.id} type="button" className="in__act" aria-pressed={on} data-turn={c.id} disabled={!can} onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}><span>{on ? '✓ ' : ''}{c.label}</span><span className="ui-meta">{money(c.cost || 0)} · ◆ {c.capital || 0} capital{c.from ? ` · ${c.from}` : ''}</span></button>; })}</div>
    <p><Button kind="primary" onClick={() => onLock(picked)}>{T.lockLabel || '▶ Lock the year and start phase 2'}</Button></p></div>;
}

function Run({ M, S, setS, rate, paused, setPaused, sel, setSel, calc, setCalc, resMet, resWhy, year, again }: { M: MD.Meltdown; S: MD.MState; setS: (s: MD.MState) => void; rate: number; paused: boolean; setPaused: (b: boolean) => void; sel: string | null; setSel: (s: string | null) => void;
  calc: { a: MD.MAction; v: string; tries: number; msg: string } | null; setCalc: (c: { a: MD.MAction; v: string; tries: number; msg: string } | null) => void; resMet: MD.ResMet; resWhy: (r: unknown) => string; year: string[]; again: () => void }) {
  const crit = M.nodes.filter((n) => n.crit); const rows = Math.max(...M.nodes.map((n) => n.row)) + 1, cols = Math.max(...M.nodes.map((n) => n.col)) + 1;
  const W = 14 + cols * 206, Hh = 16 + rows * 84, bw = 164, bh = 60, X = (n: MD.MNode) => 14 + n.col * 206, Y = (n: MD.MNode) => 12 + n.row * 84;
  const submit = () => { if (!calc) return; const v = Number(calc.v.replace(',', '.')); if (calc.v.trim() === '' || !Number.isFinite(v)) { setCalc({ ...calc, msg: 'Enter a number.' }); return; }
    const r = MD.answerCalc(M, S, calc.a, v, resMet); setS(r.state); if (r.right) setCalc(null); else { const tries = calc.tries + 1; setCalc({ ...calc, tries, msg: `✕ Not right. ${tries >= 2 ? 'The equation is shown below.' : 'Put the numbers into the formula.'} That cost ${calc.a.calc!.penalty || 20} seconds.` }); } };
  const objState = (o: MD.Meltdown['objectives'][number]) => (S.flags[o.flag] ? 'done' : S.obj[o.id] === 'missed' ? 'missed' : S.t >= o.at ? 'open' : 'later');
  const node = sel ? M.nodes.find((n) => n.id === sel) : null;
  return <>
    <div className="md__hud"><p className="md__clock" data-testid="meltdown-clock" role="timer" aria-live="off"><b>{MD.clockAt(M, S.t)}</b><span>{paused ? 'paused · ' : rate ? '' : 'clock off · moves with your actions · '}ends {MD.clockAt(M, M.budget)} · {M.endLabel || 'hold until then'}</span></p>
      {rate > 0 && !S.over && <Button onClick={() => setPaused(!paused)}>{paused ? '▶ Resume' : '⏸ Pause'}</Button>}</div>
    <ul className="md__crits" data-testid="meltdown-crits">{crit.map((n) => { const pct = Math.min(1, S.dark[n.id]! / (n.maxDown || 1)); return <li key={n.id} data-band={pct > 0.66 ? 'bad' : pct > 0.33 ? 'warn' : 'ok'}><span>★ {n.label} · {MD.STATE_WORD[S.n[n.id]!.state]}</span><svg className="lab__meter" viewBox="0 0 200 10" role="img" aria-label={`${n.label} dark ${fmt(S.dark[n.id]!)} of ${fmt(n.maxDown || 0)}`}><rect className="lab__meter-bg" x="0" y="0" width="200" height="10" rx="3" /><rect className="md__dark" x="0" y="0" width={pct * 200} height="10" rx="3" /></svg><span className="lab__lvl">{fmt(Math.round(S.dark[n.id]!))} / {fmt(n.maxDown || 0)} dark</span></li>; })}</ul>
    {M.objectives.some((o) => objState(o) !== 'later') && <ul className="md__objs">{M.objectives.filter((o) => objState(o) !== 'later').map((o) => { const st = objState(o); return <li key={o.id} data-state={st}>{st === 'done' ? '✓' : st === 'missed' ? '✕' : '◆'} {o.crit ? '★ ' : ''}{o.label} <span className="ui-meta">{st === 'open' ? `${fmt(Math.max(0, o.by - S.t))} left` : st}</span></li>; })}</ul>}
    <div className="md__map" data-testid="meltdown-map"><svg viewBox={`0 0 ${W} ${Hh}`} className="md__svg" role="group" aria-label="Dependency map: tap a box for what feeds it and who owns it">
      {M.nodes.flatMap((n) => S.n[n.id]!.deps.flatMap((g) => g.map((d) => { const a = M.nodes.find((x) => x.id === d); if (!a) return null; let x1 = X(a) + bw, y1 = Y(a) + bh / 2, x2 = X(n), y2 = Y(n) + bh / 2; if (a.col === n.col) { x1 = X(a) + bw / 2; y1 = Y(a) + (a.row < n.row ? bh : 0); x2 = X(n) + bw / 2; y2 = Y(n) + (a.row < n.row ? 0 : bh); }
        return <path key={`${d}-${n.id}`} className="md__edge" data-state={S.n[d]!.state} d={`M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`} />; })))}
      {M.nodes.map((n) => { const st = S.n[n.id]!.state; return <g key={n.id} className="md__node" data-state={st} data-node={n.id} role="button" tabIndex={0} aria-pressed={sel === n.id} aria-label={`${n.label}: ${MD.STATE_WORD[st]}${n.crit ? ', mission-critical' : ''}${n.owner ? `, belongs to ${n.owner}` : ''}`} onClick={() => setSel(sel === n.id ? null : n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(sel === n.id ? null : n.id); } }}>
        <rect x={X(n)} y={Y(n)} width={bw} height={bh} rx="8" /><text x={X(n) + 10} y={Y(n) + 24}>{n.crit ? '★ ' : ''}{n.owner ? '🔒 ' : ''}{n.label.length > 20 ? `${n.label.slice(0, 19)}…` : n.label}</text><text className="md__st" x={X(n) + 10} y={Y(n) + 46}>{MD.STATE_WORD[st]}</text></g>; })}
    </svg></div>
    <div className="md__detail" aria-live="polite">{node ? <div className="in__card"><p><b>{node.label} · {MD.STATE_WORD[S.n[node.id]!.state]}</b></p>{node.sub && <p className="ui-meta">{node.sub}</p>}
      <p>{S.n[node.id]!.deps.length ? `Fed by: ${S.n[node.id]!.deps.map((g) => g.map((d) => `${MD.nodeLabel(M, d)} (${MD.STATE_WORD[S.n[d]!.state]})`).join(' or ')).join(' AND ')}` : 'Fed by: nothing upstream on this map.'}</p>
      {node.owner && <p>🔒 Belongs to {node.owner}. Ask; never touch.</p>}{node.crit && <p>★ Mission-critical · dark so far {fmt(Math.round(S.dark[node.id]!))} of {fmt(node.maxDown || 0)}</p>}{S.n[node.id]!.nores && <p>Not available: {S.n[node.id]!.nores}.</p>}{node.note && <p className="ui-meta">{node.note}</p>}</div>
      : <p className="ui-meta">Select a box on the map to see what feeds it, who owns it and what it’s telling you.</p>}</div>
    {!S.over && <><p className="lab__k">Actions · {MD.clockAt(M, S.t)}{paused ? ' · paused' : ''}</p><div className="in__acts" data-testid="meltdown-actions">{MD.visible(M, S).map((a) => <button key={a.id} type="button" className="in__act" data-action={a.id} disabled={!MD.available(a, S, resMet)} onClick={() => (a.calc ? setCalc({ a, v: '', tries: 0, msg: '' }) : setS(MD.act(M, S, a, resMet)))}>
      <span>{a.label}</span><span className="ui-meta">⏱ {a.cost ? `${a.cost} s` : 'instant'}{a.calc ? ' · calculate' : ''}{a.self ? ' · Maya steps in' : ''}{(a.badges || []).map((b) => ` · ${b[1]}`).join('')}{a.res && !resMet(a.res) ? ` · 🔒 ${resWhy(a.res)}` : ''}</span></button>)}
      {S.t < M.budget && MD.HOLDS.map(([s, l]) => <button key={s} type="button" className="in__act md__hold" data-hold={s} onClick={() => setS(MD.hold(M, S, s))}><span>{l}</span><span className="ui-meta">⏱ {s} s</span></button>)}</div></>}
    {calc && !S.over && <div className="in__card" role="group" aria-label="Work it out" data-testid="meltdown-calc"><p className="in__k">🧮 {calc.a.label}</p><p>{calc.a.calc!.q}</p><p className="ui-meta">The story clock keeps running while you work.</p>
      <p className="in__calc"><input className="in__input" inputMode="decimal" aria-label={calc.a.calc!.q} value={calc.v} onChange={(e) => setCalc({ ...calc, v: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />{calc.a.calc!.unit && <span>{calc.a.calc!.unit}</span>}<Button kind="primary" onClick={submit}>Submit</Button><Button onClick={() => setCalc(null)}>Cancel</Button></p>
      {calc.msg && <p aria-live="polite">{calc.msg}</p>}{calc.tries >= 2 && calc.a.calc!.hint && <p className="in__eq">{calc.a.calc!.hint}</p>}</div>}
    {S.end && <Debrief M={M} S={S} year={year} again={again} />}
    <div className="in__card"><p className="in__k">Log</p><ol className="in__log" reversed aria-label="Meltdown log">{S.log.slice().reverse().map((l, i) => <li key={S.log.length - i} data-tone={l.tone}><span className="in__t">[{MD.clockAt(M, l.t)}]</span> {l.text}</li>)}</ol></div>
  </>;
}

function Debrief({ M, S, year, again }: { M: MD.Meltdown; S: MD.MState; year: string[]; again: () => void }) {
  const e = S.end!; const crit = M.nodes.filter((n) => n.crit); const proven = (M.win.proven || []).every((f) => S.flags[f]);
  const lessons = M.actions.filter((a) => S.used[a.id] && a.why).map((a) => `${a.good ? '✓' : '✕'} ${a.label} — ${a.why}`);
  const missed = M.actions.filter((a) => a.good && !S.used[a.id]).map((a) => a.label);
  const turn = Object.fromEntries((M.turns?.choices || []).map((c) => [c.id, c.label]));
  return <div className="in__card in__end" data-testid="meltdown-end" data-outcome={e.outcome} data-grade={e.grade}><p className="in__out"><b>{e.head}</b></p><p>{e.text}</p>
    <p className="md__grade" data-testid="meltdown-grade">Meltdown rating {e.grade} — {M.gradeText?.[e.grade] || MD.GRADE_TEXT[e.grade]}</p>
    <dl className="in__score"><div><dt>Mission</dt><dd>{e.outcome === 'fail' ? 'Failed' : 'Held'}</dd></div><div><dt>Proof</dt><dd>{proven ? 'Proven' : 'Unproven'}</dd></div><div><dt>Dark time</dt><dd>{crit.map((n) => fmt(Math.round(S.dark[n.id]!))).join(' · ')}</dd></div>
      {M.inherit ? <div><dt>Without Maya</dt><dd>{e.without} / {e.threatTotal}{S.self ? ` · Maya stepped in ×${S.self}` : ''}</dd></div> : <div><dt>Extras</dt><dd>{e.extras} / {e.extraMax}</dd></div>}
      <div><dt>Boundaries</dt><dd>{S.boundary ? 'crossed' : S.stops ? `${S.stops} refused` : 'held'}</dd></div><div><dt>Story time</dt><dd>{MD.clockAt(M, S.t)}</dd></div></dl>
    <p className="in__k">After-action review</p>
    {S.chain.length ? <><p><b>What cascaded</b></p><ol className="in__list">{S.chain.slice(0, 14).map((c, i) => <li key={i}>{MD.clockAt(M, c.t)} — {c.node} went {MD.STATE_WORD[c.to].toLowerCase()}{c.from ? `, because ${c.from} failed it` : ''}</li>)}</ol></> : <p>Nothing cascaded. Every fault stayed where it started.</p>}
    {M.inherit && (M.threats || []).length > 0 && <><p><b>The year, tested</b></p><ul className="in__list">{(M.threats || []).map((t) => { const st = S.threat[t.id] || (S.threatOn[t.id] ? 'lost' : null); return <li key={t.id}>{st === 'prevented' || st === 'saved' ? '✓' : st === 'maya' ? '✈' : st === 'lost' ? '✕' : '·'} {t.label} — {st === 'prevented' ? t.prevented : st === 'saved' ? t.saved : st === 'maya' ? 'Maya stepped in from the plane. It worked — and it cost the team a chance to prove it could.' : st === 'lost' ? t.lost : 'It never came up.'}</li>; })}</ul>
      <p><b>Your year</b></p>{year.length ? <ul className="in__list">{year.map((y) => <li key={y}>{turn[y] || y}</li>)}</ul> : <p>You chose nothing in the year — the town hall ran on what was left.</p>}</>}
    {lessons.length > 0 && <><p><b>Why your moves mattered</b></p><ul className="in__list">{lessons.map((l) => <li key={l}>{l}</li>)}</ul></>}
    {missed.length > 0 && e.outcome !== 'proven' && <><p><b>Moves you never made</b></p><ul className="in__list">{missed.map((l) => <li key={l}>{l}</li>)}</ul></>}
    <p><b>An expert’s order of operations</b></p><ol className="in__list">{M.expert.map((x) => <li key={x}>{x}</li>)}</ol>
    <p><Button onClick={again}>↺ Run the meltdown again</Button></p></div>;
}
