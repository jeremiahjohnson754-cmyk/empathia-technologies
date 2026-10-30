/**
 * Founder Decisions — the studio's first persistent workflow on the platform (ADR-0001 §3): a decision with its area and rationale,
 * moved through DRAFT → DECIDED → REVISITED / WITHDRAWN, every change an immutable revision, every step audited server-side. The
 * founder signs in to the founder organization; an enterprise account is refused by the API (tests/security/founder-boundary.test.mjs).
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { platform, signInFounder, signOut, signedIn, subscribe, API_BASE } from '../lib/platform';

interface Decision { id: string; code: string; title: string; area: string; status: string; revision: number; rationale: string; options: unknown[]; decided_at: string; updated_at: string }
interface Revision { revision: number; status: string; rationale: string; at: string }
const AREAS = ['product', 'engineering', 'commercial', 'operations', 'investor', 'legal'];
const NEXT: Record<string, string[]> = { DRAFT: ['DECIDED', 'WITHDRAWN'], DECIDED: ['REVISITED', 'WITHDRAWN'], REVISITED: ['DECIDED', 'WITHDRAWN'], WITHDRAWN: [] };
const err = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function Decisions() {
  const on = useSyncExternalStore(subscribe, signedIn, () => false);
  return (
    <div className="stack">
      <h1>Founder Decisions</h1>
      <p className="muted">Kept on the platform in the founder organization’s own schema, behind the founder boundary: readable and writable by the founder role only, never from the enterprise application or the demonstrations. Every change appends a revision and an audit record.</p>
      {on ? <Workspace /> : <SignIn />}
    </div>
  );
}

function SignIn() {
  const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  return (
    <form className="card stack" onSubmit={(e) => { e.preventDefault(); setBusy(true); setMsg(''); signInFounder(pw).catch((x) => setMsg(err(x))).finally(() => setBusy(false)); }}>
      <h2>Sign in to the founder organization</h2>
      <p className="muted">Platform API: <code>{API_BASE}</code>. Development identity (AUTH_MODE=dev): the seeded founder account. In production this becomes the identity provider’s sign-in with MFA.</p>
      <label>Password <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></label>
      {msg ? <p className="warn" role="alert">{msg}</p> : null}
      <div><button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
    </form>
  );
}

function Workspace() {
  const [items, setItems] = useState<Decision[] | null>(null); const [msg, setMsg] = useState(''); const [open, setOpen] = useState<string | null>(null); const [hist, setHist] = useState<Revision[]>([]);
  const [title, setTitle] = useState(''); const [area, setArea] = useState('product'); const [rationale, setRationale] = useState('');
  const load = () => platform.call('getV1FounderDecisions').then((b) => setItems((b as { items: Decision[] }).items)).catch((e) => setMsg(err(e)));
  useEffect(() => { void load(); }, []);
  const create = async (e: { preventDefault(): void }) => { e.preventDefault(); setMsg(''); try { await platform.call('postV1FounderDecisions', { body: { title, area, rationale } as never }); setTitle(''); setRationale(''); await load(); } catch (x) { setMsg(err(x)); } };
  const move = async (d: Decision, to: string) => { const why = window.prompt(`Rationale for ${d.code} → ${to}`); if (!why) return; setMsg(''); try { await platform.call('postV1FounderDecisionsIdTransition', { params: { id: d.id }, body: { to, rationale: why } as never }); await load(); if (open === d.id) await history(d.id); } catch (x) { setMsg(err(x)); } };
  const history = async (id: string) => { setOpen(id); try { setHist(((await platform.call('getV1FounderDecisionsIdHistory', { params: { id } })) as { items: Revision[] }).items); } catch (x) { setMsg(err(x)); } };
  return (
    <div className="stack">
      <div className="row-between"><span className="muted">Signed in as the founder.</span><button className="btn quiet" type="button" onClick={signOut}>Sign out</button></div>
      {msg ? <p className="warn" role="alert">{msg}</p> : null}
      <form className="card stack" onSubmit={create}>
        <h2>Record a decision</h2>
        <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required /></label>
        <label>Area <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Rationale <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} maxLength={8000} required /></label>
        <div><button className="btn" type="submit">Record as draft</button></div>
      </form>
      {items === null ? <p className="muted">Loading…</p> : !items.length ? <p className="muted">No decisions recorded yet.</p> : (
        <table className="table"><caption className="sr">Founder decisions</caption><thead><tr><th>Code</th><th>Title</th><th>Area</th><th>Status</th><th>Rev.</th><th>Rationale</th><th></th></tr></thead><tbody>
          {items.map((d) => <tr key={d.id}><td><code>{d.code}</code></td><td>{d.title}</td><td>{d.area}</td><td><span className={`pill pill-${d.status.toLowerCase()}`}>{d.status}</span></td><td>{d.revision}</td><td className="muted">{d.rationale}</td>
            <td className="acts">{(NEXT[d.status] || []).map((to) => <button key={to} className="btn sm" type="button" onClick={() => void move(d, to)}>{to}</button>)} <button className="btn sm quiet" type="button" onClick={() => void history(d.id)}>History</button></td></tr>)}
        </tbody></table>)}
      {open ? <div className="card stack"><h2>Revisions of {items?.find((d) => d.id === open)?.code}</h2><ol>{hist.map((r) => <li key={r.revision}><b>{r.revision} · {r.status}</b> <span className="muted">{r.at.slice(0, 16).replace('T', ' ')}</span><br />{r.rationale}</li>)}</ol></div> : null}
    </div>
  );
}
