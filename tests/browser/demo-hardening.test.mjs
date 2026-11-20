#!/usr/bin/env node
// Hardening of the operational workspaces: each is its own file; when one fails to load the page shows a named alert (role=alert, the
// workspace's name) with Try again, which fetches it again at a fresh URL and recovers; a second failure also offers a reload; a drawing
// failure is caught by the same guard; the rest of the demonstration keeps working; every workspace address opens with one h1 and no
// console error at 390/768/1440; damaged saved data does not break a workspace; back/forward between workspaces work.
//   node tests/browser/demo-hardening.test.mjs
import { suite } from './demo-ops-harness.mjs';
const WS = [['#/service', 'Dispatch board', 'dispatch'], ['#/servicehands', 'ServiceHands', 'servicehands'], ['#/replay/R-ATL-4-218', 'Core Replay', 'replay'], ['#/v25/fi/scan/R-ATL-4-218', 'Field Intelligence scan', 'fiscan'], ['#/v25/decisions', 'Decisions', 'decisions'], ['#/learn/labs', 'Learn labs', 'labs'], ['#/hardening', 'Resilience', 'resilience']];
await suite('demo-hardening', 4487, async ({ ok, open, goto, over, base, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    // sw: false — this suite injects chunk-load failures with route(), which the offline worker would answer from its saved copy (demo-ops-harness.mjs)
    const { ctx, page, errs, ext } = await open(w, hgt, { sw: false, allow: /Failed to load resource|demonstration: a drawing failure|The above error occurred/ });
    for (const [href, name] of WS) {
      await goto(page, href, 'svcmgr');
      const v = await page.evaluate(() => ({ h1: document.querySelectorAll('main h1').length, fail: !!document.querySelector('[data-testid=workspace-failure]'), over: document.documentElement.scrollWidth - innerWidth }));
      ok(`HZ-${tag}-${name}`, `${name} opens with one h1, no failure and no sideways scroll`, v.h1 === 1 && !v.fail && v.over <= 0, JSON.stringify(v));
    }
    if (tag === 'desktop') {
      // chunk-load failure → named alert → Try again recovers (fresh URL)
      let n = 0; const urls = [];
      await ctx.route(/\/ws\/decisions\.js/, (r) => { n++; urls.push(r.request().url()); return n <= 1 ? r.abort('failed') : r.continue(); });
      const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
      await p2.goto(base + '#/v25/decisions'); await p2.waitForSelector('[data-testid=workspace-failure]', { timeout: 8000 }).catch(() => {});
      const alert = await p2.evaluate(() => { const a = document.querySelector('[data-testid=workspace-failure] [role=alert]'); return a ? a.textContent : ''; });
      ok('HZ-01', 'a workspace that fails to load shows a named alert (role=alert) saying which part failed and that nothing was lost', /Decisions could not load/.test(alert) && /Nothing you did here was lost/.test(alert), alert);
      ok('HZ-02', 'the alert offers Try again and the way back to the start, and the shell around it still works', (await p2.locator('[data-testid=workspace-retry]').count()) === 1 && (await p2.locator('a:has-text("Back to the start")').count()) >= 1 && (await p2.locator('.persp select').count()) === 1);
      await p2.locator('[data-testid=workspace-retry]').focus(); await p2.keyboard.press('Enter'); await p2.waitForSelector('[data-testid=decisions]', { timeout: 8000 }).catch(() => {});
      ok('HZ-03', 'Try again (by keyboard) fetches the workspace again at a fresh URL and it opens', (await p2.locator('[data-testid=decisions]').count()) === 1 && urls.length === 2 && urls[0] !== urls[1] && /retry=1/.test(urls[1]), JSON.stringify(urls));
      ok('HZ-04', 'the failed load raised no page error', !errs2.length, errs2.join(' | '));
      await p2.close(); await ctx.unroute(/\/ws\/decisions\.js/);
      // two failures → reload offered
      await ctx.route(/\/ws\/replay\.js/, (r) => r.abort('failed'));
      const p3 = await ctx.newPage(); await p3.goto(base + '#/replay'); await p3.waitForSelector('[data-testid=workspace-failure]', { timeout: 8000 }).catch(() => {});
      await p3.click('[data-testid=workspace-retry]'); await p3.waitForTimeout(400);
      ok('HZ-05', 'after a second failure the alert counts the tries and also offers a reload', /Tried 2 times/.test(await p3.locator('[data-testid=workspace-failure]').innerText().catch(() => '')) && (await p3.locator('button:has-text("Reload the page")').count()) === 1);
      await p3.evaluate(() => { location.hash = '#/v25/service'; }); await p3.waitForTimeout(300);
      ok('HZ-06', 'the rest of the demonstration keeps working while one workspace is unreachable', /Service queue|Assigned jobs/.test(await p3.locator('main h1').innerText()));
      await p3.close(); await ctx.unroute(/\/ws\/replay\.js/);
      // drawing failure caught
      await goto(page, '#/hardening', 'svcmgr'); await page.click('[data-testid=boom]'); await page.waitForTimeout(150);
      ok('HZ-07', 'a drawing failure is caught: a named alert replaces the workspace, with Try again', /Resilience stopped working/.test(await page.locator('main').innerText()) && (await page.locator('[data-testid=workspace-retry]').count()) === 1);
      await page.click('[data-testid=workspace-retry]'); await page.waitForTimeout(150);
      ok('HZ-08', 'Try again re-mounts the workspace', (await page.locator('[data-testid=resilience]').count()) === 1);
      ok('HZ-09', 'the resilience page lists every destructive action with its safeguard', (await page.locator('[data-testid=safeguards] tbody tr').count()) >= 8);
      // damaged data
      await page.evaluate(() => { localStorage.setItem('empathia.demo.labs.v1', '[[['); localStorage.setItem('empathia.demo.decisions.v1', 'null'); });
      for (const [href, name] of [['#/learn/labs', 'labs'], ['#/v25/decisions', 'decisions']]) { await goto(page, href, 'svcmgr'); ok(`HZ-10-${name}`, `damaged saved ${name} do not break the workspace`, (await page.locator('[data-testid=workspace-failure]').count()) === 0 && (await page.locator('main h1').count()) === 1); }
      // back / forward between workspaces
      await goto(page, '#/service', 'svcmgr'); await page.evaluate(() => { location.hash = '#/replay'; }); await page.waitForSelector('[data-testid=replay-home]');
      await page.goBack(); await page.waitForSelector('[data-testid=dispatch]', { timeout: 5000 }).catch(() => {});
      ok('HZ-11', 'Back returns to the previous workspace', (await page.locator('[data-testid=dispatch]').count()) === 1);
      await page.goForward(); await page.waitForSelector('[data-testid=replay-home]', { timeout: 5000 }).catch(() => {});
      ok('HZ-12', 'Forward returns again', (await page.locator('[data-testid=replay-home]').count()) === 1);
      // CSP and no inline script in the built page
      const r = await page.request.get(base); const csp = r.headers()['content-security-policy'] || ''; const html = await r.text();
      ok('HZ-13', 'the page is served under the CSP with scripts from self only, and loads one module script, no inline script', /script-src 'self'/.test(csp) && /<script type="module" src="demo.js"><\/script>/.test(html) && !/<script>(?!<\/script>)/.test(html), csp);
    }
    ok(`HZ-${tag}-99`, 'no page error, no unexpected console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
