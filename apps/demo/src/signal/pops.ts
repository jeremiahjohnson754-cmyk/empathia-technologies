/**
 * The story's result pop-ups, restored 12 November 2026 to the founder's build package (reference gate.js popResult / showPop and quest.js
 * questObjectiveFor; the reference wins). When a gate is newly cleared, a "QUEST UPDATED" card says what happened (the choice and its merit
 * and trust, a check's score, a drill or lab passed or not, an incident's outcome, a boss cleared), names the quest objective it completed,
 * and says whether the next page is open; when the chapter is finished, a "QUEST LOG" card gives the quest rating and its line, the
 * discoveries found and the chapter it unlocks. Pure: it reads the chapter, the stored progress and the build's signal/mission.json.
 * Gates cleared by "Skip for now" and optional pieces raise no card. Meltdown and review lines are this product's (the reference's card
 * carries only their title).
 */
import { gateDone, gateCleared, gateKey, trustLine, weightOf, TIMEOUT, type ChapterState, type Gate, type Item, type Pieces, type Progress } from './story.js';
import { GRADE_LINE, objectiveDone, questRating, type MissionIndex } from './mission.js';

export type Tone = 'ok' | 'mid' | 'bad';
export interface PopBody { kicker: string; title: string; lines: string[]; tone: Tone }
export const GATE_TITLE: Record<string, string> = { decision: 'CHOICE LOCKED IN', quiz: 'CHECK COMPLETE', drill: 'DRILL COMPLETE', lab: 'LAB COMPLETE', lesson: 'LESSON COMPLETE', incident: 'INCIDENT CLOSED', meltdown: 'MELTDOWN OVER', review: 'SEASON PASSED', boss: 'BOSS CLEARED' };
type Decision = Extract<Item, { type: 'decision' }>;

/** The gates worth a card: hard and soft ones done by playing (not skipped). */
export const poppable = (g: Gate) => g.tier !== 'opt';
export const doneKeys = (pieces: Pieces, s: ChapterState, P: Progress): Set<string> => new Set(pieces.gates.filter((g) => poppable(g) && gateDone(g, s, P, pieces)).map(gateKey));

