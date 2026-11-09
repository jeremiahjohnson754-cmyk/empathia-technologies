/**
 * #/scan and #/scan/<identifier> — the QR Hub (v1.6): one identifier opens one passport, and the passport offers only what the
 * current role may do. The demonstration does not use a camera: a label is typed, pasted or chosen. Every way a label can fail to
 * resolve has its own stated outcome (malformed, forged, another tenant's, replaced, revoked, expired, unknown), and none of them
 * guesses. SIM-AV-0042 is the v1.6 fixture; the estate's own records (rooms, devices) resolve to their existing passports.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageHero, Chip, Card, EmptyState, Icon } from '@empathia/ui';
import { DOSSIER_4218, QR_PAYLOAD_4218, parseQr, resolveQr, DEMO_LABELS, DEMO_TENANT, type QrParse, type QrResolution } from '@empathia/proof-registry';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { qrMatrix, qrPath } from '../lite/qr.js';
import { useCore, canEntity, recHref, honest, Zone } from '../parity/ui.js';
import { useDossier } from './store.js';

const WHY: Record<Extract<QrParse, { ok: false }>['error'], [string, string]> = {
  empty: ['Type or paste what the label says', 'An identifier such as SIM-AV-0042, or the full text a scanner reads from the label.'],
  too_long: ['That is too long to be a label', 'A label holds an identifier, not a document. Nothing was looked up.'],
  malformed: ['That does not read as a label', 'Part of it is missing, repeated or not allowed. Nothing was looked up, and nothing was guessed from the parts that did read.'],
  unsupported_version: ['This label is a version the hub does not read', 'Only version 1 labels are supported. Ask for the label to be reprinted.'],
  not_a_demo_label: ['This is not an Empathia label', 'Web addresses and other codes are never opened from here. Only an Empathia identifier is looked up.'],
};
const TRY: Array<[string, string]> = [['SIM-AV-0042', 'The fixture'], ['SIM-AV-0031', 'A replaced label'], ['SIM-AV-0017', 'A withdrawn label'], ['SIM-AV-0009', 'An expired label'], ['SIM-AV-9999', 'An unknown identifier'], ['EMPATHIA-DEMO|v=1|tenant=other_tenant|entity=asset|id=SIM-AV-0042|NOT-LIVE', 'Another tenant’s label']];

function Label({ text, caption }: { text: string; caption: string }) {
  const q = useMemo(() => qrMatrix(text), [text]);
  if (!q) return <p className="pf-qr__none">The label text is too long to draw as a code; it is shown as text only.</p>;
  const n = q.size + 8;
  return <svg className="pf-qr" viewBox={`0 0 ${n} ${n}`} role="img" aria-label={caption} shapeRendering="crispEdges" data-testid="scan-qr"><rect width={n} height={n} fill="#fff" /><path d={qrPath(q)} fill="#000" /></svg>;
}

function Passport({ role, can, sees }: Pick<PageProps, 'role' | 'can' | 'sees'>) {
  const D = DOSSIER_4218; const { working: w } = useDossier();
  const actions: Array<[string, string, string, boolean]> = [
    ['scan.openTest', 'Open the tests', `#/dossier/${D.id}`, true],
    ['scan.attach', 'Attach evidence', `#/dossier/${D.id}?focus=evidence`, false],
    ['scan.issue', 'Report a problem', `#/servicehands/new?room=${D.room.id}`, false],
    ['scan.export', 'Export the report', `#/dossier/${D.id}?focus=export`, false],
  ];
  const mine = actions.filter(([id]) => can(id));
  return (
    <Card testId="scan-passport" title={D.asset.kind} sub={`${D.room.name} · ${D.room.site}`} icon="device" action={<Chip small tone="warn">Synthetic</Chip>}>
      <dl className="pf-pass">
        <div><dt>Asset</dt><dd data-testid="scan-asset"><code>{D.asset.id}</code></dd></div>
        <div><dt>Where</dt><dd><a href={`#/room/${D.room.id}`}>{D.room.name}</a></dd></div>
        {sees('scan.technical') ? <>
          <div><dt>Model and serial</dt><dd>{D.asset.model} · <code>{D.asset.serial}</code></dd></div>
          <div><dt>Lifecycle</dt><dd>{D.asset.lifecycle[0]} <span aria-hidden="true">→</span><span className="ui-visually-hidden"> to </span> {D.asset.lifecycle[1]}</dd></div>
          <div><dt>Evidence records</dt><dd data-testid="scan-evidence">{w.totals.evidence} of {w.totals.tests}{w.changed ? <span className="pf-note"> · snapshot {D.totals.evidence} of {D.totals.tests}</span> : null}</dd></div>
        </> : null}
        {sees('scan.acceptance') ? <div><dt>Acceptance</dt><dd data-testid="scan-acceptance" className={w.acceptance === 'HELD' ? 'pf-held' : 'pf-ok'}>{w.acceptance === 'HELD' ? `Held · ${w.blockers.length} ${w.blockers.length === 1 ? 'blocker' : 'blockers'}` : 'Accepted'}</dd></div> : null}
      </dl>
      {mine.length ? <><h3 className="pf-h">What the {ROLES[role].label} can do here</h3><div className="pf-actions" data-testid="scan-actions">{mine.map(([id, label, href, primary]) => <a key={id} className={`ui-btn${primary ? ' ui-btn--primary' : ''}`} data-action={id} href={href}>{label}</a>)}</div></>
        : <p className="pf-note" data-testid="scan-actions-none">This label identifies a piece of room equipment. There is nothing for the {ROLES[role].label} to do with it; the room itself is the place to start.</p>}
      <p className="pf-note">Not connected: this passport reads a synthetic record. No device is contacted when a label is read.</p>
    </Card>
  );
}

function Outcome({ input, role, can, sees }: { input: string } & Pick<PageProps, 'role' | 'can' | 'sees'>) {
  const core = useCore();
  const p = parseQr(input);
  if (!p.ok) { const [t, body] = WHY[p.error]; return <div data-testid="scan-refused" data-error={p.error}><EmptyState title={t} icon={p.error === 'empty' ? 'search' : 'alert'}>{body}</EmptyState></div>; }
  const r: QrResolution = resolveQr(p, DEMO_TENANT, DEMO_LABELS);
  if (r.state === 'RESOLVED' && r.label.id === DOSSIER_4218.asset.id) return <Passport role={role} can={can} sees={sees} />;
  if (r.state === 'REPLACED') return <div data-testid="scan-replaced"><EmptyState title={`Label ${r.label.id} was replaced`} icon="undo" action={r.current ? <a className="ui-btn ui-btn--primary" href={`#/scan/${r.current.id}`}>Open {r.current.id}</a> : undefined}>{r.label.note} {r.current ? 'The current label is offered below; the old one opens nothing by itself.' : 'No current label is recorded for it.'}</EmptyState></div>;
  if (r.state === 'REVOKED' || r.state === 'EXPIRED') return <div data-testid={`scan-${r.state.toLowerCase()}`}><EmptyState title={`Label ${r.label.id} ${r.state === 'REVOKED' ? 'was withdrawn' : 'has expired'}`} icon="lock">{r.label.note} It opens no passport. If the label is on equipment, report it so it can be reprinted.</EmptyState></div>;
  // not one of the hub's labels: an identifier of the estate's own records, when it is typed bare and this role may read that type
  const rec = p.tenant === null ? core.get(p.id) : undefined;
  if (rec && canEntity(role, rec.type)) return <div data-testid="scan-record"><Card title={rec.name} sub={rec.sub} icon="link" action={<Chip small tone="warn">Synthetic</Chip>}><p className="pf-note">{p.id} is a record of the demonstration estate. It opens in its own passport.</p><div className="pf-actions"><a className="ui-btn ui-btn--primary" href={rec.href || recHref(rec)}>Open {rec.name}</a></div></Card></div>;
  return <div data-testid="scan-notfound"><EmptyState title="No label with that identifier" icon="search">Nothing opens for <code>{p.id}</code>. A label that belongs to another organisation reads exactly the same way: whether it exists elsewhere is not disclosed.</EmptyState></div>;
}

export default function QrHub({ role, params, query, can, sees }: PageProps) {
  // what was asked lives in the address (#/scan/<id>, or #/scan?label=<text> for a full label), so a lookup can be linked to and gone back from
  let fromAddress = ''; try { fromAddress = params['id'] ? decodeURIComponent(params['id']) : (query.get('label') || ''); } catch { fromAddress = params['id'] || ''; }
  const [text, setText] = useState(fromAddress); const asked = fromAddress;
  useEffect(() => { setText(fromAddress); }, [fromAddress]);
  const look = (v: string) => { const s = v.trim().slice(0, 220); const bare = parseQr(s); location.hash = bare.ok && bare.tenant === null ? `#/scan/${bare.id}` : `#/scan?label=${encodeURIComponent(s)}`; };
  const submit = (e: { preventDefault(): void }) => { e.preventDefault(); look(text); };
  return (
    <div className="pa pf" data-native="" data-testid="scan">
      <PageHero eyebrow="Lite · QR Hub" title="Scan to understand" product="lite" icon="search" lede="One identifier. One passport. Only what this role may do with it."
        meta={honest(['Synthetic labels', 'warn'], ['No camera · typed or chosen', 'muted'], [`Viewing as ${ROLES[role].label}`, 'muted'])} />
      <div className="pf-scan">
        <section className="pf-scan__label" aria-labelledby="scan-label-h">
          <h2 id="scan-label-h" className="pf-h">The fixture label</h2>
          <Label text={QR_PAYLOAD_4218} caption={`QR code of the demonstration label for ${DOSSIER_4218.asset.id}`} />
          <p className="pf-scan__id"><code>{DOSSIER_4218.asset.id}</code></p>
          <p className="pf-note">A phone camera reads this code as <code className="pf-wrap">{QR_PAYLOAD_4218}</code>. It is text, not a web address, and it says “not live”.</p>
          <form className="pf-scan__form" onSubmit={submit} noValidate>
            <label htmlFor="scan-in">Identifier or label text</label>
            <div className="pf-scan__row"><input id="scan-in" className="ui-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={220} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" data-testid="scan-input" /><button className="ui-btn ui-btn--primary" type="submit" data-testid="scan-go">Look up</button></div>
          </form>
          <div className="pf-try" role="group" aria-label="Labels to try">{TRY.map(([v, l]) => <button key={v} type="button" className="ui-btn ui-btn--sm" onClick={() => { setText(v); look(v); }}>{l}</button>)}</div>
        </section>
        <section className="pf-scan__out" aria-live="polite" aria-label="What the label opens">
          {asked ? <Outcome input={asked} role={role} can={can} sees={sees} /> : <EmptyState title="Look up a label to open its passport" icon="search">Start with the fixture, <a href={`#/scan/${DOSSIER_4218.asset.id}`}>{DOSSIER_4218.asset.id}</a>.</EmptyState>}
        </section>
      </div>
      <Zone title="What a label can and cannot do" note="The same rules for every label">
        <ul className="pf-keys">
          <li><Icon name="lock" size={18} /><span><b>A label carries no permission.</b> It names a record. What opens depends on who is reading, decided where the record lives.</span></li>
          <li><Icon name="alert" size={18} /><span><b>A label that fails says why.</b> Replaced, withdrawn, expired, unknown or not a label: each reads differently, and none opens a guess.</span></li>
          <li><Icon name="eye" size={18} /><span><b>Reading a label touches nothing.</b> No device is contacted, moved or controlled when a passport is opened.</span></li>
        </ul>
      </Zone>
    </div>
  );
}
