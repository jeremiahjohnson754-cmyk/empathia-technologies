#!/usr/bin/env node
// Mix the Stream (founder, 12 Nov 2026, 14:40 CT): the flagship lab boss is hands-on and reacts at once. Faders and knobs drag and step
// with the keyboard and say their value; the layers flip; an EQ node drags; mute closes a channel; selecting a seat reads its level and
// arrival times; checking a scene scores it; the mega church runs its boss level on a clock. It sits inside S01E10 after the lab, in
// Learn labs and on the Service page. Desktop and phone; no console error, no request leaving the page.
//   node tests/browser/demo-mixlab.test.mjs
import { harness } from './demo-shell-lib.mjs';
import { unlockInit } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-mixlab');
for (const [w, tag] of [[1440, 'desktop'], [390, 'phone']]) {
  const t = await open('#/labs/mix', { w, h: 900 }); const p = t.page; await p.getByTestId('mixlab').waitFor();
  const r0 = await p.evaluate(() => ({ room: document.querySelector('[data-testid="mixlab"]').dataset.room, strips: document.querySelectorAll('.mx-strip').length, goals: document.querySelectorAll('[data-goal]').length, rooms: document.querySelectorAll('.mx-roomcard').length }));
  ok(`MX-${tag}-01`, 'the lab opens on the basement: five rooms, eight strips, its goals listed', r0.room === 'basement' && r0.strips === 8 && r0.rooms === 5 && r0.goals >= 8, JSON.stringify(r0));
  const f = p.getByTestId('mx-fader-1'); const v0 = Number(await f.getAttribute('aria-valuenow')); const box = await f.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width / 2, box.y - 40, { steps: 6 }); await p.mouse.up();
  const v1 = Number(await f.getAttribute('aria-valuenow'));
  await p.getByTestId('mx-gain-1').focus(); const g0 = Number(await p.getByTestId('mx-gain-1').getAttribute('aria-valuenow')); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); const g1 = Number(await p.getByTestId('mx-gain-1').getAttribute('aria-valuenow'));
  ok(`MX-${tag}-02`, 'a fader drags up and the gain knob steps with the arrow keys, each saying its value', v1 > v0 && g1 === g0 + 2, JSON.stringify({ v0, v1, g0, g1 }));
  await p.getByTestId('mx-mute-1').click(); const muted = await p.getByTestId('mx-mute-1').getAttribute('aria-pressed'); await p.getByTestId('mx-mute-1').click();
  await p.locator('.mx-scribble').nth(1).click(); await p.getByTestId('mx-tab-eq').click(); const n = p.getByTestId('mx-eq-node-2'); const nb = await n.boundingBox(); const before = await n.getAttribute('aria-label');
  await p.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2); await p.mouse.down(); await p.mouse.move(nb.x + nb.width / 2 + 20, nb.y + 30, { steps: 5 }); await p.mouse.up(); const after = await n.getAttribute('aria-label');
  ok(`MX-${tag}-03`, 'mute closes a channel; an EQ node drags to a new frequency and gain', muted === 'true' && before !== after, JSON.stringify({ muted, before, after }));
  const room = p.getByTestId('mx-room'); const rb = await room.boundingBox(); await p.mouse.click(rb.x + rb.width / 2, rb.y + rb.height * 0.7);
  const seat = await p.getByTestId('mx-seat').innerText().catch(() => '');
  ok(`MX-${tag}-04`, 'selecting a seat reads its level and when each loudspeaker group arrives', /dB\(A\)/.test(seat) && /ms/.test(seat), seat.slice(0, 160));
  await p.getByTestId('mx-check').click(); const said = await p.getByTestId('mx-said').innerText();
  ok(`MX-${tag}-05`, 'checking a scene scores it out of 100', /of 100/.test(said), said);
  await p.getByTestId('mx-room-mega').click(); await p.waitForTimeout(200);
  const mega = await p.evaluate(() => ({ room: document.querySelector('[data-testid="mixlab"]').dataset.room, layers: document.querySelectorAll('.mx-layer').length }));
  await p.getByTestId('mx-layer-3').click(); const first = await p.locator('.mx-scribble').first().innerText();
  await p.getByTestId('mx-boss').click(); await p.waitForTimeout(600); const bar = await p.getByTestId('mx-bossbar').isVisible(); const disabled = await p.getByTestId('mx-check').isDisabled(); await p.getByTestId('mx-boss').click();
  ok(`MX-${tag}-06`, 'the mega church has four layers of eight; flipping to the last shows channels 25–32; its boss level runs on a clock', mega.room === 'mega' && mega.layers === 4 && /^25 /.test(first) && bar && disabled, JSON.stringify({ mega, first, bar, disabled }));
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`MX-${tag}-07`, 'no overflow, no console error, no request leaving the page', over <= 0 && !t.errs.length && !t.off.length, [over, ...t.errs, ...t.off].slice(0, 4).join(' | '));
  await t.close();
}
// inside S01E10, after its lab (a returning reader who has made every decision of the chapter)
{ const t = await open('#/story/s01e10', { init: unlockInit('s01e11'), w: 1440, h: 900 }); const p = t.page; await p.getByTestId('story-flagship').waitFor({ timeout: 20000 });
  const prev = await p.evaluate(() => { const f = document.querySelector('[data-testid="story-flagship"]'); const it = f?.previousElementSibling; return it ? `${it.getAttribute('data-item')}:${it.getAttribute('data-kind')}` : null; });
  await p.getByTestId('story-flagship-open').click(); await p.getByTestId('mixlab').waitFor({ timeout: 20000 });
  ok('MX-story', 'S01E10 offers the flagship lab right after its lab, and it opens inside the chapter', /lab/.test(prev || '') && (await p.locator('[data-testid="story-flagship"] [data-testid="mixlab"]').count()) === 1, String(prev));
  ok('MX-story-clean', 'no console error, no request leaving the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].slice(0, 4).join(' | ')); await t.close(); }
{ const t = await open('#/learn/labs', { w: 1440, h: 900 }); const p = t.page; await p.getByTestId('labs').waitFor();
  const href = await p.getByTestId('flagship-labs').locator('a').first().getAttribute('href');
  ok('MX-learn', 'Learn labs lists the flagship lab first', href === '#/labs/mix', String(href)); await t.close(); }
{ const t = await open('#/service', { w: 1440, h: 900 }); const p = t.page; await p.waitForSelector('.svc');
  const href = await p.getByTestId('svc-practice').locator('a').getAttribute('href').catch(() => null);
  ok('MX-service', 'the Service page offers it as practice before a call, recording nothing on a job', href === '#/labs/mix', String(href)); await t.close(); }
await done();
