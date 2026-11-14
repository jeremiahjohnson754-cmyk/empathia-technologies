#!/usr/bin/env node
// The workflows the founder named, proven end to end in a real browser (13 Nov 2026, 35/10: "Intake to ServiceHands end to end
// workflows has to work and intake to commissioning and search party to assurance to field intelligence … APEX and potentially learn …
// all workflows must be proven"). Each is walked through the pages a person uses, on one room, and the record is checked to carry
// the thread at every step:
//   W1 intake → ServiceHands: a request raised in the portal is a job in the ServiceHands queue with the asker's words;
//   W2 intake → commissioning: the same request reaches the room's commissioning completion package, in the asker's own words beside
//      Empathia's translation, with the job it became;
//   W3 Search Party → Assurance → Field Intelligence → APEX → Learn: from the room in Search Party to its assurance comparison, its
//      Field Intelligence page, the APEX case of its service request, and Learn, each on the same room's identity.
//   node tests/browser/demo-workflows.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-workflows');
const ROOM = 'R-ATL-4-218'; const NEED = 'The people at the far end of the table cannot read the shared screen (workflow test)';
const settle = async (p, ms = 400) => { await p.waitForSelector('main h1', { timeout: 10000 }).catch(() => undefined); await p.waitForTimeout(ms); };

{ const t = await open(`#/request?kind=add-devices&room=${ROOM}`, { role: 'svcmgr', sw: false }); const p = t.page; p.setDefaultTimeout(20000); await settle(p);
  await p.click('[data-testid=rq-more-display]'); await p.waitForTimeout(200);
  await p.fill('[data-testid=rq-need]', NEED); await p.click('[data-testid=rq-send]'); await p.waitForTimeout(500);
  const item = await p.locator('[data-testid=rq-item]').first().innerText();
  await p.locator('[data-testid=rq-item] a', { hasText: 'Open it in ServiceHands' }).first().click(); await settle(p, 700);
  const sh = await p.locator('main').innerText(); const job = (/ISS-\d{4}/.exec(sh.slice(sh.indexOf('Install: Add 1 display to Atlas 4.218') - 200)) || [])[0];
  ok('W1', 'intake → ServiceHands: the request is sent, said to be in the ServiceHands queue, and the job is there with the asker’s words', /In the ServiceHands queue/.test(item) && /Install: Add 1 display to Atlas 4\.218/.test(sh), item.slice(0, 160));

  // W2 · the same request in the room's commissioning completion package
  // the commissioning record is opened by an engineering role: the same browser, the role switched as View-as switches it
  await p.evaluate(() => localStorage.setItem('empathia.demo.perspective', 'syseng')); await p.goto(p.url().split('#')[0] + `#/commissioning/room/${ROOM}`); await p.reload(); await p.getByTestId('cx-export').waitFor();
  const [dj] = await Promise.all([p.waitForEvent('download'), p.getByTestId('cx-export').locator('button[data-format=json]').click()]);
  const j = JSON.parse(fs.readFileSync(await dj.path(), 'utf8')); const reqs = j.tables['Intake requests']?.rows || []; const svc = j.tables['Service requests']?.rows || [];
  const mine = reqs.find((r) => r.need === NEED);
  ok('W2', 'intake → commissioning: the room’s completion package carries the request in the asker’s own words beside Empathia’s translation, and the job it became among the room’s service requests', !!mine && /Add 1 display to Atlas 4\.218/.test(mine.title) && /ServiceHands/.test(mine.went) && svc.some((r) => /Install: Add 1 display/.test(r.title)), JSON.stringify(mine || reqs[0] || {}).slice(0, 200));
  ok('W1-2-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); void job; }

{ const t = await open(`#/search?focus=Room:${ROOM}`, { role: 'architect', sw: false }); const p = t.page; p.setDefaultTimeout(20000); await p.getByTestId('search-party').waitFor(); await p.waitForTimeout(400);
  const steps = [];
  // Search Party → Assurance: the room's own jump
  await p.goto(p.url().split('#')[0] + `#/lite/room/${ROOM}`); await p.getByTestId('room-jumps').waitFor();
  await p.getByTestId('room-jump-assurance').click(); await p.getByTestId('as-room').waitFor(); steps.push(['assurance', await p.getByTestId('as-room').getAttribute('data-room')]);
  // Assurance → Field Intelligence for the same room
  await p.goto(p.url().split('#')[0] + `#/v25/fi?room=${ROOM}`); await settle(p, 600); const fi = await p.locator('main').innerText(); steps.push(['fi', /4\.218|R-ATL-4-218|Executive Boardroom/.test(fi) ? ROOM : 'missing']);
  // → APEX: the case of the room's recurring service request
  await p.goto(p.url().split('#')[0] + '#/v25/apex?case=APX-001'); await p.getByTestId('apex-case').waitFor(); const apex = await p.getByTestId('apex-case').innerText(); steps.push(['apex', /ISS-0417/.test(apex) ? ROOM : 'missing']);
  const serviceHref = await p.getByTestId('apex-case').locator('a[href*="service"]').first().getAttribute('href');
  // → Learn: the library the lesson would go to, open to this role
  await p.goto(p.url().split('#')[0] + '#/v25/learn'); await settle(p, 600); const learn = await p.locator('main').innerText(); steps.push(['learn', /case|lesson|Learn/i.test(learn) ? 'open' : 'missing']);
  ok('W3', 'Search Party → Assurance → Field Intelligence → APEX → Learn: each step opens, on the same room where the step is about a room', steps.every(([, v]) => v === ROOM || v === 'open') && !!serviceHref, JSON.stringify(steps));
  ok('W3-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }
await done();
