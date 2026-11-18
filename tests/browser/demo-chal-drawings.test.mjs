#!/usr/bin/env node
// Challenge drawings restored 18 Nov 2026 (SIGNAL_INVENTORY: “the animated stage drawings for … record-take, record-panel and
// build-stream are not restored”): each is drawn from the same model as its check, redraws when a control changes, and says its status
// in words beside its colours.
import { harness } from './demo-shell-lib.mjs';
const { ok, open, done } = await harness('demo-chal-drawings');
const t = await open('#/learn/challenges', { role: 'technician' }); const p = t.page; await p.waitForSelector('[data-testid=learn-challenges]');
for (const [mode, id, word] of [['see', 'see-focus', /FOCUS (✓|✗)/], ['record', 'record-take', /CONVERTER/], ['record', 'record-panel', /FROM ABOVE/], ['build', 'build-stream', /Upload used/]]) {
  await p.locator(`[role=tab][data-mode=${mode}]`).click(); await p.locator(`[data-testid=chal-card-${id}] .ch__lv[data-lv="2"]`).click();
  const ch = p.locator('[data-testid=chal-stage] [data-testid=challenge]'); await ch.waitFor(); const svg = ch.locator('svg.ch__svg').first();
  const has = await svg.count() > 0; const txt = has ? await svg.textContent() : ''; const label = has ? await svg.getAttribute('aria-label') : '';
  ok(`CD-01 ${id}`, 'the stage is drawn, labelled and in words', has && word.test(txt) && (label || '').length > 30, (label || '').slice(0, 100));
  const before = await svg.innerHTML(); const slider = ch.locator('input[type=range]').first();
  if (await slider.count()) { await slider.focus(); await p.keyboard.press('Home'); }
  const after = await svg.innerHTML(); ok(`CD-02 ${id}`, 'it redraws when a control changes', after !== before || !(await slider.count()));
}
ok('CD-03', 'no console errors, nothing off the origin', !t.errs.length && !t.off.length, [...t.errs, ...t.off].join(' | ')); await t.close();
await done();
