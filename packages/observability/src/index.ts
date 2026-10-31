/**
 * @empathia/observability — error reporting, request performance and release correlation behind one port.
 *
 * The application talks to a `Telemetry` port. Three transports exist:
 *   - `memory`   keeps envelopes in an array (tests assert on them);
 *   - `file`     appends envelopes to an NDJSON file (local operation without a vendor);
 *   - `sentry`   POSTs Sentry-format envelopes to the DSN's ingest endpoint, when a DSN is configured.
 *
 * The Sentry transport implements the published ingest contract directly (no SDK dependency, no network unless a DSN is set):
 *   POST {scheme}://{host}/api/{project_id}/envelope/  with  X-Sentry-Auth: Sentry sentry_version=7, sentry_client=…, sentry_key=…
 *   body: one JSON header line, then per item a JSON header line and its payload (length declared), newline-separated.
 * Provenance: docs/research/sentry-ingest-contract.md (Sentry developer documentation retrieved 2026-10-31 via Firecrawl).
 *
 * What is captured, and what never is:
 *   - errors: type, message, a trimmed stack, the correlation id, the route template, the role, the tenant id, the release;
 *   - performance: one transaction per sampled request (route template, status, duration), never the URL's query string;
 *   - never: request bodies, headers, tokens, passwords, e-mail addresses or person ids (`scrub` enforces this on tags and extras).
 *
 * Status: the envelope conformance, scrubbing, sampling, release naming and failure isolation are tested locally. Delivery to a live
 * Sentry project is NOT validated until a project exists and a DSN is configured (creating one is an external action the owner authorizes).
 */

export type Level = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface Release { name: string; version: string; sha: string; environment: string }
/** `empathia-enterprise-api@0.1.0+1351dec` — the form Sentry groups by; the sha is the commit the artifact was built from. */
export const releaseString = (r: Pick<Release, 'name' | 'version' | 'sha'>): string => `${r.name}@${r.version}+${r.sha.slice(0, 12)}`;

export interface ErrorContext { correlationId?: string; route?: string; method?: string; status?: number; role?: string; tenantId?: string; tags?: Record<string, string>; extra?: Record<string, unknown>; level?: Level }
export interface TransactionContext { route: string; method: string; status: number; startedAt: number; endedAt: number; correlationId?: string; role?: string; tenantId?: string }

export interface SentryEvent {
  event_id: string; timestamp: string; platform: 'node' | 'javascript'; level: Level; release: string; environment: string; logger?: string;
  transaction?: string; tags: Record<string, string>; extra?: Record<string, unknown>; sdk: { name: string; version: string };
  exception?: { values: { type: string; value: string; stacktrace?: { frames: { filename: string; function: string; lineno?: number; colno?: number; in_app: boolean }[] } }[] };
  message?: { formatted: string };
  // transactions
  type?: 'transaction'; start_timestamp?: string; contexts?: { trace: { trace_id: string; span_id: string; op: string; status: string } }; spans?: unknown[];
}
export interface Envelope { headers: { event_id: string; sent_at: string; dsn?: string; sdk: { name: string; version: string } }; items: { headers: { type: 'event' | 'transaction'; length: number; content_type: 'application/json' }; payload: string }[] }

export interface Transport { readonly kind: 'memory' | 'file' | 'sentry' | 'none'; send(e: Envelope): Promise<void>; flush(): Promise<void> }

export const SDK = { name: 'empathia.observability', version: '0.1.0' } as const;

// ---------- scrubbing: the port refuses what must never leave the process ----------
const FORBIDDEN_KEYS = /^(authorization|cookie|set-cookie|x-api-key|password|secret|token|jwt|email|e-mail|person_?id|body|raw)$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/g;
/** Drops forbidden keys, masks e-mail addresses and bearer tokens inside strings, and bounds string length. Pure. */
export function scrub<T>(v: T, depth = 0): T {
  if (depth > 6) return '[depth]' as unknown as T;
  if (typeof v === 'string') return v.replace(BEARER, 'Bearer [redacted]').replace(EMAIL, '[email]').slice(0, 2000) as unknown as T;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => scrub(x, depth + 1)) as unknown as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) { if (FORBIDDEN_KEYS.test(k)) out[k] = '[redacted]'; else out[k] = scrub(x, depth + 1); }
    return out as T;
  }
  return v;
}

