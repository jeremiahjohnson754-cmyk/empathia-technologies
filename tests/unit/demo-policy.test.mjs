// The demonstration's access policy (D44) and Scouter's evaluation, as pure functions: every role × every registered page, section
// and action; deny by default; the V2.5.3 tables honoured exactly; home tabs never lead to a refusal; Scouter gates before it scores.
//   node --test tests/unit/demo-policy.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
// bundle the TypeScript sources once (page modules stay lazy imports and are never executed here)
const entry = `export * as P from './access/policy.ts'; export * as R from './registry.pages.ts'; export * as V from './access/v253.ts'; export * as S from './scouter/evaluate.ts'; export * as D from './scouter/data.ts';`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-policy-')), 'm.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false,
  alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') }, plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined); } }] });
const { P, R, V, S, D } = await import(pathToFileURL(out).href);

const ROLES = P.ROLE_KEYS; const V14 = V.AZ_KEYS;
const surfaces = R.PAGES.flatMap((p) => [{ kind: 'page', p, a: p.authority }, ...(p.sections || []).map((s) => ({ kind: 'section', p, s, a: s.authority })), ...(p.actions || []).map((s) => ({ kind: 'action', p, s, a: s.authority }))]);

test('fifteen roles: the fourteen of V2.5.3 and the Document Reviewer', () => {
  assert.equal(ROLES.length, 15); for (const k of V14) assert.ok(ROLES.includes(k), k); assert.ok(ROLES.includes('qa'));
  for (const k of ROLES) { const r = P.ROLES[k]; assert.match(r.initials, /^[A-Z]{2}$/, k); assert.ok(r.label && r.home && r.domain && r.work, k); }
  assert.equal(P.DEFAULT_ROLE, 'architect');
});
test('every registered page, section and action names an authority the policy knows (deny by default otherwise)', () => {
  assert.ok(R.PAGES.length >= 10);
  const ids = new Set(); for (const p of R.PAGES) { assert.ok(!ids.has(p.id), `duplicate page id ${p.id}`); ids.add(p.id); }
  for (const x of surfaces) assert.ok(P.known(x.a), `${x.kind} ${x.p.id}${x.s ? ' › ' + x.s.id : ''}: unknown authority ${JSON.stringify(x.a)}`);
});
test('deny by default: unknown authorities, actions and sections admit nobody', () => {
  for (const a of [{ area: 'no-such' }, { action: 'no.such' }, { field: 'nope' }, { compare: 'x' }, { lens: 'x' }, { layer: 'x' }, { entity: 'X' }, { all: [] }, { roles: [], why: 'x' }, {}]) {
    assert.deepEqual(P.rolesFor(a), [], JSON.stringify(a)); assert.equal(P.known(a), false, JSON.stringify(a));
  }
  const at = R.resolve('#/campus/scouter');
  for (const k of ROLES) { assert.equal(P.canDo(k, at, 'no.such.action'), false); assert.equal(P.canSee(k, at, 'no.such.section'), false); }
  assert.deepEqual(P.rolesFor(P.legacyAuthority('totally-unknown')), ['architect'], 'unknown legacy areas fall to V2.5.3 none: the architect only');
});
test('every role × every page: open exactly when the V2.5.3 table admits the role at that address', () => {
  let n = 0;
  for (const p of R.PAGES) {
    const href = R.hrefOf(p.id); const at = R.resolve(href); if (!at || at.page.id !== p.id) continue;
    for (const k of ROLES) { assert.equal(P.canOpen(k, at), P.rolesFor(P.authorityAt(at)).includes(k), `${k} ${p.id}`); n += 1; }
  }
  assert.ok(n >= 15 * 10, `checked ${n}`);
});
test('every role × every section and action: needs the page and its own authority', () => {
  for (const x of surfaces.filter((s) => s.kind !== 'page')) {
    const at = R.resolve(R.hrefOf(x.p.id)); if (!at || at.page.id !== x.p.id) continue;
    for (const k of ROLES) {
      const want = P.canOpen(k, at) && P.rolesFor(x.a).includes(k);
      assert.equal(x.kind === 'section' ? P.canSee(k, at, x.s.id) : P.canDo(k, at, x.s.id), want, `${k} ${x.kind} ${x.p.id} › ${x.s.id}`);
    }
  }
});
test('every V2.5.3 action key is an action, with exactly its V2.5.3 roles (qa only where ADR-0005 grants it)', () => {
  const keys = Object.keys(V.AZ_ACTION); assert.equal(keys.length, 55);
  for (const a of keys) for (const k of ROLES) {
    const want = k === 'qa' ? ['review.decide', 'cx.accept', 'decision.record', 'favourite'].includes(a) : V.AZ_ACTION[a].includes(k);
    assert.equal(P.canDo(k, null, a), want, `${k} ${a}`);
  }
});
test('V2.5.3 areas, spot-checked against 12-authz.js', () => {
  const who = (h) => P.whoCanOpen(R.resolve(h)).sort();
  assert.deepEqual(who('#/campus/scouter'), ['architect', 'designer', 'ops', 'syseng']);
  assert.deepEqual(who('#/scouter'), who('#/campus/scouter'), 'the V2.5.3 address opens the same page with the same policy');
  assert.deepEqual(who('#/v25/exec'), ['architect', 'exec', 'ops']);
  assert.ok(who('#/search').length === 15, 'Search Party is everyone’s');
  assert.deepEqual(who('#/search/quality'), ['architect', 'steward'], 'the exact address (sub-view) narrows who may open it');
  assert.ok(!who('#/v25/service').includes('visitor') && !who('#/v25/service').includes('exec'));
  assert.ok(who('#/investor').length === 15 && who('#/v25/policy').length === 15);
});
test('home tabs follow V2.5.3 tabsFor and never lead to a refusal', () => {
  for (const k of ROLES) {
    const open = (h) => { const at = R.resolve(h); return !!at && P.canOpen(k, at); };
    const tabs = P.tabsFor(k, open, (h) => { const at = R.resolve(h); return at && !Object.keys(at.params).length ? R.hrefOf(at.page.id) : h; });
    for (const t of tabs) if (!t.act) assert.ok(open(t.href), `${k} tab ${t.label} → ${t.href}`);
    if (k === 'architect') assert.ok(tabs.some((t) => t.act === 'viewas'), 'the architect keeps V2.5.3’s View as tab');
  }
  const d = P.tabsFor('designer', (h) => { const at = R.resolve(h); return !!at && P.canOpen('designer', at); }, (h) => { const at = R.resolve(h); return at ? R.hrefOf(at.page.id) : h; });
  assert.ok(d.some((t) => t.label === 'Scouter' && t.href === '#/campus/scouter'), 'Scouter is one tap from the designer’s home (D41)');
});
test('surfaces: how much of V2.5.3 each role reaches', () => {
  assert.equal(P.surfaces('architect').surfaces, P.surfaces('architect').of);
  assert.ok(P.surfaces('visitor').surfaces < P.surfaces('employee').surfaces);
});

