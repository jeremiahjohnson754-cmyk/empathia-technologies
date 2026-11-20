#!/usr/bin/env node
/**
 * Put the curated films that exist on this computer into a built studio (12 Nov 2026, acceptance A4): every .mp4 under the folders
 * given is hashed and, where its SHA-256 matches a film in the studio's films.json, linked into dist/media/films under the curated name.
 * Prints which films are present and which are missing; a missing film is reported, never stood in for.
 *   node apps/founder-studio/scripts/place-films.mjs [dist] --from=<folder> [--from=<folder> …] [--report=<file.json>]
 */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(app, 'dist'));
const from = process.argv.filter((a) => a.startsWith('--from=')).map((a) => a.slice(7)); const report = (process.argv.find((a) => a.startsWith('--report=')) || '').slice(9);
const films = JSON.parse(fs.readFileSync(path.join(dist, 'studio/films.json'), 'utf8')); const want = new Map(films.map((f) => [f.sha256, f]));
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => { const p = path.join(d, e.name); return e.isDirectory() ? walk(p) : e.name.toLowerCase().endsWith('.mp4') ? [p] : []; }) : []);
const hash = (p) => new Promise((ok, bad) => { const h = crypto.createHash('sha256'); fs.createReadStream(p).on('data', (c) => h.update(c)).on('end', () => ok(h.digest('hex'))).on('error', bad); });
const dir = path.join(dist, 'media/films'); fs.mkdirSync(dir, { recursive: true }); const placed = new Map();
for (const p of from.flatMap(walk)) { const f = want.get(await hash(p)); if (!f || placed.has(f.key)) continue; const t = path.join(dir, f.file); if (!fs.existsSync(t)) fs.symlinkSync(path.resolve(p), t); placed.set(f.key, f.file); }
const rows = films.map((f) => ({ key: f.key, file: f.file, title: f.title, present: placed.has(f.key) || fs.existsSync(path.join(dir, f.file)) }));
console.log(`${rows.filter((r) => r.present).length} of ${rows.length} curated films present; missing: ${rows.filter((r) => !r.present).map((r) => r.key).join(', ') || 'none'}`);
if (report) fs.writeFileSync(report, JSON.stringify({ at: new Date().toISOString(), rows }, null, 1));
