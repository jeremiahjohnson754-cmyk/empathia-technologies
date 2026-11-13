#!/usr/bin/env node
// Three views and equipment-level detail (13 Nov 2026, founder: "switch between an isometric overview, an accurate 2D floor plan, and an
// eye-level perspective"; "an accurately positioned camera, microphones, touch panel, displays, loudspeakers, and cable or network
// information in Engineer mode"; the commentary booth's "audio consoles, intercom equipment, monitors, microphones and communications
// infrastructure"; "every room is explorable with complete object interactions … all 140 rooms").
//   node tests/browser/demo-lite-views.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lite-views');

// a designed room: overview, plan to scale, eye level; every piece a button on the plan; a person marker on the plan opens that view
{ const t = await open('#/lite/w/stadium/r/STA-STE-001', { role: 'architect', sw: false }); const p = t.page; const st = p.getByTestId('rm-room-3d'); await st.waitFor();
  await p.getByTestId('rm-view-plan').click(); await p.getByTestId('rm-plan').waitFor();
  const n = Number(await p.getByTestId('rm-plan').getAttribute('data-pieces')); const buttons = await p.locator('[data-testid=rm-plan] [data-testid^=pl-piece-]').count();
  ok('VW-plan', 'the plan is drawn to scale (7.50 × 5.00 m), every piece a button on it', (await st.getAttribute('data-view')) === 'plan' && /7\.50 m/.test(await p.getByTestId('pl-width').textContent()) && /5\.00 m/.test(await p.getByTestId('pl-depth').textContent()) && buttons === n && n >= 15, `${buttons}/${n}`);
  await p.getByTestId('pl-piece-bar').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok('VW-plan-pick', 'a piece picked on the plan says what it is, its size and where it stands', /^Bar: .* · at 0\.33, 3 m/.test(await p.getByTestId('rm-says').innerText()), await p.getByTestId('rm-says').innerText());
  await p.getByTestId('pl-eye-rail').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('VW-plan-eye', 'a person marker on the plan opens the room at eye level from there', (await st.getAttribute('data-view')) === 'eye' && (await st.getAttribute('data-eye')) === 'rail' && /eye=rail/.test(p.url()));
  await p.getByTestId('rm-eye-above').click(); await p.waitForTimeout(300);
  ok('VW-overview', 'Overview returns to the cutaway', (await st.getAttribute('data-view')) === 'overview' && !t.errs.length, t.errs.slice(0, 2).join(' | '));
  await t.close(); }

// the commentary booth's equipment: headset and lip microphones, the commentary unit, intercom key panel, the codec, switch and wall box, and
// cable runs by kind — in the 3D and on the plan
{ const t = await open('#/lite/w/stadium/r/STA-CMT-1', { role: 'architect', sw: false }); const p = t.page; const st = p.getByTestId('rm-room-3d'); await st.waitFor();
  const before = await st.locator('.l3-hitbtn').count(); await p.getByTestId('rm-equip').click(); await p.waitForTimeout(300);
  const labels = await st.evaluate((el) => [...el.querySelectorAll('.l3-hitbtn')].map((b) => b.getAttribute('aria-label')).join(' | '));
  ok('VW-booth-eq', 'with equipment shown the booth has its headset and lip microphones, commentary unit, intercom key panel, IP audio codec, network switch and wall box to the broadcast compound', ['Commentator headset 1 with boom microphone', 'Lip microphone 1', 'Commentary unit', 'Intercom key panel', 'IP audio codec', 'Network switch', 'Wall box to the broadcast compound'].every((s) => labels.includes(s)) && (await st.locator('.l3-hitbtn').count()) > before, labels.slice(0, 200));
  ok('VW-booth-legend', 'the cable runs are named by kind and said to be designed, not traced', /Audio/.test(await p.getByTestId('rm-legend').innerText()) && /Network/.test(await p.getByTestId('rm-legend').innerText()) && /not traced/.test(await p.getByTestId('rm-legend').innerText()));
  await st.locator('.l3-hitbtn[aria-label^="Intercom key panel"]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200); const said = await p.getByTestId('rm-says').innerText();
  ok('VW-booth-card', 'the intercom key panel says what class of device it is, where it is and how it is connected — and that it is a class, not a make or model', /intercom key panel, 12 keys/.test(said) && /not a make or model/.test(said) && /at [\d.]+, [\d.]+ m/.test(said), said);
  await p.getByTestId('rm-view-plan').click(); await p.getByTestId('rm-plan').waitFor(); const runs = await p.locator('[data-testid=rm-plan] .pl-run').count(); const kinds = await p.locator('[data-testid=rm-plan] .pl-run').evaluateAll((r) => [...new Set(r.map((x) => x.getAttribute('data-kind')))].sort().join(','));
  ok('VW-booth-plan', 'the plan shows the runs by kind (audio, network, signal)', runs >= 8 && kinds === 'audio,network,signal' && !t.errs.length, `${runs} ${kinds}`);
  await t.close(); }

// a campus room in Engineer mode: the plan to scale with the design record's positions and its proposed connections
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer&ov=camera,mic,speaker', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lite-room-3d').waitFor();
  await p.getByTestId('lite-eye-plan').click(); await p.getByTestId('rm-plan').waitFor(); await p.waitForTimeout(300);
  const runs = await p.locator('[data-testid=rm-plan] .pl-run').count(); const rec = await p.locator('[data-testid=rm-plan] [data-testid^=pl-piece-rec-]').count();
  ok('VW-campus-plan', 'Atlas 4.218 on the plan: 6.60 × 9.80 m, the rack positions from its design record and its 16 proposed connections as runs', /6\.60 m/.test(await p.getByTestId('pl-width').textContent()) && rec >= 3 && runs === 16 && /eye=plan/.test(p.url()), `${rec} ${runs}`);
  await p.getByTestId('lite-eye-above').click(); await p.waitForTimeout(400);
  ok('VW-campus-back', 'Above returns to the 3D', (await p.getByTestId('lite-room-3d').getAttribute('data-look')) === 'empathia' && (await p.getByTestId('rm-plan').count()) === 0 && !t.errs.length, t.errs.slice(0, 2).join(' | '));
  await t.close(); }

