/**
 * Assurance and Commissioning pages beside their command centers (V2.5.3 #/assurance/ready, /change, /signals, ?view=analysis and the
 * Commissioning deficiencies tab): computed from the thirty room records and the service workspace, each rule stated on the page.
 */
import { useState } from 'react';
import { PageHero, StatTile, Card, Chip, Donut, List, ListRow, EmptyState, Icon, DataTable, ProgressBar, Segmented, type Series } from '@empathia/ui';
import { readyList, nextSession, READY_CHECKS, READY_OUT, CRIT_RULE, CHANGE_KINDS, changeImpact, changeTargets, plannedChanges, maintenanceSignals, deficiencyMeta, DUE_RULE, type ReadyOut, type ChangeKind } from '../assurance/model.js';
import { allRecords, openIssues, type RoomRecord } from '../campus/design.js';
import { shortName, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaLabel, personaOf } from '../build/store.js';
import type * as S from '../workspace/store.js';
import { Foot, plural, pct } from './viz.js';
import { openable } from './V25Nav.js';
import { asState, cxState, AS, CX } from './Estate.js';
import { DeficiencyBench } from './DeficiencyBench.js';
export { AssurancePage } from './Estate.js';

const DONE = ['CLOSED', 'CANCELLED'];
const roomName = (r: RoomRecord) => `${shortName(r.outline)} — ${r.outline.name}`;
const AS_TABS = [['#/assurance', 'Command center', 'pulse'], ['#/assurance?view=analysis', 'Analysis', 'chart'], ['#/assurance/ready', 'Ready checks', 'check'], ['#/assurance/change', 'Change impact', 'route'], ['#/assurance/signals', 'Signals', 'bell']] as const;
export function AssuranceTabs({ role, current }: { role: string; current: string }) {
  return <nav className="wk-v25nav" aria-label="Assurance pages">{AS_TABS.filter(([h]) => openable(role, h)).map(([h, l, i]) => <Chip key={h} href={h} small icon={i} selected={h === current}>{l}</Chip>)}</nav>;
}
const CX_TABS = [['#/commissioning', 'Command center', 'pulse'], ['#/commissioning/deficiencies', 'Deficiencies', 'alert']] as const;
export function CxTabs({ role, current }: { role: string; current: string }) {
  return <nav className="wk-v25nav" aria-label="Commissioning pages">{CX_TABS.filter(([h]) => openable(role, h)).map(([h, l, i]) => <Chip key={h} href={h} small icon={i} selected={h === current}>{l}</Chip>)}</nav>;
}
const accepted = (r: RoomRecord) => r.lifecycle === 'ACCEPTED' || r.lifecycle === 'OPERATIONAL';

/** The checks a room must pass before its next session, each with its reason (V2.5.3 "Ready checks before sessions"). */
export function readyChecks(r: RoomRecord, incidents: S.Incident[]): Array<{ id: string; label: string; ok: boolean; why: string }> {
  const cur = r.baselines.find((b) => b.state === 'CURRENT'); const high = openIssues(r).filter((i) => i.severity === 'High'); const jobs = incidents.filter((i) => i.roomId === r.outline.id && !DONE.includes(i.state));
  return [
    { id: 'accepted', label: 'Accepted for use', ok: accepted(r), why: accepted(r) ? r.lifecycle.toLowerCase() : `lifecycle is ${r.lifecycle.replace(/_/g, ' ').toLowerCase()}` },
    { id: 'baseline', label: 'A current baseline', ok: !!cur, why: cur ? `v${cur.version} since ${cur.at.slice(0, 10)}` : 'none on record' },
    { id: 'failed', label: 'No failed test', ok: !r.counts.failed, why: r.counts.failed ? `${r.counts.failed} failed` : `${r.counts.verified} of ${r.counts.applicable} verified` },
    { id: 'high', label: 'No high-severity issue open', ok: !high.length, why: high[0]?.title || 'none open' },
    { id: 'service', label: 'No service job open in the room', ok: !jobs.length, why: jobs[0] ? `${jobs[0].id} ${jobs[0].state}` : 'none open' },
  ];
}

