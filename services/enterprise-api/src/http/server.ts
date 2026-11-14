/**
 * The HTTP layer: correlation ids, CORS (configured origins only), security headers, rate limiting, authentication (Bearer token →
 * principal resolved from the database), body/query validation against the route contract, idempotency keys, and error mapping to
 * problem details. Node http only.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { enforcedAuthorities, type Router, type Res } from './router.js';
import { validate } from './schema.js';
import { ApiError } from './errors.js';
import { RequestContext, IdempotencyKeyTaken, type Principal } from '../auth/context.js';
import { OidcVerifier, type OidcClaims } from '../auth/oidc.js';
import type { TokenVerifier } from '../auth/jwt.js';
import { resolvePrincipal, resolveOidcPrincipal } from '../domain/platform.js';
import { asJson, type PgPool, type Queryable } from '../db/pg.js';
import type { Config } from '../config.js';
import { log } from '../log.js';
import type { Telemetry } from '@empathia/observability';

const HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'" };

/** Behind a TLS-terminating proxy (TRUSTED_PROXY=on, e.g. Render): HSTS, and the client address for anonymous rate limiting is the
 *  rightmost X-Forwarded-For entry — the one the proxy itself appended; anything to its left is client-supplied and never believed. */
const behindProxy = process.env['TRUSTED_PROXY'] === 'on';
const PROXY_HEADERS = behindProxy ? { 'strict-transport-security': 'max-age=31536000' } : {};
export const clientAddress = (xff: string | string[] | undefined, socketAddr: string | undefined, trusted = behindProxy): string => {
  if (!trusted) return String(socketAddr || 'unknown');
  const last = String(Array.isArray(xff) ? xff.join(',') : xff || '').split(',').map((x) => x.trim()).filter(Boolean).pop();
  return last || String(socketAddr || 'unknown');
};