// ---------- DSN ----------
export interface Dsn { scheme: string; host: string; path: string; publicKey: string; projectId: string; envelopeUrl: string }
/** '{PROTOCOL}://{PUBLIC_KEY}[:{SECRET}]@{HOST}{PATH}/{PROJECT_ID}' → the envelope endpoint '{PROTOCOL}://{HOST}{PATH}/api/{PROJECT_ID}/envelope/'. */
export function parseDsn(dsn: string): Dsn {
  const m = /^(https?):\/\/([^:@/]+)(?::[^@/]*)?@([^/]+)((?:\/[^/]+)*)\/(\d+)\/?$/.exec(dsn.trim());
  if (!m) throw new Error('DSN is not of the form scheme://publicKey@host/projectId');
  const [, scheme, publicKey, host, path, projectId] = m as unknown as [string, string, string, string, string, string];
  return { scheme, host, path, publicKey, projectId, envelopeUrl: `${scheme}://${host}${path}/api/${projectId}/envelope/` };
}
export const authHeader = (d: Dsn): string => `Sentry sentry_version=7, sentry_client=${SDK.name}/${SDK.version}, sentry_key=${d.publicKey}`;

// ---------- envelopes ----------
export const eventId = (): string => { const b = new Uint8Array(16); (globalThis.crypto as Crypto).getRandomValues(b); return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); };
export function envelope(ev: SentryEvent, dsn?: string): Envelope {
  const payload = JSON.stringify(ev);
  return { headers: { event_id: ev.event_id, sent_at: new Date().toISOString(), ...(dsn ? { dsn } : {}), sdk: { ...SDK } }, items: [{ headers: { type: ev.type === 'transaction' ? 'transaction' : 'event', length: new TextEncoder().encode(payload).length, content_type: 'application/json' }, payload }] };
}
/** Serializes to the wire format: header line, then (item header line, payload) per item, newline-separated, trailing newline. */
export const serialize = (e: Envelope): string => `${JSON.stringify(e.headers)}\n${e.items.map((i) => `${JSON.stringify(i.headers)}\n${i.payload}`).join('\n')}\n`;
/** Parses the wire format back (length-declared payloads only) — used by the tests to prove the serialization round-trips. */
export function parse(text: string): Envelope {
  const bytes = new TextEncoder().encode(text); let pos = 0;
  const line = (): string => { let end = pos; while (end < bytes.length && bytes[end] !== 10) end++; const s = new TextDecoder().decode(bytes.subarray(pos, end)); pos = Math.min(end + 1, bytes.length); return s; };
  const headers = JSON.parse(line()) as Envelope['headers']; const items: Envelope['items'] = [];
  while (pos < bytes.length) {
    const h = JSON.parse(line()) as Envelope['items'][number]['headers'];
    if (typeof h.length !== 'number') throw new Error('implicit-length items are not produced by this implementation');
    const payload = new TextDecoder().decode(bytes.subarray(pos, pos + h.length)); pos += h.length;
    if (pos < bytes.length && bytes[pos] !== 10) throw new Error('malformed: a length-declared payload must end at a newline'); pos += 1;
    items.push({ headers: h, payload });
  }
  return { headers, items };
}