export function AssuranceAnalysisPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const recs = allRecords();
  const rows = recs.map((r) => ({ r, s: asState(r, w.incidents), c: r.counts }));
  const tot = rows.reduce((a, x) => ({ v: a.v + x.c.verified, f: a.f + x.c.failed, n: a.n + x.c.notTested, ap: a.ap + x.c.applicable }), { v: 0, f: 0, n: 0, ap: 0 });
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-analysis">
      <PageHero product="commissioning" icon="chart" eyebrow="Assurance · engineering analysis" title="Drift, test by test"
        lede={<>The engineering view behind the summary: for each room, how many of its applicable tests are verified, failed or still untested, and why it sits where it does. <b>{tot.v.toLocaleString('en-GB')}</b> of {tot.ap.toLocaleString('en-GB')} applicable tests verified; <b>{tot.f}</b> failed.</>}
        meta={[<Chip key="m" small tone="muted">Modelled · not live monitoring</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance?view=analysis" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Tests verified" value={pct(tot.v, tot.ap)} unit="%" icon="check" tone="ok" hint={`${tot.v} of ${tot.ap}`} />
        <StatTile label="Tests failed" value={tot.f} icon="alert" tone="bad" />
        <StatTile label="Not yet tested" value={tot.n} icon="clock" tone="muted" hint="Mostly rooms of the earlier records, which hold no results" />
        <StatTile label="Rooms drifted or failed" value={rows.filter((x) => x.s.state === 'drift' || x.s.state === 'failed').length} unit={`of ${recs.length}`} icon="filter" tone="warn" />
      </div>
      <Card icon="room" title="Every room against its baseline" pad={false}>
        <DataTable responsive dense rows={rows} rowKey={(x) => x.r.outline.id} caption="Rooms against their baselines" columns={[
          { key: 'room', header: 'Room', render: (x) => <a href={roomHref(x.r.outline)}>{roomName(x.r)}</a>, sort: (x) => x.r.outline.id },
          { key: 's', header: 'State', render: (x) => <Chip small tone={AS[x.s.state].tone}>{AS[x.s.state].label}</Chip>, sort: (x) => x.s.state },
          { key: 'v', header: 'Verified', render: (x) => <ProgressBar small label={`${shortName(x.r.outline)} tests verified`} showValue value={x.c.verified} max={Math.max(1, x.c.applicable)} valueText={`${x.c.verified}/${x.c.applicable}`} tone={x.c.failed ? 'bad' : 'ok'} />, sort: (x) => pct(x.c.verified, x.c.applicable) },
          { key: 'why', header: 'Why', render: (x) => x.s.why, minor: true },
        ]} />
      </Card>
      <Foot>The analysis reads the same synthetic records as the summary; it is not live monitoring.</Foot>
    </section>
  );
}

