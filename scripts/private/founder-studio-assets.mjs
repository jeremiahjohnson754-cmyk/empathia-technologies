#!/usr/bin/env node
/**
 * Private assets for the Founder Studio, provisioned reproducibly (founder, 17 Nov 2026: "this recurring exception needs a permanent
 * resolution… a reproducible private-asset provisioning process that keeps credentials and licensed content protected while
 * allowing the entire test suite to run consistently in a clean environment. Otherwise, the team could end up saying 'everything
 * passed except the thing we always exclude.'").
 *
 * The studio needs two things that are not, and must not be, in this repository: the Founder Edition page it embeds, and the
 * founder's films. Everything else it shows is generated from the checkout by its own build. Until now a clean checkout had
 * neither, so its studio suite failed there and was rerun by hand in the one tree that still held a build from 12 Nov.
 *
 *   node scripts/private/founder-studio-assets.mjs status                         what the manifest asks for, and whether the store holds it
 *   node scripts/private/founder-studio-assets.mjs verify                         every file present with the size and SHA-256 the manifest names (exit 1 otherwise)
 *   node scripts/private/founder-studio-assets.mjs provision [--checkout=<dir>]   verify, then build that checkout's studio from its own records and the store
 *   node scripts/private/founder-studio-assets.mjs snapshot [--from=<checkout>]   (re)fill the store from a checkout whose built studio has the assets, and rewrite the manifest
 *
 * The store: a directory OUTSIDE the repository, named by EMPATHIA_PRIVATE_STORE (default ~/.empathia-private), readable by its
 * owner only. Nothing in it is copied into a tracked path: the page goes into the built studio (dist/, ignored) and the films are
 * linked there. The manifest (apps/founder-studio/PRIVATE_ASSETS.json) is committed and holds names, sizes and hashes only: it says
 * exactly what a checkout needs and lets any copy be checked, without holding any of it.
 * provision refuses a store that does not match the manifest. It downloads nothing and needs no credential.
 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d = '') => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const storeRoot = () => path.resolve(process.env.EMPATHIA_PRIVATE_STORE || path.join(os.homedir(), '.empathia-private'));
const storeDir = () => path.join(storeRoot(), 'founder-studio');
const storeName = () => `${process.env.EMPATHIA_PRIVATE_STORE ? 'EMPATHIA_PRIVATE_STORE' : '~/.empathia-private'}/founder-studio`;
const manifestFile = path.join(repo, 'apps/founder-studio/PRIVATE_ASSETS.json');
const FE = 'founder-edition/Empathia-Founder-Edition.html';
const sha = (f) => { const h = crypto.createHash('sha256'); const fd = fs.openSync(f, 'r'); const buf = Buffer.alloc(1 << 20); let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); fs.closeSync(fd); return h.digest('hex'); };
const readManifest = () => (fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null);
export const HOW = 'node scripts/private/founder-studio-assets.mjs provision';

/** Each manifest entry against the store: ok, missing, or different. Sizes first (cheap), then hashes. */
export function check() {
  const m = readManifest(); if (!m) return { ok: false, why: 'there is no manifest (apps/founder-studio/PRIVATE_ASSETS.json)', rows: [] };
  const store = storeDir(); if (!fs.existsSync(store)) return { ok: false, why: `the private store is not on this machine (${storeName()})`, rows: [] };
  const rows = m.files.map((f) => { const p = path.join(store, f.path); if (!fs.existsSync(p)) return { ...f, state: 'missing' }; if (fs.statSync(p).size !== f.bytes) return { ...f, state: 'different size' }; return { ...f, state: sha(p) === f.sha256 ? 'ok' : 'different content' }; });
  const bad = rows.filter((r) => r.state !== 'ok');
  return { ok: !bad.length, why: bad.length ? `${bad.length} of ${rows.length} files in ${storeName()} do not match the manifest: ${bad.slice(0, 3).map((r) => `${r.path} ${r.state}`).join('; ')}` : '', rows };
}

