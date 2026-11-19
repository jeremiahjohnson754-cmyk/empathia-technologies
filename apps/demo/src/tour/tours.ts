/**
 * The three guided investor tours (owner spec, Part XII): A — The Living Campus (10 stops), B — The Engineering Intelligence Journey
 * (10 stops), C — Learn by Doing (7 stops). Each stop: a title, one to three sentences of on-screen narration (true of the demonstration:
 * synthetic data, simulated adapters, modelled versus measured, nothing monitored), the route, and what to look at (`spot`, a data-testid
 * highlighted when it exists on the page). Free exploration never depends on a tour.
 */
import { REFERENCE_ROOM_ID } from '../campus/canon.js';

export interface Stop { id: string; title: string; text: string; href: string; spot?: string; narration?: string; captionsOnly?: string;
  /** the question this stop tends to raise, and its plain answer (tour D) */
  ask?: { q: string; a: string };
  /** searches a visitor can run from this stop with one press (tour D's "search anything" stop) */
  tries?: string[] }
export interface Tour { key: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'; title: string; audience: string; goal: string; stops: Stop[] }

const ROOM = `#/campus/ATL/4/${REFERENCE_ROOM_ID}`;
export const TOURS: Tour[] = [
  // Tour G (#230; founder 18 Nov 13:15 and 13:21): the flagship — one room's whole life, told through the real pages and the same records.
  // Every id named here is the one each product shows: R-ATL-4-218, position PA-0007, assets AS-0097 → AS-0112, baselines v1 and v2.
  { key: 'g', title: 'Tour G — The Life of a Room', audience: 'Investors and enterprise buyers; the flagship', goal: 'Follow one room from its request to service, change and re-acceptance, and see every product read the same record.', stops: [
    { id: 'G1', title: 'Every room has a story', text: 'Atlas 4.218, an executive boardroom on a fictional campus. Core Replay plays its life from its records; each step says how sure it is. Watching never changes the room.', href: `#/replay/${REFERENCE_ROOM_ID}?at=request`, spot: 'rp-card', narration: 'tour-g-01' },
    { id: 'G2', title: 'It begins with intent', text: 'Nine requirements, six of them must-have: every seat heard and seen at the far end, one-touch join, usable by a guest. Everything later is judged against these.', href: `#/replay/${REFERENCE_ROOM_ID}?at=requirements`, spot: 'rp-card', narration: 'tour-g-02' },
    { id: 'G3', title: 'The room is designed', text: 'A boardroom template at 6.2 × 9.6 m, every device a numbered position. The commissioning engine already knows which tests will apply to this design.', href: `#/replay/${REFERENCE_ROOM_ID}?at=design`, spot: 'rp-card', narration: 'tour-g-03' },
    { id: 'G4', title: 'The same room in Lite', text: 'Lite shows that design in 3D: the room, the furniture, the devices at their positions. Same room id, R-ATL-4-218; a different view of one record.', href: `#/lite/room/${REFERENCE_ROOM_ID}`, spot: 'lite-room', narration: 'tour-g-04' },
    { id: 'G5', title: 'The design becomes real', text: 'Installed. The front camera position PA-0007 holds physical asset AS-0097. Position and asset are different things: remember both ids.', href: `#/replay/${REFERENCE_ROOM_ID}?at=build`, spot: 'rp-card', narration: 'tour-g-05' },
    { id: 'G6', title: 'Commissioning proves it', text: 'Each applicable test recorded by its responsible role and verified by somebody else. A result nobody independently checked does not count.', href: `#/replay/${REFERENCE_ROOM_ID}?at=commissioning`, spot: 'rp-card', narration: 'tour-g-06' },
    { id: 'G7', title: 'The commissioning record', text: 'The tests themselves: what was required, what was observed, by whom, and who verified it. Synthetic evidence, labelled as such.', href: `#/commissioning/room/${REFERENCE_ROOM_ID}`, narration: 'tour-g-07' },
    { id: 'G8', title: 'The accepted baseline', text: 'Baseline v1: what the room was proven to do. Everything afterwards is compared with it, and it is never overwritten.', href: `#/replay/${REFERENCE_ROOM_ID}?at=baseline1`, spot: 'rp-card', narration: 'tour-g-08' },
    { id: 'G9', title: 'A failure becomes work', text: 'In use, things fail. A problem in this room is a ServiceHands job tied to the room and, where known, the device: the same ids again.', href: '#/servicehands', spot: 'jobs', captionsOnly: 'tour-g-09' },
    { id: 'G10', title: 'Who can fix it', text: 'Search Party from the room: who supports it, who knows it, its relationships, each with where it comes from. From here, a problem goes straight to ServiceHands with the room filled in.', href: `#/search?focus=Room:${REFERENCE_ROOM_ID}`, spot: 'sp-room-acts', narration: 'tour-g-10' },
    { id: 'G11', title: 'The exact device', text: 'Search for the replacement unit AS-0112: its position, its room, its history. Search Party, Lite and ServiceHands all resolve the same asset.', href: '#/search?q=AS-0112', narration: 'tour-g-11' },
    { id: 'G12', title: 'A change reopens exactly what it touches', text: 'The camera at PA-0007 is replaced like-for-like: AS-0097 out, AS-0112 in. The engine reopens only the tests that name PA-0007; the old results stay as history and never count for the new unit.', href: `#/replay/${REFERENCE_ROOM_ID}?at=change`, spot: 'rp-card', captionsOnly: 'tour-g-12' },
    { id: 'G13', title: 'Re-accepted, history kept', text: 'The reopened tests are run again and verified. Baseline v2 becomes current; v1 is preserved. Compare any two moments with the time layers.', href: `#/replay/${REFERENCE_ROOM_ID}?at=baseline2`, spot: 'rp-card', captionsOnly: 'tour-g-13' },
    { id: 'G14', title: 'Assurance watches the baseline', text: 'Assurance holds the accepted state and its revisions, so a later difference shows as drift against a known baseline, not as a guess.', href: `#/assurance/room/${REFERENCE_ROOM_ID}`, narration: 'tour-g-14' },
    { id: 'G15', title: 'What leadership sees', text: 'The same records roll up into diagnosis and analytics. Every figure traces to the rooms and jobs it came from; none of it is streamed from a real building.', href: '#/v25/apex', captionsOnly: 'tour-g-15' },
    { id: 'G16', title: 'One room. Now the whole estate.', text: 'The failure map shows every building’s open issues, as counts and per 10 rooms, from the same records. Follow everything that happened to one room, then imagine that across the enterprise. (Turning a resolved fault into a reviewed lesson in Learn is designed, not built yet.)', href: '#/pro/issues', spot: 'pro-failure-map', captionsOnly: 'tour-g-16' },
  ] },

  { key: 'a', title: 'Tour A — The Living Campus', audience: 'Anyone', goal: 'Understand the concept in a few minutes.', stops: [
    { id: 'A1', title: 'From the company site to the product', text: 'This is the investor demonstration. Everything in it is synthetic and runs in this browser; nothing is connected to a real building.', href: '#/tours' },
    { id: 'A2', title: 'An explorable campus', text: 'Six buildings on the campus map, and 140 rooms across the estate with its other sites. The glyph on a building counts its open issues, taken from the room records.', href: '#/campus', spot: 'campus-stage' },
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
    { id: 'D2', title: '140 rooms, one estate', text: 'Six buildings on the map and seven more sites: 140 rooms, each with its devices, tests, baselines and history. Open any building.', href: '#/campus', spot: 'campus-stage',
      ask: { q: 'Whose rooms are these?', a: 'Nobody’s. A fictional enterprise with 140 designed rooms, fifty of them as V2.5.3 generated them. No customer data is in the demonstration.' } },
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
  // founder, 13 Nov 2026: "treating the Commissioning → Assurance → APEX reporting journey as the flagship enterprise sales demonstration"
  { key: 'f', title: 'Tour F — Commissioning to the boardroom', audience: 'Enterprise buyers: facilities, IT, AV and the people who sign off', goal: 'Follow the estate from the portfolio down to one blocked room and back up to the board: why acceptance is held, what drifted since handover, what APEX thinks is wrong, and the files each step hands you.', stops: [
    { id: 'F1', title: 'The estate at a glance', text: 'Commissioning across 140 rooms: accepted, accepted with conditions, blocked, in commissioning. Every count is a rule over the room records, written on the page.', href: '#/commissioning', spot: 'tiles',
      ask: { q: 'Are these real buildings?', a: 'No. The estate, its rooms and its people are synthetic. The commissioning rules are real code, the same engine the API runs.' } },
    { id: 'F2', title: 'Drill into a building', text: 'Each building with its rooms by state. Open Beacon: its floors, each with its own counts. A count opens just those rooms.', href: '#/commissioning?b=BCN', spot: 'cx-drill',
      ask: { q: 'Can I send someone this view?', a: 'Yes. The level is in the address, so the link opens exactly this building, and Back walks it back up.' } },
    { id: 'F3', title: 'Down to the rooms of a floor', text: 'Beacon, floor 3: every room with its state and why. Beacon 3.225 is blocked.', href: '#/commissioning?b=BCN&f=3', spot: 'drill-rooms',
      ask: { q: 'Why is one room blocked and its neighbour not?', a: 'Each room carries its own record. Open it and the reason is written there, not summarised.' } },
    { id: 'F4', title: 'Why acceptance is held', text: 'Five phases of checks. A must-have check failed and a high deficiency is open, so acceptance cannot be given yet. The page says which rule stops it.', href: '#/commissioning/room/R-BCN-3-225', spot: 'cx-phases',
      ask: { q: 'Can a manager override it?', a: 'No. Acceptance is blocked by a critical deficiency, missing evidence or a failed must-have check. A waiver never bypasses safety, security or evidence integrity.' } },
    { id: 'F5', title: 'From requirement to evidence', text: 'Each requirement, the design positions that meet it, the checks that prove it, their evidence and the result. The audio requirement is where it fails.', href: '#/commissioning/room/R-BCN-3-225/trace', spot: 'cx-trace',
      ask: { q: 'Was anything measured?', a: 'No. Results are as recorded in a synthetic record. Nothing here measures a room or contacts a device.' } },
    { id: 'F6', title: 'The completion package', text: 'The whole record as files: a PDF report, an editable Word document, an Excel register, a PowerPoint deck, a JSON dossier and a CSV. Each says what it is and who made it.', href: '#/commissioning/room/R-ATL-4-218', spot: 'cx-export',
      ask: { q: 'Will these open in Office?', a: 'They are native files written in your browser. Every format is reopened by independent readers and LibreOffice before release. They have not been tested in Microsoft Office itself.' } },
    { id: 'F7', title: 'What changed since handover', text: 'Assurance compares the room now with the room as commissioned: seventeen dimensions over seven layers. A replaced camera reopened tests; people reported audio dropping out.', href: '#/assurance/room/R-ATL-4-218', spot: 'as-dims',
      ask: { q: 'Is the room watched as it happens?', a: 'No. It is simulated discovery from the records. A person’s report is evidence that they observed something, not a measurement.' } },
    { id: 'F8', title: 'The service request', text: 'The far-end audio job, opened by a person in the room. It came back after an earlier one was closed, so it is marked as a recurrence.', href: '#/v25/service?id=ISS-0417', spot: 'incident',
      ask: { q: 'Who decides who goes?', a: 'The dispatch rules: competence, availability, access and the work type. A person who did the work never verifies it.' } },
    { id: 'F9', title: 'What APEX thinks is wrong', text: 'Seven layers of evidence, hypotheses ranked with why each is not proven, and actions bounded by tier. The bounded action is blocked here because no adapter is configured, and that is logged too.', href: '#/v25/apex?case=APX-001', spot: 'apex-case',
      ask: { q: 'Does APEX fix it on its own?', a: 'No. Explaining and proposing are allowed; anything that changes equipment needs a signed runbook, owner approval, a window and a dry run, and nothing here reaches real equipment.' } },
    { id: 'F10', title: 'Back up to the board', text: 'The portfolio brief: the estate by building and room type, every room, the rooms to act on first and the trend, as a deck for the board or a workbook to filter.', href: '#/commissioning', spot: 'estate-export',
      ask: { q: 'What does this cost to run on our estate?', a: 'This demonstration does not price anything. Connecting a customer’s estate is work that has not been done.' } },
  ] },
];

/** Narration takes that are shipped (apps/demo/public/media/narration), each held by its hash. A stop without one is text only.
 *  tour-a-05 was owner-approved by ear. Of the Tour G takes (18 Nov 2026), ten are the founder's own picks after listening; G7 is
 *  the first take, not yet chosen by ear. G9, G12, G13, G15 and G16 have no voice (the voice provider refused them when the account's
 *  credits ran out; founder 16:41: "make them silent with captions") — see CAPTIONS_ONLY. Provenance:
 *  docs/media/BRIAN_NARRATION_SCRIPT_AND_LICENSE.md. */
export const NARRATION: Record<string, { src: string; captions: string; transcript: string; seconds: number; voice: string; lufs: number; sha256: string; source: string }> = {
  'tour-a-05': {
    src: 'media/narration/tour-a-05.mp3', captions: 'media/narration/tour-a-05.vtt', seconds: 10.81, lufs: -23.5,
    transcript: 'This is Atlas 4.218, a boardroom on the fourth floor. Every device here has a position, a history and evidence behind it. Let’s see what changed, and how we know.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Bella · eleven_multilingual_v2',
    sha256: 'a5f1b476451d504d1b2144b766de7509e758bee9e3a27e9f2d84b3fce5a36064', source: 'pilot take tour-sample s01 (owner-approved 2026-11-01 08:07 CT; source sha256 8a9927d3…), gain −4.65 dB to −23 LUFS, mono 96 kb/s',
  },
  'tour-g-01': {
    src: 'media/narration/tour-g-01.mp3', captions: 'media/narration/tour-g-01.vtt', seconds: 15.15, lufs: -23.4,
    transcript: 'Every room has a story. This is Atlas 4.218, a boardroom on a fictional campus. Core Replay plays its life from its own records, and every step tells you how sure it is. Watching never changes the room.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: 'f49c35f59ccbe68360822089febcb8ae570b51bfb4c8943d4132961444ac886e', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation 66oKWmt04qNUfw5mZ90M, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 cbac6ec7…), gain −0.4 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-02': {
    src: 'media/narration/tour-g-02.mp3', captions: 'media/narration/tour-g-02.vtt', seconds: 14.03, lufs: -23.5,
    transcript: 'It begins with intent. Nine requirements, six of them must-haves: everyone heard and seen at the far end, one touch to join, simple enough for a guest. Everything that follows is judged against these.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: 'c797160408a456302e67e0339f3d94eae246724c3aabddb472b2bc98438e1f3b', source: 'Tour G take 1 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation ijnqK1jRQUzKcedoE9Rq, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 0f365880…), gain −0.8 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-03': {
    src: 'media/narration/tour-g-03.mp3', captions: 'media/narration/tour-g-03.vtt', seconds: 10.45, lufs: -23.5,
    transcript: 'Then the room is designed. Every device becomes a numbered position, and before anything is installed, the commissioning engine already knows which tests this design will need.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '35f06a50f1db624816b782b7d7e2d3f833885cbbe8e944cd60ef2eff4373b107', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation 8tyxEsmHhRecrpZdWzL3, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 9c1b3cd5…), gain −0.9 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-04': {
    src: 'media/narration/tour-g-04.mp3', captions: 'media/narration/tour-g-04.vtt', seconds: 9.17, lufs: -23.4,
    transcript: 'This is the same room in Lite. The same record, seen in three dimensions: the walls, the furniture, and every device at its position.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '8eef209559b25b00e3329b2c1fbbf3348ce0eccf3123c6937f3984d23187bfe7', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation WHLKCuh3Sm2z3YUNJpkX, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 9bca2d12…), gain −1 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-05': {
    src: 'media/narration/tour-g-05.mp3', captions: 'media/narration/tour-g-05.vtt', seconds: 11.55, lufs: -23.4,
    transcript: 'The design becomes real. The front camera’s position now holds a physical unit with its own identity. A position and the asset in it are different things, and the record keeps both.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '382f0b45f9aa92307ce00a9794a32a2d0a20a1589d1b60a5e1f89c268e4107f7', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation xEk3ctEiinXQPrFeAZAD, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 510c3b1f…), gain −0.7 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-06': {
    src: 'media/narration/tour-g-06.mp3', captions: 'media/narration/tour-g-06.vtt', seconds: 10.19, lufs: -23.4,
    transcript: 'Commissioning proves it. Each test is recorded by the person responsible, and checked by somebody else. A result nobody independently verified does not count.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: 'c9f19495ff32114fb907c73b2fbef5d258ed133ea55c3f863ee6ddf42a214013', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation lnUIEkALdiJNuJamLqe3, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 8b7120ea…), gain −0.6 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-07': {
    src: 'media/narration/tour-g-07.mp3', captions: 'media/narration/tour-g-07.vtt', seconds: 9.95, lufs: -23.5,
    transcript: 'Here is the record itself: what was required, what was observed, who recorded it, and who verified it. The evidence is synthetic, and it says so.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: 'a1cc732a1276ae8b25a6354298da3946b41546a7dc2b7af2a746b083b31f942c', source: 'Tour G take 1 of its line, first take; the founder’s picks did not include G7, so it is not yet chosen by ear (generation flow tqtqM1ZAZZSfJji28HCc, generation NgKBU1Usu87Kt4xPNAY3, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 f6b0a4f4…), gain −0.8 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-08': {
    src: 'media/narration/tour-g-08.mp3', captions: 'media/narration/tour-g-08.vtt', seconds: 10.45, lufs: -23.4,
    transcript: 'The room is no longer just installed. Its accepted condition is now documented. Baseline one is what this room was proven to do, and it is never overwritten.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: 'a337661383445fa61268bb82e8ee2819d7e044820ed46bd0f8197e752b61fecf', source: 'Tour G take 1 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation ze4rNhFfYYEiigH4EiLw, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 2417e01a…), gain −0.9 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-10': {
    src: 'media/narration/tour-g-10.mp3', captions: 'media/narration/tour-g-10.vtt', seconds: 9.64, lufs: -23.5,
    transcript: 'Who can fix it? Search Party starts from the room: who supports it, who knows it, and how they are connected, each with where that knowledge came from.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '28ba7d7e3c7a6c86e2b959fda85c174e2abfdf98e4123bbf8bf505dec922cdcd', source: 'Tour G take 1 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation kFkiOn1cVf2IrUgI9yRh, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 b4c8ddd6…), gain −1.2 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-11': {
    src: 'media/narration/tour-g-11.mp3', captions: 'media/narration/tour-g-11.vtt', seconds: 8.91, lufs: -23.5,
    transcript: 'And where is the equipment? Search for the replacement unit, and every product finds the same asset: its position, its room, its history.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '949d5933124658d2166af6b70599d4e603276d1a8b7a1e10738939ec7acc0d62', source: 'Tour G take 2 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation FvkpPBuzaxPHam25nQq1, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 5b779dd8…), gain −0.9 dB toward −23 LUFS, mono 96 kb/s',
  },
  'tour-g-14': {
    src: 'media/narration/tour-g-14.mp3', captions: 'media/narration/tour-g-14.vtt', seconds: 7.63, lufs: -23.5,
    transcript: 'Assurance holds the accepted state, so any later difference shows as drift against a known baseline, not as a guess.',
    voice: 'AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4',
    sha256: '97c2c43ccd287b033f07987506ec760aab89d66868e766a0ba282cc28bd7da22', source: 'Tour G take 1 of its line, the founder’s pick after listening (sent 2026-11-18 16:53) (generation flow tqtqM1ZAZZSfJji28HCc, generation fksjm3N9vFzqBKBqEaDo, 2026-11-18; founder approval for media generation 2026-11-18 16:23; source sha256 ac45e37e…), gain −0.9 dB toward −23 LUFS, mono 96 kb/s',
  },
};
/** Stops whose line was written for the voice but has no take (the voice provider refused them when the credits ran out; founder 18 Nov
 *  16:41: "it's good enough to make them silent with captions"). The same words, shown as timed captions with no sound, at the pace
 *  of the shipped takes (2.6 words a second), and labelled as captions only. One entry per sentence. */
export const CAPTIONS_ONLY: Record<string, string[]> = {
  'tour-g-09': ['In use, things fail.', 'When they do, the problem becomes work: a ServiceHands job tied to this room and, where it is known, to the exact device.'],
  'tour-g-12': ['When the camera is replaced, the system reopens only the tests that involve that position.', 'The old results stay as history.', 'They never count for the new unit.'],
  'tour-g-13': ['The reopened tests are run again, and verified independently.', 'Baseline two becomes current.', 'Baseline one is kept, so you can always compare.'],
  'tour-g-15': ['The same records roll up to leadership.', 'Every figure traces back to the rooms and the jobs it came from.', 'None of it is streamed from a real building.'],
  'tour-g-16': ['One room.', 'One connected history.', 'Every decision connected to the people, the technology and the evidence it affects.', 'Now imagine that across your entire enterprise.'],
};
export const CAPTION_WPS = 2.6;
export const BANNED = /\b(live|real-time monitoring|certif\w*|production-ready|100%)\b/i;
export const tourByKey = (k: string) => TOURS.find((t) => t.key === k);
