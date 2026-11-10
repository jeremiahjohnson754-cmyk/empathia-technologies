/**
 * The field queue, demonstrated (on #/offline). The rules are the product's own (@empathia/field-queue): a result recorded without a
 * connection waits on the device, is sent in order when the connection returns, is never counted before the server acknowledges it,
 * is applied once however often it is retried, and becomes a conflict a person resolves when the record changed meanwhile.
 *
 * What is simulated, and said so on the page: the server. It is a small object in this page that keeps one version per record,
 * remembers the keys it has applied and refuses a change made against an old version. Nothing leaves the browser. The connection
 * switch is the connection to that simulated server; it is also off whenever the browser itself is offline.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@empathia/ui';
import { counts, drain, empty, enqueue, isOpen, load, memoryStore, ready, resolve, save, standing, summary, type Entry, type Queue, type Sent, type Store } from '@empathia/field-queue';
import { Block } from '../worlds/kit.js';

const QKEY = 'empathia.demo.fieldqueue.v1'; const SKEY = 'empathia.demo.fieldqueue.server.v1';
const RECORD = 'commissioning/R-ATL-4-218';
const TESTS = ['The display wakes from the touch panel', 'The far end hears every seat', 'Camera preset 1 frames the whole table'] as const;
const OWNER = { tenantId: 'demonstration', personId: 'commissioning-engineer', deviceId: 'this-browser' };

interface Applied { key: string; test: string; outcome: string; by: string }
interface Server { version: number; applied: Applied[]; answers: Record<string, Sent> }
const freshServer = (): Server => ({ version: 3, applied: [], answers: {} });
const local = (key: string): Store => { try { localStorage.getItem(key); return { read: () => localStorage.getItem(key), write: (t) => { try { localStorage.setItem(key, t); } catch { /* lasts for this visit */ } } }; } catch { return memoryStore(); } };
const readServer = (): Server => { try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null') as Server | null; if (s && typeof s.version === 'number' && Array.isArray(s.applied)) return s; } catch { /* a damaged copy starts again */ } return freshServer(); };
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 8)}`);
const TONE: Record<Entry['state'], string> = { WAITING: 'warn', SENDING: 'info', SENT: 'ok', CONFLICT: 'bad', REJECTED: 'bad', DISCARDED: 'info' };
const WORD: Record<Entry['state'], string> = { WAITING: 'On this device', SENDING: 'Sending', SENT: 'Acknowledged', CONFLICT: 'Conflict', REJECTED: 'Refused', DISCARDED: 'Discarded' };

export function FieldQueueDemo({ online }: { online: boolean }) {
  const qStore = useRef(local(QKEY)).current;
  const [q, setQ] = useState<Queue>(() => load(qStore, OWNER).queue);
  const [server, setServer] = useState<Server>(readServer);
  const [link, setLink] = useState(false); const [lose, setLose] = useState(false); const [said, setSaid] = useState(''); const [tick, setTick] = useState(0);
  const srv = useRef(server); srv.current = server; const loseRef = useRef(lose); loseRef.current = lose; const busy = useRef(false);
  const up = online && link;
  const keepQ = (n: Queue) => { save(qStore, n); setQ(n); };
  const keepS = (n: Server) => { try { localStorage.setItem(SKEY, JSON.stringify(n)); } catch { /* lasts for this visit */ } srv.current = n; setServer(n); };

  /** The simulated server: applies a change once per key, refuses one made against an old version, and can lose its answer on the way back. */
  const send = async (e: Entry, expects: string | null): Promise<Sent> => {
    const s = srv.current; const body = e.body as { test: string; outcome: string };
    const seen = s.answers[e.id]; if (seen) return seen;   // the key was applied before: the stored answer is replayed, nothing is applied twice
    if (expects !== null && expects !== String(s.version)) return { status: 409, body: { version: String(s.version) }, reason: `the record is at version ${s.version}; this was recorded against version ${expects}` };
    const answer: Sent = { status: 200, version: String(s.version + 1), body: { ok: true } };
    keepS({ version: s.version + 1, applied: [...s.applied, { key: e.id, test: body.test, outcome: body.outcome, by: 'this device' }], answers: { ...s.answers, [e.id]: answer } });
    if (loseRef.current) { setLose(false); loseRef.current = false; return { status: null, reason: 'the server applied it, but its answer was lost on the way back' }; }
    return answer;
  };
  // send whatever is ready whenever the connection is up; a retry waits for its time (the tick re-checks once a second)
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!up || busy.current || !ready(q, new Date().toISOString()).length) return;
    busy.current = true;
    void drain(q, send, { now: () => new Date().toISOString(), onChange: keepQ, maxRounds: 20 }).then((n) => { keepQ(n); busy.current = false; });
  }, [up, q, tick]);   // eslint-disable-line react-hooks/exhaustive-deps

  const record = (test: string, outcome: 'PASS' | 'FAIL') => {
    const last = [...q.entries].reverse().find((e) => e.record === RECORD && e.state !== 'DISCARDED' && e.state !== 'REJECTED');
    const known = [...q.entries].reverse().find((e) => e.ack?.version)?.ack?.version ?? '3';
    const r = enqueue(q, { id: newKey(), record: RECORD, kind: 'test result', method: 'POST', path: '/v1/rooms/R-ATL-4-218/results', body: { test, outcome }, ...(last && last.state !== 'SENT' ? { after: last.id } : { expects: last?.ack?.version ?? known }) }, new Date().toISOString());
    if (r.ok) { keepQ(r.queue); setSaid(`${outcome} recorded for “${test}”. ${up ? 'Sending.' : 'It waits on this device until the connection returns.'}`); } else setSaid(r.why);
  };
  const other = () => { const s = srv.current; keepS({ ...s, version: s.version + 1, applied: [...s.applied, { key: `other-${s.version + 1}`, test: 'A colleague re-ran the camera test', outcome: 'FAIL', by: 'another person' }] }); setSaid(`A colleague changed the record on the server: it is now at version ${s.version + 1}. This device has not heard.`); };
  const again = (e: Entry) => { const r = resolve(q, e.id, { kind: 'resend', by: OWNER.personId, newId: newKey(), expects: String(srv.current.version) }, new Date().toISOString()); if (r.ok) { keepQ(r.queue); setSaid('Your result will be sent again, against the record as it is now. The first attempt is kept as discarded.'); } else setSaid(r.why); };
  const drop = (e: Entry) => { const r = resolve(q, e.id, { kind: 'discard', by: OWNER.personId }, new Date().toISOString()); if (r.ok) { keepQ(r.queue); setSaid('Your result was discarded and was not sent. The decision is kept on the entry.'); } else setSaid(r.why); };
  const reset = () => { keepQ(empty(OWNER)); keepS(freshServer()); setLink(false); setLose(false); setSaid('The simulation was reset.'); };

  const sum = summary(q); const list = [...q.entries].sort((a, b) => a.seq - b.seq); const counted = list.filter(counts).length; const live = list.filter((e) => e.state !== 'DISCARDED').length;
  const wait = (e: Entry) => (e.state === 'WAITING' && e.notBefore && e.notBefore > new Date().toISOString() ? ` Next attempt in ${Math.max(1, Math.ceil((Date.parse(e.notBefore) - Date.now()) / 1000))} s.` : '');
  return (
    <Block title="Field work recorded without a connection" sub="a simulation: the server is part of this page" testId="fq">
      <p className="ui-muted">This is how the product treats a result recorded in a plant room with no signal. Record a result, switch the connection, lose an answer, let a colleague change the record first. <b>Nothing counts until the server has acknowledged it.</b></p>
      <div className="fq-controls" role="group" aria-label="Simulation controls">
        <label className="fq-switch"><input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} data-testid="fq-link" /> <span>Connection to the simulated server<span className="ui-meta">{!online ? ' Off: this browser is offline.' : link ? ' On.' : ' Off.'}</span></span></label>
        <label className="fq-switch"><input type="checkbox" checked={lose} onChange={(e) => setLose(e.target.checked)} data-testid="fq-lose" /> <span>Lose the next answer<span className="ui-meta"> The server applies the change; its reply never arrives.</span></span></label>
        <Button small onClick={other} testId="fq-other">A colleague changes the record</Button>
        <Button small kind="quiet" onClick={reset} testId="fq-reset">Reset this simulation</Button>
      </div>
      <div className="fq-grid">
        <section aria-labelledby="fq-dev-h" data-testid="fq-device" data-up={up}>
          <h3 className="of-h3" id="fq-dev-h">On this device · Atlas 4.218</h3>
          <ul className="fq-tests" aria-label="Tests to record">{TESTS.map((t) => <li key={t}><span>{t}</span><span className="fq-acts"><Button small onClick={() => record(t, 'PASS')} testId="fq-pass">Record PASS</Button><Button small onClick={() => record(t, 'FAIL')} testId="fq-fail">Record FAIL</Button></span></li>)}</ul>
          <p className="fq-count" data-testid="fq-counted" data-counted={counted} data-recorded={live}><b>{counted} of {live}</b> recorded here {live === 1 ? 'counts' : 'count'} towards the room’s record.{sum.needsPerson ? ` ${sum.needsPerson} need${sum.needsPerson === 1 ? 's' : ''} your decision.` : ''}</p>
          {list.length ? <ol className="fq-list" data-testid="fq-entries">{list.map((e) => { const b = e.body as { test: string; outcome: string }; const held = e.state === 'WAITING' && list.some((x) => x.record === e.record && x.seq < e.seq && isOpen(x) && (x.state === 'CONFLICT' || x.state === 'REJECTED')); return (
            <li key={e.id} data-testid="fq-entry" data-state={e.state} data-attempts={e.attempts}>
              <div className="fq-entry__h"><b>{b.outcome}</b> · {b.test}<span className={`ui-tag ui-tone--${TONE[e.state]}`}>{WORD[e.state]}</span></div>
              <p className="ui-meta">{standing(e)}{e.lastError && e.state === 'WAITING' ? ` Last attempt: ${e.lastError}.` : ''}{wait(e)}{held ? ' Waiting behind the change above, which needs your decision.' : ''}{e.refusal ? ` The server said: ${e.refusal.reason}.` : ''}{e.supersedes ? ' Sent again after a conflict.' : ''}</p>
              {(e.state === 'CONFLICT' || (e.state === 'REJECTED' && e.refusal?.status !== 0)) && <div className="fq-acts"><Button small kind="primary" onClick={() => again(e)} testId="fq-again">Send mine against the record as it is now</Button><Button small onClick={() => drop(e)} testId="fq-drop">Discard mine</Button></div>}
              {e.state === 'REJECTED' && e.refusal?.status === 0 && <div className="fq-acts"><Button small onClick={() => drop(e)} testId="fq-drop">Discard</Button></div>}
            </li>); })}</ol> : <p className="ui-muted" data-testid="fq-none">Nothing is recorded yet. Leave the connection off and record a result.</p>}
        </section>
        <section aria-labelledby="fq-srv-h" data-testid="fq-server" data-version={server.version} data-applied={server.applied.length}>
          <h3 className="of-h3" id="fq-srv-h">The simulated server</h3>
          <p className="ui-meta">The room’s record is at version <b>{server.version}</b>. {server.applied.length} change{server.applied.length === 1 ? '' : 's'} applied since the simulation started.</p>
          {server.applied.length ? <ol className="fq-list">{server.applied.map((a) => <li key={a.key} data-testid="fq-applied" data-by={a.by}><div className="fq-entry__h"><b>{a.outcome}</b> · {a.test}</div><p className="ui-meta">Applied once, from {a.by}.</p></li>)}</ol> : <p className="ui-muted">Nothing has reached the server.</p>}
        </section>
      </div>
      <p className="w-said" role="status" aria-live="polite" data-testid="fq-said">{said}</p>
    </Block>
  );
}
