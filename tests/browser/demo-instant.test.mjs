#!/usr/bin/env node
// Instant Room (#/instant; apps/demo/src/instant) against the built demo, as a person with a phone in a room: guided photographs
// judged by the browser (generated pictures: sharp, blurred, dark, upright), coverage in words, measurements, what was seen, a plan
// with its assumptions, differences from the record, a layout study, and a saved proposal that changes no record.
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/demo-instant.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done, base } = await harness('demo-instant');
const clean = (t) => t.errs.length === 0 && t.off.length === 0;
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const ROOM = 'R-ATL-4-218';
// a picture drawn in the page: lines and text on a wall-coloured ground; optionally blurred, darkened, or upright
const picture = async (p, kind) => Buffer.from(await p.evaluate((k) => { const up = k === 'upright'; const c = document.createElement('canvas'); c.width = up ? 1800 : 2400; c.height = up ? 2400 : 1800; const x = c.getContext('2d');
  if (k === 'blurred') x.filter = 'blur(16px)'; x.fillStyle = k === 'dark' ? '#060606' : '#c9c4b8'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = k === 'dark' ? '#141414' : '#2a2a2a'; x.fillStyle = x.strokeStyle; x.lineWidth = 6;
  for (let i = 0; i < 40; i++) { x.strokeRect(60 + i * 55, 80 + (i % 7) * 210, 420, 150); x.font = '64px sans-serif'; x.fillText(`Wall ${i}`, 90 + i * 55, 180 + (i % 7) * 210); }
  return c.toDataURL('image/jpeg', 0.9).split(',')[1]; }, kind), 'base64');
const give = async (p, shot, buffer, name = `${shot}.jpg`, mimeType = 'image/jpeg') => { await p.setInputFiles(`[data-testid=ir-file-${shot}]`, { name, mimeType, buffer }); };
const shot = (p, id) => p.evaluate((i) => { const x = document.querySelector(`[data-shot="${i}"]`); return { state: x.dataset.state, verdict: x.querySelector('figcaption')?.dataset.verdict || null, text: x.innerText.replace(/\s+/g, ' ') }; }, id);
const settle = (p, id, state) => p.waitForFunction(([i, s]) => document.querySelector(`[data-shot="${i}"]`)?.dataset.state === s, [id, state]);
const cover = (p) => p.evaluate(() => ({ complete: document.querySelector('[data-testid=ir-coverage]').dataset.complete, lines: [...document.querySelectorAll('[data-testid=ir-coverage] li')].map((x) => x.textContent) }));
const stepTo = async (p, s, room = ROOM) => { await p.goto(`${base}#/instant${room ? `/${room}` : ''}?step=${s}`); await p.waitForSelector(`[data-testid=instant][data-step=${s}]`); };

