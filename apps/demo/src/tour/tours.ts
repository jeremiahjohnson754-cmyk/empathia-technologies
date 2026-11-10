/**
 * The three guided investor tours (owner spec, Part XII): A — The Living Campus (10 stops), B — The Engineering Intelligence Journey
 * (10 stops), C — Learn by Doing (7 stops). Each stop: a title, one to three sentences of on-screen narration (true of the demonstration:
 * synthetic data, simulated adapters, modelled versus measured, nothing monitored), the route, and what to look at (`spot`, a data-testid
 * highlighted when it exists on the page). Free exploration never depends on a tour.
 */
import { REFERENCE_ROOM_ID } from '../campus/canon.js';

export interface Stop { id: string; title: string; text: string; href: string; spot?: string; narration?: string;
  /** the question this stop tends to raise, and its plain answer (tour D) */
  ask?: { q: string; a: string };
  /** searches a visitor can run from this stop with one press (tour D's "search anything" stop) */
  tries?: string[] }
export interface Tour { key: 'a' | 'b' | 'c' | 'd' | 'e'; title: string; audience: string; goal: string; stops: Stop[] }

const ROOM = `#/campus/ATL/4/${REFERENCE_ROOM_ID}`;
export const TOURS: Tour[] = [
  { key: 'a', title: 'Tour A — The Living Campus', audience: 'Anyone', goal: 'Understand the concept in a few minutes.', stops: [
    { id: 'A1', title: 'From the company site to the product', text: 'This is the investor demonstration. Everything in it is synthetic and runs in this browser; nothing is connected to a real building.', href: '#/tours' },
    { id: 'A2', title: 'An explorable campus', text: 'Six buildings on the campus map, and ninety rooms across the estate with its other sites. The glyph on a building counts its open issues, taken from the room records.', href: '#/campus', spot: 'campus-stage' },
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
  // Tour D (founder, 10 November 2026): the strongest features, and at each stop the question an investor tends to ask with its plain
  // answer. Every answer says what is synthetic, modelled or not built; none claims a customer, a measurement or a release.
  { key: 'd', title: 'Tour D — What investors ask', audience: 'Investors and partners', goal: 'See the strongest parts in fifteen minutes, with a plain answer to the question each one raises.', stops: [
    { id: 'D1', title: 'Everyone starts where their work is', text: 'This is Mission Control, where the people who run the estate start. Every other role has its own start page: View as shows all fifteen. Press g and a letter to jump.', href: '#/home', spot: 'rh-jump',
      ask: { q: 'Is this monitoring real rooms?', a: 'No. Every figure is computed from synthetic records when the page opens. Nothing is monitored, and the page says so.' } },
    { id: 'D2', title: 'Ninety rooms, one estate', text: 'Six buildings on the map and seven more sites: ninety rooms, each with its devices, tests, baselines and history. Open any building.', href: '#/campus', spot: 'campus-stage',
      ask: { q: 'Whose rooms are these?', a: 'Nobody’s. A fictional enterprise with ninety designed rooms. No customer data is in the demonstration.' } },
    { id: 'D3', title: 'A room you can walk around', text: 'A ballroom that divides in four. Turn it, switch the lens from visitor to engineer, and compare what was designed, commissioned, current and proposed.', href: '#/lite/room/R-EGT-1-140', spot: 'lite-3d',
      ask: { q: 'Are the coverage figures measured?', a: 'No. They are modelled from the room’s geometry and device classes. A measured figure would need reviewed evidence, and there is none here.' } },
    { id: 'D4', title: 'Find the way', text: 'Choose where you are going: the route is step by step, with a step-free choice. A site away from the campus says so first.', href: '#/lite/way', spot: 'lite-way',
      ask: { q: 'Does it know where I am standing?', a: 'No. You choose where you start. Indoor positioning is not built.' } },
    { id: 'D5', title: 'Search anything', text: 'One box over rooms, devices, people, issues and pages. Type anything you like, or press one of these.', href: '#/search', spot: 'search-party', tries: ['4.218', 'ballroom', 'camera', 'ISS-0417', 'who supports Atlas 4.218'],
      ask: { q: 'Is a language model answering?', a: 'No. Search Party ranks recorded records and walks recorded relationships, and shows where each answer comes from. Nothing is generated.' } },
    { id: 'D6', title: 'If this switch fails, what is affected?', text: 'Search Party starts from one switch and walks to its uplink, the rooms that share it and the power behind it. Each step names its source.', href: '#/search/scenarios/S1',
      ask: { q: 'Where does the dependency data come from?', a: 'Here, from the synthetic model. In a customer’s estate it would come from sources they connect; no connector reads a real system yet.' } },
    { id: 'D7', title: 'Four worlds on the same engines', text: 'Enterprise, a stadium, a university and a convention centre: each with its own places, people and journeys, and the same records underneath.', href: '#/worlds',
      ask: { q: 'Are the other three as deep as Enterprise?', a: 'Not yet. They have estates, journeys, search and plans in 2D. Rooms in 3D exist for Enterprise only.' } },
    { id: 'D8', title: 'A stadium on game day', text: 'Move the event from doors to final whistle, put a fault on the ribbon display, and work it: acknowledge, dispatch, fix, and a second person verifies.', href: '#/gameday?as=stadium.av_it_engineer', spot: 'gameday-phases',
      ask: { q: 'Is that a real venue?', a: 'No. Harborlight Stadium is fictional and the event is a simulation, labelled as one.' } },
    { id: 'D9', title: 'Three ways to equip a room', text: 'The Space Optimizer scores options A, B and C on nine dimensions and shows the rule behind every score.', href: '#/optimizer/university',
      ask: { q: 'Does it design the room?', a: 'No. It compares options with a stated planning model so an engineer can decide. It is not a physics simulation.' } },
    { id: 'D10', title: 'Proof, not claims', text: 'One room’s commissioning dossier: 27 tests passed, 3 pending, 2 failed. Acceptance is held, and the page says exactly why.', href: '#/dossier', spot: 'dossier-blockers',
      ask: { q: 'Could someone mark it accepted anyway?', a: 'Not through these rules: a result is verified by a different person than recorded it, and acceptance is refused while a test is failed or pending.' } },
    { id: 'D11', title: 'A problem, followed to closure', text: 'Reported in plain words, triaged, assigned only to people who pass the checks, repaired with evidence, verified by someone else, closed with the requester.', href: '#/servicehands', spot: 'servicehands',
      ask: { q: 'Does it dispatch real technicians?', a: 'No. The people, clocks and windows are synthetic. The rules that decide who may be assigned are real code.' } },
    { id: 'D12', title: 'No connection, still working', text: 'The app saves itself on the device. With the network cut, Lite, Commissioning, Assurance and ServiceHands still open, and work done offline is kept.', href: '#/offline', spot: 'offline-app',
      ask: { q: 'Does offline work reach a server later?', a: 'In this demonstration nothing is sent anywhere, so there is nothing to send later. The queue for that exists as tested code and is not connected to a screen yet.' } },
    { id: 'D13', title: 'SIGNAL: learning as a story', text: 'The Prologue and 133 chapters across twelve seasons: read them or play them as scenes, with decisions that can fail and things to find.', href: '#/story',
      ask: { q: 'Is it finished?', a: 'The whole text and its drawings are here. Recorded voices and video are not made yet, and 318 passages are flagged for review.' } },
    { id: 'D14', title: 'What is real today', text: 'Everything you saw is synthetic and runs in this browser. Nothing is sold from here. From this page, explore freely or send an enquiry.', href: '#/investor',
      ask: { q: 'What can a customer buy today?', a: 'Nothing self-serve. Of 34 products, 22 are demonstrated on synthetic data, 6 are partly built, 1 is unverified code and 5 are specified only.' } },
  ] },
  // Tour E (founder, 10 November 2026, the signature demonstration; the final directive's Enterprise moment): someone walks into a room
  // they do not know and one set of records carries them from its equipment to a written outcome and the evidence behind the room.
  // Every stop is a working page: the visitor presses the controls themselves, and what they write down is really written.
  { key: 'e', title: 'Tour E — Walk into a room', audience: 'Anyone; best seen as a Service Engineer', goal: 'Follow one room from “what is this?” to a written outcome, through Lite, Search Party, ServiceHands and Commissioning, without the room ever becoming a different record.', stops: [
    { id: 'E1', title: 'Someone arrives', text: 'A technician is sent to a room they have never seen. Their start page has “In a room”; every door label opens the same page.', href: '#/home', spot: 'rh-jump',
      ask: { q: 'Does it know which room I am standing in?', a: 'No. You say which room, or a phone reads the door label. Indoor positioning is not built.' } },
    { id: 'E2', title: 'Which room?', text: 'A name, a number, or the code on the door. Type “4.218”, or press the reference room.', href: '#/here', spot: 'here-find',
      ask: { q: 'What is on the door label?', a: 'Only the address of this page for that room. It is a real code: a phone camera pointed at it opens the room here.' } },
    { id: 'E3', title: 'What is in the room', text: 'Atlas 4.218 in a sentence, then by kind. Press a kind and it is ringed on the plan; press 3D for the same room in three dimensions.', href: `#/here/${REFERENCE_ROOM_ID}?step=look`, spot: 'here-kinds',
      ask: { q: 'Where does the equipment list come from?', a: 'From the room’s design record: eleven positions, each with the unit installed in it. No make, model or serial is invented, so identity stays unknown.' } },
    { id: 'E4', title: 'The same room in Lite', text: 'Lite draws the same positions, with lenses for a visitor, an employee and an engineer, and the room as designed, commissioned, current and proposed.', href: `#/lite/room/${REFERENCE_ROOM_ID}`, spot: 'lite-3d',
      ask: { q: 'Is it a copy made for the tour?', a: 'No. Both pages read one record, so a device has one position code wherever you meet it.' } },
    { id: 'E5', title: 'What has happened here', text: 'An open sound job that came back after an earlier one was closed, a design finding, and a camera that was replaced. Newest and still-open first.', href: `#/here/${REFERENCE_ROOM_ID}?step=history`, spot: 'here-history',
      ask: { q: 'Can everyone read a room’s history?', a: 'No. History follows the role table carried from V2.5.3: an employee or a visitor is not shown this step at all.' } },
    { id: 'E6', title: 'Everything linked to it', text: 'Search Party opens on this room: its devices, its jobs, who supports it and what depends on what, each relationship with its source.', href: `#/search?focus=Room:${REFERENCE_ROOM_ID}`, spot: 'search-party',
      ask: { q: 'Is a language model writing these answers?', a: 'No. Search Party walks recorded relationships and shows where each one comes from. Nothing is generated.' } },
    { id: 'E7', title: 'What is wrong', text: '“The room can’t hear the call” becomes this room’s equipment in signal order: room compute, audio processor, loudspeakers, joined as the record connects them. And a job already describes it.', href: `#/here/${REFERENCE_ROOM_ID}?step=wrong&s=room-cant-hear`, spot: 'here-points',
      ask: { q: 'Is that a diagnosis?', a: 'No. It is where the problem can sit, read from the room’s recorded connections. Finding the cause is the technician’s work.' } },
    { id: 'E8', title: 'Try this', text: 'One step at a time, written for this room’s equipment. Answer each one yourself. Nothing asks anyone to open a cabinet or change a commissioned setting.', href: `#/here/${REFERENCE_ROOM_ID}?step=try&s=room-cant-hear`, spot: 'here-current',
      ask: { q: 'Does it control the room?', a: 'No. No device is contacted from this page. A step asks a person to look, press a button meant for them, or say what they see.' } },
    { id: 'E9', title: 'Write it down', text: 'Add what you saw to the job that already exists, or send a new one. Press the button: it is really written, in this browser.', href: `#/here/${REFERENCE_ROOM_ID}?step=record&s=room-cant-hear`, spot: 'here-record',
      ask: { q: 'Where does it go?', a: 'Into the shared workspace of this demonstration, which ServiceHands, the room page and Mission Control all read. Nothing leaves the browser.' } },
    { id: 'E10', title: 'The technician’s side', text: 'ServiceHands shows the job with who reported it, what was already tried in the room, and anyone who saw it again.', href: '#/servicehands?id=ISS-0417', spot: 'servicehands',
      ask: { q: 'Are real technicians dispatched?', a: 'No. The people, clocks and windows are synthetic. The rules that decide who may be assigned are real code.' } },
    { id: 'E11', title: 'The evidence behind the room', text: 'The room’s commissioning dossier: every test with its evidence. Acceptance needs two approvals from two roles and is held while a test is failed or pending.', href: '#/dossier', spot: 'dossier-signoff',
      ask: { q: 'Could the person who did the work approve it?', a: 'Not through these rules. A role that recorded the work cannot approve it, and the second approval must come from a different role than the first.' } },
    { id: 'E12', title: 'One room, one record', text: 'The room you walked into, drew in Lite, searched, reported on and inspected was the same record each time. From here, explore freely.', href: `#/room/${REFERENCE_ROOM_ID}`, spot: 'room-view',
      ask: { q: 'Is any of this connected to a real building?', a: 'No. Every record is synthetic and runs in this browser. Connecting a customer’s estate is work that has not been done.' } },
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
