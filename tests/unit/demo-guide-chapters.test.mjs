// The End User Success & Training Guide's chapters (apps/demo/src/guides/chapters.ts). Founder, 11 Nov 2026, §08 Product B: the
// required contents, each answered by a chapter, the room pages, or said to be not built. Held: the list is covered; no chapter
// names an organisation, a person or a room, or states what a particular room can do; nothing tells anyone to open, unplug or
// restart a room's equipment; every link is a registered page; no step-by-step for another company's application is written.
//   node --test tests/unit/demo-guide-chapters.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mem = new Map(); globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }; globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
const esbuild = await import(path.join(repo, 'node_modules/esbuild/lib/main.js'));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'demo-guide-chapters-')), 'm.mjs');
await esbuild.build({ stdin: { contents: `export * as H from './guides/chapters.ts'; export * as PG from './registry.pages.ts'; export * as P from './access/policy.ts'; export * as D from './connect/directory.ts'; export * as N from './campus/canon.ts';`, resolveDir: path.join(repo, 'apps/demo/src'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, jsx: 'automatic', logLevel: 'error', nodePaths: [path.join(repo, 'node_modules')], alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') },
  plugins: [{ name: 'lazy', setup(b) { b.onResolve({ filter: /\.(js)$/ }, (a) => (a.kind === 'dynamic-import' ? { path: a.path, external: true } : undefined)); } }] });
const { H, PG, P, D, N } = await import(pathToFileURL(out).href);
const FOUNDER = ['Microsoft Teams', 'Outlook', 'Calendar and meeting scheduling', 'SharePoint', 'OneDrive', 'Document collaboration', 'Workplace technology', 'Conference room capabilities', 'Teams Rooms', 'Displays and touch panels', 'Cameras and microphones', 'Wireless presentation', 'BYOD', 'Hybrid meetings', 'Meeting controls', 'Room booking', 'Room navigation',
  'Video conferencing etiquette', 'Common troubleshooting', 'How to request assistance', 'Site-specific support', 'QR codes', 'Room-specific operating instructions', 'Short instructional videos', 'Accessibility features', 'Remote-work collaboration', 'Security and privacy basics', 'Common technical questions'];
const text = (c) => JSON.stringify([c.title, c.summary, c.sections, c.yours]);

test('EU-01 the founder’s twenty-eight contents are each answered: by a chapter that says it covers them, by the room pages, or said to be not built', () => {
  assert.deepEqual(H.CONTENTS.map(([t]) => t), FOUNDER); assert.equal(H.CHAPTERS.length, 11); assert.equal(new Set(H.CHAPTERS.map((c) => c.id)).size, 11);
  for (const [topic, where] of H.CONTENTS) { if (where === 'room pages') { assert.equal(topic, 'Room-specific operating instructions'); continue; } if (where === 'not built') { assert.equal(topic, 'Short instructional videos'); continue; }
    const c = H.chapterById(where); assert.ok(c, `${topic} → ${where}`); assert.ok(c.covers.includes(topic), `${c.id} says it covers “${topic}”`); }
  for (const c of H.CHAPTERS) { assert.ok(c.sections.length >= 2 && c.sections.every((s) => s.points.length >= 2 && s.points.every((p) => p.length > 30 && p.length < 320)), c.id); assert.ok(c.summary.length > 20); for (const t of c.covers) assert.ok(FOUNDER.includes(t), `${c.id} covers “${t}”, which is on the founder’s list`); }
  assert.equal(H.chapterById('nope'), null);
});

test('EU-02 a chapter is the same for every organisation and every room: none is named, and no chapter states what a particular room can do', () => {
  const names = [...D.people().flatMap((p) => p.name.split(' ')), ...N.BUILDINGS.map((b) => b.name), 'Northstar', 'Atlas', 'Empathia'].filter((x) => x && x.length > 3);
  for (const c of H.CHAPTERS) { const t = text(c); for (const n of new Set(names)) if (!(n === 'Empathia' && c.id === 'apps')) assert.ok(!new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t), `${c.id} names “${n}”`); assert.ok(!/\bR-[A-Z]{3}-\d/.test(t), c.id); }
  assert.match(text(H.chapterById('apps')), /In Empathia/, 'the one place the product is named is where it says what a contact action does');
  for (const c of H.CHAPTERS) for (const s of c.sections) for (const p of s.points) assert.ok(!/\bthis room (has|supports|can)\b/i.test(p), `${c.id}: “${p}”`);
  assert.ok(H.CHAPTERS.filter((c) => /(room’s|its) (own )?page (says|lists)/i.test(text(c))).length >= 3, 'what a room can do is left to its own page');
});

test('EU-03 nothing tells anyone to open, unplug, restart or reach behind a room’s equipment: where those words appear, they say not to', () => {
  const risky = /\b(open (a|the) cabinet|reach behind|unplug|restart|turn the camera by hand|climb)\b/i;
  for (const c of H.CHAPTERS) for (const s of c.sections) for (const p of s.points) for (const sentence of p.split(/(?<=[.:;])\s+/)) if (risky.test(sentence)) assert.match(sentence, /\b(Do not|do not|not)\b/, `${c.id}: “${sentence}”`);
  const help = H.chapterById('help'); assert.ok(help.sections.some((s) => s.heading === 'Then stop')); assert.ok(help.sections[0].points.length === 3, 'three things, then ask');
  assert.ok(!/\b(guarantee|certified|always works)\b/i.test(JSON.stringify(H.CHAPTERS)));
});

test('EU-04 no step-by-step for another company’s application is written, and what an organisation would add is said to be its own', () => {
  const all = JSON.stringify(H.CHAPTERS.map((c) => c.sections)); assert.ok(!/\b(click|tap|select|go to) (the )?[“"'A-Z][^.]{0,40}(menu|tab|ribbon|settings|button)\b/.test(all), 'no menu-by-menu instruction'); assert.ok(!/ > /.test(all), 'no menu paths');
  assert.match(H.chapterById('apps').yours, /Step-by-step instructions for these applications are not written here: they change, and your organisation has its own approved guidance/);
  assert.ok(H.CHAPTERS.filter((c) => c.yours).length >= 7); for (const c of H.CHAPTERS) if (c.yours) assert.ok(c.yours.length > 30, c.id);
});

test('EU-05 every link in a chapter is a registered page, and the guide’s address for a chapter resolves to the guide, for everyone who may open the guide', () => {
  for (const c of H.CHAPTERS) { for (const l of c.links) assert.ok(PG.resolve(l.href.split('?')[0]), `${c.id} → ${l.href}`); const at = PG.resolve(`#/guide/topic/${c.id}`); assert.equal(at?.page.id, 'guide'); assert.equal(at.params.topic, c.id); }
  const guide = PG.resolve('#/guide'); const topic = PG.resolve('#/guide/topic/help'); for (const r of P.ROLE_KEYS) assert.equal(P.canOpen(r, topic), P.canOpen(r, guide), r); assert.ok(P.canOpen('visitor', topic) && P.canOpen('employee', topic));
});
