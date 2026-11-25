// The performance check (#/play/performance), 25 Nov 2026. Roadmap A19.
//
// Founder, 24 Nov 2026: "I would eventually want representative desktop and mobile performance benchmarks covering rendering,
// navigation responsiveness, memory consumption and larger spatial environments"; 25 Nov: measure customer hardware before
// optimising further against a test machine. This page is how a person takes such a measurement on their own device.
// This suite checks the page, not a device: it runs the check's short form (`?short`), which says in its own result that it is short.
// The figures it reads are this test machine's (no graphics processor) and are judged only for being present and consistent.
//   PF-01  the page opens and has measured nothing; it does not start by itself
//   PF-02  asked, it runs to the end and says where it is while it runs
//   PF-03  a larger and larger synthetic environment: six sizes, each measured or said not to have been, with the reason
//   PF-04  the three scenes as a visitor meets them: time to the first frame, pace, and what each gave up
//   PF-05  the device as its browser reports it, and memory honestly (a figure, or that none is reported)
//   PF-06  the result says what it is: one run, synthetic, nothing sent; a short run says it is short
//   PF-07  nothing is sent: every request during the check is a GET to the page's own address
//   PF-08  the result can be kept: the JSON file carries the result, the targets and the same lines
//   PF-09  it can be stopped, and says the result is not a full one
//   PF-10  at phone width nothing scrolls sideways and the tables scroll inside themselves; the scenes are gone when it ends
//   PF-11  the check is linked from where a scene states its frame rate
//   node tests/browser/demo-performance-check.test.mjs
import fs from 'node:fs';
import { harness } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-performance-check');
const phase = (p) => p.getByTestId('performance-check').getAttribute('data-phase');
const finish = async (p, max = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < max && (await phase(p)) !== 'done') await p.waitForTimeout(300); return (await phase(p)) === 'done'; };

const t = await open('#/play/performance?short', { role: 'architect', sw: false, w: 1440, h: 900 }); const p = t.page;
await p.waitForSelector('[data-testid=performance-check]');
const idle = { h1: await p.locator('main h1').textContent(), phase: await phase(p), status: await p.getByTestId('pf-status').textContent(), results: await p.getByTestId('pf-results').count(), run: await p.getByTestId('pf-run').textContent() };
await p.waitForTimeout(1500); const still = { phase: await phase(p), results: await p.getByTestId('pf-results').count(), reqs: t.reqs.length };
ok('PF-01', 'the page opens with nothing measured and does not start by itself', idle.h1 === 'Performance check' && idle.phase === 'idle' && /Nothing has been measured yet/.test(idle.status) && idle.results === 0 && idle.run === 'Run the check' && still.phase === 'idle' && still.results === 0, JSON.stringify({ idle, still }));

const reqBefore = t.reqs.length; const sent = []; p.on('request', (r) => { sent.push({ m: r.method(), u: r.url() }); });
await p.getByTestId('pf-run').click(); await p.waitForTimeout(500); const during = { phase: await phase(p), status: await p.getByTestId('pf-status').textContent(), stop: await p.getByTestId('pf-stop').count() };
// while a scene is measured: it is shown in the page's full width and the check's own stage and console are really away (not only marked so); one Stop, one status; the scene cannot be used and is kept from a screen reader, so its own heading is not a second heading of this page
await p.waitForSelector('[data-testid=pf-scene]', { timeout: 60000 }); const mid = await p.evaluate(() => { const own = document.querySelector('[data-testid=pf-own]'); const sc = document.querySelector('[data-testid=pf-scene]'); const shown = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
  return { ownShown: shown(own), sceneShown: shown(sc), stops: [...document.querySelectorAll('[data-testid=pf-stop]')].filter(shown).length, status: [...document.querySelectorAll('[data-testid=pf-status]')].filter(shown).length, inert: sc.inert === true, ariaHidden: sc.getAttribute('aria-hidden'), h1Exposed: [...document.querySelectorAll('h1')].filter((h) => !h.closest('[aria-hidden=true]')).length, sceneWidth: Math.round(sc.getBoundingClientRect().width), mainWidth: Math.round(document.querySelector('[data-testid=performance-check]').getBoundingClientRect().width) }; });
