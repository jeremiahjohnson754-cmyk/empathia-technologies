#!/usr/bin/env node
/**
 * Generate the studio's data from records (never typed by hand):
 *   films.json      curated film list joined to the ffprobe media manifest and the rights ledger (by hash)
 *   media.json      every video in the manifest (role, resolution, rights) + counts
 *   docs.json       every Markdown document in the repository, rendered to HTML, with its hash and classification
 *   source.json     the source files a CTO asks for first (actual file contents + hashes)
 *   releases.json   the latest frozen-release verification
 *   diagrams.json   Mermaid sources rendered to SVG (dark and light), cached by source hash
 *   vault.json      the provenance vault index
 *   lab-rooms.json  four rooms from the golden cases for the Engine Lab
 *   build.json      commit, time, Founder Edition hash
 *
 *   node apps/founder-studio/scripts/build-data.mjs [--founder-edition=<path to the 2.5.4 dev build>]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const repo = path.resolve(app, '../..');
const gen = path.join(app, 'src/generated');
fs.mkdirSync(gen, { recursive: true });
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const write = (n, v) => { fs.writeFileSync(path.join(gen, n), JSON.stringify(v)); return v; };
const rel = (p) => path.relative(repo, p).split(path.sep).join('/');
const git = (...a) => { try { return execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } };

// ------------------------------------------------------------------ films and media
const manifestPath = path.join(repo, 'media/manifests/MEDIA_MANIFEST.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).assets : [];
const ROLE_RANK = { MASTER: 0, OUTPUT: 1, PROTECTED_ARCHIVE_COPY: 2, OTHER: 3 };
const filmsSrc = fs.readFileSync(path.join(app, 'src/data/films.ts'), 'utf8');
// the curated list lives in films.ts; read it by evaluating the array literal's entries (keys, files, titles) without a TS compiler
const entries = [];
for (const m of filmsSrc.matchAll(/\{ key: '([^']+)', file: '([^']+)', title: '([^']+)', series: '([^']+)', about: '([^']+)' \}/g)) entries.push({ key: m[1], file: m[2], title: m[3], series: m[4], about: m[5] });
for (const m of filmsSrc.matchAll(/S\('(\d\d)', '([^']+)'\)/g)) entries.push({ key: `S${m[1]}`, file: `Empathia_V141_S${m[1]}_9x16_1080x1920_captioned.mp4`, title: `S${m[1]} · ${m[2]}`, series: 'Social shorts', about: 'Vertical social short (9:16, captioned) from the V1.4.1 campaign; a square 1:1 version exists in the masters.' });
const films = entries.map((e) => {
  const hits = manifest.filter((a) => path.basename(a.path) === e.file && a.probe === 'OK').sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9));
  const a = hits[0];
  const distribution = a && a.rightsStatus === 'VERIFIED' ? `eligible: ${a.authorizedChannels}` : 'internal only — not distributable';
  return a ? { ...e, found: true, path: a.path, width: a.width, height: a.height, durationS: a.durationS, bytes: a.bytes, sha256: a.sha256, videoCodec: a.videoCodec, audioCodec: a.audioCodec, rightsStatus: a.rightsStatus, ledgerAssetId: a.ledgerAssetId, distribution, copies: hits.length }
    : { ...e, found: false, rightsStatus: 'NOT_IN_LEDGER', distribution: 'NOT_RENDERED: no such file found by the media probe' };
});
write('films.json', films);
const videos = manifest.filter((a) => a.kind === 'video').map((a) => ({ title: a.title, kind: a.kind, role: a.role, path: a.path, width: a.width ?? null, height: a.height ?? null, durationS: a.durationS ?? null, bytes: a.bytes, sha256: a.sha256, rightsStatus: a.rightsStatus, probe: a.probe === 'OK' ? 'OK' : 'PROBE FAILED' }));
write('media.json', { summary: { videos: videos.length, audio: manifest.filter((a) => a.kind === 'audio').length, verified: manifest.filter((a) => a.rightsStatus === 'VERIFIED').length, notInLedger: manifest.filter((a) => a.rightsStatus === 'NOT_IN_LEDGER').length }, videos, audioCount: manifest.filter((a) => a.kind === 'audio').length, manifestPath: 'media/manifests/MEDIA_MANIFEST.csv' });
// the server's film index: file name → absolute path in this workspace (used only by the local launcher)
write('film-index.json', Object.fromEntries(films.filter((f) => f.found).map((f) => [f.file, f.path])));

// ------------------------------------------------------------------ documents
const { marked } = await import('marked');
const CLASS = (p) => (/^provenance\//.test(p) ? 'RESTRICTED_IP' : /^docs\/security|^docs\/qa|^tests\/evidence/.test(p) ? 'CONFIDENTIAL_TECHNICAL' : /^docs\/discovery/.test(p) ? 'INTERNAL_ONLY' : 'CONFIDENTIAL_TECHNICAL');
const GROUP = (p) => {
  const m = { 'docs/product': 'A · Product and business', 'docs/architecture': 'B · System architecture', 'docs/database': 'C · Data architecture', 'docs/api': 'D · API engineering', 'docs/algorithms': 'E · Algorithms and intelligent systems', 'docs/frontend': 'F · Frontend and 3D', 'docs/qa': 'G · QA and security', 'docs/security': 'G · QA and security', 'docs/operations': 'H · Operations', 'docs/engineering-handoff': 'I · Engineering execution', 'docs/integrations': 'D · Integrations', 'docs/discovery': 'Stage 0 · Discovery', 'docs/design-system': 'F · Design system', 'spatial': 'F · Frontend and 3D', 'ml': 'E · Algorithms and intelligent systems', 'integrations': 'D · Integrations', 'services': 'B · System architecture', 'packages': 'B · System architecture', 'tests/evidence': 'G · QA and security', 'releases': 'Releases and packages', 'provenance': 'IP & provenance vault', 'media': 'Media library' };
  for (const [k, v] of Object.entries(m)) if (p.startsWith(k)) return v;
  return 'Start here';
};
const walk = (d, out = []) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'dist', '.git', 'generated'].includes(n.name)) continue; const p = path.join(d, n.name); if (n.isDirectory()) walk(p, out); else if (n.name.endsWith('.md')) out.push(p); } return out; };
const docFiles = walk(repo).filter((p) => !rel(p).startsWith('apps/') && !rel(p).startsWith('packages/domain-data'));
const docs = docFiles.map((p) => {
  const md = fs.readFileSync(p, 'utf8'); const r = rel(p);
  const title = (md.match(/^#\s+(.+)$/m) || [null, path.basename(p, '.md')])[1].replace(/[*`]/g, '');
  return { id: r.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-md$/, '').toLowerCase(), title, group: GROUP(r), path: r, classification: CLASS(r), sha256: sha(md), html: marked.parse(md, { gfm: true }), words: md.split(/\s+/).length };
}).sort((a, b) => a.group.localeCompare(b.group) || a.path.localeCompare(b.path));
write('docs.json', docs);

// ------------------------------------------------------------------ source files a CTO asks for first
const V25 = '/home/claude/Empathia_V25/work/source-254';
const SOURCE_LIST = [
  ['classify', 'The room classifier (TypeScript port)', 'packages/commissioning-engine/src/classify.ts', 'Rule-based classification of a room from geometry, intended use, occupancy and equipment. Deterministic — not a trained model.'],
  ['applicability', 'The commissioning applicability algorithm', 'packages/commissioning-engine/src/applicability.ts', 'Judges all 94 test definitions for a room: applicable with the rules that selected it, or not applicable with a justification; never a pass.'],
  ['checks', 'The design checks', 'packages/commissioning-engine/src/checks.ts', 'Design deficiencies with stable correlation keys: required equipment, connectivity (graph search), placement, PoE budget, sightlines.'],
  ['results', 'Result labels and acceptance counts', 'packages/commissioning-engine/src/results.ts', 'PASS_UNVERIFIED until a different person verifies; no bare PASS anywhere.'],
  ['recording', 'Recording and verification rules', 'packages/commissioning-engine/src/recording.ts', 'Who may record a result, with which evidence, and the independence rule for verification.'],
  ['lifecycle', 'Lifecycle gates', 'packages/commissioning-engine/src/lifecycle.ts', 'The governed one-step lifecycle and its blocking conditions.'],
  ['parity', 'The parity test', 'packages/commissioning-engine/test/parity.test.ts', 'Proves the port reproduces the demonstrator on 92 golden cases.'],
  ['schema', 'The evidence and commissioning database schema', 'database/migrations/0003_commissioning_evidence.sql', 'PostgreSQL tables for commissioning plans, results, verifications and evidence objects (tenant-scoped, constrained).'],
  ['schema-core', 'The core database schema', 'database/migrations/0002_core.sql', 'Tenants, users, roles, sites, rooms, revisions, planned assets, connections, relationships.'],
  ['authz', 'Server-side authorization', 'services/enterprise-api/src/auth/authorize.ts', 'Authority checks on the server: the browser is never the authority.'],
  ['tokens', 'The design tokens', 'packages/design-tokens/tokens.json', 'Aurora colours, type, spacing and evidence-state colours: the source of every CSS variable.'],
  ['studio-css', 'The studio stylesheet', 'apps/founder-studio/src/styles/studio.css', 'The CSS behind this interface, including the evidence ladder.'],
  ['demo-room', 'The demonstrator’s room engine (original)', `${V25}/src/v25-60-room.js`, 'The original browser implementation of Build a Room (2.5.4 branch), which the TypeScript port mirrors.'],
  ['demo-room-css', 'The demonstrator’s room-builder CSS (original)', `${V25}/src/v52-room.css`, 'Room builder styles in the demonstrator.'],
  ['demo-aurora', 'The demonstrator’s Aurora skin (original)', `${V25}/src/v30-aurora.css`, 'The design language the tokens come from.'],
];
const LANG = { ts: 'TypeScript', tsx: 'TypeScript (React)', js: 'JavaScript', sql: 'SQL (PostgreSQL)', css: 'CSS', json: 'JSON', py: 'Python' };
const sources = SOURCE_LIST.map(([id, title, p, why]) => {
  const abs = path.isAbsolute(p) ? p : path.join(repo, p);
  if (!fs.existsSync(abs)) return null;
  const content = fs.readFileSync(abs, 'utf8');
  return { id, title, path: path.isAbsolute(p) ? p.replace('/home/claude/', '') : p, language: LANG[path.extname(p).slice(1)] || 'text', sha256: sha(content), lines: content.split('\n').length, why, content };
}).filter(Boolean);
write('source.json', sources);

// ------------------------------------------------------------------ frozen releases
const refDir = path.join(repo, 'releases/immutable-references');
const checks = fs.readdirSync(refDir).filter((f) => /^FROZEN_CHECK_.*\.json$/.test(f)).map((f) => path.join(refDir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
const fc = checks.length ? JSON.parse(fs.readFileSync(checks[0], 'utf8')) : { checkedAt: 'never', result: 'NOT_RUN', packages: [], archives: [] };
write('releases.json', { checkedAt: fc.checkedAt, result: fc.result, packages: fc.packages.map((p) => ({ package: p.package, entries: p.entries, mismatches: p.mismatches.length, immutable: /^----i/.test(p.lsattr || ''), editions: p.editions })), archives: fc.archives.map((a) => ({ archive: a.archive, match: a.match })), file: checks[0] ? rel(checks[0]) : null });

// ------------------------------------------------------------------ diagrams (Mermaid → SVG, dark and light, cached)
const dDir = path.join(repo, 'docs/architecture/diagrams');
const cache = path.join(repo, '.local/diagram-cache'); fs.mkdirSync(cache, { recursive: true });
const DIAG_META = {
  '01-system-context': ['context', 'System context', 'Who uses Empathia and what it would connect to. Every external system is CONTRACT_ONLY or MOCK today.'],
  '02-containers': ['containers', 'Containers of the production starter', 'One TypeScript modular monolith with PostgreSQL, object storage and an outbox worker; Python only for the labelled ML research prototype.'],
  '03-vertical-slice': ['slice', 'The vertical slice', 'Room creation to operational read model: every step persisted and authorized on the server.'],
  '04-data-model': ['data', 'Core data model', 'The relational model in database/migrations: every table tenant-scoped, composite foreign keys.'],
  '05-events': ['events', 'Event delivery', 'Transactional outbox with retries, idempotent consumers and a dead letter.'],
  '06-today-demonstrator': ['today', 'The demonstrator today', 'What exists before this program: one offline HTML file with rules and authorization in the page.'],
  '07-editions-separation': ['editions', 'Who receives what', 'The source vault, the founder studio, the engineering workspace and the investor and engineer packages, kept apart.'],
};
const mmdc = ['/home/claude/.npm-global/bin/mmdc', path.join(repo, 'node_modules/.bin/mmdc')].find((p) => fs.existsSync(p));
const diagrams = [];
for (const f of fs.existsSync(dDir) ? fs.readdirSync(dDir).filter((x) => x.endsWith('.mmd')).sort() : []) {
  const src = fs.readFileSync(path.join(dDir, f), 'utf8'); const base = f.replace(/\.mmd$/, ''); const [id, title, about] = DIAG_META[base] || [base, base, ''];
  const svgs = {};
  for (const theme of ['dark', 'default']) {
    const key = path.join(cache, `${sha(src + theme)}.svg`);
    if (!fs.existsSync(key) && mmdc) {
      const tmp = path.join(cache, `${base}.mmd`); fs.writeFileSync(tmp, src);
      try { execFileSync(mmdc, ['-i', tmp, '-o', key, '-t', theme, '-b', 'transparent', '--svgId', `dia-${id}-${theme}`], { stdio: 'ignore', timeout: 120000 }); } catch { /* recorded below */ }
    }
    svgs[theme] = fs.existsSync(key) ? fs.readFileSync(key, 'utf8') : '';
  }
  const svg = svgs.dark || svgs.default ? `<div class="dia-dark">${svgs.dark}</div><div class="dia-light">${svgs.default}</div>` : `<p class="faint">NOT_RENDERED: the Mermaid CLI was not available; the source is below.</p>`;
  diagrams.push({ id, title, about, source: rel(path.join(dDir, f)), svg, mermaid: src });
}
write('diagrams.json', diagrams);

