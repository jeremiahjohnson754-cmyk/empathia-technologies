// The migration ledger is checked, not only written (founder, 17 Nov 2026, 50/10 §2.3: "Every ordinary page that migrates to server
// records must stop relying on the old browser-local record as its authority… Avoid dual-write ambiguity.").
// A page the ledger calls "server" may import the server's client and the shared interface kit, and nothing that holds a record in
// the browser. This reads the pages' own imports.
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ledger = fs.readFileSync(path.join(repo, 'docs/product/MIGRATION_LEDGER.md'), 'utf8');
// pages the ledger names as server, with the source file that is the page
// 18 Nov 2026: three more pages read and write only through the server in connected builds (#/platforms, #/reports/server,
// #/servicehands/queue). They were built that day without this list or the ledger being updated; the exact-commit regression's
// demo-connected CN-13 found them calling the server, which is what they are for. They are listed here and held to the same rule.
const SERVER_PAGES = { '#/connected': 'apps/demo/src/pages/Connected.tsx', '#/flagship': 'apps/demo/src/pages/Flagship.tsx', '#/platforms': 'apps/demo/src/pages/Platforms.tsx', '#/reports/server': 'apps/demo/src/pages/ServerReports.tsx', '#/servicehands/queue': 'apps/demo/src/pages/ServiceQueue.tsx' };
// 17 Nov 2026: the flagship page gained a measurement bench. ../flagship/* are the page's own components and are held to the same
// list; ../bench/reverb.js is a calculation (impulse response in, decay times out) with no imports and no stored record, and the
// second assertion of ML-02 still checks that nothing reached through any of them holds a record.
// ./Flagship.js: the three newer server pages take the sandbox's people (PEOPLE) from the flagship server page itself, held to this rule too
const ALLOWED = [/^react$/, /^@empathia\/ui$/, /^\.\.\/connected\/[a-z]+\.js$/, /^\.\.\/flagship\/[A-Za-z]+\.js$/, /^\.\.\/bench\/reverb\.js$/, /^\.\/Flagship\.js$/];
const importsOf = (file, seen = new Set()) => {
  const abs = path.join(repo, file); if (seen.has(abs)) return []; seen.add(abs);
  const src = fs.readFileSync(abs, 'utf8'); const out = [];
  for (const m of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) { out.push({ from: file, spec: m[1] });
    if (m[1].startsWith('.')) { const next = path.relative(repo, path.resolve(path.dirname(abs), m[1].replace(/\.js$/, ''))); const f = [`${next}.ts`, `${next}.tsx`].find((x) => fs.existsSync(path.join(repo, x))); if (f) out.push(...importsOf(f, seen)); } }
  return out;
};

test('ML-01 every page the ledger calls "server" is listed here, and the reverse', () => {
  const rows = ledger.split('\n').filter((l) => /^\|/.test(l) && /\|\s*\*\*server\*\*\s*\|/.test(l));
  assert.equal(rows.length, Object.keys(SERVER_PAGES).length, `the ledger has ${rows.length} server rows`);
  for (const page of Object.keys(SERVER_PAGES)) assert.ok(rows.some((r) => r.includes(`\`${page}\``)), `${page} is a server row in the ledger`);
});

test('ML-02 a server page reads no browser-held record: it imports the server’s client and the interface kit, and nothing else', () => {
  for (const [page, file] of Object.entries(SERVER_PAGES)) {
    const all = importsOf(file); assert.ok(all.length >= 3, `${page} imports were read`);
    const direct = all.filter((i) => i.from === file || /^apps\/demo\/src\/flagship\//.test(i.from)); const sibling = (i) => /^apps\/demo\/src\/flagship\//.test(i.from) && /^\.\/[A-Za-z]+\.js$/.test(i.spec);   // one of the page's own components importing another (18 Nov 2026)
    const bad = direct.filter((i) => !ALLOWED.some((re) => re.test(i.spec)) && !sibling(i));
    assert.deepEqual(bad, [], `${page} imports only React, the interface kit and the server client`);
    // and what those import, in turn, never reaches the browser's own records of rooms, field work, service or the estates
    const reach = all.filter((i) => /\/(campus|estate|install|service|assurance|lite|worlds|decisions|drawing|rooms)\//.test(i.spec));
    assert.deepEqual(reach, [], `${page} reaches no browser-held record through its imports`);
  }
});

test('ML-03 the server client keeps the sandbox’s id and key in this browser and nothing else', () => {
  const src = fs.readFileSync(path.join(repo, 'apps/demo/src/connected/client.ts'), 'utf8');
  assert.equal((src.match(/setItem\(/g) || []).length, 1, 'one thing is stored'); assert.match(src, /setItem\(STORE_KEY, JSON\.stringify\(sb\)\)/);
  for (const f of ['apps/demo/src/pages/Flagship.tsx', 'apps/demo/src/pages/Connected.tsx', 'apps/demo/src/connected/journey.ts']) assert.doesNotMatch(fs.readFileSync(path.join(repo, f), 'utf8'), /localStorage|sessionStorage|indexedDB/, `${f} stores nothing itself`);
});
