/**
 * The HTTP layer: correlation ids, CORS (configured origins only), security headers, rate limiting, authentication (Bearer token →
 * principal resolved from the database), body/query validation against the route contract, idempotency keys, and error mapping to
 * problem details. Node http only.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import type { Router, Res } from './router.js';
import { validate } from './schema.js';
import { ApiError } from './errors.js';
import { RequestContext } from '../auth/context.js';
import type { TokenVerifier } from '../auth/jwt.js';
import { resolvePrincipal } from '../domain/platform.js';
import { asJson, type PgPool } from '../db/pg.js';
import type { Config } from '../config.js';
import { log } from '../log.js';

const HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'" };

class Bucket { tokens: number; at = Date.now(); constructor(public cap: number) { this.tokens = cap; } take(): boolean { const now = Date.now(); this.tokens = Math.min(this.cap, this.tokens + ((now - this.at) / 60000) * this.cap); this.at = now; if (this.tokens < 1) return false; this.tokens -= 1; return true; } }

export function createServer(cfg: Config, router: Router, pool: PgPool, tokens: TokenVerifier): http.Server {
  const buckets = new Map<string, Bucket>();
  return http.createServer(async (req, res) => {
    const t0 = process.hrtime.bigint();
    const incoming = String(req.headers['x-correlation-id'] || '');
    const correlationId = /^[A-Za-z0-9._-]{8,80}$/.test(incoming) ? incoming : crypto.randomUUID();
    const origin = String(req.headers.origin || '');
    const cors: Record<string, string> = cfg.corsOrigins.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type, idempotency-key, x-correlation-id, x-file-name', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE', 'access-control-expose-headers': 'x-correlation-id' } : {};
    let status = 500; let ctxRole = '-';
    const send = (r: Res) => {
      status = r.status;
      const body = r.raw ?? (r.body === undefined ? undefined : Buffer.from(JSON.stringify(r.body)));
      res.writeHead(r.status, { ...HEADERS, ...cors, 'x-correlation-id': correlationId, ...(r.raw ? {} : body ? { 'content-type': r.status >= 400 ? 'application/problem+json' : 'application/json; charset=utf-8' } : {}), ...(r.headers || {}) });
      res.end(body);
    };
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (req.method === 'OPTIONS') { send({ status: cors['access-control-allow-origin'] ? 204 : 403 }); return; }
      // a page opened from disk (Origin: null) may read /health only
      if (origin === 'null' && url.pathname === '/health') cors['access-control-allow-origin'] = 'null';
      const m = router.match(req.method || 'GET', url.pathname);
      if (!m) throw new ApiError('not_found', `no endpoint ${url.pathname}`);
      if ('allowed' in m) { send({ status: 405, body: { ...new ApiError('validation', `method not allowed; use ${m.allowed.join(', ')}`).problem(correlationId), status: 405 }, headers: { allow: m.allowed.join(', ') } }); return; }
      const { route, params } = m;
      const ctx = new RequestContext(pool, correlationId);

      // authentication
      req.headers['x-empathia-remote'] = String(req.socket.remoteAddress || 'unknown');   // set by the server, never trusted from the client (overwritten here)
      let bucketKey = `ip:${req.socket.remoteAddress}`;
      if (route.auth) {
        const h = String(req.headers.authorization || '');
        if (!h.startsWith('Bearer ')) throw new ApiError('unauthenticated', 'send Authorization: Bearer <token>');
        let claims;
        try { claims = tokens.verify(h.slice(7)); } catch (e) { throw new ApiError('unauthenticated', (e as Error).message); }
        const p = await resolvePrincipal(pool, claims.sub, claims.tid, claims.role);
        if (!p) throw new ApiError('unauthenticated', 'the membership behind this token no longer exists or the person is disabled');
        ctx.principal = p; ctxRole = p.role; bucketKey = `p:${p.personId}`;
      }
      const b = buckets.get(bucketKey) || buckets.set(bucketKey, new Bucket(cfg.rateLimitPerMinute)).get(bucketKey)!;
      if (!b.take()) throw new ApiError('rate_limited', 'slow down: the per-caller request budget is spent for this minute');

      // body
      let raw: Buffer | null = null; let body: unknown = null;
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method || '')) {
        const chunks: Buffer[] = []; let n = 0;
        for await (const c of req) { n += (c as Buffer).length; if (n > cfg.maxBodyBytes) throw new ApiError('payload_too_large', `the body exceeds ${cfg.maxBodyBytes} bytes`); chunks.push(c as Buffer); }
        raw = Buffer.concat(chunks);
        if (route.bodyKind !== 'binary' && raw.length) {
          if (!/^application\/json/.test(String(req.headers['content-type'] || ''))) throw new ApiError('unsupported_media_type', 'send JSON (content-type: application/json)');
          try { body = JSON.parse(raw.toString('utf8')); } catch { throw new ApiError('validation', 'the body is not valid JSON'); }
        }
      }
      if (route.body) { const errs = validate(route.body, body ?? {}, 'body'); if (errs.length) throw new ApiError('validation', errs[0]!, errs); }
      for (const [k, s] of Object.entries(route.query || {})) { const v = url.searchParams.get(k); if (v != null) { const errs = validate(s, v, `query.${k}`); if (errs.length) throw new ApiError('validation', errs[0]!, errs); } }
      for (const k of url.searchParams.keys()) if (!route.query || !(k in route.query)) throw new ApiError('validation', `unknown query parameter ${k}`);

      // idempotency (POST)
      const idem = String(req.headers['idempotency-key'] || '');
      if (route.idempotent && idem && ctx.principal) {
        if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idem)) throw new ApiError('validation', 'Idempotency-Key is 8–128 characters of letters, digits and ._:-');
        const reqHash = crypto.createHash('sha256').update(`${req.method} ${url.pathname}\n`).update(raw || Buffer.alloc(0)).digest('hex');
        const prev = (await ctx.tx((q) => q.query<{ request_hash: string; status_code: number; response: unknown }>('SELECT request_hash, status_code, response FROM app.idempotency_key WHERE person_id = $1 AND key = $2', [ctx.p.personId, idem]))).rows[0];
        if (prev) {
          if (prev.request_hash !== reqHash) throw new ApiError('idempotency_mismatch', 'this Idempotency-Key was used with a different request');
          send({ status: prev.status_code, body: prev.response, headers: { 'idempotent-replay': 'true' } }); return;
        }
        const out = await route.handler(ctx, { params, query: url.searchParams, body, raw, headers: req.headers });
        if (out.status < 300) await ctx.tx((q) => q.query('INSERT INTO app.idempotency_key (tenant_id, person_id, key, request_hash, status_code, response) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [ctx.p.tenantId, ctx.p.personId, idem, reqHash, out.status, asJson(out.body ?? null)]));
        send(out); return;
      }
      send(await route.handler(ctx, { params, query: url.searchParams, body, raw, headers: req.headers }));
    } catch (e) {
      const err = e instanceof ApiError ? e : (e as { code?: string }).code === '23505' ? new ApiError('conflict', 'that record already exists') : /^EM00[1-4]$/.test(String((e as { code?: string }).code)) ? new ApiError('rule_refused', (e as Error).message) : (e as { code?: string }).code === '23514' ? new ApiError('rule_refused', `a database constraint refused the change: ${(e as { constraint?: string }).constraint || (e as Error).message}`) : new ApiError('internal', 'internal error (see the server log for this correlation id)');
      if (err.code === 'internal') log('error', 'request failed', { correlationId, error: (e as Error).message, stack: (e as Error).stack?.split('\n').slice(0, 4).join(' | ') });
      send({ status: err.status, body: err.problem(correlationId) });
    } finally {
      log('info', 'request', { correlationId, method: req.method, path: (req.url || '').split('?')[0], status, role: ctxRole, ms: Number(process.hrtime.bigint() - t0) / 1e6 });
    }
  });
}
