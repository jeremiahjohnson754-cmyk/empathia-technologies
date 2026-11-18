/**
 * The demonstration's connection to the enterprise API (ADR-0013; founder, 17 Nov 2026: "Connect the actual interactive demo to the
 * server-backed workflows, using safe synthetic tenants, authenticated demo sessions, scoped permissions, and a resettable
 * demonstration dataset").
 *
 * A visitor opens a sandbox: a synthetic tenant of their own on the server. Its id and key are kept in this browser (the key is the
 * credential; the server stores only its hash). A session as one of the sandbox's people is asked for with the key and lasts minutes;
 * session tokens are kept in memory only. Every record made through this client is the server's, not this browser's: the same sandbox
 * opened in another browser with its resume code shows the same records.
 *
 * Nothing here is built unless the demo was built with DEMO_API_URL: a build without it names no server and offers no connection.
 */
export const API_URL = String(process.env.DEMO_API_URL || '').replace(/\/$/, '');
export const STORE_KEY = 'empathia.demo.sandbox.v1';

export interface Sandbox { id: string; key: string; tenant: string; expiresAt: string; room: string }
export interface Persona { role: string; name: string }
export interface Answer<T = unknown> { status: number; ok: boolean; body: T; detail: string; reasons: string[] }
export interface Availability { configured: boolean; reachable: boolean; enabled: boolean; reason?: string; live?: number; maxLive?: number; ttlHours?: number; notice?: string }
export interface Deps { base: string; fetch: (url: string, init?: RequestInit) => Promise<Response>; storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null; now?: () => number }

/** The sandbox is closed, expired or its key no longer opens it: the page offers a new one. */
export class SandboxGone extends Error { constructor(detail: string) { super(detail); this.name = 'SandboxGone'; } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; const KEY = /^[A-Za-z0-9_-]{43}$/;
/** A resume code is the sandbox id and its key, joined by a dot. Anything else is not one. */
export function parseCode(code: string): { id: string; key: string } | null {
  const m = /^\s*([0-9a-fA-F-]{36})\.([A-Za-z0-9_-]{43})\s*$/.exec(code || '');
  return m && UUID.test(m[1]!) && KEY.test(m[2]!) ? { id: m[1]!.toLowerCase(), key: m[2]! } : null;
}
const asAnswer = async <T,>(r: Response): Promise<Answer<T>> => {
  const text = await r.text(); let body: unknown = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  const p = (body && typeof body === 'object' ? body : {}) as { detail?: string; reasons?: string[] };
  return { status: r.status, ok: r.status >= 200 && r.status < 300, body: body as T, detail: r.status >= 400 ? String(p.detail || `the server answered ${r.status}`) : '', reasons: Array.isArray(p.reasons) ? p.reasons : [] };
};

export class Connected {
  private tokens = new Map<string, { token: string; until: number }>();
  constructor(private d: Deps) {}
  private now(): number { return (this.d.now || Date.now)(); }
  get configured(): boolean { return !!this.d.base; }
  get origin(): string { try { return new URL(this.d.base).host; } catch { return ''; } }

  /** The sandbox this browser holds, if what is stored is one. */
  sandbox(): Sandbox | null {
    try {
      const s = this.d.storage?.getItem(STORE_KEY); if (!s) return null;
      const x = JSON.parse(s) as Sandbox;
      return x && UUID.test(x.id) && KEY.test(x.key) && typeof x.tenant === 'string' && typeof x.room === 'string' && typeof x.expiresAt === 'string' ? x : null;
    } catch { return null; }
  }
  private keep(sb: Sandbox | null): void {
    this.tokens.clear();
    try { if (sb) this.d.storage?.setItem(STORE_KEY, JSON.stringify(sb)); else this.d.storage?.removeItem(STORE_KEY); } catch { /* the sandbox still works for this visit; it will not be here after a reload */ }
  }
  /** Forget the sandbox in this browser. It stays on the server until it expires; the resume code would still open it. */
  forget(): void { this.keep(null); }
  code(): string { const s = this.sandbox(); return s ? `${s.id}.${s.key}` : ''; }

