#!/usr/bin/env node
// Connect in a real browser (founder, 11 Nov 2026): find a person in Search Party, open their profile, copy their address, see that
// the Teams link is the documented format (the link is never followed: nothing may leave the page's origin), schedule a meeting,
// review it, have somebody else take the time in between, be refused and told why, pick another time, confirm with a double press
// (one meeting), reload (it is still there), resubmit (still one), see the room's booking where the rest of the product reads it,
// cancel. Then who may: a visitor sees no name, address or number; an employee reaches the site champion and nobody else.
// Then the hooks into Search Party, Ask Empathia, ServiceHands, In this room, Lite and the room page; phones; the keyboard.
// After the merge with v18/continuation (11 Nov): a review that another tab overtakes is withdrawn without a press; the Site
// Champion role sees and reaches the people of its own site; the links the site page, the room guide, Lite and In this room carry
// (`#/people?site=`, `#/people?room=`) land on this directory.
//   node tests/browser/demo-connect.test.mjs      (build first: node scripts/build.mjs --public)
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done, base } = await harness('demo-connect');
const REF = 'R-ATL-4-218'; const CHAMP = 'p-champ-ATL';
// the browser's clock is moved to Wednesday 11 November 2026, 09:00 in Chicago (15:00 UTC), so the same people are working, the same
// times are proposed and the same clocks are shown on every run; it keeps running from there
const NOW = Date.UTC(2026, 10, 11, 15, 0);
const CLOCK = `(() => { const D0 = Date; const off = ${NOW} - D0.now(); class F extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + off); } static now() { return D0.now() + off; } } globalThis.Date = F; })();`;
/** a link to another app is pressed, and its handler runs, but the browser is kept from following it */
const HOLD = `document.addEventListener('click', (e) => { const a = e.target && e.target.closest && e.target.closest('a[data-jump]'); if (a) { e.preventDefault(); window.__held = (window.__held || []).concat(a.getAttribute('href')); } }, true);`;
const all = []; const start = async (hash, o = {}) => { const t = await open(hash, { init: CLOCK + HOLD + (o.extra || ''), ...o }); all.push(t); return t; };
const at = (p, sel) => p.locator(sel); const attr = (p, sel, a) => p.locator(sel).first().getAttribute(a).catch(() => null); const txt = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
const wait = (p, ms = 220) => p.waitForTimeout(ms);
const state = (p) => p.evaluate(() => { const c = JSON.parse(localStorage.getItem('empathia.demo.connect.v1') || '{"meetings":[]}'); const w = JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || 'null'); return { meetings: c.meetings.map((m) => ({ id: m.id, state: m.state, from: m.from, to: m.to, room: m.room && m.room.id, who: m.parties.map((x) => x.id) })), confirmed: c.confirmed || {}, notes: c.notes || {}, booked: w ? Object.entries(w.bookings).flatMap(([r, l]) => l.filter((b) => /^MTG-/.test(b.title)).map((b) => r + ':' + b.title.slice(0, 8))) : [], events: w ? w.events.slice(0, 6).map((e) => ({ type: e.type, outcome: e.outcome, aggregate: e.aggregate, detail: e.detail })) : [] }; });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const refused = (p) => p.evaluate(() => !!document.querySelector('[data-testid=access-page]'));

