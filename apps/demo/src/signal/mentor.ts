/**
 * SIGNAL's mentor channel, built-in answers (restored 12 Nov 2026 to the founder's build package: reference app.js offline()). The
 * reference asks a live model when its host provides one and otherwise answers from twenty prepared answers; this product has no live
 * model here, so it always uses the prepared answers and says so. The best answer is the one whose keywords appear most often in the
 * question (the first wins a tie); with none, the method line. Pure.
 */
export interface MentorAnswer { k: string[]; a: string }
export const MENTOR_OPEN = 'Channel open. What are you working on — and what have you already ruled out?';
export const MENTOR_FALLBACK = 'Good question. Start with the method: what is the system trying to do, which path carries it, and what changed since it last worked? Tell me what you have ruled out and I’ll point you at the next test.';
export function mentorAnswer(q: string, offline: MentorAnswer[]): { text: string; matched: boolean } {
  const s = q.toLowerCase(); let best: MentorAnswer | null = null, score = 0;
  for (const a of offline) { const n = a.k.filter((k) => s.includes(k)).length; if (n > score) { score = n; best = a; } }
  return best ? { text: best.a, matched: true } : { text: MENTOR_FALLBACK, matched: false };
}
