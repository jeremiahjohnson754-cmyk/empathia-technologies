#!/usr/bin/env node
// The interactive demo connected to the server (ADR-0013; founder, 17 Nov 2026: "someone could inspect a device, update its field
// record, complete a commissioning workflow, switch roles, and observe the same durable history through ServiceHands, Assurance, and
// APEX — even in a fresh browser session"). A real enterprise API on a real database, a demo built with DEMO_API_URL, a real browser.
//   CN-01  a build without DEMO_API_URL carries no connected page, no server name and no way to reach one
//   CN-02  the page opens a sandbox: a synthetic organization on the server with one installed room, nothing done yet
//   CN-03  scoped permissions: the first step tried as the designer is refused by the server, in the server's words, and nothing
//          changes; done as the installer it is recorded, and both the refusal and the record are in the server's audit history
//   CN-04  a field move recorded by the installer cannot be approved by the installer; the systems engineer approves it
//   CN-05  every remaining step, each as its own person, to a whole thread: register, commissioning, a failed check, the work
//          order, the verified retest, acceptance with baseline v1, and an APEX case
//   CN-06  a fresh browser session with nothing stored opens the same sandbox from its resume code and reads the same thread
//   CN-07  the browser keeps the sandbox's id and key and nothing else: after a reload the page reads everything from the server
//   CN-08  reset: a new sandbox with nothing done; the old resume code opens nothing
//   CN-09  phone width: nothing scrolls sideways; no console error; nothing requested except the page and the configured server
//   CN-10  with the server stopped the page says so and points at the browser-resident thread
//   node tests/browser/demo-connected.test.mjs
import { execFileSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { repo } from './demo-shell-lib.mjs';
import { setup } from '../integration/harness.mjs';

const API_PORT = 4187; const API = `http://127.0.0.1:${API_PORT}`;
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-connected-'));
execFileSync(process.execPath, [path.join(repo, 'apps/demo/build.mjs')], { env: { ...process.env, DEMO_DIST: dist, DEMO_API_URL: API }, stdio: ['ignore', 'ignore', 'inherit'] });
process.env.DEMO_DIST = dist; process.env.DEMO_API_URL = API;   // the static server serves this build and lets the page call this one origin
const { harness } = await import('./demo-shell-lib.mjs');
const { base, ok, open, done } = await harness('demo-connected');
const h = await setup({ db: 'empathia_connected', port: API_PORT, env: { DEMO_SESSIONS: 'on', CORS_ORIGINS: base.replace(/\/$/, '') } });
h.asSuper('UPDATE app.demo_config SET enabled = true');
const n = (s) => Number(h.asSuper(s));
const text = (p, id) => p.getByTestId(id).innerText();
const settle = async (p, ms = 240000) => { await p.waitForFunction(() => !document.querySelector('[data-testid=cn-busy]'), null, { timeout: ms }); await p.waitForTimeout(150); };
const said = async (p) => ({ ok: await p.getByTestId('cn-said').getAttribute('data-ok'), text: await text(p, 'cn-said') });

// CN-01: the ordinary build (when there is one beside this run)
{ const std = path.join(repo, 'apps/demo/dist'); const files = fs.existsSync(std) ? fs.readdirSync(std, { recursive: true }).map(String).filter((f) => /\.(js|html)$/.test(f)) : [];
  const hits = files.filter((f) => { const s = fs.readFileSync(path.join(std, f), 'utf8'); return /cn-connection|\/v1\/demo\/sandboxes|thread\.server/.test(s); });
  const mine = fs.readdirSync(dist, { recursive: true }).map(String).filter((f) => /\.js$/.test(f)).some((f) => /cn-connection/.test(fs.readFileSync(path.join(dist, f), 'utf8')));
  const csp = fs.readFileSync(path.join(dist, 'index.html'), 'utf8').match(/connect-src ([^;]+)/)?.[1] || ''; const stdCsp = files.length ? fs.readFileSync(path.join(std, 'index.html'), 'utf8').match(/connect-src ([^;]+)/)?.[1] || '' : "'self'";
  ok('CN-01', 'a build without DEMO_API_URL carries no connected page and may call no server; the connected build names exactly its server', files.length > 0 && hits.length === 0 && mine && csp === `'self' ${API}` && stdCsp === "'self'", `${files.length} files · hits ${hits.slice(0, 3)} · connected ${mine} · csp ${csp} / ${stdCsp}`); }

const t = await open('#/connected', { role: 'syseng', sw: false }); const p = t.page; p.setDefaultTimeout(30000);
let tenant, code;
{ await p.getByTestId('connected').waitFor(); await p.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  const before = n('SELECT count(*) FROM app.demo_sandbox');
  await p.getByTestId('cn-open').click(); await settle(p); await p.getByTestId('cn-journey').waitFor();
  tenant = await text(p, 'cn-tenant'); code = await p.getByTestId('cn-code').inputValue(); const journey = await text(p, 'cn-journey'); const thread = await text(p, 'cn-thread');
  ok('CN-02', 'the page opens a sandbox: a synthetic organization on the server with one installed room and nothing done yet',
    /^sbx-[0-9a-f]{16}$/.test(tenant) && n('SELECT count(*) FROM app.demo_sandbox') === before + 1 && n(`SELECT count(*) FROM app.tenant WHERE slug = '${tenant}'`) === 1 && /^0 of 19 steps/.test(journey.split('\n').find((l) => /steps/.test(l)) || '')
    && /INSTALLED_UNVERIFIED/.test(thread) && /^0 of \d+ complete/.test(await text(p, 'cn-register')) && /^0 of /.test(await text(p, 'cn-mounted')) && /^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(code), `${tenant} · ${journey.slice(0, 80)}`); }

{ const denied0 = n(`SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = '${tenant}' AND e.outcome = 'DENIED'`);
  await p.getByTestId('cn-try-role').selectOption('designer'); await p.getByTestId('cn-try').click(); await settle(p);
  const no = await said(p); const still = await text(p, 'cn-mounted'); const denied1 = n(`SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = '${tenant}' AND e.outcome = 'DENIED'`);
  await p.getByTestId('cn-run').click(); await settle(p);
  const yes = await said(p); const now = await text(p, 'cn-mounted'); const audit = await text(p, 'cn-audit');
  ok('CN-03', 'tried as the designer the step is refused by the server in its own words and nothing changes; as the installer it is recorded; both are in the audit history',
    no.ok === 'no' && /Refused by the server \(403\)/.test(no.text) && /Designer/.test(no.text) && /may not record how a device is mounted/.test(no.text) && /^0 of /.test(still) && denied1 === denied0 + 1
    && yes.ok === 'yes' && /^1 of /.test(now) && /Wall bracket/.test(now) && /field\.mounting\.record/.test(audit) && /DENIED/.test(await text(p, 'cn-audit-counts')) && n('SELECT count(*) FROM app.field_mounting') === 1, `${no.text.slice(0, 150)} | ${now.slice(0, 60)}`); }

{ await p.getByTestId('cn-run').click(); await settle(p);   // the installer records the field move
  const proposed = await text(p, 'cn-moves'); const step = await p.getByTestId('cn-next').getAttribute('data-step');
  await p.getByTestId('cn-try-role').selectOption('installer'); await p.getByTestId('cn-try').click(); await settle(p);
  const no = await said(p); const stillProposed = await text(p, 'cn-moves');
  await p.getByTestId('cn-run').click(); await settle(p); const approved = await text(p, 'cn-moves');
  ok('CN-04', 'the installer who recorded the move cannot approve it; the systems engineer does; the as-built position is kept beside the design',
    /PROPOSED/.test(proposed) && step === 'approve-move' && no.ok === 'no' && /\(403\)/.test(no.text) && /PROPOSED/.test(stillProposed) && /APPROVED/.test(approved) && /Systems Engineer/.test(approved)
    && n("SELECT count(*) FROM app.field_move WHERE state = 'APPROVED' AND decided_by <> recorded_by") === 1 && n('SELECT count(*) FROM app.room_revision') === n('SELECT count(*) FROM app.room'), `${no.text.slice(0, 120)} | ${approved.slice(0, 80)}`); }

let whole;
{ await p.getByTestId('cn-run-all').click(); await settle(p, 420000);
  const complete = await p.getByTestId('connected').getAttribute('data-complete'); const steps = await p.locator('[data-testid=cn-steps] li[data-state=done]').count(); whole = await text(p, 'cn-thread');
  const tid = h.asSuper(`SELECT id FROM app.tenant WHERE slug = '${tenant}'`); const c = (sql) => n(sql.replace('$T', `'${tid}'`));
  ok('CN-05', 'every remaining step, each as its own person, to a whole thread with its records in the database',
    complete === 'yes' && steps === 19 && /ACCEPTED/.test(whole) && /CLOSED/.test(await text(p, 'cn-wos')) && /retest PASS/.test(await text(p, 'cn-issues')) && /v1/.test(await text(p, 'cn-baselines')) && /CURRENT/.test(await text(p, 'cn-baselines')) && /hypothes[ie]s/.test(await text(p, 'cn-cases'))
    && c("SELECT count(*) FROM app.work_order WHERE tenant_id = $T AND state = 'CLOSED'") === 1 && c("SELECT count(*) FROM app.assurance_baseline WHERE tenant_id = $T AND state = 'CURRENT'") === 1 && c('SELECT count(*) FROM app.apex_case WHERE tenant_id = $T') === 1
    && c("SELECT count(*) FROM app.room WHERE tenant_id = $T AND lifecycle = 'ACCEPTED'") === 1 && c('SELECT count(DISTINCT actor_id) FROM app.audit_event WHERE tenant_id = $T') >= 9, `complete ${complete} · ${steps} steps · ${(await said(p)).text.slice(0, 160)}`); }

{ const f = await open('#/connected', { role: 'exec', sw: false }); const q = f.page; q.setDefaultTimeout(30000);
  await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  const empty = await q.evaluate(() => localStorage.getItem('empathia.demo.sandbox.v1'));
  await q.getByTestId('cn-resume-code').fill('not-a-code'); await q.getByTestId('cn-resume').click(); await settle(q); const bad = await said(q);
  await q.getByTestId('cn-resume-code').fill(code); await q.getByTestId('cn-resume').click(); await settle(q); await q.getByTestId('cn-thread').waitFor();
  const same = await text(q, 'cn-thread'); const sameTenant = await text(q, 'cn-tenant'); const complete = await q.getByTestId('connected').getAttribute('data-complete');
  ok('CN-06', 'a fresh browser session with nothing stored opens the same sandbox from its resume code and reads the same thread',
    empty === null && bad.ok === 'no' && /not a resume code/.test(bad.text) && sameTenant === tenant && same === whole && complete === 'yes' && (await q.locator('[data-testid=cn-steps] li[data-state=done]').count()) === 19 && !f.errs.length, `${sameTenant} · same ${same === whole} · ${f.errs.slice(0, 2)}`);
  await f.close(); }

{ const stored = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => /sandbox|thread|connected|field/.test(k) && /^empathia\.demo\.(sandbox|connected)/.test(k)).map((k) => [k, Object.keys(JSON.parse(localStorage.getItem(k))).sort()])));
  const session = await p.evaluate(() => JSON.stringify(Object.keys(sessionStorage).filter((k) => /token|sandbox/i.test(k))));
  await p.reload(); await p.getByTestId('cn-thread').waitFor(); await settle(p);
  ok('CN-07', 'the browser keeps the sandbox’s id and key and nothing else; after a reload the page reads everything from the server',
    JSON.stringify(stored) === JSON.stringify({ 'empathia.demo.sandbox.v1': ['expiresAt', 'id', 'key', 'room', 'tenant'] }) && session === '[]' && (await text(p, 'cn-thread')) === whole && (await text(p, 'cn-tenant')) === tenant, `${JSON.stringify(stored)} · ${session}`); }

