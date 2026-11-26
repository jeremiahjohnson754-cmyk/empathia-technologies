/**
 * British and American spellings of one word find the same things (26 Nov 2026). The text people read is American English (founder
 * decisions CR-D2, scripts/content/american-english.mjs), but people type either: "lecture theatre" must still find Lecture Theater
 * SCI-110, and "theater" must still find text that keeps its British spelling (the price book, the SIGNAL canon). Each pair matches in
 * both directions and inside longer words ("theatres", "organisations"); a variant that matches nothing costs nothing.
 */
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['theatre', 'theater'], ['centre', 'center'], ['colour', 'color'], ['licence', 'license'], ['catalogue', 'catalog'], ['programme', 'program'],
  ['metre', 'meter'], ['fibre', 'fiber'], ['grey', 'gray'], ['labour', 'labor'], ['behaviour', 'behavior'], ['neighbour', 'neighbor'],
  ['harbour', 'harbor'], ['favour', 'favor'], ['honour', 'honor'], ['modelled', 'modeled'], ['modelling', 'modeling'], ['labelled', 'labeled'],
  ['travelled', 'traveled'], ['travelling', 'traveling'], ['cancelled', 'canceled'], ['cancelling', 'canceling'], ['organis', 'organiz'],
  ['authoris', 'authoriz'], ['recognis', 'recogniz'], ['prioritis', 'prioritiz'], ['optimis', 'optimiz'], ['synchronis', 'synchroniz'],
  ['analys', 'analyz'], ['practis', 'practic'], ['judgement', 'judgment'], ['acknowledgement', 'acknowledgment'], ['enrolment', 'enrollment'],
  ['ageing', 'aging'],
];

/** The word as typed, and its other spelling(s), lower case. */
export function spellings(word: string): string[] {
  const w = word.toLowerCase(); const out = new Set([w]);
  for (const [uk, us] of PAIRS) { if (w.includes(uk)) out.add(w.replace(uk, us)); if (w.includes(us)) out.add(w.replace(us, uk)); }
  return [...out];
}
