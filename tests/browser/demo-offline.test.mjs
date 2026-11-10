// Offline use of the demonstration, in a real browser (founder, 10 Nov: Commissioning, Assurance, ServiceHands and Lite work offline, on
// any device). The app is saved by its worker, the network is cut, and the field pages are opened and used; work done offline is still
// there after an offline reload; SIGNAL chapters are kept by opening them or by keeping a season; everything saved can be removed.
//   node tests/browser/demo-offline.test.mjs      (build first: node scripts/build.mjs)
import { harness } from './demo-shell-lib.mjs';
const t = await harness('demo-offline'); const { ok, open, base } = t;
const phase = (p) => p.getAttribute('[data-testid=offline-page]', 'data-phase');
const ready = (p) => p.waitForFunction(() => document.querySelector('[data-testid=offline-page]')?.getAttribute('data-phase') === 'ready' && !!navigator.serviceWorker.controller, null, { timeout: 45000 }).then(() => true, () => false);
const go = async (p, hash, wait = 'main h1') => { await p.goto(base + hash); await p.waitForSelector(wait, { timeout: 8000 }).catch(() => undefined); await p.waitForTimeout(200); };
const h1 = (p) => p.textContent('main h1').then((x) => (x || '').trim(), () => '');
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const cacheNames = (p) => p.evaluate(() => caches.keys());

// ------------------------------------------------------------------------------------------------ saving the app
const a = await open('#/offline', { role: 'technician' }); const p = a.page;
ok('OF-01', 'the app saves itself on this device after first paint and says so, with the build it holds', await ready(p) && /^[0-9a-f]{12}$/.test(await p.textContent('[data-testid=offline-version]')) && (await p.textContent('[data-testid=offline-phase]')) === 'Saved on this device', await p.textContent('[data-testid=offline-status]'));
const files = Number(((await p.textContent('[data-testid=offline-status]')).match(/(\d+) files/) || [])[1] || 0);
const shellCount = await p.evaluate(async () => { const k = (await caches.keys()).find((x) => x.startsWith('ed-shell-')); return k ? (await (await caches.open(k)).keys()).length : 0; });
ok('OF-02', 'every file of the shell is held: the count on the page is the count in the cache (plus the page under the site root)', files > 100 && shellCount === files + 1, `${files} stated, ${shellCount} held`);
ok('OF-03', 'saving the app logged no error and asked nothing of another origin', a.errs.length === 0 && a.off.length === 0, [...a.errs, ...a.off].join(' | '));
ok('OF-04', 'connected, the strip is silent', (await p.getAttribute('[data-testid=offline-strip]', 'data-online')) === 'true' && !(await p.isVisible('[data-testid=offline-strip]')));

// ------------------------------------------------------------------------------------------------ the network is cut
await a.ctx.setOffline(true); await p.reload(); await p.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined);
ok('OF-05', 'offline, a reload still opens the page', (await h1(p)) === 'Offline and this device', await h1(p));
const strip = await p.textContent('[data-testid=offline-strip]');
ok('OF-06', 'the shell says it is offline, that the app is saved and that work is kept, and links to this page', /^Offline\./.test(strip) && /saved on this device/.test(strip) && /kept in this browser/.test(strip) && (await p.getAttribute('[data-testid=offline-strip] a', 'href')) === '#/offline', strip);
const errsBefore = a.errs.length;
const visits = [['#/lite', 'technician'], ['#/commissioning', 'technician'], ['#/assurance', 'technician'], ['#/servicehands', 'technician'], ['#/dispatch', 'technician'], ['#/worlds', 'technician'], ['#/estate/stadium', 'technician'], ['#/estate/university/UNI-SCI-110', 'technician'], ['#/gameday', 'technician'], ['#/v25', 'technician'], ['#/story', 'technician'], ['#/campus', 'technician'], ['#/scouter', 'technician']];
const opened = [];
for (const [hash] of visits) { await go(p, hash); const title = await h1(p); const failed = await p.locator('[data-testid=workspace-failure], .loadfail, [data-testid=story-error]').count(); opened.push(`${hash} → ${title || 'NO HEADING'}${failed ? ' (FAILED TO LOAD)' : ''}`); }
ok('OF-07', `offline, ${visits.length} addresses never opened before all open: Lite, Commissioning, Assurance, ServiceHands, Dispatch, the worlds, estates, game day, Mission Control, the story library, Campus, Scouter`, opened.every((x) => !/NO HEADING|FAILED/.test(x)), opened.filter((x) => /NO HEADING|FAILED/.test(x)).join(' | ') || opened.join(' | '));
ok('OF-08', 'opening them offline logged no error', a.errs.length === errsBefore, a.errs.slice(errsBefore).join(' | '));