{ await p.getByTestId('cn-reset').click(); await p.getByTestId('cn-reset-confirm').click(); await settle(p); await p.getByTestId('cn-journey').waitFor();
  const fresh = await text(p, 'cn-tenant'); const journey = await text(p, 'cn-journey'); const closed = h.asSuper(`SELECT s.closed_reason FROM app.demo_sandbox s JOIN app.tenant t ON t.id = s.tenant_id WHERE t.slug = '${tenant}'`);
  const kept = n(`SELECT count(*) FROM app.audit_event e JOIN app.tenant t ON t.id = e.tenant_id WHERE t.slug = '${tenant}'`);
  const g = await open('#/connected', { role: 'exec', sw: false }); await g.page.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  await g.page.getByTestId('cn-resume-code').fill(code); await g.page.getByTestId('cn-resume').click(); await settle(g.page); const old = await said(g.page); await g.close();
  ok('CN-08', 'reset: a new sandbox with nothing done; the old one is closed, its records kept, and its resume code opens nothing',
    fresh !== tenant && /^sbx-/.test(fresh) && /0 of 19 steps/.test(journey) && closed === 'reset' && kept > 100 && old.ok === 'no' && /did not open a sandbox/.test(old.text) && /unknown, closed or expired/.test(old.text), `${fresh} · ${closed} · ${kept} audit rows kept · ${old.text.slice(0, 100)}`);
  const offOrigin = t.off.filter((u) => !u.startsWith(API));
  // the browser logs every refused request as a console error: the two refusals this test asked for (CN-03, CN-04) are the only ones
  const other = t.errs.filter((e) => !/status of 403/.test(e));
  ok('CN-clean', 'no console error beyond the two refusals asked for; nothing requested except the page and the configured server', !other.length && t.errs.length === 2 && !offOrigin.length && t.off.length > 50, `${other.slice(0, 2).join(' | ')} · ${t.errs.length} refusals · off ${offOrigin.slice(0, 2)} · ${t.off.length} API calls`); }
