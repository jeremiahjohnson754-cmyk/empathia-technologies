// The platform, told once (founder, 23 Nov 2026, 19:22): "One platform, six product families, shared engineering intelligence."
// An investor should understand the seventeen capabilities "without feeling like they're navigating 17 disconnected startups".
// So the site has three levels and no more: the platform, six families, and each family's members. Everything on these pages is read
// from packages/ui/src/families.ts, the same file the demonstration's platform map reads, so the two sites cannot name the platform
// differently. Every link into the demonstration is a catalogued launch (packages/ui/src/launches.ts) at the same synthetic room.
import React from 'react';
import { FAMILIES, SHARED, THREAD, POSITIONING, CAPABILITIES, type Family, type Capability } from '../../../packages/ui/src/families.ts';
import { MODULE_LAUNCHES, PRODUCT_LAUNCHES, launchById, launchHref } from '../../../packages/ui/src/launches.ts';
import type { Page } from './content.tsx';
import { Hero, Section, Cards, Note, Actions } from './ui.tsx';

export const familyPath = (f: Family) => `/platform/${f.id}`;
const kindWord = (m: Capability) => (m.kind === 'product' ? 'Core product' : 'Capability, simulated in the demonstration');
/** Where a member's name leads: its own page on this site when it has one, otherwise its catalogued launch into the demonstration. */
const memberHref = (m: Capability, demoUrl: string, back: string): string | undefined => {
  if (m.site) return m.site; const l = MODULE_LAUNCHES[m.id] || PRODUCT_LAUNCHES[m.id]; return l ? launchHref(demoUrl, l, back) : undefined;
};

/**
 * The platform as one picture (24 Nov 2026, design pass): seventeen capabilities in six family columns, standing on what they share,
 * standing on one record. A column is as tall as its family is large, so the picture is also the count. A filled block is one of the
 * nine core products; an outlined block is one of the eight further capabilities, which are simulations in the demonstration.
 * The home page uses the compact form (names as lines of text) because its size budget is 50 KB.
 */
export const Plate = ({ demoUrl, back, home, current }: { demoUrl?: string; back?: string; home?: boolean; current?: string }) => home ? (
  // every byte counts here: one list and one paragraph; the members are lines of one text node (white-space: pre-line)
  <><ol className="plate0">{FAMILIES.map((f) => <li key={f.id}><a href={familyPath(f)}>{f.name}</a><p>{f.members.map((m) => m.name).join('\n')}</p></li>)}</ol>
    <p className="plate0__base"><b>Shared engineering intelligence</b><i>One record</i></p></>
) : (
  <figure className="plate" data-families={FAMILIES.length} data-capabilities={CAPABILITIES.length} data-current={current}>
    <ol className="plate__cols">{FAMILIES.map((f) => (
      <li key={f.id} data-family={f.id} aria-current={f.id === current ? 'true' : undefined}><h3><a href={familyPath(f)}>{f.name}</a></h3>
        <ul aria-label={`In ${f.name}`}>{f.members.map((m) => { const href = demoUrl ? memberHref(m, demoUrl, back || '/platform') : undefined; return <li key={m.id} data-cap={m.id} data-kind={m.kind}>{href ? <a href={href}>{m.name}</a> : m.name}</li>; })}</ul></li>))}</ol>
    <div className="plate__shared"><b>Shared engineering intelligence</b><ul>{SHARED.map((x) => <li key={x.title}>{x.title}</li>)}</ul></div>
    <div className="plate__record"><b>One record</b><span>Every room, device, person and job has one identity, from the first request to the last service visit.</span></div>
    <figcaption><span data-kind="product">Core product ({CAPABILITIES.filter((c) => c.kind === 'product').length})</span><span data-kind="capability">Further capability, simulated in the demonstration ({CAPABILITIES.filter((c) => c.kind !== 'product').length})</span></figcaption>
  </figure>
);

/** The six families as the six questions they answer: the question, who answers it, and where that family's records go next. */
export const FamilyQuestions = () => (
  <ul className="famq" data-families={FAMILIES.length}>{FAMILIES.map((f) => (
    <li key={f.id} data-family={f.id}><h3>{f.asks}</h3>
      <div><p className="famq__fam"><a href={familyPath(f)}>{f.name}</a><span>{f.members.map((m) => m.name).join(', ')}</span></p><p>{f.hands}</p></div></li>))}</ul>
);

