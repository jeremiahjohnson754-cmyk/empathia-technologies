#!/usr/bin/env node
// SIGNAL × Lite (founder, 12 Nov 2026, 14:25 CT): after the boss level (S01E11) the reader is offered the same idea in Lite, at a real
// Lite room address that opens; a glossary term with a Lite place offers it in its pop-over; a mentor answer about a mapped idea offers
// it too; every offer says Lite is a modeled campus room, not the story's church. A role that may not open that Lite address is not
// offered it (D44: absent, not disabled). Desktop and phone; no console error, no request leaving the page.
//   node tests/browser/demo-signal-lite.test.mjs
import { harness } from './demo-shell-lib.mjs';
import { unlockInit } from './signal-unlock.mjs';
const { ok, open, done } = await harness('demo-signal-lite');
for (const [w, tag] of [[1440, 'desktop'], [390, 'phone']]) {
  const t = await open('#/story/s01e11', { init: unlockInit('s01e11'), w, h: 900 }); const p = t.page;
  await p.waitForSelector('[data-item="piece"][data-kind="boss"]', { timeout: 20000 });
  const c = await p.evaluate(() => { const b = document.querySelector('[data-item="piece"][data-kind="boss"]'); const n = b?.nextElementSibling; const a = n?.querySelector('a');
    return n ? { tid: n.getAttribute('data-testid'), after: n.getAttribute('data-after'), key: n.getAttribute('data-lite'), href: a?.getAttribute('href'), text: n.textContent } : null; });
  ok(`SL-${tag}-01`, 'after the boss level the reader is offered the chapter’s idea in Lite, with the caveat that it is a modeled room, not the church', !!c && c.tid === 'story-lite' && c.after === 'boss level' && c.key === 'signal' && /^#\/lite\/room\/R-MER-2-160\?/.test(c.href || '') && /not the story’s church/.test(c.text) && /never a measurement/.test(c.text), JSON.stringify(c));
  await p.getByTestId('story-lite-open').first().click(); await p.waitForTimeout(1500);
  const room = await p.evaluate(() => ({ hash: location.hash, room: !!document.querySelector('[data-testid^="lite-"]'), denied: /not available|not open to/i.test(document.body.innerText) }));
  ok(`SL-${tag}-02`, 'the offer opens that Lite room at its address', /^#\/lite\/room\/R-MER-2-160/.test(room.hash) && room.room && !room.denied, JSON.stringify(room));
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`SL-${tag}-03`, 'no overflow, no console error, no request leaving the page', over <= 0 && !t.errs.length && !t.off.length, [over, ...t.errs, ...t.off].slice(0, 4).join(' | '));
  await t.close();
}
// a glossary term with a Lite place: S01E00, before its first decision
{ const t = await open('#/story/s01e00', { init: unlockInit('s01e00'), w: 1440, h: 900 }); const p = t.page; await p.waitForSelector('.sg-dec');
  const mapped = ['Signal flow', 'Switch', 'Link utilization', 'Bandwidth', 'Gain', 'Hum', 'Evidence', 'Encoder', 'Latency', 'Source', 'Destination'];
  const term = await p.evaluate((ts) => { const el = [...document.querySelectorAll('.sg-gl')].find((e) => ts.includes(e.getAttribute('data-gl'))); if (!el) return null; el.scrollIntoView(); el.click(); return el.getAttribute('data-gl'); }, mapped);
  await p.waitForTimeout(400);
  const pop = await p.evaluate(() => { const d = document.querySelector('[data-testid="story-glpop"]'); const l = d?.querySelector('[data-testid="story-lite"]'); return d ? { lite: !!l, href: l?.querySelector('a')?.getAttribute('href') || '' } : null; });
  ok('SL-gloss', `the glossary pop-over for a term with a Lite place (${term}) offers it`, !!term && !!pop && pop.lite && /^#\/lite\/room\/R-/.test(pop.href), JSON.stringify({ term, pop }));
  await t.close(); }
// the mentor channel: a question about hum and ground loops is answered, and the power view in Lite is offered with it
{ const t = await open('#/learn/ask', { w: 1440, h: 900 }); const p = t.page; await p.getByTestId('ask-mentor').waitFor();
  await p.getByLabel('Your question to the mentor').fill('Why is there hum, is it a ground loop?'); await p.getByTestId('ask-mentor').getByRole('button', { name: 'Send' }).click(); await p.waitForTimeout(400);
  const m = await p.evaluate(() => { const l = document.querySelector('[data-testid="ask-mentor-log"] [data-testid="story-lite"]'); return l ? { key: l.getAttribute('data-lite'), href: l.querySelector('a')?.getAttribute('href') } : null; });
  ok('SL-mentor', 'a mentor answer about hum offers the power view in Lite', !!m && m.key === 'power' && /ly=power/.test(m.href || ''), JSON.stringify(m));
  await t.close(); }
// a role that may not open the Lite room is not offered it
{ const t = await open('#/story/s01e11', { role: 'visitor', init: unlockInit('s01e11'), w: 1440, h: 900 }); const p = t.page; await p.waitForSelector('[data-item="piece"][data-kind="boss"]', { timeout: 20000 });
  const offered = await p.locator('[data-testid="story-lite"]').count();
  await p.evaluate(() => { location.hash = '#/lite/room/R-MER-2-160?ly=av,network,control&ov=,'; }); await p.waitForTimeout(1500);
  const opens = await p.evaluate(() => !!document.querySelector('[data-testid^="lite-ly-"], [data-testid="lite-change"]'));
  ok('SL-role', 'the offer appears exactly when the role may open that Lite room (absent, not disabled)', (offered > 0) === opens, JSON.stringify({ offered, opens }));
  await t.close(); }
await done();
