/**
 * #/ask (Ask Empathia): a fixed set of questions answered by reading Core. There is no language model here, live or otherwise: a question
 * is matched to one of the prepared questions by its words, the answer is computed from the records, and every answer cites the records
 * it stands on. A question that is not one of them is said to be so, with the nearest prepared questions offered instead.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { PageHero, Chip, Tag, Icon } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { ROOMS, BUILDINGS, buildingByKey, shortName, fullName, roomHref, type RoomOutline } from '../campus/canon.js';
import { openIssues, DEMO_NOW } from '../campus/design.js';
import { load as loadDecisions } from '../decisions/store.js';
import { healthOf, busyAt, nextOf, hhmm, fmtUsd, plural, AGREEMENTS, VENDORS, type Core, type Rec } from './core.js';
import { useCore, honest, Zone, RecList, visible } from './ui.js';

interface Answer { lead: ReactNode; cites: Rec[]; more?: Array<[string, string]> }
interface Q { id: string; group: 'Rooms' | 'The estate' | 'Design' | 'The workplace'; text: string; words: RegExp; needsRoom?: boolean; field?: 'ask.engineering' | 'ask.portfolio'; answer: (c: Core, room: RoomOutline | null, role: RoleKey) => Answer }

const REF = ROOMS[0]!;
export function roomIn(q: string): RoomOutline | null {
  const t = q.toLowerCase();
  const num = /(\d)\.(\d{3})/.exec(t); if (num) { const hit = ROOMS.filter((r) => r.number === `${num[1]}.${num[2]}`); const b = BUILDINGS.find((x) => t.includes(x.short.toLowerCase())); return hit.find((r) => !b || r.building === b.key) || hit[0] || null; }
  return ROOMS.find((r) => r.aliases.some((a) => a.length > 3 && t.includes(a.toLowerCase()))) || null;
}
const recOf = (c: Core, o: RoomOutline) => c.rooms.find((r) => r.outline.id === o.id)!;
const roomRec = (c: Core, o: RoomOutline) => c.byType.Room.filter((x) => x.id === o.id);

export const QUESTIONS: Q[] = [
  { id: 'why', group: 'Rooms', text: `Why is ${shortName(REF)} degraded?`, words: /\bwhy\b.*\b(degraded|unhealthy|bad|wrong|health|monitor)\b|\bhealth of\b/, needsRoom: true, field: 'ask.engineering', answer: (c, o) => { const r = recOf(c, o!); const h = healthOf(r); const iss = openIssues(r);
    return { lead: <>{fullName(o!)} has a health of <b>{h} of 100</b> by this demonstration’s rule. {iss.length ? <>It has {plural(iss.length, 'open issue')}: {iss.map((i) => i.title.toLowerCase()).join('; ')}.</> : 'No issue is open.'} {r.counts.verified < r.counts.applicable ? `${r.counts.applicable - r.counts.verified} of ${r.counts.applicable} applicable tests have no verified result.` : 'Every applicable test is verified.'}</>, cites: [...roomRec(c, o!), ...c.byType.Issue.filter((x) => x.roomId === o!.id && x.state !== 'RESOLVED')], more: [['Open the room', roomHref(o!)], ['Its ledger entry', `#/ledger/rec/C-H-${o!.id.slice(2)}`]] }; } },
  { id: 'changed', group: 'Rooms', text: `What changed in ${shortName(REF)} since commissioning?`, words: /\b(changed|change|different|since)\b/, needsRoom: true, field: 'ask.engineering', answer: (c, o) => { const r = recOf(c, o!); const bl = r.baselines.find((b) => b.state === 'CURRENT'); const after = bl ? r.events.filter((e) => Date.parse(e.at) > Date.parse(bl.at)) : r.events;
    return { lead: bl ? <>Since baseline v{bl.version} ({bl.at.slice(0, 10)}), {plural(after.length, 'event')} are on record{after.length ? <>, latest: {after[0]!.type.replace(/[._]/g, ' ')} — {after[0]!.detail}</> : ''}. {r.installations.filter((i) => i.removedAt).length ? `${plural(r.installations.filter((i) => i.removedAt).length, 'unit')} were replaced.` : 'No unit was replaced.'}</> : <>{shortName(o!)} has no commissioning baseline yet: it is {r.lifecycle.toLowerCase().replace(/_/g, ' ')}.</>, cites: c.byType.LifecycleEvent.filter((e) => e.roomId === o!.id).slice(0, 6), more: [['Compare with its baseline', '#/compare/commissioned']] }; } },
  { id: 'blocked', group: 'Rooms', text: `Why is ${shortName(ROOMS.find((r) => r.id === 'R-BCN-3-101') || REF)} blocked?`, words: /\b(blocked|stuck|waiting|can't|cannot|why not)\b/, needsRoom: true, answer: (c, o) => { const r = recOf(c, o!);
    return { lead: r.nextStep && r.nextStep.blockers.length ? <>{shortName(o!)} cannot move from {r.lifecycle.toLowerCase().replace(/_/g, ' ')} to {r.nextStep.to.toLowerCase().replace(/_/g, ' ')}: {r.nextStep.blockers.join('; ')}.</> : <>{shortName(o!)} is not blocked: it is {r.lifecycle.toLowerCase().replace(/_/g, ' ')} and its record has no refused next step.</>, cites: roomRec(c, o!), more: [['Open the room', roomHref(o!)]] }; } },
  { id: 'audio', group: 'Rooms', text: 'Show rooms with audio problems.', words: /\baudio|sound|microphone|speaker|hear\b/, field: 'ask.engineering', answer: (c) => { const hits = c.rooms.filter((r) => openIssues(r).some((i) => i.positions.some((p) => r.positions.find((x) => x.code === p)?.layer === 'audio')));
    return { lead: hits.length ? <>{plural(hits.length, 'room')} {hits.length === 1 ? 'has' : 'have'} an open issue on an audio device: {hits.map((r) => shortName(r.outline)).join(', ')}.</> : 'No room has an open issue on an audio device.', cites: c.byType.Room.filter((x) => hits.some((h) => h.outline.id === x.id)) }; } },
  { id: 'cause', group: 'The estate', text: 'What is the most common root cause?', words: /\b(common|root cause|cause|most)\b/, field: 'ask.engineering', answer: (c) => { const n: Record<string, number> = {}; c.rooms.forEach((r) => r.issues.forEach((i) => i.positions.forEach((p) => { const l = r.positions.find((x) => x.code === p)?.layer || 'unknown'; n[l] = (n[l] || 0) + 1; }))); const sorted = Object.entries(n).sort((a, b) => b[1] - a[1]);
    return { lead: sorted.length ? <>Counted by the layer of the device each issue names, open and resolved: {sorted.map(([l, k]) => `${l} ${k}`).join(', ')}. The most common is <b>{sorted[0]![0]}</b>. The records name a device, not a proven cause: a cause is confirmed only by a test.</> : 'No issue is on record.', cites: c.byType.Issue.slice(0, 8), more: [['Investigate one case', '#/investigate']] }; } },
  { id: 'support', group: 'The estate', text: 'Which devices have no support agreement?', words: /\b(support|agreement|vendor|warranty)\b.*\b(device|no|without)\b|\bno support\b|\buncovered\b/, answer: (c) => { const d = c.byType.Device.filter((x) => x.state === 'In service'); const by: Record<string, number> = {}; d.forEach((x) => { by[x.building || '—'] = (by[x.building || '—'] || 0) + 1; });
    return { lead: <>{plural(d.length, 'device')} in service have no active agreement covering their building and layer{d.length ? <>: {Object.entries(by).map(([b, k]) => `${buildingByKey(b)?.short || b} ${k}`).join(', ')}</> : ''}. This is inferred from the support register, not observed.</>, cites: d.slice(0, 8), more: [['Every one of them', '#/set/dev:uncovered']] }; } },
  { id: 'recommission', group: 'The estate', text: 'Which rooms should be recommissioned?', words: /\brecommission/, field: 'ask.engineering', answer: (c) => { const recs = c.byType.Recommendation.filter((x) => x.state === 'Recommission'); const repl = c.rooms.filter((r) => r.reopened.length);
    return { lead: <>{plural(recs.length, 'recommendation')} to recommission from open drift or layout issues{repl.length ? `, and ${plural(repl.length, 'room')} whose replaced unit reopened tests (${repl.map((r) => shortName(r.outline)).join(', ')})` : ''}. Each needs an engineer’s approval.</>, cites: [...recs, ...c.byType.Room.filter((x) => repl.some((r) => r.outline.id === x.id))] }; } },
  { id: 'budget', group: 'The estate', text: 'What should we budget for next year?', words: /\b(budget|cost|spend|money|capital)\b/, field: 'ask.portfolio', answer: (c) => { const d = loadDecisions(); const open = d.projects.filter((p) => p.state !== 'REJECTED'); const sum = open.reduce((s, p) => s + p.romUsd, 0);
    return { lead: <>The projects on the decision desk add up to <b>{fmtUsd(sum)}</b> in rough orders of magnitude ({open.map((p) => `${p.name} ${fmtUsd(p.romUsd)}, ${p.state.toLowerCase().replace(/_/g, ' ')}`).join('; ')}). These are estimates from the briefs, not quotes; nothing else is budgeted in the records.</>, cites: c.byType.BudgetScenario, more: [['Estimate against actual', '#/compare/budget']] }; } },
  { id: 'designrule', group: 'Design', text: 'Which rooms fail a design rule?', words: /\b(design rule|fail|finding|rule)\b/, answer: (c) => { const hits = c.rooms.filter((r) => r.findings.length);
    return { lead: <>{plural(hits.length, 'room')} {hits.length === 1 ? 'has' : 'have'} at least one finding from the design engine: {hits.slice(0, 8).map((r) => `${shortName(r.outline)} (${r.findings.length})`).join(', ')}{hits.length > 8 ? ' …' : ''}.</>, cites: c.byType.Design.filter((x) => hits.some((h) => h.outline.id === x.roomId)) }; } },
  { id: 'review', group: 'Design', text: `What did the engine find in ${shortName(REF)}’s design?`, words: /\b(design|review|engine)\b/, needsRoom: true, answer: (c, o) => { const r = recOf(c, o!);
    return { lead: r.findings.length ? <>{plural(r.findings.length, 'finding')} on {shortName(o!)}’s design: {r.findings.slice(0, 4).map((f) => `${f.check.replace(/[_.]/g, ' ')} (${String(f.severity).toLowerCase()}): ${f.rationale}`).join('; ')}.</> : <>The engine found nothing in {shortName(o!)}’s design.</>, cites: c.byType.Design.filter((x) => x.roomId === o!.id) }; } },
  { id: 'where', group: 'The workplace', text: `Where is ${shortName(ROOMS.find((r) => r.id === 'R-BCN-3-101') || REF)}?`, words: /\bwhere\b|\bfind\b|\bway to\b/, needsRoom: true, answer: (c, o) => ({ lead: <>{fullName(o!)} is in {buildingByKey(o!.building)?.name}, floor {o!.floor}. It seats {o!.capacity}.</>, cites: roomRec(c, o!), more: [['Open it on the campus', roomHref(o!)]] }) },
  { id: 'free', group: 'The workplace', text: 'Which rooms are free now?', words: /\b(free|available|book|empty|now)\b/, answer: (c) => { const free = ROOMS.filter((r) => !busyAt(r.id));
    return { lead: <>{plural(free.length, 'room')} of {ROOMS.length} are free at {hhmm(DEMO_NOW)} UTC on the demonstration clock (the sessions are generated, not a real calendar){free.length ? <>: {free.slice(0, 6).map((r) => `${shortName(r)}${nextOf(r.id) ? ` until ${hhmm(nextOf(r.id)!.from)}` : ''}`).join(', ')}{free.length > 6 ? ' …' : ''}</> : ''}.</>, cites: c.byType.Room.filter((x) => free.some((f) => f.id === x.id)), more: [['The room scheduler', '#/scheduler']] }; } },
  { id: 'use', group: 'The workplace', text: `How do I use ${shortName(REF)}?`, words: /\bhow (do|can) i\b|\buse\b|\bstart a meeting\b|\bguide\b/, needsRoom: true, answer: (c, o) => ({ lead: <>Every room uses one control language: one sentence says what the room is doing, one dock (microphone, volume, camera, share, session) sits in the same place, and help is never hidden. {shortName(o!)}’s panel is a simulation here.</>, cites: roomRec(c, o!), more: [['Open its control', `#/control/${o!.id}`]] }) },
  { id: 'buildings', group: 'The workplace', text: 'How many rooms does each building have?', words: /\bhow many\b|\bbuildings?\b|\bcount\b/, answer: (c) => ({ lead: <>{BUILDINGS.map((b) => `${b.short} ${ROOMS.filter((r) => r.building === b.key).length}`).join(', ')}: {ROOMS.length} rooms on record in {BUILDINGS.length} buildings.</>, cites: [], more: [['The campus', '#/campus']] }) },
  { id: 'who', group: 'The workplace', text: 'Who supports Atlas?', words: /\bwho\b.*\b(support|fix|maintain|look after)/, answer: (c) => { const t = AGREEMENTS.filter((a) => a.status === 'Active' && a.buildings.includes('ATL'));
    return { lead: <>{t.map((a) => `${VENDORS.find((v) => v[0] === a.vendor)?.[1]} (${a.layers.join(', ')})`).join('; ')}. Every organisation here is fictional.</>, cites: c.byType.SupportAgreement.filter((x) => t.some((a) => a.id === x.id)) }; } },
];
export const mayAsk = (q: Q, role: RoleKey) => !q.field || allows({ field: q.field }, role);
/** Match a typed question: the prepared question whose words match, with the room it names (or the reference room when it needs one). */
export function match(text: string, role: RoleKey): { q: Q; room: RoomOutline | null } | null {
  const t = text.toLowerCase().trim(); if (t.length < 3) return null;
  const exact = QUESTIONS.find((q) => q.text.toLowerCase() === t); const room = roomIn(t);
  const hit = exact || QUESTIONS.filter((q) => mayAsk(q, role)).find((q) => q.words.test(t) && (!q.needsRoom || room)) || QUESTIONS.filter((q) => mayAsk(q, role)).find((q) => q.words.test(t) && !q.needsRoom);
  if (!hit || !mayAsk(hit, role)) return null;
  return { q: hit, room: hit.needsRoom ? room || REF : null };
}

