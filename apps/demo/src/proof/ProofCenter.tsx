/**
 * #/proof and #/proof/<claim> — the Proof Center (v1.8 workstream A). The claims are read from @empathia/proof-registry through its
 * public projection: the same records, wording and states as the corporate website's /proof page, so the two cannot disagree.
 * A claim that is not approved for publication, or is revoked or blocked, is absent here exactly as it is there.
 */
import { useMemo } from 'react';
import { PageHero, Chip, EmptyState, Icon } from '@empathia/ui';
import { SEED_CLAIMS, DOSSIER_4218, publicProjection, STATE_LABEL, STATE_MEANING, DATA_LABEL, type PublicClaim, type VerificationState } from '@empathia/proof-registry';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { DOSSIER_READERS } from '../registry.proof.js';
import { Crumbs, Zone, honest } from '../parity/ui.js';

const TONE: Record<VerificationState, 'ok' | 'info' | 'warn' | 'muted' | 'accent' | 'bad'> = { SPECIFIED: 'muted', SYNTHETIC_DEMO: 'warn', IMPLEMENTED_NOT_VERIFIED: 'info', LAB_VERIFIED: 'ok', CUSTOMER_AUTHORIZED: 'info', LIVE_OBSERVING: 'ok', RELEASED_VERIFIED: 'ok', DEGRADED: 'bad', BLOCKED: 'bad', REVOKED: 'bad' };
const ORDER: VerificationState[] = ['RELEASED_VERIFIED', 'LAB_VERIFIED', 'IMPLEMENTED_NOT_VERIFIED', 'SYNTHETIC_DEMO', 'SPECIFIED', 'DEGRADED'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** where a claim can be tried in this demonstration, by capability; a link is offered only when the role may open it */
function tryIt(c: PublicClaim, role: PageProps['role']): { href: string; label: string } | null {
  const dossier = allows({ roles: DOSSIER_READERS, why: 'dossier readers' }, role);
  if (c.capability_id === 'commissioning.asset-evidence-summary') return dossier ? { href: `#/dossier/${DOSSIER_4218.id}`, label: 'Open the dossier' } : { href: `#/scan/${DOSSIER_4218.asset.id}`, label: 'Open the asset passport' };
  if (c.capability_id === 'qr.asset-passport-resolution') return { href: '#/scan', label: 'Open the QR Hub' };
  if (c.capability_id === 'search-party.relationship-lookup') return { href: '#/search', label: 'Open Search Party' };
  return null;
}

function ClaimCard({ c, role, open }: { c: PublicClaim; role: PageProps['role']; open?: boolean }) {
  const go = tryIt(c, role);
  return (
    <article className="pf-claim" data-claim={c.claim_id} data-state={c.verification_state} data-revision={c.implementation_revision} id={`claim-${c.claim_id}`}>
      <header className="pf-claim__head"><Chip small tone={TONE[c.verification_state]}>{STATE_LABEL[c.verification_state]}</Chip><span className="pf-claim__kind">{DATA_LABEL[c.data_kind]}</span><span className="pf-claim__product">{c.product}</span></header>
      <p className="pf-claim__text">{c.claim_text_public}</p>
      {c.downgrade_reason ? <p className="pf-claim__down">Shown as degraded because {c.downgrade_reason}.</p> : null}
      {open ? <><h3 className="pf-h">What this does not show</h3><ul className="pf-limits">{c.limitations.map((l) => <li key={l}>{l}</li>)}</ul></> : null}
      <dl className="pf-meta">
        <div><dt>Claim</dt><dd><a href={`#/proof/${c.claim_id}`}><code>{c.claim_id}</code></a></dd></div>
        <div><dt>Checked</dt><dd><time dateTime={c.verified_at}>{day(c.verified_at)}</time></dd></div>
        <div><dt>How</dt><dd>{c.verification_method || 'Not yet verified by any method'}</dd></div>
        <div><dt>Registry revision</dt><dd><code>{c.implementation_revision}</code></dd></div>
      </dl>
      {go ? <p className="pf-claim__go"><a className="ui-btn ui-btn--primary" href={go.href}>{go.label}</a></p> : null}
    </article>
  );
}

export default function ProofCenter({ role, params }: PageProps) {
  const claims = useMemo(() => { const now = new Date().toISOString(); return SEED_CLAIMS.map((c) => publicProjection(c, now)).filter((c): c is PublicClaim => !!c); }, []);
  const id = params['claim'];
  if (id) {
    const c = claims.find((x) => x.claim_id === id);
    if (!c) return <div className="pa pf" data-native="" data-testid="proof-missing"><Crumbs items={[['Proof Center', '#/proof'], [id.slice(0, 40)]]} /><h1 className="ui-visually-hidden">Claim not published</h1><EmptyState title="No published claim has that identifier" icon="search" action={<a className="ui-btn" href="#/proof">Every published claim</a>}>A claim appears here only while it is approved for publication. One that was withdrawn, or never existed, reads the same way.</EmptyState></div>;
    return (
      <div className="pa pf" data-native="" data-testid="proof-claim">
        <Crumbs items={[['Proof Center', '#/proof'], [c.claim_id]]} />
        <PageHero compact eyebrow={`Claim · ${c.product}`} title={STATE_LABEL[c.verification_state]} product="mission-control" icon="shield" lede={STATE_MEANING[c.verification_state]} meta={honest([DATA_LABEL[c.data_kind], 'warn'], ['The same record as the website', 'muted'])} />
        <ClaimCard c={c} role={role} open />
      </div>
    );
  }
  const n = (s: VerificationState) => claims.filter((c) => c.verification_state === s).length;
  const groups = ORDER.map((s) => ({ s, items: claims.filter((c) => c.verification_state === s) })).filter((g) => g.items.length);
  return (
    <div className="pa pf" data-native="" data-testid="proof-center">
      <PageHero eyebrow="Proof Center" title="What is real, what is synthetic, and what is only specified" product="mission-control" icon="shield"
        lede="Every claim about the product is a record with a state. This page and the website read the same records."
        meta={honest(['Synthetic data', 'warn'], ['Nothing here is live', 'muted'])} />
      <p className="pf-line" data-testid="proof-line"><b>{claims.length} published claims.</b> None is verified on customer equipment, and none is live: no customer source has been connected. {n('SYNTHETIC_DEMO')} work in this demonstration on synthetic data, {n('IMPLEMENTED_NOT_VERIFIED')} is implemented and not yet independently verified, and {n('SPECIFIED')} are specified only.</p>
      {groups.map((g) => (
        <Zone key={g.s} title={STATE_LABEL[g.s]} note={STATE_MEANING[g.s]}>
          <div className="pf-claims">{g.items.map((c) => <ClaimCard key={c.claim_id} c={c} role={role} open />)}</div>
        </Zone>
      ))}
      <Zone title="How to read a claim" note="Three separate questions, never merged into one green badge">
        <ul className="pf-keys">
          <li><Icon name="check" size={18} /><span><b>How far is it verified?</b> From specified, through a synthetic demonstration and implemented, to lab verified and released.</span></li>
          <li><Icon name="layers" size={18} /><span><b>What data stands behind it?</b> Synthetic data can never be shown as verified or live.</span></li>
          <li><Icon name="clock" size={18} /><span><b>Is it still current?</b> A claim that expires, or whose source goes quiet, is shown as degraded. One that is withdrawn disappears.</span></li>
        </ul>
      </Zone>
    </div>
  );
}
