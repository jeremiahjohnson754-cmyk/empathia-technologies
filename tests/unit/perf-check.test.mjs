// The performance check's arithmetic, its synthetic environment and its report (apps/demo/src/play/perf.ts, export/perf.ts), 25 Nov 2026.
//
// Founder, 24 Nov 2026: benchmarks "covering rendering, navigation responsiveness, memory consumption and larger spatial
// environments"; 25 Nov: measure customer hardware before optimising further against a test machine. A figure a customer's device
// produces is only as good as the arithmetic under it and the words around it, so both are pinned here.
//   PC-01  the pace of a run of frames: frames a second, the usual frame, the slow one in twenty, the slowest; too few frames is no figure
//   PC-02  "held" means the pace AND the slow frames: an average that hides stutter does not hold a target
//   PC-03  the synthetic environment: one block of about 12,500 triangles, drawn 1 to 32 times, side by side and never overlapping
//   PC-04  the sentence at the top says what happened, including when nothing held and when the run was cut short
//   PC-05  the report carries the result whole, the two targets, and the lines that say what a result is; a short run says so
//   PC-06  the page sends nothing, is registered where it can be found, and a scene left mid-frame does not fail
//   node --test tests/unit/perf-check.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-check-'));
const load = async (rel, name) => { const out = path.join(tmp, name); await esbuild.build({ entryPoints: [path.join(repo, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' }); return import(pathToFileURL(out).href); };
const P = await load('apps/demo/src/play/perf.ts', 'perf.mjs'); const X = await load('apps/demo/src/export/perf.ts', 'report.mjs');
const src = (f) => fs.readFileSync(path.join(repo, f), 'utf8');
const pace = (fps, p95 = 1000 / fps) => ({ frames: 100, seconds: 100 / fps, fps, medianMs: 1000 / fps, p95Ms: p95, worstMs: p95, over33: 0 });
const result = (over = {}) => ({ schema: 'empathia.device-performance/1', at: '2026-11-25T07:00:00.000Z', short: false, interrupted: null, canvas: { cssWidth: 768, cssHeight: 504, width: 768, height: 504 },
  device: { cores: 8, memoryGb: 8, screen: '1440 × 900', pixelRatio: 2, renderer: 'an example renderer', browser: 'Chrome/1.0 on Mac OS X', reducedMotion: false, touch: false },
  ladder: [[1, 60], [2, 60], [4, 58], [8, 41], [16, 22], [32, 4]].map(([b, f]) => ({ blocks: b, triangles: 12492 * b, pace: pace(f) })),
  scenes: P.SCENES.map((s, i) => ({ ...s, firstFrameMs: 120 + i, pace: pace(55), detail: 100, simple: s.key === 'stadium' ? false : null, triangles: 1000, draws: 10, picture: { cssWidth: 768, cssHeight: 684, width: 1536, height: 1368 } })),
  memory: [{ when: 'Before the check', usedMb: 40 }, { when: 'After the synthetic environment', usedMb: 44 }], ...over });

test('PC-01 the pace of a run of frames', () => {
  const even = P.paceOf(Array(120).fill(1000 / 60)); assert.deepEqual(even, { frames: 120, seconds: 2, fps: 60, medianMs: 16.7, p95Ms: 16.7, worstMs: 16.7, over33: 0 });
  // 95 frames at 60 a second and 5 long ones: the average still reads well, the slow frame and the slowest do not
  const stutter = P.paceOf([...Array(95).fill(16.7), ...Array(5).fill(120)]); assert.equal(stutter.frames, 100); assert.ok(stutter.fps > 45 && stutter.fps < 46, String(stutter.fps)); assert.equal(stutter.medianMs, 16.7); assert.equal(stutter.p95Ms, 16.7); assert.equal(stutter.worstMs, 120); assert.equal(stutter.over33, 0.05);
  const six = P.paceOf([...Array(94).fill(16.7), ...Array(6).fill(120)]); assert.equal(six.p95Ms, 120, 'six long frames in a hundred: the one-in-twenty frame is a long one');
  assert.equal(P.paceOf([16, 16, 16, 16]), null, 'four frames are not a measurement'); assert.equal(P.paceOf([]), null); assert.deepEqual(P.paceOf([20, NaN, 20, 0, -5, 20, Infinity, 20, 20]).frames, 5, 'what is not a frame time is not counted');
  assert.equal(P.paceOf(Array(30).fill(200)).fps, 5); assert.equal(P.paceOf(Array(30).fill(200)).over33, 1);
});

test('PC-02 a target is held by the pace and by the slow frames together', () => {
  assert.equal(P.TARGET, 30); assert.equal(P.IDEAL, 60); assert.equal(P.STOP_BELOW, 5);
  assert.equal(P.holds(pace(60), 60), 'held'); assert.equal(P.holds(pace(59), 60), 'below'); assert.equal(P.holds(pace(31), 30), 'held'); assert.equal(P.holds(pace(29.9), 30), 'below'); assert.equal(P.holds(null, 30), 'not run');
  assert.equal(P.holds(pace(45, 80), 30), 'below', 'an average of 45 with one frame in twenty at 80 ms does not hold 30'); assert.equal(P.holds(pace(45, 41), 30), 'held', 'one frame in twenty a quarter over the target’s frame is allowed'); assert.equal(P.holds(pace(45, 42), 30), 'below');
  // a size that ran and was too slow to measure is below a target; a size not attempted is not run
  assert.equal(P.standing({ blocks: 8, triangles: 99936, pace: null, tooSlow: true, skipped: 'too slow to measure' }, 30), 'below'); assert.equal(P.standing({ blocks: 16, triangles: 199872, pace: null, skipped: 'not run' }, 30), 'not run'); assert.equal(P.standing({ blocks: 1, triangles: 12492, pace: pace(61) }, 60), 'held');
  const r = result(); assert.equal(P.largestHeld(r.ladder, 30), 12492 * 8); assert.equal(P.largestHeld(r.ladder, 60), 12492 * 2); assert.equal(P.largestHeld(r.ladder.map((s) => ({ ...s, pace: pace(12) })), 30), null); assert.equal(P.largestHeld([], 30), null);
});

test('PC-03 the synthetic environment is one block, drawn more and more times, side by side', () => {
  const b = P.block(); assert.equal(b.length % 27, 0); const tris = b.length / 27; assert.ok(tris > 12000 && tris <= 12500 && tris % 12 === 0, `${tris} triangles: whole boxes, about 12,500`); assert.deepEqual(P.block(), b, 'the same block every time');
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < b.length; i += 9) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[i + k]); hi[k] = Math.max(hi[k], b[i + k]); }
  assert.ok(lo[0] >= -P.BLOCK_SIDE / 2 && hi[0] <= P.BLOCK_SIDE / 2 && lo[2] >= -P.BLOCK_SIDE / 2 && hi[2] <= P.BLOCK_SIDE / 2, 'the block stays inside its own square'); assert.equal(lo[1], 0); assert.ok(hi[1] > 20 && hi[1] <= 40);
  assert.deepEqual(P.LADDER, [1, 2, 4, 8, 16, 32]);
  for (const n of P.LADDER) { const at = P.blockPlaces(n); assert.equal(at.length, n); const keys = new Set(at.map((p) => `${p[0]},${p[2]}`)); assert.equal(keys.size, n, 'no two blocks in one place'); for (const p of at) { assert.equal(p[1], 0); assert.ok(Number.isInteger((p[0] * 2) / P.BLOCK_SIDE) && Number.isInteger((p[2] * 2) / P.BLOCK_SIDE), 'on the grid of block sides, so blocks touch and never overlap'); } }
  assert.deepEqual(P.blockPlaces(1), [[0, 0, 0]], 'one block stands in the middle');
});

test('PC-04 the sentence at the top says what happened', () => {
  assert.equal(P.headline(result()), 'In the synthetic environment this device held 30 frames a second up to 99,936 triangles a frame, and 60 up to 24,984. The scenes, as a visitor meets them, ran at: Campus Life 55, Stadium LIVE 55, Expo LIVE 55 frames a second.');
  const none = result({ ladder: result().ladder.map((s) => ({ ...s, pace: pace(9) })) }); assert.match(P.headline(none), /^In the synthetic environment this device did not hold 30 frames a second at any size tried\./);
  const only30 = result({ ladder: result().ladder.map((s, i) => ({ ...s, pace: pace(i < 3 ? 40 : 10) })) }); assert.match(P.headline(only30), /held 30 frames a second up to 49,968 triangles a frame, and did not hold 60 at any size\./);
  const cut = result({ interrupted: 'the page was hidden, so the browser stopped drawing' }); assert.equal(P.headline(cut), 'The check was interrupted (the page was hidden, so the browser stopped drawing); what was measured before that is below and is not a full result.');
  assert.equal(P.HONESTY.length, 4); assert.match(P.HONESTY[0], /^One run, on this device, in this browser, at this moment\./); assert.match(P.HONESTY[1], /synthetic environment made for this check, not a customer site/); assert.match(P.HONESTY[3], /^Nothing was sent anywhere\./);
  assert.ok(!/guarantee|certified|will run|production-ready/i.test(P.HONESTY.join(' ') + P.headline(result())), 'a result promises nothing');
});

test('PC-05b the device is described in words that are true of it', () => {
  // real user-agent shapes: Edge, Opera and Android in-app browsers also say Chrome; Android also says Linux; Chrome on an iPhone says CriOS and Safari
  assert.equal(P.browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.51'), 'Edge/131.0.2903.51 on Windows');
  assert.equal(P.browserOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0'), 'Opera/115.0.0.0 on Windows');
  assert.equal(P.browserOf('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36'), 'Chrome/131.0.6778.39 on Android');
  assert.equal(P.browserOf('Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36'), 'Chrome/130.0.6723.58 on Android');
  assert.equal(P.browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'), 'Safari/18.1 on iPhone');
  assert.equal(P.browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'), 'Chrome/131.0.6778.73 on iPhone');
  assert.equal(P.browserOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'), 'Safari/18.1 on macOS');
  assert.equal(P.browserOf('Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'), 'Firefox/132.0 on Linux'); assert.equal(P.browserOf('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'), 'Chrome/131.0.0.0 on ChromeOS'); assert.equal(P.browserOf('something else'), 'browser not recognised');
  // the memory a browser reports never exceeds 8: 8 is "8 or more", not "about 8"
  assert.equal(P.memoryWords(null), 'not reported by this browser'); assert.equal(P.memoryWords(4), 'about 4 GB (a rounded figure the browser gives)'); assert.equal(P.memoryWords(8), '8 GB or more (the browser reports no more than 8)');
});

test('PC-05 the report carries the whole result, the targets and what a result is', () => {
  const by = { role: 'Product Architect', at: '2026-11-25T07:00:05.000Z', build: 'test' }; const r = result(); const rep = X.performanceReport(r, by);
  assert.equal(rep.schema, 'empathia.report/1'); assert.equal(rep.kind, 'device-performance'); assert.equal(rep.id, 'PERF-20261125070000'); assert.equal(rep.title, 'Device performance check'); assert.equal(rep.role, 'Product Architect'); assert.equal(rep.scope.room, 'This device');
  assert.deepEqual(rep.dossier.result, r, 'the structured file holds the result as measured'); assert.deepEqual(rep.dossier.targets, { interactive: 30, ideal: 60 });
  for (const h of P.HONESTY) assert.ok(rep.provenance.includes(h), h); assert.ok(rep.provenance.some((p) => /^Made as Product Architect: a perspective, which grants no permission\.$/.test(p))); assert.ok(!rep.provenance.some((p) => /short run/.test(p)));
  assert.ok(X.performanceReport(result({ short: true }), by).provenance.some((p) => /^A short run \(the address asked for it\)/.test(p)), 'a short run says so in every file');
  const table = (id) => rep.sections.find((s) => s.id === id).table; assert.equal(rep.primary, 'Synthetic environment'); assert.equal(table('ladder').title, 'Synthetic environment'); assert.equal(table('ladder').rows.length, 6); assert.deepEqual(table('ladder').rows.map((x) => x.t), ['held', 'held', 'held', 'held', 'below', 'below']); assert.deepEqual(table('ladder').rows.map((x) => x.i), ['held', 'held', 'below', 'below', 'below', 'below']);
  assert.equal(table('scenes').rows.length, 3); assert.equal(table('scenes').rows[1].far, 'whole'); assert.equal(table('scenes').rows[0].far, '—'); assert.match(table('scenes').rows[0].pic, /^768 × 684 on the page, 1536 × 1368 drawn$/); assert.equal(table('memory').rows.length, 2);
  // a run cut short: the counts are against what a full run measures, the chart shows only what was measured, and nothing unmeasured is charted as nought
  const partial = X.performanceReport(result({ interrupted: 'stopped before the end', ladder: [...r.ladder.slice(0, 2), { blocks: 4, triangles: 49968, pace: null, tooSlow: true, skipped: 'too slow to measure: fewer than five frames in the time allowed' }], scenes: [], canvas: null }), by);
  assert.deepEqual(partial.kpis.slice(2).map((k) => k.value), ['2 of 6', '0 of 3']); assert.deepEqual(partial.chart.categories, ['12,492', '24,984']); assert.deepEqual(partial.chart.series[0].values, [60, 60]); assert.equal(table('ladder').rows.length, 6);
  assert.deepEqual(partial.sections.find((s) => s.id === 'ladder').table.rows.map((x) => x.t), ['held', 'held', 'below']); assert.ok(partial.sections.find((s) => s.id === 'device').facts.some(([k, v]) => k === 'Picture measured' && v === 'nothing was drawn'));
  assert.equal(X.performanceReport(result({ ladder: r.ladder.map((s) => ({ ...s, pace: null, skipped: 'not run' })) }), by).chart, undefined, 'no chart when no size was measured');
  assert.equal(rep.status.tone, 'ok'); assert.match(rep.status.label, /^Held 30 frames a second up to 99,936 triangles$/); assert.equal(X.performanceReport(result({ interrupted: 'stopped before the end' }), by).status.label, 'Interrupted');
  const quiet = X.performanceReport(result({ memory: [{ when: 'Before the check', usedMb: null }], device: { ...r.device, memoryGb: null, cores: null } }), by); assert.equal(quiet.sections.find((s) => s.id === 'memory').table.note, 'This browser reports no memory figure.'); assert.ok(quiet.sections.find((s) => s.id === 'device').facts.some(([k, v]) => k === 'Memory' && v === 'not reported by this browser')); assert.ok(quiet.sections.find((s) => s.id === 'device').facts.some(([k, v]) => k === 'Processor threads' && v === 'not reported'));
  assert.ok(!/"(email|userName|ip|cookie|token)"/i.test(JSON.stringify(rep)), 'nothing about a person');
});

test('PC-06 the page sends nothing, can be found, and a scene left mid-frame does not fail', () => {
  const page = src('apps/demo/src/play/PerformanceCheck.tsx'), logic = src('apps/demo/src/play/perf.ts'), reg = src('apps/demo/src/registry.worlds.ts');
  for (const [name, s] of [['the page', page], ['its arithmetic', logic], ['its report', src('apps/demo/src/export/perf.ts')]]) assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share|postMessage\(/.test(s), `${name} has no way to send anything`);
  assert.ok(!/useEffect\(\(\) => \{[^}]*run\(\)/.test(page) && page.includes('onClick={run}'), 'the check starts from the button and from nowhere else');
  assert.ok(page.includes("document.hidden) interrupted = 'the page was hidden, so the browser stopped drawing'"), 'a hidden page is an interrupted run, not a slow device');
  assert.ok(page.includes('r.setFull(true)'), 'the synthetic environment is drawn at full quality'); assert.ok(page.includes("className={Scene ? 'slv-grid pf-away' : 'slv-grid'}") && src('apps/demo/src/play/play.css').includes('.pf-away { display: none; }') && !/hidden=\{/.test(page), 'the check’s own stage is taken away by a class: the hidden attribute does not hide a grid');
  assert.ok(page.includes('const late = first === null && !interrupted;') && page.includes("...(late ? { note: 'did not draw a frame within 30 seconds' } : {})"), 'a scene that was stopped is not said to have failed to draw'); assert.ok(page.includes('Renderer.probe = null'), 'the measuring hook is taken off when the check ends');
  const i = reg.indexOf("path: '/play/performance'"), j = reg.indexOf("path: '/play/:chapter'"); assert.ok(i > 0 && j > i, 'registered, and before the address that would otherwise take it for a chapter'); assert.ok(reg.includes("id: 'play.performance', title: 'Performance check'") && reg.includes("alias: ['/performance', '/benchmark'], authority: OPEN"));
  for (const f of ['CampusLife', 'ExpoLive', 'StadiumLive']) { const s = src(`apps/demo/src/play/${f}.tsx`); assert.ok(s.includes('const cv = r.canvas; const aspect = cv.width / Math.max(1, cv.height);') && !/const cv = canvas\.current!; const aspect/.test(s), `${f}: the frame loop draws on the renderer’s own canvas`); }
  assert.ok(src('apps/demo/src/play/gl.ts').includes('pace(ms: number) { this.gov.frame(ms); Renderer.probe?.(ms); }')); assert.ok(src('scripts/test.mjs').includes("['--test', 'tests/unit/perf-check.test.mjs']") && src('scripts/test.mjs').includes("'demo-performance-check', "), 'both suites are registered');
  assert.ok(src('apps/demo/src/export/ExportMenu.tsx').includes("{says || 'Every file says what it is: synthetic records, results as recorded (nothing measured)"), 'the export card keeps its usual closing line everywhere else');
});