export function ReadyPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const recs = allRecords();
  const list = readyList(w.incidents, recs); const n = (k: ReadyOut) => list.filter((x) => x.out === k).length;
  const [scope, setScope] = useState<'all' | ReadyOut>('all'); const shown = scope === 'all' ? list : list.filter((x) => x.out === scope);
  const byCheck = READY_CHECKS.map((c, k) => ({ key: c.key, label: c.label, value: list.filter((x) => x.checks[k]!.out === 'attention' || x.checks[k]!.out === 'note').length, tone: (list.some((x) => x.checks[k]!.out === 'attention') ? 'bad' : 'warn') as Series })).filter((x) => x.value);
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-ready">
      <PageHero product="commissioning" icon="check" eyebrow="Assurance · ready checks" title="Room ready check"
        lede={<>Eleven checks before the next session, for every high and mission-critical room in use. One answer for each room: <b>{n('ready')}</b> ready, <b>{n('note')}</b> ready with a note, <b>{n('attention')}</b> {n('attention') === 1 ? 'needs' : 'need'} someone to act first.</>}
        meta={[<Chip key="m" small tone="muted">Synthetic sessions · not production monitoring</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/ready" />
      <div className="kit-grid kit-grid--tiles wk-tiles3" data-testid="tiles">
        <StatTile label="Ready" value={n('ready')} unit={`of ${list.length}`} icon="check" tone="ok" hint="Every check that applies passes" />
        <StatTile label="Ready with note" value={n('note')} icon="info" tone="warn" hint="Usable, with something to know" />
        <StatTile label="Attention required" value={n('attention')} icon="alert" tone="bad" hint="Someone has to act first" />
      </div>
      <div className="wk-g2 wk-g2--wide">
        <Card icon="calendar" tone="commissioning" title="Next sessions" sub="Least ready first, mission-critical rooms before high" testId="ready-sessions">
          <div className="wk-filters"><Segmented label="Show" value={scope} onChange={(v) => setScope(v as typeof scope)} options={[{ value: 'all', label: 'All' }, { value: 'attention', label: 'Attention', disabled: !n('attention') }, { value: 'note', label: 'With a note', disabled: !n('note') }, { value: 'ready', label: 'Ready' }]} /></div>
          {shown.length ? <List label="Next sessions">{shown.slice(0, 12).map((x) => { const s = nextSession(x.room, w); return <ListRow key={x.room.outline.id} testId={`ready-${x.room.outline.id}`} title={roomName(x.room)} sub={`${s.title} · ${s.at}${s.generated ? '' : ' (booked)'}${x.first ? ` · ${x.first.label}: ${x.first.why}` : ' · every check passes'} · ${x.evidence}% of tests verified · ${x.crit.toLowerCase()}`} href={`#/assurance/room/${x.room.outline.id}/ready`} chevron leading={<Icon name="room" />} trailing={<Chip small tone={READY_OUT[x.out].tone}>{READY_OUT[x.out].label}</Chip>} />; })}</List> : <EmptyState title="No room in this group" icon="check" />}
          {shown.length > 12 ? <p className="wk-note">{shown.length - 12} more rooms in this group.</p> : null}
        </Card>
        <Card icon="pulse" title="Which check holds a room back" sub="Rooms with a note or needing attention, by check">{byCheck.length ? <Donut label="Rooms held back, by check" total="rooms" segments={byCheck} /> : <EmptyState title="No check holds a room back" icon="check" />}
          <details className="wk-rules"><summary>How a room is answered</summary><dl className="wk-kv">{(Object.keys(READY_OUT) as ReadyOut[]).map((k) => [<dt key={`${k}t`}><Chip small tone={READY_OUT[k].tone}>{READY_OUT[k].label}</Chip></dt>, <dd key={`${k}d`}>{READY_OUT[k].rule}</dd>])}<dt>Which rooms</dt><dd>{CRIT_RULE}</dd></dl></details>
        </Card>
      </div>
      <Foot>Sessions come from the workspace’s bookings where a room has one; the rest are generated for this demonstration. No calendar is read and no real meeting is shown.</Foot>
    </section>
  );
}

