#!/usr/bin/env node
// ServiceHands (#/servicehands): structured intake with validation, then one job through every stage by the roles that own each step —
// service manager assigns, the technician accepts, passes the preflight, writes notes, records evidence and attaches a Field Intelligence
// finding with its provenance, records the resolution and hands over; the commissioning engineer verifies (never the technician); the
// service manager closes through a named confirmation, and the closure says a closed ticket is not recommissioning; learning recommends a
// band and calls a lab competency evidence. At 390/768/1440, keyboard and no errors.
//   node tests/browser/demo-servicehands.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-servicehands', 4482, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/servicehands', 'service');   // the shell admits /servicehands to V2.5.3's servicehands roles; /servicehands/new to every staff role await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=servicehands]');
    ok(`SH-${tag}-01`, 'ServiceHands opens with its twelve stages and the job list; no sideways scroll', (await page.locator('.ops-strip li').count()) === 12 && (await page.locator('[data-testid=jobs] li').count()) >= 5 && (await over(page)) <= 0, await over(page));
    await goto(page, '#/servicehands/new', 'employee');
    await page.click('[data-testid=in-submit]'); await page.waitForTimeout(100);
    const inv = await page.evaluate(() => ({ n: document.querySelectorAll('[aria-invalid=true]').length, focus: document.activeElement?.getAttribute('aria-invalid'), described: Array.from(document.querySelectorAll('[aria-invalid=true]')).every((e) => document.getElementById(e.getAttribute('aria-describedby') || '')) }));
    ok(`SH-${tag}-02`, 'submitting an empty report shows each error by its field, links it (aria-describedby) and moves focus to the first', inv.n >= 3 && inv.focus === 'true' && inv.described, JSON.stringify(inv));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`SH-${tag}-03`, 'intake controls are at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    await page.selectOption('[data-testid=in-room]', 'R-ATL-4-218'); await page.selectOption('[data-testid=in-category]', 'audio');
    ok(`SH-${tag}-04`, 'choosing a category asks its guided troubleshooting questions', (await page.locator('[data-testid=troubleshoot] [role=radiogroup]').count()) === 3);
    await page.locator('[data-testid=troubleshoot] input[type=radio]').first().check();
    await page.fill('[data-testid=in-title]', 'Remote side hears an echo'); await page.click('[data-testid=in-submit]'); await page.waitForSelector('[data-testid=intake-done]');
    const done = await page.locator('[data-testid=intake-done] h2').innerText();
    ok(`SH-${tag}-05`, 'a valid report becomes an incident in the queue, and says nothing was sent outside the demonstration', /ISS-\d+ is in the service queue/.test(done) && /nothing has been sent/.test(await text(page)), done);
    if (tag === 'desktop') {
      // assign ISS-0421 (TRIAGED) on the dispatch board as the service manager
      await goto(page, '#/service?id=ISS-0421', 'svcmgr'); await page.waitForSelector('[data-testid=matching]');
      const first = await page.locator('[data-eligible=true]').first().getAttribute('data-candidate');
      ok('SH-06', 'the first-ranked person for the huddle-room camera job is Ana Reyes (based in Atlas, knows the room)', first === 'tech-ana', first);
      await page.locator('[data-eligible=true] [data-testid=assign]').first().click(); await page.waitForTimeout(150);
      const wo = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).incidents.find((i) => i.id === 'ISS-0421').workOrderId);
      // the technician
      await goto(page, `#/servicehands/wo/${wo}`, 'service'); await page.waitForSelector('[data-testid=tech-workspace]');
      ok('SH-07', 'the assigned technician sees their job with instructions, safety, tools, parts and escalation', /Instructions/.test(await text(page)) && /Safety/.test(await text(page)) && /Escalate to/.test(await text(page)));
      await page.click('[data-testid=accept]'); await page.waitForSelector('[data-testid=preflight]');
      await page.click('[data-testid=start]'); await page.waitForTimeout(120);
      ok('SH-08', 'starting with the preflight unchecked is refused with the failed checks named', /preflight has a failed check/.test(await page.locator('[data-testid=refusal]').innerText().catch(() => '')));
      for (const cb of await page.locator('[data-testid=preflight] input[type=checkbox]').all()) await cb.check();
      await page.click('[data-testid=start]'); await page.waitForTimeout(150);
      ok('SH-09', 'with the preflight passed the work starts (IN_PROGRESS)', /IN_PROGRESS/.test(await text(page)));
      await page.selectOption('select[aria-label="Kind of note"]', 'blocker'); await page.fill('[data-testid=note-text]', 'Ceiling tile above the camera is locked'); await page.click('[data-testid=note-add]'); await page.waitForTimeout(100);
      ok('SH-10', 'a blocker is recorded as an open blocker', /blocker · open/.test(await text(page)));
      await page.click('[data-testid=handover]'); await page.waitForTimeout(100);
      ok('SH-11', 'handing over with no evidence is refused', /no field evidence/.test(await page.locator('[data-testid=refusal]').innerText().catch(() => '')));
      await page.click('[data-testid=fi-attach] summary'); await page.locator('[data-testid=fi-attach-btn]').first().click(); await page.waitForTimeout(100);
      const evid = await page.locator('[data-testid=evidence]').innerText();
      ok('SH-12', 'a Field Intelligence finding is attached as evidence with its provenance label, never "measured"', /Field Intelligence finding · (KNOWN|SIMULATED|INFERRED)/.test(evid) && !/measured/i.test(evid), evid);
      await page.fill('[data-testid=ev-note]', 'Camera input re-mapped to the commissioned source (synthetic photo)'); await page.click('[data-testid=ev-add]'); await page.waitForTimeout(100);
      await page.selectOption('[data-testid=rc-code]', 'RC-CONFIG'); await page.fill('[data-testid=rc-root]', 'Codec video input changed by a firmware update'); await page.click('[data-testid=rc-save]'); await page.waitForTimeout(100);
      await page.click('[data-testid=handover]'); await page.waitForTimeout(120);
      ok('SH-13', 'with evidence the job goes to independent verification, and the technician is shown no Verify button', /VERIFYING/.test(await text(page)) && (await page.locator('[data-testid=verify]').count()) === 0);
      await goto(page, `#/servicehands/wo/${wo}`, 'cxeng'); await page.click('[data-testid=verify]'); await page.waitForTimeout(120);
      ok('SH-14', 'the commissioning engineer verifies the repair (RESOLVED)', /RESOLVED/.test(await text(page)));
      await goto(page, `#/servicehands/wo/${wo}`, 'svcmgr'); await page.waitForSelector('[data-testid=closure]');
      ok('SH-15', 'the closure says plainly that a closed ticket is not recommissioning, and routes broader changes to pending change management', /A closed ticket is not recommissioning/.test(await text(page)) && /pending change management/.test(await text(page)));
      await page.click('[data-testid=close]'); await page.waitForSelector('[data-testid=confirm-dialog]');
      ok('SH-16', 'closing asks for the incident id to be typed; the button stays disabled until it matches', await page.locator('[data-testid=confirm-go]').isDisabled());
      await page.fill('[data-testid=confirm-name]', 'ISS-0421'); await page.click('[data-testid=confirm-go]'); await page.waitForTimeout(150);
      ok('SH-17', 'after the named confirmation the incident is CLOSED and the learning step recommends a band and calls a lab competency evidence', /CLOSED/.test(await text(page)) && /Recommended Learn band L\d/.test(await text(page)) && /competency evidence/.test(await text(page)) && !/certif/i.test(await text(page)));
      const types = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.map((e) => e.type));
      ok('SH-18', 'every step is in the ledger (intake, dispatch, accept, preflight, blocker, FI evidence, evidence, resolution, verification, close)', ['service.intake', 'service.dispatch', 'service.accepted', 'service.preflight', 'service.blocker', 'service.fi_evidence', 'service.evidence', 'service.resolution', 'service.resolved', 'service.closed'].every((t) => types.includes(t)), JSON.stringify([...new Set(types)]));
      await goto(page, '#/servicehands/wo/WO-9999', 'svcmgr');
      ok('SH-19', 'an unknown work order says so with a way back, not a blank page', /Not found/.test(await text(page)));
    }
    if (tag === 'phone') {
      // the technician's workspace is the first thing on the page on a phone
      await goto(page, '#/servicehands/wo/WO-0088', 'svcmgr'); await page.waitForTimeout(100);
      ok(`SH-${tag}-20`, 'a work order page fits a phone with no sideways scroll', (await over(page)) <= 0, await over(page));
    }
    ok(`SH-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