// ------------------------------------------------------------------------------------------------ work done offline is kept
await go(p, '#/gameday?as=stadium.av_it_engineer', '[data-testid=gameday-advance]');
const phaseBefore = await p.textContent('[data-testid=gameday-phases] [aria-current=step]');
await p.click('[data-testid=gameday-advance]'); await p.waitForTimeout(150);
const phaseAfter = await p.textContent('[data-testid=gameday-phases] [aria-current=step]');
await p.reload(); await p.waitForSelector('[data-testid=gameday-phases]', { timeout: 8000 }).catch(() => undefined);
const phaseReload = await p.textContent('[data-testid=gameday-phases] [aria-current=step]').catch(() => '');
ok('OF-09', 'game day advanced offline is at the same phase after an offline reload', phaseBefore !== phaseAfter && phaseReload === phaseAfter, `${phaseBefore} → ${phaseAfter} → after reload ${phaseReload}`);

const b = await open('#/offline', { role: 'employee', w: 390, h: 844 }); const q = b.page;
const bReady = await ready(q); await b.ctx.setOffline(true);
await go(q, '#/servicehands/new', '[data-testid=intake]');
await q.selectOption('[data-testid=in-room]', 'R-ATL-4-218'); await q.selectOption('[data-testid=in-category]', 'audio');
await q.locator('[data-testid=troubleshoot] input[type=radio]').first().check();
await q.fill('[data-testid=in-title]', 'Reported with no connection: echo on the far end'); await q.click('[data-testid=in-submit]');
const done = await q.waitForSelector('[data-testid=intake-done]', { timeout: 5000 }).then(() => true, () => false);
await q.reload(); await q.waitForSelector('main h1', { timeout: 8000 }).catch(() => undefined);
const stored = await q.evaluate(() => { try { return JSON.parse(localStorage.getItem('empathia.demo.workspace.v1') || '{}').incidents?.some((i) => /Reported with no connection/.test(i.title)) === true; } catch { return false; } });
ok('OF-10', 'on a phone with no connection, a problem is reported through ServiceHands and is still in the queue after an offline reload', bReady && done && stored, `ready ${bReady}, reported ${done}, kept ${stored}`);
ok('OF-11', 'phone, offline: the offline page fits the screen and its buttons are at least 44 px tall', await (async () => { await go(q, '#/offline'); const small = await q.evaluate(() => Array.from(document.querySelectorAll('[data-testid=offline-page] button')).filter((x) => x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().height < 44).map((x) => x.textContent)); return (await over(q)) <= 0 && small.length === 0; })(), `overflow ${await over(q)}`);
ok('OF-12', 'offline, pack buttons are disabled (a pack cannot be fetched without a connection) and say what they are', await q.evaluate(() => { const bs = Array.from(document.querySelectorAll('[data-testid=offline-keep]')); return bs.length >= 14 && bs.every((x) => x.disabled); }), String(await q.locator('[data-testid=offline-keep]').count()));
await b.close();