// ------------------------------------------------------------------ Scouter
const room = (id) => D.ROOMS.find((r) => r.id === id);
test('Scouter: hard gates come before the score; a score never rescues a failed gate', () => {
  const ev = S.evaluate(room('R-ATL-4-218'), D.REQUIREMENTS.camera, D.CANDIDATES);
  assert.ok(ev.length >= 3 && ev.every((e) => e.candidate.category === 'camera'));
  const firstOut = ev.findIndex((e) => !e.eligible); if (firstOut >= 0) assert.ok(ev.slice(firstOut).every((e) => !e.eligible && e.rank === null), 'every eligible candidate ranks above every ineligible one');
  const huddle = ev.find((e) => e.candidate.id === 'CAM-ORB4K'); assert.equal(huddle.eligible, false, 'not listed for a huddle room'); assert.ok(huddle.gates.find((g) => g.id === 'archetype' && !g.met));
});
test('Scouter: a pilot needs a pilot plan; sunset and replace are never chosen', () => {
  const pilot = (r) => S.evaluate(room(r), D.REQUIREMENTS.camera, D.CANDIDATES).find((e) => e.candidate.id === 'CAM-ORB4K2');
  assert.equal(pilot('R-MER-1-140').gates.find((g) => g.id === 'state').met, false);
  assert.equal(pilot('R-BCN-3-101').gates.find((g) => g.id === 'state').met, true);
  for (const r of D.ROOMS) for (const c of Object.keys(D.REQUIREMENTS)) for (const e of S.evaluate(r, D.REQUIREMENTS[c], D.CANDIDATES)) if (['SUNSET', 'REPLACE', 'BLOCKED', 'WATCH', 'EVALUATE'].includes(e.candidate.state)) assert.equal(e.eligible, false, e.candidate.id);
});
test('Scouter: an unknown must-have is not met; unknown dimensions are left out, not zero', () => {
  const e = S.evaluate(room('R-ATL-4-218'), { category: 'micceil', mustHave: [{ dim: 'video', min: 1 }], budget: 99999 }, D.CANDIDATES).find((x) => x.candidate.id === 'MIC-HALO8');
  assert.equal(e.gates.find((g) => g.id === 'musthave').met, false); assert.match(e.gates.find((g) => g.id === 'musthave').why, /cannot be confirmed/);
  const unknown = e.dims.filter((d) => d.value == null); assert.ok(unknown.length && unknown.every((d) => d.basis === 'UNKNOWN'));
  assert.ok(e.coverage < 1 && e.score > 0, 'the score rests on the known weight and says how much');
});
test('Scouter: spatial fit is modelled from the room, never measured', () => {
  for (const r of D.ROOMS) for (const c of Object.keys(D.REQUIREMENTS)) for (const e of S.evaluate(r, D.REQUIREMENTS[c], D.CANDIDATES)) {
    const sp = e.dims.find((d) => d.dim === 'spatial'); assert.ok(sp.basis === 'MODELED' || sp.basis === 'UNKNOWN'); assert.ok(sp.value == null || (sp.value >= 1 && sp.value <= 5));
  }
  assert.equal(S.DIMS.length, 15); assert.equal(Object.keys(S.STATES).length, 9);
});
