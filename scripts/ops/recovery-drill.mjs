#!/usr/bin/env node
/**
 * Markers for a recovery drill on a hosted demonstration database (founder, 17 Nov 2026: "Perform a controlled recovery drill and
 * document recovery time, data loss, and restore integrity"). HTTP only, through the public API: it needs no database access.
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/ops/recovery-drill.mjs mark       --api=<api url>     before the export or the recovery point
 *   NODE_USE_ENV_PROXY=1 node scripts/ops/recovery-drill.mjs mark-after                     after it
 *   NODE_USE_ENV_PROXY=1 node scripts/ops/recovery-drill.mjs check      [--api=<url of an API serving the recovered copy>]
 *
 * mark        opens a sandbox of its own and records one mounting in it (version 1). The moment is the "before" marker.
 * mark-after  records a second mounting in the same sandbox (version 2): the "after" marker. Something recorded after an export or
 *             after a recovery point cannot be in the recovered copy; this is how the drill shows it, and measures how much was lost.
 * check       opens the sandbox with its key on the API it is pointed at and says which markers that database holds.
 *
 * The sandbox's id and key are kept in .local/recovery-drill.json (ignored by git, readable by the owner only) and are never printed.
 * The sandbox is synthetic and lasts as long as any other (72 hours): make the export or choose the recovery point within that time.
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(repo, '.local/recovery-drill.json');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=').replace(/\/$/, '');
const cmd = process.argv[2];
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const save = (s) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(s, null, 1) + '\n', { mode: 0o600 }); };
const call = async (base, method, p, { token, body } = {}) => { const r = await fetch(base + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const session = async (base, s, role) => { const a = await call(base, 'POST', '/v1/demo/sessions', { body: { sandboxId: s.sandboxId, key: s.key, role } }); if (a.status !== 200) throw new Error(`no session: ${a.status} ${a.body?.detail || ''}`); return a.body.accessToken; };
const mount = (base, s, token, note) => call(base, 'PUT', `/v1/rooms/${s.room}/field-record/mounting/${s.device}`, { token, body: { method: 'wall-bracket', heightM: 1.4, fixing: 'bracket and four anchors (synthetic)', backing: 'plywood backing (synthetic)', note } });
const minutes = (a, b) => ((Date.parse(b) - Date.parse(a)) / 60000).toFixed(1);

try {
  if (cmd === 'mark') {
    const base = arg('api'); if (!/^https?:\/\//.test(base)) throw new Error('--api=<api url> is required');
    const o = await call(base, 'POST', '/v1/demo/sandboxes', { body: {} }); if (o.status !== 201) throw new Error(`the sandbox did not open: ${o.status} ${o.body?.detail || ''}`);
    const s = { api: base, sandboxId: o.body.sandbox.id, key: o.body.sandbox.key, tenant: o.body.sandbox.tenant, room: o.body.scenario.room, expiresAt: o.body.sandbox.expiresAt };
    const f = await call(base, 'GET', `/v1/rooms/${s.room}/field-record`, { token: o.body.session.accessToken }); s.device = f.body.devices[0].asset;
    const m = await mount(base, s, o.body.session.accessToken, 'recovery drill: before the export or recovery point (synthetic)'); if (m.status !== 200) throw new Error(`the marker was not recorded: ${m.status} ${m.body?.detail || ''}`);
    s.before = { at: new Date().toISOString(), version: m.body.version }; save(s);
    console.log(`marked BEFORE at ${s.before.at}: ${s.tenant}, ${s.device} mounting version ${s.before.version}. Make the export, or choose a recovery point, after this time and before ${s.expiresAt}.`);
  } else if (cmd === 'mark-after') {
    if (!state) throw new Error('there is no marker yet: run mark first');
    const m = await mount(state.api, state, await session(state.api, state, 'installer'), 'recovery drill: after the export or recovery point (synthetic)'); if (m.status !== 200) throw new Error(`the marker was not recorded: ${m.status} ${m.body?.detail || ''}`);
    state.after = { at: new Date().toISOString(), version: m.body.version }; save(state);
    console.log(`marked AFTER at ${state.after.at}: ${state.device} mounting version ${state.after.version} (${minutes(state.before.at, state.after.at)} minutes after the first marker).`);
  } else if (cmd === 'check') {
    if (!state) throw new Error('there is no marker: run mark first');
    const base = arg('api') || state.api; const f = await call(base, 'GET', `/v1/rooms/${state.room}/field-record`, { token: await session(base, state, 'exec') });
    const v = Number(f.body?.devices?.find((d) => d.asset === state.device)?.mounting?.version || 0);
    const before = v >= state.before.version; const after = !!state.after && v >= state.after.version;
    console.log(`${base}: the sandbox opens with its key; ${state.device} mounting version ${v}.`);
    console.log(`  BEFORE marker (${state.before.at}): ${before ? 'present' : 'MISSING'}`);
    console.log(`  AFTER marker ${state.after ? `(${state.after.at})` : '(not made)'}: ${!state.after ? 'n/a' : after ? 'present: this database holds everything up to it' : 'absent: what was recorded after the export or recovery point is not in this database'}`);
    process.exit(before ? 0 : 1);
  } else { console.error('usage: recovery-drill.mjs mark --api=<url> | mark-after | check [--api=<url>]'); process.exit(2); }
} catch (e) { console.error(`recovery-drill: ${(e && e.message) || e}`); process.exit(1); }
