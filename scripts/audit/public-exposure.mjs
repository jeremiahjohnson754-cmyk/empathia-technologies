#!/usr/bin/env node
/**
 * Public exposure audit of the two public builds (founder, 19 Nov 2026 06:08: "filename and content matching alone doesn't establish that
 * all private information is protected. The public build should also be checked for secrets, source maps, embedded data, and unintended
 * file access").
 *
 *   node scripts/audit/public-exposure.mjs [--dist=apps/website/dist,apps/demo/dist] [--live=https://site-a,https://site-b] [--json=<file>]
 *
 * On the built files it checks:
 *   PX-01 every file is a type a public site serves (no source, config, key, archive, database, script or dotfile)
 *   PX-02 no source map, and no sourceMappingURL pointing at one
 *   PX-03 no secret: cloud, payment, chat, repository and model-provider keys, private keys, tokens, credentials in URLs, assignments
 *         of a password, secret or API key to a literal
 *   PX-04 no personal contact data: no e-mail address outside reserved example domains, no telephone number outside the 555-01xx
 *         fiction range
 *   PX-05 no path, host or address of the machine that built it (home folders, the private store, .local, localhost or loopback
 *         addresses; on the corporate site, private network ranges too — the demonstration teaches networking with fictional private
 *         addresses on its synthetic devices, so there they are content, not a leak)
 *   PX-06 embedded data is bounded: no data: URI over 64 KB, no inline JSON over 256 KB in a page, every JSON file's name accounted for
 *   PX-07 no marker of the private material (the origins archive, the employer names that must not appear, the founder-vision date)
 * With --live it asks each site for paths that must not be served and passes when each comes back not found, or as the site's own page
 * (a static host's fallback), never as the file asked for (PX-08).
 * Exit 1 on any finding. Read-only: it writes nothing but the optional JSON report.
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const dists = arg('dist', 'apps/website/dist,apps/demo/dist').split(',').map((d) => path.resolve(repo, d));
const live = arg('live', '').split(',').filter(Boolean);
const results = []; let failed = 0;
const ok = (id, name, cond, detail = '') => { results.push({ id, name, result: cond ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 600) }); if (!cond) failed += 1; console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name}${cond ? '' : ` — ${String(detail).slice(0, 500)}`}`); };

const SERVED = new Set(['html', 'css', 'js', 'json', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico', 'woff2', 'woff', 'mp4', 'webm', 'vtt', 'mp3', 'm4a', 'ogg', 'pdf', 'xml', 'webmanifest', 'txt']);
const TEXT = new Set(['html', 'css', 'js', 'json', 'svg', 'vtt', 'xml', 'webmanifest', 'txt']);
/** .txt files a public site legitimately serves: robots, font licences, bundler licence notices, the training transcript */
const TXT_OK = /(^|\/)(robots\.txt|OFL\.txt|[^/]+\.LEGAL\.txt|pilot1\.txt)$/;
const SECRETS = [
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/], ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/], ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/], ['Stripe key', /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/], ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{20,}/], ['OpenAI-style key', /\bsk-(proj-)?[A-Za-z0-9]{32,}\b/], ['Render API key', /\brnd_[A-Za-z0-9]{20,}/],
  ['JSON web token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/], ['credentials in a URL', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@"'`]+:[^\s/@"'`]{3,}@[a-z0-9.-]+/i],
  ['secret assigned to a literal', /\b(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g;
const EMAIL_OK = /@([a-z0-9-]+\.)*(example|invalid|test|localhost)$|@(example\.(com|org|net))$/i;
const PHONE = /(?<![\d.])(?:\+?1[ .-]?)?\(?([2-9]\d{2})\)?[ .-]([2-9]\d{2})[ .-](\d{4})(?![\d.])/g;
const MACHINE = [['home folder', /\/(home|Users)\/[a-z][a-z0-9_-]+\/(?!\*)/], ['root folder', /\/root\/\.?[a-z]/], ['private store', /\.empathia-private/], ['local folder', /(^|[^a-z])\.local\/(pricing|reference|directives|logs|pg)\b/],
  ['loopback address', /\b(localhost|127\.0\.0\.1):\d{2,5}\b/]];
const PRIVATE_NET = /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;
const PRIVATE = /origins archive|ORIGINS_FOUNDER|PRIVATE_COMPLETE|B3 Integrated|Kraft Heinz|Stefanini|\bKHC\b|\bAON\b|contractor invoice|(November 20,? 2025|20 November,? 2025)/;

const files = []; for (const d of dists) { if (!fs.existsSync(d)) { ok('PX-00', `${path.relative(repo, d)} is built`, false, 'not built (node scripts/build.mjs --public)'); continue; }
  const walk = (p) => { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const f = path.join(p, e.name); if (e.isDirectory()) walk(f); else files.push({ dist: d, f, rel: path.relative(d, f), ext: (e.name.includes('.') ? e.name.split('.').pop() : '').toLowerCase(), dot: e.name.startsWith('.') }); } }; walk(d); }
const label = (x) => `${path.basename(x.dist === dists[0] ? 'website' : x.dist.includes('demo') ? 'demo' : x.dist)}:${x.rel}`;
const site = (x) => (x.dist.includes('demo') ? 'demo' : 'website');

// PX-01, PX-02
const badType = files.filter((x) => x.dot || !SERVED.has(x.ext) || (x.ext === 'txt' && !TXT_OK.test(x.rel)));
ok('PX-01', `every one of the ${files.length} built files is a type a public site serves`, !badType.length, badType.map((x) => `${site(x)}:${x.rel}`).join(', '));
const text = files.filter((x) => TEXT.has(x.ext)).map((x) => ({ ...x, body: fs.readFileSync(x.f, 'utf8') }));
const maps = [...files.filter((x) => x.ext === 'map'), ...text.filter((x) => /[#@]\s*sourceMappingURL=(?!data:)/.test(x.body))];
ok('PX-02', 'no source map, and no sourceMappingURL comment pointing at one', !maps.length, maps.map((x) => `${site(x)}:${x.rel}`).join(', '));

// PX-03
const secrets = []; for (const x of text) for (const [what, re] of SECRETS) { const m = re.exec(x.body); if (m) secrets.push(`${site(x)}:${x.rel}: ${what} (${m[0].slice(0, 12)}…)`); }
ok('PX-03', `no secret in the ${text.length} text files (${SECRETS.length} kinds: keys, tokens, private keys, credentials in URLs, secrets assigned to literals)`, !secrets.length, secrets.join(' | '));

// PX-04
const contacts = [];
for (const x of text) {
  for (const m of x.body.matchAll(EMAIL)) if (!EMAIL_OK.test(m[0]) && !/\.(png|jpe?g|webp|svg|js|css)$/i.test(m[0])) contacts.push(`${site(x)}:${x.rel}: e-mail ${m[0]}`);
  if (x.ext === 'html' || x.ext === 'json' || x.ext === 'vtt' || x.ext === 'txt') for (const m of x.body.matchAll(PHONE)) if (!(m[2] === '555' && /^01\d\d$/.test(m[3]))) contacts.push(`${site(x)}:${x.rel}: telephone ${m[0].trim()}`);
}
ok('PX-04', 'no personal contact data: e-mail only at reserved example domains, telephone numbers only in the 555-01xx fiction range', !contacts.length, [...new Set(contacts)].slice(0, 20).join(' | '));

// PX-05
const machine = []; for (const x of text) { for (const [what, re] of MACHINE) { const m = re.exec(x.body); if (m) machine.push(`${site(x)}:${x.rel}: ${what} (${m[0].slice(0, 40)})`); }
  if (site(x) === 'website') { const m = PRIVATE_NET.exec(x.body); if (m) machine.push(`${site(x)}:${x.rel}: private network address (${m[0]})`); } }
ok('PX-05', 'no path, store or private address of the machine that built it', !machine.length, machine.join(' | '));

// PX-06
const big = [];
for (const x of text) {
  for (const m of x.body.matchAll(/data:[a-z]+\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/gi)) if (m[1].length > 64 * 1024 * 4 / 3) big.push(`${site(x)}:${x.rel}: a data: URI of ${Math.round(m[1].length * 0.75 / 1024)} KB`);
  if (x.ext === 'html') for (const m of x.body.matchAll(/<script[^>]*type="application\/(ld\+)?json"[^>]*>([\s\S]*?)<\/script>/gi)) if (m[2].length > 256 * 1024) big.push(`${site(x)}:${x.rel}: inline JSON of ${Math.round(m[2].length / 1024)} KB`);
}
const JSON_OK = /^(BUILD_MANIFEST\.json|offline-packs\.json|signal-lib\.json|signal\/[^/]+\.json|signal\/(story|pieces|art)\/[^/]+\.json|proof\/[^/]+\.json|media\/training\/pilot1\/[^/]+\.json)$/;
const strayJson = files.filter((x) => x.ext === 'json' && !JSON_OK.test(x.rel));
ok('PX-06', 'embedded data is bounded and accounted for: no data: URI over 64 KB, no inline JSON over 256 KB, every JSON file in a known place', !big.length && !strayJson.length, [...big, ...strayJson.map((x) => `${site(x)}:${x.rel}: unexpected JSON file`)].join(' | '));

// PX-07
const priv = text.filter((x) => PRIVATE.test(x.body)).map((x) => `${site(x)}:${x.rel}: ${PRIVATE.exec(x.body)[0]}`);
ok('PX-07', 'no marker of the private material (the origins archive, the employer names that must not appear, the founder-vision date)', !priv.length, priv.join(' | '));

// PX-08
if (live.length) {
  const PROBES = [['/.git/config', /\[core\]/], ['/.git/HEAD', /^ref: /m], ['/.env', /^[A-Z_]+=/m], ['/.env.local', /^[A-Z_]+=/m], ['/package.json', /"(dependencies|scripts)"/], ['/pnpm-lock.yaml', /lockfileVersion/],
    ['/render.yaml', /services:/], ['/tsconfig.json', /compilerOptions/], ['/src/main.ts', /\bimport\b/], ['/src/App.tsx', /\bimport\b/], ['/server/serve.mjs', /createServer/], ['/build.mjs', /esbuild/],
    ['/.local/', /pricing|directives/], ['/node_modules/', /Index of/i], ['/site.js.map', /"mappings"/], ['/demo.js.map', /"mappings"/], ['/%2e%2e/%2e%2e/etc/passwd', /root:x:0:0/], ['/..%2f..%2fetc%2fpasswd', /root:x:0:0/],
    ['/.DS_Store', /Bud1/], ['/docs/', /Index of/i], ['/apps/', /Index of/i], ['/database/migrations/0001_init.sql', /CREATE TABLE/i]];
  for (const base of live) {
    const leaks = [];
    for (const [p, sig] of PROBES) {
      try { const r = await fetch(base.replace(/\/$/, '') + p, { redirect: 'manual' }); const ct = r.headers.get('content-type') || ''; const body = r.status === 200 ? (await r.text()).slice(0, 20000) : '';
        if (r.status === 200 && sig.test(body)) leaks.push(`${p} (${r.status}, ${ct})`);
        else if (r.status === 200 && !/text\/html/.test(ct) && !/^\/(\.|%2e)/.test(p)) leaks.push(`${p} served as ${ct}`);
      } catch (e) { leaks.push(`${p}: ${e.message}`); }
    }
    ok('PX-08', `${base}: none of ${PROBES.length} paths that must not be served is served (source, config, lock files, dotfiles, maps, traversal, listings)`, !leaks.length, leaks.join(' | '));
  }
}

const out = arg('json', ''); if (out) fs.writeFileSync(path.resolve(repo, out), JSON.stringify({ suite: 'public-exposure', at: new Date().toISOString(), dists: dists.map((d) => path.relative(repo, d)), live, files: files.length, results }, null, 1));
console.log(`\npublic exposure: PASS ${results.length - failed} · FAIL ${failed}`); process.exit(failed ? 1 : 0);
