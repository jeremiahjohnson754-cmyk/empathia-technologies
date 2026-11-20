#!/usr/bin/env node
// A full work request in under 45 seconds (founder, 14 Nov 2026: "make the room/device super seamlessly and easy for people to request any
// work of room or device … it needs to take under 45 seconds to submit a full request and extremely good but simple"). Timed as a person
// does it, typing at an ordinary speed (60 ms a character), from the room in Lite to the request sent, counting every click:
//   R45-01  a device: open the device in the room → "Ask for work on this device" → say what is wrong → send
//   R45-02  the room: "Ask for work in this room" → choose what kind → say what is needed → send
//   R45-03  each request lands where its kind says (ServiceHands), names the room and, for a device, the device; nothing was typed but the need
//   R45-04  on a phone, the device request is as quick
//   node tests/browser/demo-request-45s.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-request-45s');
const ROOM = 'R-ATL-4-218'; const BUDGET = 45000;
const type = async (loc, text) => { await loc.click(); await loc.pressSequentially(text, { delay: 60 }); };

async function deviceRequest(w, h) {
  const t = await open(`#/lite/room/${ROOM}`, { role: 'employee', sw: false, w, h }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('lite-room').waitFor();
  const t0 = Date.now(); let clicks = 0;
  await p.goto(p.url().split('#')[0] + `#/lite/room/${ROOM}?device=A-0104`); clicks++;          // choosing the device (the 3D pick sets ?device=)
  await p.getByTestId('lite-ask-device').click(); clicks++;
  await p.getByTestId('rq-need').waitFor();
  await type(p.getByTestId('rq-need'), 'The ceiling microphone over the far end of the table cuts out during calls.'); clicks++;
  await p.getByTestId('rq-send').click(); clicks++;
  await p.getByTestId('rq-item').first().waitFor();
  const ms = Date.now() - t0; const item = await p.getByTestId('rq-item').first().innerText();
  const res = { ms, clicks, item, errs: t.errs, off: t.off }; await t.close(); return res;
}

const a = await deviceRequest(1440, 900);
ok('R45-01', `a device request, from the device in the room to sent, in under 45 s at an ordinary typing speed (${(a.ms / 1000).toFixed(1)} s, ${a.clicks} actions)`, a.ms < BUDGET && a.clicks <= 5, `${a.ms} ms`);
ok('R45-03a', 'the device request goes to ServiceHands and names the room and the device; the person typed only what is wrong', /ServiceHands/.test(a.item) && /4\.218|Atlas/.test(a.item) && /A-0104|microphone/i.test(a.item), a.item.slice(0, 200));

{ const t = await open(`#/lite/room/${ROOM}`, { role: 'employee', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('lite-room').waitFor();
  const t0 = Date.now(); let clicks = 0;
  await p.getByTestId('lite-ask-room').click(); clicks++;
  await p.getByRole('radio', { name: /More equipment in a room/ }).or(p.getByRole('button', { name: /More equipment in a room/ })).first().click(); clicks++;
  await p.getByTestId('rq-more-display').click(); clicks++;
  await type(p.getByTestId('rq-need'), 'People at the far end of the table cannot read the shared screen.'); clicks++;
  await p.getByTestId('rq-send').click(); clicks++;
  await p.getByTestId('rq-item').first().waitFor();
  const ms = Date.now() - t0; const item = await p.getByTestId('rq-item').first().innerText();
  ok('R45-02', `a room request, from the room to sent, in under 45 s (${(ms / 1000).toFixed(1)} s, ${clicks} actions)`, ms < BUDGET && clicks <= 6, `${ms} ms`);
  ok('R45-03b', 'the room request names the room and goes where its kind says', /ServiceHands/.test(item) && /4\.218|Atlas/.test(item), item.slice(0, 200));
  ok('R45-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length && !a.errs.length && !a.off.length, [...t.errs, ...t.off, ...a.errs, ...a.off].slice(0, 3).join(' | '));
  await t.close(); }

const m = await deviceRequest(390, 844);
ok('R45-04', `on a phone the device request is as quick (${(m.ms / 1000).toFixed(1)} s)`, m.ms < BUDGET && /ServiceHands/.test(m.item), `${m.ms} ms`);
await done();