// ------------------------------------------------------------------------------------------------ SIGNAL offline
await go(p, '#/story/s01e01', '[data-testid=story-error], [data-testid=story-reader] .sg-panel');
ok('OF-13', 'offline, a chapter that was never opened or kept says so in words and points to this page; it is not a blank screen', (await p.locator('[data-testid=story-not-kept]').count()) === 1 && (await p.getAttribute('[data-testid=story-not-kept] a', 'href')) === '#/offline', await t.main(p).then((x) => x.slice(0, 200)));
await a.ctx.setOffline(false); await p.waitForTimeout(300);
ok('OF-14', 'when the connection returns the strip says "Back online." and then goes quiet', /Back online\./.test(await p.textContent('[data-testid=offline-strip]')) && await p.waitForFunction(() => document.querySelector('[data-testid=offline-strip]')?.textContent === '', null, { timeout: 8000 }).then(() => true, () => false));
await go(p, '#/story/pro02', '[data-testid=story-reader] .sg-panel'); await p.waitForTimeout(600);   // opened once while connected
await go(p, '#/offline'); await ready(p);
const keepS1 = p.locator('[data-pack=story-1] [data-testid=offline-keep]');
ok('OF-15', 'connected, thirteen story packs, the library and the narration are offered with their sizes', (await p.locator('[data-testid=offline-pack]').count()) === 15 && /12 chapters · [\d.]+ (KB|MB)/.test(await p.textContent('[data-pack=story-1]')) && await keepS1.isEnabled(), await p.textContent('[data-pack=story-1]'));
await keepS1.click();
const kept = await p.waitForSelector('[data-pack=story-1][data-kept=kept]', { timeout: 60000 }).then(() => true, () => false);
ok('OF-16', 'keeping Season 1 fetches its 12 chapters, their art and the shared drawings, and reports it', kept && /Season 1, The Sanctuary is kept on this device/.test(await p.textContent('[data-testid=offline-said]')), await p.textContent('[data-testid=offline-said]'));
await a.ctx.setOffline(true); const e2 = a.errs.length;
await go(p, '#/story/s01e01', '[data-testid=story-reader] .sg-panel');
ok('OF-17', 'offline, a chapter of the kept season opens with its drawn panels', (await p.locator('[data-testid=story-reader] .sg-panel svg').count()) >= 1, await h1(p));
await go(p, '#/play/s01e11', '.pl-stage');
ok('OF-18', 'offline, the last chapter of the kept season plays as scenes', (await p.locator('.pl-stage').count()) === 1 && (await p.locator('[data-testid=play-error]').count()) === 0, await h1(p));
await go(p, '#/story/pro02', '[data-testid=story-reader] .sg-panel');
ok('OF-19', 'offline, a chapter that was simply opened earlier (no pack) opens too', (await p.locator('[data-testid=story-reader] .sg-panel svg').count()) >= 1, await h1(p));
ok('OF-20', 'the kept chapters opened offline without an error', a.errs.length === e2, a.errs.slice(e2).join(' | '));
await a.ctx.setOffline(false);

// ------------------------------------------------------------------------------------------------ audio seeks from a kept file
await go(p, '#/offline'); await ready(p);
await p.locator('[data-pack=narration] [data-testid=offline-keep]').click(); await p.waitForSelector('[data-pack=narration][data-kept=kept]', { timeout: 30000 }).catch(() => undefined);
await p.locator('[data-pack=library] [data-testid=offline-keep]').click(); await p.waitForSelector('[data-pack=library][data-kept=kept]', { timeout: 30000 }).catch(() => undefined);
await a.ctx.setOffline(true); const e3 = a.errs.length;
await go(p, '#/learn'); await p.waitForTimeout(600);
ok('OF-21a', 'offline, Learn opens with its library once the library pack is kept, without a failed request', /Learn/.test(await h1(p)) && a.errs.length === e3, `${await h1(p)} ${a.errs.slice(e3).join(' | ')}`);
await go(p, '#/offline');
const range = await p.evaluate(async () => { const j = await (await fetch('offline-packs.json')).json(); const f = j.packs.find((x) => x.id === 'narration').files.find((x) => x.endsWith('.mp3')); const whole = await (await fetch(f)).arrayBuffer(); const r = await fetch(f, { headers: { Range: 'bytes=100-199' } }); const part = new Uint8Array(await r.arrayBuffer()); const same = part.every((v, i) => v === new Uint8Array(whole)[100 + i]); return { status: r.status, len: part.length, cr: r.headers.get('Content-Range'), size: whole.byteLength, same }; });
ok('OF-21', 'offline, a ranged request for kept narration is answered 206 with exactly the bytes asked for (audio can seek)', range.status === 206 && range.len === 100 && range.same && range.cr === `bytes 100-199/${range.size}`, JSON.stringify(range));
await a.ctx.setOffline(false);

// ------------------------------------------------------------------------------------------------ a role still sees only its own pages
const c = await open('#/offline', { role: 'employee' }); await ready(c.page); await c.ctx.setOffline(true);
await go(c.page, '#/dispatch');
ok('OF-22', 'offline, a role that may not open a page still gets the access page, not the page (the saved app does not widen what a role is shown)', (await c.page.locator('[data-testid=servicehands], .ops').count()) === 0 && /not shown|cannot|may not|isn’t|is not/i.test(await t.main(c.page)), (await t.main(c.page)).slice(0, 160));
await c.close();

