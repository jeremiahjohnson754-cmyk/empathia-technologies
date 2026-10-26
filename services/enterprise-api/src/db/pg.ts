/**
 * A small PostgreSQL client speaking the v3 wire protocol: SCRAM-SHA-256 / MD5 / cleartext authentication, optional TLS,
 * parameterized queries over the extended protocol (no string interpolation of values, ever), simple multi-statement queries for
 * migrations, typed result parsing, a connection pool and a transaction helper that sets the tenant for row-level security.
 *
 * Why vendored: the founder's build environment has no package-registry access, so `pg` (node-postgres) could not be installed.
 * The interface (query(text, params) → { rows, rowCount }) matches node-postgres, so replacing this file with `pg` is a small,
 * mechanical change (docs/architecture/DEPENDENCY_SWAPS.md). Node 22 standard library only.
 */
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

export interface PgConfig {
  host: string; port: number; user: string; password?: string; database: string;
  ssl?: false | { rejectUnauthorized?: boolean; ca?: string };
  applicationName?: string;
}

export class PgError extends Error {
  code: string; detail?: string; constraint?: string; table?: string; column?: string; severity?: string;
  constructor(fields: Record<string, string>) {
    super(fields['M'] || 'PostgreSQL error');
    this.name = 'PgError'; this.code = fields['C'] || 'XX000'; this.severity = fields['S'];
    if (fields['D']) this.detail = fields['D']; if (fields['n']) this.constraint = fields['n']; if (fields['t']) this.table = fields['t']; if (fields['c']) this.column = fields['c'];
  }
}

export interface QueryResult<R = Record<string, unknown>> { rows: R[]; rowCount: number; command: string }

