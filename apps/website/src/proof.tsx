// The Proof Center (v1.8 workstream A). Every claim on this page is read from the shared Proof Registry (@empathia/proof-registry),
// through its public projection: the same records, wording and states the Living Campus demonstration shows. Nothing here is typed by
// hand, so the two sites cannot drift apart. A claim that is not approved, or is revoked or blocked, is simply absent.
import React from 'react';
import { SEED_CLAIMS, DOSSIER_4218, publicProjection, STATE_LABEL, STATE_MEANING, DATA_LABEL, type PublicClaim, type VerificationState } from '@empathia/proof-registry';
import { Hero, Section, Actions, Note, type Evidence } from './ui.js';
import type { Page } from './content.js';

/** the registry's states on the site's existing evidence colours; the words carry the meaning, never the colour alone */
const TONE: Record<VerificationState, Evidence> = { SPECIFIED: 'declared', SYNTHETIC_DEMO: 'simulated', IMPLEMENTED_NOT_VERIFIED: 'modeled', LAB_VERIFIED: 'observed', CUSTOMER_AUTHORIZED: 'observed', LIVE_OBSERVING: 'observed', RELEASED_VERIFIED: 'verified', DEGRADED: 'unknown', BLOCKED: 'unknown', REVOKED: 'unknown' };
const ORDER: VerificationState[] = ['RELEASED_VERIFIED', 'LAB_VERIFIED', 'IMPLEMENTED_NOT_VERIFIED', 'SYNTHETIC_DEMO', 'SPECIFIED', 'DEGRADED'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const publicClaims = (asOf: string): PublicClaim[] => SEED_CLAIMS.map((c) => publicProjection(c, asOf)).filter((c): c is PublicClaim => !!c);
export const StateTag = ({ s }: { s: VerificationState }) => <span className={`tag tag--${TONE[s]}`} data-state={s}><i aria-hidden="true" />{STATE_LABEL[s]}</span>;

export const ProofCard = ({ c, demoUrl, compact }: { c: PublicClaim; demoUrl: string; compact?: boolean }) => (
  <article className="proof" data-claim={c.claim_id} data-state={c.verification_state} data-revision={c.implementation_revision}>
    <header className="proof__head"><StateTag s={c.verification_state} /><span className="proof__kind">{DATA_LABEL[c.data_kind]}</span><span className="proof__product">{c.product}</span></header>
    <p className="proof__text">{c.claim_text_public}</p>
    {c.downgrade_reason ? <p className="proof__down">Shown as degraded because {c.downgrade_reason}.</p> : null}
    {compact ? null : <><h3 className="proof__h">What this does not show</h3><ul className="proof__limits">{c.limitations.map((l) => <li key={l}>{l}</li>)}</ul></>}
    <dl className="proof__meta">
      <div><dt>Claim</dt><dd><code>{c.claim_id}</code></dd></div>
      <div><dt>Checked</dt><dd><time dateTime={c.verified_at}>{day(c.verified_at)}</time></dd></div>
      <div><dt>How</dt><dd>{c.verification_method || 'Not yet verified by any method'}</dd></div>
      <div><dt>Registry revision</dt><dd><code>{c.implementation_revision}</code></dd></div>
    </dl>
    <p className="proof__go"><a href={`${demoUrl}/#/proof/${c.claim_id}`}>{c.environment === 'synthetic_demo' ? 'Open it in the demonstration' : 'See this claim in the demonstration'}</a></p>
  </article>
);

/** The one claim both sites lead with, for the home page. */
export const LeadClaim = ({ asOf, demoUrl }: { asOf: string; demoUrl: string }) => {
  const c = publicClaims(asOf).find((x) => x.claim_id === 'DEMO-COMMISSION-001'); if (!c) return null;
  return <div className="proof-lead"><ProofCard c={c} demoUrl={demoUrl} compact /><p className="proof-lead__more"><a href="/proof">Every claim, with its state, in the Proof Center</a></p></div>;
};

export function proofPage(demoUrl: string, asOf: string): Page {
  const claims = publicClaims(asOf); const D = DOSSIER_4218.totals;
  const groups = ORDER.map((s) => ({ s, items: claims.filter((c) => c.verification_state === s) })).filter((g) => g.items.length);
  return { path: '/proof', title: 'Proof Center — Empathia Technologies', description: 'Every capability claim Empathia makes, with how far it has been verified, what kind of data stands behind it, and what it does not show.', nav: 'Proof', body: (
    <>
      <Hero label="Proof Center" title="What is real, what is synthetic, and what is only specified" lead="Every claim we make about the product is a record with a state. This page reads those records; it is not written by hand. The demonstration shows the same ones." >
        <Actions><a className="btn btn--primary" href={`${demoUrl}/#/proof`}>Open the Proof Center in the demonstration</a><a className="btn" href="/trust">Security and trust</a></Actions>
      </Hero>
      <Section title="Today, in one line" lead={`${claims.length} published claims. None is verified on customer equipment, and none is live: no customer source has been connected. ${claims.filter((c) => c.verification_state === 'SYNTHETIC_DEMO').length} work in the demonstration on synthetic data, ${claims.filter((c) => c.verification_state === 'IMPLEMENTED_NOT_VERIFIED').length} is implemented and not yet independently verified, and ${claims.filter((c) => c.verification_state === 'SPECIFIED').length} are specified only.`} />
      <Section title="How to read a claim" lead="Three separate questions, never merged into one green badge.">
        <ul className="proof-keys">
          <li><b>How far is it verified?</b> From specified, through a synthetic demonstration and implemented, to lab verified and released. Each state is defined below.</li>
          <li><b>What data stands behind it?</b> Synthetic, modeled, imported, lab-observed or customer-observed. Synthetic data can never be shown as verified or live.</li>
          <li><b>Is it still current?</b> A claim carries the date it was checked. One that expires, or whose source goes quiet, is shown as degraded; one that is withdrawn disappears.</li>
        </ul>
      </Section>
      {groups.map((g) => (
        <Section key={g.s} id={g.s.toLowerCase().replace(/_/g, '-')} title={STATE_LABEL[g.s]} lead={STATE_MEANING[g.s]}>
          <div className="proofs">{g.items.map((c) => <ProofCard key={c.claim_id} c={c} demoUrl={demoUrl} />)}</div>
        </Section>
      ))}
      <Section title="The evidence behind the commissioning claim" lead={`A synthetic commissioning dossier for ${DOSSIER_4218.asset.kind.toLowerCase()} ${DOSSIER_4218.asset.id} in ${DOSSIER_4218.room.name}. Acceptance is held, and stays held until the failures are retested.`} tone="deep">
        <dl className="proof-totals" data-dossier={DOSSIER_4218.id}>
          <div><dt>Pass</dt><dd>{D.pass}</dd></div><div><dt>Pending</dt><dd>{D.pending}</dd></div><div><dt>Fail</dt><dd>{D.fail}</dd></div>
          <div><dt>Evidence records</dt><dd>{D.evidence} of {D.tests}</dd></div><div><dt>Final acceptance</dt><dd>{DOSSIER_4218.acceptance === 'HELD' ? 'Held' : 'Accepted'}</dd></div>
        </dl>
        <Actions><a className="btn btn--primary" href={`${demoUrl}/#/dossier/${DOSSIER_4218.id}`}>Open the dossier in the demonstration</a></Actions>
        <Note>Synthetic data. {DOSSIER_4218.asset.id} is a demonstration fixture, not equipment.</Note>
      </Section>
      <Section title="States a claim can be in">
        <dl className="proof-states">{(Object.keys(STATE_LABEL) as VerificationState[]).map((s) => <div key={s}><dt><StateTag s={s} /></dt><dd>{STATE_MEANING[s]}</dd></div>)}</dl>
      </Section>
    </>
  ) };
}
