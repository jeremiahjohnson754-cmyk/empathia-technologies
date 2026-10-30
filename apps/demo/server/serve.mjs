#!/usr/bin/env node
/**
 * Serve the built investor demo on 127.0.0.1 (default port 4310). Static files only, with a Content-Security-Policy that lets the
 * page talk to the configured API origin and nothing else.
 *   node apps/enterprise-web/server/serve.mjs [--port=4200] [--api=http://127.0.0.1:4100]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const port = Number(arg('port', process.env.DEMO_PORT || 4310));
const host = arg('host', process.env.DEMO_HOST || '127.0.0.1');   // 0.0.0.0 only inside a container, published on 127.0.0.1 by compose
const apiOrigin = new URL(arg('api', process.env.API_URL || 'http://127.0.0.1:4100')).origin;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8' };
const CSP = `default-src 'self'; connect-src 'self' ${apiOrigin}; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
export function serve() {
  const s = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) { res.writeHead(421).end('misdirected'); return; }
    let p = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    const head = { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-cache' };
    if (f.endsWith('.html')) Object.assign(head, { 'content-security-policy': CSP, 'x-frame-options': 'DENY' });
    res.writeHead(200, head); fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => s.listen(port, host, () => ok(s)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('build first: node apps/demo/build.mjs'); process.exit(1); }
  serve().then(() => console.log(`Empathia enterprise web: http://127.0.0.1:${port}/  (API ${apiOrigin}; add ?api=… to point elsewhere)`));
}