// ------------------------------------------------------------------------------------------------ removing everything
await go(p, '#/offline'); await ready(p);
await p.click('[data-testid=offline-remove]');
ok('OF-23', 'removal asks first, in the page', (await p.locator('[data-testid=offline-remove-yes]').count()) === 1 && (await cacheNames(p)).some((k) => k.startsWith('ed-shell-')));
await p.click('[data-testid=offline-remove-yes]'); await p.waitForFunction(() => document.querySelector('[data-testid=offline-page]')?.getAttribute('data-phase') === 'off', null, { timeout: 8000 }).catch(() => undefined);
const after = await p.evaluate(async () => ({ caches: (await caches.keys()).filter((k) => k.startsWith('ed-')), regs: (await navigator.serviceWorker.getRegistrations()).length, work: !!localStorage.getItem('empathia.demo.gameday.v1'), pref: localStorage.getItem('empathia.demo.offline') }));
ok('OF-24', 'Remove deletes the worker and every saved file, leaves the visitor’s work alone, and remembers the choice', after.caches.length === 0 && after.regs === 0 && after.work && after.pref === 'off' && (await phase(p)) === 'off', JSON.stringify(after));
await p.reload(); await p.waitForSelector('main h1'); await p.waitForTimeout(1200);
ok('OF-25', 'after a reload the app is still not saved (the choice is kept) and the page says why', (await phase(p)) === 'off' && (await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0 && /turned off on this device/.test(await p.textContent('[data-testid=offline-status]')), await p.textContent('[data-testid=offline-status]'));
await p.click('[data-testid=offline-save]');
ok('OF-26', '"Save the app on this device" saves it again', await p.waitForFunction(() => document.querySelector('[data-testid=offline-page]')?.getAttribute('data-phase') === 'ready', null, { timeout: 45000 }).then(() => true, () => false), await phase(p));
ok('OF-27', 'none of this logged an error or asked anything of another origin', a.errs.length === e2 && a.off.length === 0, [...a.errs.slice(e2), ...a.off].join(' | '));
await a.close();

// ------------------------------------------------------------------------------------------------ a browser that asks for less data
const d = await open('#/offline', { role: 'technician', init: () => { try { Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }); } catch { /* */ } } });
await d.page.waitForTimeout(1500);
ok('OF-28', 'when the browser asks sites to use less data, nothing is downloaded without asking: the page says so and offers the button', (await phase(d.page)) === 'off' && /use less data/.test(await d.page.textContent('[data-testid=offline-status]')) && (await d.page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0 && (await d.page.locator('[data-testid=offline-save]').count()) === 1, await d.page.textContent('[data-testid=offline-status]'));
await d.close();

// ------------------------------------------------------------------------------------------------ a browser that will not save it
const e = await open('#/offline', { role: 'technician', sw: false }); await e.page.waitForTimeout(1200);
ok('OF-29', 'where the browser will not let the app be saved, the page says so in words and logs no error', ['failed', 'unsupported'].includes(await phase(e.page)) && e.errs.length === 0 && /did not allow|cannot save/.test(await e.page.textContent('[data-testid=offline-status]')), `${await phase(e.page)}: ${await e.page.textContent('[data-testid=offline-status]')}`);
await e.ctx.setOffline(true); await e.page.evaluate(() => window.dispatchEvent(new Event('offline'))); await e.page.waitForTimeout(200);
ok('OF-30', 'offline without a saved app, the strip says plainly that unopened pages will not load', /not saved on this device yet/.test(await e.page.textContent('[data-testid=offline-strip]')), await e.page.textContent('[data-testid=offline-strip]'));
await e.close();

// ------------------------------------------------------------------------------------------------ reachable, in both themes
const f = await open('#/investor', { role: 'technician', theme: 'dark' });
ok('OF-31', 'the footer of every page links to "Offline use"', (await f.page.getAttribute('[data-testid=foot-offline]', 'href')) === '#/offline');
await go(f.page, '#/offline'); await ready(f.page);
const contrast = await f.page.evaluate(() => { const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const bgOf = (el) => { for (let x = el; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || Number(m[3]) > 0.98)) return c; } return 'rgb(255,255,255)'; }; const out = []; for (const el of document.querySelectorAll('[data-testid=offline-page] :is(p, b, span, a, h1, h2, h3, code, button)')) { if (!el.textContent.trim() || el.children.length) continue; const s = getComputedStyle(el); if (!/^rgb/.test(s.color) || !/^rgb/.test(bgOf(el))) continue; const a = lum(s.color), b = lum(bgOf(el)); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (r < 4.5 && !el.disabled) out.push(`${el.textContent.trim().slice(0, 30)} ${r.toFixed(2)}`); } return out; });
ok('OF-32', 'dark theme: every piece of text on the offline page meets 4.5:1', contrast.length === 0, contrast.slice(0, 6).join(' | '));
await f.close();
await t.done();
