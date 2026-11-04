/** #/agent (the Room Health Check) and #/agent/architecture (from a health check to a discovery agent): V2.5.3 08-agent views. */
import { PageHero, Card, StatTile, Tag, ProgressBar } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { shortName } from '../campus/canon.js';
import { useCore, honest, Crumbs, Zone, Bars } from './ui.js';
import { CHECKS, PARTS, runsOf, hasAgent, type Outcome } from './agent.js';
import { hhmm } from './core.js';

const OUT: Record<Outcome, [string, 'ok' | 'bad' | 'warn' | 'muted']> = { pass: ['pass', 'ok'], fault: ['real fault', 'bad'], 'false-alarm': ['false alarm', 'warn'], 'not-applicable': ['no device', 'muted'] };
export const outcomeTag = (o: Outcome) => <Tag tone={OUT[o][1]}>{OUT[o][0]}</Tag>;

export default function AgentPage({ hash }: PageProps) {
  return <div className="pa" data-testid="parity-agent">{/\/architecture/.test(hash) ? <Architecture /> : <HealthCheck />}</div>;
}

function HealthCheck() {
  const core = useCore(); const runs = runsOf(core.rooms);
  const without = core.rooms.filter((r) => !hasAgent(r)).length;
  const pilot = runs.reduce((s, r) => s + r.pilotAlarms, 0); const tuned = runs.reduce((s, r) => s + r.tunedAlarms, 0);
  const real = runs.reduce((s, r) => s + r.real, 0);
  const missed = core.rooms.filter((r) => !hasAgent(r) && r.issues.some((i) => i.state !== 'RESOLVED')).length;
  return (
    <>
      <PageHero eyebrow="Field Intelligence · Room Health Check" title="Room Health Check" product="field" icon="pulse"
        lede="A scheduled script on each room computer checks six things and writes a line to a log; Core turns the lines into issues. It becomes the first part of a room discovery agent."
        meta={honest(['Runs simulated from Core device states', 'warn'], ['Pilot rules and tuned rules', 'muted'], ['Synthetic data', 'warn'])}
        actions={<><a className="ui-btn ui-btn--primary" href="#/agent/architecture">The agent architecture</a><a className="ui-btn" href="#/ledger/agent">The agent’s log</a></>} />
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Rooms with the agent" value={runs.length} unit={` of ${core.rooms.length}`} icon="room" hint={`${without} have no room computer or are not built`} />
        <StatTile label="Alerts in the latest run" value={tuned} icon="bell" hint={`${pilot} under the pilot rules`} />
        <StatTile label="Alerts that are real" value={tuned ? Math.round((real / tuned) * 100) : null} unit="%" icon="check" hint={pilot ? `${Math.round((real / pilot) * 100)}% under the pilot rules` : 'no alerts'} />
        <StatTile label="Rooms the agent cannot see" value={missed} icon="eye" hint="open issues in rooms without a room computer" />
      </div>
      <div className="pa-split">
        <Card title="Signal and noise" icon="chart" sub="Alerts in the latest run of every room, by check: pilot rules against tuned rules">
          {CHECKS.map((c) => {
            const p = runs.reduce((s, r) => s + (r.lines.find((l) => l.check.key === c.key)!.pilot === 'false-alarm' || r.lines.find((l) => l.check.key === c.key)!.pilot === 'fault' ? 1 : 0), 0);
            const t = runs.reduce((s, r) => s + (r.lines.find((l) => l.check.key === c.key)!.tuned === 'fault' ? 1 : 0), 0);
            return <div key={c.key} className="pa-zone"><b>{c.label}</b><Bars label={c.label} rows={[{ label: 'Pilot rules', value: p, tone: 'warn' }, { label: 'Tuned rules', value: t, tone: t ? 'bad' : 'ok' }]} /></div>;
          })}
        </Card>
        <Card title="The latest run, room by room" icon="room" sub="Real faults first; open a room for its six lines">
          <ul className="pa-queue" aria-label="Rooms with the agent">
            {[...runs].sort((a, b) => b.real - a.real || b.pilotAlarms - a.pilotAlarms).map((r) => (
              <li key={r.room.outline.id}><a className="pa-inc kit-s--accent" href={`#/ledger/agent/${r.room.outline.id}`}>
                <span className={`pa-inc__sev kit-s--${r.real ? 'bad' : r.pilotAlarms ? 'warn' : 'ok'}`} aria-hidden="true" />
                <span><span className="pa-inc__t">{shortName(r.room.outline)} — {r.room.outline.name}</span><br /><span className="pa-inc__s">ran {hhmm(r.at)} UTC · {r.lines.filter((l) => l.tuned !== 'not-applicable').length} checks</span></span>
                <span>{r.real ? <Tag tone="bad">{r.real} real</Tag> : r.pilotAlarms ? <Tag tone="warn">{r.pilotAlarms} pilot only</Tag> : <Tag tone="ok">all pass</Tag>}</span>
              </a></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Architecture() {
  const built = PARTS.filter((p) => p.state === 'Built').length;
  return (
    <>
      <Crumbs items={[['Room Health Check', '#/agent'], ['Architecture']]} />
      <PageHero eyebrow="Field Intelligence · architecture" title="From a health check to a discovery agent" product="field" icon="route"
        lede="Eight parts. Each says what it does, how far it is built, and where to see it in this build."
        meta={honest(['Honest status: built, piloted or designed', 'accent'], ['Synthetic data', 'warn'])} aside={<div className="pa-aside"><ProgressBar label="Parts built" value={built} max={PARTS.length} valueText={`${built} of ${PARTS.length}`} tone="field" /></div>} />
      <Zone title="How the parts connect" note="The agent discovers; the model holds; the engines reason; Lite shows; the ledger remembers">
        <ol className="pa-flow" aria-label="The flow of the parts">
          {PARTS.map((p, i) => <li key={p.name} className="pa-flow__node"><b>{i + 1}. {p.name}</b><Tag tone={p.state === 'Built' ? 'ok' : 'warn'}>{p.state}</Tag></li>)}
        </ol>
      </Zone>
      <div className="kit-grid">
        {PARTS.map((p) => (
          <Card key={p.name} title={p.name} icon={p.state === 'Built' ? 'check' : 'spark'} tone={p.state === 'Built' ? 'ok' : 'warn'} sub={p.state} footer={<a className="ui-btn ui-btn--quiet" href={p.href}>See it here</a>}>
            <p className="pa-note">{p.does}</p><p>{p.here}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
