#!/usr/bin/env node
/**
 * Serve the built public site on 127.0.0.1 (default port 4300). Static files only, with a Content-Security-Policy that lets the
 * page talk to the configured API origin and nothing else.
 *   node apps/website/server/serve.mjs [--port=4200] [--api=http://127.0.0.1:4100]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const port = Number(arg('port', process.env.WWW_PORT || 4300));
const host = arg('host', process.env.WWW_HOST || '127.0.0.1');   // 0.0.0.0 only inside a container, published on 127.0.0.1 by compose
const apiOrigin = new URL(arg('api', process.env.API_URL || 'http://127.0.0.1:4100')).origin;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' };
// addresses that moved when the product pages followed the nine (D42): permanent redirects, the same map as render.yaml's routes
const MOVED = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../redirects.json'), 'utf8'));
// the policy both public sites share (scripts/security/policy.mjs; render.yaml declares the same). D7: Inter is self-hosted; no font kit, no third party
const { cspHeader, COMMON_HEADERS } = await import(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../scripts/security/policy.mjs'));
const CSP = cspHeader([apiOrigin]); const COMMON = Object.fromEntries(Object.entries(COMMON_HEADERS).map(([k, v]) => [k.toLowerCase(), v]));
export function serve() {
  const s = http.createServer((req, res) => {
    const host = String(req.headers.host || '');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain' }).end('method not allowed'); return; }
    let p; try { p = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname); } catch { p = '/\u0000'; }   // a malformed escape is simply not found
    const bare = p.replace(/\/+$/, '') || '/';
    if (MOVED[bare]) { res.writeHead(301, { location: MOVED[bare], 'cache-control': 'no-cache' }).end(); return; }
    if (p.endsWith('/')) p += 'index.html'; else if (!path.extname(p)) p += '/index.html';   // pre-rendered pages: /platform → /platform/index.html
    let f = path.join(root, path.normalize(p).replace(/^(\.\.[/\\])+/, '')); let status = 200;
    if (p.includes('\u0000') || !f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { f = path.join(root, '404.html'); status = 404; }   // the designed not-found page, status 404
    const head = { ...COMMON, 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' };
    if (f.endsWith('.html')) head['content-security-policy'] = CSP;
    if (status === 404) { const html = fs.readFileSync(f); res.writeHead(404, { ...head, 'content-length': html.length }); res.end(req.method === 'HEAD' ? undefined : html); return; }
    // films: byte ranges, as the static host serves them, so a viewer can seek (a film is the only file large enough to need it)
    if (path.extname(f) === '.mp4') {
      const size = fs.statSync(f).size; head['accept-ranges'] = 'bytes'; const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
      if (m && (m[1] || m[2])) {
        const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])); const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
        if (start >= size || start > end) { res.writeHead(416, { ...head, 'content-range': `bytes */${size}` }).end(); return; }
        res.writeHead(206, { ...head, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 }); if (req.method === 'HEAD') { res.end(); return; }
        fs.createReadStream(f, { start, end }).on('error', () => res.destroy()).pipe(res); return;
      }
      head['content-length'] = size;
    }
    res.writeHead(200, head); if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(f).on('error', () => res.destroy()).pipe(res);   // a file that vanishes mid-read ends this response, not the server (SA-05)
  });
  return new Promise((ok) => s.listen(port, host, () => ok(s)));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('build first: node apps/website/build.mjs'); process.exit(1); }
  serve().then(() => console.log(`Empathia website: http://127.0.0.1:${port}/  (API ${apiOrigin}; add ?api=… to point elsewhere)`));
}
