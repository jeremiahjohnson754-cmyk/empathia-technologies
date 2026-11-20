/**
 * #/v25/asset?a=AS-0112 — one asset's whole life, found by its asset ID (./campus/assetLife.ts): installed where and by whom, what the
 * installation team registered, the baselines it was in, every service job against it with vendor and SLA, the issues at its position,
 * and, if it was taken out, when and why and what replaced it. A retired ID is still found here and is shown as never to be reissued.
 */
import { useMemo, useState } from 'react';
import { PageHero, Card, Notice, Tag } from '@empathia/ui';
import { findAsset, lifeOf, issuesAt, allAssetCodes, ASSET_RE } from '../campus/assetLife.js';
import { fullName } from '../campus/canon.js';
import { readRegister } from '../campus/registerStore.js';
import { syntheticHistory, workspaceJobs, type ServiceJob } from '../service/history.js';
import { restoredInSla } from '../service/analytics.js';
import { load as loadDesk } from '../decisions/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaOf, personaLabel } from '../build/store.js';

const KIND_WORD = { installed: 'Installed', registered: 'Registered', baseline: 'Baseline', issue: 'Issue', service: 'Service', retired: 'Retired', replaced: 'Replaced' } as const;

export function AssetLifePage({ perspective, hash }: { perspective: string; hash: string }) {
  const persona = personaOf(perspective); const { w } = useWorkspace();
  const q = new URLSearchParams(hash.split('?')[1] || '').get('a') || ''; const [typed, setTyped] = useState(q);
  const desk = useMemo(() => loadDesk(), []);
  const projectOf = useMemo(() => { const m = new Map(desk.projects.filter((p) => p.roomId).map((p) => [p.roomId!, p.id])); return (room: string) => m.get(room) || null; }, [desk]);
  const jobs = useMemo<ServiceJob[]>(() => [...syntheticHistory(projectOf), ...workspaceJobs(w, projectOf)], [w, projectOf]);
  const codes = useMemo(() => allAssetCodes(), []);
  const hit = q ? findAsset(q) : null;
  const entry = hit ? (readRegister(hit.room.outline.id).entries[hit.inst.position] || null) : null;
  const stops = hit ? lifeOf(hit, jobs, entry) : [];
  const mine = hit ? jobs.filter((j) => j.asset === hit.code) : [];
  const retired = useMemo(() => codes.filter((c) => !findAsset(c)!.current).length, [codes]);
  const go = (e: { preventDefault: () => void }) => { e.preventDefault(); location.hash = `#/v25/asset?a=${encodeURIComponent(typed.trim().toUpperCase())}`; };
  return (
    <section className="wk al" data-native="workspace" data-testid="asset-life" data-found={hit ? (hit.current ? 'in-service' : 'retired') : q ? 'none' : ''}>
      <PageHero product="commissioning" icon="device" eyebrow="Asset intelligence · one unit" title={hit ? `${hit.code}: its whole life` : 'Find an asset by its ID'}
        lede={<>The asset ID is the physical unit; the device ID is the position it is installed at. Everything the record holds about one unit — installation, register, baselines, service, retirement and what replaced it — is joined here by the asset ID alone. Synthetic records. Acting as <b>{personaLabel(persona)}</b>.</>} />
      <form className="al-find" onSubmit={go} role="search" data-testid="al-find">
        <label className="rv-field"><span>Asset ID</span><input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="AS-0112" list="al-codes" autoComplete="off" spellCheck={false} data-testid="al-input" /></label>
        <datalist id="al-codes">{codes.slice(0, 400).map((c) => <option key={c} value={c} />)}</datalist>
        <button type="submit" className="ui-btn ui-btn--primary">Show its life</button>
        <span className="ui-meta" data-testid="al-count">{codes.length.toLocaleString('en-US')} asset IDs on record · {retired} retired, each kept and never reissued</span>
      </form>
      {q && !hit ? <div role="alert" data-testid="al-none"><Notice tone="warn">{ASSET_RE.test(q.toUpperCase()) ? `${q.toUpperCase()} is not on the estate’s record: no unit has ever had this ID.` : `“${q}” is not an asset ID. Asset IDs look like AS-0112; a device ID (PA-…) names a position, not a unit.`}</Notice></div> : null}
      {hit ? <>
        <div className="kit-grid kit-grid--tiles wk-tiles4" data-testid="al-facts">
          <Card icon="device" title={hit.current ? 'In service' : 'Retired'} sub={hit.current ? 'in the asset inventory' : 'out of the inventory; the ID is kept and never reissued'} testId="al-state"><Tag tone={hit.current ? 'ok' : 'muted'}>{hit.current ? 'IN SERVICE' : 'RETIRED'}</Tag></Card>
          <Card icon="place" title={hit.position?.label || hit.inst.position} sub={`${hit.inst.position} in ${fullName(hit.room.outline)}`} testId="al-where"><a href={`#/commissioning/room/${hit.room.outline.id}`}>Open the room’s record</a></Card>
          <Card icon="ticket" title={`${mine.length} service job${mine.length === 1 ? '' : 's'}`} sub={mine.length ? `${mine.filter(restoredInSla).length} restored within SLA` : 'none raised against this unit'} testId="al-service" />
          <Card icon="link" title={hit.replacedBy ? `Replaced by ${hit.replacedBy}` : hit.replaced ? `Replaced ${hit.replaced}` : 'Original unit'} sub={hit.position?.device || ''} testId="al-chain">
            {hit.replacedBy ? <a href={`#/v25/asset?a=${hit.replacedBy}`} data-testid="al-next">Follow to {hit.replacedBy}</a> : hit.replaced ? <a href={`#/v25/asset?a=${hit.replaced}`} data-testid="al-prev">Back to {hit.replaced}</a> : null}</Card>
        </div>
        <Card icon="clock" title="Its life, oldest first" sub="Every stop links to the record it comes from" testId="al-timeline">
          <ol className="al-tl">{stops.map((s, i) => <li key={i} data-testid="al-stop" data-kind={s.kind} className={`al-tl__i al-tl__i--${s.tone}`}>
            <span className="al-tl__when ui-mono">{s.at.slice(0, 10)}</span><div><b>{KIND_WORD[s.kind]}</b> · {s.href ? <a href={s.href}>{s.title}</a> : s.title}<div className="ui-meta">{s.detail}{s.by ? ` · ${personaLabel(s.by)}` : ''}</div></div></li>)}</ol>
        </Card>
        <div className="wk-g2">
          <Card icon="book" title="Registered for this unit" sub={entry ? `by ${personaLabel(entry.by)} on ${entry.at.slice(0, 10)}` : 'nothing registered in this browser yet'} testId="al-register">
            {entry && hit.current ? <dl className="san__defs">{(['serial', 'hostname', 'ip', 'firmware', 'location'] as const).map((k) => <div key={k}><dt>{k === 'ip' ? 'IP address' : k[0]!.toUpperCase() + k.slice(1)}</dt><dd className="ui-mono">{entry[k] || '—'}</dd></div>)}</dl>
              : <p className="ui-muted">{hit.current ? <>The installation team fills this in on the room’s device register: <a href={`#/commissioning/room/${hit.room.outline.id}`}>open it</a>.</> : 'A retired unit keeps the history above; the register now describes the unit at its position.'}</p>}
          </Card>
          <Card icon="alert" title="Issues at its position" sub="From the room’s record" testId="al-issues">
            {issuesAt(hit).length ? <ul className="plain">{issuesAt(hit).map((i) => <li key={i.id}><Tag tone={i.state === 'RESOLVED' ? 'ok' : 'warn'}>{i.state}</Tag> <b>{i.id}</b> {i.title} <span className="ui-meta">({i.severity})</span></li>)}</ul> : <p className="ui-muted">None at this position.</p>}
          </Card>
        </div>
      </> : null}
    </section>
  );
}
