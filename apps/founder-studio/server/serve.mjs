#!/usr/bin/env node
/**
 * Empathia Founder Studio — local launcher.
 *
 * Serves the studio, the Founder Edition demonstrator and the founder's films from this computer only, so that the studio and the
 * demonstrator share one origin (persona switching, the read-only data inspector, saved states).
 *
 * Security: binds to 127.0.0.1 only; refuses any Host header other than 127.0.0.1/localhost (DNS-rebinding guard); requires a
 * per-launch access key (printed in the URL, then kept in an HttpOnly SameSite=Strict cookie); serves only files inside its own
 * folder plus the film files named in server/film-index.json; no directory listings; no network calls of its own.
 * Node 22+ standard library only.
 *
 *   node server/serve.mjs [--port=4310] [--no-open] [--films=/path/to/films]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const PORT = Number(arg('port', process.env.STUDIO_PORT || 4310));
const KEY = process.env.STUDIO_KEY || crypto.randomBytes(18).toString('base64url');
const filmsDir = path.resolve(arg('films', path.join(root, 'media/films')));
const dataDir = path.join(root, '.local');
const snapDir = path.join(dataDir, 'snapshots');
fs.mkdirSync(snapDir, { recursive: true });
let filmIndex = {};
try { filmIndex = JSON.parse(fs.readFileSync(path.join(root, 'server/film-index.json'), 'utf8')); } catch { /* optional */ }
const WORKSPACE = process.env.EMPATHIA_WORKSPACE || '/home/claude';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt' };
const API_ORIGIN = new URL(arg('api', process.env.API_URL || 'http://127.0.0.1:4100')).origin;   // the platform API the studio may talk to (and nothing else)
const STUDIO_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; frame-src 'self'; connect-src 'self' " + API_ORIGIN + " " + API_ORIGIN.replace('127.0.0.1', 'localhost') + "; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const send = (res, code, body, headers = {}) => { res.writeHead(code, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...headers }); res.end(body); };
const json = (res, code, v) => send(res, code, JSON.stringify(v), { 'content-type': 'application/json' });

function serveFile(req, res, file) {
  let st;
  try { st = fs.statSync(file); } catch { return send(res, 404, 'Not found'); }
  if (!st.isFile()) return send(res, 404, 'Not found');
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'content-type': type, 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store' };
  if (file === path.join(root, 'index.html')) Object.assign(headers, { 'content-security-policy': STUDIO_CSP, 'x-frame-options': 'DENY' });
  else if (type.startsWith('text/html')) headers['x-frame-options'] = 'SAMEORIGIN';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) return send(res, 416, '', { 'content-range': `bytes */${st.size}` });
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

/** Resolve a URL path inside `base`, refusing anything that escapes it. */
function inside(base, urlPath) {
  const p = path.resolve(base, `.${decodeURIComponent(urlPath)}`);
  return p === base || p.startsWith(base + path.sep) ? p : null;
}

const readBody = (req, limit) => new Promise((ok, bad) => { let n = 0; const chunks = []; req.on('data', (c) => { n += c.length; if (n > limit) { bad(new Error('too large')); req.destroy(); } else chunks.push(c); }); req.on('end', () => ok(Buffer.concat(chunks).toString('utf8'))); req.on('error', bad); });

