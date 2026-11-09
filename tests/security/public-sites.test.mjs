// Security assessment 2026-11-04 (docs/security/ASSESSMENT_2026-11-04.md): the two public static sites, their local servers, their
// Blueprint and their build output. No network beyond 127.0.0.1; needs `node scripts/build.mjs --public` for the dist checks.
//   node --test tests/security/public-sites.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import net from 'node:net'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { cspHeader, cspMeta, COMMON_HEADERS, HSTS, injectMetaCsp, originOf } from '../../scripts/security/policy.mjs';
import { parseBlueprint } from '../../scripts/security/render-headers.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = { website: path.join(repo, 'apps/website/dist'), demo: path.join(repo, 'apps/demo/dist') };
const built = fs.existsSync(path.join(DIST.website, 'index.html')) && fs.existsSync(path.join(DIST.demo, 'index.html'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const bp = parseBlueprint(fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8'));

test('SA-02 render.yaml: both services declare the full header set, equal to scripts/security/policy.mjs', () => {
  for (const name of ['empathia-website', 'empathia-demo']) {
    const h = Object.fromEntries(bp[name].headers.filter((x) => x.path === '/*').map((x) => [x.name, x.value]));
    assert.equal(h['Content-Security-Policy'], cspHeader(), `${name} CSP`);
    for (const [k, v] of Object.entries(COMMON_HEADERS)) assert.equal(h[k], v, `${name} ${k}`);
    assert.equal(h['Strict-Transport-Security'], HSTS, `${name} HSTS`);
  }
  assert.match(bp['empathia-demo'].headers.find((x) => x.name === 'X-Robots-Tag')?.value || '', /noindex/);
});

test('SA-02 the CSP denies plugins, framing, base rewriting and form posts, and loads nothing third-party', () => {
  const c = cspHeader();
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'none'", "script-src 'self'", "connect-src 'self'"]) assert.ok(c.includes(d), d);
  assert.doesNotMatch(c, /unsafe-inline|unsafe-eval|https?:|\*/);
  assert.doesNotMatch(cspMeta(), /frame-ancestors/, 'a meta CSP cannot carry frame-ancestors (the browser ignores it and logs an error)');
  assert.equal(cspHeader(['https://api.example']).includes("connect-src 'self' https://api.example"), true);
  assert.equal(originOf('javascript:alert(1)'), null); assert.equal(originOf('not a url'), null); assert.equal(originOf('https://api.example/v1?x'), 'https://api.example');
  assert.throws(() => injectMetaCsp('<p>no head</p>'));
});

test('SA-06 render.yaml: the website keeps its permanent redirects, all to fixed same-site paths (no open redirect)', () => {
  const moved = JSON.parse(fs.readFileSync(path.join(repo, 'apps/website/redirects.json'), 'utf8'));
  const routes = bp['empathia-website'].routes;
  assert.deepEqual(Object.fromEntries(routes.map((r) => [r.source, r.destination])), moved);
  for (const r of routes) { assert.equal(r.type, 'redirect'); assert.match(r.destination, /^\/[a-z0-9/-]+(#[a-z-]+)?$/); }
});

test('SA-03 build chain: dependency scripts never run on Render, fresh releases are refused, direct dependencies are exact', () => {
  const y = fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8');
  const cmds = [...y.matchAll(/buildCommand: (.+)/g)].map((m) => m[1]);
  assert.equal(cmds.length, 2); for (const c of cmds) { assert.match(c, /npx --yes pnpm@\d+\.\d+\.\d+ install /); assert.match(c, /--ignore-scripts/); }
  assert.match(fs.readFileSync(path.join(repo, 'pnpm-workspace.yaml'), 'utf8'), /^minimumReleaseAge: \d{4,}$/m);
  const pkgs = ['package.json', 'apps/website/package.json', 'apps/demo/package.json', 'packages/ui/package.json', 'packages/design-tokens/package.json'];
  const loose = [];
  for (const p of pkgs) { const j = JSON.parse(fs.readFileSync(path.join(repo, p), 'utf8')); for (const [n, v] of Object.entries({ ...j.dependencies, ...j.devDependencies })) if (!/^(workspace:\*|\d+\.\d+\.\d+)$/.test(v) && !/^@types\//.test(n)) loose.push(`${p}: ${n}@${v}`);
    for (const s of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(j.scripts?.[s], undefined, `${p} runs a ${s} script`); }
  assert.deepEqual(loose, [], 'only type-only @types packages may float (they never reach the bundle)');
});

test('SA-01 every built page carries the CSP as <meta>, first in <head>, before any script or stylesheet', { skip: !built && 'public sites not built (node scripts/build.mjs --public)' }, () => {
  for (const [site, d] of Object.entries(DIST)) {
    const api = site === 'website' ? JSON.parse(fs.readFileSync(path.join(d, 'BUILD_MANIFEST.json'), 'utf8')).api : null;
    for (const f of walk(d).filter((x) => x.endsWith('.html'))) {
      const html = fs.readFileSync(f, 'utf8'); const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
      assert.ok(m, `${path.relative(repo, f)} has no meta CSP`);
      assert.equal(m[1], cspMeta([originOf(api)].filter(Boolean)), path.relative(repo, f));
      const head = html.slice(0, html.indexOf('</head>'));
      assert.ok(m.index < head.search(/<script|<link/), `${path.relative(repo, f)}: the meta CSP comes after a script or link`);
    }
  }
});

test('SA-04/SA-08 dist: no source maps, no inline script or style or handler, every new-tab link is noopener noreferrer, known hosts only', { skip: !built && 'not built' }, () => {
  const HOSTS = /^https:\/\/(tally\.so|empathia-(website|demo)(-next)?\.onrender\.com|schema\.org|react\.dev)$|^http:\/\/www\.w3\.org$/;
  // 2026-11-09: Lite's QR codes (uplift/lite, merged after this assessment) encode V2.5.3's illustrative addresses under
  // northstar.example.com. example.com is reserved for documentation (RFC 2606) and the name does not resolve; the page draws the code
  // and never requests the address (public-security.test.mjs still fails any request that leaves the page). That one exact host is
  // allowed, in the demo only, and only as the text of a QR code; every other host is still refused.
  const QR_TEXT = /^https:\/\/northstar\.example\.com$/;
  for (const [site, d] of Object.entries(DIST)) for (const f of walk(d)) {
    const rel = path.relative(repo, f); assert.ok(!f.endsWith('.map'), `${rel}: source map shipped`);
    if (!/\.(html|js|css|json|webmanifest|xml)$/.test(f) || f.endsWith('signal-lib.json')) continue;   // licence texts (OFL.txt, *.LEGAL.txt) name their upstream, which no page loads
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\bhttps?:\/\/[a-z0-9.-]+/gi)) if (!(site === 'website' && /sitemap\.xml|BUILD_MANIFEST/.test(f))) assert.ok(HOSTS.test(m[0]) || (site === 'demo' && QR_TEXT.test(m[0])), `${rel}: unexpected host ${m[0]}`);
    if (!f.endsWith('.html')) continue;
    for (const t of s.match(/<script\b[^>]*>/g) || []) assert.ok(/\bsrc="/.test(t) || /type="application\/ld\+json"/.test(t), `${rel}: inline script ${t}`);
    for (const ld of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { JSON.parse(ld[1]); assert.doesNotMatch(ld[1], /<\//, `${rel}: JSON-LD may close its script`); }
    assert.doesNotMatch(s, /<style\b|\sstyle="|\son[a-z]+=|javascript:/i, `${rel}: inline style, handler or javascript: URL`);
    for (const a of s.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) assert.match(a, /rel="[^"]*noopener[^"]*noreferrer|rel="[^"]*noreferrer[^"]*noopener/, `${rel}: ${a.slice(0, 120)}`);
    if (site === 'website') assert.doesNotMatch(s, /href="(mailto|tel):/, `${rel}: the site depends on mailto/tel`);
  }
});

test('SA-07 the built sites carry no secret-shaped value (tracked files: scripts/verify/scan-secrets.py)', { skip: !built && 'not built' }, () => {
  const PAT = [/\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bgh[pousr]_[A-Za-z0-9]{36,}/, /\bgithub_pat_[A-Za-z0-9_]{40,}/, /\bsk-(ant-)?[A-Za-z0-9_-]{32,}/, /\bsk_[a-f0-9]{48}\b/, /\brnd_[A-Za-z0-9]{20,}/, /\bAIza[0-9A-Za-z_-]{35}\b/, /\bxox[abpors]-[A-Za-z0-9-]{10,}/, /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, /\bnpm_[A-Za-z0-9]{36}\b/];
  const hits = [];
  for (const d of Object.values(DIST)) for (const f of walk(d)) { const b = fs.readFileSync(f, 'latin1'); PAT.forEach((p, i) => { if (p.test(b)) hits.push(`${path.relative(repo, f)} pattern#${i}`); }); }
  assert.deepEqual(hits, [], 'location and pattern only; never the value');
});

// ---- the local servers
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const raw = (port, line, extra = '') => new Promise((ok) => { const c = net.connect(port, '127.0.0.1', () => c.write(`${line} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n${extra}\r\n`)); let b = ''; c.on('data', (d) => { b += d; }); c.on('end', () => ok(b)); c.on('error', () => ok(b)); setTimeout(() => { c.destroy(); ok(b); }, 4000); });
const status = (r) => Number((/^HTTP\/1\.1 (\d+)/.exec(r) || [])[1] || 0);
const hdr = (r, k) => (new RegExp(`^${k}: (.*)$`, 'mi').exec(r) || [])[1]?.trim();
async function server(app) {
  const port = await freePort(); const p = spawn(process.execPath, [path.join(repo, `apps/${app}/server/serve.mjs`), `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let exited = false; p.on('exit', () => { exited = true; });
  await new Promise((r) => { p.stdout.once('data', r); setTimeout(r, 3000); });
  return { port, alive: () => !exited, stop: () => p.kill() };
}
for (const app of ['website', 'demo']) {
  test(`SA-05 ${app} local server: hostile requests are refused and never stop it`, { skip: !built && 'not built' }, async () => {
    const s = await server(app);
    try {
      const ok = await raw(s.port, 'GET /'); assert.equal(status(ok), 200);
      assert.equal(hdr(ok, 'content-security-policy'), cspHeader(app === 'website' ? ['http://127.0.0.1:4100'] : []));
      for (const [k, v] of Object.entries(COMMON_HEADERS)) assert.equal(hdr(ok, k), v, `${app} ${k}`);
      for (const u of ['/%E0%A4%A', '/%', '/%c0%ae%c0%ae/etc/passwd', '/../../../../etc/passwd', '/%2e%2e/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2f..%2fetc%2fpasswd', '/index.html%00.js', '/' + 'a'.repeat(6000)]) {
        const r = await raw(s.port, `GET ${u}`); assert.ok([404, 400, 414, 431].includes(status(r)), `${app} ${u.slice(0, 40)} → ${status(r)}`); assert.doesNotMatch(r, /root:|Error:|at .*\.mjs/, `${app} ${u.slice(0, 40)} leaks`);
      }
      for (const m of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'PATCH']) assert.equal(status(await raw(s.port, `${m} /`, 'Content-Length: 0\r\n')), 405, `${app} ${m}`);
      const h = await raw(s.port, 'HEAD /'); assert.equal(status(h), 200); assert.equal(h.split('\r\n\r\n')[1] || '', '', `${app} HEAD has a body`);
      const js = await raw(s.port, `GET /${app === 'website' ? 'site.js' : 'demo.js'}`); assert.match(hdr(js, 'content-type') || '', /^text\/javascript/); assert.equal(hdr(js, 'x-content-type-options'), 'nosniff');
      assert.ok(s.alive(), `${app} server stopped`); assert.equal(status(await raw(s.port, 'GET /')), 200, `${app} still serves after the hostile requests`);
    } finally { s.stop(); }
  });
}
test('SA-05 the website server redirects only moved pages, to its own paths', { skip: !built && 'not built' }, async () => {
  const s = await server('website');
  try {
    const r = await raw(s.port, 'GET /products/scouter'); assert.equal(status(r), 301); assert.match(hdr(r, 'location'), /^\/products\/lite#scouter$/);
    for (const u of ['//evil.example', '/%2F%2Fevil.example', '/\\evil.example', '/products/scouter/..%2f..%2f%2f%2fevil.example']) { const x = await raw(s.port, `GET ${u}`); assert.doesNotMatch(hdr(x, 'location') || '', /evil/, u); }
  } finally { s.stop(); }
});
