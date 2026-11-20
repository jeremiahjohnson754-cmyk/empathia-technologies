#!/usr/bin/env node
// Two QR codes per Lite room (founder, 14 Nov 2026: "have empathia make two QR codes of the lite room one for public in employee/room user
// modes only and one that's only for authorizated engineering personnel engineer mode"). A code is an address and grants nothing:
//   QR-01  a role that may use the engineer mode sees both codes, each encoding its own address, and can save each as a print label
//   QR-02  the public code opens the employee and room-user modes only — for an employee, and for an engineer too (no other mode offered)
//   QR-03  the public code, scanned by a role without those modes, says so and points to help; it never widens what the role sees
//   QR-04  the engineering code opens engineer mode for an engineer, and is refused to an employee (the code grants nothing)
//   QR-05  an employee is not shown the codes panel at all
//   node tests/browser/demo-room-qr.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-room-qr');
const ROOM = 'R-ATL-4-218';
const lensesShown = (p) => p.locator('[data-testid^="lite-lens-"][role=radio]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('lite-lens-', '')));

{ const t = await open(`#/lite/room/${ROOM}`, { role: 'syseng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('lite-room-qr').waitFor();
  const pub = await p.getByTestId('lite-qr-public').getAttribute('data-text'); const eng = await p.getByTestId('lite-qr-engineering').getAttribute('data-text');
  const svgs = await p.getByTestId('lite-room-qr').locator('svg[role=img]').count();
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('lite-qr-save-engineering').click()]); const label = fs.readFileSync(await dl.path(), 'utf8');
  ok('QR-01', 'an engineer sees both codes for the room, each its own address, and saves a print label (SVG) naming what it is and that it grants no access', pub.endsWith(`#/lite/room/${ROOM}?mode=user&qr=public`) && eng.endsWith(`#/lite/room/${ROOM}?mode=engineer&qr=eng`) && svgs === 2 && dl.suggestedFilename() === `${ROOM}-engineering-qr.svg` && /^<svg/.test(label) && /Engineering code/.test(label) && /grants no access/.test(label), `${pub} · ${eng}`);

  // the public code, opened by this same engineer: no engineer mode offered
  await p.goto(p.url().split('#')[0] + `#/lite/room/${ROOM}?mode=engineer&qr=public`); await p.getByTestId('lite-room').waitFor();
  const engLens = await p.getByTestId('lite-room').getAttribute('data-lens'); const engChoices = await lensesShown(p);
  const note = await p.getByTestId('lite-qr-public').count(); const qrPanel = await p.getByTestId('lite-room-qr').count();
  t.ctx2 = { engLens, engChoices, note, qrPanel };
  await t.close();

  const e = await open(`#/lite/room/${ROOM}?mode=user&qr=public`, { role: 'employee', sw: false }); await e.page.getByTestId('lite-room').waitFor();
  const empLens = await e.page.getByTestId('lite-room').getAttribute('data-lens'); const empChoices = await lensesShown(e.page);
  const { engLens: el, engChoices: ec, note: nn, qrPanel: qp } = t.ctx2;
  ok('QR-02', 'the public code opens the employee and room-user modes only: for an employee, and for an engineer who asks for more (no other mode offered, the codes panel hidden)',
    empLens === 'user' && empChoices.every((x) => ['employee', 'user'].includes(x)) && ['employee', 'user'].includes(el) && ec.every((x) => ['employee', 'user'].includes(x)) && !ec.includes('engineer') && nn === 1 && qp === 0, `${empLens} [${empChoices}] · engineer: ${el} [${ec}]`);
  const qr5 = await e.page.getByTestId('lite-room-qr').count();
  // the engineering code scanned by the employee: refused — the code grants nothing
  await e.page.goto(e.page.url().split('#')[0] + `#/lite/room/${ROOM}?mode=engineer&qr=eng`); await e.page.waitForTimeout(1200);
  const empEng = await e.page.locator('[data-testid=lite-room][data-lens=engineer]').count();
  ok('QR-05', 'an employee is not shown the codes panel', qr5 === 0, String(qr5));
  ok('QR-04a', 'the engineering code, scanned by an employee, does not open engineer mode', empEng === 0, String(empEng));
  ok('QR-clean', 'no console error; nothing requested off the page', !e.errs.length && !e.off.length, [...e.errs, ...e.off].slice(0, 3).join(' | '));
  await e.close(); }

{ const t = await open(`#/lite/room/${ROOM}?mode=engineer&qr=eng`, { role: 'syseng', sw: false }); await t.page.getByTestId('lite-room').waitFor();
  ok('QR-04b', 'the engineering code opens engineer mode for an engineer', await t.page.getByTestId('lite-room').getAttribute('data-lens') === 'engineer'); await t.close(); }

{ const t = await open(`#/lite/room/${ROOM}?mode=user&qr=public`, { role: 'visitor', sw: false }); await t.page.waitForTimeout(1500);
  const refused = await t.page.getByTestId('lite-qr-public-refused').count(); const room = await t.page.locator('[data-testid=lite-room]').count();
  const lens = room ? await t.page.getByTestId('lite-room').getAttribute('data-lens') : null;
  ok('QR-03', 'the public code scanned by a visitor never widens what a visitor sees: a visitor has neither mode, so is told the code is for employees and room users, with a way to get help', refused === 1 && room === 0 && /Get help with this room/.test(await t.page.getByTestId('lite-qr-public-refused').innerText()), `refused ${refused}, room ${room}, lens ${lens}`);
  await t.close(); }
await done();
