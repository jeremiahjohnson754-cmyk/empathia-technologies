/**
 * #/voice — Empathia VOICE in the demonstration: what it is, the one synthetic scenario it shows (J6B-VOICE), what each perspective
 * may read, the adapter register (every vendor row CONTRACT_ONLY: nothing is connected) and what VOICE never does.
 */
import { PageHero, Notice, Tag, Card } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { ADAPTERS, CASES, FLOW, NEVER, SESSION, SHARED_LINK, caseView, viewOf } from './model.js';

const VIEW_SAYS = { administration: 'You are reading as voice administration: routing, quality and signalling-side detail for this tenant’s sites.', technician: 'You are reading as a site technician: the path and the samples for your site’s rooms, without signalling-side detail.', summary: 'You are reading the summary: no session, endpoint or signalling detail.', none: '' } as const;

export default function VoicePage({ role }: PageProps) {
  const view = viewOf(role); const opens = (h: string) => { const r = resolve(h); return !!r && canOpen(role, r); };
  const room = FLOW.room.entityId; const d = caseView('degraded'); const out = d.samples.length ? `${d.verdictWhy}` : '';
  return (<div className="vc" data-testid="voice-home" data-view={view}>
    <PageHero eyebrow="Empathia VOICE · simulation" title="Calling you can explain" product="pro" icon="network"
      lede="VOICE is telephony and unified-communications intelligence: the CallPath Digital Twin of a room’s calling, from the endpoint to the provider, with what is configured kept apart from what was observed. It is not narration, a voice assistant or call recording."
      actions={opens(`#/voice/callpath/${room}`) ? <a className="ui-btn ui-btn--primary" href={`#/voice/callpath/${room}`} data-testid="voice-open-callpath">Open the CallPath of Atlas 4.218</a> : undefined}
      meta={[<Tag key="s" tone="accent">Simulated</Tag>, <span key="f">One call flow, one session, {FLOW.hops.length} hops</span>]} />
    <Notice tone="info">{VIEW_SAYS[view]} Changing perspective changes what this page shows. It grants nothing on a real system.</Notice>

    <section className="vc-sec vc-two" aria-label="The scenario">
      <Card title="The scenario this demonstration plays" sub="J6B-VOICE, on the synthetic estate" icon="route">
        <ol className="vc-steps">
          <li>Someone in Atlas 4.218 hears the town hall call break up and reports it from the room.{opens(`#/voice/report/${room}`) ? <> <a href={`#/voice/report/${room}`}>Report a calling problem</a></> : null}</li>
          <li>Voice administration opens the room’s CallPath: the configured path, and what was observed on each hop.</li>
          <li>Simulated loss and jitter are shown with their time, unit, source and method.{view !== 'summary' ? <> {out}</> : null}</li>
          <li>The shared uplink of access switch {SHARED_LINK.to} links {SHARED_LINK.rooms.length} rooms; a hypothesis is recorded with its unknowns.</li>
          <li className="ui-muted">Not built yet: the technician’s evidence, the independent review, and the readiness change for the town hall.</li>
        </ol>
      </Card>
      <Card title="Three cases, one room" sub="Each is an address you can share" icon="layers">
        <ul className="vc-next">{CASES.map((c) => <li key={c.id}>{opens(`#/voice/callpath/${room}`) ? <a href={`#/voice/callpath/${room}${c.id === 'degraded' ? '' : `?case=${c.id}`}`}>{c.label}</a> : <b>{c.label}</b>} <span className="ui-muted">{c.says}</span></li>)}</ul>
        {view === 'summary' ? <p data-testid="voice-summary">Summary for the room’s last simulated session: {d.verdict === 'OUTSIDE_POLICY' ? 'outside the declared targets for part of the call' : 'within the declared targets'}. Session detail is not part of this perspective.</p> : <p className="ui-muted">{SESSION.privacy}</p>}
      </Card>
    </section>

    <section className="vc-sec" aria-labelledby="vc-ad-h">
      <h2 id="vc-ad-h">Adapter register</h2>
      <p className="ui-muted">Where each source stands. CONTRACT_ONLY means a contract is specified and no code calls the vendor. No partnership, certification or supported carrier is claimed.</p>
      <div className="ui-table-wrap"><table className="ui-table" data-testid="voice-adapters"><thead><tr><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Note</th></tr></thead>
        <tbody>{ADAPTERS.map((a) => <tr key={a.id}><th scope="row">{a.target}</th><td><Tag tone={a.status === 'MOCK' ? 'accent' : 'muted'}>{a.status}</Tag></td><td>{a.note}</td></tr>)}</tbody></table></div>
    </section>
    <section className="vc-sec" aria-labelledby="vc-never-h"><h2 id="vc-never-h">What VOICE does not do</h2><ul className="vc-next" data-testid="voice-never">{NEVER.map((n) => <li key={n}>{n}</li>)}</ul></section>
  </div>);
}
