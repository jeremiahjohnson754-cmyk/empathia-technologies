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
};
