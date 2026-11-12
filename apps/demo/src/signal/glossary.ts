/**
 * Glossary terms marked in the story, restored 12 November 2026 to the founder's build package (reference ladder.js GL_RX, glMark,
 * wrapFirst; the reference wins): each glossary term is underlined at its first use in a chapter, in the reading text (narration, speech,
 * captions, what is happening at a decision, beats, twists, history notes, discoveries), and opens a pop-over with its definition.
 *
 * The reference walks the page's text nodes after they are drawn. Here the same walk is done once over the chapter's items, in reading
 * order, before anything is drawn, so a mark never moves when one piece of the page redraws (a decision's clock, say). Pure.
 */
import { emphasis, type Item } from './story.js';

export interface Term { id: string; term: string; d: string; dom: string; f: string[]; first: string | null; marks: Array<[string, boolean]> }
export interface GlossaryIndex { terms: Term[]; formulas: Record<string, { name: string; eq: string }>; titles: Record<string, string> }
export interface GlRx { ci: RegExp | null; cs: RegExp | null; mapCi: Record<string, Term>; mapCs: Record<string, Term> }
/** A piece of reading text: emphasis as the story has it, and a glossary term where one is marked. */
export interface Seg { t: string; b?: boolean; i?: boolean; g?: Term }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The reference's two expressions: case-sensitive marks (acronyms) and the rest, longest first, bounded by anything but a word character or a hyphen. */
export function buildRx(terms: Term[]): GlRx {
  const ci: string[] = [], cs: string[] = [], mapCi: Record<string, Term> = {}, mapCs: Record<string, Term> = {};
  for (const g of terms) for (const [m, sensitive] of g.marks || []) { if (sensitive) { cs.push(m); mapCs[m] = g; } else { ci.push(m); mapCi[m.toLowerCase()] = g; } }
  const rx = (list: string[], flags: string) => (list.length ? new RegExp(`(^|[^A-Za-z0-9_\\-])(${[...list].sort((a, b) => b.length - a.length).map(esc).join('|')})(?=$|[^A-Za-z0-9_\\-])`, flags) : null);
  return { ci: rx(ci, 'gi'), cs: rx(cs, 'g'), mapCi, mapCs };
}
/** wrapFirst: split one run of text at the earliest term not yet used in this chapter, mark it, and go on with the rest. */
export function markRun(s: string, R: GlRx, used: Set<string>): Array<{ t: string; g?: Term }> {
  let best: { at: number; len: number; g: Term } | null = null;
  for (const [re, map, lower] of [[R.cs, R.mapCs, false], [R.ci, R.mapCi, true]] as const) {
    if (!re) continue; re.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(s))) { const g = map[lower ? m[2]!.toLowerCase() : m[2]!]; if (g && !used.has(g.term)) { const at = m.index + m[1]!.length; if (!best || at < best.at) best = { at, len: m[2]!.length, g }; break; } if (m[0].length === 0) re.lastIndex += 1; }
  }
  if (!best) return s ? [{ t: s }] : [];
  used.add(best.g.term);
  return [...(best.at ? [{ t: s.slice(0, best.at) }] : []), { t: s.slice(best.at, best.at + best.len), g: best.g }, ...markRun(s.slice(best.at + best.len), R, used)];
}
/** One string of reading text, its emphasis kept: each emphasised run is marked in turn (the reference's text nodes). */
export function markText(text: string, R: GlRx, used: Set<string>, plain = false): Seg[] {
  const parts = plain ? [{ t: text }] : emphasis(text); const out: Seg[] = [];
  for (const p of parts) { if (p.t.trim().length <= 2) { out.push(p); continue; } for (const r of markRun(p.t, R, used)) out.push({ ...p, t: r.t, ...(r.g ? { g: r.g } : {}) }); }
  return out;
}
/** The reading text of one item, in the order the reader draws it, each with a stable key (item index : field). */
export function readingText(it: Item, n: number): Array<[string, string, boolean]> {
  const out: Array<[string, string, boolean]> = []; const paras = (k: string, s: string) => s.split(/\n{2,}/).forEach((p, i) => out.push([`${n}:${k}${i}`, p, false]));
  switch (it.type) {
    case 'panel': it.narration.forEach((x, i) => out.push([`${n}:n${i}`, x.replace(/\s*\[COMIC\]\s*$/, ''), true])); it.bubbles.forEach((b, i) => out.push([`${n}:b${i}`, b.text, false])); if (it.caption) out.push([`${n}:cap`, it.caption, true]); break;
    case 'beat': it.lines.forEach((l, i) => out.push([`${n}:l${i}`, l.text, false])); break;
    case 'decision': out.push([`${n}:hap`, it.happening, true]); break;
    case 'twist': paras('tw', it.body); break;
    case 'history': paras('hi', it.body); break;
    case 'discovery': paras('di', it.body); break;
    default: break;
  }
  return out;
}
/** The whole chapter: every term marked once, at its first use. Keyed by readingText's keys; text with no term is left out. */
export function chapterMarks(items: Item[], R: GlRx): Map<string, Seg[]> {
  const used = new Set<string>(), out = new Map<string, Seg[]>();
  items.forEach((it, n) => { for (const [k, s, plain] of readingText(it, n)) { const segs = markText(s, R, used, plain); if (segs.some((x) => x.g)) out.set(k, segs); } });
  return out;
}
/** glTermsIn: every distinct term in a text, in the order the expressions find them (case-sensitive marks first, as the reference). */
export function termsIn(text: string, R: GlRx): Term[] {
  const out: Term[] = [], seen = new Set<string>();
  for (const [re, map, lower] of [[R.cs, R.mapCs, false], [R.ci, R.mapCi, true]] as const) {
    if (!re) continue; re.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(text))) { const g = map[lower ? m[2]!.toLowerCase() : m[2]!]; if (g && !seen.has(g.term)) { seen.add(g.term); out.push(g); } }
  }
  return out;
}
/** glNeeds: the terms an interactive needs — those in its text, then those tied to its formulas — five for a beginner (with their
 *  definitions), seven otherwise (as chips that open the pop-over). */
export function needs(text: string, fkeys: string[], tier: number, terms: Term[], R: GlRx): Term[] {
  const gs = termsIn(text, R), seen = new Set(gs.map((g) => g.term));
  for (const k of fkeys) for (const g of terms) if (g.f.includes(k) && !seen.has(g.term)) { seen.add(g.term); gs.push(g); }
  return gs.slice(0, tier <= 1 ? 5 : 7);
}