await t.close();

{ const m = await open('#/connected', { role: 'installer', sw: false, w: 390, h: 844 }); const q = m.page; q.setDefaultTimeout(30000);
  await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'ready');
  const sw0 = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await q.getByTestId('cn-open').click(); await settle(q); await q.getByTestId('cn-thread').waitFor();
  const sw1 = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const small = await q.evaluate(() => [...document.querySelectorAll('[data-testid=connected] button, [data-testid=connected] select, [data-testid=connected] a.ui-btn')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 24 || r.width < 24); }).map((el) => `${el.textContent.trim().slice(0, 30)} ${Math.round(el.getBoundingClientRect().height)}px`));
  ok('CN-09', 'phone width: nothing scrolls sideways before or after a sandbox opens; every control is at least 24 px; no console error', sw0 <= 1 && sw1 <= 1 && !small.length && !m.errs.length, `overflow ${sw0}/${sw1}px · small ${small.slice(0, 3)} · ${m.errs.slice(0, 2)}`);
  await h.app.stop();
  await q.reload(); await q.waitForFunction(() => document.querySelector('[data-testid=connected]')?.getAttribute('data-state') === 'unavailable', null, { timeout: 20000 }).catch(() => undefined);
  const state = await q.getByTestId('connected').getAttribute('data-state'); const says = await text(q, 'cn-connection'); const link = await q.locator('[data-testid=cn-connection] a[href="#/thread"]').count();
  ok('CN-10', 'with the server stopped the page says so and points at the browser-resident thread', state === 'unavailable' && /did not answer/.test(says) && link === 1, `${state} · ${says.slice(0, 120)}`);
  await m.close(); }
fs.rmSync(dist, { recursive: true, force: true });
await done();