const ended = await finish(p); const status = await p.getByTestId('pf-status').textContent();
ok('PF-02', 'asked, it runs to the end and says where it is while it runs; while a scene is measured the check’s own stage is away, there is one Stop and one status, and the scene is shown at the page’s width but cannot be used', !mid.ownShown && mid.sceneShown && mid.stops === 1 && mid.status === 1 && mid.inert && mid.ariaHidden === 'true' && mid.h1Exposed === 1 && mid.sceneWidth === mid.mainWidth && during.phase === 'running' && /^Measuring \d+ of 9: .+ Keep this page in front until it finishes\.$/.test(during.status) && during.stop === 1 && ended && (await p.getByTestId('pf-results').count()) === 1 && (await p.getByTestId('pf-error').count()) === 0, JSON.stringify({ mid, during, ended, status }));

const ladder = await p.$$eval('[data-testid=pf-ladder] tbody tr', (rows) => rows.map((r) => ({ tri: Number(r.dataset.triangles), cells: [...r.querySelectorAll('td')].map((c) => c.textContent), held: [...r.querySelectorAll('[data-held]')].map((c) => c.dataset.held) })));
const measured = ladder.filter((r) => r.cells.length === 6); const skipped = ladder.filter((r) => r.cells.length === 3);
ok('PF-03', `a larger and larger synthetic environment: ${ladder.map((r) => r.tri.toLocaleString('en-US')).join(', ')} triangles a frame; ${measured.length} measured (${measured.map((r) => r.cells[0]).join(', ')} frames a second on this machine), ${skipped.length} not run with the reason given`,
  ladder.length === 6 && ladder.every((r, i) => r.tri > 10000 && r.tri === ladder[0].tri * [1, 2, 4, 8, 16, 32][i]) && ladder[0].tri > 12000 && ladder[0].tri <= 12500 && measured.length >= 1 && measured.every((r) => Number(r.cells[0]) > 0 && Number(r.cells[1]) > 0 && Number(r.cells[2]) >= Number(r.cells[1]) && Number(r.cells[3]) >= Number(r.cells[2]))
  // a size that ran and drew too few frames to measure is below both targets; a size not attempted is not run: the two are not said the same way
  && skipped.every((r) => /^too slow to measure: fewer than five frames in the time allowed$/.test(r.cells[0]) ? r.held.every((h) => h === 'below') : /^not run: the step before was (below 5 frames a second|too slow to measure)$/.test(r.cells[0]) && r.held.every((h) => h === 'not run'))
  && skipped.filter((r) => /^too slow to measure/.test(r.cells[0])).length <= 1 && ladder.findIndex((r) => r.cells.length === 3) === (skipped.length ? ladder.length - skipped.length : -1) && ladder.every((r) => r.held.length === 2 && r.held.every((h) => ['held', 'below', 'not run'].includes(h)))
  && measured.every((r, i) => i === 0 || Number(measured[i - 1].cells[0]) >= 5), JSON.stringify(ladder).slice(0, 900));

// the size each scene's picture has on its own page at this window size, to compare with the size it was measured at (drawn pixels may be fewer where it adapted: never below half a side)
const own3 = []; for (const [hash, id] of [['#/play/campus?detail=full', 'cl-canvas'], ['#/play/stadium?detail=full', 'slv-canvas'], ['#/play/expo?detail=full', 'xpo-canvas']]) { const o = await open(hash, { role: 'architect', sw: false, w: 1440, h: 900 }); await o.page.waitForSelector(`[data-testid=${id}]`); await o.page.waitForTimeout(1200); own3.push(await o.page.getByTestId(id).evaluate((c) => ({ w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight }))); await o.close(); }
const scenes = await p.$$eval('[data-testid=pf-scenes] tbody tr', (rows) => rows.map((r) => ({ key: r.dataset.scene, onPage: r.dataset.onPage, title: r.querySelector('th').textContent, cells: [...r.querySelectorAll('td')].map((c) => c.textContent) })));
// CHANGED 25 Nov 2026, with the reason: the regression on 5c6d698f FAILED here. Under that run's load the stadium drew eight frames in the short form's 1.8 seconds, the page took its pace from the second half (four frames, too few) and showed "not measured" for a scene it had measured. That was a fault of the page, not of this check: the page now falls back to every frame the scene drew and says so, and the short form gives a scene three seconds. This check is as strict as it was (every scene must show a pace above nought); it now reads the number at the start of the cell, since a row may carry that note after it.
ok('PF-04', `the three scenes as a visitor meets them, each at its own page’s picture size (${scenes.map((s) => s.onPage).join(', ')}): ${scenes.map((s) => `${s.title} first frame after ${s.cells[0]} ms, ${s.cells[1]} frames a second at ${s.cells[3]}, distant figures ${s.cells[4]}`).join('; ')} (this machine)`,
  scenes.length === 3 && scenes.map((s) => s.key).join() === 'campus,stadium,expo' && scenes.every((s) => Number(s.cells[0]) > 0 && parseFloat(s.cells[1]) > 0 && /^[\d.]+( \((the pace is of every frame it drew: too few after it settled)\))?$/.test(s.cells[1]) && /^(100|[5-9]\d)%$/.test(s.cells[3]) && Number(s.cells[5].replace(/,/g, '')) > 1000)
  && ['whole', 'drawn simply'].includes(scenes[1].cells[4]) && scenes[0].cells[4] === '—' && scenes[2].cells[4] === '—'
  // each scene was measured at the size its own page gives its picture in this window, so the figure is of the scene a visitor meets and not of a smaller copy
  && scenes.every((s) => /^\d+ × \d+, \d+ × \d+$/.test(s.cells[6])) && own3.every((o, i) => { const [w, h] = scenes[i].onPage.split('x').map(Number); return Math.abs(w - o.cssW) <= 2 && Math.abs(h - o.cssH) <= 2; }), JSON.stringify({ scenes, own3 }));

