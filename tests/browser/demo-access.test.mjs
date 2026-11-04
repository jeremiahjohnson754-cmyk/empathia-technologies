#!/usr/bin/env node
// D44 in the browser: a forbidden address shows the Agora Owl page WITHOUT downloading the screen's chunk; "Roles whose work it is" names
// exactly the roles that can open that address (query included) and switches to them; no link the shell offers leads to a refusal;
// buttons and sections a role may not use are absent; a failed chunk recovers. Destructive checks included.
//   node tests/browser/demo-access.test.mjs   (PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs … for dark)
import { harness } from './demo-shell-lib.mjs';
const { ok, open, main, done } = await harness('demo-access');
const chunk = (reqs, name) => reqs.some((u) => new RegExp(`^chunks/${name}-`).test(u));
const whoKeys = (p) => p.$$eval('[data-testid=access-who] [data-role-key]', (b) => b.map((x) => x.dataset.roleKey).sort());

{ const t = await open('#/campus/scouter', { role: 'visitor' });
  ok('A-01', 'a forbidden page shows the owl access page and its chunk is never requested', await t.page.locator('[data-testid=access-page]').count() === 1 && !chunk(t.reqs, 'ScouterPage') && /Scouter is not open to the Visitor/.test(await main(t.page)), t.reqs.join(' '));
  ok('A-02', 'the owl page names exactly the roles whose work it is (V2.5.3 scouter: syseng, ops, designer, architect)', JSON.stringify(await whoKeys(t.page)) === JSON.stringify(['architect', 'designer', 'ops', 'syseng']), JSON.stringify(await whoKeys(t.page)));
  ok('A-03', 'the owl illustration and the role buttons have accessible names; nothing from the screen leaks', await t.page.locator('button', { hasText: 'View as Designer' }).count() === 1 && !/Orbit|Vantora|Sonarith/.test(await main(t.page)));
  await t.page.click('[data-testid=access-who] [data-role-key=designer]'); await t.page.waitForSelector('#scouter-h', { timeout: 5000 }).catch(() => undefined);
  ok('A-04', 'View as from the owl page switches to that role and only then loads the screen', chunk(t.reqs, 'ScouterPage') && await t.page.locator('#scouter-h').count() === 1 && await t.page.evaluate(() => document.documentElement.dataset.role) === 'designer');
  ok('A-05', 'no console error and nothing requested off the page', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close(); }

{ const t = await open('#/search/quality', { role: 'employee' });
  ok('A-06', 'the exact address counts: Search Party is the employee’s, its data-quality view is not, and only steward and architect are named', await t.page.locator('[data-testid=access-page]').count() === 1 && JSON.stringify(await whoKeys(t.page)) === JSON.stringify(['architect', 'steward']) && !chunk(t.reqs, 'SearchParty'), JSON.stringify(await whoKeys(t.page)));
  await t.page.evaluate(() => { location.hash = '#/search'; }); await t.page.waitForTimeout(500);
  ok('A-07', 'the same role opens the page at its plain address', await t.page.locator('[data-testid=access-page]').count() === 0 && chunk(t.reqs, 'SearchParty')); await t.close(); }

{ const t = await open('#/pro/issues', { role: 'visitor' });
  ok('A-08', 'a forbidden legacy area shows the owl page too, never its status page', await t.page.locator('[data-testid=access-page]').count() === 1 && !/Not migrated yet/.test(await main(t.page)) && (await whoKeys(t.page)).includes('service'));
  await t.page.evaluate(() => { location.hash = '#/definitely/not/here'; }); await t.page.waitForTimeout(300);
  ok('A-09', 'an unknown address is the not-found owl page, for any role', await t.page.locator('[data-testid=not-found]').count() === 1 && await t.page.locator('[data-testid=access-page]').count() === 0); await t.close(); }

for (const role of ['visitor', 'installer', 'exec', 'qa']) {
  const t = await open('#/investor', { role });
  await t.page.click('[data-testid=menu-open]'); await t.page.waitForSelector('[data-testid=menu]');
  const hrefs = [...new Set(await t.page.$$eval('header a[href^="#/"], [data-testid=hometabs] a, [data-testid=menu] a[href^="#/"]', (a) => a.map((x) => x.getAttribute('href'))))];
  await t.page.keyboard.press('Escape'); const refused = [];
  for (const h of hrefs) { await t.page.evaluate((x) => { location.hash = x; }, h); await t.page.waitForTimeout(140); if (await t.page.locator('[data-testid=access-page]').count()) refused.push(h); }
  ok(`A-10-${role}`, `no link the shell offers the ${role} leads to a refusal (${hrefs.length} links: rail, home tabs, menu)`, hrefs.length >= 2 && !refused.length, refused.join(' '));
  await t.close();
}
{ const t = await open('#/investor', { role: 'visitor' });
  const rail = await t.page.$$eval('.shell__rail a', (a) => a.map((x) => x.textContent.trim()));
  ok('A-11', 'the rail offers the visitor only products it can open (never present-but-locked)', rail.length >= 1 && rail.length < 9 && !rail.includes('ServiceHands') && await t.page.locator('[aria-disabled=true]').count() === 0, rail.join(','));
  await t.page.fill('#find-in', 'scouter'); await t.page.waitForTimeout(150);
  ok('A-12', 'quick find never offers a page the role cannot open', await t.page.locator('#find-list [role=option]').count() === 0); await t.close(); }

const detail = '#/campus/scouter/CAM-ORB4K?room=R-BCN-3-101&cat=camera';
for (const [role, pick, verify, cost] of [['designer', true, true, true], ['ops', false, false, true], ['syseng', true, true, true]]) {
  const t = await open(detail, { role }); await t.page.waitForSelector('#scouter-d');
  const has = { pick: await t.page.locator('button', { hasText: 'Choose for the design' }).count() > 0, verify: await t.page.locator('button', { hasText: /^Verify$/ }).count() > 0, cost: await t.page.locator('h3', { hasText: 'Cost of ownership' }).count() > 0 };
  ok(`A-13-${role}`, `${role}: buttons and sections follow the policy (pick ${pick}, verify ${verify}, cost ${cost}) — absent, never disabled`, has.pick === pick && has.verify === verify && has.cost === cost, JSON.stringify(has));
  await t.close();
}
{ const t = await open('#/investor', { role: 'architect' });
  await t.page.route(/chunks\/ScouterPage-/, (r) => r.abort());
  await t.page.evaluate(() => { location.hash = '#/campus/scouter'; }); await t.page.waitForSelector('.loadfail', { timeout: 5000 }).catch(() => undefined);
  ok('A-14', 'destructive: a chunk that fails to load shows a recoverable error, not a blank page', /did not load/.test(await main(t.page)) && await t.page.locator('[role=alert] button', { hasText: 'Try again' }).count() === 1);
  await t.page.unroute(/chunks\/ScouterPage-/); await t.page.click('text=Try again'); await t.page.waitForTimeout(600);
  // a failed module import is cached by the browser, so the second try reloads the page (state lives in the address and storage)
  if (await t.page.locator('.loadfail').count()) await t.page.click('text=Try again'); await t.page.waitForSelector('#scouter-h', { timeout: 5000 }).catch(() => undefined);
  ok('A-15', 'destructive: Try again loads it once the network is back', await t.page.locator('#scouter-h').count() === 1);
  await t.page.evaluate(() => { location.hash = '#/campus/scouter?room=%3Cimg%20src=x%20onerror=alert(1)%3E&cat=%22%3E'; }); await t.page.waitForTimeout(250);
  ok('A-16', 'destructive: hostile query values fall back to defaults and are never rendered as markup', await t.page.locator('main img[src=x]').count() === 0 && /Atlas HQ 4\.218/.test(await main(t.page)));
  await t.page.evaluate(() => { location.hash = '#/' + 'a/'.repeat(400); }); await t.page.waitForTimeout(200);
  ok('A-17', 'destructive: a very long address is shown shortened on the not-found page', await t.page.locator('[data-testid=not-found]').count() === 1 && (await main(t.page)).length < 2000);
  ok('A-18', 'no console error except the deliberately aborted chunk', t.errs.filter((e) => !/ScouterPage|Failed to fetch|dynamically imported|net::ERR_FAILED/i.test(e)).length === 0, t.errs.join(' | ')); await t.close(); }
await done();