{ const t = await open(`#/instant/${ROOM}`, { role: 'service', w: 390, h: 800 }); const p = t.page; await p.waitForSelector('[data-testid=instant]'); const m = await main(p);
  const sharp = await picture(p, 'sharp'); const blurred = await picture(p, 'blurred'); const dark = await picture(p, 'dark'); const upright = await picture(p, 'upright');
  ok('IRB-01', 'it opens on the scope of this room, says the photographs stay on the device and that nothing is recognised by a machine, and tells the person to stay safe', await p.getAttribute('[data-testid=instant]', 'data-step') === 'scope' && await p.locator('[data-testid=ir-steps] a').count() === 5 && /Photographs stay on this device/.test(m) && /Nothing is recognised by a machine/.test(m) && /Do not open equipment, move it, climb, or go anywhere you would not normally go/.test(m) && /It has a record; what you capture is compared with it at the end/.test(m));
  const scopes = await p.evaluate(() => [...document.querySelectorAll('[data-testid=ir-scope] .ir-opt')].map((x) => x.innerText.replace(/\s+/g, ' ')));
  ok('IRB-02', 'three scopes, each saying how many photographs it needs', scopes.length === 3 && /The whole room .* 5 photographs needed/.test(scopes[0]) && /The front of the room .* 2 photographs needed/.test(scopes[1]) && /The equipment only .* 2 photographs needed/.test(scopes[2]), scopes.join(' | ').slice(0, 200));
  await p.click('[data-testid=ir-next]'); await p.waitForSelector('[data-testid=ir-photos]'); let c = await cover(p);
  const list = await p.evaluate(() => [...document.querySelectorAll('.ir-shots > li')].map((x) => `${x.dataset.shot}:${x.dataset.required}`).join(' '));
  ok('IRB-03', 'the photographs step lists the guided shots in order, and says in words what is not covered yet', list === 'front:yes table:no corner:yes left:yes right:yes ceiling:yes camera-label:no network-label:no rack-rear:no' && c.complete === 'no' && c.lines.includes('The left wall is not clearly visible yet.') && c.lines.length === 5, list);
  const rack = await shot(p, 'rack-rear');
  ok('IRB-04', 'the back of the rack is optional and says when to leave it out; the first shot uses the founder’s words', /Optional/.test(rack.text) && /Capture the rear of the equipment rack if safely accessible\./.test(rack.text) && /If the rack is locked, enclosed or behind a panel, leave this shot out/.test(rack.text) && /Stand near the entrance and capture the full front wall\./.test((await shot(p, 'front')).text));
  await give(p, 'front', blurred); await settle(p, 'front', 'retake'); const b = await shot(p, 'front'); c = await cover(p);
  ok('IRB-05', 'a blurred photograph is told so and is not coverage', b.verdict === 'blurry' && /This photo is blurry\. Please retake it\./.test(b.text) && c.lines.includes('The front wall is not clearly visible yet.') && await p.locator('[data-shot=front] img').count() === 1, `${b.verdict} ${b.text.slice(0, 140)}`);
  await give(p, 'front', sharp); await settle(p, 'front', 'ok'); c = await cover(p);
  ok('IRB-06', 'retaking it sharp passes, replaces the first, and the front wall leaves the list', (await shot(p, 'front')).verdict === 'ok' && !c.lines.some((x) => /front wall/.test(x)) && await p.locator('[data-shot=front] img').count() === 1 && /Retake/.test((await shot(p, 'front')).text));
  await give(p, 'right', dark); await settle(p, 'right', 'retake'); const d = await shot(p, 'right');
  await give(p, 'left', upright); await settle(p, 'left', 'retake'); const u = await shot(p, 'left');
  ok('IRB-07', 'a dark photograph and an upright photograph of a wall are each told what to do', d.verdict === 'dark' && /too dark to make out/.test(d.text) && u.verdict === 'upright' && /Turn the phone on its side/.test(u.text), `${d.verdict} ${u.verdict}`);
  await p.click('[data-testid=ir-keep-left]'); await settle(p, 'left', 'ok');
  ok('IRB-08', 'a person who can see the photograph is fine may keep it, and it says it was kept anyway', /Kept anyway\./.test((await shot(p, 'left')).text) && !(await cover(p)).lines.some((x) => /left wall/.test(x)));
  await give(p, 'corner', Buffer.from('not a picture at all'), 'notes.txt', 'text/plain'); await p.waitForSelector('[data-testid=ir-refused]');
  ok('IRB-09', 'a file that is not a photograph is refused in words and nothing is recorded for the shot', /“notes\.txt” could not be read as a photograph/.test(await p.innerText('[data-testid=ir-refused]')) && (await shot(p, 'corner')).state === 'none');
  await give(p, 'right', sharp); await settle(p, 'right', 'ok'); await give(p, 'corner', sharp); await settle(p, 'corner', 'ok'); await give(p, 'ceiling', sharp); await settle(p, 'ceiling', 'ok'); c = await cover(p);
  ok('IRB-10', 'with every needed shot taken the coverage says so', c.complete === 'yes' && /Every photograph that is needed has been taken/.test(await p.innerText('[data-testid=ir-coverage]')));
  await p.reload(); await p.waitForSelector('[data-testid=ir-photos]'); await p.waitForFunction(() => document.querySelectorAll('.ir-thumb img').length === 5);
  ok('IRB-11', 'a reload in the middle loses nothing: the five photographs and their verdicts are still on the device', (await cover(p)).complete === 'yes' && await p.locator('.ir-shots > li[data-state=ok]').count() === 5 && await p.locator('[data-testid=ir-volatile]').count() === 0);
  await p.click('[data-testid=ir-remove-ceiling]'); await settle(p, 'ceiling', 'none'); const gone = (await cover(p)).lines; await give(p, 'ceiling', sharp); await settle(p, 'ceiling', 'ok');
  ok('IRB-12', 'a photograph can be removed, and the coverage says what is missing again', gone.includes('The ceiling is not clearly visible yet.'));

  await stepTo(p, 'review'); const miss = await p.innerText('[data-testid=ir-missing]');
  ok('IRB-20', 'before the room is measured no plan is drawn, and the reason is the founder’s sentence', /Confirm the room width using an actual measurement\./.test(miss) && /Give the room’s length/.test(miss) && await p.locator('[data-testid=ir-plan], [data-testid=ir-save]').count() === 0, miss.replace(/\s+/g, ' '));
  await stepTo(p, 'measure'); await p.fill('[data-testid=ir-width]', '620'); const why = await p.innerText('[data-dim=width] .ir-why');
  await p.fill('[data-testid=ir-width]', '6,2'); await p.fill('[data-testid=ir-length]', '9.4'); await p.selectOption('[data-testid=ir-length-how]', 'paced'); await p.fill('[data-testid=ir-seats]', '14');
  ok('IRB-21', 'a width in centimetres is caught; metres with a comma are read; how each was found is kept', /metres, not feet or centimetres/.test(why) && await p.getAttribute('[data-dim=width]', 'data-ok') === 'yes' && await p.getAttribute('[data-dim=length]', 'data-ok') === 'yes' && await p.locator('.ir-why').count() === 0, why);
  await p.click('[data-testid=ir-next]'); await p.waitForSelector('[data-testid=ir-details]');
  await p.selectOption('[data-testid=ir-cat]', 'display'); await p.selectOption('[data-testid=ir-place]', 'front'); await p.fill('[data-testid=ir-label]', 'Model 75-X <b>'); await p.click('[data-testid=ir-add]');
  await p.selectOption('[data-testid=ir-cat]', 'camera'); await p.click('[data-testid=ir-add]');
  ok('IRB-22', 'what was seen is added as the person’s own statement: kind, place and what the label says, shown as text', await p.locator('[data-testid=ir-detail-list] li').count() === 2 && /Display · front wall · label: “Model 75-X/.test(await p.innerText('[data-testid=ir-detail-list]')) && await p.locator('[data-testid=ir-detail-list] b b').count() === 0 && /Nothing here is read from the photographs/.test(await main(p)));
  await p.click('[data-testid=ir-next]'); await p.waitForSelector('[data-testid=ir-plan]');
  const plan = await p.evaluate(() => { const f = document.querySelector('[data-testid=ir-plan]'); return { basis: f.dataset.basis, markers: f.dataset.markers, aria: f.querySelector('svg').getAttribute('aria-label'), key: f.querySelectorAll('.ir-key li').length, assume: [...document.querySelectorAll('[data-testid=ir-assumptions] li')].map((x) => x.textContent) }; });
  ok('IRB-23', 'the plan is the measured rectangle with what was seen on the wall it was said to be on, and it lists every guess it depends on', plan.basis === 'PART-ESTIMATED' && plan.markers === '2' && /6\.2 metres wide, 9\.4 metres long, with 2 pieces of equipment/.test(plan.aria) && plan.key === 2 && plan.assume.some((a) => /drawn as a rectangle/.test(a)) && plan.assume.includes('The length (9.4 m) was paced out, not measured.') && plan.assume.some((a) => /kept although the sharpness and light check did not pass it/.test(a)) && plan.assume.some((a) => /Nobody measured where along the wall/.test(a)), JSON.stringify(plan).slice(0, 300));
  const f = await p.evaluate(() => { const c = document.querySelector('[data-testid=ir-findings]'); return { text: c.innerText.replace(/\s+/g, ' '), kinds: [...c.querySelectorAll('li')].map((x) => x.dataset.kind) }; });
  ok('IRB-24', 'differences from the room’s record are shown as questions for a person, and the record is not changed', /Against the record of Atlas 4\.218/.test(f.text) && /Neither side is taken as right, and the record is not changed/.test(f.text) && f.kinds.every((k) => ['dimension', 'seats', 'not-in-record', 'not-seen'].includes(k)), f.text.slice(0, 260));
  const st = await p.evaluate(() => [...document.querySelectorAll('[data-testid=ir-study] input[name=ir-option]')].map((x) => x.dataset.option).join(' '));
  ok('IRB-25', 'the layout study offers its three options and none, says its scores are modelled, and lists what it assumed', st === 'none A B C' && /modelled from geometry, not measured/.test(await p.innerText('[data-testid=ir-study]')) && /No height was recorded: the study assumes a 3 m ceiling/.test(await p.innerText('[data-testid=ir-study]')), st);
  const before = await p.evaluate(() => { const w = JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')); return JSON.stringify({ incidents: w.incidents, workOrders: w.workOrders }); });
  await p.locator('[data-testid=ir-study] input[data-option=B]').check(); await p.click('[data-testid=ir-save]'); await p.waitForSelector('[data-testid=ir-saved]');
  const after = await p.evaluate(() => { const w = JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')); return { same: JSON.stringify({ incidents: w.incidents, workOrders: w.workOrders }), props: w.ir.proposals, led: w.events.filter((e) => e.type === 'instant.proposed').map((e) => e.detail), draft: localStorage.getItem('empathia.demo.instant.v1') }; });
  ok('IRB-26', 'saving makes proposal IR-0001 with the size, the layout, the photographs by reference and the assumptions; one ledger line; no other record changes; no image is in the shared record', /Saved as IR-0001/.test(await main(p)) && after.props.length === 1 && after.props[0].option === 'B' && after.props[0].photos.length === 5 && after.props[0].basis === 'PART-ESTIMATED' && after.same === before && after.led.length === 1 && /A proposal: no record was changed/.test(after.led[0]) && !JSON.stringify(after.props).includes('data:image') && after.draft === null, after.led[0]);
  ok('IRB-27', 'the saved screen says a designer reads it and that accepting it is not built', /no room’s record, drawing or equipment list was changed/.test(await main(p)) && /Accepting one into a room’s record is not built/.test(await main(p)));
  ok('IRB-28', 'on a phone nothing scrolls sideways, there is one h1, and nothing was requested off the origin', await over(p) <= 0 && await p.locator('main h1').count() === 1 && clean(t), [...t.errs, ...t.off].join(' | '));

  // who sees the proposal
  const as = async (role) => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.goto(`${base}#/instant`); await p.reload(); await p.waitForTimeout(700); return main(p); };
  const des = await as('designer');
  ok('IRB-30', 'a designer reads the proposal, with its assumptions and its differences from the record', /Proposed designs/.test(des) && /IR-0001 · Atlas 4\.218/.test(des) && /6\.2 m by 9\.4 m · partly estimated · 5 photographs · layout B/.test(des) && await p.locator('[data-proposal=IR-0001] details').count() === 1);
  ok('IRB-31', 'an Installation Engineer may capture but is not shown someone else’s proposal', !/IR-0001/.test(await as('installer')) && await p.locator('[data-testid=ir-steps]').count() === 1);
  ok('IRB-32', 'Instant Room is not open to a visitor', /is not open to the/.test(await as('visitor')) && await p.locator('[data-testid=instant]').count() === 0); await t.close(); }

// a space with no record, the front of it only, at the narrowest width
{ const t = await open('#/instant', { role: 'employee', w: 320, h: 700 }); const p = t.page; await p.waitForSelector('[data-testid=instant]'); const sharp = await picture(p, 'sharp');
  await p.fill('[data-testid=ir-name]', 'Garden studio'); await p.locator('[data-testid=ir-scope] input[data-scope=front]').check(); await p.click('[data-testid=ir-next]'); await p.waitForSelector('[data-testid=ir-photos]');
  const n = await p.locator('.ir-shots > li').count(); await give(p, 'front', sharp); await settle(p, 'front', 'ok'); await give(p, 'table', sharp); await settle(p, 'table', 'ok');
  const small = await p.evaluate(() => [...document.querySelectorAll('.ir .ui-btn, .ir-steps a, .ir-opt, .ir input[type=text], .ir select')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).length);
  ok('IRB-40', 'a new space, the front of it only: three shots are asked for, two are needed, and at 320 px every control is at least 44 px tall with nothing off the side', n === 3 && (await cover(p)).complete === 'yes' && small === 0 && await over(p) <= 0, `n=${n} small=${small} over=${await over(p)}`);
  await stepTo(p, 'measure', ''); await p.fill('[data-testid=ir-width]', '4.5'); await p.fill('[data-testid=ir-length]', '6'); await stepTo(p, 'review', '');
  const r = await p.evaluate(() => ({ basis: document.querySelector('[data-testid=ir-plan]')?.dataset.basis, find: document.querySelector('[data-testid=ir-findings]').innerText.replace(/\s+/g, ' '), study: document.querySelector('[data-testid=ir-nostudy]')?.textContent }));
  ok('IRB-41', 'its plan is drawn from measured numbers; there is no record to compare with, and no layout is studied without a seat count', r.basis === 'MEASURED' && /This space has no record to compare with\. What you captured would be its first\./.test(r.find) && /Say how many people the room should seat/.test(r.study || ''), JSON.stringify(r).slice(0, 240));
  await p.click('[data-testid=ir-save]'); await p.waitForSelector('[data-testid=ir-saved]');
  ok('IRB-42', 'it saves as a proposal for a space that has no record, with no layout', /Saved as IR-0001/.test(await main(p)) && /None chosen/.test(await p.innerText('[data-testid=ir-saved]')) && clean(t), [...t.errs, ...t.off].join(' | ')); await t.close(); }

await done();