// ------------------------------------------------------------------ search a person → profile → copy → the Teams link → schedule → … → cancel
{ const t = await start('#/search?q=amara', { role: 'service' }); const p = t.page; await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  const hit = await p.evaluate(() => [...document.querySelectorAll('[data-testid=sp-people-hits] a[data-person]')].map((a) => [a.dataset.person, a.textContent]));
  ok('CB-01', 'Search Party finds a person by name, beside its records', hit.length >= 1 && hit[0][0] === CHAMP && /Amara Dlomo.*Site Champion, Atlas HQ/.test(hit[0][1]), JSON.stringify(hit));
  await p.click(`[data-testid=sp-people-hits] a[data-person=${CHAMP}]`); await p.waitForSelector('[data-testid=person-page]'); await wait(p);
  const prof = await p.evaluate(() => ({ h1: document.querySelector('main h1').textContent, kind: document.querySelector('[data-testid=person-page]').dataset.kind, hash: location.hash, rooms: Number(document.querySelector('[data-testid=champion-knows]').dataset.rooms), no: document.querySelectorAll('[data-testid=champion-maynot] li').length, esc: [...document.querySelectorAll('[data-testid=champion-escalation] li')].map((l) => l.dataset.role), facts: document.querySelector('[data-testid=person-facts]').innerText, tag: document.querySelector('.kit-hero').innerText, focus: document.activeElement && document.activeElement.textContent }));
  ok('CB-02', 'the profile opens at its own address, names the person and says they are synthetic; focus is on the name', prof.hash === `#/people/${CHAMP}` && /Amara Dlomo/.test(prof.h1) && /SYNTHETIC PERSON/i.test(prof.tag) && prof.focus === 'Amara Dlomo', JSON.stringify(prof.tag));
  ok('CB-03', 'a site champion’s profile: the rooms they know (all 43 of Atlas HQ: 20 before V2.5.3’s rooms were added on 13 Nov 2026), what the title does not grant (11 things), and who they escalate to in order', prof.kind === 'champion' && prof.rooms === 43 && prof.no === 11 && prof.esc.join() === 'service,svcmgr,syseng', JSON.stringify(prof));
  ok('CB-04', 'time zone, working hours, languages and how current the entry is are on the page', /America\/Chicago/.test(prof.facts) && /07:30–16:00, Mon–Fri/.test(prof.facts) && /English/.test(prof.facts) && /Nobody has confirmed this entry|Last confirmed \d{4}-\d{2}-\d{2}/.test(prof.facts), prof.facts);
  const acts = await p.evaluate(() => [...document.querySelectorAll('[data-testid=contact-bar] .cx-act')].map((a) => ({ id: a.dataset.testid, tag: a.tagName, href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), label: a.querySelector('b').textContent, what: a.querySelector('span > span').textContent, h: Math.round(a.getBoundingClientRect().height) })));
  const by = (id) => acts.find((a) => a.id === `cx-${id}`) || {};
  ok('CB-05', 'ten actions, each saying what will happen before it is pressed', acts.length === 10 && acts.every((a) => a.what.length > 20) && /You write and send it there/.test(by('teams.chat').what) && /Nothing is booked until you review and confirm/.test(by('schedule').what), JSON.stringify(acts.map((a) => a.label)));
  ok('CB-06', 'Message in Teams is the documented chat link for this person, opened in a new tab with no opener', by('teams.chat').href?.startsWith('https://teams.microsoft.com/l/chat/0/0?users=amara.dlomo%40empathia.example&message=Hello%20Amara%2C') && by('teams.chat').target === '_blank' && by('teams.chat').rel === 'noopener noreferrer' && !/[ +<>{}]/.test(by('teams.chat').href), by('teams.chat').href);
  ok('CB-07', 'Send email is a mailto link with the subject and body encoded; Call is a tel link in international form; Call in Teams is the documented call link', /^mailto:amara\.dlomo@empathia\.example\?subject=A%20question%20for%20the%20site%20champion&body=Hello%20Amara%2C%0D%0A/.test(by('mail.compose').href || '') && by('phone.call').href === 'tel:+1-312-555-0100' && by('teams.call').href === 'https://teams.microsoft.com/l/call/0/0?users=amara.dlomo%40empathia.example', JSON.stringify([by('mail.compose').href, by('phone.call').href, by('teams.call').href]));
  ok('CB-08', 'the bar says once that everyone is synthetic and the app will not find them', /These addresses and numbers are fictional, so the app will not find them\. With a connected directory the same buttons carry real addresses/.test(await txt(p, '[data-testid=cx-synthetic]')) && await at(p, '[data-testid=cx-synthetic]').count() === 1);
  ok('CB-09', 'every action is at least 44 px tall', acts.every((a) => a.h >= 44), JSON.stringify(acts.map((a) => a.h)));

  await p.click('[data-testid=cx-copy-email]'); await wait(p);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  ok('CB-10', 'Copy email puts the address on the clipboard and says so', clip === 'amara.dlomo@empathia.example' && /Copied Amara’s email address: amara\.dlomo@empathia\.example\./.test(await txt(p, '[data-testid=cx-said]')), `${clip} | ${await txt(p, '[data-testid=cx-said]')}`);
  await p.click('[data-testid=cx-copy-card]'); await wait(p); const card = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('CB-11', 'Copy contact card copies name, role, address, number, hours — and that the person is synthetic', /^Amara Dlomo\nSite Champion, Atlas HQ\namara\.dlomo@empathia\.example\n\+1-312-555-0100\nChicago time · 07:30–16:00\nSynthetic person/.test(card), card);

  const pagesBefore = t.ctx.pages().length; await p.click('[data-testid="cx-teams.chat"]'); await wait(p);
  const jump = await p.evaluate(() => ({ said: document.querySelector('[data-testid=cx-said]').textContent, held: window.__held, here: location.hash })); const s1 = await state(p);
  ok('CB-12', 'pressing it says "Opened Teams" and that the message is written and sent there; it never says anything was sent', jump.said === 'Opened Teams. You write and send the message there. This page only opened it.' && !/\b(message|invitation) (was |is )?sent\b/i.test(jump.said) && jump.here === `#/people/${CHAMP}`, jump.said);
  ok('CB-13', 'the ledger line is contact.opened, with the app and the person; nothing claims delivery', s1.events[0].type === 'contact.opened' && s1.events[0].outcome === 'ALLOWED' && s1.events[0].aggregate === `person:${CHAMP}` && /^Teams · Message in Teams · Amara Dlomo .* opened only/.test(s1.events[0].detail), JSON.stringify(s1.events[0]));
  ok('CB-14', 'the link was not followed here: one page, nothing requested off this origin', t.ctx.pages().length === pagesBefore && t.off.length === 0 && jump.held.length === 1, JSON.stringify(t.off));
  await p.evaluate(() => { location.hash = '#/people'; }); await p.waitForSelector('[data-testid=people-page]'); await wait(p);
  const back = await p.evaluate(() => { const b = document.querySelector('[data-testid=connect-return]'); return b ? { text: b.textContent, href: b.querySelector('a').getAttribute('href') } : null; });
  ok('CB-15', 'somewhere else afterwards, "Back to where I was" is offered and leads back', !!back && /You opened Teams from another page/.test(back.text) && back.href === `#/people/${CHAMP}`, JSON.stringify(back));
  await p.click('[data-testid=connect-return] a'); await p.waitForSelector('[data-testid=person-page]'); await wait(p);
  ok('CB-16', 'and once back, it is no longer offered', await at(p, '[data-testid=connect-return]').count() === 0 && (await p.evaluate(() => location.hash)) === `#/people/${CHAMP}`);

  // keyboard: an action that opens a panel keeps the focus where it was
  await p.focus('[data-testid=cx-availability]'); await p.keyboard.press('Enter'); await wait(p);
  const av = await p.evaluate(() => ({ text: document.querySelector('[data-testid=cx-avail-panel]')?.innerText || '', focus: document.activeElement?.dataset.testid, pressed: document.querySelector('[data-testid=cx-availability]').getAttribute('aria-pressed') }));
  ok('CB-17', 'See availability, by keyboard: working hours and busy times in the person’s own zone, marked simulated; focus stays on the button', /Amara works 07:30–16:00, Chicago time/.test(av.text) && /Simulated calendar/.test(av.text) && /Public holidays and leave are not modelled/.test(av.text) && av.focus === 'cx-availability' && av.pressed === 'true', JSON.stringify(av));
  await p.click('[data-testid=cx-backup]'); await wait(p);
  ok('CB-18', 'Find a backup contact names the backup champion and why', /Bao Kahale[\s\S]*Stands in for Amara at Atlas HQ/.test(await txt(p, '[data-testid=cx-backup-panel]')) && await attr(p, '[data-testid=cx-backup-panel]', 'data-person') === 'p-backup-ATL', await txt(p, '[data-testid=cx-backup-panel]'));

  // ---- schedule
  await p.click('[data-testid=cx-schedule]'); await p.waitForSelector('[data-testid=meet-who]'); await wait(p);
  const who = await p.evaluate(() => ({ step: document.querySelector('[data-testid=meet-page]').dataset.step, chosen: [...document.querySelectorAll('[data-testid=meet-chosen] li')].map((l) => l.dataset.person), hero: document.querySelector('.kit-hero').innerText, hash: location.hash }));
  ok('CB-19', 'Schedule a meeting opens the assistant with the person chosen, the organiser shown, and "simulated calendar" said at the top', who.step === 'who' && who.chosen.join() === `p-tech-ana,${CHAMP}` && /SIMULATED CALENDAR/i.test(who.hero) && /Nothing is recorded until you review it and confirm/.test(who.hero) && /with=p-champ-ATL/.test(who.hash), JSON.stringify(who));
  await p.fill('[data-testid=meet-roomfind]', '4.218'); await wait(p); await p.click(`.cx-pick[data-room=${REF}]`); await wait(p);
  ok('CB-20', 'a room is added by its number', await attr(p, '[data-testid=meet-room]', 'data-room') === REF);
  await p.click('[data-testid=meet-next]'); await p.waitForSelector('[data-testid=meet-slots]'); await wait(p);
  const slots = await p.evaluate(() => [...document.querySelectorAll('[data-testid=meet-slot]')].map((b) => ({ from: Number(b.dataset.from), head: b.querySelector('b').textContent, why: b.querySelector('.cx-slot__why').textContent, local: b.querySelector('.cx-slot__local').textContent })));
  ok('CB-21', 'ranked times, each with its reason and the other person’s own clock; nothing is recorded by looking', slots.length >= 3 && slots.every((s) => /inside everyone’s working hours; on Ana Reyes’s early shift; Atlas 4\.218 free; 30 minutes\./.test(s.why) && /Amara Dlomo: .* · Chicago \(UTC−6\)/.test(s.local)) && (await state(p)).meetings.length === 0, JSON.stringify(slots[0]));
  ok('CB-22', 'every time offered is on a working day, inside the early shift (06:00–14:00) and the champion’s hours (07:30–16:00), Chicago time', slots.every((s) => { const d = new Date(s.from - 6 * 3600000); const m = d.getUTCHours() * 60 + d.getUTCMinutes(); return d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && m >= 450 && m + 30 <= 840 && s.from > NOW; }), JSON.stringify(slots.map((s) => s.head)));
  ok('CB-23', 'Review is not offered until a time is chosen', await at(p, '[data-testid=meet-review]').isDisabled());
  await at(p, '[data-testid=meet-slot]').first().click(); await wait(p); await p.click('[data-testid=meet-review]'); await p.waitForSelector('[data-testid=meet-review-step]'); await wait(p);
  const rev = await p.evaluate(() => ({ zones: [...document.querySelectorAll('[data-testid=meet-zones] li')].map((l) => l.textContent), sum: document.querySelector('[data-testid=meet-summary]').innerText, invite: document.querySelector('[data-testid=meet-invite]').textContent, hash: location.hash, focus: document.activeElement?.textContent, note: document.querySelector('[data-testid=meet-review-step] .ui-notice').textContent }));
  ok('CB-24', 'review: who, when for each person, where, and what the invitation would say; the step and the time are in the address', rev.zones.length === 2 && /for you · Chicago/.test(rev.zones[0]) && /for Amara Dlomo · Chicago/.test(rev.zones[1]) && /Atlas 4\.218/.test(rev.sum) && /^Meeting with Amara Dlomo\n/.test(rev.invite) && /Where: Atlas 4\.218/.test(rev.invite) && /this demonstration sends nothing/.test(rev.invite) && new RegExp(`step=review&slot=${slots[0].from}`).test(rev.hash) && rev.focus === 'Review before anything is recorded', JSON.stringify(rev.zones));
  ok('CB-25', 'the page says nothing is recorded yet and that no invitation is sent', /Nothing is recorded yet\..*No invitation is sent to anyone\./.test(rev.note) && (await state(p)).meetings.length === 0, rev.note);

  // ---- in between, somebody else books the room for that time (as from another tab: written straight to storage)
  await p.evaluate((s) => { const k = 'empathia.demo.workspace.v1'; const w = JSON.parse(localStorage.getItem(k)); const iso = (ms) => new Date(ms).toISOString().slice(0, 16); (w.bookings['R-ATL-4-218'] = w.bookings['R-ATL-4-218'] || []).push({ from: iso(s.from), to: iso(s.from + 60 * 60000), title: 'Board review (moved)' }); localStorage.setItem(k, JSON.stringify(w)); }, slots[0]);
  await p.click('[data-testid=meet-confirm]'); await wait(p);
  const conflict = await txt(p, '[data-testid=meet-conflict]'); const s2 = await state(p);
  ok('CB-26', 'confirming re-reads the calendar: the meeting is refused, and the page says what is in the way', /Not recorded\. Something changed since this time was proposed/.test(conflict) && /Atlas 4\.218 is booked .*Board review \(moved\)/.test(conflict) && s2.meetings.length === 0 && s2.booked.length === 0, conflict);
  ok('CB-27', 'the refusal is in the ledger; nothing was booked', s2.events[0].type === 'meeting.refused' && s2.events[0].outcome === 'DENIED' && /Atlas 4\.218 is booked/.test(s2.events[0].detail), JSON.stringify(s2.events[0]));
  await p.click('[data-testid=meet-repropose]'); await p.waitForSelector('[data-testid=meet-slots]'); await wait(p);
  const slots2 = await p.evaluate(() => [...document.querySelectorAll('[data-testid=meet-slot]')].map((b) => Number(b.dataset.from)));
  ok('CB-28', 'the times offered now leave out the hour that was taken', slots2.length >= 1 && slots2.every((f) => f + 30 * 60000 <= slots[0].from || f >= slots[0].from + 60 * 60000), JSON.stringify(slots2.map((f) => new Date(f).toISOString())));
  await at(p, '[data-testid=meet-slot]').first().click(); await wait(p); await p.click('[data-testid=meet-review]'); await p.waitForSelector('[data-testid=meet-confirm]'); await wait(p);
  // ---- a reload half-way loses nothing: the review step and the chosen time come back from the address
  await p.reload(); await p.waitForSelector('[data-testid=meet-review-step]'); await wait(p, 400);
  ok('CB-29', 'a reload at the review step comes back to the same review of the same time', await attr(p, '[data-testid=meet-page]', 'data-step') === 'review' && Number(await attr(p, '[data-testid=meet-page]', 'data-slot')) === slots2[0] && await at(p, '[data-testid=meet-confirm]').count() === 1 && (await state(p)).meetings.length === 0);
  // ---- a double press on Confirm is one meeting
  await p.evaluate(() => { const b = document.querySelector('[data-testid=meet-confirm]'); b.click(); b.click(); }); await p.waitForSelector('[data-testid=meet-done]'); await wait(p);
  const fin = await p.evaluate(() => ({ h: document.querySelector('[data-testid=meet-done] h2').textContent, st: document.querySelector('[data-testid=meet-statement]').textContent, all: document.querySelector('[data-testid=meet-done]').innerText, hash: location.hash, focus: document.activeElement?.textContent })); const s3 = await state(p);
  ok('CB-30', 'recorded once: one meeting, one room booking, one ledger line — after two presses', s3.meetings.length === 1 && s3.meetings[0].id === 'MTG-0001' && s3.meetings[0].from === slots2[0] && s3.booked.join() === `${REF}:MTG-0001` && s3.events.filter((e) => e.type === 'meeting.recorded').length === 1, JSON.stringify(s3.meetings));
  ok('CB-31', 'the result says exactly what happened: recorded in the simulated calendar, no invitation left this browser; never "sent"', /Recorded as MTG-0001/.test(fin.h) && fin.st === 'Recorded in this demonstration’s simulated calendar. No invitation left this browser.' && !/\b(invitations?|messages?|emails?) (was|were|has been|have been) sent\b|\binvited\b(?! until)/i.test(fin.all.replace(/Nobody is invited until/g, '')) && /step=done&id=MTG-0001/.test(fin.hash) && fin.focus === fin.h, fin.all.slice(0, 300));
  const teams = await attr(p, '[data-testid=meet-teams]', 'href');
  ok('CB-32', 'to invite people for real the person does it themselves: the documented Teams scheduling link, with the time and its UTC offset, never followed here', (teams || '').startsWith('https://teams.microsoft.com/l/meeting/new?subject=Meeting%20with%20Amara%20Dlomo&startTime=') && /startTime=2026-11-1\dT\d\d%3A\d\d%3A00-06%3A00&endTime=2026-11-1\dT\d\d%3A\d\d%3A00-06%3A00/.test(teams) && /attendees=amara\.dlomo%40empathia\.example$/.test(teams) && !/[ +]/.test(teams) && /Nobody is invited until you press Send there/.test(fin.all), teams);
  await p.click('[data-testid=meet-teams]'); await wait(p);
  ok('CB-33', 'pressing it is logged as opening Teams, and nothing left this origin', (await state(p)).events[0].type === 'contact.opened' && /^Opened Teams\./.test(await txt(p, '[data-testid=meet-said]')) && t.off.length === 0 && t.ctx.pages().length === pagesBefore, await txt(p, '[data-testid=meet-said]'));
  // ---- reload: still there. Resubmit the same review from its address: still one meeting.
  await p.reload(); await p.waitForSelector('[data-testid=meet-done]'); await wait(p, 400);
  ok('CB-34', 'after a reload the meeting is still recorded and listed', /Recorded as MTG-0001/.test(await txt(p, '[data-testid=meet-done] h2')) && await attr(p, '[data-testid=meet-mine]', 'data-live') === '1' && (await state(p)).meetings.length === 1);
  // CHANGED after the merge (11 Nov): this used to press Confirm a second time and expect the store to answer "already recorded"
  // (that idempotency is still asserted, against the store, in tests/unit/demo-connect CX-14 and CX-16). The page is now stricter:
  // a review of a request that is already recorded does not offer Confirm at all; it says so and links to the meeting.
  await p.goto(`${base}#/meet?with=${CHAMP}&room=${REF}&step=review&slot=${slots2[0]}`); await p.reload(); await p.waitForSelector('[data-testid=meet-already]'); await wait(p, 400);
  const again = await p.evaluate(() => ({ text: document.querySelector('[data-testid=meet-already]').innerText, href: document.querySelector('[data-testid=meet-already] a').getAttribute('href'), confirm: document.querySelectorAll('[data-testid=meet-confirm]').length })); const s4 = await state(p);
  ok('CB-35', 'the same review opened again (a resubmission, or a second tab) is the same meeting: Confirm is not offered, the page says it is already recorded, and nothing is recorded twice', again.confirm === 0 && /already recorded as MTG-0001\.\s*Nothing will be recorded a second time/.test(again.text) && again.href === '#/meet?step=done&id=MTG-0001' && s4.meetings.length === 1 && s4.booked.length === 1 && s4.events.filter((e) => e.type === 'meeting.recorded').length <= 1, again.text.slice(0, 200));
  // ---- the rest of the product sees the room is taken
  await p.goto(`${base}#/pro/ops`); await p.waitForSelector('main h1'); await wait(p, 500);
  ok('CB-36', 'the Operations Hub lists the room’s booking from the shared workspace', /MTG-0001 · Meeting with Amara Dlomo/.test(await p.evaluate(() => document.querySelector('main').innerText)));
  await p.goto(`${base}#/lite/room/${REF}`); await p.waitForSelector('[data-testid=connect-who]'); await wait(p);
  ok('CB-37', 'and the room’s Lite page says the room is booked, in the simulated calendar', /This room is booked .*\(MTG-0001\).*simulated calendar/.test(await txt(p, '[data-testid=cx-booked]')), await txt(p, '[data-testid=cx-booked]'));
  // ---- cancel
  await p.goto(`${base}#/meet?step=done&id=MTG-0001`); await p.reload(); await p.waitForSelector('[data-testid=meet-cancel]'); await wait(p, 400);
  await p.fill('[data-testid=meet-cancel-reason]', 'The room is being refitted'); await p.click('[data-testid=meet-cancel]'); await wait(p);
  const s5 = await state(p); const can = await p.evaluate(() => ({ h: document.querySelector('[data-testid=meet-done] h2').textContent, st: document.querySelector('[data-testid=meet-statement]').textContent, btn: !!document.querySelector('[data-testid=meet-cancel]') }));
  ok('CB-38', 'cancelling: the meeting is kept as cancelled, the booking leaves the workspace, it is logged, and the page says nothing left this browser', s5.meetings.length === 1 && s5.meetings[0].state === 'CANCELLED' && s5.booked.length === 0 && s5.events[0].type === 'meeting.cancelled' && /The room is being refitted/.test(s5.events[0].detail) && /MTG-0001 is cancelled/.test(can.h) && /No cancellation left this browser/.test(can.st) && !can.btn, JSON.stringify(can));
  ok('CB-39', 'no console error in the whole journey', t.errs.length === 0, t.errs.join(' | '));
  await t.close(); }