  private async send<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}, raw?: string | ArrayBuffer): Promise<Answer<T>> {
    const r = await this.d.fetch(this.d.base + path, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}), credentials: 'omit', cache: 'no-store' });
    return asAnswer<T>(r);
  }

  /** Whether a connection is on offer: this build names a server, the server answers, and sandboxes are enabled there. */
  async availability(): Promise<Availability> {
    if (!this.configured) return { configured: false, reachable: false, enabled: false, reason: 'this build of the demonstration is not connected to a server' };
    try {
      const a = await this.send<{ enabled: boolean; reason?: string; live?: number; maxLive?: number; ttlHours?: number; notice?: string }>('GET', '/v1/demo');
      if (!a.ok) return { configured: true, reachable: true, enabled: false, reason: a.detail };
      return { configured: true, reachable: true, ...a.body };
    } catch { return { configured: true, reachable: false, enabled: false, reason: 'the server did not answer' }; }
  }

  private take(b: { sandbox: { id: string; key: string; tenant: string; expiresAt: string }; scenario: { room: string }; session: { accessToken: string; expiresIn: number; role: string } }): Sandbox {
    const sb: Sandbox = { id: b.sandbox.id, key: b.sandbox.key, tenant: b.sandbox.tenant, expiresAt: b.sandbox.expiresAt, room: b.scenario.room };
    this.keep(sb); this.tokens.set(b.session.role, { token: b.session.accessToken, until: this.now() + (b.session.expiresIn - 30) * 1000 });
    return sb;
  }
  /** Open a sandbox of your own. */
  async open(): Promise<Answer<Sandbox | null>> {
    const a = await this.send<never>('POST', '/v1/demo/sandboxes', {});
    return a.ok ? { ...a, body: this.take(a.body) } : { ...a, body: null };
  }
  /** Close this sandbox and open a new one (one step on the server; nothing is deleted, the old one becomes unreachable). */
  async reset(): Promise<Answer<Sandbox | null>> {
    const s = this.sandbox(); if (!s) return this.open();
    const a = await this.send<never>('POST', '/v1/demo/sandboxes/reset', { sandboxId: s.id, key: s.key });
    if (a.status === 401) { this.forget(); throw new SandboxGone(a.detail); }
    return a.ok ? { ...a, body: this.take(a.body) } : { ...a, body: null };
  }
  /** Take up a sandbox from its resume code (another browser, another day). */
  async resume(code: string): Promise<Answer<Sandbox | null>> {
    const c = parseCode(code);
    if (!c) return { status: 0, ok: false, body: null, detail: 'that is not a resume code: it is the sandbox id, a dot, and its key, as shown where the sandbox was opened', reasons: [] };
    const s = await this.send<{ accessToken: string; expiresIn: number; role: string; sandbox: { id: string; tenant: string; expiresAt: string } }>('POST', '/v1/demo/sessions', { sandboxId: c.id, key: c.key, role: 'installer' });
    if (!s.ok) return { ...s, body: null };
    const cur = await this.send<{ rooms: Array<{ code: string }> }>('GET', '/v1/demo/sandbox', undefined, { authorization: `Bearer ${s.body.accessToken}` });
    if (!cur.ok || !cur.body.rooms[0]) return { ...cur, ok: false, body: null, detail: cur.detail || 'the sandbox has no room' };
    const sb: Sandbox = { id: c.id, key: c.key, tenant: s.body.sandbox.tenant, expiresAt: s.body.sandbox.expiresAt, room: cur.body.rooms[0].code };
    this.keep(sb); this.tokens.set('installer', { token: s.body.accessToken, until: this.now() + (s.body.expiresIn - 30) * 1000 });
    return { ...s, body: sb };
  }

  /** A session as one person of the sandbox: asked for with the key, kept in memory, renewed shortly before it runs out. */
  private async token(who: string): Promise<string> {
    const have = this.tokens.get(who); if (have && have.until > this.now()) return have.token;
    // "service2" is the second person of the service role (a role key has no digit): the server is asked for that seat
    const m = /^([a-z_]+?)([2-9])$/.exec(who); const role = m ? m[1]! : who; const seat = m ? Number(m[2]) : undefined;
    const s = this.sandbox(); if (!s) throw new SandboxGone('there is no sandbox in this browser');
    const a = await this.send<{ accessToken: string; expiresIn: number }>('POST', '/v1/demo/sessions', { sandboxId: s.id, key: s.key, role, ...(seat ? { seat } : {}) });
    if (a.status === 401) { this.forget(); throw new SandboxGone(a.detail); }
    if (!a.ok) throw new Error(a.detail);
    this.tokens.set(who, { token: a.body.accessToken, until: this.now() + (a.body.expiresIn - 30) * 1000 });
    return a.body.accessToken;
  }
  /** Call the API as one person of the sandbox. A refusal is returned, with the server's own words, never thrown. */
  async call<T = unknown>(role: string, method: string, path: string, body?: unknown, note?: { text?: string; data?: ArrayBuffer; mediaType?: string; fileName: string }): Promise<Answer<T>> {
    const go = async () => this.send<T>(method, path, note ? undefined : body, { authorization: `Bearer ${await this.token(role)}`, ...(note ? { 'content-type': note.mediaType || 'text/plain', 'x-file-name': note.fileName } : {}) }, note ? note.data ?? note.text ?? '' : undefined);
    let a = await go();
    if (a.status === 401) { this.tokens.delete(role); a = await go(); if (a.status === 401) { this.forget(); throw new SandboxGone(a.detail); } }
    return a;
  }
}

/** The client of this page: the build's server, the browser's fetch and storage. */
export function connected(): Connected {
  let storage: Storage | null = null; try { storage = window.localStorage; } catch { storage = null; }
  return new Connected({ base: API_URL, fetch: (u, i) => fetch(u, i), storage });
}
