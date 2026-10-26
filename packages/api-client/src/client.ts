/**
 * The typed Empathia API client. One method, `call`, typed by operation id from the generated contract:
 *   const api = new EmpathiaClient({ baseUrl: 'http://127.0.0.1:4100' });
 *   await api.signIn({ email, password, tenant, role });
 *   const room = await api.call('getV1RoomsRoom', { params: { room: 'R-PLN-0001' } });
 * Errors arrive as ApiProblem (RFC 9457 problem details) with the server's correlation id. The client holds the access token in memory
 * only; it never decides authority — the server does, on every request.
 */
import { OPERATIONS, type Operations } from './generated.js';
export type { Operations } from './generated.js';
export * from './types.js';

export class ApiProblem extends Error {
  constructor(public status: number, public code: string, public detail: string, public reasons: string[] = [], public correlationId: string | null = null) { super(`${status} ${code}: ${detail}`); this.name = 'ApiProblem'; }
}

type Args<K extends keyof Operations> =
  (keyof Operations[K]['params'] extends never ? { params?: undefined } : { params: Operations[K]['params'] })
  & { query?: Operations[K]['query'] }
  & (Operations[K]['body'] extends undefined ? { body?: undefined } : { body: Operations[K]['body'] })
  & { idempotencyKey?: string; contentType?: string; fileName?: string; signal?: AbortSignal };

export interface ClientOptions { baseUrl: string; fetch?: typeof fetch; token?: string | null; onUnauthenticated?: () => void }

export class EmpathiaClient {
  token: string | null;
  private f: typeof fetch;
  constructor(private o: ClientOptions) { this.token = o.token ?? null; this.f = o.fetch ?? fetch.bind(globalThis); }

  async signIn(b: { email: string; password: string; tenant?: string; role?: string }) {
    const t = await this.call('postV1AuthToken', { body: b });
    this.token = (t as { accessToken: string }).accessToken;
    return t;
  }
  signOut() { this.token = null; }

  async call<K extends keyof Operations>(op: K, args: Args<K> = {} as Args<K>): Promise<Operations[K]['response']> {
    const meta = OPERATIONS[op];
    const params = (args.params || {}) as Record<string, string>;
    let p: string = meta.path.replace(/\{(\w+)\}/g, (_m, k: string) => { const v = params[k]; if (v == null) throw new Error(`${String(op)}: missing path parameter ${k}`); return encodeURIComponent(v); });
    const qs = new URLSearchParams(Object.entries((args.query || {}) as Record<string, unknown>).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
    if ([...qs.keys()].length) p += `?${qs}`;
    const headers: Record<string, string> = {};
    if (meta.auth) { if (!this.token) throw new ApiProblem(401, 'unauthenticated', 'sign in first'); headers['authorization'] = `Bearer ${this.token}`; }
    if (args.idempotencyKey) headers['idempotency-key'] = args.idempotencyKey;
    let body: BodyInit | undefined;
    const b = args.body as unknown;
    if (b instanceof Uint8Array || b instanceof ArrayBuffer || (typeof Blob !== 'undefined' && b instanceof Blob)) { body = b as BodyInit; headers['content-type'] = args.contentType || 'application/octet-stream'; if (args.fileName) headers['x-file-name'] = args.fileName; }
    else if (b !== undefined) { body = JSON.stringify(b); headers['content-type'] = 'application/json'; }
    const r = await this.f(this.o.baseUrl.replace(/\/$/, '') + p, { method: meta.method, headers, body, signal: args.signal });
    const text = await r.text();
    const json = text && /json/.test(r.headers.get('content-type') || '') ? JSON.parse(text) : text;
    if (!r.ok) {
      if (r.status === 401) this.o.onUnauthenticated?.();
      const pb = (json && typeof json === 'object' ? json : {}) as { code?: string; detail?: string; reasons?: string[]; correlationId?: string };
      throw new ApiProblem(r.status, pb.code || 'error', pb.detail || String(text).slice(0, 200), pb.reasons || [], pb.correlationId || r.headers.get('x-correlation-id'));
    }
    return json as Operations[K]['response'];
  }
}
