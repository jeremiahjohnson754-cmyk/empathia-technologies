// The founder's own words, supplied by Jeremiah Johnson on 2026-11-13 (20:16 CT) with a photograph of the fortune-cookie slip whose
// line opens them. The words are his, verbatim: rendered exactly as they stand, never edited, trimmed, reordered or paraphrased (a test
// compares the page with these constants). Only the paragraph breaks are the page's. They live here, not in ./founder.ts, which is
// never edited.
export const FORTUNE_LINE = 'Trust the feeling that arrived before the explanation.';
export const FOUNDER_QUOTE = [
  'Not every truth announces itself with evidence. Some arrive quietly, as a feeling you spend years learning to understand.',
  "Somewhere between what I knew and what I couldn't explain, I found a truth that changed everything.",
  'The universe rarely hands you a complete map. Sometimes it gives you a direction, a feeling, and the courage to take the first step.',
  'The feeling was the beginning. The explanation was the confirmation.',
  "Because sometimes the explanation doesn't create the realization. It simply catches up to it.",
] as const;
/** the whole quotation as he sent it, one string: what the test checks the page against */
export const FOUNDER_QUOTE_TEXT = [FORTUNE_LINE, ...FOUNDER_QUOTE].join(' ');
/** the photograph: his, cropped to the slip and the hand that holds it (apps/website/media/keepsake) */
export const FORTUNE_PHOTO = { src: '/media/keepsake/fortune', w: 960, h: 640, alt: 'A hand holding a fortune-cookie slip that reads: Trust the feeling that arrived before the explanation.' };