function snapshot(from) {
  const dist = path.join(from, 'apps/founder-studio/dist'); const store = storeDir(); const files = [];
  const take = (src, rel, role) => { const dst = path.join(store, rel); fs.mkdirSync(path.dirname(dst), { recursive: true, mode: 0o700 }); if (fs.realpathSync(src) !== (fs.existsSync(dst) ? fs.realpathSync(dst) : '')) fs.copyFileSync(fs.realpathSync(src), dst); fs.chmodSync(dst, 0o600); files.push({ path: rel, bytes: fs.statSync(dst).size, sha256: sha(dst), role }); };
  const fe = path.join(dist, 'demonstrators/founder/Empathia-Founder-Edition.html'); if (!fs.existsSync(fe)) throw new Error(`no Founder Edition page in ${from}: it is taken from a studio build that has one`);
  take(fe, FE, 'the Founder Edition page the studio embeds');
  const films = path.join(dist, 'media/films'); for (const f of fs.readdirSync(films).filter((x) => x.endsWith('.mp4') && fs.existsSync(path.join(films, x))).sort()) take(path.join(films, f), `films/${f}`, 'a film the studio plays');
  for (const d of [storeRoot(), store, ...new Set(files.map((f) => path.dirname(path.join(store, f.path))))]) fs.chmodSync(d, 0o700);
  fs.writeFileSync(manifestFile, JSON.stringify({ about: 'The private files the Founder Studio is built and tested with. Names, sizes and SHA-256 only: none of the content is in this repository. See scripts/private/founder-studio-assets.mjs and docs/operations/PRIVATE_ASSETS.md.', store: 'EMPATHIA_PRIVATE_STORE (default ~/.empathia-private), subdirectory founder-studio', files }, null, 1) + '\n');
  return files;
}

function provision(checkout) {
  const c = check(); if (!c.ok) throw new Error(`NOT PROVISIONED: ${c.why}`);
  const store = storeDir(); const app = path.join(checkout, 'apps/founder-studio');
  const run = (what, args) => { const r = spawnSync(process.execPath, args, { cwd: checkout, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${what} failed: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | ').slice(0, 400)}`); return r.stdout; };
  // the studio's own build, as scripts/build.mjs --studio runs it: data generated from this checkout's records, then the bundle
  run('the studio build', [path.join(app, 'build.mjs'), `--founder-edition=${path.join(store, FE)}`]);
  const placed = run('placing the films', [path.join(app, 'scripts/place-films.mjs'), path.join(app, 'dist'), `--from=${path.join(store, 'films')}`]).trim().split('\n').pop();
  const p = provisioned(path.join(app, 'dist')); if (!p.ok) throw new Error(`the studio was built but ${p.why}`);
  const want = c.rows.filter((r) => r.path.startsWith('films/')).map((r) => path.basename(r.path)); const absent = want.filter((f) => !fs.existsSync(path.join(app, 'dist/media/films', f)));
  if (absent.length) throw new Error(`${absent.length} of ${want.length} films in the store are not in this checkout's curated list, so they were not placed: ${absent.join(', ')}`);
  return { files: c.rows.length, placed };
}

/** Whether a built studio has what its browser suite needs. The suite asks this before it starts anything. */
export function provisioned(dist = path.join(repo, 'apps/founder-studio/dist')) {
  if (!fs.existsSync(path.join(dist, 'index.html'))) return { ok: false, why: 'the studio is not built' };
  if (!fs.existsSync(path.join(dist, 'demonstrators/founder/Empathia-Founder-Edition.html'))) return { ok: false, why: 'the built studio has no Founder Edition page (a private file)' };
  const films = path.join(dist, 'media/films'); if (!fs.existsSync(films) || !fs.readdirSync(films).some((f) => f.endsWith('.mp4') && fs.existsSync(path.join(films, f)))) return { ok: false, why: 'the built studio has no film files (private files)' };
  return { ok: true, why: '' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'snapshot') { const files = snapshot(path.resolve(arg('from', repo))); console.log(`store filled and manifest written: ${files.length} files, ${(files.reduce((a, f) => a + f.bytes, 0) / 1e6).toFixed(1)} MB`); }
    else if (cmd === 'status' || cmd === 'verify') { const c = check(); for (const r of c.rows) console.log(`${r.state.padEnd(18)} ${String(r.bytes).padStart(10)}  ${r.path}`); console.log(c.ok ? `the store matches the manifest: ${c.rows.length} files` : `NOT PROVISIONED: ${c.why}`); process.exit(c.ok || cmd === 'status' ? 0 : 1); }
    else if (cmd === 'provision') { const dir = path.resolve(arg('checkout', repo)); const r = provision(dir); console.log(`${dir}: the studio is built from this checkout and the store (${r.files} private files verified; ${r.placed})`); }
    else { console.error('usage: founder-studio-assets.mjs status | verify | provision [--checkout=<dir>] | snapshot [--from=<checkout>]'); process.exit(2); }
  } catch (e) { console.error(`founder-studio-assets: ${(e && e.message) || e}`); process.exit(1); }
}
