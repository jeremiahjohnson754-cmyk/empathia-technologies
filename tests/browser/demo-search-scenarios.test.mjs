#!/usr/bin/env node
// Search Party scenarios S1–S5: list first; group counts on the list equal the counts on the compact graph and the items listed; "+N
// more" expands in place and is keyboard reachable; synthetic fixture labels; never "certified"; the room picker re-answers; unknown
// scenarios say so; 390 / 768 / 1440 in light and dark.
//   node tests/browser/demo-search-scenarios.test.mjs
import { harness, VIEWPORTS, SCHEMES } from './demo-spaces-lib.mjs';
const { ok, open, done } = await harness('demo-search-scenarios');

for (const scheme of SCHEMES) for (const vp of VIEWPORTS) {
  const tag = `${scheme}-${vp[2]}`; const t = await open(vp, scheme, { hash: '#/search/scenarios' });
  ok(`SS-${tag}-01`, 'the scenarios page lists the five questions', (await t.page.locator('[data-testid^="sp-scen-"]').count()) === 5);
  for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) {
    await t.go(`#/search/scenarios/${id}`, 300);
    const v = await t.page.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('[data-testid^="sp-group-"]')).map((g) => ({ key: g.getAttribute('data-testid').slice(9), count: Number(g.querySelector('.sp__count').getAttribute('data-count')), items: g.querySelectorAll('li[data-item]').length }));
      const graph = Object.fromEntries(Array.from(document.querySelectorAll('[data-testid^="sp-gcount-"]')).map((b) => [b.getAttribute('data-testid').slice(10), Number(b.textContent)]));
      const list = document.querySelector('[data-testid="sp-list"]').getBoundingClientRect(); const g = document.querySelector('[data-testid="sp-graph"]').getBoundingClientRect();
      return { groups, graph, listFirst: list.top <= g.top + 1, text: document.querySelector('main').innerText };
    });
    ok(`SS-${tag}-${id}-a`, `${id}: every group's count equals its listed items and the graph's count`, v.groups.length > 0 && v.groups.every((g) => g.count === g.items && v.graph[g.key] === g.count), JSON.stringify(v.groups) + JSON.stringify(v.graph));
    ok(`SS-${tag}-${id}-b`, `${id}: the list comes before (or beside) the graph, and nothing says “certif…”`, v.listFirst && !/certif/i.test(v.text));
  }
  // "+N more": S5 or S1 has a group larger than three
  await t.go('#/search/scenarios/S1', 300);
  const more = t.page.locator('[data-testid^="sp-more-"]').first();
  if (await more.count()) {
    await more.focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(150);
    ok(`SS-${tag}-03`, '“+N more” expands in place with the keyboard (aria-expanded)', (await more.getAttribute('aria-expanded')) === 'true' && /Show fewer/.test(await more.innerText()));
  } else ok(`SS-${tag}-03`, '“+N more” exists for a group of more than three', false, 'no +N more button on S1');
  await t.go('#/search/scenarios/S2?room=R-HZN-1-400', 300);
  const s2 = await t.text();
  ok(`SS-${tag}-04`, 'the room picker re-answers for another room; fixtures are labelled synthetic and organisations fictional', /Horizon 1\.400/.test(s2) && /synthetic demonstration fixture/.test(s2) && /fictional organisation/.test(s2) && /Saffron Hill Broadcast/.test(s2));
  await t.page.selectOption('.sp__pick select', 'R-ATL-4-218'); await t.page.waitForTimeout(300);
  ok(`SS-${tag}-05`, 'changing the room in the picker updates the address and the answer', /room=R-ATL-4-218/.test(await t.page.evaluate(() => location.hash)) && /Atlas 4\.218/.test(await t.text()));
  await t.go('#/search/scenarios/S3', 300);
  ok(`SS-${tag}-06`, 'S3 shows hard gates separately from the preference order, and internal competencies with their state', /Refused by a hard gate/.test(await t.text()) && /Internal competency · (declared|lab-evidenced|reviewer-verified)/.test(await t.text()));
  await t.go('#/search/scenarios/S9', 250);
  ok(`SS-${tag}-07`, 'an unknown scenario says so', /Unknown scenario/.test(await t.text()));
  await t.go('#/search/scenarios/S4', 300);
  ok(`SS-${tag}-08`, 'S4 links back to the reference room and states what still holds acceptance', /What still holds acceptance/.test(await t.text()) && (await t.page.locator('a[href^="#/campus/ATL/4/R-ATL-4-218"]').count()) > 0);
  ok(`SS-${tag}-09`, 'no horizontal overflow, no page error, no request leaves the page', (await t.overflow()) <= 0 && !t.errs.length && !t.ext.length, [await t.overflow(), ...t.errs, ...t.ext].join(' | '));
  await t.close();
}
await done();
