/**
 * #/harmony — one place to ask across the products. The page is a thin skin over harmony/tools.ts: it shows what Harmony understood,
 * which tool that is and the product page it stands on, whether this role holds that authority, the answer with each fact's source,
 * and the step it prepared as a link to the product's own page. Harmony changes nothing; the only thing this page writes is one
 * ledger line per question, refusals included.
 *
 * No language model runs in this demonstration, and the page says so. Harmony is not a certified professional and does not say it is.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHero, Card, Chip, EmptyState, Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { REFERENCE_ROOM_ID, roomById } from '../campus/canon.js';
import { honest } from '../parity/ui.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { log } from '../hardening/kit.js';
import { ask, examplesFor, toolsFor, toolById, type Reply, type Status } from './tools.js';

const WORD: Record<Status, { label: string; tone: 'ok' | 'info' | 'bad' | 'warn' | 'muted' }> = {
  answered: { label: 'Answered from the record', tone: 'ok' }, prepared: { label: 'Prepared: nothing was done', tone: 'info' }, refused: { label: 'Refused', tone: 'bad' },
  'needs-room': { label: 'Needs a room', tone: 'warn' }, abstained: { label: 'No answer', tone: 'muted' },
};

export default function HarmonyPage({ role, query }: PageProps) {
  const { w, apply } = useWorkspace(); const [text, setText] = useState(query.get('q') || ''); const [talk, setTalk] = useState<Reply[]>([]); const first = useRef(false); const liveRef = useRef<HTMLDivElement>(null);
  const room = roomById(REFERENCE_ROOM_ID)!; const tools = useMemo(() => toolsFor(role), [role]); const examples = useMemo(() => examplesFor(role, room), [role, room]);
  const [nudge, setNudge] = useState(false);   // 90-2: an empty question says what to do instead of doing nothing
  const put = (q: string) => {
    if (!q.trim()) { setNudge(true); document.getElementById('hm-q')?.focus(); return; } setNudge(false);
    const r = ask(q, role, Date.now(), w); if (!r.asked) return;
    setTalk((t) => [r, ...t].slice(0, 12)); setText('');
    apply((x) => { log(x, ROLES[role].label, r.status === 'refused' ? 'harmony.refused' : 'harmony.asked', r.tool ? `harmony:${r.tool}` : 'harmony', `${r.status}: “${r.asked.slice(0, 120)}”${r.authority ? ` · stands on ${r.authority.stands}` : ''} · changed nothing`, r.status === 'refused' ? 'DENIED' : 'ALLOWED'); return { ok: true }; });
    requestAnimationFrame(() => liveRef.current?.focus());
  };
  useEffect(() => { if (first.current) return; first.current = true; const q = query.get('q'); if (q) put(q); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const was = useRef(role); useEffect(() => { if (was.current === role) return; was.current = role; setTalk([]); }, [role]);   // another role's answers are not this role's (not on arrival: that would clear the question asked in the address)

  return (
    <div className="pa hm" data-native="" data-testid="harmony">
      <PageHero compact eyebrow="Harmony" title="Ask across the products" product="mission-control" icon="spark"
        lede="Say what you need in your own words. Harmony finds the tool for it, checks that your role may use it, then answers from the record or prepares the step for you to take. It does not act for you."
        meta={honest(['Synthetic data', 'warn'], ['No language model runs in this demonstration', 'muted'], ['Not a certified professional', 'muted'])} />

      <form className="hm-ask" onSubmit={(e) => { e.preventDefault(); put(text); }} data-testid="harmony-form">
        <div className="ui-field"><label htmlFor="hm-q">Ask Harmony</label><input id="hm-q" type="text" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" placeholder={examples[0]} data-testid="harmony-q" /></div>
        <button type="submit" className="ui-btn ui-btn--primary" data-testid="harmony-go">Ask</button>
      </form>
      {nudge && <p className="ui-meta ask-nudge" role="status" data-testid="ask-nudge">Type a question first.</p>}
      <div className="hm-try" data-testid="harmony-examples"><span id="hm-try-l">Try</span><ul aria-labelledby="hm-try-l">{examples.map((x) => <li key={x}><button type="button" className="ui-btn ui-btn--sm" onClick={() => put(x)}>{x}</button></li>)}</ul></div>

      <div className="hm-cols">
        <section className="hm-talk" aria-label="What Harmony said" data-testid="harmony-talk" data-count={talk.length}>
          <div ref={liveRef} tabIndex={-1} aria-live="polite" className="hm-live">
            {talk.length ? talk.map((r, i) => { const s = WORD[r.status]; const tool = r.tool ? toolById(r.tool as never) : null; return (
              <article key={`${talk.length - i}`} className="hm-reply" data-reply={i} data-status={r.status} data-tool={r.tool || 'none'} data-changed={r.changed}>
                <p className="hm-asked"><span className="ui-visually-hidden">You asked: </span>“{r.asked}”</p>
                <p className="hm-meta"><Chip small tone={s.tone}>{s.label}</Chip> <span data-testid="harmony-understood">Understood as: {r.understood}</span></p>
                <p className="hm-said" data-testid="harmony-said">{r.said}</p>
                {r.facts.length ? <ul className="hm-facts">{r.facts.map((f, k) => <li key={k}><span className="hm-dot" aria-hidden="true" /><span>{f.href ? <a href={f.href}>{f.text}</a> : f.text}<span className="hm-src">Source: {f.source}</span></span></li>)}</ul> : null}
                {r.next.length ? <p className="hm-next">{r.next.map((n) => <a key={n.href} className={`ui-btn${n.primary ? ' ui-btn--primary' : ''}`} href={n.href}>{n.label}</a>)}</p> : null}
                <p className="hm-foot">{r.authority ? <>{tool ? `Tool: ${tool.title}. ` : ''}Stands on “{r.authority.stands}”, which the {ROLES[role].label} {r.authority.held ? 'has' : 'does not have'}. </> : null}Harmony changed nothing.</p>
              </article>); })
              : <EmptyState title="Nothing asked yet" icon="spark">Ask a question above, or choose one of the examples. Each answer says where it came from; each step is yours to take.</EmptyState>}
          </div>
        </section>

        <Card title={`What Harmony can do for the ${ROLES[role].label}`} icon="shield" sub="Each tool stands on a product page. If your role cannot open that page, Harmony cannot use the tool for you, however it is asked." testId="harmony-tools">
          <ul className="hm-tools">{tools.map((t) => <li key={t.id} data-tool={t.id} data-held={t.held ? 'yes' : 'no'}><Icon name={t.held ? 'check' : 'lock'} size={16} label={t.held ? 'Available' : 'Not available to this role'} />
            <span><b>{t.title}</b><span>{t.kind === 'answers' ? 'Answers' : 'Prepares'}: {t.does}. Stands on “{t.standsOn}”.</span></span></li>)}</ul>
          <p className="hm-note">Beyond these, a question is passed to Ask Empathia’s prepared questions and then to the Knowledge Ledger, which answers only from an approved source and otherwise says it has none.</p>
        </Card>
      </div>
    </div>
  );
}