// ------------------------------------------------------------------ vault index
const vIdx = path.join(repo, 'provenance/VAULT_INDEX.json');
// VAULT_INDEX.json is { sections: { "<path or folder/>": about }, files: [{ path, sha256 }], classification } → one record per section
const vaultRecords = (() => {
  if (!fs.existsSync(vIdx)) return [];
  const v = JSON.parse(fs.readFileSync(vIdx, 'utf8'));
  if (Array.isArray(v)) return v;
  return Object.entries(v.sections || {}).map(([k, about]) => {
    const first = k.split(' ')[0];
    const files = (v.files || []).filter((f) => (first.endsWith('/') ? f.path.startsWith(first) : f.path === first));
    const md = files.find((f) => f.path.endsWith('.md'));
    return { id: k.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase(), title: k, about: String(about), classification: /licen[cs]es/.test(k) ? 'THIRD_PARTY_LICENSED' : 'RESTRICTED_IP', path: `provenance/${md ? md.path : first}`, status: `${files.length} file${files.length === 1 ? '' : 's'} hashed` };
  });
})();
write('vault.json', vaultRecords);

// ------------------------------------------------------------------ engine lab rooms
const golden = JSON.parse(fs.readFileSync(require.resolve('@empathia/domain-data/golden/room-engine-golden.json'), 'utf8'));
const pick = (n) => golden.data.find((c) => c.name === n);
const lab = [['template:townhall', 'Town hall (template)'], ['template:boardroom', 'Boardroom (template)'], ['template:huddle', 'Huddle room (template)'], ['template:training', 'Training room (template)'], ['template:idf', 'Network closet / IDF (template)']]
  .map(([n, label]) => { const c = pick(n); return c ? { name: label, input: c.input } : null; }).filter(Boolean);
