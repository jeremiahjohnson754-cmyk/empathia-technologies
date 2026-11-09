#!/usr/bin/env node
// Decisions: the Decision desk (#/v25/decisions) on the project-governance engine — approve, hold (reason + future review date), reject
// (reason + named confirmation), segregation of duties (the brief's author cannot approve it), a decision requested from another
// approver, funding as a separate finance signature bound to the scope revision, field readiness needing both — and Decision Memory
// (#/decisions): record with a required rationale, withdraw your own with Undo. At 390/768/1440, no errors.
//   node tests/browser/demo-decisions.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-decisions', 4483, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  const refusal = (page) => page.locator('[data-testid=refusal]').innerText().catch(() => '');
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/v25/decisions', 'exec'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=decisions]');
    ok(`DC-${tag}-01`, 'the Decision desk lists pending projects, projects awaiting funding and field readiness; no sideways scroll', (await page.locator('[data-testid=pending] [data-project]').count()) === 2 && (await page.locator('[data-testid=to-fund] [data-project]').count()) === 1 && (await over(page)) <= 0, await over(page));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`DC-${tag}-02`, 'every desk control is at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      const atlas = page.locator('[data-project=PRJ-ATLAS-AV]'); const twn = page.locator('[data-project=PRJ-NST-TWN]');
      await twn.locator('[data-testid=dec-approve]').click(); await page.waitForTimeout(100);
      ok('DC-03', 'the sponsor who wrote the brief cannot approve it (segregation of duties)', /authored the brief/.test(await refusal(page)), await refusal(page));
      await atlas.locator('[data-testid=dec-hold]').click(); await page.waitForTimeout(100);
      ok('DC-04', 'a hold without a reason and a review date is refused with both named', /a hold needs a reason/.test(await refusal(page)) && /review date/.test(await refusal(page)));
      await atlas.locator('[data-testid=dec-reason]').fill('Wait for the network survey'); await atlas.locator('[data-testid=dec-review]').fill('2020-01-01'); await atlas.locator('[data-testid=dec-hold]').click(); await page.waitForTimeout(100);
      ok('DC-05', 'a hold with a review date in the past is refused', /must be in the future/.test(await refusal(page)));
      await twn.locator('[data-testid=dec-reject]').click(); await page.waitForTimeout(100);
      ok('DC-06', 'a rejection without a reason is refused before any confirmation', /a reason is required/.test(await refusal(page)) && (await page.locator('[data-testid=confirm-dialog]').count()) === 0);
      await twn.locator('[data-testid=dec-reason]').fill('Out of scope for this financial year'); await twn.locator('[data-testid=dec-reject]').click(); await page.waitForSelector('[data-testid=confirm-dialog]');
      const dlg = await page.locator('[data-testid=confirm-dialog]').innerText();
      ok('DC-07', 'rejecting asks for the project id to be typed and says it cannot be undone', /Type PRJ-NST-TWN to confirm/.test(dlg) && /cannot be undone/.test(dlg) && await page.locator('[data-testid=confirm-go]').isDisabled(), dlg.slice(0, 200));
      await page.fill('[data-testid=confirm-name]', 'PRJ-NST-TWN'); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(150);
      ok('DC-08', 'after the named confirmation the project is REJECTED and the decision is in the log with its scope revision', /REJECTED/.test(await page.locator('[data-testid=decision-log]').innerText()) && /rev 1/.test(await page.locator('[data-testid=decision-log]').innerText()));
      await atlas.locator('[data-testid=dec-approve]').click(); await page.waitForTimeout(100);
      ok('DC-09', 'the executive approves the Atlas refresh as pitched; field readiness then says approved, not funded', /approved, not funded/.test(await page.locator('[data-testid=readiness]').innerText()));
      ok('DC-10', 'the executive is not offered the funding signature (D44)', (await page.locator('[data-testid=fund]').count()) === 0);
      await goto(page, '#/v25/decisions', 'architect');
      const cam = page.locator('[data-project=PRJ-ATL-CAM]'); await cam.locator('[data-testid=fund-cc]').fill('CC-4100'); await cam.locator('[data-testid=fund-rev]').fill('2'); await cam.locator('[data-testid=fund]').click(); await page.waitForTimeout(100);
      ok('DC-11', 'funding that names another scope revision is refused', /funding names scope revision 2/.test(await refusal(page)), await refusal(page));
      await cam.locator('[data-testid=fund-rev]').fill('1'); await cam.locator('[data-testid=fund]').click(); await page.waitForTimeout(100);
      ok('DC-12', 'funding bound to the approved scope revision makes the project field-ready', /approved and funded for scope revision 1/.test(await page.locator('[data-testid=readiness]').innerText()));
      await page.locator('[data-project=PRJ-ATLAS-AV]').count();
      // Decision Memory
      await goto(page, '#/decisions', 'syseng'); await page.click('[data-testid=mem-new]');
      await page.fill('[data-testid=mem-name]', 'Use one retest visit'); await page.click('[data-testid=mem-save]'); await page.waitForTimeout(100);
      ok('DC-13', 'a decision without a rationale is refused', /rationale is required/.test(await refusal(page)));
      await page.fill('[data-testid=mem-why]', 'One visit keeps the boardroom open for the board review.'); await page.click('[data-testid=mem-save]'); await page.waitForTimeout(100);
      const mine = page.locator('[data-memory^=DEC-U]');
      ok('DC-14', 'with a rationale the decision is recorded, marked as recorded in this demonstration', (await mine.count()) === 1 && /recorded in this demonstration/.test(await mine.innerText()));
      ok('DC-15', 'you may withdraw only what you recorded: the seeded decision by the architect offers no withdraw button to the systems engineer', (await page.locator('[data-memory=DEC-0003] [data-testid=mem-withdraw]').count()) === 0);
      await mine.locator('[data-testid=mem-withdraw]').click(); await page.waitForSelector('[data-testid=confirm-dialog]');
      await page.keyboard.press('Escape'); await page.waitForTimeout(80);
      ok('DC-16', 'Escape closes the confirmation with nothing changed and focus back on the button that opened it', (await mine.count()) === 1 && await page.evaluate(() => document.activeElement?.dataset.testid === 'mem-withdraw'));
      await mine.locator('[data-testid=mem-withdraw]').click(); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(100);
      ok('DC-17', 'withdrawing removes it and offers Undo', (await mine.count()) === 0 && (await page.locator('[data-testid=undo]').count()) === 1);
      await page.click('[data-testid=undo]'); await page.waitForTimeout(100);
      ok('DC-18', 'Undo restores the withdrawn decision', (await page.locator('[data-memory^=DEC-U]').count()) === 1);
      // damaged storage: the page still opens (from the seed)
      await page.evaluate(() => localStorage.setItem('empathia.demo.decisions.v1', '{not json')); await page.reload(); await page.waitForSelector('[data-testid=decisions]');
      ok('DC-19', 'damaged saved decisions do not break the page: it opens from the seed', (await page.locator('[data-memory]').count()) === 3);
      await goto(page, '#/v25/decisions', 'employee');
      // changed with the shell's D44 contract: no refusal message, so the check is that no decision control is shown
      // 2026-11-09: the check now also requires the owl page at this address. Before, the harness left the employee on its own home after
      // the role switch (see goto in demo-ops-harness.mjs), so this line read Mission Control's change feed, not the Decision desk address.
      ok('DC-20', 'a perspective without project.decide sees no decision controls and no refusal message (D44): the owl page, not the desk', (await page.locator('[data-testid=dec-approve], [data-testid=dec-reject], [data-testid=dec-hold], [data-testid=fund], [data-testid=decisions], [data-testid=refusal]').count()) === 0 && (await page.locator('[data-testid=access-page]').count()) === 1 && /#\/v25\/decisions/.test(page.url()) && !/Refused|does not hold/i.test(await text(page)), page.url());
    }
    ok(`DC-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
