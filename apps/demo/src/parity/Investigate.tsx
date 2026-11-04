/**
 * #/investigate and #/investigate/<issue> (Search Party · Investigate): one case at a time — the symptom, the systems it touches, what
 * could explain it, the tests that would tell, the cause once a test says so, the fix and the proof that it worked. Suggestions stay
 * suggestions until a result is recorded; nothing here is a diagnosis.
 */
import { useState } from 'react';
import { PageHero, Card, Tag, EmptyState, Segmented } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { shortName, fullName, roomById, roomHref } from '../campus/canon.js';
import { type Layer } from '../campus/design.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { plural } from './core.js';
import { useCore, honest, Crumbs, Zone, FactsTable } from './ui.js';

const WHY: Record<string, Array<[string, string]>> = {
  audio: [['Echo-cancellation reference', 'A loudspeaker feed missing from the reference makes the far end hear itself.'], ['Gain structure', 'A level set for a smaller meeting clips when more microphones open.'], ['Microphone coverage', 'Seats outside every pickup zone sound distant.']],
  video: [['Camera presets', 'A moved table leaves presets framing empty chairs.'], ['Video path', 'A source the codec does not see shows as no video.']],
  display: [['Input and EDID', 'The display waits on an input the source never offers.'], ['Viewing distance', 'Farthest seats beyond the planning distance cannot read detail.']],
  control: [['Panel to processor link', 'A panel that cannot reach its processor shows stale state.'], ['Room computer', 'An update or a driver fault restarts the meeting.']],
  network: [['Switch port and segment', 'A device on the wrong segment loses its peers.'], ['Power over Ethernet budget', 'A switch over budget drops the last devices to power up.']],
  power: [['Protected power', 'A rack on unprotected power restarts with the building.']],
};
const TESTS: Record<string, string> = { audio: 'far-end listening test and the processor’s reference routing readback', video: 'preset walk-through against the seat map', display: 'input and EDID readback, then the viewing-distance calculation', control: 'panel round-trip and the room computer’s event log', network: 'port trace against the device record', power: 'power path inspection' };

interface Case { id: string; title: string; roomId: string; sev: string; state: string; source: string; layers: Layer[]; positions: string[]; workspace: boolean; age: number }
function cases(core: ReturnType<typeof useCore>): Case[] {
  const out: Case[] = [];
  core.rooms.forEach((r) => r.issues.forEach((i) => out.push({ id: i.id, title: i.title, roomId: r.outline.id, sev: i.severity, state: i.state, source: i.source, positions: i.positions, layers: [...new Set(i.positions.map((c) => r.positions.find((p) => p.code === c)?.layer).filter(Boolean) as Layer[])], workspace: false, age: 0 })));
  loadWorkspace().incidents.forEach((i) => { if (out.some((x) => x.id === i.id)) { const c = out.find((x) => x.id === i.id)!; c.workspace = true; c.state = i.state; return; } const t = i.title.toLowerCase(); out.push({ id: i.id, title: i.title, roomId: i.roomId, sev: i.severity, state: i.state, source: 'ServiceHands workspace (this browser)', positions: [], layers: /audio|echo|hear/.test(t) ? ['audio'] : /camera|video/.test(t) ? ['video'] : /projector|display|blank/.test(t) ? ['display'] : /switch|network|dropped/.test(t) ? ['network'] : ['control'], workspace: true, age: Math.round((Date.now() - Date.parse(i.openedAt)) / 864e5) }); });
  const rank = (s: string) => (s === 'Mission critical' ? 0 : s === 'High' ? 1 : s === 'Medium' ? 2 : 3);
  return out.sort((a, b) => Number(a.state === 'RESOLVED' || a.state === 'CLOSED') - Number(b.state === 'RESOLVED' || b.state === 'CLOSED') || rank(a.sev) - rank(b.sev));
}
const done = (s: string) => s === 'RESOLVED' || s === 'CLOSED';

export default function InvestigatePage({ params }: PageProps) {
  const core = useCore(); const all = cases(core); const id = params['issue'];
  return <div className="pa" data-testid="parity-investigate">{id ? <OneCase c={all.find((x) => x.id === id)} id={id} /> : <Index all={all} />}</div>;
}

