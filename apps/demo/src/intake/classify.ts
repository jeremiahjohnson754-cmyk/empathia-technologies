/**
 * Reading what a person typed on the front door ("Describe what you need…", directive 19 Nov 2026 §03, §04 step 1), by rules: word lists,
 * no AI and no model. The reading is a suggestion the person sees, with the words that produced it, and changes with one press; it is
 * never treated as an approved requirement (§04: "Never silently treat an AI interpretation as an approved requirement"; the same holds
 * for rules). Nothing the person typed leaves the page.
 */
import { CAMPUS_ROOMS, roomById, shortName } from '../campus/canon.js';
import { cardOf, kindOf, type CardId, type KindId } from './model.js';

export interface Reading {
  kind: KindId; card: CardId; goals: string[];
  /** the words in what was typed that decided the kind and the goals, as typed */ matched: string[];
  /** false when no rule matched: the reading is "in your own words" and the person is asked to choose */ confident: boolean;
  /** a room named in what was typed (its id, its number such as 4.218, or a QR code's address) */ roomId: string | null;
  /** what the reading is based on, said plainly */ basis: string;
}

/** Kinds by the words that mean them, most specific first: a replacement before a fault ("replace a broken device" asks for the replacement), a fault before an upgrade, an addition before a change. */
const KIND_RULES: Array<[KindId, RegExp]> = [
  ['replace-device', /\b(replac(?:e|ed|ing|ement)|swap(?:ped)?|worn out|outdated|end of (?:life|support)|too old|obsolete)\b/i],
  ['problem', /\b(broken|not working|isn'?t working|doesn'?t work|does not work|stopped|keeps? (?:failing|dropping|cutting)|fail(?:ed|ing|s)?|fault(?:y)?|cuts? out|no (?:sound|picture|signal|audio|video)|won'?t (?:turn on|connect|work)|flicker(?:s|ing)?|dead|error|crash(?:es|ed)?|frozen|buzz(?:ing)?|hum(?:ming)?)\b/i],
  ['event', /\b(event|town ?hall|all[- ]hands|webinar|launch|off-?site|temporary|for (?:a|one) day|next week'?s|conference day|gala|ceremony)\b/i],
  ['evaluate-device', /\b(evaluat(?:e|ion)|compare|which (?:camera|display|screen|microphone|speaker|codec|projector)s?|recommend(?:ation)?|before (?:buying|we buy)|is (?:it|this) approved|approved standard)\b/i],
  ['new-room', /\b(new (?:meeting )?(?:room|space|office|classroom|studio|building|floor|area|site|campus|lab)|create (?:a|an)|build (?:a|an)|opening (?:a|an|our)|fit[- ]out|we'?re (?:opening|moving into))\b/i],
  ['add-devices', /\b(another|extra|additional|a second|second|more|add(?:ing)? (?:a|an|another|more)?)\s+(?:\w+\s+)?(camera|display|screen|monitor|tv|microphone|mic|speaker|projector|touch ?panel|scheduler|lectern)s?\b/i],
  ['improve-room', /\b(can'?t (?:see|hear)|cannot (?:see|hear)|hard to (?:see|hear)|echo(?:es|y)?|layout|(?:seats?|people) (?:at|in) the back|sightlines?)\b/i],
  ['change-room', /\b(upgrade|moderni[sz]e|redesign|improv(?:e|ing)|refresh|convert|turn (?:it|the room) into|digital signage|signage|wayfinding|better (?:camera|audio|video|sound|screen|display)s?)\b/i],
  ['general', /\b(relocat(?:e|ion)|move (?:the|a|some) (?:\w+ )?(?:equipment|device|camera|display)s?|retir(?:e|ing)|decommission|remove (?:the|a)|assess(?:ment)?|survey|look at (?:the|a|our) (?:room|space)|not sure|av help|help)\b/i],
];
const GOAL_RULES: Array<[string, RegExp]> = [
  ['video', /\b(video|camera|zoom|teams|webex|hybrid|remote(?:ly)?|far end)\b/i],
  ['audio', /\b(mic(?:rophone)?s?|speakers?|audio|hear|sound|echo|voices?)\b/i],
  ['displays', /\b(displays?|screens?|tvs?|monitors?|projectors?|bigger screen|led wall)\b/i],
  ['present', /\b(present(?:ing|ation)?s?|share|sharing|collaborat\w*|whiteboard)\b/i],
  ['record', /\b(record(?:ing)?|stream(?:ing)?|broadcast(?:ing)?|podcast)\b/i],
  ['teach', /\b(train(?:ing)?|teach(?:ing)?|class(?:room)?|lessons?|lectures?|students?)\b/i],
  ['signage', /\b(signage|wayfinding|digital signs?)\b/i],
  ['access', /\b(accessib\w*|hearing loop|wheelchair|captions?|assistive)\b/i],
  ['standard', /\b(standard|replac\w*|outdated|obsolete|too old)\b/i],
  ['reliable', /\b(reliab\w*|unreliable|keeps? (?:failing|breaking|dropping)|support(?:able)?)\b/i],
  ['modern', /\b(moderni[sz]\w*|refresh|upgrade|update)\b/i],
];
const ROOM_ID = /\bR-[A-Z]{3}-\d{1,2}-\d{3}\b/i;
const ROOM_NO = /\b(\d{1,2})\.(\d{3})\b/;

/** A room named in free text: an id or a QR code's address (both carry the id), or a room number like 4.218 that only one room has. */
export function roomIn(text: string): string | null {
  const id = text.match(ROOM_ID)?.[0]?.toUpperCase(); if (id && roomById(id)) return id;
  const no = text.match(ROOM_NO); if (!no) return null;
  const hits = CAMPUS_ROOMS.filter((r) => shortName(r).includes(`${no[1]}.${no[2]}`)); return hits.length === 1 ? hits[0]!.id : null;
}

/** Read a description. Empty or whitespace reads as nothing (null): the front door then shows its four choices unchanged. */
export function read(text: string): Reading | null {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, 600); if (t.length < 3) return null;
  let kind: KindId | null = null; const matched: string[] = [];
  for (const [k, re] of KIND_RULES) { const m = t.match(re); if (m) { kind = k; matched.push(m[0]); break; } }
  const goals: string[] = []; for (const [g, re] of GOAL_RULES) { const m = t.match(re); if (m) { goals.push(g); if (!matched.some((x) => x.toLowerCase().includes(m[0].toLowerCase()))) matched.push(m[0]); } }
  const roomId = roomIn(t);
  const confident = kind !== null; const k = kind || 'general';
  const basis = confident ? `Matched by word lists, not by AI: “${matched[0]}” reads as “${kindOf(k).label.toLowerCase()}”.` : 'No word in it matched a kind of request, so it reads as a request in your own words. Choose one below if it fits better.';
  return { kind: k, card: cardOf(k), goals: goals.slice(0, 4), matched: matched.slice(0, 6), confident, roomId, basis };
}
