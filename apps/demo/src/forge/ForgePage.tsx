/**
 * #/forge and #/forge/room/<room> — Empathia FORGE (journey J3). The overview offers three rooms at different stages; a room's page
 * shows the package compiled from its design record: each artefact with its status and source, the configuration targets FORGE
 * refuses and why, the design findings, what changed since the accepted revision, how to go back, and approval by a second person
 * (forge.approve). Everything is derived when the page opens; only the approval is stored, against the content's fingerprint.
 */
import { useState } from 'react';
import { PageHero, Notice, Tag, Card, Button } from '@empathia/ui';
import { Connected } from '../mission/Connected.js';
import type { PageProps } from '../registry.types.js';
import { ROLES, canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { State } from '../voice/CallPathPage.js';
import { FORGE_APPROVE } from '../module-roles.js';
import { CAPABILITY_PACKS, FORGE_ROOMS, STATUS_WORD, approvalOf, approve, compile, loadApprovals, mayApprove, type ArtifactStatus } from './model.js';

const TONE: Record<ArtifactStatus, 'ok' | 'warn' | 'bad' | 'muted'> = { COMPILED: 'ok', COMPILED_WITH_GAPS: 'warn', REJECTED: 'bad', NOT_AVAILABLE: 'muted' };
const READY: Record<ArtifactStatus, string> = { COMPILED: 'READY', COMPILED_WITH_GAPS: 'UNKNOWN', REJECTED: 'NOT_READY', NOT_AVAILABLE: 'UNKNOWN' };
export default function ForgePage({ role, params, can }: PageProps) {
  const [approvals, setApprovals] = useState(() => loadApprovals()); const opens = (h: string) => { const r = resolve(h.split('?')[0]!); return !!r && canOpen(role, r); };
  const roomId = params['room'];
  if (!roomId) {
    const packs = FORGE_ROOMS.map((id) => compile(id)).filter((p) => !!p);
    return (<div className="vc" data-testid="forge-home">
      <PageHero eyebrow="Empathia FORGE · Room-as-Code" title="A room’s design, compiled into what the build needs" product="lite" icon="layers"
        lede="FORGE turns a room’s design record into versioned artefacts a person can review: schema, bill of materials, signal paths, installation list, acceptance plan and as-built register. It generates device configuration only where a vendor-verified capability pack exists."
        meta={[<Tag key="p" tone="warn">{CAPABILITY_PACKS.length} verified capability packs</Tag>, <span key="r">{packs.length} rooms</span>]} />
    <Connected id="forge" role={role} />
      <Notice tone="info"><b>No configuration is generated here.</b> Every unit in this estate is a class template, and no capability pack has been verified with a vendor. FORGE rejects each configuration target by name instead of inventing commands.</Notice>
      <section className="vc-sec vc-two" aria-label="Rooms">{packs.map((p) => { const a = approvalOf(approvals, p!); return (
        <Card key={p!.roomId} title={p!.roomName} sub={`Revision ${p!.revision} · fingerprint ${p!.fingerprint}`} icon="room" testId={`forge-room-${p!.roomId}`}>
          <p>{p!.designed ? `${p!.artifacts.filter((x) => x.status === 'COMPILED').length} artefacts compiled, ${p!.artifacts.filter((x) => x.status === 'COMPILED_WITH_GAPS').length} with gaps; ${p!.configs.length} configuration targets rejected.` : 'No equipment is designed for this room: nothing to compile.'}</p>
          <p><Tag tone={a ? 'ok' : 'warn'}>{a ? `Approved by the ${ROLES[a.by].label}` : 'Not approved'}</Tag></p>
          <p><a href={`#/forge/room/${p!.roomId}`} data-testid={`forge-open-${p!.roomId}`}>Open the package</a></p>
        </Card>); })}</section>
    </div>);
  }
  const p = compile(roomId);
  if (!p) return (<><PageHero eyebrow="FORGE" title="This room is not in the estate" lede="The address names a room the demonstration does not hold." product="lite" icon="layers" />
    <Connected id="forge" role={role} /><Notice tone="warn"><a href="#/forge" data-testid="forge-unknown">Open the rooms FORGE offers</a></Notice></>);
  const approval = approvalOf(approvals, p); const rule = mayApprove(role, p, FORGE_APPROVE);
  return (<div className="vc" data-testid="forge-package" data-room={p.roomId} data-revision={p.revision} data-approved={approval ? '1' : '0'}>
    <nav className="vc-crumb" aria-label="Where this is"><a href="#/forge">FORGE</a><span aria-hidden="true">›</span><span>{p.roomName}</span></nav>
    <PageHero eyebrow="FORGE · engineering package" title={p.roomName} product="lite" icon="layers" lede={`Revision ${p.revision}, compiled from the room’s design record when this page opened. Nothing here is stored except an approval.`}
      meta={[<Tag key="a" tone={approval ? 'ok' : 'warn'}>{approval ? 'Approved' : 'Not approved'}</Tag>, <span key="f" data-testid="forge-fingerprint">Fingerprint {p.fingerprint}</span>]} />
    <Connected id="forge" role={role} />
    <section className="vc-sec" aria-labelledby="fg-a-h"><h2 id="fg-a-h">Artefacts</h2>
      <ul className="mp-deps" data-testid="forge-artifacts">{p.artifacts.map((a) => (<li key={a.id} className="mp-dep" data-artifact={a.id} data-status={a.status} data-ready={READY[a.status]}>
        <h3>{a.title}</h3><p><Tag tone={TONE[a.status]}>{STATUS_WORD[a.status]}</Tag> <State s={a.basis} /></p><p>{a.says}</p>
        {a.lines.length ? <ul className="vc-next">{a.lines.map((l) => <li key={l}>{l}</li>)}</ul> : null}
        {a.href && opens(a.href) ? <p className="fl-refs"><a href={a.href}>{a.hrefLabel}</a></p> : null}
      </li>))}</ul>
    </section>
    {/* 24 Nov 2026 (journey J3, "FORGE -> Scouter -> approved engineering"): a device is checked against a room in Scouter; FORGE reads the design, it does not choose devices */}
    {p.designed && (opens('#/campus/scouter') || opens('#/lite/room')) ? <p className="fl-refs" data-testid="forge-next">
      {opens('#/campus/scouter') ? <a href="#/campus/scouter" data-testid="forge-to-scouter">Check a device against a room in Scouter</a> : null}
      {opens('#/lite/room') ? <a href={`#/lite/room/${p.roomId}?mode=engineer`} data-testid="forge-to-lite">The design this was compiled from</a> : null}
      {opens('#/commissioning/room') ? <a href={`#/commissioning/room/${p.roomId}`} data-testid="forge-to-cx">Where the room is accepted</a> : null}</p> : null}
    {!p.designed ? <Notice tone="warn"><span data-testid="forge-nodesign"><b>Nothing to compile.</b> No equipment has been designed for this room, so FORGE derives no bill of materials, paths, installation list or acceptance plan, and there is nothing to approve.</span></Notice> : null}
    {p.designed ? <section className="vc-sec" aria-labelledby="fg-c-h"><h2 id="fg-c-h">Device configuration</h2>
      <p className="vc-verdict vc-verdict--outside_policy" data-testid="forge-config-says"><b>{p.configs.length} of {p.configs.length} configuration targets rejected.</b> FORGE generates configuration only for an approved catalogue model with a vendor-verified capability pack. There are {CAPABILITY_PACKS.length} such packs.</p>
      <details><summary>The {p.configs.length} targets and the reason</summary><ul className="vc-next" data-testid="forge-configs">{p.configs.map((c) => <li key={c.position} data-status={c.status}><b>{c.position} {c.label}</b> · {c.device}<br /><span className="ui-muted">{c.why}</span></li>)}</ul></details>
    </section> : null}
    <section className="vc-sec vc-two" aria-label="Checks, changes and approval">
      <div><h2>Design findings</h2>{p.findings.length ? <ul className="vc-next" data-testid="forge-findings">{p.findings.map((f) => <li key={f.title}><b>{f.title}</b> <Tag tone={f.severity === 'High' ? 'bad' : 'warn'}>{f.severity}</Tag><br /><span className="ui-muted">{f.says}</span></li>)}</ul> : <p className="ui-muted">The design checks raise nothing for this room.</p>}
        <h2>Since the accepted revision</h2>{p.changes.length ? <ul className="vc-next" data-testid="forge-changes">{p.changes.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="ui-muted">No replacement is recorded.</p>}
        <p data-testid="forge-rollback">{p.rollback}</p></div>
      <div><h2>Approval</h2>
        {approval ? <p data-testid="forge-approval"><b>Approved by the {ROLES[approval.by].label}</b>, {approval.at.slice(0, 16).replace('T', ' ')} UTC, for fingerprint {approval.fingerprint}. If the design record changes, the fingerprint changes and this approval no longer applies.</p>
          : can('forge.approve') && rule.ok ? <><p>{rule.why}</p><p><Button kind="primary" testId="forge-approve" onClick={() => setApprovals(approve(role, p))}>Approve revision {p.revision}</Button></p></>
          : <p className="ui-muted" data-testid="forge-noapprove">Not approved. {rule.why}</p>}
        <p className="ui-muted">Kept in this browser (demonstration). Approval here does not accept the room: acceptance is Commissioning’s, with its own evidence and its own second person.</p></div>
    </section>
    <Notice tone="muted"><b>Not built:</b> import and reconciliation of CAD, Revit or Visio extracts, an approved device catalogue, capability packs, and export of the package as files. Each will say what it could not read instead of guessing.</Notice>
  </div>);
}
