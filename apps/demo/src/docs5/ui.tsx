/** Shared parts of the Phase 5 pages, and the release controls the dossier shows too. */
import { Chip, Icon } from '@empathia/ui';
import { releaseControls, type DocsWorking, type Finding, type Working, type WorkingDoc } from '@empathia/proof-registry';
import type { RoleKey } from '../registry.types.js';
import { STATE_WORD, TRACKED_REPORT, actorOf } from './model.js';

export const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const docHref = (type?: string) => `#/docs/${TRACKED_REPORT}${type ? `/${type}` : ''}`;

/** A document's state in a word. One that is read from the dossier (deficiency closure) is open or closed there, not reviewed here. */
export function StateChip({ d }: { d: Pick<WorkingDoc, 'state' | 'gate' | 'test' | 'met' | 'applies'> }) {
  if (d.applies && d.gate === 'dossier' && !d.test) return <Chip small tone={d.met ? 'ok' : 'bad'}>{d.met ? 'Closed on the dossier' : 'Open on the dossier'}</Chip>;
  const s = STATE_WORD[d.state]!; return <Chip small tone={s.tone}>{s.label}</Chip>;
}
export function FindingLine({ f }: { f: Finding }) {
  return <li data-finding={f.kind} data-blocking={f.blocking ? 'yes' : 'no'}><Icon name={f.blocking ? 'alert' : 'info'} size={16} /><span><b>{f.detail}</b> {f.action}</span></li>;
}
export function Said({ no, ok, id }: { no: string | null; ok: string | null; id: string }) {
  return <>
    {no ? <div role="alert" className="d5-msg d5-msg--no" data-testid={`${id}-refused`}><Icon name="alert" size={18} /><span>{no}</span></div> : null}
    {ok && !no ? <p role="status" className="d5-msg d5-msg--ok" data-testid={`${id}-done`}><Icon name="check" size={18} /><span>{ok}</span></p> : null}
  </>;
}

const FIRST: RoleKey[] = ['svcmgr', 'exec']; const SECOND: RoleKey[] = ['ops', 'syseng'];
/** The ten checks before acceptance (§13), computed. Shown on the tracker and on the dossier. */
export function ReleaseControls({ dossier, docs, link }: { dossier: Working; docs: DocsWorking; link?: boolean }) {
  const rc = releaseControls(dossier, docs, { first: FIRST.map(actorOf), second: SECOND.map(actorOf) }); const open = rc.filter((x) => x.state === 'OPEN').length;
  return (
    <div className="d5-rc" data-testid="release-controls" data-open={open}>
      <p className="d5-note">{open ? `${plural(open, 'check is', 'checks are')} open. Each is computed from the dossier and the documentation as they stand; none is ticked by hand.` : 'All ten pass. Nothing in the record stops acceptance.'}{link ? <> <a href={docHref()}>Open the documentation</a></> : null}</p>
      <ol>{rc.map((x) => (
        <li key={x.id} data-control={x.id} data-state={x.state}>
          <span className="d5-rc__mark" aria-hidden="true"><Icon name={x.state === 'PASS' ? 'check' : 'alert'} size={16} /></span>
          <div><b>{x.title}</b> <Chip small tone={x.state === 'PASS' ? 'ok' : 'bad'}>{x.state === 'PASS' ? 'Pass' : 'Open'}</Chip>{x.waived ? <> <Chip small tone="warn">{plural(x.waived, 'waiver')} standing</Chip></> : null}
            <span className="d5-rc__basis">{x.basis}.</span>
            {x.open.length ? <ul>{x.open.slice(0, 4).map((o, i) => <li key={i}>{o}</li>)}{x.open.length > 4 ? <li>and {x.open.length - 4} more</li> : null}</ul> : null}</div>
        </li>))}</ol>
    </div>
  );
}
