/**
 * The Knowledge Ledger inside Search Party and Ask Empathia. Both go through ledger.ts (`knowledgeHits`, `answerFor`), which read
 * only what the contract's `redactFor` leaves for this reader: in the demonstration, a reader of `corporate_demo` in the View-as
 * role. A result carries its citation and how far it may be trusted; an unverified object is offered to its reviewers alone and is
 * labelled a candidate; and a question with no approved source is answered with an abstention, never with invented text.
 */
import { useMemo } from 'react';
import { Tag } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { knowledgeHits, answerFor, readerFor, ABSTAIN, type KnowledgeHit } from './ledger.js';
import { load as loadWorkspace } from '../workspace/store.js';
import { loadState, allObjects } from './store.js';

const tone = (h: KnowledgeHit): 'ok' | 'warn' | 'info' => (h.candidate ? 'warn' : h.fact ? 'ok' : 'info');
const Hit = ({ h }: { h: KnowledgeHit }) => (
  <li data-id={h.id} data-fact={h.fact ? 'yes' : 'no'} data-candidate={h.candidate ? 'yes' : 'no'}>
    <a href={h.href}><b>{h.title}</b></a> <Tag tone={tone(h)}>{h.label}</Tag>
    <span className="kn-hit__snip">{h.snippet}</span><span className="ui-meta kn-hit__cite">Source: {h.citation}</span>
  </li>);

/** Search Party: knowledge that matches the search, under the records. Renders nothing when nothing this reader may read matches. */
export function KnowledgeResults({ q, role }: { q: string; role?: RoleKey }) {
  const hits = useMemo(() => (role && q.trim() ? knowledgeHits(allObjects(loadState(), loadWorkspace()), readerFor(role), q) : []), [q, role]);
  if (!hits.length) return null;
  return (
    <section className="kn-hits" aria-labelledby="kn-hits-h" data-testid="sp-knowledge" data-count={hits.length}>
      <h2 id="kn-hits-h">From the Knowledge Ledger</h2>
      <ul>{hits.map((h) => <Hit key={h.id} h={h} />)}</ul>
      <p className="ui-meta">Only what you may read is searched. <a href={`#/knowledge?q=${encodeURIComponent(q.trim().slice(0, 80))}`}>Open the ledger with this search</a></p>
    </section>
  );
}

/** Ask Empathia: an answer from an approved source with its citation, or an abstention. */
export function KnowledgeAnswer({ q, role }: { q: string; role: RoleKey }) {
  const a = useMemo(() => answerFor(allObjects(loadState(), loadWorkspace()), readerFor(role), q), [q, role]);
  return (
    <section className="pa-answer kn-answer" aria-label="From the Knowledge Ledger" data-testid="ask-knowledge" data-kind={a.kind}>
      {a.kind === 'answer' && <>
        <p className="pa-note">From the Knowledge Ledger, in the source’s own words:</p>
        <p className="pa-answer__lead" data-testid="ask-knowledge-lead">{a.lead}</p>
        <p className="kn-answer__cite"><Tag tone="ok">{a.hit.label}</Tag> <span className="ui-meta">Source:</span> <a href={a.hit.href} data-testid="ask-knowledge-cite">{a.hit.citation}</a></p>
      </>}
      {a.kind !== 'answer' && <p className="pa-answer__lead" data-testid="ask-abstain"><Tag tone="warn">No approved source</Tag> {ABSTAIN}</p>}
      {a.kind === 'unapproved' && <>
        <p className="pa-note">A source you may read covers it, but it is not approved, so it is not given as fact. It says:</p>
        <p data-testid="ask-knowledge-lead">{a.lead}</p>
        <p className="kn-answer__cite"><Tag tone={tone(a.hit)}>{a.hit.label}</Tag> <span className="ui-meta">Source:</span> <a href={a.hit.href} data-testid="ask-knowledge-cite">{a.hit.citation}</a></p>
      </>}
      {a.kind !== 'abstain' && a.more.length > 0 && <ul className="kn-hits__more">{a.more.map((h) => <Hit key={h.id} h={h} />)}</ul>}
    </section>
  );
}
