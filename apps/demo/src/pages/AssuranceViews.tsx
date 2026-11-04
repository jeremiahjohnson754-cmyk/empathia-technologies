/**
 * Assurance and Commissioning pages beside their command centers (V2.5.3 #/assurance/ready, /change, /signals, ?view=analysis and the
 * Commissioning deficiencies tab): computed from the thirty room records and the service workspace, each rule stated on the page.
 */
import { PageHero, StatTile, Card, Chip, Donut, List, ListRow, EmptyState, Icon, DataTable, ProgressBar, type Series } from '@empathia/ui';
import { allRecords, openIssues, type RoomRecord } from '../campus/design.js';
import { shortName, roomHref } from '../campus/canon.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaLabel, personaOf } from '../build/store.js';
import type * as S from '../workspace/store.js';
import { Foot, plural, pct } from './viz.js';
import { openable } from './V25Nav.js';
import { asState, cxState, AS, CX } from './Estate.js';
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
  const rows = recs.map((r) => ({ r, checks: readyChecks(r, w.incidents) })).map((x) => ({ ...x, fails: x.checks.filter((c) => !c.ok) }));
  const ready = rows.filter((x) => !x.fails.length); const notReady = rows.filter((x) => x.fails.length && accepted(x.r));
  const byCheck = rows[0]!.checks.map((c, k) => ({ key: c.id, label: c.label, value: rows.filter((x) => !x.checks[k]!.ok).length, tone: (['muted', 'warn', 'bad', 'bad', 'servicehands'] as Series[])[k]! }));
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-ready">
      <PageHero product="commissioning" icon="check" eyebrow="Assurance · ready checks" title="Ready for the next session"
        lede={<>Five checks before a room is trusted with its next meeting. <b>{plural(ready.length, 'room')}</b> pass all five; <b>{plural(notReady.length, 'accepted room')}</b> {notReady.length === 1 ? 'fails' : 'fail'} at least one.</>}
        meta={[<Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/ready" />
      <div className="wk-g2 wk-g2--wide">
        <Card icon="alert" tone="commissioning" title="Accepted rooms that are not ready" sub="Each failing check is named">
          {notReady.length ? <List label="Rooms not ready">{notReady.map((x) => <ListRow key={x.r.outline.id} title={roomName(x.r)} sub={x.fails.map((f) => `${f.label}: ${f.why}`).join(' · ')} href={roomHref(x.r.outline)} chevron leading={<Icon name="room" />} trailing={<Chip small tone="warn">{`${x.fails.length} of 5`}</Chip>} />)}</List> : <EmptyState title="Every accepted room is ready" icon="check" />}
        </Card>
        <Card icon="pulse" title="Which check stops a room" sub="Rooms failing each check (a room can fail several)"><Donut label="Failing rooms by check" total="fails" segments={byCheck} /></Card>
      </div>
      <Card icon="check" tone="ok" title="Ready" sub={`${plural(ready.length, 'room')} pass every check`}>
        {ready.length ? <div className="wk-chips">{ready.map((x) => <Chip key={x.r.outline.id} small tone="ok" href={roomHref(x.r.outline)} icon="check">{shortName(x.r.outline)}</Chip>)}</div> : <EmptyState title="No room passes all five" icon="inbox" />}
      </Card>
      <Foot>Ready checks read the room records and the service workspace; they are not live monitoring.</Foot>
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
        lede={<>A change never goes silently into the baseline. <b>{plural(replaced.length, 'unit')}</b> replaced, <b>{plural(reopened.reduce((a, r) => a + r.reopened.length, 0), 'test')}</b> reopened by it, <b>{plural(pend.length, 'new baseline')}</b> waiting for acceptance and <b>{plural(exc.length, 'exception')}</b> waiting for an independent reviewer.</>}
        meta={[<Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/change" />
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

export function SignalsPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const recs = allRecords();
  const sig = recs.map((r) => { const inc = w.incidents.filter((i) => i.roomId === r.outline.id); return { r, inc, rec: inc.filter((i) => i.recurrenceOf).length, low: openIssues(r).filter((i) => i.severity !== 'High').length }; }).filter((x) => x.inc.length || x.low);
  return (
    <section className="wk" data-native="workspace" data-testid="assurance-signals">
      <PageHero product="commissioning" icon="bell" eyebrow="Assurance · maintenance and experience signals" title="Early signals"
        lede={<>Before a room fails, it tells you: repeated service jobs, low and medium issues left open, recurrences. <b>{plural(sig.length, 'room')}</b> {sig.length === 1 ? 'sends' : 'send'} a signal; the strongest first.</>}
        meta={[<Chip key="m" small tone="muted">Signals from records, not sensors</Chip>, <Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <AssuranceTabs role={perspective} current="#/assurance/signals" />
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
  const open = defs.filter((x) => x.i.state !== 'RESOLVED');
  const sev = (['High', 'Medium', 'Low'] as const).map((s, k) => ({ key: s, label: s, value: open.filter((x) => x.i.severity === s).length, tone: (['bad', 'warn', 'info'] as Series[])[k]! }));
  return (
    <section className="wk" data-native="workspace" data-testid="cx-deficiencies">
      <PageHero product="commissioning" icon="alert" eyebrow="Commissioning · deficiencies" title="Open deficiencies"
        lede={<>Every commissioning deficiency that is not closed, most serious first. <b>{plural(open.length, 'deficiency', 'deficiencies')}</b> open in <b>{plural(new Set(open.map((x) => x.r.outline.id)).size, 'room')}</b>; {defs.length - open.length} resolved and kept.</>}
        meta={[<Chip key="p" small tone="muted">Acting as {personaLabel(persona)}</Chip>]} />
      <CxTabs role={perspective} current="#/commissioning/deficiencies" />
      <div className="wk-g2 wk-g2--wide">
        <Card icon="alert" tone="commissioning" title="Open, most serious first">
          {open.length ? <List label="Open deficiencies">{[...open].sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.i.severity) - ['High', 'Medium', 'Low'].indexOf(b.i.severity)).map((x) => <ListRow key={`${x.r.outline.id}:${x.i.id}`} title={x.i.title} sub={`${roomName(x.r)} · ${x.i.source} · room ${CX[x.cx.state].label.toLowerCase()}`} href={roomHref(x.r.outline)} chevron trailing={<Chip small tone={sev.find((s) => s.key === x.i.severity)!.tone}>{x.i.severity}</Chip>} />)}</List> : <EmptyState title="No deficiency is open" icon="check" />}
        </Card>
        <Card icon="pulse" title="By severity"><Donut label="Open deficiencies by severity" total="open" segments={sev} /></Card>
      </div>
      <Foot>Deficiencies are synthetic and come from the engine's design checks and the simulated commissioning.</Foot>
    </section>
  );
}