function Index({ all }: { all: Case[] }) {
  const [f, setF] = useState<'open' | 'all'>('open'); const rows = all.filter((c) => f === 'all' || !done(c.state));
  return (
    <>
      <PageHero eyebrow="Search Party · Investigate" title="One case at a time." product="search-party" icon="search"
        lede="Symptom, the systems it touches, what could explain it, the tests that would tell, the cause once a test says so, the fix, and the proof that it worked. Suggestions stay suggestions until a result is recorded."
        meta={honest(['Suggestions, not a diagnosis', 'warn'], ['Synthetic data', 'warn'])} />
      <Zone title={f === 'open' ? 'Open issues' : 'Every issue'} note={<Segmented small label="Show" value={f} onChange={setF} options={[{ value: 'open', label: 'Open', count: all.filter((c) => !done(c.state)).length }, { value: 'all', label: 'All', count: all.length }]} />}>
        {rows.length ? <ul className="pa-queue">{rows.map((c) => { const o = roomById(c.roomId); return (
          <li key={c.id}><a className="pa-inc" href={`#/investigate/${c.id}`} data-testid="investigate-row"><span className={`pa-inc__sev kit-s--${done(c.state) ? 'ok' : c.sev === 'High' || c.sev === 'Mission critical' ? 'bad' : 'warn'}`} aria-hidden="true" />
            <span><span className="pa-inc__t">{c.title}</span><br /><span className="pa-inc__s">{c.id} · {o ? shortName(o) : c.roomId} · {c.layers.join(', ') || 'unplaced'} · {c.sev}</span></span>
            <Tag tone={done(c.state) ? 'ok' : 'accent'}>{done(c.state) ? 'resolved' : 'investigate'}</Tag></a></li>); })}</ul> : <EmptyState title="No open issue" icon="check" tone="ok">Every issue on record is resolved.</EmptyState>}
      </Zone>
    </>
  );
}

function OneCase({ c, id }: { c?: Case; id: string }) {
  if (!c) return <EmptyState title={`No issue is called “${id}”`} icon="search" action={<a className="ui-btn" href="#/investigate">Every open issue</a>} />;
  const o = roomById(c.roomId); const fin = done(c.state); const why = c.layers.flatMap((l) => WHY[l] || []);
  const steps: Array<[string, string, 'done' | 'now' | undefined]> = [
    ['Symptom', c.title, 'done'],
    ['Systems it touches', c.layers.length ? `${c.layers.join(', ')}${c.positions.length ? ` · positions ${c.positions.join(', ')}` : ''}` : 'Not yet placed on a device', 'done'],
    ['What could explain it', `${plural(why.length, 'hypothesis', 'hypotheses')} from the layers involved`, fin ? 'done' : 'now'],
    ['The tests that would tell', c.layers.map((l) => TESTS[l]).filter(Boolean).join('; ') || 'a site visit', fin ? 'done' : undefined],
    ['The cause', fin ? 'Recorded with the fix' : 'Not known until a test result is recorded', fin ? 'done' : undefined],
    ['The fix', fin ? 'Recorded on the closing record' : 'Waiting for the cause', fin ? 'done' : undefined],
    ['The proof it worked', fin ? 'Retest recorded; the issue closed' : 'A retest against the commissioned baseline', fin ? 'done' : undefined],
  ];
  return (
    <>
      <Crumbs items={[['Investigate', '#/investigate'], [c.id]]} />
      <PageHero compact eyebrow={`Investigate · ${o ? fullName(o) : c.roomId}`} title={c.title} product="search-party" icon="search" lede={`${c.sev} · ${c.state.toLowerCase().replace(/_/g, ' ')} · ${c.source}`}
        meta={honest([fin ? 'Resolved' : 'Open case', fin ? 'ok' : 'warn'], ['Suggestions stay suggestions', 'muted'])}
        actions={<>{o ? <a className="ui-btn" href={roomHref(o)}>Open the room</a> : null}{c.workspace ? <a className="ui-btn ui-btn--quiet" href="#/servicehands">In ServiceHands</a> : null}</>} />
      <div className="pa-split">
        <Card title="The case" icon="route" sub={fin ? 'Closed with its proof' : 'Where the case stands'}><ol className="pa-steps">{steps.map(([t, s, st]) => <li key={t} data-state={st}><div><div className="pa-steps__t">{t}</div><p className="pa-steps__s">{s}</p></div></li>)}</ol></Card>
        <Card title="What could explain it" icon="spark" sub="Hypotheses by layer: none is the cause until a test says so">
          {why.length ? <FactsTable facts={why.map(([k, v]) => [k, v] as [string, string])} /> : <p className="pa-note">No device layer is named on this issue, so no hypothesis is offered: a site visit comes first.</p>}
        </Card>
      </div>
    </>
  );
}