// ------------------------------------------------------------------ no common time: said why, and what would work
{ const t = await start('#/meet?with=p-syseng-forum,p-backup-MBK&step=when', { role: 'service' }); const p = t.page; await p.waitForSelector('[data-testid=meet-when]'); await wait(p);
  const none = await p.evaluate(() => ({ h: document.querySelector('[data-testid=meet-when] h2').textContent, lines: [...document.querySelectorAll('[data-testid=meet-none] .cx-facts li')].map((l) => l.textContent), alts: [...document.querySelectorAll('[data-testid=meet-alternatives] .cx-pick')].map((b) => [b.dataset.kind, b.textContent]) }));
  ok('CB-40', 'three people whose days never meet (Chicago, London, Los Angeles): the page says there is no time, and why, with each person’s hours', /No time works for everyone/.test(none.h) && /No 30-minute time .* is inside everyone’s working hours/.test(none.lines[0] || '') && none.lines.length >= 4 && none.lines.some((l) => /London time/.test(l)) && none.lines.some((l) => /Los Angeles time/.test(l)), JSON.stringify(none.lines));
  ok('CB-41', 'only changes that really produce a time are offered: the backup’s counterpart, or making someone optional', none.alts.length >= 1 && none.alts.some(([k]) => k === 'backup' || k === 'optional') && none.alts.every(([, text]) => /\d+ times? would then work/.test(text)), JSON.stringify(none.alts));
  await at(p, '[data-testid=meet-alternatives] .cx-pick').first().click(); await p.waitForSelector('[data-testid=meet-slots]'); await wait(p);
  ok('CB-42', 'taking one shows times, and the address carries the change', await at(p, '[data-testid=meet-slot]').count() >= 1 && /opt=p-syseng-forum|with=p-syseng-forum,p-champ-MBK/.test(await p.evaluate(() => location.hash)), await p.evaluate(() => location.hash));
  ok('CB-43', 'the page says what it does not model, and that it is not connected', /Public holidays and leave are not modelled/.test(await txt(p, '[data-testid=meet-when]')) && /NOT CONNECTED\..*no Microsoft 365 tenant.*mock-tested.*never been validated against a real calendar/.test(await p.evaluate(() => document.querySelector('[data-testid=meet-truth]').textContent)));
  ok('CB-44', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ two tabs: a review that is overtaken is withdrawn without a press
{ const t = await start(`#/meet?with=${CHAMP}&room=${REF}&step=when`, { role: 'service' }); const p = t.page; await p.waitForSelector('[data-testid=meet-slots]'); await wait(p);
  await at(p, '[data-testid=meet-slot]').first().click(); await wait(p); await p.click('[data-testid=meet-review]'); await p.waitForSelector('[data-testid=meet-confirm]'); await wait(p);
  const slot = Number(await attr(p, '[data-testid=meet-page]', 'data-slot')); const review = await p.evaluate(() => location.href);
  const p2 = await t.ctx.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(String(e))); p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text()); });
  await p2.goto(`${base}#/lite/room/${REF}`); await p2.waitForSelector('main h1'); await wait(p2, 300);
  // the second tab takes the room for that time, the way any page of the product would: one write to the shared workspace
  await p2.evaluate((from) => { const k = 'empathia.demo.workspace.v1'; const w = JSON.parse(localStorage.getItem(k)); const iso = (ms) => new Date(ms).toISOString().slice(0, 16); (w.bookings['R-ATL-4-218'] = w.bookings['R-ATL-4-218'] || []).push({ from: iso(from), to: iso(from + 60 * 60000), title: 'Facilities walk-round' }); localStorage.setItem(k, JSON.stringify(w)); }, slot);
  await p.waitForSelector('[data-testid=meet-withdrawn]', { timeout: 8000 }).catch(() => undefined); await wait(p);
  const wd = await p.evaluate(() => ({ text: document.querySelector('[data-testid=meet-withdrawn]')?.innerText || '', confirm: document.querySelectorAll('[data-testid=meet-confirm]').length, step: document.querySelector('[data-testid=meet-page]').dataset.step }));
  ok('CB-97', 'another tab takes the room while the review is open: with no press here the review is withdrawn — Confirm is gone, and the page says what is in the way', wd.confirm === 0 && wd.step === 'review' && /no longer free, so it is not offered for confirmation/.test(wd.text) && /Atlas 4\.218 is booked .*Facilities walk-round/.test(wd.text) && (await state(p)).meetings.length === 0, JSON.stringify(wd));
  await p.click('[data-testid=meet-repropose]'); await p.waitForSelector('[data-testid=meet-slots]'); await wait(p);
  const next = await p.evaluate(() => [...document.querySelectorAll('[data-testid=meet-slot]')].map((b) => Number(b.dataset.from)));
  ok('CB-98', 'the times offered next leave that hour out', next.length >= 1 && next.every((f) => f + 30 * 60000 <= slot || f >= slot + 60 * 60000), JSON.stringify(next.map((f) => new Date(f).toISOString())));
  // the same review open in both tabs; confirmed in the second
  await at(p, '[data-testid=meet-slot]').first().click(); await wait(p); await p.click('[data-testid=meet-review]'); await p.waitForSelector('[data-testid=meet-confirm]'); await wait(p);
  await p2.goto(await p.evaluate(() => location.href)); await p2.reload(); await p2.waitForSelector('[data-testid=meet-confirm]'); await wait(p2, 300);
  await p2.click('[data-testid=meet-confirm]'); await p2.waitForSelector('[data-testid=meet-done]'); await wait(p2);
  await p.waitForSelector('[data-testid=meet-already]', { timeout: 8000 }).catch(() => undefined); await wait(p);
  const al = await p.evaluate(() => ({ text: document.querySelector('[data-testid=meet-already]')?.innerText || '', confirm: document.querySelectorAll('[data-testid=meet-confirm]').length })); const s = await state(p);
  ok('CB-99', 'the same review open in two tabs and confirmed in one: the other says it is already recorded and offers no second Confirm; there is one meeting and one booking', al.confirm === 0 && /already recorded as MTG-0001/.test(al.text) && s.meetings.length === 1 && s.booked.join() === `${REF}:MTG-0001` && s.events.filter((e) => e.type === 'meeting.recorded').length === 1, JSON.stringify({ al, n: s.meetings.length, booked: s.booked }));
  ok('CB-100', 'no console error in either tab', t.errs.length === 0 && errs2.length === 0 && review.includes('step=review'), [...t.errs, ...errs2].join(' | ')); await p2.close(); await t.close(); }

