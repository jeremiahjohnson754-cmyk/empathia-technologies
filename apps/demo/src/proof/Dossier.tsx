/**
 * #/dossier/<report> — the commissioning dossier of Atlas 4.218 (v1.6 reference SIM-REPORT-2026-11-08-001): 27 pass, 3 pending, 2 fail,
 * 29 of 32 evidence records, final acceptance HELD. The snapshot never changes. What a role does after it (record a retest, attach
 * evidence, raise a deficiency, verify independently, record acceptance) is replayed over it by @empathia/proof-registry, which also
 * refuses what the rules forbid: a pass without evidence, self-verification, acceptance while a blocker stands. The page shows a
 * step only to a role that may take it (D44); a rule's refusal, which the role is entitled to hear, is shown as an alert.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Chip, Card, StatTile, Segmented, EmptyState, Icon } from '@empathia/ui';
import { DOSSIER_4218 as D, type Authority, type DossierEvent, type WorkingTest } from '@empathia/proof-registry';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES, allows } from '../access/policy.js';
import { useViewAs } from '../viewas/context.js';
import { Crumbs, Zone, honest } from '../parity/ui.js';
import { useDossier, nowIso } from './store.js';
import { make, download, type Artifact, type Redaction } from './exports.js';

type Filter = 'attention' | 'all' | 'FAIL' | 'PENDING' | 'PASS';
const RESULT_TONE = { PASS: 'ok', PENDING: 'warn', FAIL: 'bad' } as const;
const RESULT_LABEL = { PASS: 'Pass', PENDING: 'Pending', FAIL: 'Fail' } as const;
const ACCEPTORS: RoleKey[] = ['svcmgr', 'ops', 'architect', 'qa']; const RECORDERS: RoleKey[] = ['cxeng', 'syseng', 'architect']; const VERIFIERS: RoleKey[] = ['qa', 'svcmgr', 'ops', 'architect'];
const names = (r: RoleKey[]) => r.map((k) => ROLES[k].label).join(', ');
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function describe(e: DossierEvent): string {
  switch (e.kind) {
    case 'RETEST': return `${e.by.label} retested ${e.test}: ${e.result === 'PASS' ? 'pass' : 'fail'}${e.evidence ? `, evidence ${e.evidence}` : ''}`;
    case 'EVIDENCE': return `${e.by.label} attached evidence ${e.evidence} to ${e.test}`;
    case 'VERIFY': return `${e.by.label} verified ${e.test}`;
    case 'RAISE': return `${e.by.label} raised ${e.id} against ${e.test}`;
    case 'ACCEPT': return `${e.by.label} recorded final acceptance`;
  }
}

export default function Dossier({ role, params, query, can, sees }: PageProps) {
  const va = useViewAs();
  const { events, working: w, act, reset } = useDossier();
  const [filter, setFilter] = useState<Filter>('attention');
  const [refusal, setRefusal] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);
  const [made, setMade] = useState<Artifact[]>([]); const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null); const alertRef = useRef<HTMLDivElement>(null);
  const me = useMemo(() => ({ role, label: ROLES[role].label }), [role]);
  const may: Authority = { record: can('dossier.record'), verify: can('dossier.verify'), raise: can('dossier.raise'), accept: can('dossier.accept') };
  useEffect(() => { setRefusal(null); setDone(null); }, [role]);
  useEffect(() => { if (query.get('focus') === 'export') exportRef.current?.scrollIntoView({ block: 'start' }); }, [query]);
  useEffect(() => { if (refusal) alertRef.current?.focus(); }, [refusal]);

  if (params['id'] && params['id'] !== D.id) return <div className="pa pf" data-native="" data-testid="dossier-missing"><Crumbs items={[['Commissioning & Assurance', '#/commissioning'], ['Dossier']]} /><h1 className="ui-visually-hidden">Dossier not found</h1><EmptyState title="No dossier with that report number" icon="search" action={<a className="ui-btn" href={`#/dossier/${D.id}`}>Open {D.id}</a>}>The demonstration holds one commissioning dossier, for {D.room.name}.</EmptyState></div>;

  const step = (e: DossierEvent, ok: string) => { const r = act(e, may); setRefusal(r); setDone(r ? null : ok); };
  const nextEvidence = (t: WorkingTest) => `EV-SIM-1${t.id.slice(-2)}`;
  const nextDef = () => `DEF-SIM-${String(w.deficiencies.length + 1).padStart(3, '0')}`;
  const attention = (t: WorkingTest) => t.result !== 'PASS' || !t.evidence || (t.changed && !t.verifiedBy);
  const shown = w.tests.filter((t) => (filter === 'all' ? true : filter === 'attention' ? attention(t) : t.result === filter));
  const held = w.acceptance === 'HELD';
  const redactions: Redaction[] = sees('dossier.evidence') ? ['engineering', 'executive'] : ['executive'];
  const doExport = async (kind: 'json' | 'csv', r: Redaction) => { setBusy(true); try { const a = await make(kind, w, r, me.label); download(a); setMade((m) => [a, ...m].slice(0, 6)); } catch { setRefusal('The file could not be made in this browser. Nothing was exported.'); } finally { setBusy(false); } };

  const rowActions = (t: WorkingTest) => {
    const out: JSX.Element[] = [];
    if (may.record && !(t.result === 'PASS' && t.evidence && !t.changed)) {
      if (t.result === 'PASS' && !t.evidence) out.push(<button key="ev" type="button" className="ui-btn ui-btn--sm" data-act="evidence" onClick={() => step({ kind: 'EVIDENCE', test: t.id, evidence: nextEvidence(t), by: me, at: nowIso() }, `Evidence ${nextEvidence(t)} attached to ${t.id}. It now awaits independent verification.`)}>Attach evidence</button>);
      else {
        out.push(<button key="p" type="button" className="ui-btn ui-btn--sm" data-act="pass" onClick={() => step({ kind: 'RETEST', test: t.id, result: 'PASS', evidence: nextEvidence(t), by: me, at: nowIso() }, `${t.id} retested: pass, with evidence ${nextEvidence(t)}. It now awaits independent verification.`)}>Retest: pass with evidence</button>);
        out.push(<button key="n" type="button" className="ui-btn ui-btn--sm" data-act="pass-bare" onClick={() => step({ kind: 'RETEST', test: t.id, result: 'PASS', evidence: null, by: me, at: nowIso() }, '')}>Retest: pass, no evidence</button>);
        if (t.result !== 'FAIL') out.push(<button key="f" type="button" className="ui-btn ui-btn--sm" data-act="fail" onClick={() => step({ kind: 'RETEST', test: t.id, result: 'FAIL', evidence: null, by: me, at: nowIso() }, `${t.id} retested: fail.`)}>Retest: fail</button>);
      }
    }
    if (may.raise && t.result === 'FAIL' && !w.deficiencies.some((x) => x.test === t.id && x.state !== 'CLOSED')) out.push(<button key="r" type="button" className="ui-btn ui-btn--sm" data-act="raise" onClick={() => step({ kind: 'RAISE', test: t.id, id: nextDef(), statement: `${t.name}: ${t.note || 'the test fails'}.`, by: me, at: nowIso() }, `${nextDef()} raised against ${t.id}.`)}>Raise a deficiency</button>);
    if (may.verify && t.changed && t.result === 'PASS' && t.evidence && !t.verifiedBy) out.push(<button key="v" type="button" className="ui-btn ui-btn--sm ui-btn--primary" data-act="verify" onClick={() => step({ kind: 'VERIFY', test: t.id, by: me, at: nowIso() }, `${t.id} verified by the ${me.label}.`)}>Verify</button>);
    return out;
  };
  const anyRowActions = may.record || may.raise || may.verify;

  return (
    <div className="pa pf" data-native="" data-testid="dossier" data-acceptance={w.acceptance}>
      <Crumbs items={[['Commissioning & Assurance', allows({ area: 'commissioning' }, role) ? '#/commissioning' : undefined], [D.room.name, `#/room/${D.room.id}`], ['Dossier']]} />
      <PageHero compact eyebrow={`${D.project} · commissioning`} title={held ? 'Acceptance held pending corrective action' : 'Final acceptance recorded'} product="commissioning" icon="shield"
        lede={`${D.scope}. Asset ${D.asset.id}, ${D.asset.kind.toLowerCase()}.`}
        meta={[<Chip key="s" small tone={held ? 'bad' : 'ok'}>{held ? 'Held' : 'Accepted'}</Chip>, ...honest(['Synthetic data', 'warn'], [`Report ${D.id}`, 'muted'])]} />

      <div className="kit-grid kit-grid--tiles" data-testid="dossier-totals">
        <StatTile testId="dossier-pass" label="Pass" value={w.totals.pass} tone="ok" hint={w.changed ? `snapshot ${D.totals.pass}` : `of ${w.totals.tests} tests`} />
        <StatTile testId="dossier-pending" label="Pending" value={w.totals.pending} tone="warn" hint={w.changed ? `snapshot ${D.totals.pending}` : 'not yet run or not complete'} />
        <StatTile testId="dossier-fail" label="Fail" value={w.totals.fail} tone="bad" hint={w.changed ? `snapshot ${D.totals.fail}` : 'each needs a deficiency'} />
        <StatTile testId="dossier-evidence" label="Evidence records" value={`${w.totals.evidence} of ${w.totals.tests}`} hint={w.changed ? `snapshot ${D.totals.evidence} of ${D.totals.tests}` : 'a pass counts only with one'} />
      </div>

      <section className={`pf-decision${held ? ' pf-decision--held' : ''}`} aria-labelledby="dec-h" data-testid="dossier-decision">
        <h2 id="dec-h">{held ? 'Decision required' : 'Accepted'}</h2>
        {held ? <p>{D.acceptanceReason}</p> : <p>Recorded by the {w.acceptedBy?.label}{w.acceptedAt ? ` on ${when(w.acceptedAt)}` : ''}. Every test passes with evidence, and every result recorded after the snapshot was independently verified. The record is closed.</p>}
        {held ? <>
          <h3 className="pf-h">{w.blockers.length} {w.blockers.length === 1 ? 'blocker' : 'blockers'} to acceptance</h3>
          {w.blockers.length ? <ul className="pf-blockers" data-testid="dossier-blockers">{w.blockers.map((b, i) => <li key={`${b.test}-${i}`}><a href={`#t-${b.test}`} onClick={(e) => { e.preventDefault(); setFilter('all'); setTimeout(() => document.getElementById(`t-${b.test}`)?.scrollIntoView({ block: 'center' }), 0); }}><code>{b.test}</code></a> {b.reason}</li>)}</ul> : <p className="pf-note">None. Acceptance can be recorded.</p>}
          {may.accept ? <p><button type="button" className="ui-btn ui-btn--primary" data-testid="dossier-accept" onClick={() => step({ kind: 'ACCEPT', by: me, at: nowIso() }, 'Final acceptance recorded. The dossier is closed.')}>Record final acceptance</button></p>
            : <p className="pf-note">Acceptance is recorded by the {names(ACCEPTORS)}.</p>}
        </> : null}
        {refusal ? <div ref={alertRef} tabIndex={-1} role="alert" className="pf-refusal" data-testid="dossier-refusal"><Icon name="alert" size={18} /><span>{refusal}</span></div> : null}
        {done && !refusal ? <p role="status" className="pf-done" data-testid="dossier-done"><Icon name="check" size={18} /><span>{done}</span></p> : null}
      </section>

      <Zone id="tests" title="Tests" note={`${w.totals.tests} acceptance tests in seven disciplines`}>
        <Segmented<Filter> label="Which tests" value={filter} onChange={setFilter} small options={[{ value: 'attention', label: 'Needs attention', count: w.tests.filter(attention).length }, { value: 'all', label: 'All', count: w.totals.tests }, { value: 'FAIL', label: 'Fail', count: w.totals.fail }, { value: 'PENDING', label: 'Pending', count: w.totals.pending }, { value: 'PASS', label: 'Pass', count: w.totals.pass }]} />
        {shown.length ? <div className="pa-table-wrap"><table className="pa-table pf-tests" data-testid="dossier-tests">
          <thead><tr><th scope="col">Test</th><th scope="col">Discipline</th><th scope="col">Result</th>{sees('dossier.evidence') ? <th scope="col">Evidence</th> : null}<th scope="col">State</th>{anyRowActions ? <th scope="col"><span className="ui-visually-hidden">Steps</span></th> : null}</tr></thead>
          <tbody>{shown.map((t) => { const acts = rowActions(t); return (
            <tr key={t.id} id={`t-${t.id}`} data-test={t.id} data-result={t.result} className={t.changed ? 'pf-changed' : undefined}>
              <th scope="row"><code>{t.id}</code><span className="pf-tests__name">{t.name}</span><span className="pf-tests__res"><Chip small tone={RESULT_TONE[t.result]}>{RESULT_LABEL[t.result]}</Chip> {t.discipline}</span>{t.note ? <span className="pf-note">{t.note}</span> : null}</th>
              <td>{t.discipline}</td>
              <td><Chip small tone={RESULT_TONE[t.result]}>{RESULT_LABEL[t.result]}</Chip></td>
              {sees('dossier.evidence') ? <td>{t.evidence ? <code>{t.evidence}</code> : <span className="pf-missing">None</span>}</td> : null}
              <td>{t.result !== 'PASS' ? '—' : !t.evidence ? 'Cannot be verified' : !t.changed ? 'In the snapshot' : t.verifiedBy ? `Verified by ${t.verifiedBy.label}` : `Recorded by ${t.recordedBy?.label}; awaits verification`}</td>
              {anyRowActions ? <td>{acts.length ? <div className="pa-row-actions">{acts}</div> : null}</td> : null}
            </tr>); })}</tbody>
        </table></div> : <EmptyState title="No test in this view" icon="check">Choose All to see every test.</EmptyState>}
      </Zone>

      <Zone title="Deficiencies" note="A failure is owned, corrected, retested and verified before it closes">
        <ul className="pf-defs" data-testid="dossier-defs">{w.deficiencies.map((x) => (
          <li key={x.id} data-def={x.id} data-state={x.state}>
            <header><code>{x.id}</code><Chip small tone={x.severity === 'P1' ? 'bad' : 'warn'}>{x.severity}</Chip><Chip small tone={x.state === 'CLOSED' ? 'ok' : 'muted'}>{x.state === 'CLOSED' ? 'Closed' : x.state === 'OPEN' ? 'Open' : 'Corrected, awaiting retest'}</Chip><span className="pf-note">against <code>{x.test}</code></span></header>
            <p>{x.statement}</p><p className="pf-note">Owner: {x.owner}. {x.action}</p>
          </li>))}</ul>
        {!w.changed ? <><h3 className="pf-h">Gaps in the snapshot itself</h3><ul className="pf-limits" data-testid="dossier-gaps">{D.gaps.map((g) => <li key={g}>{g}</li>)}</ul></> : null}
      </Zone>

      <Zone title="Who does what" note="A role sees a step only if it may take it">
        <div className="pf-who">
          <p><b>Record a result, attach evidence, raise a deficiency:</b> {names(RECORDERS)}.</p>
          <p><b>Verify a new result:</b> {names(VERIFIERS)}, and never the role that recorded it.</p>
          <p><b>Record final acceptance:</b> {names(ACCEPTORS)}; only when no blocker stands, and never a role that recorded or verified a result here.</p>
          <div className="pf-actions" role="group" aria-label="View this dossier as another role">{(['cxeng', 'qa', 'svcmgr', 'exec'] as RoleKey[]).filter((k) => k !== role).map((k) => <button key={k} type="button" className="ui-btn ui-btn--sm" data-viewas={k} onClick={() => va.switchTo(k)}>View as {ROLES[k].label}</button>)}</div>
        </div>
      </Zone>

      {events.length ? <Zone title="Recorded after the snapshot" note="In this browser only; the snapshot is unchanged">
        <ol className="pf-history" data-testid="dossier-history">{events.map((e, i) => <li key={i}><time dateTime={e.at}>{when(e.at)}</time><span>{describe(e)}</span></li>)}</ol>
        <p><button type="button" className="ui-btn ui-btn--sm" data-testid="dossier-reset" onClick={() => { reset(); setRefusal(null); setDone('The working record was cleared. The dossier shows the reference snapshot again.'); setFilter('attention'); }}>Return to the reference snapshot</button></p>
      </Zone> : null}

      {can('dossier.export') ? <div ref={exportRef}><Zone id="export" title="Export" note="One record, one replay: every file states the same numbers">
        <div className="kit-grid">{redactions.map((r) => (
          <Card key={r} title={r === 'engineering' ? 'Engineering export' : 'Executive export'} icon="download" sub={r === 'engineering' ? 'Every test with its evidence reference and who verified it' : 'Totals, blockers and deficiencies; no evidence references'}>
            <div className="pf-actions"><button type="button" className="ui-btn" disabled={busy} data-export={`json-${r}`} onClick={() => doExport('json', r)}>JSON snapshot</button><button type="button" className="ui-btn" disabled={busy} data-export={`csv-${r}`} onClick={() => doExport('csv', r)}>CSV of the tests</button></div>
          </Card>))}
          <Card title="Not built yet" icon="info" sub="Specified in the v1.6 Export Center"><p className="pf-note">PDF, DOCX, XLSX and the zipped evidence package are specified and not built. They are listed here rather than offered as buttons that do nothing.</p></Card>
        </div>
        {made.length ? <div className="pa-table-wrap"><table className="pa-table" data-testid="dossier-exports"><caption className="ui-visually-hidden">Files made in this session</caption><thead><tr><th scope="col">File</th><th scope="col">Basis</th><th scope="col">Size</th><th scope="col">SHA-256</th></tr></thead>
          <tbody>{made.map((a) => <tr key={a.at + a.name}><th scope="row">{a.name}</th><td>{a.basis === 'snapshot' ? 'Reference snapshot' : 'Working record'}</td><td className="num">{a.bytes.toLocaleString('en-GB')} bytes</td><td><code className="pf-wrap">{a.sha256}</code></td></tr>)}</tbody></table></div> : null}
        <p className="pf-note">Files are made in this browser and nothing is uploaded. The checksum is of exactly the bytes saved.</p>
      </Zone></div> : null}
    </div>
  );
}