// ---------- transports ----------
export class MemoryTransport implements Transport { readonly kind = 'memory' as const; envelopes: Envelope[] = []; async send(e: Envelope) { this.envelopes.push(e); } async flush() {} get events(): SentryEvent[] { return this.envelopes.map((e) => JSON.parse(e.items[0]!.payload) as SentryEvent); } }
export class NullTransport implements Transport { readonly kind = 'none' as const; async send() {} async flush() {} }
/** Appends one serialized envelope per line-group to a file; failures are swallowed (telemetry must never break the request). */
export class FileTransport implements Transport {
  readonly kind = 'file' as const; private queue: Promise<void> = Promise.resolve();
  constructor(private readonly file: string, private readonly append: (file: string, text: string) => Promise<void>) {}
  send(e: Envelope): Promise<void> { this.queue = this.queue.then(() => this.append(this.file, serialize(e))).catch(() => undefined); return this.queue; }
  flush(): Promise<void> { return this.queue; }
}
/** Posts to the DSN's envelope endpoint. Honors 429 (drops until Retry-After); never retries a failed send (per Sentry's transport guidance). */
export class SentryTransport implements Transport {
  readonly kind = 'sentry' as const; readonly dsn: Dsn; private pausedUntil = 0; private inflight = new Set<Promise<void>>(); sent = 0; dropped = 0; lastStatus: number | null = null; lastError: string | null = null;
  constructor(dsn: string, private readonly fetchFn: typeof fetch = fetch) { this.dsn = parseDsn(dsn); }
  send(e: Envelope): Promise<void> {
    if (Date.now() < this.pausedUntil) { this.dropped += 1; return Promise.resolve(); }
    const p = (async () => {
      try {
        const r = await this.fetchFn(this.dsn.envelopeUrl, { method: 'POST', headers: { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': authHeader(this.dsn), 'user-agent': `${SDK.name}/${SDK.version}` }, body: serialize(e) });
        this.lastStatus = r.status;
        if (r.status === 429) { const ra = Number(r.headers.get('retry-after') || 60); this.pausedUntil = Date.now() + (Number.isFinite(ra) ? ra : 60) * 1000; this.dropped += 1; }
        else if (r.status >= 200 && r.status < 300) this.sent += 1; else { this.dropped += 1; this.lastError = `HTTP ${r.status}`; }
      } catch (err) { this.dropped += 1; this.lastError = (err as Error).message; }
    })();
    this.inflight.add(p); void p.finally(() => this.inflight.delete(p));
    return p;
  }
  async flush() { await Promise.all([...this.inflight]); }
}

// ---------- the port ----------
export interface TelemetryOptions { release: Release; platform?: 'node' | 'javascript'; transport: Transport; tracesSampleRate?: number; random?: () => number; now?: () => Date; logger?: string }
export class Telemetry {
  readonly release: string; readonly environment: string; readonly transport: Transport; readonly tracesSampleRate: number;
  private readonly platform: 'node' | 'javascript'; private readonly random: () => number; private readonly now: () => Date; private readonly logger: string | undefined;
  captured = 0; sampledIn = 0; sampledOut = 0;
  constructor(o: TelemetryOptions) {
    this.release = releaseString(o.release); this.environment = o.release.environment; this.transport = o.transport; this.platform = o.platform || 'node';
    const rate = o.tracesSampleRate ?? 0.1; if (!(rate >= 0 && rate <= 1)) throw new Error('tracesSampleRate must be between 0 and 1');
    this.tracesSampleRate = rate; this.random = o.random || Math.random; this.now = o.now || (() => new Date()); this.logger = o.logger;
  }
  private base(level: Level, c: { correlationId?: string; route?: string; method?: string; status?: number; role?: string; tenantId?: string; tags?: Record<string, string> }): SentryEvent {
    const tags: Record<string, string> = {};
    if (c.correlationId) tags['correlation_id'] = c.correlationId; if (c.route) tags['route'] = c.route; if (c.method) tags['method'] = c.method; if (c.status != null) tags['status'] = String(c.status); if (c.role) tags['role'] = c.role; if (c.tenantId) tags['tenant_id'] = c.tenantId;
    for (const [k, v] of Object.entries(c.tags || {})) if (!FORBIDDEN_KEYS.test(k)) tags[k] = scrub(String(v));
    return { event_id: eventId(), timestamp: this.now().toISOString(), platform: this.platform, level, release: this.release, environment: this.environment, ...(this.logger ? { logger: this.logger } : {}), ...(c.route ? { transaction: `${c.method || ''} ${c.route}`.trim() } : {}), tags, sdk: { ...SDK } };
  }
  /** Reports an error. Never throws; never blocks (the returned promise is for tests and shutdown). */
  captureException(err: unknown, c: ErrorContext = {}): Promise<void> {
    try {
      const e = err instanceof Error ? err : new Error(String(err));
      const ev = this.base(c.level || 'error', c);
      ev.exception = { values: [{ type: e.name || 'Error', value: scrub(e.message || ''), stacktrace: { frames: frames(e.stack) } }] };
      if (c.extra) ev.extra = scrub(c.extra);
      this.captured += 1;
      return this.transport.send(envelope(ev)).catch(() => undefined);
    } catch { return Promise.resolve(); }
  }
  captureMessage(message: string, c: ErrorContext = {}): Promise<void> {
    try { const ev = this.base(c.level || 'info', c); ev.message = { formatted: scrub(message) }; if (c.extra) ev.extra = scrub(c.extra); this.captured += 1; return this.transport.send(envelope(ev)).catch(() => undefined); } catch { return Promise.resolve(); }
  }
  /** Records one request as a transaction when the sampler admits it. Errors (status ≥ 500) are always admitted so they correlate with the exception. */
  transaction(t: TransactionContext): Promise<void> {
    try {
      const admitted = t.status >= 500 || this.random() < this.tracesSampleRate;
      if (!admitted) { this.sampledOut += 1; return Promise.resolve(); }
      this.sampledIn += 1;
      const ev = this.base('info', t); ev.type = 'transaction'; ev.transaction = `${t.method} ${t.route}`;
      ev.start_timestamp = new Date(t.startedAt).toISOString(); ev.timestamp = new Date(t.endedAt).toISOString();
      ev.contexts = { trace: { trace_id: eventId(), span_id: eventId().slice(0, 16), op: 'http.server', status: t.status >= 500 ? 'internal_error' : t.status === 429 ? 'resource_exhausted' : t.status === 404 ? 'not_found' : t.status === 401 || t.status === 403 ? 'permission_denied' : t.status >= 400 ? 'invalid_argument' : 'ok' } };
      ev.spans = [];
      return this.transport.send(envelope(ev)).catch(() => undefined);
    } catch { return Promise.resolve(); }
  }
  flush(): Promise<void> { return this.transport.flush(); }
  /** For /health: what the operator needs to know, nothing secret. */
  status(): { transport: Transport['kind']; release: string; environment: string; tracesSampleRate: number; captured: number; sampledIn: number; sampledOut: number; delivery?: { sent: number; dropped: number; lastStatus: number | null; lastError: string | null } } {
    const d = this.transport instanceof SentryTransport ? { delivery: { sent: this.transport.sent, dropped: this.transport.dropped, lastStatus: this.transport.lastStatus, lastError: this.transport.lastError } } : {};
    return { transport: this.transport.kind, release: this.release, environment: this.environment, tracesSampleRate: this.tracesSampleRate, captured: this.captured, sampledIn: this.sampledIn, sampledOut: this.sampledOut, ...d };
  }
}

/** Parses a V8 stack into Sentry frames (innermost last, as Sentry expects), at most 30, file paths only — never source. */
export function frames(stack: string | undefined): { filename: string; function: string; lineno?: number; colno?: number; in_app: boolean }[] {
  if (!stack) return [];
  const out: { filename: string; function: string; lineno?: number; colno?: number; in_app: boolean }[] = [];
  for (const l of stack.split('\n').slice(1, 31)) {
    const m = /^\s*at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+?))\)?\s*$/.exec(l); if (!m) continue;
    const file = m[2] || m[5] || '?';
    out.push({ filename: file.replace(/^file:\/\//, ''), function: m[1] || '<anonymous>', ...(m[3] ? { lineno: Number(m[3]), colno: Number(m[4]) } : {}), in_app: !/node_modules|node:internal/.test(file) });
  }
  return out.reverse();
}

/** Builds the telemetry from the environment the way every service does it: TELEMETRY=none|file|sentry, SENTRY_DSN, TELEMETRY_TRACES_SAMPLE_RATE. */
export function telemetryFromEnv(env: Record<string, string | undefined>, release: Release, deps: { append?: (file: string, text: string) => Promise<void>; fetchFn?: typeof fetch; platform?: 'node' | 'javascript'; logger?: string } = {}): Telemetry {
  const mode = env['TELEMETRY'] || (env['SENTRY_DSN'] ? 'sentry' : 'none');
  const rate = env['TELEMETRY_TRACES_SAMPLE_RATE'] != null ? Number(env['TELEMETRY_TRACES_SAMPLE_RATE']) : 0.1;
  let transport: Transport;
  if (mode === 'sentry') { if (!env['SENTRY_DSN']) throw new Error('TELEMETRY=sentry requires SENTRY_DSN'); transport = new SentryTransport(env['SENTRY_DSN'], deps.fetchFn); }
  else if (mode === 'file') { if (!deps.append || !env['TELEMETRY_FILE']) throw new Error('TELEMETRY=file requires TELEMETRY_FILE and a file appender'); transport = new FileTransport(env['TELEMETRY_FILE'], deps.append); }
  else if (mode === 'none') transport = new NullTransport();
  else throw new Error(`TELEMETRY must be none, file or sentry (got ${mode})`);
  return new Telemetry({ release, transport, tracesSampleRate: rate, platform: deps.platform, logger: deps.logger });
}