// ------------------------------------------------------------------ the Site Champion (the sixteenth role): the people of their own site, and nothing more
{ const t = await start('#/site', { role: 'sitechamp' }); const p = t.page; await p.waitForSelector('[data-testid=site-people]'); await wait(p);
  ok('CB-101', 'the champion’s site page links to the people of the site', await attr(p, '[data-testid=site-people]', 'href') === '#/people?site=ATL');
  await p.click('[data-testid=site-people]'); await p.waitForSelector('[data-testid=people-site]'); await wait(p);
  const sp = await p.evaluate(() => ({ site: document.querySelector('[data-testid=people-site]').dataset.site, text: document.querySelector('[data-testid=people-site]').textContent, all: Number(document.querySelector('[data-testid=people-page]').dataset.all), ids: [...document.querySelectorAll('[data-testid=people-list] a')].map((a) => a.dataset.person), where: [...document.querySelectorAll('[data-testid=people-list] .cx-card__m')].map((x) => x.textContent), group: !!document.querySelector('[data-testid=people-group]') }));
  ok('CB-102', 'it lists the ten people of Atlas HQ — the champion, the backup and the holder of each role who covers it — and nobody from another site', sp.site === 'ATL' && /The people of Atlas HQ/.test(sp.text) && sp.ids.length === 10 && sp.ids.includes('p-champ-ATL') && sp.ids.includes('p-backup-ATL') && sp.ids.includes('p-svcmgr-northstar') && sp.where.every((x) => /Atlas/.test(x)) && !sp.group, JSON.stringify(sp.ids));
  ok('CB-103', 'a champion’s whole directory is every site’s champion and backup, and the role holders of their own site only (34 people)', sp.all === 34);
  await p.goto(`${base}#/people/p-backup-ATL`); await p.reload(); await p.waitForSelector('[data-testid=person-page]'); await wait(p, 400);
  const own = await p.evaluate(() => ({ acts: [...document.querySelectorAll('[data-testid=contact-bar] .cx-act')].map((a) => a.dataset.testid), confirm: !!document.querySelector('[data-testid=person-confirm]'), note: !!document.querySelector('[data-testid=champion-note-form]') }));
  ok('CB-104', 'a champion reaches the backup of their own site (message, email, call, schedule) and keeps that entry: confirm it, add a local note', ['cx-teams.chat', 'cx-mail.compose', 'cx-phone.call', 'cx-schedule'].every((x) => own.acts.includes(x)) && own.confirm && own.note, JSON.stringify(own));
  await p.goto(`${base}#/people/p-tech-ana`); await p.reload(); await p.waitForSelector('[data-testid=person-page]'); await wait(p, 400);
  const tech = await p.evaluate(() => ({ acts: document.querySelectorAll('[data-testid=contact-bar] .cx-act').length, confirm: !!document.querySelector('[data-testid=person-confirm]'), note: !!document.querySelector('[data-testid=champion-note-form]') }));
  ok('CB-105', 'a champion reaches the technician who covers their site, and is not offered the controls that keep a role holder’s entry (absent, not disabled)', tech.acts >= 6 && !tech.confirm && !tech.note, JSON.stringify(tech));
  await p.goto(`${base}#/people/p-champ-MER`); await p.reload(); await p.waitForSelector('[data-testid=person-page]'); await wait(p, 400);
  ok('CB-106', 'another site’s champion is a published contact, so their profile opens; keeping that entry is not offered', await at(p, '[data-testid=contact-bar]').count() === 1 && await at(p, '[data-testid=person-confirm], [data-testid=champion-note-form]').count() === 0);
  for (const [id, hash, what] of [['CB-107', '#/people/p-syseng-forum', 'a role holder of another site'], ['CB-108', '#/people/p-tech-ben', 'a technician who does not cover the site']]) { await p.goto(base + hash); await p.reload(); await wait(p, 500); const text = await p.evaluate(() => document.body.innerText);
    ok(id, `a champion is refused the profile of ${what}, and no address or number of theirs is on the page`, await refused(p) && await at(p, '[data-testid=contact-bar]').count() === 0 && !/@empathia\.example|555-01/.test(text), text.slice(0, 120)); }
  await p.goto(`${base}#/meet?with=p-syseng-forum&step=when`); await p.reload(); await p.waitForSelector('[data-testid=meet-page]'); await wait(p, 400);
  ok('CB-109', 'a link to schedule with somebody outside the site shows no calendar and no time', await at(p, '[data-testid=meet-slot]').count() === 0 && await attr(p, '[data-testid=meet-page]', 'data-step') !== 'review');
  await p.goto(`${base}#/meet?with=p-backup-ATL&step=when`); await p.reload(); await p.waitForSelector('[data-testid=meet-slots]'); await wait(p, 400);
  ok('CB-110', 'with their own backup, times are proposed', await at(p, '[data-testid=meet-slot]').count() >= 1);
  await p.goto(`${base}#/lite/room/${REF}`); await p.reload(); await p.waitForSelector('[data-testid=connect-who]'); await wait(p, 400);
  const rows = await p.evaluate(() => [...document.querySelectorAll('[data-testid=connect-who] .cx-people > li')].map((l) => [l.dataset.relation, !!l.querySelector('[data-testid=cx-open]')]));
  ok('CB-111', 'on a room of their site a champion may contact everyone listed: backup, technician and service manager', rows.length === 4 && rows.every(([, open]) => open), JSON.stringify(rows));
  // nothing engineering, administrative or to do with sign-off came with it: those pages stay refused
  const shut = []; for (const hash of ['#/builder', '#/commissioning', '#/pro/ops', `#/room/${REF}`, '#/servicehands']) { await p.goto(base + hash); await p.reload(); await wait(p, 400); if (!(await refused(p))) shut.push(hash); }
  ok('CB-112', 'the champion is still refused the engineering and administrative pages', shut.length === 0, shut.join(' '));
  ok('CB-113', 'no console error as a Site Champion', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ who may (D44)
{ const t = await start('#/people', { role: 'visitor' }); const p = t.page; await wait(p, 400);
  const v1 = { refused: await refused(p), page: await at(p, '[data-testid=people-page]').count(), text: await p.evaluate(() => document.body.innerText), chunk: t.reqs.filter((r) => /PeoplePage|MeetPage/.test(r)) };
  ok('CB-45', 'a visitor is refused the directory, and its code is never loaded', v1.refused && v1.page === 0 && v1.chunk.length === 0, JSON.stringify(v1.chunk));
  ok('CB-46', 'the refusal names no person and shows no address or number', !/@empathia\.example|555-01|Amara|Dlomo/.test(v1.text));
  for (const [id, hash] of [['CB-47', `#/people/${CHAMP}`], ['CB-48', '#/meet?with=p-champ-ATL']]) { await p.goto(base + hash); await p.reload(); await wait(p, 500); ok(id, `a visitor is refused ${hash.split('?')[0]}`, await refused(p) && !/@empathia\.example|555-01/.test(await p.evaluate(() => document.body.innerText))); }
  for (const [id, hash, sel] of [['CB-49', `#/lite/room/${REF}`, '[data-testid=lite-room]'], ['CB-50', `#/here/${REF}`, '[data-testid=here-page]'], ['CB-51', '#/search?q=amara', '[data-testid=search-party]']]) { await p.goto(base + hash); await p.reload(); await p.waitForSelector(sel).catch(() => undefined); await wait(p, 500); const text = await p.evaluate(() => document.body.innerText);
    ok(id, `a visitor on ${hash.split('?')[0]} is shown nobody: no "who knows this room", no name, no address`, await at(p, '[data-testid=connect-who], [data-testid=sp-connect], [data-testid=contact-bar], [data-testid=sp-people-hint]').count() === 0 && !/@empathia\.example|555-01|Amara Dlomo|site champion for/i.test(text)); }
  ok('CB-52', 'no console error as a visitor', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

{ const t = await start(`#/lite/room/${REF}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=connect-who]'); await wait(p);
  const who = await p.evaluate(() => ({ h: document.querySelector('[data-testid=connect-who] h2').textContent, rows: [...document.querySelectorAll('[data-testid=connect-who] .cx-people > li')].map((l) => ({ id: l.dataset.person, rel: l.dataset.relation, why: l.querySelector('.cx-people__why').textContent, open: !!l.querySelector('[data-testid=cx-open]'), through: l.querySelector('[data-testid=cx-through]')?.textContent || '' })), text: document.querySelector('[data-testid=connect-who]').innerText }));
  // CHANGED after the merge (11 Nov): the list now ends with the service manager (the integrator's "who knows this room" had it),
  // so four rows where there were three; the manager, like the technician, is reached through ServiceHands by an employee.
  ok('CB-53', 'Lite, as an employee: "Who knows this room?" — the site champion first, the backup, then the technician, the service manager last, each with the reason', who.h === 'Who knows this room?' && who.rows.map((r) => r.rel).join() === 'champion,backup,technician,manager' && /triaged and escalated/.test(who.rows[3].why) && who.rows[0].id === CHAMP && /based on floor 4, where this room is/.test(who.rows[0].why) && /Service Engineer for Atlas HQ/.test(who.rows[2].why), JSON.stringify(who.rows));
  ok('CB-54', 'an employee may contact the champions; the technician is reached through ServiceHands, with no address or number shown', who.rows[0].open && who.rows[1].open && !who.rows[2].open && /reached through ServiceHands/.test(who.rows[2].through) && !who.rows[3].open && /The service manager is reached through ServiceHands/.test(who.rows[3].through) && !/ana\.reyes@|555-0112|@empathia\.example/.test(who.text), `${who.rows[2].through} | ${who.rows[3].through}`);
  await at(p, '[data-testid=connect-who] [data-testid=cx-open]').first().click(); await wait(p);
  const bar = await p.evaluate(() => ({ expanded: document.querySelector('[data-testid=cx-open]').getAttribute('aria-expanded'), chat: document.querySelector('[data-testid="cx-teams.chat"]')?.getAttribute('href'), mail: document.querySelector('[data-testid="cx-mail.compose"]')?.getAttribute('href'), prof: !!document.querySelector('[data-testid=cx-profile]'), sched: document.querySelector('[data-testid=cx-schedule]')?.getAttribute('href') }));
  ok('CB-55', '"Contact the site champion" opens the action bar for that room: the message and the subject carry the room’s name', bar.expanded === 'true' && /message=Hello%20Amara%2C%0A%0AI%20am%20writing%20about%20Atlas%204\.218/.test(bar.chat || '') && /subject=About%20Atlas%204\.218%20%E2%80%94%20Executive%20Boardroom/.test(bar.mail || '') && bar.prof && bar.sched === `#/meet?with=${CHAMP}&about=room%3A${REF}&room=${REF}`, JSON.stringify(bar));
  ok('CB-55b', 'Lite keeps one link to the directory for this room, and it lands on who knows the room', await attr(p, '[data-testid=lite-who]', 'href') === `#/people?room=${REF}` && await at(p, '[data-testid=lite-who]').count() === 1);
  await p.click('[data-testid=lite-who]'); await p.waitForSelector('[data-testid=people-page] [data-testid=connect-who]'); await wait(p);
  ok('CB-55c', 'that link opens the directory with the room’s people at the top', await attr(p, '[data-testid=people-page] [data-testid=connect-who]', 'data-id') === REF && await attr(p, '[data-testid=people-page] [data-testid=connect-who]', 'data-kind') === 'room');
  await p.goto(`${base}#/guide/room/${REF}`); await p.reload(); await p.waitForSelector('[data-testid=guide-who]').catch(() => undefined); await wait(p, 400);
  ok('CB-55d', 'the room guide names the champion from this directory and links to the same place', await attr(p, '[data-testid=guide-who]', 'href') === `#/people?room=${REF}` && /Amara Dlomo/.test(await p.evaluate(() => document.querySelector('main').innerText)), await attr(p, '[data-testid=guide-who]', 'href'));
  await p.goto(`${base}#/people`); await p.reload(); await p.waitForSelector('[data-testid=people-page]'); await wait(p, 400);
  const dir = await p.evaluate(() => ({ all: Number(document.querySelector('[data-testid=people-page]').dataset.all), kinds: [...new Set([...document.querySelectorAll('[data-testid=people-list] a')].map((a) => a.dataset.kind))].sort(), kindFilter: !!document.querySelector('[data-testid=people-kind]') }));
  ok('CB-56', 'an employee’s directory is the site champions and their backups: 26 people, no operational role', dir.all === 26 && dir.kinds.join() === 'backup,champion' && !dir.kindFilter, JSON.stringify(dir));
  await p.goto(`${base}#/people/p-tech-ana`); await p.reload(); await wait(p, 500);
  ok('CB-57', 'an employee is refused a technician’s profile', await refused(p) && !/ana\.reyes@/.test(await p.evaluate(() => document.body.innerText)));
  await p.goto(`${base}#/meet?with=p-tech-dev&step=when`); await p.reload(); await p.waitForSelector('[data-testid=meet-page]'); await wait(p, 400);
  ok('CB-58', 'an employee who arrives at a link to schedule with a technician is not shown their calendar: there is nobody to find a time with', await at(p, '[data-testid=meet-slot]').count() === 0 && await attr(p, '[data-testid=meet-page]', 'data-step') !== 'review' && !/Dev Shah/.test(await txt(p, '[data-testid=meet-page]')), await txt(p, '[data-testid=meet-page]').then((x) => x.slice(0, 200)));
  ok('CB-59', 'no console error as an employee', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ the hooks: In this room, ServiceHands, the room page, Search Party, Ask Empathia, the start page
{ const t = await start('#/here/R-ATL-4-220?step=record&s=no-camera', { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=here-record]'); await wait(p);
  ok('CB-60', 'In this room: nobody to contact is pushed at the person before they have written down what happened', await at(p, '[data-testid=connect-who]').count() === 0);
  await at(p, '[data-testid=here-add], [data-testid=here-send]').first().click(); await p.waitForSelector('[data-testid=here-done]'); await wait(p);
  const d = await p.evaluate(() => ({ h: document.querySelector('[data-testid=here-done] [data-testid=connect-who] h2')?.textContent, id: document.querySelector('[data-testid=here-done] [data-testid=connect-who]')?.dataset.id, first: document.querySelector('[data-testid=here-done] .cx-people > li')?.dataset.person }));
  ok('CB-61b', 'and the page keeps one link to the directory for the room', await attr(p, '[data-testid=here-who]', 'href') === '#/people?room=R-ATL-4-220' && await at(p, '[data-testid=here-who]').count() === 1);
  ok('CB-61', 'once it is written down, "Contact the site champion" is offered for that room', d.h === 'Contact the site champion' && d.id === 'R-ATL-4-220' && /^p-(champ|backup)-ATL$/.test(d.first || ''), JSON.stringify(d));
  await at(p, '[data-testid=here-done] [data-testid=cx-open]').first().click(); await wait(p);
  ok('CB-62', 'and the message started for them carries what was seen in the room', /What%20I%20saw%3A%20People%20on%20the%20call%20can%E2%80%99t%20see%20the%20room/.test(await attr(p, '[data-testid=here-done] [data-testid="cx-teams.chat"]', 'href') || ''), await attr(p, '[data-testid=here-done] [data-testid="cx-teams.chat"]', 'href'));
  ok('CB-63', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

{ const t = await start('#/servicehands?id=ISS-0417', { role: 'svcmgr' }); const p = t.page; await p.waitForSelector('[data-testid=connect-who]'); await wait(p);
  const j = await p.evaluate(() => ({ kind: document.querySelector('[data-testid=connect-who]').dataset.kind, h: document.querySelector('[data-testid=connect-who] h2').textContent, rows: [...document.querySelectorAll('[data-testid=connect-who] .cx-people > li')].map((l) => [l.dataset.relation, l.querySelector('.cx-people__why').textContent]) }));
  ok('CB-64', 'a ServiceHands job: who to contact about it — the owner first (the manager who triages, while no technician is assigned), then who knows the room', j.kind === 'issue' && /about this job/.test(j.h) && j.rows[0][0] === 'owner' && /ISS-0417 has no technician yet/.test(j.rows[0][1]) && j.rows.some((r) => r[0] === 'champion' || r[0] === 'backup'), JSON.stringify(j.rows));
  await p.goto(`${base}#/servicehands`); await p.reload(); await p.waitForSelector('[data-testid=servicehands]'); await wait(p, 400);
  ok('CB-65', 'the list of jobs has no such block', await at(p, '[data-testid=connect-who]').count() === 0);
  await p.goto(`${base}#/room/${REF}`); await p.reload(); await p.waitForSelector('[data-testid=room-view]'); await wait(p, 500);
  ok('CB-66', 'the technical room page has "Who knows this room?"', await txt(p, '[data-testid=connect-who] h2') === 'Who knows this room?' && await attr(p, '[data-testid=connect-who]', 'data-id') === REF);
  await p.goto(`${base}#/search?q=${encodeURIComponent('who knows 4.218')}`); await p.reload(); await p.waitForSelector('[data-testid=search-party]'); await wait(p, 500);
  ok('CB-67', 'Search Party answers "who knows 4.218" with the people, the champion first', await txt(p, '[data-testid=sp-connect] [data-testid=connect-who] h2') === 'Who knows Atlas 4.218?' && /^p-(champ|backup)-ATL$/.test(await attr(p, '[data-testid=sp-connect] .cx-people > li', 'data-person') || ''));
  await p.goto(`${base}#/search?focus=Room:${REF}`); await p.reload(); await p.waitForSelector('[data-testid=search-party]'); await wait(p, 500);
  ok('CB-68', 'and shows them when a room is the record in focus', await attr(p, '[data-testid=sp-connect] [data-testid=connect-who]', 'data-id') === REF);
  await p.goto(`${base}#/home`); await p.reload(); await p.waitForSelector('main h1'); await wait(p, 500);
  ok('CB-69', 'the Service Manager’s jump list is already full, so no meeting jump is squeezed in', await at(p, '[data-testid=rh-jump] a').count() <= 7 && await at(p, '[data-testid=rh-jump] a').count() >= 3 && await at(p, '[data-testid=rh-jump] a[href="#/meet"]').count() === 0);
  ok('CB-70', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

{ const t = await start('#/home', { role: 'service' }); const p = t.page; await wait(p, 400);
  const j = await p.evaluate(() => { const a = document.querySelector('[data-testid=rh-jump] a[href="#/meet"]'); return a ? { key: a.dataset.key, text: a.textContent } : null; });
  ok('CB-71', 'the technician’s start page has a "Schedule a meeting" jump with its own letter', !!j && j.key === 'm' && /Schedule a meeting/.test(j.text), JSON.stringify(j));
  await p.click('[data-testid=rh-jump] a[href="#/meet"]'); await p.waitForSelector('[data-testid=meet-who]'); await wait(p);
  ok('CB-72', 'and it opens the assistant at its first step, with nobody chosen and Find times not yet offered', await attr(p, '[data-testid=meet-page]', 'data-step') === 'who' && await at(p, '[data-testid=meet-next]').isDisabled());
  await p.fill('[data-testid=meet-find]', 'systems engineer'); await wait(p); const offer = await p.evaluate(() => [...document.querySelectorAll('[data-testid=meet-offer] .cx-pick')].map((b) => b.textContent));
  ok('CB-73', 'people are found by role', offer.length >= 3 && offer.every((x) => /Systems Engineer/.test(x)), JSON.stringify(offer));
  // Ask Empathia: a booking question ends at the review step; asking books nothing
  await p.goto(`${base}#/ask?q=${encodeURIComponent('book 30 minutes with the systems engineer about atlas 4.218')}`); await p.reload(); await p.waitForSelector('[data-testid=ask-answer] a'); await wait(p, 400);
  const ask = await p.evaluate(() => ({ text: document.querySelector('[data-testid=ask-answer]').innerText, links: [...document.querySelectorAll('[data-testid=ask-answer] a')].map((a) => [a.textContent, a.getAttribute('href')]) }));
  ok('CB-74', 'Ask Empathia resolves the person and the first time, says nothing is booked, and links to the review step', /Chidi Balogun is the systems engineer for Atlas 4\.218/.test(ask.text) && /Nothing is booked\. Review it and confirm it yourself/.test(ask.text) && /^#\/meet\?with=p-syseng-northstar&room=R-ATL-4-218&about=room%3AR-ATL-4-218&step=review&slot=\d+$/.test(ask.links[0]?.[1] || ''), JSON.stringify(ask.links));
  ok('CB-75', 'asking recorded nothing', (await state(p)).meetings.length === 0 && (await state(p)).events.every((e) => !/^meeting\./.test(e.type)));
  await at(p, '[data-testid=ask-answer] a').first().click(); await p.waitForSelector('[data-testid=meet-review-step]'); await wait(p);
  ok('CB-76', 'the link lands on the review step, where the person still has to confirm', await attr(p, '[data-testid=meet-page]', 'data-step') === 'review' && await at(p, '[data-testid=meet-confirm]').count() === 1 && (await state(p)).meetings.length === 0);
  await p.goto(`${base}#/ask?q=${encodeURIComponent('who do i contact about atlas 4.218?')}`); await p.reload(); await p.waitForSelector('[data-testid=ask-answer] a'); await wait(p, 400);
  const who = await p.evaluate(() => ({ text: document.querySelector('[data-testid=ask-answer]').innerText, href: document.querySelector('[data-testid=ask-answer] a').getAttribute('href') }));
  ok('CB-77', '"who do I contact about a room" is answered from the directory and leads to the people with their contact actions', /start with (Amara Dlomo|Bao Kahale)/.test(who.text) && /Everyone named is synthetic/.test(who.text) && who.href === `#/people?about=room:${REF}`, who.text.slice(0, 260));
  await at(p, '[data-testid=ask-answer] a').first().click(); await p.waitForSelector('[data-testid=people-page] [data-testid=connect-who]'); await wait(p);
  ok('CB-78', 'that page opens with who to contact about the room at the top', await attr(p, '[data-testid=people-page] [data-testid=connect-who]', 'data-id') === REF);
  ok('CB-79', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

{ const t = await start(`#/ask?q=${encodeURIComponent('book 30 minutes with the systems engineer about atlas 4.218')}`, { role: 'employee' }); const p = t.page; await p.waitForSelector('[data-testid=ask-answer]'); await wait(p, 400);
  const a = await p.evaluate(() => ({ text: document.querySelector('[data-testid=ask-answer]').innerText, meet: [...document.querySelectorAll('[data-testid=ask-answer] a')].filter((x) => (x.getAttribute('href') || '').startsWith('#/meet')).length }));
  ok('CB-80', 'asking does not grant permission: an employee asking to book the systems engineer is told their calendar is not shown, and is offered no way to the meeting', /may not schedule with a systems engineer/.test(a.text) && /Asking does not change that/.test(a.text) && a.meet === 0 && !/Chidi Balogun/.test(a.text), a.text.slice(0, 260));
  ok('CB-81', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ keeping the directory true; corrupt storage; the clipboard refused
{ const t = await start('#/people/p-champ-MER', { role: 'steward', extra: `try { if (!sessionStorage.getItem('__corrupt')) { sessionStorage.setItem('__corrupt', '1'); localStorage.setItem('empathia.demo.connect.v1', 'not json at all'); } } catch {}` }); const p = t.page; await p.waitForSelector('[data-testid=person-page]'); await wait(p);
  ok('CB-82', 'stored state that cannot be read starts clean: the page works', /Citlali Rahimi/.test(await txt(p, 'main h1')) && t.errs.length === 0, t.errs.join(' | '));
  const before = await attr(p, '[data-testid=person-page]', 'data-freshness'); await p.click('[data-testid=person-confirm]'); await wait(p);
  const s = await state(p);
  ok('CB-83', 'the Data Steward confirms an entry: it is confirmed as of today, said on the page and in the ledger', await attr(p, '[data-testid=person-page]', 'data-freshness') === 'confirmed' && s.confirmed['p-champ-MER'] === '2026-11-11' && /Entry confirmed as current on 2026-11-11/.test(await txt(p, '[data-testid=person-said]')) && s.events[0].type === 'directory.confirmed' && /Last confirmed 2026-11-11/.test(await txt(p, '[data-testid=person-freshness]')), `${before} → ${await attr(p, '[data-testid=person-page]', 'data-freshness')}`);
  await p.fill('[data-testid=champion-note]', 'short'); await p.click('[data-testid=champion-note-add]'); await wait(p);
  ok('CB-84', 'a note that says nothing is refused with the reason', /at least 8 characters/.test(await txt(p, '[data-testid=person-refused]')) && !(await state(p)).notes['p-champ-MER']);
  await p.fill('[data-testid=champion-note]', 'The spare remote is in the cupboard by the door'); await p.click('[data-testid=champion-note-add]'); await wait(p);
  ok('CB-85', 'a local note is added to the champion’s profile and kept', /The spare remote is in the cupboard by the door/.test(await txt(p, '[data-testid=champion-notes]')) && (await state(p)).notes['p-champ-MER'].length === 1 && (await state(p)).events[0].type === 'directory.note');
  await p.reload(); await p.waitForSelector('[data-testid=champion-notes]'); await wait(p, 300);
  ok('CB-86', 'both survive a reload', /spare remote/.test(await txt(p, '[data-testid=champion-notes]')) && await attr(p, '[data-testid=person-page]', 'data-freshness') === 'confirmed');
  ok('CB-87', 'the note is not placed in a message', !/spare|remote|cupboard/i.test(decodeURIComponent(await attr(p, '[data-testid="cx-teams.chat"]', 'href') || '')));
  await t.close(); }
{ const t = await start('#/people/p-champ-MER', { role: 'service', extra: `Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });` }); const p = t.page; await p.waitForSelector('[data-testid=person-page]'); await wait(p);
  ok('CB-88', 'a technician is not offered the steward’s controls (not disabled: absent)', await at(p, '[data-testid=person-confirm], [data-testid=champion-note-form]').count() === 0);
  await p.click('[data-testid=cx-copy-email]'); await wait(p);
  const fb = await p.evaluate(() => { const x = document.querySelector('[data-testid=cx-fallback] textarea'); return x ? { value: x.value, focused: document.activeElement === x, sel: x.value.slice(x.selectionStart, x.selectionEnd), said: document.querySelector('[data-testid=cx-said]').textContent } : null; });
  ok('CB-89', 'when the browser refuses the clipboard, the address is shown selected, to copy by hand, and the page says so', !!fb && fb.value === 'citlali.rahimi@empathia.example' && fb.focused && fb.sel === fb.value && /did not allow copying.*copy it by hand/.test(fb.said), JSON.stringify(fb));
  await p.goto(`${base}#/people/p-nobody`); await p.reload(); await wait(p, 500);
  ok('CB-90', 'an address no person has lands on a finished page, with the way back', /Nobody in the directory has this address/.test(await txt(p, 'main h1')) && await at(p, 'a[href="#/people"]').count() >= 1);
  await p.goto(`${base}#/people`); await p.reload(); await p.waitForSelector('[data-testid=people-page]'); await wait(p, 400);
  const n0 = Number(await attr(p, '[data-testid=people-page]', 'data-all')); await p.fill('[data-testid=people-find]', 'orourke'); await wait(p);
  const f1 = await p.evaluate(() => [...document.querySelectorAll('[data-testid=people-list] a b')].map((b) => b.textContent));
  await p.fill('[data-testid=people-find]', 'zzqx'); await wait(p); const none = await txt(p, '[data-testid=people-status]');
  await p.fill('[data-testid=people-find]', ''); await p.selectOption('[data-testid=people-group]', 'Forum and Resilience Quarter'); await wait(p); const lon = await p.evaluate(() => [...document.querySelectorAll('[data-testid=people-list] .cx-card__m')].map((x) => x.textContent));
  ok('CB-91', 'the directory: 66 people for a technician; a name is found without its apostrophe; nonsense is answered in words; a site filters to its own time zone', n0 === 66 && f1.length >= 1 && f1.every((x) => /O’Rourke/.test(x)) && /Nobody matches “zzqx”/.test(none) && lon.length >= 8 && lon.every((x) => /London time/.test(x)), JSON.stringify({ n0, f1, none, lon: lon.length }));
  ok('CB-92', 'no console error', t.errs.length === 0, t.errs.join(' | ')); await t.close(); }

// ------------------------------------------------------------------ phones: 390 and 320, nothing scrolls sideways, targets are big enough
for (const [w, tag] of [[390, 'CB-93'], [320, 'CB-94']]) { const t = await start(`#/people/${CHAMP}`, { role: 'service', w, h: 780 }); const p = t.page; await p.waitForSelector('[data-testid=person-page]'); await wait(p, 400);
  const over = { profile: await overflow(p) }; const small = await p.evaluate(() => [...document.querySelectorAll('.cx-act, .cx-card, [data-testid=champion-allrooms]')].filter((e) => e.getBoundingClientRect().height < 44).length);
  for (const [name, hash] of [['directory', '#/people'], ['times', `#/meet?with=${CHAMP},p-syseng-forum&room=${REF}&step=when`], ['no time', '#/meet?with=p-syseng-forum,p-backup-MBK&step=when'], ['who', `#/meet?with=${CHAMP}&room=${REF}`]]) { await p.goto(base + hash); await p.reload(); await p.waitForSelector('main h1'); await wait(p, 500); over[name] = await overflow(p); }
  // on the pages that host the block, the block itself must fit (those pages' own width is their own suites' business)
  await p.goto(`${base}#/lite/room/${REF}`); await p.reload(); await p.waitForSelector('[data-testid=connect-who]'); await wait(p, 500); await at(p, '[data-testid=cx-open]').first().click(); await wait(p);
  const block = await p.evaluate(() => { const b = document.querySelector('[data-testid=connect-who]'); const r = b.getBoundingClientRect(); return { fits: b.scrollWidth <= b.clientWidth + 1 && r.right <= innerWidth + 1 && r.left >= -1, acts: [...b.querySelectorAll('.cx-act')].every((a) => a.getBoundingClientRect().right <= innerWidth + 1 && a.getBoundingClientRect().height >= 44) }; });
  if (w === 390) { await p.goto(`${base}#/ask`); await p.reload(); await p.waitForSelector('main h1'); await wait(p, 500); over.ask = await overflow(p); }
  ok(tag, `at ${w} px nothing scrolls sideways on the profile, the directory, the times, "no time" and the first step${w === 390 ? ', nor on Ask Empathia with its two new questions' : ''}; the block fits inside the Lite room with the bar open; no target under 44 px`, Object.values(over).every((x) => x <= 1) && small === 0 && block.fits && block.acts, JSON.stringify({ over, small, block }));
  ok(`${tag}b`, `no console error at ${w} px`, t.errs.length === 0, t.errs.join(' | ')); await t.close(); }
{ const t = await start(`#/meet?with=${CHAMP}&room=${REF}&step=when`, { role: 'service', w: 390, h: 780, reduced: true }); const p = t.page; await p.waitForSelector('[data-testid=meet-slots]'); await wait(p, 300);
  const d = await p.evaluate(() => ({ h: Math.min(...[...document.querySelectorAll('.cx-slot, .hr-rail button, [data-testid=meet-review], [data-testid=meet-back]')].map((e) => e.getBoundingClientRect().height)), tr: getComputedStyle(document.querySelector('.cx-slot')).transitionDuration }));
  ok('CB-95', 'on a phone with reduced motion: every control on the times step is at least 44 px, and nothing animates', d.h >= 44 && /^0s/.test(d.tr), JSON.stringify(d)); await t.close(); }

// ------------------------------------------------------------------ nothing left the origin, anywhere
ok('CB-96', 'no request left this origin in any context of the suite', all.every((t) => t.off.length === 0), all.flatMap((t) => t.off).slice(0, 5).join(' | '));
await done();
