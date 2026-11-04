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
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  // brand, Inter and media (D7, D39): served with their real types, which nosniff requires
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.mp3': 'audio/mpeg' };
// the policy both public sites share (scripts/security/policy.mjs; render.yaml declares the same). D7: Inter is self-hosted, so there is
// no font kit and no third-party host; the demonstration runs entirely in the browser, so connect-src is the page's own origin only
// (the configured API origin is still named in the page, for a deployment that adds one).
const { cspHeader, COMMON_HEADERS } = await import(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../scripts/security/policy.mjs'));
const CSP = cspHeader();
const lower = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
export function serve() {
  const s = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) { res.writeHead(421).end('misdirected'); return; }
    // assessment SA-05: static files only (GET/HEAD), and a malformed escape is a 404, never an uncaught exception that stops the server
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain' }).end('method not allowed'); return; }
    let p; try { p = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname); } catch { p = '/\u0000'; }
    if (p === '/') p = '/index.html';
    const f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const base = { ...lower(COMMON_HEADERS), 'cache-control': 'no-cache' };
    if (p.includes('\u0000') || !f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { ...base, 'content-type': 'text/plain' }).end('not found'); return; }
    const head = { ...base, 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' };
    if (f.endsWith('.html')) head['content-security-policy'] = CSP;
    if (f.endsWith('index.html')) { const html = fs.readFileSync(f, 'utf8').replace('<head>', `<head>\n  <meta name="empathia-api" content="${apiOrigin}">`); res.writeHead(200, { ...head, 'content-length': Buffer.byteLength(html) }); res.end(req.method === 'HEAD' ? undefined : html); return; }   // the API origin the deployment configured
    res.writeHead(200, head); if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(f).on('error', () => res.destroy()).pipe(res);   // a file that vanishes mid-read ends this response, not the server
  });
  return new Promise((ok) => s.listen(port, host, () => ok(s)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('build first: node apps/demo/build.mjs'); process.exit(1); }
  serve().then(() => console.log(`Empathia enterprise web: http://127.0.0.1:${port}/  (API ${apiOrigin}; add ?api=… to point elsewhere)`));
}
