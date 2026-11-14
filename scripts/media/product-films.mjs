// The scripts of the product demonstration films (scripts/media/record-product-film.mjs). One per product page; each step does one
// thing and names the proof it must produce before its words appear. Words are plain statements of what is on screen, never a claim
// the demonstration does not show. Keys are P-<product id> (apps/website/src/products.ts).
const click = (sel) => async (p) => { await p.locator(sel).first().click(); };
const go = (hash) => async (p) => { await p.evaluate((h) => { location.hash = h; }, hash); };
/** bring an element into the middle of the view, as a person scrolling would */
const show = (sel) => async (p) => { await p.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' })); await p.waitForTimeout(700); };

export const FILMS = {
  'P-lite': {
    product: 'lite', title: 'Lite: from the campus to one seat, and back', label: 'EMPATHIA LITE · DEMONSTRATION · SYNTHETIC DATA',
    start: '#/lite', startProof: '[data-testid=lite-campus-3d]',
    steps: [
      { say: 'Lite opens on the campus, in 3D. Every building is a button.', proof: '[data-testid=lite-campus-3d] .l3-hitbtn', hold: 3200 },
      { do: click('[data-testid=lite-bld-ATL]'), say: 'Drill down: Atlas HQ, its floors drawn apart.', proof: '[data-testid=lite-building-3d]' },
      { do: click('[data-testid=l3-floor-4]'), say: 'Floor 4: corridor, lifts, stairs, and every room.', proof: '[data-testid=lite-floor-3d]' },
      { do: async (p) => { await click('[data-testid="l3-open-R-ATL-4-218"]')(p); await p.waitForSelector('[data-testid=lite-room-3d]'); await show('[data-testid=lite-room-3d]')(p); }, say: 'Room 4.218, furnished, in 3D.', proof: '[data-testid=lite-room-3d]', hold: 3400 },
      { do: async (p) => { await go('#/lite/room/R-ATL-4-218?mode=engineer&ov=,')(p); await p.waitForSelector('[data-testid=stage-coverage]'); await show('[data-testid=lite-room-3d]')(p); }, say: 'Engineer mode: the same room, with its equipment.', proof: '[data-testid=stage-ov-camera][aria-checked=false]' },
      { do: click('[data-testid=stage-ov-camera]'), say: 'Coverage, right on the room: camera views.', proof: '[data-testid=stage-ov-camera][aria-checked=true]' },
      { do: click('[data-testid=stage-ov-mic]'), say: 'Microphone pickup, with its figure.', proof: '[data-testid=stage-ov-mic][aria-checked=true]' },
      { do: click('[data-testid=stage-layers-open]'), say: 'Layers: designed, commissioned, current, proposed.', proof: '[data-testid=stage-layers]', hold: 3400 },
      { do: async (p) => { await p.keyboard.press('Escape'); await click('[data-testid=lite-eye-plan]')(p); await p.waitForSelector('[data-testid=rm-plan], [data-testid=lite-eye-plan][aria-checked=true]'); await show('[data-testid=lite-room-3d], [data-testid=rm-plan]')(p); }, say: 'The floor plan, to scale.', proof: '[data-testid=rm-plan], [data-testid=lite-eye-plan][aria-checked=true]' },
      { do: async (p) => { await click('[data-testid=lite-eye-back]')(p); await show('[data-testid=lite-room-3d]')(p); }, say: 'Eye level, from the back row.', proof: '[data-testid=lite-eye-back][aria-checked=true]' },
      { do: async (p) => { await go('#/lite/b/ATL/4')(p); await p.evaluate(() => scrollTo(0, 0)); }, say: 'Drill back up: the floor,', proof: '[data-testid=lite-floor-3d]', hold: 2400 },
      { do: click('[data-testid=lite-up-building]'), say: 'the building,', proof: '[data-testid=lite-building-3d]', hold: 2200 },
      { do: click('[data-testid=lite-up-campus]'), say: 'and the campus. One record, every level.', proof: '[data-testid=lite-campus-3d]', hold: 3400 },
    ],
  },
};