const device = await p.$$eval('[data-testid=pf-device] tr', (rows) => Object.fromEntries(rows.map((r) => [r.querySelector('th').textContent, r.querySelector('td').textContent]))); const memNote = await p.locator('[data-testid=pf-results] h2:has-text("Memory") + p').textContent(); const memRows = await p.getByTestId('pf-memory').locator('tr').count();
ok('PF-05', `the device as its browser reports it (graphics: ${device.Graphics}), and memory honestly (${memRows ? `${memRows} readings` : 'none reported, and the page says so'})`,
  Number(device['Processor threads']) >= 1 && /\d+ × \d+ at [\d.]+×/.test(device.Screen) && device.Graphics.length > 3 && /\d+ × \d+ on the page, \d+ × \d+ drawn/.test(device['Picture measured']) && /(Chrome|Firefox|Safari|Edge)\/[\d.]+/.test(device.Browser)
  && (memRows ? memRows === 5 && /JavaScript memory as this browser reports it\. It is not the memory the graphics use\./.test(memNote) : /This browser reports no memory figure\./.test(memNote)), JSON.stringify({ device, memNote, memRows }));

const honesty = await p.locator('[data-testid=pf-honesty] p.slv-note').allTextContents();
ok('PF-06', 'the result says what it is: one run on this device, a synthetic environment, nothing sent; and this short run is marked short',
  honesty.length === 4 && /^One run, on this device, in this browser, at this moment\./.test(honesty[0]) && /synthetic environment made for this check, not a customer site/.test(honesty[1]) && /not graphics memory/.test(honesty[2]) && /^Nothing was sent anywhere\./.test(honesty[3])
  && /In the synthetic environment this device (held|did not hold) 30 frames a second/.test(status) && (await p.getByTestId('performance-check').getAttribute('data-short')) === 'true', JSON.stringify({ honesty, status }));

const own = new URL(p.url()).origin; const notGet = sent.filter((r) => r.m !== 'GET'), away = sent.filter((r) => !r.u.startsWith(own) && !r.u.startsWith('data:') && !r.u.startsWith('blob:'));
ok('PF-07', `nothing is sent: the ${sent.length} requests made during the check were all GETs to the page’s own address (the scenes’ own files)`, notGet.length === 0 && away.length === 0 && t.off.length === 0 && sent.every((r) => /\.(js|css|json|png|svg|woff2?|webp|jpg)(\?|$)/.test(r.u)), JSON.stringify({ notGet, away, off: t.off, sample: sent.slice(0, 4), reqBefore }));

const [dl] = await Promise.all([p.waitForEvent('download'), p.getByTestId('pf-export').locator('button[data-format=json]').click()]); const file = await dl.path(); const j = JSON.parse(fs.readFileSync(file, 'utf8')); const text = JSON.stringify(j);
ok('PF-08', `the result can be kept: ${dl.suggestedFilename()} carries the result (six sizes, three scenes), the two targets and the lines that say what it is`,
  /^PERF-\d{14}-device-performance\.json$/.test(dl.suggestedFilename()) && text.includes('"empathia.device-performance/1"') && text.includes('One run, on this device, in this browser, at this moment.') && text.includes('Nothing was sent anywhere.') && text.includes('A short run (the address asked for it)')
  && text.includes('"interactive":30') && text.includes('"ideal":60') && (text.match(/"blocks":/g) || []).length === 6 && ['campus', 'stadium', 'expo'].every((k) => text.includes(`"key":"${k}"`)) && !/"(email|name|ip|cookie)":/i.test(text) && /one run measured on this device/.test(await p.getByTestId('pf-export').textContent()) && !/nothing measured/.test(await p.getByTestId('pf-export').textContent()), JSON.stringify({ name: dl.suggestedFilename(), bytes: text.length, keys: Object.keys(j).slice(0, 12) }));

