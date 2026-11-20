#!/usr/bin/env node
// The room and device registers at the start of commissioning (founder, 14 Nov 2026: "I want the device register and room register in
// the beginning of commissioning framework … the installation team to fill out the device register … and a small documentation tracker in
// the 1st phase … so we can have the before and after install"; the v1.3 rule: networked devices require an IP address and a hostname).
// Walked as the people who use it: the installation team registers devices and the install photographs; an engineer reads them; the
// rules refuse a malformed or duplicate value, a changed serial and an after photograph without a before one; the reference room's
// replaced camera is in the retired register with its code reserved.
//   node tests/browser/demo-registers.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-registers');
const ROOM = 'R-ATL-4-218';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');   // a 1×1 PNG
const goto = async (p, role) => { await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), role); await p.reload(); await p.getByTestId('cx-registers').waitFor(); };
const rowOf = (p, dev) => p.getByTestId('reg-devices').locator(`[data-testid=reg-row][data-device="${dev}"]`);

{ const t = await open(`#/commissioning/room/${ROOM}`, { role: 'cxeng', sw: false }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('cx-registers').waitFor();
  const total = await p.getByTestId('reg-devices').locator('[data-testid=reg-row]').count();
  const edits = await p.getByTestId('reg-edit').count();
  const pct0 = Number(await p.getByTestId('reg-stats').getAttribute('data-pct'));
  await p.getByTestId('reg-room').locator('summary').click(); const roomReg = await p.getByTestId('reg-room').innerText();
  ok('RG-01', 'the registers open the commissioning page: every device listed with its device and asset IDs, the room register read from the record; an engineer outside the installation team reads but does not record', total >= 5 && edits === 0 && pct0 === 0 && /R-ATL-4-218/.test(roomReg) && /Capacity/.test(roomReg), `${total} devices, ${edits} edit buttons, ${pct0}%`);

  // the retired register: the reference room's camera was replaced (the scenario record) — the old unit is out, its code reserved
  const ret = await p.getByTestId('reg-retired').innerText();
  const camRow = await p.getByTestId('reg-devices').locator('[data-testid=reg-row]').filter({ hasText: 'AS-0112' }).count();
  ok('RG-02', 'the replaced camera’s unit is in the retired register (code never reused) and the device register shows the unit installed now', /Retired · code never reused/.test(ret) && /by AS-0112/.test(ret) && camRow === 1, ret.slice(0, 200));

  // the installation team records: a networked device (hostname and address required) and a non-networked one
  await goto(p, 'installer');
  const rows = p.getByTestId('reg-devices').locator('[data-testid=reg-row]');
  const devs = await rows.evaluateAll((els) => els.map((e) => ({ d: e.dataset.device, net: /networked/.test(e.innerText) })));
  const net = devs.find((x) => x.net); const plain = devs.find((x) => !x.net);
  await rowOf(p, net.d).getByTestId('reg-edit').click();
  await rowOf(p, net.d).locator('input[data-field=serial]').fill('SYN-SN-4218-0001');
  await rowOf(p, net.d).locator('input[data-field=hostname]').fill('atl4218-dev1');
  await rowOf(p, net.d).locator('input[data-field=ip]').fill('10.20.30.400');
  await rowOf(p, net.d).getByTestId('reg-save').click();
  const badIp = await p.getByTestId('reg-error').innerText();
  await rowOf(p, net.d).locator('input[data-field=ip]').fill('10.20.30.40');
  await rowOf(p, net.d).getByTestId('reg-save').click(); await p.waitForTimeout(150);
  const done1 = await rowOf(p, net.d).getAttribute('data-complete');
  const pct1 = Number(await p.getByTestId('reg-stats').getAttribute('data-pct'));
  ok('RG-03', 'the installation team registers a networked device; a malformed address is refused with its reason and nothing is kept until it is right', /an IP address is four numbers 0–255/.test(badIp) && done1 === 'yes' && pct1 > 0, `${net.d}: ${done1}, ${pct1}%`);

  // the same address and hostname on another networked device are refused; a non-networked device takes no address
  const net2 = devs.filter((x) => x.net)[1];
  let dup = '';
  if (net2) { await rowOf(p, net2.d).getByTestId('reg-edit').click(); await rowOf(p, net2.d).locator('input[data-field=serial]').fill('SYN-SN-4218-0002'); await rowOf(p, net2.d).locator('input[data-field=hostname]').fill('atl4218-dev2'); await rowOf(p, net2.d).locator('input[data-field=ip]').fill('10.20.30.40'); await rowOf(p, net2.d).getByTestId('reg-save').click(); dup = await p.getByTestId('reg-error').innerText(); await rowOf(p, net2.d).getByRole('button', { name: 'Cancel' }).click(); }
  await rowOf(p, plain.d).getByTestId('reg-edit').click();
  const plainIp = await rowOf(p, plain.d).locator('input[data-field=ip]').count();
  await rowOf(p, plain.d).locator('input[data-field=serial]').fill('SYN-SN-4218-0003'); await rowOf(p, plain.d).getByTestId('reg-save').click(); await p.waitForTimeout(150);
  const plainDone = await rowOf(p, plain.d).getAttribute('data-complete');
  ok('RG-04', 'an address already used by another device is refused; a device class that is not networked takes a serial and no address', (!net2 || /address 10\.20\.30\.40 is already used by/.test(dup)) && plainIp === 0 && plainDone === 'yes', `${dup.slice(0, 120)} · ${plain.d} ${plainDone}`);

  // a recorded serial is final
  await rowOf(p, net.d).getByTestId('reg-edit').click();
  const ro = await rowOf(p, net.d).locator('input[data-field=serial]').getAttribute('readonly');
  await rowOf(p, net.d).getByRole('button', { name: 'Cancel' }).click();
  ok('RG-05', 'a recorded serial is final: the field is read-only once kept (a different serial is a different unit)', ro !== null, String(ro));

  // install documentation: the after photograph needs the before one
  await p.getByTestId('reg-photo-input-after').setInputFiles({ name: 'after.png', mimeType: 'image/png', buffer: PNG }); await p.waitForTimeout(400);
  const noBefore = await p.getByTestId('reg-error').innerText();
  await p.getByTestId('reg-photo-input-before').setInputFiles({ name: 'before.png', mimeType: 'image/png', buffer: PNG }); await p.waitForFunction(() => document.querySelector('[data-testid=reg-photo-before]')?.getAttribute('data-has') === 'yes');
  await p.getByTestId('reg-photo-input-after').setInputFiles({ name: 'after.png', mimeType: 'image/png', buffer: PNG }); await p.waitForFunction(() => document.querySelector('[data-testid=reg-photo-after]')?.getAttribute('data-has') === 'yes');
  ok('RG-06', 'phase 1 install documentation: the after photograph is refused until the before one is taken; then both are kept with who and when', /record the photograph before the installation first/.test(noBefore) && /Installer/.test(await p.getByTestId('reg-photo-after').innerText()), noBefore.slice(0, 120));

  // it persists, it reaches the workspace's audit trail, and an engineer reads it
  await goto(p, 'cxeng');
  const kept = await rowOf(p, net.d).getAttribute('data-complete'); const photos = await p.locator('[data-testid^=reg-photo-][data-has=yes]').count();
  const events = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').events.filter((e) => /^register\./.test(e.type)).length; } catch { return -1; } });
  ok('RG-07', 'what the installation team recorded is there after a reload for the engineer, and each record is in the audit trail', kept === 'yes' && photos === 2 && events >= 4, `${kept}, ${photos} photos, ${events} events`);
  // the commissioning package carries the registers and the install photographs
  await p.evaluate((r) => localStorage.setItem('empathia.demo.perspective', r), 'syseng'); await p.reload(); await p.getByTestId('cx-export').waitFor();
  const [dj] = await Promise.all([p.waitForEvent('download'), p.getByTestId('cx-export').locator('button[data-format=json]').click()]); const j = JSON.parse(fs.readFileSync(await dj.path(), 'utf8'));
  const reg = j.tables['Device register']?.rows || []; const mine = reg.find((x) => x.device === net.d) || {};
  ok('RG-08', 'the commissioning package carries the device register as recorded, the retired register and both install photographs', mine.serial === 'SYN-SN-4218-0001' && mine.ip === '10.20.30.40' && (j.tables['Retired units']?.rows || []).some((x) => x.by === 'AS-0112') && (j.media || []).filter((m) => /^install-/.test(m.id)).length === 2, JSON.stringify(mine).slice(0, 160));
  ok('RG-clean', 'no console error; nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 3).join(' | '));
  await t.close(); }

{ const t = await open(`#/commissioning/room/${ROOM}`, { role: 'installer', sw: false, w: 390, h: 844 }); const p = t.page; p.setDefaultTimeout(20000);
  await p.getByTestId('cx-registers').waitFor();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('RG-phone', 'at phone width the registers fit: the device table scrolls inside its own frame, the page does not scroll sideways', sw <= 0, `${sw}px`);
  await t.close(); }
await done();