// ------------------------------------------------------------------------------------------------ type parsing (text format)
function parseArray(s: string, item: (x: string) => unknown): unknown[] {
  if (s === '{}') return [];
  const out: unknown[] = []; let i = 1; let cur = ''; let quoted = false; let wasQuoted = false;
  while (i < s.length) {
    const c = s[i]!;
    if (quoted) { if (c === '\\') { cur += s[i + 1]; i += 2; continue; } if (c === '"') { quoted = false; i += 1; continue; } cur += c; i += 1; continue; }
    if (c === '"') { quoted = true; wasQuoted = true; i += 1; continue; }
    if (c === ',' || c === '}') { out.push(!wasQuoted && cur === 'NULL' ? null : item(cur)); cur = ''; wasQuoted = false; i += 1; continue; }
    cur += c; i += 1;
  }
  return out;
}
const PARSERS: Record<number, (s: string) => unknown> = {
  16: (s) => s === 't', 20: (s) => { const n = Number(s); return Number.isSafeInteger(n) ? n : s; }, 21: Number, 23: Number, 26: Number,
  700: Number, 701: Number, 114: (s) => JSON.parse(s), 3802: (s) => JSON.parse(s),
  1000: (s) => parseArray(s, (x) => x === 't'), 1007: (s) => parseArray(s, Number), 1016: (s) => parseArray(s, Number),
  1009: (s) => parseArray(s, (x) => x), 1015: (s) => parseArray(s, (x) => x), 2951: (s) => parseArray(s, (x) => x),
  1184: (s) => new Date(s.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString(), 1114: (s) => s,
};

/** Marks a value for a json/jsonb parameter (needed for arrays: a plain JS array of primitives is sent as a PostgreSQL array). */
export class JsonParam { constructor(readonly value: unknown) {} }
export const asJson = (v: unknown) => new JsonParam(v);

/** Serialize a JS value for a text-format parameter. Arrays of primitives become PostgreSQL array literals; objects become JSON. */
export function toParam(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof JsonParam) return JSON.stringify(v.value);
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return `\\x${v.toString('hex')}`;
  if (Array.isArray(v) && v.every((x) => x === null || ['string', 'number', 'boolean'].includes(typeof x))) {
    return `{${v.map((x) => (x === null ? 'NULL' : `"${String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)).join(',')}}`;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 't' : 'f';
  return String(v);
}

// ------------------------------------------------------------------------------------------------ one connection
export class PgConnection {
  private sock!: net.Socket | tls.TLSSocket;
  private buf = Buffer.alloc(0);
  private waiters: Array<(m: { type: string; body: Buffer }) => void> = [];
  private inbox: Array<{ type: string; body: Buffer }> = [];
  private chain: Promise<unknown> = Promise.resolve();
  private closed = false;
  params: Record<string, string> = {};
  constructor(private cfg: PgConfig) {}

  private onData = (d: Buffer) => {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 5) {
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < len + 1) break;
      const msg = { type: String.fromCharCode(this.buf[0]!), body: this.buf.subarray(5, len + 1) };
      this.buf = this.buf.subarray(len + 1);
      if (msg.type === 'N' || msg.type === 'A') continue;                    // notices and notifications are not surfaced
      if (msg.type === 'S') { const [k, v] = msg.body.toString('utf8').split('\0'); this.params[k!] = v!; continue; }
      const w = this.waiters.shift(); if (w) w(msg); else this.inbox.push(msg);
    }
  };
  private next(): Promise<{ type: string; body: Buffer }> {
    const m = this.inbox.shift(); if (m) return Promise.resolve(m);
    if (this.closed) return Promise.reject(new Error('connection closed'));
    return new Promise((r) => this.waiters.push(r));
  }
  private static frame(type: string, body: Buffer): Buffer { const h = Buffer.alloc(5); h.write(type, 0); h.writeInt32BE(body.length + 4, 1); return Buffer.concat([h, body]); }
  private write(type: string, body: Buffer) { this.sock.write(PgConnection.frame(type, body)); }
  /** Several protocol messages in one socket write (Parse/Bind/Describe/Execute/Sync go out as one packet). */
  private writeAll(msgs: Array<[string, Buffer]>) { this.sock.write(Buffer.concat(msgs.map(([t, b]) => PgConnection.frame(t, b)))); }
  private static cstr = (s: string) => Buffer.from(`${s}\0`, 'utf8');
  private static i32 = (n: number) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; };
  private static i16 = (n: number) => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; };
  private static fields(body: Buffer): Record<string, string> { const f: Record<string, string> = {}; let i = 0; while (i < body.length && body[i] !== 0) { const k = String.fromCharCode(body[i]!); const end = body.indexOf(0, i + 1); f[k] = body.toString('utf8', i + 1, end); i = end + 1; } return f; }

  async connect(): Promise<void> {
    const raw = net.connect({ host: this.cfg.host, port: this.cfg.port });
    await new Promise<void>((ok, bad) => { raw.once('connect', ok); raw.once('error', bad); });
    raw.setNoDelay(true);                                                             // no Nagle delay on small protocol messages
    let sock: net.Socket | tls.TLSSocket = raw;
    if (this.cfg.ssl) {
      raw.write(Buffer.concat([PgConnection.i32(8), PgConnection.i32(80877103)]));
      const answer = await new Promise<string>((ok) => raw.once('data', (d) => ok(d.toString('utf8', 0, 1))));
      if (answer !== 'S') throw new Error('the server refused TLS');
      sock = tls.connect({ socket: raw, servername: this.cfg.host, rejectUnauthorized: this.cfg.ssl.rejectUnauthorized !== false, ...(this.cfg.ssl.ca ? { ca: this.cfg.ssl.ca } : {}) });
      await new Promise<void>((ok, bad) => { (sock as tls.TLSSocket).once('secureConnect', ok); sock.once('error', bad); });
    }
    this.sock = sock;
    sock.on('data', this.onData);
    sock.on('close', () => { this.closed = true; for (const w of this.waiters.splice(0)) w({ type: 'E', body: Buffer.from('SFATAL\0C08006\0Mconnection closed\0\0') }); });
    sock.on('error', () => { /* surfaced through 'close' */ });
    const kv = [['user', this.cfg.user], ['database', this.cfg.database], ['application_name', this.cfg.applicationName || 'empathia-enterprise-api'], ['client_encoding', 'UTF8'], ['TimeZone', 'UTC']];
    const body = Buffer.concat([PgConnection.i32(196608), ...kv.flatMap(([k, v]) => [PgConnection.cstr(k!), PgConnection.cstr(v!)]), Buffer.from([0])]);
    sock.write(Buffer.concat([PgConnection.i32(body.length + 4), body]));
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    let scram: { nonce: string; firstBare: string; serverSig?: Buffer } | null = null;
    for (;;) {
      const m = await this.next();
      if (m.type === 'E') throw new PgError(PgConnection.fields(m.body));
      if (m.type === 'R') {
        const code = m.body.readInt32BE(0);
        if (code === 0) continue;                                                     // AuthenticationOk
        const pw = this.cfg.password ?? '';
        if (code === 3) { this.write('p', PgConnection.cstr(pw)); continue; }         // cleartext (only over TLS in production)
        if (code === 5) {                                                             // MD5
          const salt = m.body.subarray(4, 8);
          const inner = crypto.createHash('md5').update(pw + this.cfg.user).digest('hex');
          this.write('p', PgConnection.cstr(`md5${crypto.createHash('md5').update(Buffer.concat([Buffer.from(inner), salt])).digest('hex')}`)); continue;
        }
        if (code === 10) {                                                            // SASL: SCRAM-SHA-256
          const mechs = m.body.subarray(4).toString('utf8').split('\0');
          if (!mechs.includes('SCRAM-SHA-256')) throw new Error(`no supported SASL mechanism (${mechs.join(',')})`);
          const nonce = crypto.randomBytes(18).toString('base64');
          const firstBare = `n=,r=${nonce}`; const first = Buffer.from(`n,,${firstBare}`);
          this.write('p', Buffer.concat([PgConnection.cstr('SCRAM-SHA-256'), PgConnection.i32(first.length), first]));
          scram = { nonce, firstBare }; continue;
        }
        if (code === 11 && scram) {
          const serverFirst = m.body.subarray(4).toString('utf8');
          const a = Object.fromEntries(serverFirst.split(',').map((x) => [x[0], x.slice(2)]));
          if (!a['r']?.startsWith(scram.nonce)) throw new Error('SCRAM: server nonce mismatch');
          const salted = crypto.pbkdf2Sync(pw.normalize('NFKC'), Buffer.from(a['s']!, 'base64'), Number(a['i']), 32, 'sha256');
          const clientKey = crypto.createHmac('sha256', salted).update('Client Key').digest();
          const storedKey = crypto.createHash('sha256').update(clientKey).digest();
          const finalNoProof = `c=biws,r=${a['r']}`;
          const authMessage = `${scram.firstBare},${serverFirst},${finalNoProof}`;
          const sig = crypto.createHmac('sha256', storedKey).update(authMessage).digest();
          const proof = Buffer.from(clientKey.map((b, i) => b ^ sig[i]!));
          const serverKey = crypto.createHmac('sha256', salted).update('Server Key').digest();
          scram.serverSig = crypto.createHmac('sha256', serverKey).update(authMessage).digest();
          this.write('p', Buffer.from(`${finalNoProof},p=${proof.toString('base64')}`)); continue;
        }
        if (code === 12 && scram) {
          const v = m.body.subarray(4).toString('utf8').split(',').find((x) => x.startsWith('v='));
          if (!v || !scram.serverSig || !crypto.timingSafeEqual(Buffer.from(v.slice(2), 'base64'), scram.serverSig)) throw new Error('SCRAM: the server signature did not verify');
          continue;
        }
        throw new Error(`unsupported authentication request ${code}`);
      }
      if (m.type === 'K') continue;
      if (m.type === 'Z') return;
    }
  }

  /** Run one statement with parameters ($1…$n) over the extended protocol. Queued: one statement at a time per connection. */
  query<R = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<QueryResult<R>> {
    const run = async (): Promise<QueryResult<R>> => {
      const c = PgConnection;
      const vals = params.map(toParam);
      const bind = Buffer.concat([c.cstr(''), c.cstr(''), c.i16(0), c.i16(vals.length), ...vals.flatMap((v) => (v === null ? [c.i32(-1)] : [c.i32(Buffer.byteLength(v)), Buffer.from(v, 'utf8')])), c.i16(0)]);
      this.writeAll([
        ['P', Buffer.concat([c.cstr(''), c.cstr(text), c.i16(0)])],
        ['B', bind],
        ['D', Buffer.concat([Buffer.from('P'), c.cstr('')])],
        ['E', Buffer.concat([c.cstr(''), c.i32(0)])],
        ['S', Buffer.alloc(0)],
      ]);
      return this.collect<R>();
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }

  /** Several statements in one simple query (migrations). No parameters. */
  simple(text: string): Promise<QueryResult> {
    const run = async () => { this.write('Q', PgConnection.cstr(text)); return this.collect<Record<string, unknown>>(); };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }

  private async collect<R>(): Promise<QueryResult<R>> {
    let cols: Array<{ name: string; oid: number }> = []; const rows: R[] = []; let command = ''; let rowCount = 0; let err: PgError | null = null;
    for (;;) {
      const m = await this.next();
      switch (m.type) {
        case 'T': {
          const n = m.body.readInt16BE(0); let i = 2; cols = [];
          for (let k = 0; k < n; k += 1) { const end = m.body.indexOf(0, i); const name = m.body.toString('utf8', i, end); i = end + 1; const oid = m.body.readInt32BE(i + 6); cols.push({ name, oid }); i += 18; }
          break;
        }
        case 'D': {
          const n = m.body.readInt16BE(0); let i = 2; const row: Record<string, unknown> = {};
          for (let k = 0; k < n; k += 1) { const len = m.body.readInt32BE(i); i += 4; const col = cols[k]!; if (len < 0) { row[col.name] = null; continue; } const s = m.body.toString('utf8', i, i + len); i += len; const f = PARSERS[col.oid]; row[col.name] = f ? f(s) : s; }
          rows.push(row as R); break;
        }
        case 'C': { command = m.body.toString('utf8', 0, m.body.length - 1); const parts = command.split(' '); rowCount = Number(parts[parts.length - 1]) || rows.length; break; }
        case 'E': err = new PgError(PgConnection.fields(m.body)); break;
        case 'Z': if (err) throw err; return { rows, rowCount, command };
        default: break;                                                            // '1' ParseComplete, '2' BindComplete, 'n' NoData, 'I' Empty
      }
    }
  }

  async end(): Promise<void> { if (this.closed) return; try { this.write('X', Buffer.alloc(0)); } catch { /* already closed */ } this.sock.end(); this.closed = true; }
  get isClosed() { return this.closed; }
}

