/**
 * SIGNAL × Lite (founder, 12 Nov 2026, 14:25 CT: "Put Lite into some of the story mode interactive following the quizzes and tests, labs,
 * boss fights, historical quick facts, dictionary terminology and AI assistance"). After a check, a lab, a boss level, a "Then and now"
 * note, a glossary term or a mentor answer, the reader can open the same idea in Empathia Lite: a modeled campus room, already set to the
 * layer, overlay, state or measurement that shows it.
 *
 * Lite is a different room from the story's church, and everything it shows is modeled from the plan and the catalogue, never measured;
 * every link says so. Only Lite's own addresses are used (#/lite/room/<id>?ly&ov&state&xm), never a lens (?mode=), so the reader's role
 * decides what is drawn exactly as it does anywhere else in Lite. Pure.
 */
export interface LiteTry { key: string; room: string; roomName: string; q: string; title: string; look: string }

/** The places in Lite that show a story idea, each with what to look at once there. Rooms are campus records (campus/canon.ts). */
export const LITE_TRIES: Record<string, LiteTry> = {
  signal: { key: 'signal', room: 'R-MER-2-160', roomName: 'AV-over-IP presentation room', q: 'ly=av,network,control&ov=,', title: 'Follow the signal path',
    look: 'Every box between the source and the people, and which of them ride the network. Whose network is each one on?' },
  coverage: { key: 'coverage', room: 'R-NST-2-101', roomName: 'Town Hall', q: 'ov=speaker&xm=1', title: 'Where the loudspeakers reach',
    look: 'The speaker zones, and under Measurements the room’s critical distance: farther than that, the room’s reflections are louder than the loudspeaker.' },
  mic: { key: 'mic', room: 'R-ATL-4-231', roomName: 'Training room', q: 'ov=mic', title: 'How far a microphone hears',
    look: 'The microphone pickup zones: a talker outside them needs more gain, and more gain brings the noise and the feedback closer.' },
  power: { key: 'power', room: 'R-NST-2-101', roomName: 'Town Hall', q: 'ly=power,av&ov=infra', title: 'Where power meets the AV',
    look: 'The power layer next to the AV gear, and the outlets and power each device declares. The panel itself stays the electrician’s.' },
  states: { key: 'states', room: 'R-NST-2-101', roomName: 'Town Hall', q: 'state=commissioned', title: 'What changed since it was proven',
    look: 'Switch between Designed, Commissioned and Current: what was planned, what was proven at handover, and what is there now.' },
  access: { key: 'access', room: 'R-NST-2-101', roomName: 'Town Hall', q: 'ov=access', title: 'Who the room is for',
    look: 'The accessibility overlay: the seats, routes and listening provision the room owes the people who use it.' },
  video: { key: 'video', room: 'R-HZN-1-120', roomName: 'Video Tower', q: 'ov=camera,sight', title: 'What the camera and the audience see',
    look: 'Camera coverage and the sightlines to the display: the picture is only as good as where it is seen from.' },
  proven: { key: 'proven', room: 'R-NST-2-101', roomName: 'Town Hall', q: 'state=commissioned&xm=1', title: 'Proven, and where',
    look: 'What was proven at handover, beside the measurements Lite models. A model is a plan for the test, never the test.' },
};

/** Each Season 1 chapter's skill, shown in Lite (the chapters' "Ray's notebook" topics). */
export const LITE_BY_CHAPTER: Record<string, string> = {
  s01e00: 'signal', s01e01: 'coverage', s01e02: 'mic', s01e03: 'power', s01e04: 'states', s01e05: 'power',
  s01e06: 'access', s01e07: 'video', s01e08: 'states', s01e09: 'proven', s01e10: 'power', s01e11: 'signal',
};

/** Glossary terms (exact glossary headwords) and the Lite place that shows each. */
export const LITE_BY_TERM: Record<string, string> = Object.fromEntries(Object.entries({
  signal: ['Signal flow', 'Switch', 'Link utilization', 'Bandwidth', 'Multicast', 'VLAN', 'Segmentation', 'Source', 'Destination', 'Encoder', 'Control system', 'Latency', 'Jitter'],
  coverage: ['Comb filter', 'Notch', 'Reverberation', 'Echo', 'Inverse-square law', 'Speed of sound', 'Delay speaker', 'SPL', 'Wavelength', 'Decibel'],
  mic: ['Gain', 'Gain staging', 'Headroom', 'Clipping', 'Noise floor', 'Feedback', 'Gain before feedback', 'Polar pattern', 'Cardioid', 'Omnidirectional', 'Preamp', 'Transducer'],
  power: ['Hum', 'Ground loop', 'Protective earth', 'Voltage', 'Current', 'Power (electrical)', 'Breaker', 'UPS', 'Generator', 'Transfer switch'],
  states: ['Change record', 'Evidence', 'Asset register', 'Known-good version', 'Rollback', 'Technical debt', 'Runbook'],
  access: ['Accessibility', 'Hearing loop', 'Captions', 'Second-language channel'],
  video: ['Refresh rate', 'Shutter', 'Frame rate', 'Resolution', 'Aspect ratio', 'IMAG'],
  proven: ['Verified', 'Proven where the people are', 'Measured', 'Observed'],
}).flatMap(([k, ts]) => ts.map((t) => [t, k])));

export const liteHref = (t: LiteTry) => `#/lite/room/${t.room}?${t.q}`;
export const liteForChapter = (id: string): LiteTry | null => { const k = LITE_BY_CHAPTER[id]; return k ? LITE_TRIES[k]! : null; };
export const liteForTerm = (term: string): LiteTry | null => { const k = LITE_BY_TERM[term]; return k ? LITE_TRIES[k]! : null; };
/** The first Lite place a piece of text names a term for (whole words, case-insensitive; longest term first, so "Gain staging" wins over "Gain"). */
export function liteForText(text: string): LiteTry | null {
  const s = ` ${text.toLowerCase()} `;
  for (const term of Object.keys(LITE_BY_TERM).sort((a, b) => b.length - a.length)) {
    const w = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`[^a-z0-9]${w}[^a-z0-9]`).test(s)) return LITE_TRIES[LITE_BY_TERM[term]!]!;
  }
  return null;
}
export const LITE_CAVEAT = 'A modeled campus room in Lite, not the story’s church: the same idea in a different room. Lite shows what the plan and the catalogue predict, never a measurement.';