/** Six families as cards: the question each answers and its members. Used where families sit beside other cards (/products, a family's own page). */
export const FamilyGrid = ({ compact }: { compact?: boolean }) => (
  <div className="cards cards--3 fams" data-families={FAMILIES.length} data-capabilities={CAPABILITIES.length}>{FAMILIES.map((f) => (
    <article key={f.id} className="card card--link fam" data-family={f.id}>
      <h3><a href={familyPath(f)}>{f.name}</a></h3><p className="fam__asks">{f.asks}</p>
      {compact ? null : <p>{f.hands}</p>}
      <ul className="fam__members" aria-label={`In ${f.name}`}>{f.members.map((m) => <li key={m.id} data-cap={m.id} data-kind={m.kind}>{m.name}</li>)}</ul>
      <span className="card__go" aria-hidden="true">→</span>
    </article>))}</div>
);

/** What every capability shares. This is the product: the families are views of it. */
export const SharedIntelligence = () => (
  <Cards cols={3} items={SHARED.map((s) => ({ title: s.title, body: s.says, icon: s.icon }))} />
);

/**
 * One issue followed through the families, each stop a launch into the demonstration at the same room. It is a sequence, so it is
 * drawn as one: a single path down the page with the family named beside each stop, so the reader watches the issue change hands.
 */
export const Thread = ({ demoUrl, back }: { demoUrl: string; back: string }) => (
  <ol className="thread" data-thread={THREAD.length}>{THREAD.map((t, i) => { const l = launchById(t.launch); const f = FAMILIES.find((x) => x.id === t.family)!; return (
    <li key={t.launch} data-family={t.family} data-launch={t.launch}><p className="thread__fam">{f.name}</p><span className="thread__n" aria-hidden="true">{i + 1}</span>
      <div><h3>{l ? <a href={launchHref(demoUrl, l, back)}>{t.title}</a> : t.title}</h3><p>{t.says}</p></div></li>); })}</ol>
);

/** One page per family: what it answers, what is in it, what it shares, and where its records go. */
export function familyPages(demoUrl: string): Page[] {
  return FAMILIES.map((f) => { const back = familyPath(f); const lead = f.members.find((m) => MODULE_LAUNCHES[m.id] || PRODUCT_LAUNCHES[m.id]); const leadL = lead ? (MODULE_LAUNCHES[lead.id] || PRODUCT_LAUNCHES[lead.id])! : null;
    return { path: back, title: `${f.name} — Empathia Technologies`, description: `${f.name}, one of the six product families of the Empathia platform: ${f.members.map((m) => m.name).join(', ')}. ${f.asks}`,
      body: (
        <div data-family-page={f.id}>
          <Hero label="Product family" title={f.name} lead={`${f.asks} ${f.says}, on the record every other family reads.`} action={leadL ? { href: launchHref(demoUrl, leadL, back), label: `Open ${lead!.name} in the demonstration` } : undefined} />
          <Section title={`${f.members.length === 1 ? 'One capability' : `${f.members.length} capabilities`}, one record`} lead="Each one is a view of the same rooms, devices, people and jobs. None keeps a copy of its own.">
            <Cards cols={f.members.length === 2 ? 2 : 3} items={f.members.map((m) => ({ title: m.name, body: `${m.says}.`, href: memberHref(m, demoUrl, back), meta: <span className="fam__kind" data-kind={m.kind}>{kindWord(m)}</span> }))} />
          </Section>
          {/* 24 Nov 2026, design pass: this was five cards naming the other families. The family is shown where it stands instead: its
              column in the platform figure, the other five beside it, all on the same record */}
          <Section title="Where it stands, and where its records go" lead={f.hands} tone="deep"><Plate demoUrl={demoUrl} back={back} current={f.id} /></Section>
          <Section id="shared" title="What it shares with the other five" lead="The families are not separate products that were integrated afterwards. They are six views of one engineering record."><SharedIntelligence />
            <Actions><a className="btn" href="/platform">The whole platform</a><a className="btn" href="/platform#thread">One issue, followed through the families</a></Actions></Section>
          <div className="wrap"><Note>The nine core products and the eight further capabilities run in the public demonstration on synthetic data. The eight further capabilities are simulations: nothing is connected to a calling platform, a network, a signage system, an alerting source or any device.</Note></div>
        </div>
      ) }; });
}
export { POSITIONING };