// ------------------------------------------------------------------------------------------------ pool and transactions
export interface Queryable { query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<R>> }

export class PgPool implements Queryable {
  private idle: PgConnection[] = []; private all = new Set<PgConnection>(); private waiting: Array<(c: PgConnection) => void> = [];
  constructor(private cfg: PgConfig, private max = 10) {}
  private async acquire(): Promise<PgConnection> {
    const c = this.idle.pop(); if (c && !c.isClosed) return c;
    if (this.all.size < this.max) { const n = new PgConnection(this.cfg); this.all.add(n); try { await n.connect(); } catch (e) { this.all.delete(n); throw e; } return n; }
    return new Promise((r) => this.waiting.push(r));
  }
  private release(c: PgConnection) {
    if (c.isClosed) { this.all.delete(c); return; }
    const w = this.waiting.shift(); if (w) w(c); else this.idle.push(c);
  }
  async query<R = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<QueryResult<R>> {
    const c = await this.acquire(); try { return await c.query<R>(text, params); } finally { this.release(c); }
  }
  async simple(text: string): Promise<QueryResult> { const c = await this.acquire(); try { return await c.simple(text); } finally { this.release(c); } }
  /**
   * Run fn in one transaction. The tenant and user are set with SET LOCAL so row-level security policies apply to every statement,
   * and they vanish at COMMIT/ROLLBACK (no leakage between requests sharing a pooled connection).
   */
  async tx<T>(ctx: { tenantId?: string | null; userId?: string | null }, fn: (q: Queryable) => Promise<T>): Promise<T> {
    const c = await this.acquire();
    try {
      await c.query('BEGIN');
      if (ctx.tenantId) await c.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
      if (ctx.userId) await c.query("SELECT set_config('app.user_id', $1, true)", [ctx.userId]);
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      try { await c.query('ROLLBACK'); } catch { /* connection may be gone */ }
      throw e;
    } finally { this.release(c); }
  }
  async end(): Promise<void> { await Promise.all([...this.all].map((c) => c.end())); this.all.clear(); this.idle = []; }
}

export function configFromUrl(url: string): PgConfig {
  const u = new URL(url);
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('DATABASE_URL must start with postgres://');
  const ssl = u.searchParams.get('sslmode');
  return {
    host: u.hostname || '127.0.0.1', port: Number(u.port || 5432), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'postgres',
    ssl: ssl && ssl !== 'disable' ? { rejectUnauthorized: ssl === 'verify-full' } : false,
  };
}
