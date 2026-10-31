/** Runtime configuration from the environment. Secrets never have production defaults; dev defaults are refused when NODE_ENV=production. */
import fs from 'node:fs';
import { runtimeUrls } from './db/pg.js';
import path from 'node:path';
import crypto from 'node:crypto';

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  databaseUrl: string;          // runtime role (empathia_app): RLS applies
  ownerDatabaseUrl: string;     // schema owner: migrations and seed only
  workerDatabaseUrl: string;    // outbox worker role (empathia_worker): the only role the cross-tenant worker policies admit
  authMode: 'dev' | 'oidc';
  jwtSecret: Buffer;
  jwtIssuer: string;
  jwtAudience: string;
  tokenTtlSeconds: number;
  objectStoreDir: string;
  corsOrigins: string[];
  workerIntervalMs: number;
  dbStatementTimeoutMs: number; workerStatementTimeoutMs: number;
  maxBodyBytes: number;
  rateLimitPerMinute: number;
  /** OIDC (AUTH_MODE=oidc): the provider's issuer, the audience this API accepts, the JWKS URL, and whether a verified email may bind a first sign-in to an existing person */
  oidc: { issuer: string; audience: string; jwksUrl: string; linkByEmail: boolean } | null;
  /** Telemetry (packages/observability): TELEMETRY=none|file|sentry (sentry is implied by SENTRY_DSN), the DSN, the NDJSON file for TELEMETRY=file, the request sampling rate */
  telemetry: { mode: 'none' | 'file' | 'sentry'; dsn: string | null; file: string | null; tracesSampleRate: number };
  /** The release this process reports under: service name, package version, the commit it was built from (dist/build-info.json, RELEASE_SHA, or unknown) */
  release: { name: string; version: string; sha: string; environment: string };
}

/** Reads .local/pg/env (written by scripts/db.mjs) when the variables are not already set. */
function localEnv(repo: string): Record<string, string> {
  const f = path.join(repo, '.local/pg/env');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

export function loadConfig(repo: string, over: Partial<Record<string, string>> = {}): Config {
  const e = { ...localEnv(repo), ...process.env, ...over } as Record<string, string | undefined>;
  const env = (e['NODE_ENV'] === 'production' ? 'production' : e['NODE_ENV'] === 'test' ? 'test' : 'development') as Config['env'];
  const authMode = (e['AUTH_MODE'] || 'dev') as Config['authMode'];
  if (env === 'production' && authMode === 'dev') throw new Error('AUTH_MODE=dev is refused in production: configure OIDC');
  if (authMode !== 'dev' && authMode !== 'oidc') throw new Error(`AUTH_MODE must be dev or oidc (got ${authMode})`);
  let oidc: Config['oidc'] = null;
  if (authMode === 'oidc') {
    for (const k of ['OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_JWKS_URL']) if (!e[k]) throw new Error(`${k} is required when AUTH_MODE=oidc`);
    if (env === 'production' && !/^https:\/\//.test(e['OIDC_JWKS_URL']!)) throw new Error('OIDC_JWKS_URL must be https in production');
    oidc = { issuer: e['OIDC_ISSUER']!, audience: e['OIDC_AUDIENCE']!, jwksUrl: e['OIDC_JWKS_URL']!, linkByEmail: e['OIDC_LINK_BY_EMAIL'] === 'on' };
  }
  let secret = e['JWT_SECRET'];
  if (!secret) {
    if (env === 'production') throw new Error('JWT_SECRET is required in production');
    const f = path.join(repo, '.local/jwt-secret');
    if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, crypto.randomBytes(48).toString('base64url'), { mode: 0o600 }); }
    secret = fs.readFileSync(f, 'utf8').trim();
  }
  if (Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  const tmode = (e['TELEMETRY'] || (e['SENTRY_DSN'] ? 'sentry' : 'none')) as Config['telemetry']['mode'];
  if (!['none', 'file', 'sentry'].includes(tmode)) throw new Error(`TELEMETRY must be none, file or sentry (got ${tmode})`);
  if (tmode === 'sentry' && !e['SENTRY_DSN']) throw new Error('TELEMETRY=sentry requires SENTRY_DSN');
  if (tmode === 'sentry' && env === 'production' && !/^https:\/\//.test(e['SENTRY_DSN']!)) throw new Error('SENTRY_DSN must be https in production');
  if (tmode === 'file' && !e['TELEMETRY_FILE']) throw new Error('TELEMETRY=file requires TELEMETRY_FILE');
  const tRate = e['TELEMETRY_TRACES_SAMPLE_RATE'] != null ? Number(e['TELEMETRY_TRACES_SAMPLE_RATE']) : 0.1;
  if (!(tRate >= 0 && tRate <= 1)) throw new Error('TELEMETRY_TRACES_SAMPLE_RATE must be between 0 and 1');
  const need = (k: string) => { const v = e[k]; if (!v) throw new Error(`${k} is required (run: node scripts/db.mjs up)`); return v; };
  return {
    env, authMode,
    port: Number(e['PORT'] || 4100), host: e['HOST'] || '127.0.0.1',
    databaseUrl: runtimeUrls(e).app || need('APP_DATABASE_URL'), ownerDatabaseUrl: need('DATABASE_URL'), workerDatabaseUrl: runtimeUrls(e).worker || need('WORKER_DATABASE_URL'),
    jwtSecret: Buffer.from(secret), jwtIssuer: e['JWT_ISSUER'] || 'empathia-dev-idp', jwtAudience: e['JWT_AUDIENCE'] || 'empathia-enterprise-api',
    tokenTtlSeconds: Number(e['TOKEN_TTL_SECONDS'] || 900),
    objectStoreDir: e['OBJECT_STORE_DIR'] || path.join(repo, '.local/objects'),
    corsOrigins: (e['CORS_ORIGINS'] || 'http://127.0.0.1:4310,http://localhost:4310,http://127.0.0.1:4200,http://localhost:4200').split(',').map((s) => s.trim()).filter(Boolean),
    workerIntervalMs: Number(e['WORKER_INTERVAL_MS'] || 500),
    dbStatementTimeoutMs: Number(e['DB_STATEMENT_TIMEOUT_MS'] || 15000), workerStatementTimeoutMs: Number(e['WORKER_STATEMENT_TIMEOUT_MS'] || 60000),
    maxBodyBytes: Number(e['MAX_BODY_BYTES'] || 25 * 1024 * 1024),
    rateLimitPerMinute: Number(e['RATE_LIMIT_PER_MINUTE'] || 600),
    oidc,
    telemetry: { mode: tmode, dsn: e['SENTRY_DSN'] || null, file: e['TELEMETRY_FILE'] || null, tracesSampleRate: tRate },
    release: { name: 'empathia-enterprise-api', version: '0.1.0', sha: e['RELEASE_SHA'] || e['RENDER_GIT_COMMIT'] || buildInfo(repo).sha, environment: e['RELEASE_ENVIRONMENT'] || env },
  };
}

/** services/enterprise-api/dist/build-info.json, written by scripts/build.mjs from the commit the artifact was built at. */
function buildInfo(repo: string): { sha: string } {
  try { return JSON.parse(fs.readFileSync(path.join(repo, 'services/enterprise-api/dist/build-info.json'), 'utf8')) as { sha: string }; } catch { return { sha: 'unknown' }; }
}
