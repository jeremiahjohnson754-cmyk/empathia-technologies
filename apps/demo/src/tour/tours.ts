/**
 * The three guided investor tours (owner spec, Part XII): A — The Living Campus (10 stops), B — The Engineering Intelligence Journey
 * (10 stops), C — Learn by Doing (7 stops). Each stop: a title, one to three sentences of on-screen narration (true of the demonstration:
 * synthetic data, simulated adapters, modelled versus measured, nothing monitored), the route, and what to look at (`spot`, a data-testid
 * highlighted when it exists on the page). Free exploration never depends on a tour.
 */
import { REFERENCE_ROOM_ID } from '../campus/canon.js';

export interface Stop { id: string; title: string; text: string; href: string; spot?: string; narration?: string }
export interface Tour { key: 'a' | 'b' | 'c'; title: string; audience: string; goal: string; stops: Stop[] }

const ROOM = `#/campus/ATL/4/${REFERENCE_ROOM_ID}`;
export const TOURS: Tour[] = [
  { key: 'a', title: 'Tour A — The Living Campus', audience: 'Anyone', goal: 'Understand the concept in a few minutes.', stops: [
    { id: 'A1', title: 'From the company site to the product', text: 'This is the investor demonstration. Everything in it is synthetic and runs in this browser; nothing is connected to a real building.', href: '#/tours' },
    { id: 'A2', title: 'An explorable campus', text: 'Six buildings and thirty rooms. The glyph on a building counts its open issues, taken from the room records.', href: '#/campus', spot: 'campus-stage' },
    { id: 'A3', title: 'A building', text: 'Atlas HQ, the headquarters. Pick a floor; the floors without a modelled room say so.', href: '#/campus/ATL', spot: 'floor-ATL-4' },
    { id: 'A4', title: 'A floor', text: 'Floor 4: the room footprints are their modelled dimensions, not a survey.', href: '#/campus/ATL/4', spot: 'floor-stage' },
    { id: 'A5', title: 'The reference room in 3D', text: 'Atlas 4.218. Every device has a position, a history and evidence behind it. Rotate the view, switch to the plan, turn layers off.', href: ROOM, spot: 'room-stage', narration: 'tour-a-05' },
    { id: 'A6', title: 'Inspect a device', text: 'The camera position keeps its code while the unit changed: position, asset and identity state are shown together, and the identity stays UNKNOWN because no serial is invented.', href: `${ROOM}?device=A-0106`, spot: 'device-panel' },
    { id: 'A7', title: 'Who supports this room', text: 'Search Party answers from recorded relationships: support paths, synthetic agreements with fictional organisations, and internal competencies with their verification state.', href: `#/search/scenarios/S2?room=${REFERENCE_ROOM_ID}`, spot: 'sp-list' },
    { id: 'A8', title: 'Core Replay: the camera change', text: 'The replay walks the room’s history. Watching or scrubbing never changes the record.', href: `#/replay/${REFERENCE_ROOM_ID}` },
    { id: 'A9', title: 'Acceptance held, honestly', text: 'The tests the replacement reopened were re-run and verified by someone else, yet the engine still holds acceptance: an exception is pending approval.', href: `${ROOM}?tab=history`, spot: 'exception' },
    { id: 'A10', title: 'The room’s story', text: 'Every event behind the state, with who and when. From here, explore freely.', href: `#/story/${REFERENCE_ROOM_ID}` },
  ] },
  { key: 'b', title: 'Tour B — The Engineering Intelligence Journey', audience: 'Investors, integrators, engineers and MSPs', goal: 'See connected engineering intelligence and governance.', stops: [
    { id: 'B1', title: 'An existing room', text: 'Start from the reference room’s record: design, installations, baselines and tests in one place.', href: ROOM, spot: 'room-view' },
    { id: 'B2', title: 'Field Intelligence discovery', text: 'A scan of the room, observe-only first. Every reading is labelled simulated: there is no instrument here.', href: `#/v25/fi/scan/${REFERENCE_ROOM_ID}` },
    { id: 'B3', title: 'The scan report', text: 'Findings carry their provenance — simulated, inferred or known — and none is called measured.', href: `#/v25/fi/scan/${REFERENCE_ROOM_ID}` },
    { id: 'B4', title: 'Design comparison', text: 'The room against its design: the engine’s design checks re-run on the current revision.', href: `${ROOM}?tab=coverage`, spot: 'coverage' },
    { id: 'B5', title: 'Commissioning', text: 'The engine judges which tests apply and why; the ones that do not apply say why not.', href: `${ROOM}?tab=tests`, spot: 'test-table' },
    { id: 'B6', title: 'Evidence', text: 'Each result names its evidence and its recorder, and is verified by a different person.', href: `${ROOM}?tab=tests`, spot: 'test-table' },
    { id: 'B7', title: 'An asset change', text: 'The camera unit was replaced at the same position. The old installation closed, the new one opened, and the tests it touches reopened.', href: `${ROOM}?tab=history`, spot: 'events' },
    { id: 'B8', title: 'Assurance', text: 'Baseline v1 stays current; v2 waits for acceptance. Nothing is overwritten.', href: `${ROOM}?tab=history`, spot: 'baselines' },
    { id: 'B9', title: 'A pattern across the campus', text: 'Search Party groups the open issues of all thirty rooms by system. A cluster is a prompt to look, not a root cause.', href: '#/search/scenarios/S5', spot: 'sp-list' },
    { id: 'B10', title: 'The room’s story', text: 'The ledger behind every state. From here, explore freely.', href: `#/story/${REFERENCE_ROOM_ID}` },
  ] },
  { key: 'c', title: 'Tour C — Learn by Doing', audience: 'Students, AV professionals, educators and curious visitors', goal: 'See that Empathia teaches people to understand and improve the systems they use.', stops: [
    { id: 'C1', title: 'A SIGNAL chapter', text: 'Lessons, drills and cases from the SIGNAL library, carried over unchanged.', href: '#/v25/learn' },
    { id: 'C2', title: 'Hear it: the audio lab', text: 'Change the processing and hear the room change. The voices are AI-generated and labelled so.', href: '#/learn/labs/hear' },
    { id: 'C3', title: 'See it: the camera lab', text: 'Framing and coverage as a model of the room, never a measurement.', href: '#/learn/labs/see' },
    { id: 'C4', title: 'Light it: the lighting lab', text: 'Scenes and their effect on the picture, simulated.', href: '#/learn/labs/light' },
    { id: 'C5', title: 'Diagnose, repair, verify', text: 'A real storyline of the campus: the camera replaced at Atlas 4.218, the tests it reopened, and the independent verification.', href: '#/search/scenarios/S4', spot: 'sp-list' },
    { id: 'C6', title: 'Competency evidence', text: 'Completing a lab is evidence of competency, shown with its verification state; it never authorises work by itself.', href: '#/v25/learn' },
    { id: 'C7', title: 'Back to the room', text: 'The lesson came from this room. From here, explore freely.', href: ROOM, spot: 'room-view' },
  ] },
];

/** Narration takes that are VERIFIED and shipped (apps/demo/public/media/narration). A stop without one is text only. */
export const NARRATION: Record<string, { src: string; captions: string; transcript: string; seconds: number; voice: string; lufs: number; sha256: string; source: string }> = {
  'tour-a-05': {
    src: 'media/narration/tour-a-05.mp3', captions: 'media/narration/tour-a-05.vtt', seconds: 10.81, lufs: -23.5,
    transcript: 'This is Atlas 4.218, a boardroom on the fourth floor. Every device here has a position, a history and evidence behind it. Let’s see what changed, and how we know.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Bella · eleven_multilingual_v2',
    sha256: 'a5f1b476451d504d1b2144b766de7509e758bee9e3a27e9f2d84b3fce5a36064', source: 'pilot take tour-sample s01 (owner-approved 2026-11-01 08:07 CT; source sha256 8a9927d3…), gain −4.65 dB to −23 LUFS, mono 96 kb/s',
  },
};
export const BANNED = /\b(live|real-time monitoring|certif\w*|production-ready|100%)\b/i;
export const tourByKey = (k: string) => TOURS.find((t) => t.key === k);
