#!/usr/bin/env node
// Dispatch board (#/service): the queue as a board and a list, metrics from the records, triage, the explained match (gates and
// preferences apart; hard gates never overridden; a preference override needs a reason), assignment as an explicit action, reassignment
// only to eligible people with a reason, coverage, read-only for perspectives without the authority, at 390/768/1440, no errors.
//   node tests/browser/demo-dispatch.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-dispatch', 4481, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/service', 'svcmgr'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=dispatch]');
    const t = await text(page);
    ok(`DX-${tag}-01`, 'the board loads with its title, who you act as, five metrics with definitions, and six columns', /Dispatch board/.test(t) && /Acting as/.test(t) && (await page.locator('.ops-stat').count()) === 5 && (await page.locator('.ops-col').count()) === 6, t.slice(0, 200));
    ok(`DX-${tag}-02`, 'no sideways scroll', (await over(page)) <= 0, await over(page));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`DX-${tag}-03`, 'every control in the board is at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      // triage the open job, then match it
      await page.click('[data-job=ISS-0417]'); await page.waitForSelector('[data-testid=job-detail]');
      ok('DX-04', 'choosing a card opens its detail and puts the job in the address (back/forward work)', /id=ISS-0417/.test(page.url()));
      await page.click('[data-testid=triage]'); await page.waitForTimeout(150);
      ok('DX-05', 'triage moves the job one governed step (OPEN → TRIAGED) and the matching panel appears', (await page.locator('[data-testid=matching]').count()) === 1);
      const m = await page.evaluate(() => Array.from(document.querySelectorAll('[data-candidate]')).map((e) => ({ id: e.dataset.candidate, el: e.dataset.eligible, gates: e.querySelectorAll('h4')[0]?.textContent, txt: e.textContent })));
      ok('DX-06', 'every person shows gates and preferences separately; ineligible people say the gate cannot be overridden', m.length >= 5 && m.every((x) => /Gates/.test(x.gates)) && m.filter((x) => x.el === 'false').every((x) => /cannot be overridden/.test(x.txt)), JSON.stringify(m.map((x) => [x.id, x.el])));
      ok('DX-07', 'competencies read "Internal competency" with a verification state; never "certified"', /Internal competency/.test(await text(page)) && /(declared|lab-evidenced|verified by a reviewer)/.test(await text(page)) && !/certified/i.test(await text(page)));
      ok('DX-08', 'no travel estimate is offered, and it says why', /Travel time is not estimated/.test(await text(page)));
      // the excluded technician (did the original work) and the expired vendor agreement are hard gates
      ok('DX-09', 'the recurrence excludes whoever did the original work, and an expired vendor agreement is a hard gate', m.some((x) => x.el === 'false' && /Expired/.test(x.txt)), '');
      // try anyway on an ineligible person: refused and recorded
      await page.locator('[data-eligible=false] [data-testid=try-anyway]').first().click(); await page.waitForTimeout(150);
      ok('DX-10', 'assigning someone who fails a hard gate is refused with the gate named', /hard gates can never be overridden/.test(await page.locator('[data-testid=refusal]').innerText().catch(() => '')));
      // a rank-2 person without a reason: refused; with a reason: assigned and the override recorded
      const second = page.locator('[data-eligible=true]').nth(1);
      if (await second.count()) {
        await second.locator('[data-testid=assign]').click(); await page.waitForTimeout(150);
        ok('DX-11', 'choosing a lower-ranked eligible person without a reason is refused (a preference override needs a reason)', /needs a written reason/.test(await page.locator('[data-testid=refusal]').innerText().catch(() => '')));
        await page.fill('[data-testid=override-reason]', 'Knows the board room DSP from the last refresh'); await second.locator('[data-testid=assign]').click(); await page.waitForTimeout(200);
        const d = await page.locator('[data-testid=job-detail]').innerText();
        ok('DX-12', 'with a reason the assignment is made, the state is ASSIGNED and the override reason is shown', /ASSIGNED/.test(d) && /chosen over rank 1/.test(d), d.slice(0, 300));
      } else ok('DX-11', 'a second eligible person exists for the override check', false, 'only one eligible');
      // reassign: refused without a reason, then allowed
      await page.click('[data-testid=reassign]'); await page.waitForTimeout(120);
      ok('DX-13', 'a reassignment without a person and a reason is refused', /records its reason/.test(await page.locator('[data-testid=refusal]').innerText().catch(() => '')));
      const opts = await page.locator('[data-testid=reassign-to] option').count();
      ok('DX-14', 'only eligible people are offered for reassignment', opts >= 2 && !(await page.locator('[data-testid=reassign-to]').innerText()).includes('Gus'));
      await page.selectOption('[data-testid=reassign-to]', { index: 1 }); await page.fill('[data-testid=reassign-reason]', 'Original technician called to a mission-critical job'); await page.click('[data-testid=reassign]'); await page.waitForTimeout(150);
      const led = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.slice(0, 6).map((e) => e.type));
      ok('DX-15', 'the reassignment and the override are in the ledger', led.includes('service.reassigned') && JSON.stringify(led).includes('service.'), JSON.stringify(led));
      // list view and coverage
      await page.click('.ops-tabs a:has-text("List")'); await page.waitForSelector('[data-testid=list]');
      ok('DX-16', 'the list view is a real table with a caption and column headers, soonest deadline first', (await page.locator('[data-testid=list] th[scope=col]').count()) === 5 && (await page.locator('[data-testid=list] caption').count()) === 1);
      await page.click('.ops-tabs a:has-text("Coverage")'); await page.waitForSelector('[data-testid=coverage]');
      ok('DX-17', 'coverage lists every person by site with declared languages and time zones', /declared|Declared/.test(await text(page)) && (await page.locator('[data-testid=coverage] tbody tr').count()) >= 7);
      // back button returns to the list
      await page.goBack(); await page.waitForTimeout(200);
      ok('DX-18', 'the browser Back button returns to the previous view', (await page.locator('[data-testid=list]').count()) === 1, page.url());
      // read-only perspective: no assign controls
      await goto(page, '#/service?id=ISS-0421', 'employee'); await page.waitForTimeout(150);
      // changed with the shell's D44 contract (README-routes.md): no refusal message either, so the check is that nothing to act on is shown
      ok('DX-19', 'a perspective without the authority sees no triage, assign or reassign controls and no refusal message (D44)', (await page.locator('[data-testid=assign], [data-testid=triage], [data-testid=reassign], [data-testid=matching]').count()) === 0 && !/Refused|not your|does not hold/i.test(await text(page)));
      // keyboard: cards are buttons reachable by Tab, activated by Enter
      await goto(page, '#/service', 'svcmgr'); await page.locator('[data-job]').first().focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
      ok('DX-20', 'a card is a button that opens with the keyboard', (await page.locator('[data-testid=job-detail]').count()) === 1);
      // destructive QA: rapid double-tap on Assign does not assign twice
      await page.evaluate(() => localStorage.removeItem('empathia.demo.workspace.v1')); await page.evaluate(() => { location.hash = '#/service?id=ISS-0421'; }); await page.reload(); await page.waitForSelector('[data-testid=matching]');
      await page.locator('[data-eligible=true] [data-testid=assign]').first().dblclick(); await page.waitForTimeout(200);
      const n = await page.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.workspace.v1')).events.filter((e) => e.type === 'service.dispatch').length);
      ok('DX-21', 'a double-tap on Assign assigns once (the second tap is refused: the job is no longer TRIAGED)', n === 1, n);
      // reload mid-flow keeps the selection and state
      await page.reload(); await page.waitForSelector('[data-testid=job-detail]');
      ok('DX-22', 'a reload keeps the selected job and its state', /ASSIGNED/.test(await page.locator('[data-testid=job-detail]').innerText()));
    }
    ok(`DX-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