/** The quest objective a gate completes (quest.js questObjectiveFor), its text when it is now done. */
export function objectiveFor(g: Gate, items: Item[], P: Progress, M: MissionIndex | null, cid: string, lessonQuiz: Record<string, string>): string | null {
  const q = items.find((i): i is Extract<Item, { type: 'quest' }> => i.type === 'quest'); if (!q || !M) return null;
  const key = g.kind === 'decision' ? g.id : g.core ? 'core' : g.kind === 'incident' ? 'incident' : g.kind === 'meltdown' ? 'meltdown' : g.twist ? 'twist' : g.kind === 'lesson' ? 'lesson' : null;
  const o = key ? q.objectives.find((x) => x.key === key) : null; if (!o || !objectiveDone(P, M, cid, key!, lessonQuiz)) return null;
  return o.text;
}
/** The card for one newly cleared gate. */
export function gatePop(g: Gate, items: Item[], s: ChapterState, P: Progress, pieces: Pieces, M: MissionIndex | null, cid: string, lessonQuiz: Record<string, string>): PopBody {
  const lines: string[] = []; let tone: Tone = 'ok'; const k = g.kind, id = g.id;
  if (k === 'decision') {
    const c = s.choices[id], d = items.find((i): i is Decision => i.type === 'decision' && i.id === id);
    if (c?.letter === TIMEOUT) return { kicker: `${cid.toUpperCase()} · QUEST UPDATED`, title: 'THE CLOCK DECIDED FOR YOU', tone: 'bad', lines: ['You froze. The story moved on without your call — and people noticed.', 'Replay the card any time to decide for real.', ...tail()] };
    if (c && d) { const w = weightOf(d, c), o = w.option; if (o) lines.push(`You chose: ${o.label}`);
      tone = w.verdict === 'costly' ? 'bad' : w.verdict === 'canonical' ? 'ok' : 'mid';
      lines.push(`${w.verdict === 'canonical' ? '★ The professional call. ' : w.verdict === 'costly' ? '✕ A costly call. ' : '◐ It works — not the best. '}Merit ${w.merit > 0 ? '+' : ''}${w.merit}`);
      const tl = trustLine(w.trust); if (tl) lines.push(`Trust ${tl}`); }
  } else if (k === 'quiz' || k === 'lesson') {
    const qid = k === 'lesson' ? pieces.lessons[id]?.quiz || lessonQuiz[id] || id : id, q = P.quizzes[qid]; const best = q?.best || 0, total = q?.total || 0;
    lines.push(`Score ${best} / ${total}${best === total ? ' · clean sheet' : ' · the explanations stay open above'}`); tone = best === total ? 'ok' : 'mid';
  } else if (k === 'drill') { const d = P.drills[id]; tone = d?.passed ? 'ok' : 'bad'; lines.push(d?.passed ? '✓ Passed.' : '✕ Not passed this time — the failure explained itself. You can retry in Practice.'); }
  else if (k === 'lab') { const l = P.labs[id]; tone = l?.passed ? 'ok' : 'bad'; lines.push(l?.passed ? '✓ Fixed and proven on the simulator.' : '✕ Not passed — the fix is shown in the lab. Try again in Practice.'); }
  else if (k === 'boss') { const b = P.bosses[id]; tone = 'ok'; const n = b?.tries || 1; lines.push(`✓ Boss cleared in ${n} run${n === 1 ? '' : 's'}. The next season is open.`); }
  else if (k === 'incident') { const r = P.incidents[id]; tone = r?.best === 'proven' ? 'ok' : r?.best === 'partial' ? 'mid' : 'bad';
    lines.push(r?.best === 'proven' ? '✓ Service restored and proven where the users are.' : r?.best === 'partial' ? '◐ Restored, not proven.' : r?.best === 'fail' ? '✕ Incident failed — the debrief explains why.' : 'Closed.'); }
  else if (k === 'meltdown') { const r = P.meltdowns[id]; tone = r?.last === 'proven' ? 'ok' : r?.last === 'partial' ? 'mid' : 'bad';
    if (r) lines.push(`${r.last === 'proven' ? '✓ Contained and proven' : r.last === 'partial' ? '◐ Survived, not proven' : '✕ Mission failed — the after-action review shows where it turned'} · rating ${r.grade}`); }
  else if (k === 'review') { const r = P.reviews[id]; if (r) lines.push(`✓ Story Score ${r.score} / 100. The next season is open.`); }
  return { kicker: `${cid.toUpperCase()} · QUEST UPDATED`, title: GATE_TITLE[k] || GATE_TITLE.quiz!, tone, lines: [...lines, ...tail()] };
  function tail() { const out: string[] = []; const qo = objectiveFor(g, items, P, M, cid, lessonQuiz); if (qo) out.push(`Quest: ✓ ${qo}`);
    const left = pieces.gates.some((x) => x.tier !== 'opt' && !gateCleared(x, s, P, pieces)); out.push(left ? 'The next page is open.' : 'Every gate in this chapter is cleared.'); return out; }
}
/** The card when the chapter is finished. */
export function chapterPop(title: string, items: Item[], s: ChapterState, P: Progress, M: MissionIndex | null, cid: string, lessonQuiz: Record<string, string>, next: { title: string } | null): PopBody {
  const lines = [`${title} is finished.`]; let tone: Tone = 'ok';
  if (M?.chq[cid]) { const r = questRating(P, M, cid, lessonQuiz); lines.push(`Quest rating ${r.grade} · ${r.got} / ${r.max} — ${GRADE_LINE[r.grade]}`); tone = r.grade === 'C' || r.grade === 'D' ? 'mid' : 'ok';
    const all = items.filter((i) => i.type === 'discovery').length; if (all) lines.push(`🔎 Discoveries ${s.found.length} / ${all}`); }
  lines.push(next ? `Unlocked: ${next.title}` : 'You reached the end of the novel so far.');
  return { kicker: `${cid.toUpperCase()} · QUEST LOG`, title: 'CHAPTER COMPLETE', lines, tone };
}
