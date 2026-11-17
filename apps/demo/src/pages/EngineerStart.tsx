/**
 * #/engineer — the Engineer start page (V2.5.5 Private Engineer Edition, read statically on 16 Nov 2026; founder: "here's the artifacts
 * v2.5.5 private engineer mode"). Three demonstrations an engineer inspects — room design, commissioning verification, issue handoff —
 * each with its inspection sheet: what to inspect, the evidence states, the security boundary, where the source is, the tests that
 * cover it and how it fails. Faults are injected here by an engineering persona; each makes the product's own refusal, with its reason.
 * The sheets describe this build: the file paths and test ids are this repository's, not the legacy edition's.
 */
import { useState } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { personaOf, personaLabel, holds, FAULTS, FAULT_AUTHORITIES, faultsOn, setFault, type FaultKey } from '../build/store.js';
import { ROLE_STORE } from '../viewas/role.js';
import { ENG_DEMOS } from '../engineer/demos.js';

const toneOf = (k: string) => (/VERIFIED|CLOSED/.test(k) ? 'ok' : /FAIL/.test(k) ? 'bad' : /PLANNED|OPEN|NOT_TESTED|PROPOSED|awaiting|IN_PROGRESS/.test(k) ? 'warn' : 'muted') as 'ok' | 'bad' | 'warn' | 'muted';
const openAs = (role: string, href: string) => { try { localStorage.setItem(ROLE_STORE, role); } catch { /* the page still opens; the perspective stays */ } location.hash = href; location.reload(); };

export function EngineerStartPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const [, setTick] = useState(0); const [why, setWhy] = useState<string[] | null>(null);
  const on = faultsOn(); const may = FAULT_AUTHORITIES.some((x) => holds(persona, x)); const active = FAULTS.filter(([k]) => on[k]);
  const toggle = (k: FaultKey) => { const r = setFault(persona, k, !on[k]); setWhy(r ? r.why : null); setTick((t) => t + 1); };
  return (
    <section className="wk san eng" data-native="workspace" data-testid="engineer-start">
      <PageHero product="commissioning" icon="wrench" eyebrow="Engineering inspection" title="Engineer start"
        lede={<>Three things to inspect, in the order the work happens: a room’s design, its commissioning, and a deficiency handed to service. Each has an inspection sheet: what to look at, the evidence states, who may do what, where the source is, the tests that cover it and how it fails. Synthetic data; a demonstration of authorization in the page, not production security. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <div role="status" data-testid="eng-status"><Notice tone={active.length ? 'warn' : 'ok'}><b>Faults injected now:</b> {active.length ? active.map(([k, l]) => <Tag key={k} tone="bad">{l}</Tag>) : <Tag tone="ok">none</Tag>} <span className="ui-muted">· build {process.env.DEMO_BUILD_ID || 'dev'} · every refusal is written to the room’s ledger</span></Notice></div>
      <div className="eng__grid">{ENG_DEMOS.map((D) => <Card key={D.key} icon="check" title={`${D.n} · ${D.title}`} testId={`eng-card-${D.key}`}>
        <p>{D.what}</p>
        <p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid={`eng-go-${D.key}`} onClick={() => openAs(D.role, D.href)}>{D.go}</button>
          {D.alt ? <button type="button" className="ui-btn ui-btn--sm" onClick={() => openAs(D.alt!.role, D.href)}>{D.alt.label}</button> : null}</p>
        <p><a className="ui-btn ui-btn--sm ui-btn--quiet" href={`#eng-sheet-${D.key}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(`eng-sheet-${D.key}`) as HTMLDetailsElement | null; if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}>Read the inspection sheet</a></p>
      </Card>)}</div>

      <Card icon="shield" title="Failure handling" sub="Switch a fault on, then take the step it affects: the product refuses with the reason, records the refusal, and leaves nothing half-done" testId="eng-faults">
        {!may ? <Notice tone="info">{personaLabel(persona)} reads this page. Faults are injected by an engineering persona ({FAULT_AUTHORITIES.join(', ')}).</Notice> : null}
        {why ? <div data-testid="eng-refused"><Notice tone="bad"><b>Refused.</b> {why.join(' · ')}</Notice></div> : null}
        <ul className="build__list">{FAULTS.map(([k, l, what]) => <li key={k} data-fault={k} data-on={on[k] ? 'yes' : 'no'}>
          {/* a persona who may not inject is shown the faults, not switches that would only refuse (found by the dead-end crawl, 17 Nov 2026) */}
          {may ? <button type="button" className="ui-btn ui-btn--sm" role="switch" aria-checked={!!on[k]} data-testid={`eng-fault-${k}`} onClick={() => toggle(k)}>{on[k] ? 'Switch off' : 'Inject'}: {l}</button> : <b data-testid={`eng-fault-${k}-read`}>{l}</b>} {on[k] ? <Tag tone="bad">injected now</Tag> : <Tag tone="muted">off</Tag>} <span className="ui-muted">{what}</span></li>)}</ul>
      </Card>

      {ENG_DEMOS.map((D) => <details key={D.key} className="ln-dom eng__sheet" id={`eng-sheet-${D.key}`} data-testid={`eng-sheet-${D.key}`}>
        <summary><b>Inspection sheet {D.n} · {D.title}</b></summary>
        <dl className="san__defs">
          <div><dt>What to inspect</dt><dd><ul>{D.inspect.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
          <div><dt>Evidence states</dt><dd><ul>{D.evidence.map(([k, v]) => <li key={k}><Tag tone={toneOf(k)}>{k}</Tag> {v}</li>)}</ul></dd></div>
          <div><dt>Security boundary</dt><dd><ul>{D.boundary.map((x) => <li key={x}>{x}</li>)}</ul><p className="ui-meta">Enforced by the page’s own stores and the product’s engines; on the server the same rules are enforced by the API and the database.</p></dd></div>
          <div><dt>Source references</dt><dd><ul>{D.source.map(([f, fns]) => <li key={f}><code>{f}</code>: {fns}</li>)}</ul></dd></div>
          <div><dt>Tests that cover it</dt><dd><ul>{D.tests.map(([f, what]) => <li key={f}><code>{f}</code>: {what}</li>)}</ul></dd></div>
          <div><dt>Failure handling</dt><dd>{D.faults.length ? <ul>{D.faults.map((k) => { const f = FAULTS.find(([key]) => key === k)!; return <li key={k}>{f[1]}: {f[2]} {on[k] ? <Tag tone="bad">injected now</Tag> : <Tag tone="muted">off</Tag>}</li>; })}</ul> : <p>No fault is injected here: every refusal on this path is a rule of the product itself.</p>}</dd></div>
        </dl>
      </details>)}
    </section>
  );
}
