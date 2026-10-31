#!/usr/bin/env node
/**
 * Preserve the source outside this workspace (owner directive 2026-10-30): a git bundle with the full history, a source archive of the
 * committed tree, a commit manifest, a file manifest with SHA-256 for every tracked file, environment and dependency manifests, the
 * schema and migrations, the API contract, and GitHub migration instructions — after a secret scan of the tracked files refuses to
 * package anything that looks like a credential. Nothing under .local/, node_modules/ or dist/ is included.
 *   node scripts/release/preserve-source.mjs [--out=releases/source]
 * Output: <out>/empathia-source-<yyyymmdd>-<short-commit>/ and a .tar.gz of it, with PRESERVATION_MANIFEST.json (hashes of every file).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const dirty = git('status', '--porcelain');
if (dirty) { console.error('the working tree has uncommitted changes; commit or stash first:\n' + dirty); process.exit(2); }
const commit = git('rev-parse', 'HEAD'); const short = commit.slice(0, 7); const branch = git('branch', '--show-current');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const name = `empathia-source-${stamp}-${short}`;
const outRoot = path.resolve(root, arg('out', 'releases/source')); const out = path.join(outRoot, name);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });

// 1. secret scan of the tracked files (refuses the package on a finding)
const scan = spawnSync('python3', ['-I', 'scripts/verify/scan-secrets.py', root, path.join(out, 'SECRET_SCAN.json')], { cwd: root, encoding: 'utf8' });
if (scan.status !== 0) { console.error('secret scan failed or found something; not packaging:\n' + scan.stdout + scan.stderr); process.exit(3); }

// 2. git bundle (full history, all refs) and a verification of it
execFileSync('git', ['bundle', 'create', path.join(out, 'repository.bundle'), '--all'], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['bundle', 'verify', path.join(out, 'repository.bundle')], { cwd: root, stdio: 'inherit' });
// 3. source archive of the committed tree at HEAD
execFileSync('git', ['archive', '--format=tar.gz', `--prefix=${name}/`, '-o', path.join(out, 'source-tree.tar.gz'), 'HEAD'], { cwd: root, stdio: 'inherit' });
// 4. commit history manifest
fs.writeFileSync(path.join(out, 'COMMITS.md'), `# Commit history — ${branch} @ ${commit}\n\nGenerated ${new Date().toISOString()}. ${git('rev-list', '--count', 'HEAD')} commits.\n\n` + git('log', '--date=iso-strict', '--pretty=format:- %h %ad %s') + '\n\n## Tags\n\n' + (git('tag', '-n1') || '(none)') + '\n');
// 5. tracked-file manifest with hashes
const tracked = git('ls-files').split('\n').filter(Boolean);
const files = tracked.map((f) => ({ path: f, bytes: fs.statSync(path.join(root, f)).size, sha256: sha(path.join(root, f)) }));
fs.writeFileSync(path.join(out, 'FILES.json'), JSON.stringify({ commit, branch, count: files.length, files }, null, 1));
// 6. environment, dependency and schema manifests
const pkgs = tracked.filter((f) => f.endsWith('package.json') && !f.includes('node_modules'));
fs.writeFileSync(path.join(out, 'DEPENDENCIES.json'), JSON.stringify({ node: process.version, packages: pkgs.map((f) => { const j = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); return { path: f, name: j.name, version: j.version, dependencies: j.dependencies || {}, devDependencies: j.devDependencies || {} }; }), python: fs.existsSync(path.join(root, 'services/intelligence-python/requirements.txt')) ? fs.readFileSync(path.join(root, 'services/intelligence-python/requirements.txt'), 'utf8').split('\n').filter(Boolean) : [] }, null, 1));
for (const d of ['database/migrations', 'database/schema', 'docs/api', 'docs/adr']) { const dst = path.join(out, d); fs.mkdirSync(dst, { recursive: true }); for (const f of tracked.filter((x) => x.startsWith(d + '/'))) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(out, f)); } }
for (const f of ['docker-compose.yml', 'docker-compose.prod.yml', 'Dockerfile', '.env.example', 'GETTING_STARTED.md', 'docs/BUILD_STATUS.md', 'tests/evidence/TEST_RESULTS.md', 'tests/evidence/TEST_RESULTS.json', '.github/workflows/ci.yml', 'deploy/Caddyfile']) if (fs.existsSync(path.join(root, f))) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(out, f)); }
// 7. restore and migration instructions
fs.writeFileSync(path.join(out, 'RESTORE_AND_MIGRATE.md'), `# Restore the Empathia source and move it to a Git provider

This package was produced by \`scripts/release/preserve-source.mjs\` from branch **${branch}** at commit **${commit}** on ${new Date().toISOString()}.
It contains no \`.local/\`, \`.env\`, \`node_modules/\` or \`dist/\` content; the tracked files were secret-scanned first (SECRET_SCAN.json).

## Restore the repository with its full history
\`\`\`bash
git clone repository.bundle empathia-technologies     # every branch, tag and commit
cd empathia-technologies && git log --oneline | head
\`\`\`
Or without git: \`tar xzf source-tree.tar.gz\` gives the committed tree only (no history).

## Verify
\`FILES.json\` lists every tracked file with its SHA-256 at this commit; \`sha256sum -c\` style checks can be derived from it.
\`repository.bundle\` was verified with \`git bundle verify\` when packaged.

## Push to GitHub (or any provider) without losing history
\`\`\`bash
git remote add origin git@github.com:<owner>/empathia-technologies.git
git push --all origin && git push --tags origin
\`\`\`
\`.github/workflows/ci.yml\` runs the build and the full test matrix on push (NOT_RUN until a remote exists).

## Rebuild and run
See GETTING_STARTED.md (Node 22, PostgreSQL 16 binaries, \`node scripts/build.mjs\`, \`node scripts/test.mjs --browser --studio\`, \`node scripts/dev.mjs\`).
Database: \`database/migrations/0001…\` are the source of truth; \`database/schema/schema.sql\` is the reading copy of a freshly migrated database.
API contract: \`docs/api/openapi.json\` (generated from the route table; \`node scripts/api/export-openapi.mjs --check\` fails when stale).
`);
// 8. manifest of the package itself, then the tarball
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const items = walk(out).filter((p) => path.basename(p) !== 'PRESERVATION_MANIFEST.json').map((p) => ({ path: path.relative(out, p), bytes: fs.statSync(p).size, sha256: sha(p) }));
fs.writeFileSync(path.join(out, 'PRESERVATION_MANIFEST.json'), JSON.stringify({ name, generatedAt: new Date().toISOString(), commit, branch, trackedFiles: files.length, items }, null, 1));
execFileSync('tar', ['-czf', path.join(outRoot, `${name}.tar.gz`), '-C', outRoot, name], { stdio: 'inherit' });
const tgz = path.join(outRoot, `${name}.tar.gz`);
console.log(JSON.stringify({ out, tarball: tgz, bytes: fs.statSync(tgz).size, sha256: sha(tgz), commit, trackedFiles: files.length }));