async function api(req, res, url) {
  // 12 Nov 2026: which curated films are on this computer, so the studio says "not on this computer" without requesting a missing file
  if (url.pathname === '/api/films' && req.method === 'GET') {
    const here = (n) => fs.existsSync(path.join(filmsDir, n)) || (() => { const ws = filmIndex[n] && path.resolve(WORKSPACE, filmIndex[n]); return !!(ws && ws.startsWith(path.resolve(WORKSPACE) + path.sep) && fs.existsSync(ws)); })();
    return json(res, 200, { available: Object.keys(filmIndex).filter(here).concat(fs.existsSync(filmsDir) ? fs.readdirSync(filmsDir).filter((n) => n.endsWith('.mp4') && !(n in filmIndex)) : []) });
  }
  const m = url.pathname.match(/^\/api\/snapshots(?:\/([A-Za-z0-9_-]+))?$/);
  if (!m) return json(res, 404, { error: 'no such endpoint' });
  const id = m[1];
  if (req.method === 'GET' && !id) {
    const list = fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).map((f) => { try { const j = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8')); return { id: f.replace(/\.json$/, ''), name: j.name, at: j.at, bytes: fs.statSync(path.join(snapDir, f)).size }; } catch { return null; } }).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
    return json(res, 200, list);
  }
  if (req.method === 'POST' && !id) {
    if (!/^application\/json/.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'JSON only' });
    let body; try { body = JSON.parse(await readBody(req, 50 * 1024 * 1024)); } catch (e) { return json(res, 400, { error: String(e.message) }); }
    const data = body && typeof body.data === 'object' ? Object.fromEntries(Object.entries(body.data).filter(([k, v]) => /^empathia\./.test(k) && typeof v === 'string')) : null;
    if (!data || !Object.keys(data).length) return json(res, 400, { error: 'nothing to save' });
    const sid = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    fs.writeFileSync(path.join(snapDir, `${sid}.json`), JSON.stringify({ name: String(body.name || 'Untitled').slice(0, 120), at: new Date().toISOString(), data }));
    return json(res, 201, { id: sid });
  }
  if (id && req.method === 'GET') { const f = path.join(snapDir, `${id}.json`); return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), { 'content-type': 'application/json' }) : json(res, 404, { error: 'no such snapshot' }); }
  if (id && req.method === 'DELETE') { const f = path.join(snapDir, `${id}.json`); if (fs.existsSync(f)) fs.unlinkSync(f); return json(res, 200, { deleted: id }); }
  return json(res, 405, { error: 'method not allowed' });
}

const server = http.createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (!['127.0.0.1', 'localhost'].includes(host)) return send(res, 421, 'This studio only answers on 127.0.0.1.');
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const cookie = /(?:^|;\s*)studio_key=([^;]+)/.exec(req.headers.cookie || '');
    if (url.searchParams.get('k') === KEY) {
      return send(res, 302, '', { location: url.pathname === '/' ? '/index.html' : url.pathname, 'set-cookie': `studio_key=${KEY}; HttpOnly; SameSite=Strict; Path=/` });
    }
    if (!cookie || cookie[1] !== KEY) return send(res, 401, 'Open the address the launcher printed (it carries this launch’s key).', { 'content-type': 'text/plain; charset=utf-8' });
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, 'cross-origin write refused');
      return api(req, res, url);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (url.pathname.startsWith('/media/films/')) {
      const name = path.basename(decodeURIComponent(url.pathname));
      const local = path.join(filmsDir, name);
      if (fs.existsSync(local)) return serveFile(req, res, local);
      const ws = filmIndex[name] && path.resolve(WORKSPACE, filmIndex[name]);
      if (ws && ws.startsWith(path.resolve(WORKSPACE) + path.sep) && fs.existsSync(ws)) return serveFile(req, res, ws);
      return send(res, 404, 'This film is not on this computer.');
    }
    const p = inside(root, url.pathname === '/' ? '/index.html' : url.pathname);
    if (!p || p.startsWith(dataDir) || p.startsWith(path.join(root, 'server'))) return send(res, 404, 'Not found');
    return serveFile(req, res, p);
  } catch (e) {
    return send(res, 500, `Studio error: ${e.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const addr = `http://127.0.0.1:${PORT}/?k=${KEY}`;
  console.log(`\n  Empathia Founder Studio is running on this computer only.\n\n  Open: ${addr}\n\n  Films folder: ${filmsDir}\n  Stop: press Ctrl+C in this window.\n`);
  if (!process.argv.includes('--no-open')) {
    const cmd = process.platform === 'darwin' ? ['open', [addr]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', addr]] : ['xdg-open', [addr]];
    try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* the address is printed above */ }
  }
});
server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is busy. Start with --port=4311.` : e.message); process.exit(1); });
