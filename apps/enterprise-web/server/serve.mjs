#!/usr/bin/env node
/**
 * Serve the built enterprise web app on 127.0.0.1 (default port 4200). Static files only, with a Content-Security-Policy that lets the
 * page talk to the configured API origin and nothing else.
 *   node apps/enterprise-web/server/serve.mjs [--port=4200] [--api=http://127.0.0.1:4100]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const port = Number(arg('port', process.env.WEB_PORT || process.env.PORT || 4200));   // PORT: the platform's (Render sets it)
const host = arg('host', process.env.WEB_HOST || '127.0.0.1');   // 0.0.0.0 only inside a container, published on 127.0.0.1 by compose
// Host names this server answers for besides localhost (a reverse proxy or a platform passes the public Host through): exact names only,
// comma-separated, e.g. WEB_ALLOWED_HOSTS=empathia-staging-web.onrender.com. Anything else is 421, as before.
const allowedHosts = new Set(String(arg('allowed-hosts', process.env.WEB_ALLOWED_HOSTS || '')).split(',').map((h) => h.trim().toLowerCase()).filter(Boolean));
const hostAllowed = (h) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h) || allowedHosts.has(h.toLowerCase().replace(/:\d+$/, ''));
const apiOrigin = new URL(arg('api', process.env.API_URL || 'http://127.0.0.1:4100')).origin;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
// Typography: when FONT_KIT_ID names the Adobe Fonts kit (Empathia platform UI: Acumin Pro, kit kis0uqz), the stylesheet is linked and its hosts allow-listed; unset = system fonts, no external request
const fontKit = arg('font-kit', process.env.FONT_KIT_ID || '');
const fontSrc = fontKit ? ' https://use.typekit.net https://p.typekit.net' : '';
const CSP = `default-src 'self'; connect-src 'self' ${apiOrigin}${fontKit ? ' https://p.typekit.net' : ''}; img-src 'self' data:${fontKit ? ' https://p.typekit.net' : ''}; style-src 'self'${fontSrc}; font-src 'self'${fontSrc}; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
export function serve() {
  const s = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    // platform health check (Render probes without the public Host): a bare 200, no content, any host
    if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }).end('ok'); return; }
    if (!hostAllowed(host)) { res.writeHead(421).end('misdirected'); return; }
    let p = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    const head = { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-cache' };
    if (f.endsWith('.html')) Object.assign(head, { 'content-security-policy': CSP, 'x-frame-options': 'DENY' });
    if (f.endsWith('index.html')) { const html = fs.readFileSync(f, 'utf8').replace('<head>', `<head>\n  <meta name="empathia-api" content="${apiOrigin}">${fontKit ? `\n  <link rel="stylesheet" href="https://use.typekit.net/${fontKit}.css">` : ''}`); res.writeHead(200, { ...head, 'content-length': Buffer.byteLength(html) }); res.end(html); return; }   // the API origin the deployment configured
    res.writeHead(200, head); fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => s.listen(port, host, () => ok(s)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('build first: node apps/enterprise-web/build.mjs'); process.exit(1); }
  serve().then(() => console.log(`Empathia enterprise web: http://127.0.0.1:${port}/  (API ${apiOrigin}; add ?api=… to point elsewhere)`));
}
