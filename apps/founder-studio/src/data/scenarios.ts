/**
 * Playable scenarios in the Founder Edition. Each step opens a real page of the demonstrator as a persona; the founder does the
 * action with the page's own controls. Steps marked `verify` have an automated counterpart (the test named) on the exact bytes.
 */
export interface ScenarioStep {
  title: string;
  route: string;
  persona: string;
  doThis: string;
  lookFor: string;
  verify?: string;
}
export interface Scenario {
  id: string;
  title: string;
  why: string;
  minutes: number;
  products: string[];
  steps: ScenarioStep[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'townhall',
    title: 'Build a town hall, end to end',
    why: 'The owner’s critical workflow: one canonical room travels from a design to drawings, commissioning, Search Party, Pro and an issue — with nothing passed and nothing invented.',
    minutes: 15,
    products: ['lite', 'drawing-intelligence', 'commissioning', 'search-party', 'pro'],
    steps: [
      { title: 'Create a town hall', route: '#/v25/build', persona: 'designer', doThis: 'Choose “New room”, pick the Town Hall template, type 26 × 18 m with a 6 m ceiling and create it.', lookFor: 'Dimensions are DECLARED; the room gets a canonical id (R-…) and every device a planned-asset id (PA-…).', verify: 'tests/v253-townhall-e2e.mjs E-01' },
      { title: 'Add the equipment', route: '#/v25/build', persona: 'designer', doThis: 'On the Design tab add cameras, microphones, displays, the audio processor, loudspeakers, the network switch and furniture.', lookFor: 'Each addition is checked at once: a device without a connection raises a design deficiency with its reason.' },
      { title: 'Save, then reload the page', route: '#/v25/build', persona: 'designer', doThis: 'Save a revision. Reload the browser tab.', lookFor: 'Every id is unchanged and the revision count went up by one.', verify: 'E-02' },
      { title: 'Generate and approve drawings', route: '#/v25/build', persona: 'syseng', doThis: 'Drawings tab: generate the set (as Designer), then approve the schedule and placement drawings (as Systems Engineer).', lookFor: 'Seven drawings; the approved ones carry the input hash they were approved against.', verify: 'E-03' },
      { title: 'Swap the camera', route: '#/v25/build', persona: 'designer', doThis: 'Select the camera on the plan (Enter on the keyboard works), choose a catalogue model and swap.', lookFor: 'Same asset id, new model, the generic recorded in its model history. The approved schedule turns REVIEW_REQUIRED and a drawing-disagreement issue opens.', verify: 'E-04, E-05' },
      { title: 'Recalculate applicable tests', route: '#/v25/build', persona: 'syseng', doThis: 'Commissioning tab: read the applicability (94 definitions judged).', lookFor: 'The swap was re-evaluated and logged with its trigger. Nothing is PASS: a design never passes a test.', verify: 'E-06' },
      { title: 'Generate the workbook', route: '#/v25/build', persona: 'syseng', doThis: 'Export the planning workbook (.xlsx, CSV or JSON).', lookFor: 'The swapped camera keeps its id; 94 testing rows; results read NOT_TESTED / PASS_UNVERIFIED / PASS_VERIFIED / FAIL / NOT_SUPPORTED / INCONCLUSIVE — never a bare PASS.', verify: 'E-16' },
      { title: 'Open the room in Search Party', route: '#/search', persona: 'architect', doThis: 'Search for the room’s name.', lookFor: 'The same canonical room and planned assets, labelled PLANNED — NOT YET COMMISSIONED. No duplicate records.', verify: 'E-11, E-14' },
      { title: 'Open the room in Empathia Pro', route: '#/pro/planned', persona: 'architect', doThis: 'Open Planned rooms.', lookFor: 'Lifecycle visibility only: no live health is shown for a room that is not installed.', verify: 'E-13' },
      { title: 'Remove a required connection', route: '#/v25/build', persona: 'designer', doThis: 'Select a microphone and remove its connection to the audio processor.', lookFor: 'A High design deficiency: “has no signal path to the audio processor”, with its correlation key. (The automated suite removes the camera’s connections instead: E-10.)', verify: 'E-10' },
      { title: 'Assign the deficiency', route: '#/v25/build', persona: 'syseng', doThis: 'Issues tab: assign it (Systems Engineer may; a Designer may not).', lookFor: 'The assignment is recorded with who did it.', verify: 'tests/e2e/founder-townhall.e2e.mjs (founder program)' },
      { title: 'Restore the connection', route: '#/v25/build', persona: 'designer', doThis: 'Reconnect the microphone, then save.', lookFor: 'The issue resolves itself with a traceable resolution; its evidence history stays.', verify: 'E-12, E-15' },
    ],
  },
  {
    id: 'lifecycle',
    title: 'Intake to service: one connected lifecycle',
    why: 'Follow a request from intake through funding, design, commissioning and service — the seven operational products in one line.',
    minutes: 12,
    products: ['intake', 'commissioning', 'servicehands', 'assurance', 'pro'],
    steps: [
      { title: 'Lifecycle Mission Control', route: '#/v25', persona: 'opslead', doThis: 'Read where each project stands.', lookFor: 'Each stage shows who owns the next step.' },
      { title: 'A request arrives', route: '#/v25/intake', persona: 'requestor', doThis: 'Open a request with photos, plans and dimensions.', lookFor: 'Site, room, work, intent and constraints captured as a brief.' },
      { title: 'Decision and funding', route: '#/v25/decisions', persona: 'exec', doThis: 'Approve or hold a project.', lookFor: 'The decision is bound to a scope revision.' },
      { title: 'Commissioning plan', route: '#/v25/commissioning', persona: 'cxeng', doThis: 'Open a compiled plan.', lookFor: 'Every test with WHY it applies; the excluded ones with WHY NOT.' },
      { title: 'Service', route: '#/v25/service', persona: 'svcmgr', doThis: 'Open a work order.', lookFor: 'Hard-gated eligibility and preflight; closing a work order never passes a test.' },
      { title: 'Assurance', route: '#/v25/assurance', persona: 'architect', doThis: 'Open a baseline.', lookFor: 'NOT_VERIFIED until accepted; drift is measured against the accepted baseline.' },
    ],
  },
  {
    id: 'control-studio',
    title: 'Design and publish a room’s control (simulated)',
    why: 'Control Studio end to end, with every device virtual.',
    minutes: 8,
    products: ['control-studio'],
    steps: [
      { title: 'Open Control Studio', route: '#/v25/cstudio', persona: 'syseng', doThis: 'Create a design from a template.', lookFor: 'Every result is SIMULATED.' },
      { title: 'Route and bind', route: '#/v25/cstudio', persona: 'syseng', doThis: 'Use the routing canvas and the panel builder.', lookFor: 'The command guard refuses unsafe commands.' },
      { title: 'Publish and roll back', route: '#/v25/cstudio', persona: 'syseng', doThis: 'Publish to a synthetic room, then roll back.', lookFor: 'Deployment history and commissioning sync.' },
    ],
  },
  {
    id: 'tours',
    title: 'The nine guided experiences',
    why: 'The demonstrator’s own guided tours, each over real pages.',
    minutes: 20,
    products: ['experiences'],
    steps: [{ title: 'Choose a tour', route: '#/tours', persona: 'architect', doThis: 'Pick any of the nine stories.', lookFor: 'Each step is a real page; you can stop and look around.' }],
  },
];
