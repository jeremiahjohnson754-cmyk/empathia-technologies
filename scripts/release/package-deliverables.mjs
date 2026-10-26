#!/usr/bin/env node
/**
 * Package the directive's deliverables A–J from one committed source revision, with hashes, and write the master index.
 *
 *   node scripts/release/package-deliverables.mjs [--out=releases/handoff/out]
 *
 * Refuses to run with uncommitted changes (every package must name an exact source revision). Never copies the frozen investor or
 * engineer packages: B and C are references by hash. The IP vault (G) is packaged separately and marked RESTRICTED. Nothing here
 * authorizes distribution: every manifest carries "distribution: NOT AUTHORIZED".
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(root, (process.argv.find((a) => a.startsWith('--out=')) || '').split('=')[1] || 'releases/handoff/out');
const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--untracked-files=no')) { console.error('refusing: commit your changes first (packages must name an exact source revision)'); process.exit(1); }
const commit = git('rev-parse', 'HEAD'); const short = commit.slice(0, 12);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const sha = (f) => { const h = crypto.createHash('sha256'); const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(1 << 20); let n; while ((n = fs.readSync(fd, b, 0, b.length, null)) > 0) h.update(b.subarray(0, n)); fs.closeSync(fd); return h.digest('hex'); };
const items = [];
const NOTICE = `Source revision ${commit}. Synthetic data. Not production-ready. Distribution: NOT AUTHORIZED — only the founder may authorize external distribution.`;

/** git archive of tracked paths at HEAD → zip (exact, reproducible content). */
function archive(id, name, title, classification, pathspecs, description) {
  const file = path.join(out, `${name}_${short}.zip`);
  execFileSync('git', ['-C', root, 'archive', '--format=zip', `--prefix=${name}/`, '-o', file, 'HEAD', '--', ...pathspecs]);
  items.push({ id, title, file: path.basename(file), kind: 'archive', classification, sourceRevision: commit, bytes: fs.statSync(file).size, sha256: sha(file), contents: pathspecs, description });
}
/** zip of a built folder (not tracked: build output) via Python's zipfile, sorted entries. */
function zipDir(id, name, title, classification, dir, description) {
  if (!fs.existsSync(dir)) { items.push({ id, title, kind: 'build', classification, result: 'NOT_RUN', why: `${path.relative(root, dir)} not built`, description }); return; }
  const file = path.join(out, `${name}_${short}.zip`);
  const py = `import os,sys,zipfile\nsrc,dst,pre=sys.argv[1:4]\nwith zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED) as z:\n  for d,_,fs in sorted(os.walk(src)):\n    for f in sorted(fs):\n      p=os.path.join(d,f); z.write(p, os.path.join(pre, os.path.relpath(p,src)))\n`;
  const r = spawnSync('python3', ['-I', '-c', py, dir, file, name], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  items.push({ id, title, file: path.basename(file), kind: 'build', classification, sourceRevision: commit, builtFrom: path.relative(root, dir), bytes: fs.statSync(file).size, sha256: sha(file), description });
}

// A — Founder Studio (built output; includes the Founder Edition dev build and every document — founder only)
zipDir('A', 'EMPATHIA_FOUNDER_STUDIO', 'Empathia Founder Studio', 'INTERNAL_ONLY', path.join(root, 'apps/founder-studio/dist'), 'Runnable founder hub with launchers. Films are not inside: point the launcher at the film folder (--films).');
// B, C — references to the frozen packages, never copies
const ref = (id, title, app) => { const f = path.join(root, app, 'README.md'); items.push({ id, title, kind: 'reference', classification: id === 'B' ? 'INVESTOR_DISCLOSABLE (when authorized)' : 'CONFIDENTIAL_TECHNICAL', file: path.relative(root, f), sha256: sha(f), description: 'Reference by hash to the frozen 2.5.3 rc3 package; the bytes are not copied. Distribution NOT AUTHORIZED.' }); };
ref('B', 'Empathia Investor Experience (frozen 2.5.3 rc3)', 'apps/investor-demo');
ref('C', 'Empathia Private Engineer Edition (frozen 2.5.3 rc3)', 'apps/engineer-demo');
// D — production source (everything tracked except the restricted vault)
archive('D', 'EMPATHIA_PRODUCTION_SOURCE', 'Empathia production source', 'CONFIDENTIAL_TECHNICAL', ['.', ':!provenance'], 'The editable codebase: apps, services, packages, integrations, database, ml, spatial, scripts, tests, docs. Excludes provenance/.');
// E — engineering blueprint
archive('E', 'EMPATHIA_ENGINEERING_BLUEPRINT', 'Empathia engineering blueprint', 'CONFIDENTIAL_TECHNICAL', ['docs', 'database/schema', 'database/migrations', 'packages/schemas/schemas', 'spatial', 'README.md', 'GETTING_STARTED.md'], 'Architecture, data, API, algorithms, frontend, design system, QA, security, operations, handoff; schema and JSON Schemas.');
// F — media and film library (manifests, sets, storyboards, rendered architecture film record; film files stay in the founder workspace)
archive('F', 'EMPATHIA_MEDIA_AND_FILM_LIBRARY_INDEX', 'Empathia media and film library (index)', 'INTERNAL_ONLY', ['media', 'tests/evidence/films', 'scripts/media'], 'Manifests of 2,230 assets, rights classification, internal and investor-safe sets (investor-safe: empty), film inventory and production packages, decode results. Film files are not copied.');
// G — IP and provenance vault (restricted)
archive('G', 'EMPATHIA_IP_PROVENANCE_VAULT', 'Empathia IP and provenance vault', 'RESTRICTED_IP', ['provenance'], 'For the founder and qualified counsel only. Contains personal data (git author e-mail). Not legal advice; establishes no rights.');
// H — QA and release evidence
archive('H', 'EMPATHIA_QA_AND_RELEASE_EVIDENCE', 'Empathia QA and release evidence', 'CONFIDENTIAL_TECHNICAL', ['tests/evidence', 'docs/qa', 'docs/security', 'releases/immutable-references', 'docs/operations/BACKUP_RESTORE_DRILL.json', 'EMPATHIA_MASTER_COMPLETION_REPORT.md', 'releases/handoff/AUDIT_INSTRUCTIONS.md'], 'Test results, verification report, secret scan, link check, frozen-release checks, backup drill, threat model, known defects and vulnerabilities, audit instructions.');
// I — engineering team handoff
archive('I', 'EMPATHIA_ENGINEERING_TEAM_HANDOFF', 'Empathia engineering team handoff', 'CONFIDENTIAL_TECHNICAL', ['docs/engineering-handoff', 'docs/README.md', 'README.md', 'GETTING_STARTED.md', 'EMPATHIA_MASTER_COMPLETION_REPORT.md', 'docs/operations/PRODUCTION_READINESS_CHECKLIST.md', 'docs/qa/KNOWN_DEFECTS.md', 'docs/security/KNOWN_VULNERABILITIES_AND_REMEDIATION.md'], 'Start here for a CTO or development partner: roles, plan, estimates, debt, risks, definition of done.');

// completeness of the source archive: its file list must equal the tracked files outside provenance/ (verification item 16)
{
  const d = items.find((i) => i.id === 'D');
  const listed = execFileSync('python3', ['-I', '-c', 'import sys,zipfile;print("\\n".join(n for n in zipfile.ZipFile(sys.argv[1]).namelist() if not n.endswith("/")))', path.join(out, d.file)], { encoding: 'utf8', maxBuffer: 64 << 20 }).trim().split('\n').map((n) => n.replace(/^EMPATHIA_PRODUCTION_SOURCE\//, '')).sort();
  const tracked = git('ls-files').split('\n').filter((f) => f && !f.startsWith('provenance/')).sort();
  const missing = tracked.filter((f) => !listed.includes(f)); const extra = listed.filter((f) => !tracked.includes(f));
  const check = { result: missing.length || extra.length ? 'FAIL' : 'PASS', detail: `${listed.length} files in the archive; ${tracked.length} tracked files outside provenance/; missing ${missing.length}, extra ${extra.length}`, missing: missing.slice(0, 50), extra: extra.slice(0, 50) };
  fs.writeFileSync(path.join(out, 'PACKAGE_CHECK.json'), JSON.stringify(check, null, 2));
  console.log(`source archive completeness: ${check.result} — ${check.detail}`);
}

// J — master index
const index = { title: 'EMPATHIA MASTER ARCHIVE — index', generatedAt: new Date().toISOString(), sourceRevision: commit, notice: NOTICE, deliverables: items };
fs.writeFileSync(path.join(out, 'MASTER_INDEX.json'), JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(out, 'MASTER_INDEX.md'), ['# EMPATHIA MASTER ARCHIVE — index', '', NOTICE, '', '| ID | Deliverable | File | Classification | Bytes | SHA-256 |', '|---|---|---|---|---|---|',
  ...items.map((i) => `| ${i.id} | ${i.title} | ${i.file ?? i.result} | ${i.classification} | ${i.bytes ?? '—'} | ${i.sha256 ? `\`${i.sha256}\`` : '—'} |`), '',
  'The investor (B) and engineer (C) editions are referenced by hash, not copied. The vault (G) is restricted to the founder and counsel.', 'Verify any file: `sha256sum <file>` and compare with this table.'].join('\n') + '\n');
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), items.filter((i) => i.file && fs.existsSync(path.join(out, i.file))).map((i) => `${i.sha256}  ${i.file}`).join('\n') + '\n');
console.log(items.map((i) => `${i.id}  ${(i.file || i.result).padEnd(60)} ${i.bytes ? `${(i.bytes / 1048576).toFixed(1)} MiB` : ''}`).join('\n'));
console.log(`\nmaster index → ${path.relative(root, path.join(out, 'MASTER_INDEX.md'))}`);