export function ChangePage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const recs = allRecords();
  const pend = recs.filter((r) => r.baselines.some((b) => b.state === 'PENDING_ACCEPTANCE'));
  const reopened = recs.filter((r) => r.reopened.length);
  const exc = recs.filter((r) => r.exception);
  const replaced = recs.flatMap((r) => r.installations.filter((i) => i.removedAt).map((i) => ({ r, i })));
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-change">
      <PageHero product="commissioning" icon="route" eyebrow="Assurance · change impact" title="What a change reopens"
        lede={<>Before a change is made, the records show what depends on it; after it is made, the checks it could affect are run again. A change never goes silently into the baseline. <b>{plural(replaced.length, 'unit')}</b> replaced, <b>{plural(reopened.reduce((a, r) => a + r.reopened.length, 0), 'test')}</b> reopened by it, <b>{plural(pend.length, 'new baseline')}</b> waiting for acceptance and <b>{plural(exc.length, 'exception')}</b> waiting for an independent reviewer.</>}
        meta={[<Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/change" />
      <ChangesWaiting />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">
        <StatTile label="Units replaced" value={replaced.length} icon="undo" tone="info" />
        <StatTile label="Tests reopened" value={reopened.reduce((a, r) => a + r.reopened.length, 0)} icon="shield" tone="warn" hint="By the shared reverification rule" />
        <StatTile label="Baselines waiting" value={pend.length} icon="clock" tone="warn" />
        <StatTile label="Exceptions pending" value={exc.length} icon="lock" tone="bad" />
      </div>
      <div className="wk-g2">
        <Card icon="undo" title="Replacements" sub="Removed units stay in the history">
          {replaced.length ? <List label="Replacements">{replaced.map(({ r, i }) => <ListRow key={`${r.outline.id}:${i.asset}`} title={`${i.asset} removed from ${i.position}`} sub={`${roomName(r)} · ${i.removalReason || i.reason} · ${(i.removedAt || '').slice(0, 10)}`} href={`#/replay/${r.outline.id}`} chevron leading={<Icon name="device" />} />)}</List> : <EmptyState title="No replacement on record" icon="check" />}
        </Card>
        <Card icon="shield" title="Tests the change reopened">
          {reopened.length ? <List label="Reopened tests">{reopened.flatMap((r) => r.reopened.slice(0, 6).map((t) => <ListRow key={`${r.outline.id}:${t.testId}`} title={t.testId} sub={`${shortName(r.outline)} · ${t.reasons.join('; ')}`} href={roomHref(r.outline)} />))}</List> : <EmptyState title="No test reopened" icon="check" />}
        </Card>
      </div>
      <Card icon="clock" title="Waiting for acceptance or review">
        {pend.length + exc.length ? <List label="Waiting">{[...pend.map((r) => { const b = r.baselines.find((x) => x.state === 'PENDING_ACCEPTANCE')!; return <ListRow key={`b${r.outline.id}`} title={`${roomName(r)} · baseline v${b.version}`} sub={b.note} href={roomHref(r.outline)} chevron trailing={<Chip small tone="warn">Waiting for acceptance</Chip>} />; }),
          ...exc.map((r) => <ListRow key={`e${r.outline.id}`} title={`${r.exception!.id} · ${roomName(r)}`} sub={`${r.exception!.finding} · requested by ${personaLabel(r.exception!.requester)}`} href={roomHref(r.outline)} chevron trailing={<Chip small tone="bad">Independent review</Chip>} />)]}</List> : <EmptyState title="Nothing is waiting" icon="check" />}
      </Card>
      <Foot>Change impact is computed from the synthetic room records; no change was made to real equipment.</Foot>
    </section>
  );
}

/** The changes waiting, each with what it reaches and the plan to validate it, and a simulator for any other change (V2.5.3
 *  #/assurance/change: changeImpact and validationPlanOf). Nothing is changed on real equipment. */
