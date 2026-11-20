/** #/commissioning/scenarios — the five reference commissioning journeys (./campus/scenarios.ts), each stage read from its room's record,
 *  each with what the system detected and what it blocks. Synthetic rooms; how close each is to its brief is stated. */
import { useMemo } from 'react';
import { PageHero, Card, Tag, Notice } from '@empathia/ui';
import { SCENARIOS, journey, scenarioRoomName, type StageState } from '../campus/scenarios.js';
import { syntheticHistory, workspaceJobs } from '../service/history.js';
import { load as loadDesk } from '../decisions/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel } from '../build/store.js';

const TONE: Record<StageState, 'ok' | 'warn' | 'bad' | 'muted'> = { done: 'ok', open: 'warn', blocked: 'bad', 'not-reached': 'muted', none: 'muted' };
const WORD: Record<StageState, string> = { done: 'Done', open: 'In progress', blocked: 'Blocked', 'not-reached': 'Not reached', none: 'Not applicable' };

export function ScenariosPage({ perspective }: { perspective: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace(); const desk = useMemo(() => loadDesk(), []);
  const projectOf = useMemo(() => { const m = new Map(desk.projects.filter((p) => p.roomId).map((p) => [p.roomId!, p.id])); return (room: string) => m.get(room) || null; }, [desk]);
  const jobs = useMemo(() => [...syntheticHistory(projectOf), ...workspaceJobs(w, projectOf)], [w, projectOf]);
  return (
    <section className="wk" data-native="workspace" data-testid="scenarios">
      <PageHero product="commissioning" icon="layers" eyebrow="Commissioning · reference journeys" title="Five commissioning journeys, end to end"
        lede={<>Request, design intent, inventory, checklist, execution, measurement, evidence, deficiency, repair, retest, documentation, acceptance and assurance — every stage read from the room’s own record, with what the system detected and what it blocks. Synthetic rooms of the estate. Acting as <b>{personaLabel(persona)}</b>.</>} />
      {SCENARIOS.map((s) => { const j = journey(s, jobs, projectOf); return (
        <Card key={s.key} icon="building" title={`${s.key} · ${s.name}`} sub={`${scenarioRoomName(s)} (${s.room}) · ${j.r.lifecycle.toLowerCase().replace(/_/g, ' ')}`} testId="scenario">
          <p className="ui-meta" data-testid="scenario-fit"><b>Brief:</b> {s.brief} <b>On the estate:</b> {s.fit}.</p>
          <ol className="phr__tiles" data-testid="scenario-stages" data-key={s.key}>{j.stages.map((x, i) => <li key={x.name} className={`phr__tile phr__tile--${TONE[x.state]}`} data-testid="scenario-stage" data-state={x.state}><span className="ui-meta">{i + 1} · {x.name}</span><b><a href={x.href}>{WORD[x.state]}</a></b><span className="ui-meta">{x.detail}</span></li>)}</ol>
          <div data-testid="scenario-failures">{j.failures.length ? <Notice tone="warn"><b>Detected:</b> {j.failures.join(' · ')}</Notice> : <Notice tone="ok">No open failure on the record.</Notice>}</div>
        </Card>); })}
      <p className="wk-note">Each room is the closest on the synthetic estate to its brief; the difference is stated beside each. Nothing on this page is typed for the scenario: change the room’s record and its journey changes.</p>
    </section>
  );
}