await p.getByTestId('pf-run').click(); await p.waitForTimeout(900); await p.getByTestId('pf-stop').click(); const stopped = await finish(p, 30000); const after = await p.getByTestId('pf-status').textContent();
const sceneBox = { present: await p.getByTestId('pf-scene').count(), ownShown: await p.getByTestId('pf-own').evaluate((e) => getComputedStyle(e).display !== 'none') };
const cut = { scenes: await p.$$eval('[data-testid=pf-scenes] tbody tr', (r) => r.map((x) => x.textContent)), partial: await p.getByTestId('pf-partial').count() ? await p.getByTestId('pf-partial').textContent() : '' };
ok('PF-09', 'asked again it runs again; it can be stopped, says the result is not a full one, and says a scene it never reached was not reached, not that it failed to draw', stopped && (await p.getByTestId('pf-error').count()) === 0 && !cut.scenes.some((x) => /did not draw a frame/.test(x)) && (cut.scenes.length === 3 || /of the 3 scenes were not reached before the check ended\.$/.test(cut.partial)) && /^The check was interrupted \(stopped before the end\); what was measured before that is below and is not a full result\.$/.test(after) && (await p.getByTestId('pf-run').textContent()) === 'Run the check again', JSON.stringify({ stopped, after }));
ok('PF-10a', 'when it ends the scenes it opened are gone from the page', sceneBox.present === 0 && sceneBox.ownShown === true && (await p.locator('[data-testid=stadium-live], [data-testid=campus-life], [data-testid=expo-live]').count()) === 0 && !t.errs.length, JSON.stringify({ sceneBox, e: t.errs[0] }));
await t.close();

{ const m = await open('#/performance?short', { role: 'employee', sw: false, w: 390, h: 844 }); const q = m.page; await q.waitForSelector('[data-testid=performance-check]'); await q.getByTestId('pf-run').focus(); await q.keyboard.press('Enter'); const fin = await finish(q, 120000);
  const lay = await q.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, tables: [...document.querySelectorAll('.pf-scroll')].map((e) => ({ own: e.scrollWidth - e.clientWidth, out: e.getBoundingClientRect().right - innerWidth })), h2: [...document.querySelectorAll('.pf-results h2')].map((e) => e.textContent) }));
  ok('PF-10', 'at phone width, from the short address, started from the keyboard: it finishes, nothing scrolls sideways, and a wide table scrolls inside itself', fin && lay.over <= 0 && lay.tables.length === 2 && lay.tables.every((x) => x.out <= 0.5) && lay.h2.join('|') === 'The device, as its browser reports it|A larger and larger environment|The three scenes, as a visitor meets them|Memory|Keep this result' && !m.errs.length, JSON.stringify({ fin, lay, e: m.errs[0] }));
  await m.close(); }
{ // the check can be found from where a scene states its frame rate
  const found = []; for (const [hash, id] of [['#/play/stadium', 'slv-measure'], ['#/play/campus', 'cl-measure']]) { const o = await open(hash, { role: 'employee', sw: false, w: 1440, h: 900 }); await o.page.waitForSelector(`[data-testid=${id}]`); found.push({ text: await o.page.getByTestId(id).textContent(), href: await o.page.getByTestId(id).getAttribute('href') }); if (id === 'slv-measure') { await o.page.getByTestId(id).click(); await o.page.waitForSelector('[data-testid=performance-check]'); found.push({ arrived: await o.page.locator('main h1').textContent() }); } await o.close(); }
  ok('PF-11', 'the check is linked from the stadium’s and the campus’s frame-rate notes, and the link opens it', found.length === 3 && found[0].text === 'Measure this device' && found[0].href === '#/play/performance' && found[1].arrived === 'Performance check' && found[2].text === 'Measure this device' && found[2].href === '#/play/performance', JSON.stringify(found)); }
await done();