function ChangesWaiting() {
  const { w } = useWorkspace(); const recs = allRecords(); const waiting = plannedChanges(recs, w.incidents);
  const [kind, setKind] = useState<ChangeKind>('network'); const targets = changeTargets(kind, recs); const [target, setTarget] = useState(targets[0]?.id || '');
  const [sim, setSim] = useState<{ kind: ChangeKind; target: string } | null>(null);
  const pick = (k: ChangeKind) => { setKind(k); setTarget(changeTargets(k, recs)[0]?.id || ''); setSim(null); };
  const reach = (kd: ChangeKind, tg: string) => { const i = changeImpact(kd, tg, recs); return `${plural(i.rooms.length, 'room')}, ${plural(i.devices, 'device')}${i.crit.length ? `, ${plural(i.crit.length, 'mission-critical room')}` : ''}`; };
  return (<>
    <Card icon="route" tone="commissioning" title="Changes waiting to be made" sub={`${waiting.length} in this demonstration · impact assessed`} testId="change-waiting">
      <ul className="as-remedy">{waiting.map((c) => <li key={c.id} data-testid={`change-${c.id}`}><details><summary><span className="as-remedy__t"><b>{c.name}</b><span>{CHANGE_KINDS.find((k) => k.key === c.kind)!.label} · {reach(c.kind, c.target)}</span></span><Chip small tone="info">Impact assessed</Chip></summary><Plan kind={c.kind} target={c.target} /></details></li>)}</ul>
    </Card>
    <Card icon="filter" title="Simulate another change" sub="Six kinds · what it reaches, and the checks to run before and after" testId="change-sim">
      <div className="wk-filters"><Segmented label="Kind of change" value={kind} onChange={(v) => pick(v as ChangeKind)} options={CHANGE_KINDS.map((k) => ({ value: k.key, label: k.label.replace(' change', '').replace(' update', '').replace('Device replacement', 'Device') }))} /></div>
      <div className="wk-filters"><label className="ops-field">What changes<select value={target} onChange={(e) => { setTarget(e.target.value); setSim(null); }} data-testid="change-target">{targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => setSim({ kind, target })} disabled={!target || (sim?.kind === kind && sim.target === target)} data-testid="change-find">Find what it reaches</button></div>
      <p className="wk-note">{CHANGE_KINDS.find((k) => k.key === kind)!.label}: {CHANGE_KINDS.find((k) => k.key === kind)!.reach.toLowerCase()}, then {CHANGE_KINDS.find((k) => k.key === kind)!.dims.length} assurance dimensions run again ({CHANGE_KINDS.find((k) => k.key === kind)!.dims.join(', ')}).</p>
      {sim ? <div data-testid="change-result"><p><b>{reach(sim.kind, sim.target)}</b></p><Plan kind={sim.kind} target={sim.target} /></div> : null}
    </Card>
  </>);
}
function Plan({ kind, target }: { kind: ChangeKind; target: string }) {
  const i = changeImpact(kind, target);
  if (!i.rooms.length) return <p className="wk-note">The change reaches no room on the record.</p>;
  const back = kind === 'network' || kind === 'firmware' || kind === 'control' ? 'Keep the previous version ready to reload. Go back if a mission-critical room fails or more than one room in ten is degraded.' : 'Keep what was removed until the checks pass.';
  return <div className="stack" data-testid="change-plan">
    <ol className="as-plan">
      <li><b>Before.</b> Run the {i.kind.dims.length} affected assurance dimensions in every room and keep the result: that is what “unchanged” will mean afterwards.</li>
      <li><b>Window.</b> Outside booked hours. {i.crit.length ? `${plural(i.crit.length, 'mission-critical room')} checked first; a fallback room is named for each.` : 'No mission-critical room is reached.'}</li>
      <li><b>After.</b> Run the same {i.tests} checks across {plural(i.rooms.length, 'room')}, in {plural(i.waves.length, 'wave')}: {i.waves.map((x) => `${x.crit.toLowerCase()} (${x.rooms.length})`).join(', then ')}. A room passes when every check still matches its baseline. About {plural(i.hours, 'hour')} of checking.</li>
      <li><b>Go back.</b> {back}</li>
    </ol>
    <div className="wk-chips">{i.rooms.slice(0, 12).map((r) => <Chip key={r.outline.id} small href={`#/assurance/room/${r.outline.id}`} tone={i.crit.includes(r) ? 'bad' : 'muted'}>{shortName(r.outline)}</Chip>)}{i.rooms.length > 12 ? <Chip small tone="muted">{`+${i.rooms.length - 12} more`}</Chip> : null}</div>
  </div>;
}