// the coverage toggles on the room itself and V2.5.3's Layers sheet (13 Nov 2026, founder: "the toggles for coverages in lite much closer to
// the action so it's easy for an engineer to use"): a chip on the stage turns a coverage on and the URL and the panel agree; the Layers
// button opens a sheet with the four states, the coverages, the X-ray and the layers; Escape closes it and gives focus back to the button
{ const t = await open('#/lite/room/R-ATL-4-218?mode=engineer', { role: 'architect', sw: false }); const p = t.page; await p.getByTestId('lite-room-3d').waitFor();
  const chip = p.getByTestId('stage-ov-speaker'); const was = (await chip.getAttribute('aria-checked')) === 'true'; await chip.click(); await p.waitForTimeout(300);
  const now = (await chip.getAttribute('aria-checked')) === 'true'; const inUrl = /[?&]ov=[^&]*speaker/.test(decodeURIComponent(p.url()));
  ok('VW-stage-chip', 'a coverage chip on the stage turns that coverage on, says its figure, and the address records it', now !== was && now && inUrl && /\d/.test(await chip.innerText()), `${was}→${now} ${p.url().split('?')[1]}`);
  await p.getByTestId('stage-layers-open').click(); const sh = p.getByTestId('stage-layers'); await sh.waitFor();
  const parts = { states: await sh.locator('[data-testid^=stage-state-]').count(), cov: await sh.locator('[data-testid^=stage-sw-ov-]').count(), x: await sh.locator('[data-testid^=stage-sw-x-]').count(), ly: await sh.locator('[data-testid^=stage-sw-ly-]').count(), chips: await p.getByTestId('stage-coverage').count() };
  ok('VW-stage-sheet', 'Layers opens a sheet on the room with the four states, every coverage, the X-ray and the layers; the chips step aside under it', parts.states === 4 && parts.cov >= 4 && parts.x === 1 && parts.ly >= 3 && parts.chips === 0 && (await sh.getByTestId('stage-sw-ov-speaker').getAttribute('aria-checked')) === 'true', JSON.stringify(parts));
  await sh.getByTestId('stage-state-designed').click(); await p.waitForTimeout(300);
  ok('VW-stage-state', 'a state picked in the sheet changes the room to that state', /[?&]state=designed/.test(p.url()) && (await sh.getByTestId('stage-state-designed').getAttribute('aria-checked')) === 'true', p.url().split('?')[1]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok('VW-stage-close', 'Escape closes the sheet and focus returns to the Layers button', (await p.getByTestId('stage-layers').count()) === 0 && (await p.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'stage-layers-open' && !t.errs.length, t.errs.slice(0, 2).join(' | '));
  await t.close(); }

// all 140 campus rooms: each opens on its plan to scale with every object of its layout a button on it, with no console error. The room ids
// come from the same code the demonstration draws them with.
{ const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path'); const { pathToFileURL, fileURLToPath } = await import('node:url');
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js')); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'views-'));
  fs.writeFileSync(path.join(tmp, 'e.ts'), `export { v253RoomIds } from '${repo}/apps/demo/src/lite/v253/v253room.ts';\n`);
  await esbuild.build({ entryPoints: [path.join(tmp, 'e.ts')], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const ids = (await import(pathToFileURL(path.join(tmp, 'o.mjs')).href)).v253RoomIds(); fs.rmSync(tmp, { recursive: true, force: true });
  const t = await open('#/lite', { role: 'architect', sw: false }); const p = t.page; const base = p.url().split('#')[0]; const bad = []; let seen = 0;
  for (const id of ids) { await p.goto(`${base}#/lite/room/${encodeURIComponent(id)}?eye=plan`); const pl = p.getByTestId('rm-plan');
    try { await pl.waitFor({ timeout: 8000 }); const n = Number(await pl.getAttribute('data-pieces')), b = await pl.locator('[data-testid^=pl-piece-]').count(); if (b !== n || n < 3) bad.push(`${id} ${b}/${n}`); seen++; } catch { bad.push(`${id} no plan`); } }
  ok('VW-all-campus', 'all 140 campus rooms open on their plan to scale, every object of their layout a button on it, with no console error', ids.length === 140 && seen === 140 && !bad.length && !t.errs.length, `${seen} rooms; ${bad.slice(0, 4).join(', ')} ${t.errs.slice(0, 2).join(' | ')}`);
  await t.close(); }
await done();
