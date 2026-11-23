/**
 * #/accord — Empathia ACCORD (journey J9). One scoped, expiring evidence capsule between the customer and its service provider, read
 * from either side (?as=provider) and at either time (?at=expired). The provider's side is exactly model.view(…, 'provider', …):
 * shared lines only. The customer's side also shows what was withheld, where each item comes from, the record of changes and the
 * download audit. A download by the provider saves the scoped file and writes its SHA-256 to the audit; withdrawal empties the
 * provider's view at once.
 */
import { useState } from 'react';
import { PageHero, Notice, Tag, Segmented, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { State } from '../voice/CallPathPage.js';
import { CAPSULE, CLOCKS, OUTSIDE, PARTIES, STATUS_WORD, clockOf, exportOf, loadLocal, partyOf, saveLocal, view, type Party, type Clock, type Status } from './model.js';

const TONE: Record<Status, 'ok' | 'warn' | 'bad'> = { ACTIVE: 'ok', EXPIRED: 'warn', WITHDRAWN: 'bad' };
const day = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
async function sha256(text: string): Promise<string> { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function saveFile(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }

export default function AccordPage({ role, query, can }: PageProps) {
  const { w } = useWorkspace(); const [local, setLocal] = useState(() => loadLocal()); const party: Party = partyOf(query.get('as')); const clock: Clock = clockOf(query.get('at'));
  const v = view(w, party, clock, local); const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const go = (p: Party, c: Clock) => { const q = [p === 'provider' ? 'as=provider' : '', c === 'expired' ? 'at=expired' : ''].filter(Boolean).join('&'); location.hash = `#/accord${q ? `?${q}` : ''}`; };
  const download = async () => { const text = exportOf(v); if (!text) return; const hash = await sha256(text); saveFile(`${CAPSULE.id}-scoped-evidence.json`, text);
    setLocal(saveLocal({ ...loadLocal(), audit: [{ at: new Date().toISOString(), party, by: role, sha256: hash, bytes: new TextEncoder().encode(text).length }, ...loadLocal().audit] })); };
  const withdraw = () => setLocal(saveLocal({ ...loadLocal(), withdrawnAt: new Date().toISOString(), withdrawnBy: role }));
  const restore = () => setLocal(saveLocal({ ...loadLocal(), withdrawnAt: null, withdrawnBy: null }));
  const changes = [`${day(CAPSULE.createdAt)} · created by the ${ROLES[CAPSULE.sharedBy].label}`, `${day(CAPSULE.approvedAt)} · approved by the ${ROLES[CAPSULE.approvedBy].label} (a second person; the one who shares cannot approve)`,
    ...(local.withdrawnAt ? [`${day(local.withdrawnAt)} · withdrawn by the ${local.withdrawnBy ? ROLES[local.withdrawnBy].label : 'customer'}`] : []), ...(clock === 'expired' ? [`${day(CAPSULE.expiresAt)} · ended on its own date`] : [])];
  return (<div className="vc" data-testid="accord" data-party={party} data-status={v.status} data-readable={v.readable ? '1' : '0'}>
    <PageHero eyebrow="Empathia ACCORD · simulation" title="Scoped evidence, shared for one purpose" product="search-party" icon="link"
      lede="A capsule gives another organisation the evidence it needs for one issue, and nothing else, until a date. It copies nothing: each item is read from the record that owns it, and what is withheld is said."
      meta={[<Tag key="s" tone={TONE[v.status]}>{STATUS_WORD[v.status]}</Tag>, <span key="c">{CAPSULE.id}</span>]} />
    <div className="vc-cases">
      <Segmented label="Read the capsule as" value={party} onChange={(p) => go(p, clock)} options={[{ value: 'customer', label: 'The customer' }, { value: 'provider', label: 'The service provider' }]} />
      <Segmented label="Read it at" value={clock} onChange={(c) => go(party, c)} options={[{ value: 'now', label: `Today (${CLOCKS.now.slice(0, 10)})` }, { value: 'expired', label: `After it ends (${CLOCKS.expired.slice(0, 10)})` }]} />
      <p className="ui-muted">In the product each organisation signs in to its own tenant. This switch shows what each side would receive; it is not an authorisation.</p>
    </div>
    <p className={`vc-verdict vc-verdict--${v.status === 'ACTIVE' ? 'within_policy' : 'unknown'}`} data-testid="accord-says"><b>{PARTIES[party].name}.</b> {v.says}</p>
    <section className="vc-sec vc-two" aria-label="Terms">
      <div data-testid="accord-terms"><h2>Terms</h2><ul className="vc-next"><li>Purpose: {CAPSULE.purpose}</li><li>About: {CAPSULE.subject.entityType} {CAPSULE.subject.entityId}</li><li>Under: {CAPSULE.agreement}</li><li>Ends: {day(CAPSULE.expiresAt)}</li><li><State s="DECLARED" /> {CAPSULE.delegation}</li></ul></div>
      <div><h2>Who is who</h2><ul className="vc-next">{(['customer', 'provider'] as Party[]).map((p) => <li key={p}><b>{PARTIES[p].name}</b><br /><span className="ui-muted">{PARTIES[p].role}</span></li>)}</ul></div>
    </section>
    <section className="vc-sec" aria-labelledby="ac-i-h"><h2 id="ac-i-h">{party === 'provider' ? 'What you have been given' : 'What the provider receives, and what is withheld'}</h2>
      {v.items.length ? <ul className="mp-deps" data-testid="accord-items">{v.items.map((i) => (<li key={i.id} className="mp-dep" data-item={i.id} data-ready="READY">
        <h3>{i.title}</h3><p><State s={i.basis} /></p><ul className="vc-next">{i.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        {i.withheld ? <p className="ui-muted" data-testid={`accord-withheld-${i.id}`}><b>Withheld:</b> {i.withheld.join('; ')}.</p> : null}
        {i.source && opens(i.source.href) ? <p className="fl-refs"><a href={i.source.href}>{i.source.label}</a></p> : null}
      </li>))}</ul> : <Notice tone="warn"><span data-testid="accord-empty">There is nothing to read.</span></Notice>}
      {party === 'provider' && v.readable ? <p><Button kind="secondary" testId="accord-download" onClick={() => { void download(); }}>Download the scoped file</Button> <span className="ui-muted">{v.redactions} details are withheld. The download is written to the customer’s audit.</span></p> : null}
    </section>
    {party === 'customer' ? <section className="vc-sec vc-two" aria-label="Record and control">
      <div><h2>Never in the capsule</h2><ul className="vc-next" data-testid="accord-outside">{OUTSIDE.map((o) => <li key={o}>{o}</li>)}</ul>
        <h2>Changes</h2><ul className="vc-next" data-testid="accord-changes">{changes.map((c) => <li key={c}>{c}</li>)}</ul></div>
      <div><h2>Download audit</h2>{local.audit.length ? <ul className="vc-next" data-testid="accord-audit">{local.audit.map((a) => <li key={a.at}>{day(a.at)} · {PARTIES[a.party].name} · {a.bytes} bytes<br /><code className="md-hash">{a.sha256}</code></li>)}</ul> : <p className="ui-muted" data-testid="accord-noaudit">No download is on record.</p>}
        <p className="ui-muted">Kept in this browser (demonstration). The hash is the SHA-256 of the exact file that was saved.</p>
        {v.status === 'ACTIVE' && can('accord.withdraw') ? <p><Button kind="secondary" testId="accord-withdraw" onClick={withdraw}>Withdraw the capsule now</Button></p>
          : v.status === 'WITHDRAWN' && can('accord.withdraw') ? <p><Button kind="secondary" testId="accord-restore" onClick={restore}>Share it again (demonstration)</Button></p>
          : v.status === 'ACTIVE' ? <p className="ui-muted">Operations, the data steward or the architect can withdraw it.</p> : null}</div>
    </section> : null}
    <Notice tone="muted"><b>Not built:</b> two real tenants, signed capsules, a dispute record between the organisations, and enforcement of the delegation. Nothing is sent to anyone: both organisations are fictional.</Notice>
  </div>);
}
