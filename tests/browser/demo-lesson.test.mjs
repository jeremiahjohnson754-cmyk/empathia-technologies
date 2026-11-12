#!/usr/bin/env node
// The first equipment lesson (#/learn/lesson/teams-rooms-windows-quickstart; acceptance A5, 12 Nov 2026): it says what it applies to and
// where its steps come from, its film and the captioned silent version play (decoded, the clock moves) with a captions track whose
// words are the script's, and the practice decision gives feedback with its reason and records an attempt that grants nothing.
//   node tests/browser/demo-lesson.test.mjs
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-lesson');
for (const [w, role] of [[1440, 'employee'], [390, 'visitor']]) {
  const t = await open('#/learn/lesson/teams-rooms-windows-quickstart', { role, w, h: 900 }); const p = t.page; await p.getByTestId('lesson').waitFor();
  const app = await p.getByTestId('lesson-applies').innerText(); const src = await p.getByTestId('lesson-sources').innerText();
  ok(`LS-${w}-01`, `${w} px as ${role}: the lesson states vendor, product, platform and how rooms differ, that no demo room records its platform, its verification state in words and its two sources`,
    /Microsoft · Microsoft Teams Rooms/.test(app) && /Windows/.test(app) && /administrator setting/.test(app) && /not attached to a room automatically/.test(app) && /video generated/.test(src) && /Not device-verified/.test(src) && (await p.locator('[data-testid=lesson-sources] a[target=_blank][rel~=noopener]').count()) === 2, app.slice(0, 120));
  const play = async () => p.getByTestId('lesson-video').evaluate(async (v) => { v.muted = true; try { await v.play(); } catch (e) { return { err: String(e) }; } await new Promise((r) => setTimeout(r, 1500)); const r = { t: v.currentTime, d: v.duration, w: v.videoWidth, tracks: v.textTracks.length }; v.pause(); return r; });
  const a = await play();
  const cues = await p.getByTestId('lesson-video').evaluate(async (v) => { const tr = v.textTracks[0]; if (!tr) return 0; tr.mode = 'showing'; await new Promise((r) => setTimeout(r, 600)); return tr.cues ? tr.cues.length : 0; });
  ok(`LS-${w}-02`, 'the film decodes and plays (the clock moves), 1920 wide, about a minute, with an English captions track of ten cues', a.t > 0.5 && a.w === 1920 && a.d > 45 && a.d < 80 && a.tracks === 1 && cues === 10, JSON.stringify({ ...a, cues }));
  await p.getByTestId('lesson-film').getByRole('button', { name: /silent captioned/ }).click(); await p.waitForTimeout(300); const b = await play();
  ok(`LS-${w}-03`, 'the captioned silent version plays too', b.t > 0.5 && b.w === 1920 && !b.err, JSON.stringify(b));
  await p.getByTestId('lesson-practice').getByRole('button', { name: 'Tap Meet now and wait for the others' }).click(); const f1 = await p.getByTestId('lesson-feedback').innerText(); const c1 = await p.getByTestId('lesson-feedback').getAttribute('data-correct');
  await p.getByTestId('lesson-practice').getByRole('button', { name: 'Use Join with an ID' }).click(); const f2 = await p.getByTestId('lesson-feedback').innerText(); const c2 = await p.getByTestId('lesson-feedback').getAttribute('data-correct');
  const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('empathia.demo.lessons.v1') || '[]'));
  ok(`LS-${w}-04`, 'a wrong choice says why it is wrong; the right one says why it is right; both attempts are recorded with the lesson version, as training only', c1 === 'false' && /new meeting/.test(f1) && c2 === 'true' && /not invited/.test(f2) && rec.length === 2 && rec[1].version === '1.0-draft' && /never shows that a room or a device works/.test(await p.getByTestId('lesson-practice').innerText()), `${f1} | ${f2}`);
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`LS-${w}-05`, 'no overflow, no console error, no request leaving the page', over <= 0 && !t.errs.length && !t.off.length, [over, ...t.errs, ...t.off].slice(0, 4).join(' | '));
  await t.close();
}
await done();
