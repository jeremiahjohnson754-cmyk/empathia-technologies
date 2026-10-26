/** Runtime configuration from the environment. Secrets never have production defaults; dev defaults are refused when NODE_ENV=production. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  host: string;
  databaseUrl: string;          // runtime role (empathia_app): RLS applies
  ownerDatabaseUrl: string;     // schema owner: migrations and seed only
  authMode: 'dev' | 'oidc';
  jwtSecret: Buffer;
  jwtIssuer: string;
  jwtAudience: string;
  tokenTtlSeconds: number;
  objectStoreDir: string;
  corsOrigins: string[];
  workerIntervalMs: number;
  maxBodyBytes: number;
  rateLimitPerMinute: number;
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
  let secret = e['JWT_SECRET'];
  if (!secret) {
    if (env === 'production') throw new Error('JWT_SECRET is required in production');
    const f = path.join(repo, '.local/jwt-secret');
    if (!fs.existsSync(f)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, crypto.randomBytes(48).toString('base64url'), { mode: 0o600 }); }
    secret = fs.readFileSync(f, 'utf8').trim();
  }
  if (Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  const need = (k: string) => { const v = e[k]; if (!v) throw new Error(`${k} is required (run: node scripts/db.mjs up)`); return v; };
  return {
    env, authMode,
    port: Number(e['PORT'] || 4100), host: e['HOST'] || '127.0.0.1',
    databaseUrl: need('APP_DATABASE_URL'), ownerDatabaseUrl: need('DATABASE_URL'),
    jwtSecret: Buffer.from(secret), jwtIssuer: e['JWT_ISSUER'] || 'empathia-dev-idp', jwtAudience: e['JWT_AUDIENCE'] || 'empathia-enterprise-api',
    tokenTtlSeconds: Number(e['TOKEN_TTL_SECONDS'] || 900),
    objectStoreDir: e['OBJECT_STORE_DIR'] || path.join(repo, '.local/objects'),
    corsOrigins: (e['CORS_ORIGINS'] || 'http://127.0.0.1:4310,http://localhost:4310,http://127.0.0.1:4200,http://localhost:4200').split(',').map((s) => s.trim()).filter(Boolean),
    workerIntervalMs: Number(e['WORKER_INTERVAL_MS'] || 500),
    maxBodyBytes: Number(e['MAX_BODY_BYTES'] || 25 * 1024 * 1024),
    rateLimitPerMinute: Number(e['RATE_LIMIT_PER_MINUTE'] || 600),
  };
}
