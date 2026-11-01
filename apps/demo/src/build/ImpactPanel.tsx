/**
 * The Impact panel of Build a Room: what the last change to the room did across the platform, as the engines compute it (impact.ts).
 * Calm by default — one line per product, details on request — and announced through an aria-live region that is mounted before the
 * first change, so a screen reader hears each update. The update fades in with a short transform/opacity transition (none under
 * prefers-reduced-motion, see demo.css). Every item links to the page that shows it.
 */
import { Tag } from '@empathia/ui';
import type { Impact } from './impact.js';
import { impactSentence } from './impact.js';
import { personaLabel, PREVIOUS_DEVICE } from './store.js';

const when = (s: string) => s.slice(11, 16);
const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'info'> = { match: 'ok', drift: 'warn', fail: 'bad', unknown: 'muted', na: 'muted', observed: 'info' };

export function ImpactPanel({ im, roomId }: { im: Impact | null; roomId: string }) {
  const c = im?.commissioning;
  return (
    <section className="impact" aria-labelledby="impact-h" data-testid="impact-panel">
      <h2 id="impact-h" className="build__h2">Impact of the last change</h2>
      <p className="ui-sr" aria-live="polite" aria-atomic="true" data-testid="impact-live">{im ? impactSentence(im) : ''}</p>
      {!im || !c ? <p className="impact__hint">Swap, add or remove a device and the engines recompute what the change touches: the commissioning plan, the relationship graph, the accepted baseline and every KPI the demonstration derives. Nothing here is written by hand. <a href={`#/story/${roomId}`}>The room’s story</a> keeps every change.</p> : (
        <div className="impact__body" key={`${im.at}|${im.change.type}|${im.change.to}`} data-testid="impact-body"
          data-added={c.added.map((t) => t.id).join(',')} data-removed={c.removed.map((t) => t.id).join(',')} data-kept={c.kept.length} data-coverage={c.coverageChanged.map((t) => t.id).join(',')} data-reopened={c.reopened.map((t) => t.id).join(',')}
          data-baseline={im.assurance.baseline ? `v${im.assurance.baseline.version}` : ''} data-baseline-untouched={String(im.assurance.untouched)}>
          <p className="impact__change"><b>{im.change.from && im.change.to ? <>{im.change.from} → {im.change.to}</> : im.change.to ? <>{im.change.to} added</> : <>{im.change.from} removed</>}</b>
            <span className="ui-meta"> · {personaLabel(im.by)} · {when(im.at)} UTC · {im.change.why ? <>why: “{im.change.why}”</> : 'no reason given'}</span></p>
          <ul className="impact__grid">
            <li className="impact__item" data-testid="impact-cx">
              <h3 className="impact__h">Commissioning</h3>
              <p className="impact__fig"><span>+{c.added.length}</span> added · <span>−{c.removed.length}</span> removed · <span>{c.kept.length}</span> unchanged</p>
              <p className="ui-meta">{c.applicable[0]} → {c.applicable[1]} applicable of {c.library} in the library · applicability engine {c.engineVersion}, re-run on the changed design</p>
              {!c.added.length && !c.removed.length && <p>No test added or removed: the engine judges the same tests to apply.</p>}
              {c.coverageChanged.length > 0 && <p data-testid="impact-coverage"><b>{c.coverageChanged.length} test{c.coverageChanged.length === 1 ? '' : 's'}</b> now cover {[...new Set(c.coverageChanged.flatMap((t) => t.to))].join(', ') || 'no device'} instead of {[...new Set(c.coverageChanged.flatMap((t) => t.from))].join(', ') || 'no device'}.{c.coverageChanged.some((t) => t.recordedBefore) && <> Their results ({[...new Set(c.coverageChanged.filter((t) => t.recordedBefore).map((t) => t.result))].join(', ')}) were recorded before the change, on the previous device.</>}</p>}
              {c.reopened.length > 0 && <div className="impact__reopened" data-testid="impact-reopened">
                <p><Tag tone="warn">re-verification required</Tag> <b>{c.reopened.length} test{c.reopened.length === 1 ? '' : 's'} reopened</b> by the substitution of {[...new Set(c.reopened.flatMap((t) => t.assets))].join(', ')} after baseline v{c.reverification.baseline} was accepted: {c.reopened.length === 1 ? 'its result was' : 'their results were'} recorded on the previous device and no longer count towards the re-acceptance. Each is re-run on the changed design and verified again by a different person; the earlier records stay in the history.</p>
                <details open><summary>Reopened tests and the engine’s reasons ({c.reopened.length})</summary><ul className="impact__list">{c.reopened.map((t) => <li key={t.id}><code>{t.id}</code> {t.label} <span className="ui-meta">{t.reasons.join(' · ')}</span> <span className="ui-meta">· result on record {t.result}{t.rerun ? ` · ${PREVIOUS_DEVICE}` : ' · re-run since'}</span></li>)}</ul></details>
              </div>}
              {c.statusChanged.length > 0 && <p>{c.statusChanged.length} test{c.statusChanged.length === 1 ? '' : 's'} changed execution state ({[...new Set(c.statusChanged.map((t) => `${t.from} → ${t.to}`))].join('; ')}).</p>}
              {(c.findings.raised.length > 0 || c.findings.resolved.length > 0) && <p>Design checks: {c.findings.raised.map((f) => <span key={f.key}><Tag tone="warn">{f.severity}</Tag> {f.title} raised. </span>)}{c.findings.resolved.map((f) => <span key={f.key}>{f.title} resolved. </span>)}</p>}
              {c.gate.to && <p className="impact__gate" data-testid="impact-gate">Next step {c.gate.from} → {c.gate.to}: {c.gate.after.length ? <>the engine refuses it today — {c.gate.after.join('; ')}</> : <>no engine condition blocks it{c.coverageChanged.some((t) => t.recordedBefore && !t.reopened) ? ' (outside a recommissioning substitution, the conditions read the result label of each test, not the device it was recorded on)' : ''}</>}.</p>}
              <details><summary>Tests and the engine’s reasons</summary>
                {c.added.length > 0 && <><p className="impact__sub">Added</p><ul className="impact__list">{c.added.map((t) => <li key={t.id}><code>{t.id}</code> {t.label} <span className="ui-meta">{t.reason} · {t.status}</span></li>)}</ul></>}
                {c.removed.length > 0 && <><p className="impact__sub">Removed</p><ul className="impact__list">{c.removed.map((t) => <li key={t.id}><code>{t.id}</code> {t.label} <span className="ui-meta">{t.reason}</span></li>)}</ul></>}
                {c.coverageChanged.length > 0 && <><p className="impact__sub">Covered device changed</p><ul className="impact__list">{c.coverageChanged.map((t) => <li key={t.id}><code>{t.id}</code> {t.label} <span className="ui-meta">{t.from.join(', ') || '—'} → {t.to.join(', ') || '—'} · result {t.result}{t.recordedBefore ? ', recorded before the change' : ''}{t.reopened ? ' · reopened' : ''}</span></li>)}</ul></>}
                <p className="impact__sub">Unchanged ({c.kept.length})</p><ul className="impact__list">{c.kept.map((t) => <li key={t.id}><code>{t.id}</code> <span className="ui-meta">{t.reason}</span></li>)}</ul>
              </details>
              <a className="impact__link" href="#/v25/build?tab=checks">Open the commissioning plan</a>
            </li>
            <li className="impact__item" data-testid="impact-sp">
              <h3 className="impact__h">Search Party</h3>
              {!im.search.length && <p>No device was added or removed, so no relationship changed.</p>}
              {im.search.map((g) => <div key={`${g.state}:${g.id}`} className="impact__dev">
                <p><Tag tone={g.state === 'added' ? 'info' : 'muted'}>{g.state}</Tag> <b>{g.label}</b></p>
                {!g.inGraph ? <p className="ui-meta">{g.label} is {g.why}.</p> : <>
                  <p className="ui-meta">{g.state === 'removed' ? 'No longer in the recorded graph. Before the change it had' : 'In the recorded graph with'} {g.relationships.length} relationship{g.relationships.length === 1 ? '' : 's'}: {g.relationships.map((r) => `${r.rel} ${r.other} (${r.provenance.split(' ')[0]})`).join('; ') || 'none'}.</p>
                  <p className="ui-meta">{g.state === 'removed' ? 'What depended on it' : 'What now depends on it'}: {g.dependents.length ? g.dependents.join(', ') : 'nothing recorded downstream'}.</p>
                  {g.state === 'added' && <a className="impact__link" href={g.href}>Open {g.label} in Search Party</a>}</>}
              </div>)}
            </li>
            <li className="impact__item" data-testid="impact-as">
              <h3 className="impact__h">Assurance</h3>
              {!im.assurance.baseline ? <p>No accepted baseline yet: Assurance has nothing to compare this change against. A baseline is published when the room is accepted.</p> : <>
                {im.assurance.presence && <p><b>Device presence</b> <Tag tone={STATUS_TONE[im.assurance.presence.before]}>{im.assurance.presence.beforeText}</Tag> → <Tag tone={STATUS_TONE[im.assurance.presence.after]}>{im.assurance.presence.afterText}</Tag> <span className="ui-meta">{im.assurance.presence.evidence}</span></p>}
                {(im.assurance.added.length > 0 || im.assurance.removed.length > 0 || im.assurance.changes.some((c) => c.kind === 'MODEL_SUBSTITUTED' || c.kind === 'UNIT_REPLACED')) && <p>The room now differs from baseline v{im.assurance.baseline.version}: {[im.assurance.removed.length ? `${im.assurance.removed.join(', ')} on the baseline, no longer in the room` : '', im.assurance.added.length ? `${im.assurance.added.join(', ')} in the room, not on the baseline` : '', ...im.assurance.changes.filter((c) => c.kind === 'MODEL_SUBSTITUTED').map((c) => `${c.id} carries ${c.toModel}, not the ${c.fromModel} on the baseline`), ...im.assurance.changes.filter((c) => c.kind === 'UNIT_REPLACED').map((c) => `${c.id} holds unit ${c.toUnit}, not ${c.fromUnit} on the baseline`)].filter(Boolean).join('; ')}.</p>}
                {im.assurance.presence?.fix && <p className="ui-meta">Assurance proposes: {im.assurance.presence.fix}.</p>}
                {im.assurance.changes.length > 0 && <ul className="ui-meta" data-testid="impact-assurance-changes">{im.assurance.changes.map((c) => <li key={`${c.id}${c.kind}`} data-kind={c.kind}>{c.kind === 'UNIT_REPLACED' ? `${c.id}: installation change — unit ${c.fromUnit} → ${c.toUnit}, same model ${c.toModel} (not a model drift)` : c.kind === 'MODEL_SUBSTITUTED' ? `${c.id}: model drift — ${c.fromModel} → ${c.toModel}${c.fromUnit || c.toUnit ? ` (unit ${c.fromUnit || '—'} → ${c.toUnit || '—'})` : ''}` : `${c.id}: ${c.kind === 'ADDED' ? 'not on the baseline' : 'on the baseline, no longer in the room'}`}</li>)}</ul>}
                <p data-testid="impact-baseline">Baseline v{im.assurance.baseline.version} ({im.assurance.baseline.state}, revision {im.assurance.baseline.revision ?? '—'}, {im.assurance.baseline.devices} devices, published by {personaLabel(im.assurance.baseline.by)}) is {im.assurance.untouched ? 'unchanged' : 'NOT unchanged — report this'}. It stays current while the room is recommissioned; only a new acceptance can move it, and that publishes v{im.assurance.baseline.version + 1}.</p>
              </>}
              <a className="impact__link" href="#/v25/build?tab=lifecycle">Open the baseline lineage</a>
            </li>
            <li className="impact__item" data-testid="impact-kpi">
              <h3 className="impact__h">Pro and Mission Control</h3>
              {!im.kpis.length && !im.stations.length && <p>No KPI passport and no Mission Control count changes as a result.</p>}
              {im.kpis.length > 0 && <ul className="impact__list">{im.kpis.map((k) => <li key={k.id}><a href="#/v25/exec">{k.label}</a> <span className="ui-meta">{k.from} → {k.to}</span></li>)}</ul>}
              {im.stations.length > 0 && <ul className="impact__list">{im.stations.map((s) => <li key={s.key}><a href="#/v25">Mission Control · {s.label}</a> <span className="ui-meta">{s.from} → {s.to}</span></li>)}</ul>}
              <p className="ui-meta">All 27 passports and 10 stations recomputed on both states at {when(im.at)} UTC; only those that differ are listed.</p>
            </li>
          </ul>
          {(im.design.drawings.length > 0 || im.design.classification) && <p className="impact__design ui-meta">Design records: {im.design.drawings.map((d) => `${d.label} ${d.from} → ${d.to}`).join('; ')}{im.design.drawings.length && im.design.classification ? '; ' : ''}{im.design.classification ? `classification ${im.design.classification.from} → ${im.design.classification.to}` : ''}. <a href="#/v25/build?tab=drawings">Open the drawings</a></p>}
          <p className="impact__foot"><a className="ui-btn ui-btn--sm" href={`#/story/${roomId}`}>See this change in the room’s story</a></p>
        </div>)}
    </section>
  );
}