export default function AskPage({ role, query }: PageProps) {
  const core = useCore(); const [text, setText] = useState(query.get('q') || ''); const [asked, setAsked] = useState(query.get('q') || '');
  const mine = QUESTIONS.filter((q) => mayAsk(q, role));
  const result = useMemo(() => (asked ? match(asked, role) : null), [asked, role]);
  const ans = result ? result.q.answer(core, result.room, role) : null;
  const submit = (e: { preventDefault(): void }) => { e.preventDefault(); setAsked(text.trim()); };
  const groups = ['Rooms', 'The estate', 'Design', 'The workplace'] as const;
  return (
    <div className="pa" data-native="" data-testid="parity-ask">
      <PageHero eyebrow="Core · Ask Empathia" title="Ask Empathia" product="search-party" icon="search" lede="A question, an answer built from Core, and the records it stands on."
        meta={honest(['Answers from Core · no language model', 'accent'], ['Every answer cites its sources', 'muted'], ['Synthetic data', 'warn'])} />
      <form className="pa-ask" role="search" onSubmit={submit} aria-label="Ask Empathia">
        <label className="ui-sr" htmlFor="pa-ask-q">Your question</label>
        <input id="pa-ask-q" value={text} maxLength={160} onChange={(e) => setText(e.target.value)} placeholder={mine[2]?.text || 'Ask about a room'} autoComplete="off" />
        <button className="ui-btn ui-btn--primary" type="submit"><Icon name="search" size={16} /> Ask</button>
      </form>
      <div aria-live="polite" data-testid="ask-answer">
        {asked && ans && result ? (
          <section className="pa-answer" aria-label="Answer">
            <p className="pa-note">Answering “{result.q.text.replace(shortName(REF), result.room ? shortName(result.room) : shortName(REF))}”{result.room && !roomIn(asked) ? ` — no room was named, so the reference room ${shortName(REF)}` : ''}</p>
            <p className="pa-answer__lead">{ans.lead}</p>
            {ans.more ? <div className="pa-chips">{ans.more.map(([l, h]) => <Chip key={h} href={h} icon="link" small>{l}</Chip>)}</div> : null}
            {visible(role, ans.cites).length ? <><h2 className="pa-zone__note">The records it stands on</h2><RecList recs={visible(role, ans.cites)} label="Cited records" step={6} /></> : <p className="pa-note">Counted from the room canon; no single record to cite.</p>}
          </section>
        ) : asked ? (
          <section className="pa-answer" aria-label="Not one of the prepared questions">
            <p className="pa-answer__lead"><Tag tone="warn">Not a prepared question</Tag> Ask Empathia answers a fixed set of questions by reading Core. It does not generate text, and “{asked.slice(0, 80)}” is not one of them.</p>
            <p className="pa-note">Try one of these:</p>
            <div className="pa-chips">{mine.slice(0, 4).map((q) => <Chip key={q.id} onClick={() => { setText(q.text); setAsked(q.text); }}>{q.text}</Chip>)}</div>
          </section>
        ) : null}
      </div>
      <Zone title="Questions it can answer" note={`${mine.length} prepared for this role`}>
        {groups.map((g) => { const qs = mine.filter((q) => q.group === g); return qs.length ? <div key={g} className="pa-zone"><h3 className="pa-zone__note">{g}</h3><div className="pa-chips">{qs.map((q) => <Chip key={q.id} onClick={() => { setText(q.text); setAsked(q.text); }} selected={asked === q.text}>{q.text}</Chip>)}</div></div> : null; })}
        <p className="pa-note">Ask Empathia answers a fixed set of questions by reading Core. It does not generate text, and it says so when a question is not one of them.</p>
      </Zone>
    </div>
  );
}