/** How long a duplicate waits for the first request with its Idempotency-Key to store its response (D-35). */
const IDEMPOTENCY_WAIT_MS = Number(process.env['IDEMPOTENCY_WAIT_MS'] || 15000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/**
 * The stored response for an Idempotency-Key, waiting while the first request holding it is still running (status_code 0: reserved, D-35).
 * Null when the key is free (never used, or released by a request that failed). A key used with another request is refused at once (422). A
 * reservation that outlives the wait — still running, or a process that ended after its commit and before recording the response — is a
 * 409: the request is never run a second time.
 */
async function storedResponse(keyTx: <T>(fn: (q: Queryable) => Promise<T>) => Promise<T>, keyArgs: unknown[], reqHash: string): Promise<{ status_code: number; response: unknown } | null> {
  const t0 = Date.now();
  for (;;) {
    const row = (await keyTx((q) => q.query<{ request_hash: string; status_code: number; response: unknown; age_ms: number }>('SELECT request_hash, status_code, response, (extract(epoch FROM now() - created_at) * 1000)::float8 AS age_ms FROM app.idempotency_key WHERE tenant_id = $1 AND person_id = $2 AND key = $3', keyArgs))).rows[0];
    if (!row) return null;
    if (row.request_hash !== reqHash) throw new ApiError('idempotency_mismatch', 'this Idempotency-Key was used with a different request');
    if (row.status_code > 0) return row;
    if (Date.now() - t0 >= IDEMPOTENCY_WAIT_MS || row.age_ms >= IDEMPOTENCY_WAIT_MS * 4) throw new ApiError('conflict', 'a request with this Idempotency-Key is still in progress, or ended without recording its response: it is not run twice — retry with the same key later, or check the record before using a new key');
    await sleep(20);
  }
}

class Bucket { tokens: number; at = Date.now(); constructor(public cap: number) { this.tokens = cap; } take(): boolean { const now = Date.now(); this.tokens = Math.min(this.cap, this.tokens + ((now - this.at) / 60000) * this.cap); this.at = now; if (this.tokens < 1) return false; this.tokens -= 1; return true; } }

export function createServer(cfg: Config, router: Router, pool: PgPool, tokens: TokenVerifier, telemetry: Telemetry): http.Server {
  const buckets = new Map<string, Bucket>();
  const oidc = cfg.oidc ? new OidcVerifier({ issuer: cfg.oidc.issuer, audience: cfg.oidc.audience, jwksUrl: cfg.oidc.jwksUrl }) : null;
  return http.createServer(async (req, res) => {
    const t0 = process.hrtime.bigint();
    const incoming = String(req.headers['x-correlation-id'] || '');
    const correlationId = /^[A-Za-z0-9._-]{8,80}$/.test(incoming) ? incoming : crypto.randomUUID();
    const origin = String(req.headers.origin || '');
    const cors: Record<string, string> = cfg.corsOrigins.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type, idempotency-key, x-correlation-id, x-file-name', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE', 'access-control-expose-headers': 'x-correlation-id' } : {};
    let status = 500; let ctxRole = '-'; let routePath = '(unmatched)'; let tenantId: string | undefined; const startedAt = Date.now();
    const send = (r: Res) => {
      status = r.status;
      const body = r.raw ?? (r.body === undefined ? undefined : Buffer.from(JSON.stringify(r.body)));
      res.writeHead(r.status, { ...HEADERS, ...PROXY_HEADERS, ...cors, 'x-correlation-id': correlationId, ...(r.raw ? {} : body ? { 'content-type': r.status >= 400 ? 'application/problem+json' : 'application/json; charset=utf-8' } : {}), ...(r.headers || {}) });
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
      const { route, params } = m; routePath = route.path;
      const ctx = new RequestContext(pool, correlationId);

      // authentication
      const remote = clientAddress(req.headers['x-forwarded-for'], req.socket.remoteAddress);
      req.headers['x-empathia-remote'] = remote;   // set by the server, never trusted from the client (overwritten here)
      let bucketKey = `ip:${remote}`;
      if (route.auth) {
        const h = String(req.headers.authorization || '');
        if (!h.startsWith('Bearer ')) throw new ApiError('unauthenticated', 'send Authorization: Bearer <token>');
        let p: Principal | null;
        if (cfg.authMode === 'oidc') {
          // production identity: the provider's token names a subject; the tenant and role for this request come from headers and are checked against memberships
          let claims: OidcClaims;
          try { claims = await oidc!.verify(h.slice(7)); } catch (e) { throw new ApiError('unauthenticated', (e as Error).message); }
          p = await resolveOidcPrincipal(pool, claims, String(req.headers['x-empathia-tenant'] || ''), String(req.headers['x-empathia-role'] || ''), cfg.oidc!.linkByEmail);
          if (!p) throw new ApiError('unauthenticated', 'no membership matches this identity (subject unknown, or the tenant/role headers name a membership the person does not hold)');
        } else {
          let claims;
          try { claims = tokens.verify(h.slice(7)); } catch (e) { throw new ApiError('unauthenticated', (e as Error).message); }
          p = await resolvePrincipal(pool, claims.sub, claims.tid, claims.role);
          if (!p) throw new ApiError('unauthenticated', 'the membership behind this token no longer exists or the person is disabled');
        }
        ctx.principal = p; ctxRole = p.role; tenantId = p.tenantId; bucketKey = `p:${p.personId}`;
      }
      const b = buckets.get(bucketKey) || buckets.set(bucketKey, new Bucket(cfg.rateLimitPerMinute)).get(bucketKey)!;
      if (!b.take()) throw new ApiError('rate_limited', 'slow down: the per-caller request budget is spent for this minute');

      // authority (central, before the body is read — red-team RT-03): a role without any of the route's authority keys is refused and audited
      if (route.auth) { const keys = enforcedAuthorities(route); if (keys.length) await ctx.require(keys, route.action ?? route.summary.split(' (')[0]!.slice(0, 80)); }

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

      // idempotency (POST) — D-35: the key is reserved in the handler's own transaction (RequestContext.tx), so exactly one request with a
      // given key runs its handler; a concurrent duplicate waits for the stored response and replays it, or is refused 409 while the key is
      // in use. A failed or refused request releases the key (nothing was stored before either), so the client can retry with it.
      const idem = String(req.headers['idempotency-key'] || '');
      if (route.idempotent && idem && ctx.principal) {
        if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idem)) throw new ApiError('validation', 'Idempotency-Key is 8–128 characters of letters, digits and ._:-');
        const reqHash = crypto.createHash('sha256').update(`${req.method} ${url.pathname}\n`).update(raw || Buffer.alloc(0)).digest('hex');
        const who = { tenantId: ctx.p.tenantId, userId: ctx.p.personId }; const keyArgs = [ctx.p.tenantId, ctx.p.personId, idem];
        const keyTx = <T>(fn: (q: Queryable) => Promise<T>) => pool.tx(who, fn);   // never a reservation of its own
        for (let attempt = 0; ; attempt += 1) {
          const prev = await storedResponse(keyTx, keyArgs, reqHash);
          if (prev) { send({ status: prev.status_code, body: prev.response, headers: { 'idempotent-replay': 'true' } }); return; }
          ctx.idempotency = { key: idem, requestHash: reqHash, reserved: false, pending: false };
          let out: Res;
          try { out = await route.handler(ctx, { params, query: url.searchParams, body, raw, headers: req.headers }); }
          catch (e) {
            const reserved = ctx.idempotency.reserved; ctx.idempotency = null;
            if (e instanceof IdempotencyKeyTaken && attempt < 3) continue;   // a concurrent request with the key committed first: replay its response
            if (reserved) await keyTx((q) => q.query('DELETE FROM app.idempotency_key WHERE tenant_id = $1 AND person_id = $2 AND key = $3 AND status_code = 0', keyArgs));
            throw e;
          }
          const reserved = ctx.idempotency.reserved; ctx.idempotency = null;
          if (out.status < 300) {
            if (reserved) await keyTx((q) => q.query('UPDATE app.idempotency_key SET status_code = $4, response = $5 WHERE tenant_id = $1 AND person_id = $2 AND key = $3 AND status_code = 0', [...keyArgs, out.status, asJson(out.body ?? null)]));
            else await keyTx((q) => q.query('INSERT INTO app.idempotency_key (tenant_id, person_id, key, request_hash, status_code, response) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [...keyArgs, reqHash, out.status, asJson(out.body ?? null)]));   // a handler that opened no transaction
          } else if (reserved) await keyTx((q) => q.query('DELETE FROM app.idempotency_key WHERE tenant_id = $1 AND person_id = $2 AND key = $3 AND status_code = 0', keyArgs));
          send(out); return;
        }
      }
      send(await route.handler(ctx, { params, query: url.searchParams, body, raw, headers: req.headers }));
    } catch (e) {
      // 23505 unique / 23P01 exclusion: the database refused a second record of something there is one of (an open installation per
      // position or per unit, overlapping installation periods, a serial) → 409; EM009 is the installation/asset guard (ADR-0012) and EM011 the deficiency workflow guard (0032) → 422
      const err = e instanceof ApiError ? e : (e as { code?: string }).code === '23505' ? new ApiError('conflict', 'that record already exists') : (e as { code?: string }).code === '23P01' ? new ApiError('conflict', `a database constraint refused an overlapping record: ${(e as { constraint?: string }).constraint || (e as Error).message}`) : /^EM0(0[1-49]|11)$/.test(String((e as { code?: string }).code)) ? new ApiError('rule_refused', (e as Error).message) : (e as { code?: string }).code === '23514' ? new ApiError('rule_refused', `a database constraint refused the change: ${(e as { constraint?: string }).constraint || (e as Error).message}`) : new ApiError('internal', 'internal error (see the server log for this correlation id)');
      if (err.code === 'internal') {
        log('error', 'request failed', { correlationId, error: (e as Error).message, stack: (e as Error).stack?.split('\n').slice(0, 4).join(' | ') });
        // the same correlation id is in the problem document, the log line and the telemetry event; nothing from the request body goes with it
        void telemetry.captureException(e, { correlationId, route: routePath, method: req.method || 'GET', status: 500, role: ctxRole, tenantId });
      }
      send({ status: err.status, body: err.problem(correlationId) });
    } finally {
      log('info', 'request', { correlationId, method: req.method, path: (req.url || '').split('?')[0], status, role: ctxRole, ms: Number(process.hrtime.bigint() - t0) / 1e6 });
      void telemetry.transaction({ route: routePath, method: req.method || 'GET', status, startedAt, endedAt: Date.now(), correlationId, role: ctxRole, tenantId });
    }
  });
}