write('lab-rooms.json', lab);

// ------------------------------------------------------------------ build record
const fe = arg('founder-edition', `${V25}/dist/Empathia-Living-Campus-v2.5.4-nomedia.html`);
const feInfo = fs.existsSync(fe) ? { file: 'demonstrators/founder/Empathia-Founder-Edition.html', sha256: sha(fs.readFileSync(fe)), bytes: fs.statSync(fe).size, sourceCommit: (() => { try { return execFileSync('git', ['-C', V25, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })(), branch: (() => { try { return execFileSync('git', ['-C', V25, 'branch', '--show-current'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })(), from: fe } : null;
const enginePkg = JSON.parse(fs.readFileSync(path.join(repo, 'packages/commissioning-engine/package.json'), 'utf8'));
write('build.json', { builtAt: new Date().toISOString(), commit: git('rev-parse', '--short', 'HEAD'), founderEdition: feInfo, engine: `${enginePkg.name}@${enginePkg.version}` });
console.log(JSON.stringify({ films: films.length, filmsFound: films.filter((f) => f.found).length, videos: videos.length, docs: docs.length, sources: sources.length, diagrams: diagrams.length, diagramsRendered: diagrams.filter((d) => !d.svg.includes('NOT_RENDERED')).length, lab: lab.length, founderEdition: feInfo && feInfo.sha256.slice(0, 12) }));
