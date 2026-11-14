// The scripts of the product demonstration films (scripts/media/record-product-film.mjs). One per product page; each step does one
// thing and names the proof it must produce before its words appear. Words are plain statements of what is on screen, never a claim
// the demonstration does not show. Keys are P-<product id> (apps/website/src/products.ts).
// a visible match first; failing that the first match, brought into view (a list scrolled out of sight may be skipped by
// content-visibility and so measure 0 × 0 until it is scrolled to)
const click = (sel) => async (p) => { const all = p.locator(sel); const vis = all.filter({ visible: true }); const l = (await vis.count()) ? vis.first() : all.first();
  await l.evaluate((el) => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250); await l.click(); };
const go = (hash) => async (p) => { await p.evaluate((h) => { location.hash = h; }, hash); };
/** bring an element into the middle of the view, as a person scrolling would */
const show = (sel) => async (p) => { await p.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' })); await p.waitForTimeout(700); };

export const FILMS = {
  'P-lite': {
    product: 'lite', title: 'Lite: from the campus to one seat, and back', label: 'EMPATHIA LITE · DEMONSTRATION · SYNTHETIC DATA',
    start: '#/lite', startProof: '[data-testid=lite-campus-3d]',
    steps: [
      { say: 'Lite opens on the campus, in 3D. Every building is a button.', proof: '[data-testid=lite-campus-3d] .l3-hitbtn', hold: 2900 },
      { do: click('[data-testid=lite-bld-ATL]'), say: 'Drill down: Atlas HQ, its floors drawn apart.', proof: '[data-testid=lite-building-3d]' },
      { do: click('[data-testid=l3-floor-4]'), say: 'Floor 4: corridor, lifts, stairs, and every room.', proof: '[data-testid=lite-floor-3d]' },
      { do: async (p) => { await click('[data-testid="l3-open-R-ATL-4-218"]')(p); await p.waitForSelector('[data-testid=lite-room-3d]'); await show('[data-testid=lite-room-3d]')(p); }, say: 'Room 4.218, furnished, in 3D.', proof: '[data-testid=lite-room-3d]', hold: 3000 },
      { do: async (p) => { await go('#/lite/room/R-ATL-4-218?mode=engineer&ov=,')(p); await p.waitForSelector('[data-testid=stage-coverage]'); await show('[data-testid=lite-room-3d]')(p); }, say: 'Engineer mode: the same room, with its equipment.', proof: '[data-testid=stage-ov-camera][aria-checked=false]' },
      { do: click('[data-testid=stage-ov-camera]'), say: 'Coverage, right on the room: camera views.', proof: '[data-testid=stage-ov-camera][aria-checked=true]' },
      { do: click('[data-testid=stage-ov-mic]'), say: 'Microphone pickup, with its figure.', proof: '[data-testid=stage-ov-mic][aria-checked=true]' },
      { do: click('[data-testid=stage-layers-open]'), say: 'Layers: designed, commissioned, current, proposed.', proof: '[data-testid=stage-layers]', hold: 3000 },
      { do: async (p) => { await p.keyboard.press('Escape'); await click('[data-testid=lite-eye-plan]')(p); await p.waitForSelector('[data-testid=rm-plan], [data-testid=lite-eye-plan][aria-checked=true]'); await show('[data-testid=lite-room-3d], [data-testid=rm-plan]')(p); }, say: 'The floor plan, to scale.', proof: '[data-testid=rm-plan], [data-testid=lite-eye-plan][aria-checked=true]' },
      { do: async (p) => { await click('[data-testid=lite-eye-back]')(p); await show('[data-testid=lite-room-3d]')(p); }, say: 'Eye level, from the back row.', proof: '[data-testid=lite-eye-back][aria-checked=true]' },
      { do: async (p) => { await go('#/lite/b/ATL/4')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill back up: the floor,', proof: '[data-testid=lite-floor-3d]', hold: 2400 },
      { do: click('[data-testid=lite-up-building]'), say: 'the building,', proof: '[data-testid=lite-building-3d]', hold: 2200 },
      { do: click('[data-testid=lite-up-campus]'), say: 'and the campus. One record, every level.', proof: '[data-testid=lite-campus-3d]', hold: 3400 },
    ],
  },
  'P-search-party': {
    product: 'search-party', title: 'Search Party: ask, follow the connections, and come back', label: '',
    start: '#/search', startProof: '[data-testid=sp-try]',
    steps: [
      { say: 'Search Party: one search across rooms, devices, people and issues.', proof: '[data-testid=sp-try]' },
      { do: click('a[href="#/search?q=who%20knows%20Atlas%204.218"]'), say: 'Ask in plain words: who knows Atlas 4.218?', proof: '[data-testid=connect-who]', hold: 3400 },
      { do: show('[data-testid=connect-who]'), say: 'The people who answer for the room, and how they are connected.', proof: '[data-testid=connect-who]' },
      { do: async (p) => { await click('a[href="#/search?focus=Room%3AR-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill down: the room, and everything linked to it.', proof: '[data-testid=impact]', check: async (p) => /Atlas 4\.218/.test(await p.locator('h1').innerText()) },
      { do: async (p) => { await click('a[href="#/people/p-champ-ATL"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'A person: who they are, what they answer for, and their backup.', proof: '[data-testid=person-page]' },
      { do: show('[data-testid=person-responsible]'), say: 'Every room they look after, each one a way in.', proof: '[data-testid=person-responsible]' },
      { do: async (p) => { await go('#/search/scenarios/S1')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Ask what breaks: if this switch fails, what is affected?', proof: '[data-testid=sp-scenario]', hold: 3400 },
      { do: async (p) => { await show('[data-testid=sp-more-rooms]')(p); await click('[data-testid=sp-more-rooms]')(p); }, say: 'Every affected room and device, listed first, then drawn.', proof: '[data-testid=sp-more-rooms][aria-expanded=true]' },
      { do: async (p) => { await show('[data-testid=sp-group-rooms]')(p); await p.waitForTimeout(600); await click('a[href="#/campus/ATL/4/R-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Into one of them: Atlas 4.218, on the campus.', proof: '[data-testid=room-view]' },
      { do: async (p) => { await click('a[href="#/search?focus=Room:R-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'And back up to its relationships.', proof: '[data-testid=impact]', hold: 2600 },
      { do: async (p) => { await go('#/search')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'One record behind every answer, with where each link came from.', proof: '[data-testid=sp-try]', hold: 3400 },
    ],
  },
  'P-servicehands': {
    product: 'servicehands', title: 'ServiceHands: from a report to the fix, with the room’s history', label: '',
    start: '#/servicehands', startProof: '[data-testid=jobs]',
    steps: [
      { say: 'ServiceHands: every service job, from the first report to the fix.', proof: '[data-testid=jobs]' },
      { do: click('a[href="#/servicehands/new"]'), say: 'Anyone can report a problem: the room, what is wrong, in their own words.', proof: '[data-testid=in-title]', hold: 2400 },
      { do: async (p) => { await p.getByTestId('in-title').click(); await p.keyboard.type('The display flickers at the start of every meeting', { delay: 28 }); }, say: 'Reported in a sentence; nothing is sent in the demonstration.', proof: '[data-testid=in-submit]' },
      { do: async (p) => { await go('#/servicehands')(p); await p.waitForSelector('[data-testid=jobs]'); await click('a[href="#/servicehands/wo/WO-0088"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill down: one job, through its stages.', proof: '[data-testid=stages]' },
      { do: show('[data-testid=connect-who]'), say: 'Who answers for the room, and who covers when they are away.', proof: '[data-testid=connect-who]' },
      { do: async (p) => { await click('a[href="#/replay/R-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The room’s own history, so the fix starts from what happened before.', proof: '[data-testid=rp-scrub]' },
      { do: click('[data-testid=rp-next]'), say: 'Step through it, one dated record at a time.', proof: '[data-testid=rp-card]' },
      { do: async (p) => { await go('#/service?id=ISS-0417')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Back up to the dispatch board: the same job, in its column.', proof: '[data-testid=board]' },
      { do: click('a[href="#/service/coverage"]'), say: 'Coverage: who is on, where, and when.', proof: '[data-testid=coverage]' },
      { do: async (p) => { await go('#/servicehands')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'One record from report to fix, shared with every other product.', proof: '[data-testid=jobs]', hold: 3000 },
    ],
  },
  'P-commissioning': {
    product: 'commissioning', title: 'Commissioning and assurance: from the campus to one check, and back', label: '',
    start: '#/commissioning', startProof: '[data-testid=cx-attention]',
    steps: [
      { say: 'Commissioning: every room on the campus, and what needs attention.', proof: '[data-testid=cx-attention]' },
      { do: async (p) => { await click('a[href="#/campus/ATL/4/R-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); await go('#/commissioning/room/R-ATL-4-218')(p); }, say: 'Drill down: one room, through its phases.', proof: '[data-testid=cx-phases]' },
      { do: show('[data-testid=cx-checks]'), say: 'Every check, with its evidence and who ran it.', proof: '[data-testid=cx-checks]' },
      { do: async (p) => { await click('a[href="#/commissioning/room/R-ATL-4-218/trace"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Traceability: from the requirement to the test that proves it.', proof: '[data-testid=cx-room]' },
      { do: async (p) => { await click('a[href="#/commissioning/room/R-ATL-4-218/deficiencies"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The room’s deficiencies, each with an owner.', proof: '[data-testid=cx-room]' },
      { do: async (p) => { await click('[data-testid=room-jump-assurance]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Assurance: the room in its four states.', proof: '[data-testid=as-four-states]', hold: 3000 },
      { do: show('[data-testid=as-run]'), say: 'Run the checks again, on a simulated system: a simulation never proves commissioning.', proof: '[data-testid=as-run]', hold: 3200 },
      { do: async (p) => { await go('#/commissioning/deficiencies')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Back up: every open deficiency across the campus,', proof: '[data-testid=cx-deficiencies]' },
      { do: show('[data-testid=cx-owners]'), say: 'grouped by who owns the fix.', proof: '[data-testid=cx-owners]' },
      { do: async (p) => { await go('#/commissioning')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Designed, commissioned, current and proposed, never confused.', proof: '[data-testid=cx-attention]', hold: 3000 },
    ],
  },
  'P-learn': {
    product: 'learn', title: 'Learn: from what actually happened, to the lab, and back', label: '',
    start: '#/v25/learn', startProof: '[data-testid=learn-cases]',
    steps: [
      { say: 'Learn: reviewed cases from what actually happened on the campus.', proof: '[data-testid=learn-cases]', hold: 3200 },
      { do: show('[data-testid=learn-rooms]'), say: 'Each case starts from a room and its service history.', proof: '[data-testid=learn-rooms]' },
      { do: async (p) => { await click('a[href="#/learn/labs"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill down: the labs, by subject.', proof: '[data-testid=flagship-labs]' },
      { do: async (p) => { await click('a[href="#/learn/labs?type=eq"]')(p); }, say: 'Filter to one subject: equalisation.', proof: '[data-testid=labs]' },
      { do: async (p) => { await click('a[href="#/learn/labs/LAB-EQ-01"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'One lab: notch the ringing wedge.', proof: 'main h1' },
      { do: async (p) => { await go('#/learn/labs/hear')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The Audio Lab: hear what one EQ band does, live in the browser.', proof: 'main h1', hold: 3200 },
      { do: async (p) => { await go('#/learn/labs/see')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The Camera Lab: see what each setting changes.', proof: 'main h1' },
      { do: async (p) => { await go('#/onboard')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The IT onboarding guide, for the people new to the rooms.', proof: 'main h1' },
      { do: async (p) => { await go('#/manual')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The engineering standards manual, written for this campus.', proof: 'main h1', hold: 3000 },
      { do: async (p) => { await go('#/v25/learn')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Back up: every lesson linked to the record it came from.', proof: '[data-testid=learn-cases]', hold: 3000 },
    ],
  },
  'P-mission-control': {
    hold: 3200,   // a steadier pace: this film has fewer, denser screens
    product: 'mission-control', title: 'Mission Control: what changed, what matters, what needs action', label: '',
    start: '#/v25', startProof: '[data-testid=stations]',
    steps: [
      { say: 'Mission Control: what changed, what matters, and what needs action.', proof: '[data-testid=tiles]', hold: 3000 },
      { do: show('[data-testid=stations]'), say: 'Every stage of a room’s life, each with what is waiting there.', proof: '[data-testid=stations]', hold: 3000 },
      { do: async (p) => { await go('#/v25/decisions')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill down: the decision desk, each decision with its reason.', proof: '[data-testid=pending]' },
      { do: show('[data-testid=decision-log]'), say: 'Every decision kept in its log.', proof: '[data-testid=decision-log]' },
      { do: async (p) => { await go('#/v25/exec')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The executive view: twenty-seven measures, each with its working.', proof: '[data-testid=passports]' },
      { do: async (p) => { await go('#/v25/ledger')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The ledger behind every state: what changed, and when.', proof: '[data-testid=ledger]' },
      { do: async (p) => { await go('#/servicehands')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Into service: the jobs open now.', proof: '[data-testid=jobs]' },
      { do: async (p) => { await go('#/commissioning')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Into commissioning: what needs attention.', proof: '[data-testid=cx-attention]' },
      { do: async (p) => { await go('#/v25')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'And back up: one view of the whole estate, from one record.', proof: '[data-testid=stations]', hold: 3000 },
    ],
  },
  'P-pro': {
    hold: 3500,   // a steadier pace: this film has fewer, denser screens
    product: 'pro', title: 'Pro: executive measures that show their work', label: '',
    start: '#/v25/exec', startProof: '[data-testid=passports]',
    steps: [
      { say: 'Pro: executive measures that show their work.', proof: '[data-testid=tiles]', hold: 3000 },
      { do: show('[data-testid=exec-filters]'), say: 'Filter by period and by building.', proof: '[data-testid=exec-filters]' },
      { do: show('[data-testid=passports]'), say: 'Twenty-seven measures, each a passport: numerator, denominator, window and coverage.', proof: '[data-testid=passports]', hold: 3400 },
      { do: show('[data-testid=pending-funding]'), say: 'What is waiting for funding, and why.', proof: '[data-testid=pending-funding]' },
      { do: async (p) => { await click('a[href="#/v25/decisions"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill down: the decision behind a figure.', proof: '[data-testid=pending]' },
      { do: show('[data-testid=readiness]'), say: 'Its readiness, before anyone approves it.', proof: '[data-testid=readiness]' },
      { do: async (p) => { await go('#/v25/ledger')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'The ledger each measure is counted from.', proof: '[data-testid=ledger]' },
      { do: async (p) => { await go('#/v25/exec')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Back up: missing data is shown as missing, never as success.', proof: '[data-testid=passports]', hold: 3400 },
    ],
  },
  'P-apex': {
    hold: 3100,   // a steadier pace: this film has fewer, denser screens
    product: 'apex', title: 'APEX: cited hypotheses, bounded actions, blocked outcomes', label: '',
    start: '#/v25/apex', startProof: '[data-testid=apex-cases]',
    steps: [
      { say: 'APEX: cited hypotheses, bounded actions, and outcomes it is not allowed to take.', proof: '[data-testid=apex-cases]', hold: 3200 },
      { do: async (p) => { await click('a[href="#/v25/apex?case=APX-001"]')(p); await show('[data-testid=apex-case]')(p); }, say: 'Drill down: one case, far-end audio dropping out.', proof: '[data-testid=apex-case]' },
      { do: show('[data-testid=layers]'), say: 'The layers it reasons over, each one cited.', proof: '[data-testid=layers]' },
      { do: show('[data-testid=hypothesis]'), say: 'A hypothesis, with the evidence for and against it.', proof: '[data-testid=hypothesis]', hold: 3200 },
      { do: show('[data-testid=apex-tiers]'), say: 'What it may do alone, what needs a person, and what it may never do.', proof: '[data-testid=apex-tiers]', hold: 3400 },
      { do: show('[data-testid=apex-log]'), say: 'Every step it took, in its log.', proof: '[data-testid=apex-log]' },
      { do: async (p) => { await click('a[href="#/search?focus=Room:R-ATL-4-218"]')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Across to Search Party: the room and who answers for it.', proof: '[data-testid=impact]' },
      { do: async (p) => { await go('#/v25/apex')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'And back: a person decides; APEX shows its work.', proof: '[data-testid=apex-cases]', hold: 3200 },
    ],
  },
  'P-field-intelligence': {
    hold: 3600,   // a steadier pace: this film has fewer, denser screens
    product: 'field-intelligence', title: 'Field Intelligence: what the collector declares, and what it may not do', label: '',
    start: '#/v25/fi', startProof: '[data-testid=fi-plan]',
    steps: [
      { say: 'Field Intelligence: what the room’s collector declares before it runs.', proof: '[data-testid=fi-plan]', hold: 3200 },
      { do: async (p) => { await p.evaluate(() => scrollBy({ top: 420, behavior: 'smooth' })); await p.waitForTimeout(700); }, say: 'Read-only checks, on a schedule, of only what it is allowed to reach.', proof: '[data-testid=fi-plan]', hold: 3200 },
      { do: async (p) => { await p.evaluate(() => scrollBy({ top: 420, behavior: 'smooth' })); await p.waitForTimeout(700); }, say: 'Each result an evidence record: what was seen, and what it does not prove.', proof: '[data-testid=fi-plan]', hold: 3200 },
      { do: async (p) => { await go('#/servicehands/wo/WO-0088')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Where a finding goes: a service job, with its evidence.', proof: '[data-testid=stages]' },
      { do: async (p) => { await go('#/replay/R-ATL-4-218')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Into the room’s history.', proof: '[data-testid=rp-scrub]' },
      { do: click('[data-testid=rp-next]'), say: 'Each record dated, each one its own step.', proof: '[data-testid=rp-card]' },
      { do: async (p) => { await go('#/lite/room/R-ATL-4-218?mode=engineer')(p); await p.waitForSelector('[data-testid=lite-room-3d]'); await show('[data-testid=lite-room-3d]')(p); }, say: 'And the room itself, in Engineer mode.', proof: '[data-testid=lite-room-3d]', hold: 3000 },
      { do: async (p) => { await go('#/v25/fi')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Back up: no collector is connected in the demonstration; the checks are simulated.', proof: '[data-testid=fi-plan]', hold: 3400 },
    ],
  },
};
