#!/usr/bin/env node
// In this room (#/here; founder, 10 Nov, the signature demonstration): someone walks into a room they do not know, says which room,
// sees what is in it on its plan and in 3D, reads what has happened there, says what is wrong, is walked through what to try, and
// writes down how it ended — and what they wrote is then found in ServiceHands, on the room page and in the room's history, because
// it is one set of records. Each role sees the parts V2.5.3 gives it (D44): no history for an employee, no report for a visitor.
// Destructive: an unknown label, a reload half-way, a step asked for before a symptom, a double press on Send.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-here');
const REF = 'R-ATL-4-218';
const at = (p, sel) => p.locator(sel);
const attr = (p, sel, a) => p.locator(sel).first().getAttribute(a).catch(() => null);
const step = (p) => attr(p, '[data-testid=here-page]', 'data-step');
const next = async (p) => { await p.click('[data-testid=here-next]'); await p.waitForTimeout(180); };
const incidents = (p) => p.evaluate(() => { const w = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /workspace/.test(k)) || '') || 'null'); return w ? w.incidents.map((i) => ({ id: i.id, room: i.roomId, state: i.state, title: i.title, by: i.history[0].by, rec: i.recurrenceOf })) : []; });

// ------------------------------------------------------------------ the whole walk, as a technician who has never seen the room
{ const t = await open('#/here', { role: 'service' }); const p = t.page;
  ok('H-01', 'arriving: the page asks which room, and offers rooms worth walking into, the reference room first', await step(p) === 'arrive' && /Which room are you in/.test(await p.locator('main h1').innerText()) && await attr(p, '[data-testid=here-worth] a', 'data-room') === REF);
  await p.fill('[data-testid=here-find]', '4.218'); await p.waitForTimeout(150);
  ok('H-02', 'typing the number on the door finds the room', await attr(p, '[data-testid=here-found] a', 'data-room') === REF);
  await p.fill('[data-testid=here-find]', 'zzqx'); await p.waitForTimeout(150);
  ok('H-03', 'nothing matching is said in words', /No room on this campus matches “zzqx”/.test(await at(p, '[data-testid=here-none]').innerText().catch(() => '')));
  await p.fill('[data-testid=here-find]', REF); await p.waitForTimeout(150); await p.click('[data-testid=here-found] a'); await p.waitForSelector('[data-testid=here-look]');
  const look = await p.evaluate(() => ({ h1: document.querySelector('main h1').textContent, plain: document.querySelector('[data-testid=here-plain]').textContent, devices: Number(document.querySelector('[data-testid=here-kinds]').dataset.devices), kinds: [...document.querySelectorAll('.hr-kind')].map((k) => [k.dataset.kind, Number(k.dataset.count)]), plan: document.querySelectorAll('[data-testid=room-plan] .rv__dev').length, rail: [...document.querySelectorAll('[data-testid=here-rail] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()), cur: document.querySelector('[data-testid=here-rail] [aria-current=step]')?.textContent }));
  ok('H-04', 'the label code opens the room: its name, and its equipment in a sentence a newcomer can use', /Atlas 4\.218 — Executive Boardroom/.test(look.h1) && /You can see a display, a camera, 2 ceiling microphones, 2 loudspeakers and a touch panel\./.test(look.plain), JSON.stringify(look.plain));
  ok('H-05', 'the equipment list is the picture: every kind counted, and the plan draws the same number of devices', look.devices === 11 && look.kinds.reduce((n, k) => n + k[1], 0) === 11 && look.plan === 11, JSON.stringify(look.kinds));
  ok('H-06', 'six titled steps for a technician (Arrive done; Look around current)', look.rail.length === 6 && /Arrive/.test(look.rail[0]) && /Look around/.test(look.cur) && ['History', 'What’s wrong', 'Try this', 'Write it down'].every((x) => look.rail.some((r) => r.includes(x))), JSON.stringify(look.rail));
  await p.click('.hr-kind[data-kind=micceil]'); await p.waitForTimeout(150);
  const ring = await p.evaluate(() => ({ n: document.querySelectorAll('[data-testid=room-plan] [data-marked]').length, cap: document.querySelector('[data-testid=here-caption]').textContent, units: [...document.querySelectorAll('[data-testid=here-units] li')].map((l) => l.textContent), label: document.querySelector('[data-testid=room-plan] [data-marked]')?.getAttribute('aria-label') }));
  ok('H-07', 'pressing a kind rings it in the picture, says so under it, and names the ring to a screen reader', ring.n === 2 && /Ringed: 2 positions of ceiling microphones/.test(ring.cap) && /the kind you chose/.test(ring.label || ''), JSON.stringify(ring));
  ok('H-08', 'a technician also gets each unit with its position, its asset and its identity state', ring.units.length === 2 && /A-0104 · AS-0103 · unknown/.test(ring.units[0]), JSON.stringify(ring.units));
  await p.click('[data-testid=dev-A-0106]'); await p.waitForTimeout(120);
  ok('H-09', 'pressing a device in the picture says what it is for, and for a technician where and which unit', /Camera 1 — Shows the room to the people on the call\..*Position A-0106 · asset AS-0112/.test((await at(p, '[data-testid=here-device]').innerText()).replace(/\s+/g, ' ')), await at(p, '[data-testid=here-device]').innerText().catch(() => ''));
  await p.click('text=3D'); await p.waitForTimeout(150);
  ok('H-10', 'the same room in 3D, with the same ring; Lite is one press away', await p.locator('[data-testid=room-3d] .is-marked').count() === 2 && /#\/campus\/ATL\/4\/R-ATL-4-218\?view=3d/.test(await attr(p, '[data-testid=here-lite]', 'href') || ''));
  await p.click('text=Plan');
  const label = await p.evaluate(() => { document.querySelector('[data-testid=here-label] summary').click(); return { text: document.querySelector('[data-testid=here-label-text]').textContent, qr: !!document.querySelector('.hr-qr path') }; });
  ok('H-11', 'the door label is a real code that holds only this page’s address for this room', label.qr && new RegExp(`^http://127\\.0\\.0\\.1:\\d+/#/here/${REF}$`).test(label.text), label.text);

  await next(p);
  const hist = await p.evaluate(() => ({ step: document.querySelector('[data-testid=here-page]').dataset.step, focus: document.activeElement?.textContent, sum: [...document.querySelectorAll('[data-testid=here-summary] li')].map((l) => l.textContent), rows: [...document.querySelectorAll('.hr-hist li')].map((l) => ({ id: l.dataset.id, kind: l.dataset.kind, live: l.dataset.live != null, text: l.textContent.replace(/\s+/g, ' ') })), search: document.querySelector('[data-testid=here-search]')?.getAttribute('href'), url: location.hash }));
  ok('H-12', 'Next moves to the history, moves focus to its heading, and keeps the step in the address', hist.step === 'history' && hist.focus === 'What has happened here' && hist.url === `#/here/${REF}?step=history`, JSON.stringify([hist.step, hist.focus, hist.url]));
  ok('H-13', 'the history is the room’s: the open sound job first, the closed echo job, the camera that was replaced', hist.rows[0].id === 'ISS-0417' && hist.rows[0].live && /came back after ISS-0380/.test(hist.rows[0].text) && hist.rows.some((r) => r.id === 'ISS-0380' && /Closed/.test(r.text)) && hist.rows.some((r) => r.kind === 'unit' && /Camera 1 unit replaced.*AS-0102 → AS-0112/.test(r.text)), JSON.stringify(hist.rows.map((r) => r.id)));
  ok('H-14', 'it is summed up in sentences, and Search Party opens on this room', hist.sum.some((s) => /^Sound: 2 on record, 1 still open/.test(s)) && hist.sum.some((s) => /One unit has been replaced/.test(s)) && hist.search === `#/search?focus=Room:${REF}`, JSON.stringify(hist.sum));

  await next(p); await p.click('[data-testid=here-step-try]'); await p.waitForTimeout(150);
  ok('H-15', 'asking for the steps before saying what is wrong stays on “What is wrong” and says why', await step(p) === 'wrong' && /Say what is wrong first/.test(await at(p, '[data-testid=here-said]').innerText()));
  await p.click('[data-testid=here-sym-room-cant-hear]'); await p.waitForTimeout(200);
  const wrong = await p.evaluate(() => ({ stages: [...document.querySelectorAll('.hr-chain li b')].map((b) => b.textContent), codes: [...document.querySelectorAll('.hr-chain li .ui-meta')].map((b) => b.textContent), ringed: document.querySelectorAll('[data-testid=room-plan] [data-marked]').length, links: document.querySelectorAll('[data-testid=room-plan] .rv__link.on').length, cap: document.querySelector('[data-testid=here-caption]').textContent, known: [...document.querySelectorAll('[data-testid=here-known] li')].map((l) => ({ id: l.dataset.id, same: l.dataset.same != null, text: l.textContent.replace(/\s+/g, ' ') })), url: location.hash }));
  ok('H-16', 'a symptom is turned into this room’s equipment, in signal order, ringed and joined as the record connects them', wrong.stages.join(' → ') === 'UC room compute → Audio processor (DSP) → Loudspeaker' && wrong.codes[2] === 'A-0108, A-0109' && wrong.ringed === 4 && wrong.links >= 2 && /the way the call’s sound travels to the room’s loudspeakers/.test(wrong.cap), JSON.stringify(wrong));
  ok('H-17', 'what is already reported in the room is shown before anything new is raised', wrong.known.length === 1 && wrong.known[0].id === 'ISS-0417' && wrong.known[0].same && /Far-end audio drops out during long calls.*since \d{4}-\d\d-\d\d/.test(wrong.known[0].text) && /s=room-cant-hear/.test(wrong.url), JSON.stringify(wrong.known));

  await next(p);
  const t1 = await p.evaluate(() => ({ n: Number(document.querySelector('[data-testid=here-try]').dataset.steps), h: document.activeElement?.textContent, do: document.querySelector('.hr-step__do').textContent, look: document.querySelector('.hr-step__look').textContent, ringed: document.querySelectorAll('[data-testid=room-plan] [data-marked]').length, tier: document.querySelector('[data-testid=here-current]').dataset.tier }));
  ok('H-18', 'guided help, one step at a time: what to do, what you should see, and the equipment it uses ringed', t1.n === 5 && /Try this: step 1 of 5/.test(t1.h) && /Raise the room volume on the touch panel/.test(t1.do) && /You should see:/.test(t1.look) && t1.ringed === 3 && t1.tier === 'person', JSON.stringify(t1));
  for (let i = 0; i < 4; i++) { await p.click('[data-testid=here-same]'); await p.waitForTimeout(120); }
  const t5 = await p.evaluate(() => ({ tier: document.querySelector('[data-testid=here-current]')?.dataset.tier, tag: document.querySelector('[data-testid=here-current] .ui-tag')?.textContent, caution: document.querySelector('[data-testid=here-current] .ui-notice')?.textContent, tried: document.querySelectorAll('[data-testid=here-tried] li').length }));
  ok('H-19', 'the technician’s own step comes last, is marked, and says what must not be done from the room', t5.tier === 'technician' && t5.tag === 'For a technician' && /Listen only/.test(t5.caution || '') && t5.tried === 4, JSON.stringify(t5));
  await p.reload(); await p.waitForSelector('[data-testid=here-try]');
  ok('H-20', 'a reload half-way loses nothing: the same step, with what was tried', await attr(p, '[data-testid=here-try]', 'data-at') === '4' && await p.locator('[data-testid=here-tried] li').count() === 4 && await attr(p, '[data-testid=here-page]', 'data-symptom') === 'room-cant-hear');
  await p.click('[data-testid=here-same]'); await p.waitForTimeout(200);
  const rec = await p.evaluate(() => ({ step: document.querySelector('[data-testid=here-page]').dataset.step, dl: document.querySelector('[data-testid=here-summary-rec]').innerText.replace(/\s+/g, ' '), same: document.querySelector('[data-testid=here-same-known]')?.textContent, primary: document.querySelector('[data-testid=here-add]')?.textContent }));
  ok('H-21', 'writing it down: the room, what is wrong, each step with its result, and what it points at', rec.step === 'record' && /Atlas 4\.218 — Executive Boardroom/.test(rec.dl) && /The room can’t hear the call/.test(rec.dl) && (rec.dl.match(/No change\./g) || []).length === 5 && /UC room compute 1 \(A-0102\) → Audio processor \(DSP\) 1 \(A-0103\) → Loudspeaker 1 \(A-0108\), Loudspeaker 2 \(A-0109\)/.test(rec.dl), rec.dl);
  ok('H-22', 'the job that already describes this is offered first; a new report is the second choice', /already with ServiceHands/.test(rec.same || '') && rec.primary === 'Add what I saw to ISS-0417', JSON.stringify(rec));
  const before = (await incidents(p)).length;
  await p.click('[data-testid=here-add]'); await p.waitForSelector('[data-testid=here-done]');
  const d1 = await p.evaluate(() => ({ o: document.querySelector('[data-testid=here-done]').dataset.outcome, inc: document.querySelector('[data-testid=here-done]').dataset.incident, focus: document.activeElement?.textContent, follow: document.querySelector('[data-testid=here-follow]')?.getAttribute('href'), mine: document.querySelector('[data-testid=here-mine] li')?.textContent }));
  ok('H-23', 'added to the existing job: no second job is raised, focus lands on the confirmation, and it is listed for this room', d1.o === 'joined' && d1.inc === 'ISS-0417' && d1.focus === 'Added to ISS-0417' && (await incidents(p)).length === before && /added to ISS-0417/.test(d1.mine || ''), JSON.stringify(d1));
  await p.click('[data-testid=here-follow]'); await p.waitForSelector('[data-testid=seen-again]', { timeout: 8000 }).catch(() => undefined);
  const seen = (await at(p, '[data-testid=seen-again]').innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok('H-24', 'ServiceHands shows it on the job: seen again, by whom, and the steps already tried', /Seen again in the room \(1\)/.test(seen) && /Service Engineer in the room/.test(seen) && /Raise the room volume on the touch panel to about the middle\. \(No change\)/.test(seen), seen);

  // a different problem: a new job, then found everywhere the room is read
  await p.goto(p.url().split('#')[0] + `#/here/${REF}?step=wrong&s=frozen`); await p.waitForSelector('[data-testid=here-wrong]'); await p.waitForTimeout(200);
  ok('H-25', 'a link can open a step with a symptom already chosen', await attr(p, '[data-testid=here-page]', 'data-symptom') === 'frozen' && await p.locator('[data-testid=here-sym-frozen] input').isChecked() && await p.locator('[data-testid=here-known]').count() === 0);
  await p.fill('[data-testid=here-note]', 'Dark since this morning'); await next(p);
  await p.click('[data-testid=here-same]'); await p.waitForTimeout(100); await p.click('[data-testid=here-skip]'); await p.waitForTimeout(100); await p.click('[data-testid=here-next]'); await p.waitForTimeout(200);
  await p.dblclick('[data-testid=here-send]'); await p.waitForSelector('[data-testid=here-done]');
  const d2 = await p.evaluate(() => ({ o: document.querySelector('[data-testid=here-done]').dataset.outcome, inc: document.querySelector('[data-testid=here-done]').dataset.incident, h: document.querySelector('[data-testid=here-done] h3').textContent }));
  const all = await incidents(p); const made = all.find((i) => i.id === d2.inc);
  ok('H-26', 'still wrong: sent to ServiceHands as one job (a double press sends one), raised by the technician’s own persona', d2.o === 'reported' && /^ISS-\d{4}$/.test(d2.inc) && all.length === before + 1 && made && made.room === REF && made.state === 'OPEN' && made.title === 'The touch panel does not respond' && made.by === 'service', JSON.stringify({ d2, n: all.length, before }));
  await p.click('[data-testid=here-follow]'); await p.waitForTimeout(700);
  const job = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
  ok('H-27', 'the job in ServiceHands carries who reported it, the note, the steps tried and what it points at', new RegExp(d2.inc).test(job + p.url()) && /Service Engineer in the room · Touch panel or room control/.test(job) && /Dark since this morning/.test(job) && /Touch and hold the middle of the touch panel for two seconds\. No change/.test(job) && /Points at: Touch panel 1 \(A-0105\)/.test(job), job.slice(0, 600));
  await p.goto(p.url().split('#')[0] + `#/room/${REF}`); await p.waitForSelector('main h1'); await p.waitForTimeout(500);
  ok('H-28', 'the room page shows the new job among its open issues, and offers “I am in this room”', new RegExp(d2.inc).test(await p.locator('main').innerText()) && await p.locator(`main a[href="#/here/${REF}"]`).count() >= 1);
  await p.goto(p.url().split('#')[0] + `#/here/${REF}?step=history`); await p.waitForSelector('[data-testid=here-history]'); await p.waitForTimeout(200);
  ok('H-29', 'and the room’s history here now starts with it', await attr(p, '.hr-hist li', 'data-id') === d2.inc && Number(await attr(p, '[data-testid=here-history]', 'data-open')) === 3);
  ok('H-30', 'no console error, no request off the page, in the whole walk', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ------------------------------------------------------------------ an employee: no history, no codes; fixes it; the second time is noticed
{ const t = await open(`#/here/${REF}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=here-look]');
  const e = await p.evaluate(() => ({ rail: [...document.querySelectorAll('[data-testid=here-rail] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()), links: [...document.querySelectorAll('.hr-links a')].map((a) => a.getAttribute('href')) }));
  await p.click('.hr-kind[data-kind=camera]'); await p.click('[data-testid=dev-A-0106]'); await p.waitForTimeout(120);
  const dev = await at(p, '[data-testid=here-device]').innerText();
  ok('H-31', 'an employee has five steps: no History step, no unit codes, no asset or position in what a device says (D44)', e.rail.length === 5 && !e.rail.some((r) => /History/.test(r)) && await p.locator('[data-testid=here-units]').count() === 0 && /Camera 1 — Shows the room/.test(dev) && !/A-0106|AS-0112|Position/.test(dev), JSON.stringify({ rail: e.rail, dev }));
  // H-32 changed (10 Nov, Room Control): the employee may operate a room (V2.5.3 control.use), so the room's panel is now among the links; the room record still is not
  ok('H-32', 'and is offered no link it could not open', !e.links.includes(`#/room/${REF}`) && e.links.every((h) => h.startsWith('#/search') || h === `#/control/${REF}`), JSON.stringify(e.links));
  await next(p); await p.click('[data-testid=here-sym-room-cant-hear]'); await p.waitForTimeout(150);
  const ew = await p.evaluate(() => ({ step: document.querySelector('[data-testid=here-page]').dataset.step, codes: [...document.querySelectorAll('.hr-chain li .ui-meta')].map((b) => b.textContent), known: document.querySelector('[data-testid=here-known]')?.textContent.replace(/\s+/g, ' ') || '' }));
  await p.click('[data-testid=here-sym-blank]'); await p.waitForTimeout(150);
  ok('H-33', 'what it points at is said in kinds, not codes; a job in progress is shown in words without its number; a design finding on the record is not offered as a report', ew.step === 'wrong' && ew.codes.every((c) => /^\d+ units?$/.test(c)) && /Far-end audio drops out during long calls/.test(ew.known) && !/FND-|ISS-/.test(ew.known) && await p.locator('[data-testid=here-known]').count() === 0, JSON.stringify(ew));
  await next(p);
  ok('H-34', 'the employee gets the steps anyone can do, and none marked for a technician', await attr(p, '[data-testid=here-try]', 'data-steps') === '3' && await attr(p, '[data-testid=here-current]', 'data-tier') === 'person');
  await p.click('[data-testid=here-same]'); await p.waitForTimeout(100); await p.click('[data-testid=here-fixed]'); await p.waitForTimeout(200);
  const n0 = (await incidents(p)).length;
  await p.click('[data-testid=here-save]'); await p.waitForSelector('[data-testid=here-done]');
  const f = await p.evaluate(() => ({ o: document.querySelector('[data-testid=here-done]').dataset.outcome, text: document.querySelector('[data-testid=here-done]').textContent, follow: !!document.querySelector('[data-testid=here-follow]') }));
  ok('H-35', 'fixed in the room: saved to the room’s history with the step that worked; nothing is sent to anyone', f.o === 'fixed' && /Saved to the room’s history/.test(f.text) && /small light on the edge/.test(f.text) && !f.follow && (await incidents(p)).length === n0, f.text.slice(0, 200));
  await p.click('[data-testid=here-again]'); await p.waitForTimeout(150); await next(p); await p.click('[data-testid=here-sym-laptop]'); await next(p); await p.click('[data-testid=here-fixed]'); await p.waitForTimeout(200);
  const again = (await p.locator('[data-testid=here-record] .ui-notice').innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok('H-36', 'the second screen problem fixed in the room this month is noticed, and reporting it is offered', /second time in thirty days that a screen problem was fixed in this room/.test(again) && await p.locator('[data-testid=here-save-report]').count() === 1, again);
  await p.click('[data-testid=here-save-report]'); await p.waitForSelector('[data-testid=here-done]');
  const madeId = await attr(p, '[data-testid=here-done]', 'data-incident'); const made = (await incidents(p)).find((i) => i.id === madeId);
  ok('H-37', 'reported by an employee: raised as a requestor (asking grants nothing else); no ServiceHands link the employee could not open', made && made.by === 'requestor' && made.title === 'A laptop does not show on the room screen' && await p.locator('[data-testid=here-follow]').count() === 0, JSON.stringify(made));
  ok('H-38', 'no console error', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

// ------------------------------------------------------------------ a visitor may be helped but does not report (V2.5.3: issue.report)
{ const t = await open(`#/here/${REF}?step=wrong&s=no-camera`, { role: 'visitor' }); const p = t.page; await p.waitForSelector('[data-testid=here-wrong]');
  const n0 = (await incidents(p)).length; const known = await p.locator('[data-testid=here-known]').count();
  await next(p); for (let i = 0; i < 4; i++) { await p.click('[data-testid=here-same]'); await p.waitForTimeout(100); }
  const v = await p.evaluate(() => ({ step: document.querySelector('[data-testid=here-page]').dataset.step, told: document.querySelector('[data-testid=here-told]')?.textContent || '', send: document.querySelectorAll('[data-testid=here-send], [data-testid=here-add]').length }));
  ok('H-39', 'a visitor is walked through the steps, is told who can report it, and has no control that reports', known === 0 && v.step === 'record' && /Tell your host or the front desk/.test(v.told) && v.send === 0 && (await incidents(p)).length === n0, JSON.stringify(v)); await t.close(); }

// ------------------------------------------------------------------ refusals and edges
{ const t = await open(`#/here/${REF}`, { role: 'qa' }); const p = t.page;
  ok('H-40', 'the Document Reviewer is not admitted (V2.5.3 gives it no Lite): the access page, not the room', await p.locator('[data-testid=access-page]').count() === 1 && await p.locator('[data-testid=here-page]').count() === 0); await t.close(); }
{ const t = await open('#/here/R-NOPE-9-999', { role: 'service' }); const p = t.page;
  ok('H-41', 'a label that is not a room says so, guesses nothing, and offers the way to choose', await step(p) === 'unknown' && /not a room on this campus/.test(await p.locator('main h1').innerText()) && await p.locator('main a[href="#/here"]').count() === 1);
  await p.goto(p.url().split('#')[0] + '#/here/R-MER-1-130'); await p.waitForSelector('[data-testid=here-look]'); await p.waitForTimeout(200);
  const pl = await p.evaluate(() => ({ rail: [...document.querySelectorAll('[data-testid=here-rail] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()), note: document.querySelector('[data-testid=here-look] .ui-notice')?.textContent || '' }));
  ok('H-42', 'a room that is not built yet says there is nothing to walk into, and offers no step that needs a room', /planned, not built yet\. There is nothing to walk into/.test(pl.note) && !pl.rail.some((r) => /wrong|Try this|Write it down/.test(r)), JSON.stringify(pl));
  await p.goto(p.url().split('#')[0] + '#/here/R-ATL-4-220?step=wrong&s=frozen'); await p.waitForSelector('[data-testid=here-wrong]'); await p.waitForTimeout(200);
  const none = await p.evaluate(() => ({ stages: Number(document.querySelector('[data-testid=here-points]').dataset.stages), text: document.querySelector('[data-testid=here-points]').textContent }));
  await next(p);
  const steps = await p.$$eval('.hr-step__do', (e) => e.map((x) => x.textContent));
  ok('H-43', 'a room without a touch panel is not given touch-panel steps, and says the symptom has nowhere to come from there', none.stages === 0 && /none of the equipment this usually comes from/.test(none.text) && !steps.some((s) => /touch panel/.test(s)), JSON.stringify({ none, steps }));
  ok('H-44', 'no console error on the edges', !t.errs.length, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ ways in: the start page, the room, a scanned label, Lite, the search bar
{ const t = await open('#/home', { role: 'service' }); const p = t.page; await p.waitForTimeout(400);
  ok('H-45', 'the Service Engineer’s start page has “In a room”', await p.locator('main a[href="#/here"]').count() >= 1);
  await p.goto(p.url().split('#')[0] + `#/scan/${REF}`); await p.waitForSelector('[data-testid=scan-record]', { timeout: 8000 }).catch(() => undefined);
  ok('H-46', 'reading a room’s label in the QR Hub offers “I am in this room”', await attr(p, '[data-testid=scan-here]', 'href') === `#/here/${REF}`);
  await p.goto(p.url().split('#')[0] + `#/lite/room/${REF}`); await p.waitForSelector('[data-testid=lite-here]', { timeout: 8000 }).catch(() => undefined);
  ok('H-47', 'the room in Lite links here', await attr(p, '[data-testid=lite-here]', 'href') === `#/here/${REF}`);
  await p.keyboard.press('Control+k'); await p.keyboard.type('in this room'); await p.waitForTimeout(700);
  const first = await p.$eval('#find-list [role=option] b', (b) => b.textContent).catch(() => '');
  ok('H-48', 'the Search Party bar finds the page by what a person would type', first === 'In this room', first);
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok('H-49', 'and opens it', /#\/here$/.test(p.url()) && await step(p) === 'arrive', p.url()); await t.close(); }

// ------------------------------------------------------------------ Tour E walks it, and the visitor acts inside the tour (the final directive, §12: a tour demonstrates real controls)
{ const t = await open('#/tours/e?stop=9', { role: 'service' }); const p = t.page; await p.waitForSelector('[data-testid=here-record]', { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(300);
  const head = await p.locator('[data-testid=guided] .tour__k').innerText().catch(() => '');
  await p.click('[data-testid=here-add]'); await p.waitForSelector('[data-testid=here-done]');
  const joined = await attr(p, '[data-testid=here-done]', 'data-outcome');
  await p.click('[data-testid=guided] button:has-text("Next")'); await p.waitForSelector('[data-testid=seen-again]', { timeout: 8000 }).catch(() => undefined);
  const seen = (await at(p, '[data-testid=seen-again]').innerText().catch(() => '')).replace(/\s+/g, ' ');
  ok('H-53', 'inside Tour E the visitor presses the real control at “Write it down”, and the next stop shows what they wrote on the job in ServiceHands', /stop 9 of 12/.test(head) && joined === 'joined' && /Seen again in the room \(1\)/.test(seen) && /Service Engineer in the room/.test(seen), JSON.stringify({ head, joined, seen: seen.slice(0, 120) }));
  ok('H-54', 'no console error in the tour', !t.errs.filter((e) => !/narration|ERR_FAILED|net::/.test(e)).length, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ a phone, in the room: both themes, 44 px controls, nothing sideways
for (const w of [390, 320]) { const t = await open(`#/here/${REF}`, { role: 'employee', w, h: 780 }); const p = t.page; await p.waitForSelector('[data-testid=here-look]');
  const order = await p.evaluate(() => { const s = document.querySelector('.hr-side').getBoundingClientRect(), m = document.querySelector('.hr-main').getBoundingClientRect(), r = document.querySelector('[data-testid=here-rail]'); return { pictureFirst: s.top < m.top, over: document.documentElement.scrollWidth - innerWidth, stageH: Math.round(document.querySelector('[data-testid=here-stage] svg').getBoundingClientRect().height), railRows: Math.round(r.getBoundingClientRect().height), main: Math.round(m.top + scrollY) }; });
  ok(`H-${w}-50`, `${w} px: the picture comes before the words, small enough that the step starts within two screens; the step rail is one row; nothing scrolls sideways`, order.pictureFirst && order.over <= 0 && order.stageH <= 232 && order.railRows <= 56 && order.main < 2 * 780, JSON.stringify(order));
  await next(p); await p.click('[data-testid=here-sym-blank]'); await next(p);
  const ph = await p.evaluate(() => { const h = document.querySelector('.hr-main .build__h').getBoundingClientRect(); const small = [...document.querySelectorAll('.hr-main button, .hr-main a.ui-btn, [data-testid=here-rail] button, .hr-side .stage__bar button')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => `${b.textContent.trim().slice(0, 20)}:${Math.round(b.getBoundingClientRect().height)}`); return { top: Math.round(h.top), vh: innerHeight, small, over: document.documentElement.scrollWidth - innerWidth, cur: document.querySelector('[data-testid=here-rail] [aria-current=step]').getBoundingClientRect().right <= innerWidth + 1 }; });
  ok(`H-${w}-51`, `${w} px: after Next the step’s heading is on screen below the header, the current step is in view in the rail, every control is at least 44 px`, ph.top > 60 && ph.top < ph.vh * 0.6 && ph.cur && !ph.small.length && ph.over <= 0, JSON.stringify(ph));
  ok(`H-${w}-52`, `${w} px: no console error`, !t.errs.length, t.errs.join(' | ')); await t.close(); }

await done();
