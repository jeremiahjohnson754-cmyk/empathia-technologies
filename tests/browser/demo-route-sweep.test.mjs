#!/usr/bin/env node
// Every route of the demonstration, opened (founder's master directive, 20 Nov 2026, §21: "Every accessible major route has been
// inventoried"; "Critical navigation paths have been exercised"). The routes are read from the page registries themselves
// (apps/demo/src/registry*.ts), so a page added later is swept without editing this file. A route with parameters is opened with values
// the other suites already use. Each is opened by the address, as a link or a bookmark would, at a phone (390 × 844) and a desktop
// (1440 × 900), as the architect, and must show its heading, log no error, request nothing off the page and never scroll sideways.
// A route this role may not open shows the access page, which is a heading too; that is recorded, not failed.
//   node tests/browser/demo-route-sweep.test.mjs
import fs from 'node:fs'; import path from 'node:path';
import { harness, repo } from './demo-shell-lib.mjs';
const { open, ok, done } = await harness('demo-route-sweep');

const routes = [];
for (const f of fs.readdirSync(path.join(repo, 'apps/demo/src')).filter((x) => /^registry.*\.ts$/.test(x))) {
  const s = fs.readFileSync(path.join(repo, 'apps/demo/src', f), 'utf8');
  for (const m of s.matchAll(/path: '([^']+)'/g)) { const back = s.slice(Math.max(0, m.index - 900), m.index); const i = back.lastIndexOf("id: '"); if (i < 0) continue;
    const id = /id: '([^']+)'/.exec(back.slice(i))[1]; routes.push({ id, path: m[1] }); }
}
// values for the parameters, as the other suites use them
const VAL = { room: 'R-ATL-4-218', building: 'ATL', floor: '4', world: 'stadium', journey: 'attend-game', chapter: 's01e01', view: 'signals', fault: 'camera-feed', id: 'REQ-0001' };
const hashOf = (p) => '#' + p.replace(/\/\*$/, '').replace(/:([a-z]+)/g, (_, k) => VAL[k] || k);
const seen = new Set(); const list = routes.filter((r) => { const h = hashOf(r.path); if (seen.has(h)) return false; seen.add(h); return true; });

const out = new Map();
for (const [tag, w, h] of [['phone', 390, 844], ['desk', 1440, 900]]) {
  const t = await open('#/campus', { role: 'architect', sw: false, w, h, reduced: true }); const p = t.page; p.setDefaultTimeout(12000);
  for (const r of list) {
    const hash = hashOf(r.path); const e0 = t.errs.length, o0 = t.off.length;
    await p.evaluate((x) => { location.hash = x; }, hash).catch(() => undefined);
    const h1 = await p.waitForFunction(() => { const e = document.querySelector('main h1'); return e && e.textContent.trim() ? e.textContent.trim() : null; }, null, { timeout: 8000 }).then((x) => x.jsonValue()).catch(() => '');
    await p.waitForTimeout(250);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth).catch(() => 0);
    const access = await p.evaluate(() => !!document.querySelector('[data-testid=access-page], [data-access=denied]')).catch(() => false);
    const errs = t.errs.slice(e0), off = t.off.slice(o0);
    const o = out.get(r.id) || { hash, notes: [] }; if (!h1) o.notes.push(`${tag}: no heading`); if (errs.length) o.notes.push(`${tag}: ${errs[0].slice(0, 90)}`); if (off.length) o.notes.push(`${tag}: off-page ${off[0].slice(0, 60)}`); if (wide > 1) o.notes.push(`${tag}: ${wide} px sideways`);
    o[tag] = { h1: String(h1).slice(0, 50), access }; out.set(r.id, o);
  }
  await t.close();
}
for (const [id, o] of out) ok(`RS-${id}`, `${o.hash}: a heading at 390 and 1440 px, no error, nothing off the page, no sideways scroll`, !o.notes.length, o.notes.length ? o.notes.join(' | ') : `“${o.desk?.h1}”${o.desk?.access ? ' (access page)' : ''}`);
fs.mkdirSync(path.join(repo, 'tests/evidence/demo-shell'), { recursive: true });
fs.writeFileSync(path.join(repo, 'tests/evidence/demo-shell/route-inventory.json'), JSON.stringify({ at: new Date().toISOString(), routes: [...out].map(([id, o]) => ({ id, hash: o.hash, phone: o.phone, desk: o.desk, notes: o.notes })) }, null, 1));
await done();
