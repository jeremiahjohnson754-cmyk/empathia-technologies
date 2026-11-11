/**
 * #/guide/topic/<chapter> — one chapter of the End User Success & Training Guide (chapters.ts), and the list of chapters shown on
 * the guide's first page. A link to another page of the product is shown only to a reader who may open it. What an organisation
 * would add of its own is said, and is said to be not recorded.
 */
import { PageHero, Chip, Icon } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { canOpen } from '../access/policy.js';
import { resolve } from '../registry.pages.js';
import { CHAPTERS, CONTENTS, chapterById } from './chapters.js';

const opens = (role: RoleKey, href: string) => { const x = resolve(href.split('?')[0]!); return !!x && canOpen(role, x); };

export function ChapterList() {
  return (
    <section className="gd-sec gd-chapters" aria-labelledby="gd-ch-h" data-testid="guide-chapters"><h2 id="gd-ch-h">The rest of the guide</h2>
      <p className="gd-note">The parts that are the same in every room. A draft, not yet reviewed by a person who supports users for a living. Short videos are not built.</p>
      <ul className="gd-rooms">{CHAPTERS.map((c) => <li key={c.id}><a href={`#/guide/topic/${c.id}`} data-chapter={c.id}><b>{c.title}</b><span>{c.summary}</span></a></li>)}</ul>
    </section>
  );
}

export function ChapterPage({ role, id }: { role: RoleKey; id: string }) {
  const c = chapterById(id);
  if (!c) return <div className="pa gd" data-native="" data-testid="guide-missing"><PageHero compact eyebrow="End User Success & Training Guide" title="There is no such chapter" product="lite" icon="book" lede="Nothing was guessed from the address." /><p className="gd-note"><a href="#/guide">The guide’s first page</a></p></div>;
  const i = CHAPTERS.indexOf(c); const prev = CHAPTERS[i - 1]; const next = CHAPTERS[i + 1]; const links = c.links.filter((l) => opens(role, l.href));
  return (
    <div className="pa gd gd-chapter" data-native="" data-testid="guide-chapter" data-chapter={c.id}>
      <PageHero compact eyebrow="End User Success & Training Guide" title={c.title} product="lite" icon="book" lede={c.summary}
        meta={[<Chip key="d" small tone="warn">Draft</Chip>, <Chip key="r" small tone="muted">Not yet reviewed by a person</Chip>, <Chip key="n" small tone="muted">Chapter {i + 1} of {CHAPTERS.length}</Chip>]} />
      <div className="gd-ch-body">
        {c.sections.map((s) => <section key={s.heading} aria-labelledby={`gd-s-${c.id}-${s.heading.replace(/\W+/g, '-')}`}><h2 id={`gd-s-${c.id}-${s.heading.replace(/\W+/g, '-')}`}>{s.heading}</h2><ul>{s.points.map((p) => <li key={p}>{p}</li>)}</ul></section>)}
        {links.length ? <section aria-labelledby={`gd-l-${c.id}`} data-testid="chapter-links"><h2 id={`gd-l-${c.id}`}>In Empathia</h2><ul className="gd-links">{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></section> : null}
        {c.yours ? <p className="gd-yours" data-testid="chapter-yours"><Icon name="info" size={16} /><span><b>From your organisation.</b> {c.yours} None is recorded in this demonstration, and nothing is assumed in its place.</span></p> : null}
        <p className="gd-note" data-testid="chapter-covers">This chapter covers, from the guide’s list of contents: {c.covers.join(', ').toLowerCase()}.</p>
      </div>
      <nav className="gd-ch-nav" aria-label="Chapters">{prev ? <a className="ui-btn" href={`#/guide/topic/${prev.id}`} data-testid="chapter-prev">Back: {prev.title.split(':')[0]}</a> : <span />}<a className="ui-btn ui-btn--quiet" href="#/guide">All chapters and rooms</a>{next ? <a className="ui-btn ui-btn--primary" href={`#/guide/topic/${next.id}`} data-testid="chapter-next">Next: {next.title.split(':')[0]}</a> : <span />}</nav>
    </div>
  );
}
export const contentsCovered = (): boolean => CONTENTS.every(([, where]) => where === 'room pages' || where === 'not built' || !!chapterById(where));
