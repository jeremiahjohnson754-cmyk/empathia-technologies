#!/usr/bin/env node
// Learn labs (#/learn/labs): the three instrument labs and the SIGNAL fault labs list; the Audio Lab plays only on a press and processes
// live; each instrument lab's fault is fixed to every check and recorded as competency evidence (never a credential); a signal-flow lab
// is solved by patching, setting a gain and doing the math; a lab of another kind runs as an honest calculation check; the clock never
// fails a lab; clearing results is a named, undoable action; a lost SIGNAL library says so with Try again. At 390/768/1440, no errors.
//   node tests/browser/learn-labs.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('learn-labs', 4488, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  const range = (page, id, v) => page.locator(`[data-testid=${id}]`).fill(String(v));
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/learn/labs', 'service'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=signal-labs] [data-lab]', { timeout: 10000 });
    ok(`LL-${tag}-01`, 'the labs page lists three instrument labs and every SIGNAL lab, and says passing is competency evidence', (await page.locator('[data-testid=instruments] [data-lab]').count()) === 3 && (await page.locator('[data-testid=signal-labs] [data-lab]').count()) === 91 && /competency evidence/.test(await text(page)) && !/certif/i.test(await text(page)));
    ok(`LL-${tag}-02`, 'no sideways scroll', (await over(page)) <= 0, await over(page));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`LL-${tag}-03`, 'lab list controls are at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      await page.click('.ops-tabs a:has-text("Signal flow")'); await page.waitForTimeout(100);
      ok('LL-04', 'the list filters by kind of lab', (await page.locator('[data-testid=signal-labs] [data-lab]').count()) === 26);
      // Audio Lab
      await goto(page, '#/learn/labs/hear', 'service');
      ok('LL-05', 'nothing plays until a source is pressed', /Nothing is playing/.test(await text(page)));
      await page.click('[data-testid=al-voice]'); await page.waitForTimeout(500);
      const meter = await page.locator('[data-testid=al-meter]').innerText();
      ok('LL-06', 'pressing a source processes it live: the output meter reads a level', /RMS -?\d/.test(meter), meter);
      await page.click('[data-testid=lab-test]'); await page.waitForTimeout(100);
      ok('LL-07', 'testing before the fix is recorded as an attempt, not a pass', /Recorded as an attempt/.test(await page.locator('[data-testid=lab-said]').innerText()));
      await page.check('[data-testid=al-hpf-on]'); await range(page, 'al-hpf', 100); await range(page, 'al-band-0', 0); await range(page, 'al-band-2', 4); await range(page, 'al-out', -2);
      ok('LL-08', 'with the fix every check of the Audio Lab passes', !(await page.locator('[data-testid=lab-checks] .ops-fail').count()));
      await page.click('[data-testid=al-stop]'); await page.click('[data-testid=lab-test]'); await page.waitForTimeout(100);
      ok('LL-09', 'the pass is recorded as competency evidence', /competency evidence/.test(await page.locator('[data-testid=lab-said]').innerText()));
      // Camera Lab
      await goto(page, '#/learn/labs/see', 'service');
      await page.selectOption('[data-testid=cl-shutter]', '120'); await page.selectOption('[data-testid=cl-iris]', '2.8'); await range(page, 'cl-gain', 6); await range(page, 'cl-wb', 4000);
      ok('LL-10', 'the Camera Lab fault is fixable to every check (no banding, blur, exposure, gain, white balance)', !(await page.locator('[data-testid=lab-checks] .ops-fail').count()), await page.locator('[data-testid=lab-checks]').innerText());
      // Lighting Lab
      await goto(page, '#/learn/labs/light', 'service');
      await page.click('[data-testid=ll-key]'); await range(page, 'll-dmx', 128); await range(page, 'll-dist', 2.5);
      await page.click('[data-testid=ll-fill]'); await range(page, 'll-dmx', 108); await range(page, 'll-dist', 3); await range(page, 'll-cct', 5600);
      ok('LL-11', 'the Lighting Lab fault is fixable to every check (face level, key-to-fill, one colour, spill)', !(await page.locator('[data-testid=lab-checks] .ops-fail').count()), await page.locator('[data-testid=lab-checks]').innerText());
      // a signal-flow lab
      await goto(page, '#/learn/labs/LAB-SF-01', 'service'); await page.waitForSelector('[data-testid=signal-lab]');
      // LAB-SF-01 as given: the room already reads within range; the stream encoder is empty (corrected expectation: the lab data, not the brief text, decides)
      ok('LL-12', 'a signal-flow lab starts with a target failing (the stream encoder hears nothing)', (await page.locator('[data-testid=sf-targets] .ops-fail').count()) >= 1 && /Stream encoder/.test(await page.locator('[data-testid=sf-targets] .ops-fail').first().innerText()));
      await page.selectOption('[data-testid=sf-from]', 'main'); await page.selectOption('[data-testid=sf-to]', 'pp'); await page.click('[data-testid=sf-patch]');
      ok('LL-13', 'a backward patch (bus → processor) is refused with the reason', /signal runs from sources/.test(await text(page)));
      for (const f of ['pp', 'lp', 'bp']) { await page.selectOption('[data-testid=sf-from]', f); await page.selectOption('[data-testid=sf-to]', 'strm'); await page.click('[data-testid=sf-patch]'); }
      await page.fill('[data-testid=sf-gain-pp]', '32'); await page.fill('[data-testid=sf-math-0]', '32'); await page.fill('[data-testid=sf-math-1]', '-13.2');
      ok('LL-14', 'patching the three sources into the stream bus, setting the preamp and doing the math meets every target', !(await page.locator('[data-testid=sf-targets] .ops-fail').count()) && /Right\./.test(await text(page)));
      await page.click('[data-testid=lab-test]'); await page.waitForTimeout(100);
      ok('LL-15', 'the solved lab is recorded as passed', /Passed and recorded/.test(await page.locator('[data-testid=lab-said]').innerText()));
      ok('LL-16', 'the clock is a guide, never a gate', /a guide, never a gate/.test(await text(page)));
      // another kind: calculation check, honestly labelled
      await goto(page, '#/learn/labs/PHY-S01E01', 'service'); await page.waitForSelector('[data-testid=signal-lab]');
      ok('LL-17', 'a lab whose simulator is not rebuilt says so and runs its calculation check', (await page.locator('[data-testid=calc-only]').count()) === 1);
      // ledger + dispatch: lab evidence shows on the technician's competency state; it does not change any gate
      const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.filter((e) => e.type === 'training.lab_completed').map((e) => e.detail));
      ok('LL-18', 'each recorded result is in the ledger as competency evidence, never a credential or an authorization', ev.length >= 3 && ev.every((d) => /never a credential or an authorization/.test(d)), JSON.stringify(ev.slice(0, 2)));
      // clear results (named, undoable)
      await goto(page, '#/learn/labs', 'service'); await page.click('[data-testid=labs-reset]'); await page.waitForSelector('[data-testid=confirm-dialog]');
      ok('LL-19', 'clearing results asks for the name to be typed', await page.locator('[data-testid=confirm-go]').isDisabled());
      await page.fill('[data-testid=confirm-name]', 'clear results'); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(100);
      const cleared = /\b0\b lab\(s\) passed/.test(await text(page)); await page.click('[data-testid=undo]'); await page.waitForTimeout(100);
      ok('LL-20', 'the results are cleared, and Undo brings them back', cleared && /\b[1-9]\d* lab\(s\) passed/.test(await text(page)));
      // lost library
      await ctx.route(/signal-lib\.json/, (r) => r.abort('failed'));
      const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message)); await p2.goto(page.url().replace(/#.*/, '#/learn/labs')); await p2.waitForSelector('[data-testid=lib-error]', { timeout: 8000 }).catch(() => {});
      ok('LL-21', 'when the SIGNAL library cannot load, the page says so, keeps the instrument labs and offers Try again', (await p2.locator('[data-testid=lib-error] button').count()) === 1 && (await p2.locator('[data-testid=instruments] [data-lab]').count()) === 3 && !e2.length);
      await ctx.unroute(/signal-lib\.json/); await p2.click('[data-testid=lib-error] button'); await p2.waitForSelector('[data-testid=signal-labs] [data-lab]', { timeout: 8000 }).catch(() => {});
      ok('LL-22', 'Try again loads the library once the network is back', (await p2.locator('[data-testid=signal-labs] [data-lab]').count()) === 91);
      await p2.close();
    }
    ok(`LL-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.filter((e) => !/Failed to load resource/.test(e)).length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
