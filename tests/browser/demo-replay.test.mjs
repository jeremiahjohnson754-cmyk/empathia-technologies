#!/usr/bin/env node
// Core Replay (#/replay): every room replays; the reference room's stages stand on records with their status; playback (play, step,
// scrub, keyboard on the slider) never writes the workspace or adds history entries; the replacement reopens the engine's tests that
// name the position (never a hand-typed list); time layers show the asset change and the baseline; the exception stays a proposal;
// applying a scenario is a separate named step with Undo. At 390/768/1440, reduced motion respected, no errors.
//   node tests/browser/demo-replay.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-replay', 4484, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt, { reducedMotion: tag === 'phone' ? 'reduce' : 'no-preference' });
    await goto(page, '#/replay', 'svcmgr'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=replay-home]');
    ok(`RP-${tag}-01`, 'the replay home offers every room', (await page.locator('[data-room]').count()) === 4 && (await over(page)) <= 0);
    await page.click('[data-room=R-ATL-4-218]'); await page.waitForSelector('[data-testid=replay]');
    const before = await page.evaluate(() => localStorage.getItem('empathia.demo.workspace.v1')); const hlen = await page.evaluate(() => history.length);
    await page.click('[data-testid=rp-next]'); await page.click('[data-testid=rp-next]'); await page.click('[data-testid=rp-back]');
    await page.locator('[data-testid=rp-scrub]').focus(); for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
    await page.click('[data-testid=rp-play]'); await page.waitForTimeout(1800); await page.click('[data-testid=rp-play]');
    const after = await page.evaluate(() => localStorage.getItem('empathia.demo.workspace.v1')); const hlen2 = await page.evaluate(() => history.length);
    ok(`RP-${tag}-02`, 'playing, stepping and scrubbing (keyboard too) never write the workspace and add no history entries', before === after && hlen === hlen2, `${before === after} ${hlen}->${hlen2}`);
    ok(`RP-${tag}-03`, 'the position is kept in the address, so a reload resumes at the same stage', /\?at=/.test(page.url()));
    const at = new URL(page.url()).hash; await page.reload(); await page.waitForSelector('[data-testid=rp-card]');
    ok(`RP-${tag}-04`, 'after a reload the same stage is shown', new URL(page.url()).hash === at);
    if (tag === 'phone') { const s = await smallTargets(page); ok(`RP-${tag}-05`, 'every replay control is at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      await goto(page, '#/replay/R-ATL-4-218?at=change', 'svcmgr');
      const card = await page.locator('[data-testid=rp-card]').innerText(); const n = await page.locator('[data-testid=reopened] li').count();
      const m = /reopens (\d+) of (\d+) tests/.exec(card);
      ok('RP-06', 'the replacement stage names AS-0097 → AS-0112 at PA-0007 and lists the reopened tests, as many as it says', /AS-0097 replaced by AS-0112/.test(card) && m && Number(m[1]) === n && n > 0 && Number(m[2]) > n, card.slice(0, 300));
      ok('RP-07', 'each stage says how sure it is', /Recorded|Inferred or reconstructed|Not yet|Not held/.test(card));
      await goto(page, '#/replay/R-ATL-4-218?at=reverify', 'svcmgr');
      ok('RP-08', 'reverification says earlier PASS_VERIFIED results on the removed unit never count', /never count toward the replacement/.test(await page.locator('[data-testid=rp-card]').innerText()));
      await goto(page, '#/replay/R-ATL-4-218?at=exception', 'svcmgr');
      ok('RP-09', 'EXC-4218-01 is shown as proposed, pending approval — never as acceptance', /proposed, pending approval/.test(await page.locator('[data-testid=rp-card]').innerText()));
      await page.selectOption('[data-testid=tl-a]', { index: 0 }); await page.selectOption('[data-testid=tl-b]', { label: 'Baseline v2' });
      const diff = await page.locator('[data-testid=tl-diff]').innerText();
      ok('RP-10', 'time layers compare two stages: the asset at PA-0007 and the baseline version change', /PA-0007: AS-0097 → AS-0112/.test(diff) && /baseline v— → v2|baseline v1 → v2/.test(diff), diff);
      ok('RP-11', 'the replay can be read as text', (await page.locator('details summary:has-text("Read the replay as text")').count()) === 1);
      await page.click('[data-testid=rp-apply]'); await page.waitForSelector('[data-testid=confirm-dialog]');
      ok('RP-12', 'applying a scenario asks for the room id to be typed', await page.locator('[data-testid=confirm-go]').isDisabled() && /Type R-ATL-4-218 to confirm/.test(await page.locator('[data-testid=confirm-dialog]').innerText()));
      await page.fill('[data-testid=confirm-name]', 'R-ATL-4-218'); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(150);
      const ws = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')));
      const job = ws.incidents.find((i) => /Replace the front camera at PA-0007/.test(i.title));
      ok('RP-13', 'the scenario opens a triaged ServiceHands job with a camera-replacement work order, and records it', !!job && job.state === 'TRIAGED' && ws.workOrders.some((x) => x.incidentId === job.id && x.workType === 'camera_replacement') && ws.events.some((e) => e.type === 'replay.scenario_applied'));
      await page.click('[data-testid=undo]'); await page.waitForTimeout(100);
      const ws2 = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')));
      ok('RP-14', 'Undo takes the scenario back', !ws2.incidents.some((i) => /Replace the front camera/.test(i.title)));
      await goto(page, '#/replay/R-ATL-4-220', 'designer');   // may open Core Replay (V2.5.3 area), holds no service.triage
      ok('RP-15', 'a room with a lighter history says its early life is not held, and offers no scenario control to a perspective without the authority', /Not held/.test(await text(page)) && (await page.locator('[data-testid=rp-apply]').count()) === 0);
      await goto(page, '#/replay/R-NOPE', 'designer');
      ok('RP-16', 'an unknown room says so with a way back', /Room not found/.test(await text(page)));
    }
    ok(`RP-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
