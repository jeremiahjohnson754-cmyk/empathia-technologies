/**
 * #/connected — one room followed through every product ON THE SERVER (ADR-0013; founder, 17 Nov 2026: "someone could inspect a
 * device, update its field record, complete a commissioning workflow, switch roles, and observe the same durable history through
 * ServiceHands, Assurance, and APEX — even in a fresh browser session").
 *
 * The visitor opens a sandbox (a synthetic tenant of their own on the enterprise API) and takes its room through the journey in
 * connected/journey.ts. Each step is a request made as the person whose work it is; made as anyone else, the server refuses it and its
 * own words are shown. Nothing on this page is kept in the browser except the sandbox's id and key: the thread, the field record and the
 * audit history are read from the server every time, so the same sandbox opened elsewhere with its resume code is the same record.
 *
 * A build without DEMO_API_URL names no server; the page then says so and points at the browser-resident thread.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';
import { STEPS, TRY_ROLES, ROLE_LABEL, Refused, load, nextStep, progress, issuesOf, wosOf, registerOf, fieldOf, type State, type Step } from '../connected/journey.js';

type Said = { ok: boolean; title: string; text: string; reasons?: string[] };
const short = (h: string) => (h ? `${h.slice(0, 12)}…` : '');
const when = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };
const label = (r: string) => ROLE_LABEL[r] || r;
const tone = (x: string): 'ok' | 'warn' | 'bad' | 'muted' => (/VERIFIED|CLOSED|RESOLVED|APPROVED|CURRENT|ACCEPTED|ALLOWED|pass/.test(x) ? 'ok' : /DENIED|FAIL|REJECTED/.test(x) ? 'bad' : /OPEN|PROPOSED|PENDING|PROGRESS|VERIFYING|COMMISSIONING|UNVERIFIED|TRIAGED|ASSIGNED/.test(x) ? 'warn' : 'muted');

export function ConnectedPage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [state, setState] = useState<State | null>(null); const [busy, setBusy] = useState<string | null>(null); const [said, setSaid] = useState<Said | null>(null);
  const [tryAs, setTryAs] = useState('designer'); const [code, setCode] = useState(''); const [confirmReset, setConfirmReset] = useState(false); const [copied, setCopied] = useState(false);
  const alive = useRef(true); useEffect(() => () => { alive.current = false; }, []);

  const gone = useCallback((e: unknown) => { if (e instanceof SandboxGone) { setSb(null); setState(null); setSaid({ ok: false, title: 'The sandbox is no longer there.', text: `${e.message}. Open a new one to continue.` }); return true; } return false; }, []);
  const refresh = useCallback(async (box: Sandbox | null = c.sandbox()): Promise<State | null> => {
    if (!box) { setState(null); return null; }
    try { const r = await load(c, box.room); if (!alive.current) return null; if (r.state) setState(r.state); else if (r.refused) setSaid({ ok: false, title: `The server answered ${r.refused.status}.`, text: r.refused.detail }); return r.state; }
    catch (e) { if (!gone(e)) setSaid(e instanceof TypeError ? { ok: false, title: 'The server cannot be reached.', text: 'Nothing can be read or recorded until it answers. What is shown below is what it held when it last answered.' } : { ok: false, title: 'The server did not answer.', text: (e as Error).message }); return null; }
  }, [c, gone]);

  // Interruptions (founder, 17 Nov 2026: "Make sure the browser explains what's happening instead of presenting an apparent failure").
  // waiting: a request has been out for more than five seconds (a server that slept is starting). offline: the browser says it has no
  // network. unknown: a step whose answer was lost and whose record could not be read back yet. Nothing is assumed about such a step:
  // the page reads the server's record as soon as it can and says what it holds. A request is never sent again on its own.
  const [waiting, setWaiting] = useState(false); const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false); const [unknown, setUnknown] = useState<string | null>(null);
  useEffect(() => { if (!busy) { setWaiting(false); return undefined; } const t = setTimeout(() => setWaiting(true), 5000); return () => clearTimeout(t); }, [busy]);
  // Asking can take a while and that is not a fault: a server that sleeps when idle answers its first request only once it has started.
  // The page keeps the one request open and, after five seconds, says what it is waiting for. If no answer comes at all, it offers to ask again.
  const [waited, setWaited] = useState(false);
  const ask = useCallback(async () => { setAvail(null); setWaited(false); const a = await c.availability(); if (!alive.current) return; setAvail(a); if (a.enabled && c.sandbox()) await refresh(); }, [c, refresh]);
  useEffect(() => { void ask(); }, [ask]);
  useEffect(() => { if (avail) return undefined; const t = setTimeout(() => setWaited(true), 5000); return () => clearTimeout(t); }, [avail]);

  const act = async (what: string, fn: () => Promise<void>) => { setBusy(what); setSaid(null); try { await fn(); } catch (e) { if (!gone(e)) setSaid(e instanceof TypeError ? { ok: false, title: 'The server could not be reached.', text: 'Nothing was changed. Try again when the connection is back.' } : { ok: false, title: 'That did not go through.', text: (e as Error).message }); } finally { if (alive.current) setBusy(null); } };
  const reread = useCallback(() => act('Reading the server…', async () => { const after = await refresh(); if (after) { setSaid({ ok: true, title: 'Read from the server just now.', text: unknown ? `Everything below is what the server holds. “${unknown}” is ${STEPS.find((x) => x.title === unknown)?.done(after) ? 'on its record: it was recorded once and was not sent again' : 'not on its record: do it again when you are ready'}.` : 'Everything below is what the server holds.' }); setUnknown(null); } }),
    [refresh, unknown]);
  useEffect(() => { const off = () => setOffline(true); const on = () => { setOffline(false); if (c.sandbox()) void reread(); else void ask(); };
    window.addEventListener('offline', off); window.addEventListener('online', on); return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); }; }, [c, reread, ask]);
  const openBox = () => act('Opening your sandbox…', async () => { const a = await c.open(); if (!a.ok || !a.body) { setSaid({ ok: false, title: `The server answered ${a.status}.`, text: a.detail }); return; } setSb(a.body); await refresh(a.body); setSaid({ ok: true, title: 'Your sandbox is open.', text: `${a.body.tenant}: a synthetic organization of your own, with one installed room. Keep the resume code to come back to it.` }); });
  const resume = () => act('Finding your sandbox…', async () => { const a = await c.resume(code); if (!a.ok || !a.body) { setSaid({ ok: false, title: 'That code did not open a sandbox.', text: a.detail }); return; } setSb(a.body); setCode(''); await refresh(a.body); setSaid({ ok: true, title: 'Welcome back.', text: `${a.body.tenant} is as it was left: everything below was read from the server just now.` }); });
  const reset = () => act('Resetting…', async () => { setConfirmReset(false); const a = await c.reset(); if (!a.ok || !a.body) { setSaid({ ok: false, title: `The server answered ${a.status}.`, text: a.detail }); return; } setSb(a.body); await refresh(a.body); setSaid({ ok: true, title: 'A new sandbox.', text: `${a.body.tenant} replaces the old one. The old one is closed: its sessions and its key stopped at once, and its records are kept on the server, unreachable.` }); });
  const forget = () => { c.forget(); setSb(null); setState(null); setSaid({ ok: true, title: 'Forgotten in this browser.', text: 'The sandbox stays on the server until it expires. Its resume code would still open it.' }); };
  const copy = async () => { try { await navigator.clipboard.writeText(c.code()); setCopied(true); setTimeout(() => alive.current && setCopied(false), 2000); } catch { setCopied(false); } };

  /** Run one step as `role`. Returns the state after it, or null when it was refused or failed. */
  const runStep = async (step: Step, role: string, s: State): Promise<State | null> => {
    try { const text = await step.run(c, s, role, sb!.room); const after = await refresh(); setSaid({ ok: true, title: `Done as the ${label(role)}.`, text }); return after; }
    catch (e) {
      if (gone(e)) return null;
      if (e instanceof Refused) { await refresh(); setSaid({ ok: false, title: `Refused by the server (${e.answer.status}) — asked as the ${label(role)} to ${e.what}.`, text: e.answer.detail, reasons: e.answer.reasons.slice(1) }); return null; }
      if (e instanceof TypeError) {
        // The request may or may not have reached the server before the connection failed. The record is read again and the page says what it holds.
        const after = await refresh();
        if (after) { const kept = step.done(after); setUnknown(null);
          setSaid(kept ? { ok: true, title: 'The answer was lost on the way back, but the step is on the server’s record.', text: `“${step.title}” was recorded once. It was not sent again.` } : { ok: false, title: 'The request did not reach the server.', text: `“${step.title}” is not on the server’s record. Do it again when you are ready: the step starts from what the server holds.` });
          return kept ? after : null; }
        setUnknown(step.title); setSaid({ ok: false, title: 'The connection to the server was lost.', text: `It is not known yet whether “${step.title}” was recorded. Nothing is assumed: when the server answers, this page reads its record and shows what it holds.` }); return null;
      }
      setSaid({ ok: false, title: 'That did not go through.', text: (e as Error).message }); return null;
    }
  };
  const run = (step: Step, role: string) => { if (state) void act(`${step.title}…`, async () => { await runStep(step, role, state); }); };
  const runAll = () => { if (state) void act('Running the remaining steps, each as its own person…', async () => { let s: State | null = state; for (let n = 0; s && n < STEPS.length + 2; n += 1) { const st = nextStep(s); if (!st) break; setBusy(`${st.title}… (as the ${label(st.role)})`); s = await runStep(st, st.role, s); } }); };

  const next = state ? nextStep(state) : null; const prog = state ? progress(state) : null; const t = state?.thread;
  const blocked = next && state ? next.ready(state) : null;
  return (
    <section className="wk san th cn" data-native="workspace" data-testid="connected" data-state={!avail ? 'checking' : !avail.configured ? 'unconfigured' : !avail.enabled ? 'unavailable' : sb ? 'sandbox' : 'ready'} data-complete={t?.complete ? 'yes' : 'no'}>
      <PageHero product="commissioning" icon="route" eyebrow="Server-backed" title="One room, end to end, on the server"
        lede={<>The same journey as the browser’s thread, with the records kept by the enterprise API in a database. You open a sandbox, a synthetic organization of your own, and take its room from the field record to an APEX case. Each step is made as the person whose work it is; made as anyone else, the server refuses it. Synthetic data; a demonstration of the product’s authorization, not production security.</>} />

      <Card icon="shield" title="Connection" sub={c.configured ? `Server ${c.origin}` : 'No server in this build'} testId="cn-connection">
        {!avail ? <p className="ui-muted" role="status" data-testid="cn-asking" data-waited={waited ? 'long' : 'short'}>{waited ? 'The server has not answered yet. One that has been idle can take about a minute to start. Still asking; there is nothing you need to do.' : 'Asking the server…'}</p>
          : !avail.configured ? <Notice tone="info"><b>This build of the demonstration is not connected to a server.</b> Its records are kept in your browser. The same journey, browser-resident, is at <a href="#/thread">One room, end to end</a>.</Notice>
          : !avail.enabled ? <><Notice tone="warn"><b>{avail.reachable ? 'The server is not offering sandboxes.' : 'The server did not answer.'}</b> {avail.reason}. The browser-resident journey is at <a href="#/thread">One room, end to end</a>.</Notice>
            <p className="build__row"><button type="button" className="ui-btn ui-btn--sm" data-testid="cn-ask-again" onClick={() => { void ask(); }}>Ask again</button></p></>
          : !sb ? <>
            <p>{avail.notice}</p>
            <p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid="cn-open" disabled={!!busy} onClick={openBox}>Open my sandbox</button> <span className="ui-muted">{avail.live} of {avail.maxLive} in use · a sandbox lasts {avail.ttlHours} hours</span></p>
            <form className="build__row" onSubmit={(e) => { e.preventDefault(); resume(); }}><label className="kit-field cn__code">I have a resume code <input type="text" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} data-testid="cn-resume-code" placeholder="sandbox id . key" /></label> <button type="submit" className="ui-btn ui-btn--sm" data-testid="cn-resume" disabled={!!busy || !code.trim()}>Resume</button></form>
          </> : <>
            <dl className="san__defs">
              <div><dt>Sandbox</dt><dd><span className="ui-mono" data-testid="cn-tenant">{sb.tenant}</span> <Tag tone="muted">synthetic</Tag></dd></div>
              <div><dt>Room</dt><dd><span className="ui-mono">{sb.room}</span>{t ? <> · {t.room.name} <Tag tone={tone(t.room.lifecycle)}>{t.room.lifecycle}</Tag></> : null}</dd></div>
              <div><dt>Expires</dt><dd>{when(sb.expiresAt)}</dd></div>
              <div><dt>Resume code</dt><dd><input className="cn__resume ui-mono" readOnly value={c.code()} aria-label="Resume code" data-testid="cn-code" onFocus={(e: { currentTarget: HTMLInputElement }) => e.currentTarget.select()} /> <button type="button" className="ui-btn ui-btn--sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                <p className="ui-meta">The code opens this sandbox from any browser, as any of its people. Treat it like a password for the sandbox; it opens nothing else.</p></dd></div>
            </dl>
            <p className="build__row">
              {confirmReset ? <><button type="button" className="ui-btn ui-btn--sm ui-btn--primary" data-testid="cn-reset-confirm" disabled={!!busy} onClick={reset}>Yes, close this one and open a new one</button> <button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" onClick={() => setConfirmReset(false)}>Keep it</button></>
                : <button type="button" className="ui-btn ui-btn--sm" data-testid="cn-reset" disabled={!!busy} onClick={() => setConfirmReset(true)}>Reset my sandbox</button>}
              {' '}<button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="cn-forget" disabled={!!busy} onClick={forget}>Forget it in this browser</button>
              {' '}<button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="cn-refresh" disabled={!!busy} onClick={() => void reread()}>Read the server again</button>
            </p>
          </>}
        {offline ? <div data-testid="cn-offline"><Notice tone="warn"><b>This browser is offline.</b> The records are on the server: nothing can be read or recorded until the connection is back. The page will read the server again by itself then.</Notice></div> : null}
        {busy ? <p role="status" data-testid="cn-busy" data-waiting={waiting ? 'long' : 'short'}><Tag tone="warn">working</Tag> {busy}{waiting ? ' The server has not answered yet. One that has been idle can take about a minute to start. Still waiting; there is nothing you need to do.' : ''}</p> : null}
        {said ? <div role={said.ok ? 'status' : 'alert'} data-testid="cn-said" data-ok={said.ok ? 'yes' : 'no'}><Notice tone={said.ok ? 'ok' : 'bad'}><b>{said.title}</b> {said.text}{said.reasons?.length ? <ul>{said.reasons.map((x) => <li key={x}>{x}</li>)}</ul> : null}</Notice></div> : null}
      </Card>

      {sb && state && prog ? <Card icon="check" title="The journey" sub={`${prog.done} of ${prog.total} steps are on the server’s record`} testId="cn-journey">
        {next ? <div className="cn__next" data-testid="cn-next" data-step={next.id}>
          <p><Tag tone="warn">next</Tag> <b>{next.title}</b> <span className="ui-muted">· the {label(next.role)}</span></p>
          <p>{next.what}</p>
          {blocked ? <p className="ui-muted">Not yet: {blocked}.</p> : null}
          <p className="build__row">
            <button type="button" className="ui-btn ui-btn--primary" data-testid="cn-run" disabled={!!busy} onClick={() => run(next, next.role)}>Do it as the {label(next.role)}</button>
            {' '}<label className="kit-field">or try it as <select aria-label="Try the step as another person" value={tryAs} data-testid="cn-try-role" onChange={(e) => setTryAs(e.target.value)}>{TRY_ROLES.filter((r) => r !== next.role).map((r) => <option key={r} value={r}>the {label(r)}</option>)}</select></label>
            {' '}<button type="button" className="ui-btn ui-btn--sm" data-testid="cn-try" disabled={!!busy} onClick={() => run(next, tryAs === next.role ? TRY_ROLES.find((r) => r !== next.role)! : tryAs)}>Try</button>
            {' '}<button type="button" className="ui-btn ui-btn--sm ui-btn--quiet" data-testid="cn-run-all" disabled={!!busy} onClick={runAll}>Run every remaining step, each as its own person</button>
          </p>
        </div> : <Notice tone="ok"><b>The journey is complete.</b> Every step below is on the server’s record. Open this sandbox in another browser with its resume code: it reads the same.</Notice>}
        <ol className="cn__steps" data-testid="cn-steps">{STEPS.map((s) => { const done = s.done(state); return <li key={s.id} data-step={s.id} data-state={done ? 'done' : s === next ? 'next' : 'later'}>
          <Tag tone={done ? 'ok' : s === next ? 'warn' : 'muted'}>{done ? 'done' : s === next ? 'next' : 'later'}</Tag> <b>{s.title}</b> <span className="ui-muted">· the {label(s.role)}</span></li>; })}</ol>
      </Card> : null}

      {sb && t && state ? <Card icon="route" title="The thread on the server" sub={t.complete ? 'Whole: every stage has its record' : `Still to do: ${t.missing.join(' · ')}`} testId="cn-thread">
        <div className="cn__stages">
          <div data-stage="lite"><h3>Lite · the room and its field record</h3><dl className="san__defs">
            <div><dt>Positions</dt><dd>{String((t.stages[0]?.records as { positions: number }).positions)} devices</dd></div>
            <div><dt>Mounted</dt><dd data-testid="cn-mounted">{fieldOf(state).mounted} of {fieldOf(state).devices}{state.field.devices.filter((d) => d.mounting).map((d) => <span key={d.asset}> · <span className="ui-mono">{d.asset}</span> {d.mounting!.label}{d.mounting!.heightM != null ? `, ${d.mounting!.heightM} m` : ''} (v{d.mounting!.version}, {d.mounting!.by})</span>)}</dd></div>
            <div><dt>Field moves</dt><dd data-testid="cn-moves">{state.field.moves.length ? state.field.moves.map((m) => <span key={m.move}><span className="ui-mono">{m.move}</span> {m.device} {m.metres} m, {m.reason} <Tag tone={tone(m.state)}>{m.state}</Tag>{m.decidedBy ? ` by ${m.decidedBy}` : ''} </span>) : 'none recorded'}</dd></div>
          </dl></div>
          <div data-stage="engineering"><h3>Engineering · the design and the register</h3><dl className="san__defs">
            <div><dt>Revision</dt><dd>{((t.stages[1]?.records as { revisions: Array<{ revision: number; sha256: string }> }).revisions || []).map((r) => <span key={r.revision}>r{r.revision} <span className="ui-mono">{short(r.sha256)}</span> </span>)}</dd></div>
            <div><dt>Device register</dt><dd data-testid="cn-register">{registerOf(state).complete} of {registerOf(state).devices} complete</dd></div>
          </dl></div>
          <div data-stage="commissioning"><h3>Commissioning · results and deficiencies</h3><dl className="san__defs">
            <div><dt>Lifecycle</dt><dd><Tag tone={tone(t.room.lifecycle)}>{t.room.lifecycle}</Tag></dd></div>
            <div><dt>Checks</dt><dd data-testid="cn-checks">{state.rows.filter((r) => r.result === 'PASS_VERIFIED').length} of {state.rows.length} independently verified</dd></div>
            <div><dt>Deficiencies</dt><dd data-testid="cn-issues">{issuesOf(state).length ? issuesOf(state).map((i) => <span key={i.code}><span className="ui-mono">{i.code}</span> {i.title} <Tag tone={tone(i.workflow)}>{i.workflow}</Tag>{i.retest ? ` retest ${i.retest.result} (${i.retest.evidence})` : ''} </span>) : 'none'}</dd></div>
          </dl></div>
          <div data-stage="service"><h3>ServiceHands · the work order</h3><dl className="san__defs">
            <div><dt>Work orders</dt><dd data-testid="cn-wos">{wosOf(state).length ? wosOf(state).map((w) => <span key={w.code}><span className="ui-mono">{w.code}</span> on {w.issue} <Tag tone={tone(w.state)}>{w.state}</Tag> {w.evidence} evidence{w.verification ? `, verified ${w.verification.outcome}` : ''} </span>) : 'none'}</dd></div>
            <div><dt>Rule</dt><dd>Closing a work order never resolves its deficiency: the verified retest does.</dd></div>
          </dl></div>
          <div data-stage="assurance"><h3>Assurance · the accepted baseline</h3><dl className="san__defs">
            <div><dt>Baselines</dt><dd data-testid="cn-baselines">{((t.stages[4]?.records as { baselines: Array<{ version: number; state: string; designSha256: string; evidence: number }> }).baselines || []).map((b) => <span key={b.version}>v{b.version} <Tag tone={tone(b.state)}>{b.state}</Tag> design <span className="ui-mono">{short(b.designSha256)}</span>, {b.evidence} evidence </span>)}{(t.stages[4]?.records as { baselines: unknown[] }).baselines?.length ? null : 'none yet'}</dd></div>
          </dl></div>
          <div data-stage="apex"><h3>APEX · the diagnosis</h3><dl className="san__defs">
            <div><dt>Cases</dt><dd data-testid="cn-cases">{((t.stages[5]?.records as { cases: Array<{ code: string; issue: string; hypotheses: number; leading: { text: string; confidence: string; caveat: string } | null }> }).cases || []).map((k) => <span key={k.code}><span className="ui-mono">{k.code}</span> on {k.issue}: {k.hypotheses} {k.hypotheses === 1 ? 'hypothesis' : 'hypotheses'}{k.leading ? <> — leading ({k.leading.confidence}): {k.leading.text} <span className="ui-muted">Against it: {k.leading.caveat}</span></> : null} </span>)}{(t.stages[5]?.records as { cases: unknown[] }).cases?.length ? null : 'none yet'}</dd></div>
          </dl></div>
        </div>
        <h3>The ids that carry the record</h3>
        <ul className="build__list" data-testid="cn-links">{t.links.map((l, k) => <li key={k} data-from={l.from} data-to={l.to}><span className="ui-mono">{Object.entries(l.keys).map(([a, b]) => `${a} ${b}`).join(' · ')}</span> · {l.what} <span className="ui-muted">({l.from} → {l.to})</span></li>)}</ul>
      </Card> : null}

      {sb && t ? <Card icon="chart" title="History on the server" sub="The audit trail of this room: who did what, allowed and refused" testId="cn-audit">
        <p data-testid="cn-audit-counts">{t.audit.byAggregate.map((a) => <span key={`${a.type}${a.outcome}`}>{a.type} <Tag tone={tone(a.outcome)}>{a.outcome}</Tag> {a.events} </span>)}</p>
        <ul className="build__list cn__events">{t.audit.latest.map((e, k) => <li key={k}><span className="ui-muted">{when(e.at)}</span> · {e.actor_role ? label(e.actor_role) : 'system'} · <span className="ui-mono">{e.action}</span> <Tag tone={tone(e.outcome)}>{e.outcome}</Tag> <span className="ui-muted">{e.aggregate_id}</span></li>)}</ul>
        <p className="ui-meta">Read from the server’s hash-chained audit trail a moment ago. A refusal is a row here too. Nothing on this page is stored in the browser except the sandbox’s id and key.</p>
      </Card> : null}
    </section>
  );
}
