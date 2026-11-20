#!/usr/bin/env node
// Field Intelligence scan replay (#/v25/fi/scan/<room>): findings appear in sweep order, each with its provenance (KNOWN, INFERRED,
// SIMULATED; never "measured"); the policy limits are stated and an action beyond them is shown refused; the replay writes nothing
// (workspace and ledger unchanged); the step is kept in the address; audit mode adds sources; a finding becomes evidence only from a
// work order. At 390/768/1440, no errors.
//   node tests/browser/demo-fi-scan.test.mjs
import { suite } from './demo-ops-harness.mjs';
await suite('demo-fi-scan', 4485, async ({ ok, open, goto, over, text, smallTargets, clearState, VIEWPORTS }) => {
  for (const [w, hgt, tag] of VIEWPORTS) {
    const { ctx, page, errs, ext } = await open(w, hgt);
    await goto(page, '#/v25/fi/scan/R-ATL-4-218?mode=observe&step=0', 'syseng'); await clearState(page); await page.reload(); await page.waitForSelector('[data-testid=fiscan]');
    const before = await page.evaluate(() => localStorage.getItem('empathia.demo.workspace.v1'));
    ok(`FS-${tag}-01`, 'at step 0 nothing is observed yet, and the page says the replay never writes the evidence ledger', (await page.locator('[data-testid=fs-findings] .ops-prov').count()) === 0 && /never writes the evidence ledger/.test(await text(page)));
    await page.locator('[data-testid=fs-step]').fill('60'); await page.waitForTimeout(100);
    const f = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid=fs-findings] li')).map((li) => li.textContent));
    ok(`FS-${tag}-02`, 'at the end of the sweep every finding carries a provenance label', f.length >= 5 && f.every((x) => /^(KNOWN|INFERRED|SIMULATED)/.test(x)), JSON.stringify(f.slice(0, 3)));
    ok(`FS-${tag}-03`, 'no finding claims to be measured', !f.some((x) => /\bmeasured\b/i.test(x.replace(/no instrument was used/, ''))) , '');
    const pol = await page.locator('[data-testid=fs-policy]').innerText(); const acts = await page.locator('[data-testid=fs-actions]').innerText();
    ok(`FS-${tag}-04`, 'the policy limits are stated (pan ±30°, tilt −20° to +10°, −30 dBFS, 20 minutes, 4 actions)', /-30° to \+30°/.test(pol) && /-20° to \+10°/.test(pol) && /-30 dBFS/.test(pol) && /20 minutes/.test(pol) && /4 per session/.test(pol), pol);
    ok(`FS-${tag}-05`, 'a tilt beyond the limit is shown refused by the policy', /refused by policy: tilt/.test(acts), acts);
    await page.click('[data-testid=fs-play]'); await page.waitForTimeout(400); await page.click('[data-testid=fs-play]');
    ok(`FS-${tag}-06`, 'playing and moving the step write nothing (workspace unchanged)', before === await page.evaluate(() => localStorage.getItem('empathia.demo.workspace.v1')));
    ok(`FS-${tag}-07`, 'the step is in the address', /step=\d+/.test(page.url()));
    ok(`FS-${tag}-08`, 'no sideways scroll', (await over(page)) <= 0, await over(page));
    if (tag === 'phone') { const s = await smallTargets(page); ok(`FS-${tag}-09`, 'scan controls are at least 44 px tall on a phone', !s.length, s.join(' | ')); }
    if (tag === 'desktop') {
      await goto(page, '#/v25/fi/scan/R-ATL-4-218?mode=audit&step=60', 'syseng');
      ok('FS-10', 'audit mode adds each finding’s source and step', /source: installation record/.test(await text(page)));
      ok('FS-11', 'the page points to the open work order in the room for using a finding as evidence', /WO-0088/.test(await text(page)));
      await goto(page, '#/v25/fi/scan/R-NST-2-101?step=60', 'syseng');
      ok('FS-12', 'a room with no recorded positions says the scan has nothing to observe', /No device positions are recorded/.test(await text(page)));
      await goto(page, '#/v25/fi/scan/R-NONE', 'syseng');
      ok('FS-13', 'an unknown room offers the rooms that can be scanned', (await page.locator('.ops-job').count()) === 4);
      await goto(page, '#/v25/fi?room=R-ATL-4-218', 'syseng');
      ok('FS-14', 'the Field Intelligence page itself is unchanged by the scan route (still the native FI page)', !/(Scan: )/.test(await text(page)));
    }
    ok(`FS-${tag}-99`, 'no page error, no console error, no request leaves the page', !errs.length && !ext.length, [...errs, ...ext].slice(0, 3).join(' | '));
    await ctx.close();
  }
});
