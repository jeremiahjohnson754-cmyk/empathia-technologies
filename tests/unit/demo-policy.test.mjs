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
await esbuild.build({ stdin: { contents: entry, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', splitting: false, nodePaths: [path.join(repo, 'node_modules')],
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

// ------------------------------------------------------------------ Scouter (this build's data only)
const ev = (k) => S.evaluate(k, D.templates[k], D.cats, D.required);
test('Scouter: the nine catalogue device classes, checked for every meeting room, deterministically', () => {
  assert.equal(S.CANDIDATES.length, 9); for (const k of S.CANDIDATES) assert.ok(D.cats[k], k);
  for (const r of D.ROOMS) { const a = ev(r.key); assert.equal(a.length, 9, r.key); assert.deepEqual(a, ev(r.key)); }
});
test('Scouter: every check names its source in the domain data and is PUBLISHED or MODELED', () => {
  for (const r of D.ROOMS) for (const e of ev(r.key)) for (const c of e.checks) {
    assert.ok(['PUBLISHED', 'MODELED'].includes(c.basis)); assert.match(c.source, /V25_ROOM_(CATS|TEMPLATES|REQUIRED)/); assert.ok(c.detail.length > 10);
  }
});
test('Scouter: verdicts follow the room’s own requirement and geometry', () => {
  const v = (room, k) => ev(room).find((e) => e.key === k).verdict;
  assert.equal(v('huddle', 'micceil'), 'NOT_REQUIRED', 'HUD requires display and camera only (V25_ROOM_REQUIRED)');
  assert.equal(v('huddle', 'display'), 'SUITS');
  assert.equal(v('huddle', 'ledwall'), 'DOES_NOT_SUIT', 'a 4.8 m wall does not fit a 3 m wide huddle room');
  assert.equal(v('training', 'bar'), 'DOES_NOT_SUIT', 'a 4.5 m pickup does not reach an 11 m room');
  assert.equal(v('training', 'micceil'), 'SUITS_WITH_CONDITION');
  assert.match(ev('training').find((e) => e.key === 'micceil').condition, /Needs \d units/);
  assert.equal(v('private_office', 'camera'), 'NOT_REQUIRED');
});
test('Scouter: nothing invented — no price, brand or model in any output; the gaps are listed with their parity rows', () => {
  const text = JSON.stringify(D.ROOMS.map((r) => ev(r.key)));
  assert.doesNotMatch(text, /\$|USD|price|Vantora|Orvique|Sonarith/i);
  assert.ok(S.NOT_REBUILT.length >= 3 && S.NOT_REBUILT.every((n) => /LP-\d{3}|CR-\d+/.test(n.rows)));
  const r = S.ranked(ev('medium_conf')); const order = ['SUITS', 'SUITS_WITH_CONDITION', 'DOES_NOT_SUIT', 'NOT_REQUIRED'];
  assert.ok(r.every((e, i) => i === 0 || order.indexOf(e.verdict) >= order.indexOf(r[i - 1].verdict)), 'ranked by verdict');
});

// ------------------------------------------------------------------ role colours against the Graphite (dark) and Paper (light) tokens
test('role colours: fifteen distinct hues, ≥ 4.5:1 on every ground in both themes, never the teal accent (D8)', () => {
  const css = fs.readFileSync(path.join(repo, 'apps/demo/src/styles/shell.css'), 'utf8');
  const block = (sel) => Object.fromEntries([...css.slice(css.indexOf(sel)).split('}')[0].matchAll(/--role-(\w+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
  const dark = block(':root {\n  --role-'); const light = block(':root[data-theme="light"] {'); const darkAgain = block(':root[data-theme="dark"] {');
  const tok = JSON.parse(fs.readFileSync(path.join(repo, 'packages/design-tokens/tokens.json'), 'utf8')).color;
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  assert.deepEqual(Object.keys(dark).sort(), [...ROLES].sort()); assert.deepEqual(Object.keys(light).sort(), [...ROLES].sort()); assert.deepEqual(darkAgain, dark, 'the explicit Dark block repeats the default');
  for (const [mode, set] of [['dark', dark], ['light', light]]) {
    assert.equal(new Set(Object.values(set)).size, 15, `${mode}: distinct`);
    for (const [k, c] of Object.entries(set)) {
      assert.notEqual(c, tok.accent[mode].toLowerCase(), `${k} is not the accent`);
      for (const g of ['bg', 'bg2', 'panel', 'panel2']) assert.ok(cr(c, tok[g][mode]) >= 4.5, `${mode} ${k} ${c} on ${g} ${tok[g][mode]}: ${cr(c, tok[g][mode]).toFixed(2)}`);
    }
  }
});
test('every registered page belongs to one of the nine products (packages/ui products.ts) or to the shell, in canonical order', async () => {
  const { PRODUCT_IDS, checkProductOrder, PRODUCTS } = await import(pathToFileURL(path.join(repo, 'packages/ui/src/products.ts')).href);
  for (const p of R.PAGES) assert.ok(p.product === 'shell' || PRODUCT_IDS.includes(p.product), `${p.id}: ${p.product}`);
  const shown = PRODUCTS.filter((x) => R.PAGES.some((p) => p.product === x.id)).map((x) => x.name);
  assert.deepEqual(checkProductOrder(shown, { requireAll: false }), []);
});