export function SignalsPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const recs = allRecords();
  const dev = maintenanceSignals(w.incidents, recs);
  const sig = recs.map((r) => { const inc = w.incidents.filter((i) => i.roomId === r.outline.id); return { r, inc, rec: inc.filter((i) => i.recurrenceOf).length, low: openIssues(r).filter((i) => i.severity !== 'High').length }; }).filter((x) => x.inc.length || x.low);
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-signals">
      <PageHero product="commissioning" icon="bell" eyebrow="Assurance · maintenance and experience signals" title="Early signals"
        lede={<>Before a room fails, it tells you: repeated service jobs, low and medium issues left open, recurrences. <b>{plural(dev.length, 'device')}</b> {dev.length === 1 ? 'shows' : 'show'} two or more signs that point the same way; <b>{plural(sig.length, 'room')}</b> {sig.length === 1 ? 'sends' : 'send'} a signal; the strongest first.</>}
        meta={[<Chip key="m" small tone="muted">Signals from records, not sensors</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/signals" />
      <Card icon="device" tone="commissioning" title="Early maintenance signals" sub={`${plural(dev.length, 'device')} · inspection recommended`} testId="signals-devices">
        {dev.length ? <ul className="as-signals">{dev.map((d) => <li key={d.deviceId} data-testid={`signal-${d.deviceId}`}><div className="as-signal__h"><Chip small tone="warn">Inspection recommended</Chip><b>{shortName(d.room.outline)} · {d.label}</b></div>
          <ul className="as-signal__ev">{d.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          <p className="wk-note"><Chip small tone="muted">Inferred</Chip> Signs from the records that point the same way. This is not a prediction of when the device will fail, and no date is given.</p>
          <div className="wk-chips">{openable(perspective, `#/campus/scouter?cat=${d.cat}`) ? <Chip small icon="search" href={`#/campus/scouter?cat=${d.cat}`}>Ask Scouter for replacement options</Chip> : null}{openable(perspective, `#/lite/room/${d.room.outline.id}?device=${encodeURIComponent(d.deviceId)}`) ? <Chip small icon="device" href={`#/lite/room/${d.room.outline.id}?device=${encodeURIComponent(d.deviceId)}`}>Device card</Chip> : null}<Chip small icon="shield" href={`#/assurance/room/${d.room.outline.id}`}>{shortName(d.room.outline)} in Assurance</Chip></div></li>)}</ul>
          : <EmptyState title="No device shows two signs" icon="check">A device is listed when at least two records point the same way: service jobs, recurrences, an open issue on it, a replaced unit, or its age against its service life.</EmptyState>}
      </Card>
      <Card icon="bell" tone="commissioning" title="Rooms sending a signal" sub="Service jobs on record, recurrences and minor issues still open">
        {sig.length ? <List label="Signals">{[...sig].sort((a, b) => b.rec * 3 + b.inc.length + b.low - (a.rec * 3 + a.inc.length + a.low)).map((x) => <ListRow key={x.r.outline.id} title={roomName(x.r)} sub={[x.inc.length ? plural(x.inc.length, 'service job') : '', x.rec ? plural(x.rec, 'recurrence') : '', x.low ? plural(x.low, 'minor issue') + ' open' : ''].filter(Boolean).join(' · ')} href={roomHref(x.r.outline)} chevron leading={<Icon name="pulse" />} trailing={x.rec ? <Chip small tone="apex">Recurring</Chip> : <Chip small tone="info">Watch</Chip>} />)}</List> : <EmptyState title="No signal" icon="check" />}
      </Card>
      <Foot>No sensor or live telemetry is connected; these signals are read from synthetic records.</Foot>
    </section>
  );
}

export function DeficienciesPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const recs = allRecords();
  const defs = recs.flatMap((r) => r.issues.map((i) => ({ r, i, cx: cxState(r) })));
  const open = defs.filter((x) => x.i.state !== 'RESOLVED').map((x) => ({ ...x, m: deficiencyMeta(x.r, x.i) }));
  const late = open.filter((x) => x.m.late); const owners = [...new Set(open.map((x) => x.m.owner))].map((o) => ({ o, n: open.filter((x) => x.m.owner === o).length, late: open.filter((x) => x.m.owner === o && x.m.late).length }));
  const sev = (['High', 'Medium', 'Low'] as const).map((s, k) => ({ key: s, label: s, value: open.filter((x) => x.i.severity === s).length, tone: (['bad', 'warn', 'info'] as Series[])[k]! }));
  return (
    <section className="wk" data-native="workspace" data-testid="cx-deficiencies">
      <PageHero product="commissioning" icon="alert" eyebrow="Commissioning · deficiencies" title="Open deficiencies"
        lede={<>What commissioning found and has not yet closed, most serious first, each with its owner and a target date. <b>{plural(open.length, 'deficiency', 'deficiencies')}</b> open in <b>{plural(new Set(open.map((x) => x.r.outline.id)).size, 'room')}</b>; {defs.length - open.length} resolved and kept.</>}
        meta={[<Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <CxTabs role={perspective} current="#/commissioning/deficiencies" />
      <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="tiles">{sev.map((x) => <StatTile key={x.key} label={x.label} value={x.value} icon="alert" tone={x.tone} hint="open" />)}<StatTile label="Past the target date" value={late.length} icon="clock" tone="bad" hint={`of ${open.length} open`} /></div>
      <div className="wk-g2">
        <Card icon="clock" tone="commissioning" title="Past the target date" sub={late.length ? `${late.length} open past target` : 'None'} testId="cx-late">{late.length ? <List label="Past the target date">{late.map((x) => <ListRow key={`${x.r.outline.id}:${x.i.id}`} title={x.i.title} sub={`${shortName(x.r.outline)} · ${x.m.owner} · found ${x.m.found} · due ${x.m.due}`} href={roomHref(x.r.outline)} chevron trailing={<Chip small tone="bad">Past target</Chip>} />)}</List> : <EmptyState title="Nothing is past its target" icon="check" />}</Card>
        <Card icon="users" title="Who has to act" testId="cx-owners"><List label="Who has to act">{owners.map((x) => <ListRow key={x.o} title={x.o} sub={x.late ? `${x.late} past target` : 'none past target'} trailing={<Chip small tone={x.late ? 'bad' : 'info'}>{String(x.n)}</Chip>} />)}</List><p className="wk-note">{DUE_RULE}</p></Card>
      </div>
      <div className="wk-g2 wk-g2--wide">
        <Card icon="alert" tone="commissioning" title="Open, most serious first">
          {open.length ? <List label="Open deficiencies">{[...open].sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.i.severity) - ['High', 'Medium', 'Low'].indexOf(b.i.severity)).map((x) => <ListRow key={`${x.r.outline.id}:${x.i.id}`} title={x.i.title} sub={`${roomName(x.r)} · ${x.i.source} · ${x.m.owner} · due ${x.m.due}${x.m.late ? ' · past target' : ''} · room ${CX[x.cx.state].label.toLowerCase()}`} href={roomHref(x.r.outline)} chevron trailing={<Chip small tone={sev.find((s) => s.key === x.i.severity)!.tone}>{x.i.severity}</Chip>} />)}</List> : <EmptyState title="No deficiency is open" icon="check" />}
        </Card>
        <Card icon="pulse" title="By severity"><Donut label="Open deficiencies by severity" total="open" segments={sev} /></Card>
      </div>
      <DeficiencyBench persona={persona} items={[...open].sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.i.severity) - ['High', 'Medium', 'Low'].indexOf(b.i.severity)).slice(0, 80).map((x) => ({ r: x.r, i: x.i, found: x.m.found }))} />
      <Foot>Deficiencies are synthetic and come from the engine's design checks and the simulated commissioning.</Foot>
    </section>
  );
}
