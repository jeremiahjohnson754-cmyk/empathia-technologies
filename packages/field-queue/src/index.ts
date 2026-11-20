/**
 * @empathia/field-queue — work recorded in the field without a connection, sent when it returns.
 *
 * The rules this package exists to keep (founder, 10 November: Commissioning, Assurance and ServiceHands work offline):
 *
 *   1. Nothing recorded on a device is lost, reordered or silently replaced. An entry leaves the queue only when the server
 *      acknowledged it, or when a person discarded it and the discard is recorded.
 *   2. Nothing recorded on a device counts as sent until the server said so. A test result waiting in the queue is
 *      RECORDED_ON_DEVICE: it never counts towards acceptance, a pass rate or a "ready" state (`counts`).
 *   3. A retry can never apply twice. Every entry carries one idempotency key for its whole life, including a retry after a crash
 *      or an answer that never arrived (the enterprise API reserves the key with the effect, D-35).
 *   4. A change made against stale data is a CONFLICT a person resolves: the server's answer is kept beside the device's entry, and
 *      later entries for the same record wait behind it. Nothing is overwritten to make a queue drain.
 *   5. One person's entries are never sent as another person. A queue belongs to a tenant, a person and a device.
 *
 * Everything here is pure: state in, state out, with the clock and the random source passed in. `drain` is the only function that
 * awaits anything, and what it awaits is the `send` it is given.
 */

export type EntryState =
  /** recorded on the device; not sent, or sent with no answer yet received */
  | 'WAITING'
  /** handed to the network; the answer is not known. A reload returns it to WAITING with the same key */
  | 'SENDING'
  /** the server acknowledged it (2xx) */
  | 'SENT'
  /** the server refused it as stale (409 / 412): a person decides */
  | 'CONFLICT'
  /** the server refused it for a reason a retry cannot fix (400, 403, 404, 410, 422): a person decides */
  | 'REJECTED'
  /** a person discarded it; kept as a record, never sent */
  | 'DISCARDED';

export interface Owner { tenantId: string; personId: string; deviceId: string }
export interface Ack { status: number; at: string; version: string | null; body: unknown }
export interface Refusal { status: number; at: string; reason: string; server: unknown }

export interface Entry {
  /** the idempotency key, fixed for the life of the entry */
  id: string;
  /** position in the device's own order of recording; never reused (a replacement made by `resolve` sits between two positions) */
  seq: number;
  /** the record this change belongs to ("commissioning/R-ATL-4-218", "job/WO-0417"): entries of one record are sent in order */
  record: string;
  /** what was done, in the product's words ("test result", "evidence note", "job step") */
  kind: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: unknown;
  /** the version of the record this change was made against (sent as If-Match); null when the change does not depend on one */
  expects: string | null;
  /** when set, `expects` is taken from that earlier entry's acknowledgement (a second step recorded offline on top of the first) */
  after: string | null;
  /** the device's clock when it was recorded; the server stamps its own time on receipt */
  recordedAt: string;
  state: EntryState;
  attempts: number;
  /** earliest time of the next attempt (ISO), or null */
  notBefore: string | null;
  lastError: string | null;
  ack: Ack | null;
  refusal: Refusal | null;
  /** the entry this one replaced after a conflict was resolved by keeping the device's change */
  supersedes: string | null;
  discardedBy: string | null;
}

export interface Queue {
  v: 1;
  owner: Owner;
  nextSeq: number;
  entries: Entry[];
  /** the queue is stopped until the person signs in again (401); nothing is sent, nothing is lost */
  needsSignIn: boolean;
}

export interface Limits { maxWaiting: number; maxBodyBytes: number; baseDelayMs: number; maxDelayMs: number }
export const LIMITS: Limits = { maxWaiting: 500, maxBodyBytes: 256 * 1024, baseDelayMs: 2000, maxDelayMs: 5 * 60 * 1000 };

export type Result<T> = { ok: true; queue: Queue; value: T } | { ok: false; why: string };
const ok = <T>(queue: Queue, value: T): Result<T> => ({ ok: true, queue, value });
const no = <T>(why: string): Result<T> => ({ ok: false, why });

export const empty = (owner: Owner): Queue => ({ v: 1, owner, nextSeq: 1, entries: [], needsSignIn: false });
const OPEN: readonly EntryState[] = ['WAITING', 'SENDING', 'CONFLICT', 'REJECTED'];
/** still on the device and not yet settled */
export const isOpen = (e: Entry) => OPEN.includes(e.state);
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v ?? null)).length;
const patch = (q: Queue, id: string, f: (e: Entry) => Entry): Queue => ({ ...q, entries: q.entries.map((e) => (e.id === id ? f(e) : e)) });
const find = (q: Queue, id: string) => q.entries.find((e) => e.id === id);

export interface NewEntry { id: string; record: string; kind: string; method: Entry['method']; path: string; body: unknown; expects?: string | null; after?: string | null }

/** Record a change on the device. Refused, with the reason, rather than dropped or trimmed. */
export function enqueue(q: Queue, n: NewEntry, now: string, limits: Limits = LIMITS): Result<Entry> {
  if (!n.id || n.id.length < 16) return no('an entry needs an idempotency key of at least 16 characters');
  if (find(q, n.id)) return no('this change is already recorded on the device (same key)');
  if (!n.record || !n.kind || !n.path.startsWith('/')) return no('an entry needs the record it belongs to, what was done, and a path');
  if (bytes(n.body) > limits.maxBodyBytes) return no(`this change is larger than the device may hold in one entry (${limits.maxBodyBytes} bytes): attach large evidence as a file`);
  if (q.entries.filter(isOpen).length >= limits.maxWaiting) return no(`the device already holds ${limits.maxWaiting} changes that have not been sent: connect and send them before recording more`);
  if (n.after) { const a = find(q, n.after); if (!a) return no('the earlier change this one follows is not on the device'); if (a.record !== n.record) return no('a change can only follow an earlier change to the same record'); if (a.state === 'DISCARDED') return no('the earlier change this one follows was discarded'); }
  const e: Entry = { id: n.id, seq: q.nextSeq, record: n.record, kind: n.kind, method: n.method, path: n.path, body: n.body, expects: n.expects ?? null, after: n.after ?? null, recordedAt: now, state: 'WAITING', attempts: 0, notBefore: null, lastError: null, ack: null, refusal: null, supersedes: null, discardedBy: null };
  return ok({ ...q, nextSeq: q.nextSeq + 1, entries: [...q.entries, e] }, e);
}

/**
 * What may be sent now: for each record, its earliest unsettled entry, if it is WAITING and its time has come. An entry never
 * overtakes an earlier one for the same record, whatever state that one is in: a conflict or a refusal holds the record's later
 * changes until a person has dealt with it. Different records do not wait for each other.
 */
export function ready(q: Queue, now: string): Entry[] {
  if (q.needsSignIn) return [];
  const head = new Map<string, Entry>();
  for (const e of [...q.entries].sort((a, b) => a.seq - b.seq)) if (isOpen(e) && !head.has(e.record)) head.set(e.record, e);
  return [...head.values()].filter((e) => e.state === 'WAITING' && (!e.notBefore || e.notBefore <= now));
}

/** The `expects` an entry is sent with: its own, or the version its predecessor was acknowledged with. */
export function expectsOf(q: Queue, e: Entry): string | null {
  if (!e.after) return e.expects;
  const a = find(q, e.after);
  return a?.ack?.version ?? e.expects;
}

export const markSending = (q: Queue, id: string): Queue => patch(q, id, (e) => (e.state === 'WAITING' ? { ...e, state: 'SENDING', attempts: e.attempts + 1 } : e));

/** After a reload: anything that was in flight has an unknown outcome, so it waits again with the same key. */
export const recover = (q: Queue): Queue => ({ ...q, entries: q.entries.map((e) => (e.state === 'SENDING' ? { ...e, state: 'WAITING', lastError: 'the answer never arrived (the app closed or the connection dropped); it will be sent again with the same key' } : e)) });

export type Outcome =
  | { kind: 'ok'; status: number; version?: string | null; body?: unknown }
  | { kind: 'conflict'; status: number; server?: unknown; reason?: string }
  | { kind: 'rejected'; status: number; reason?: string; server?: unknown }
  | { kind: 'sign-in'; status: number }
  | { kind: 'retry'; status: number | null; reason: string; retryAfterMs?: number };

/** How an HTTP status is read. A status this function does not know is a retry, never a success. */
export function classify(status: number | null, reason = ''): Outcome['kind'] {
  if (status === null) return 'retry';
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401) return 'sign-in';
  if (status === 409 || status === 412) return 'conflict';
  if ([400, 403, 404, 405, 410, 413, 415, 422].includes(status)) return 'rejected';
  void reason; return 'retry';
}

/**
 * Exponential back-off with jitter: half the step is fixed and half is random, so a retry is never immediate and many devices coming
 * back at once do not arrive together. A server's Retry-After is a floor, never ignored.
 */
export function delayMs(attempts: number, rand: number, limits: Limits = LIMITS, retryAfterMs = 0): number {
  const step = Math.min(limits.maxDelayMs, limits.baseDelayMs * 2 ** Math.max(0, attempts - 1));
  return Math.max(retryAfterMs, Math.round(step / 2 + (step / 2) * Math.min(1, Math.max(0, rand))));
}

/** Apply the answer to an entry that was SENDING. An answer for an entry in any other state changes nothing (a late duplicate). */
export function settle(q: Queue, id: string, o: Outcome, now: string, rand = 0.5, limits: Limits = LIMITS): Queue {
  const e = find(q, id); if (!e || e.state !== 'SENDING') return q;
  if (o.kind === 'ok') return patch(q, id, (x) => ({ ...x, state: 'SENT', notBefore: null, lastError: null, ack: { status: o.status, at: now, version: o.version ?? null, body: o.body ?? null } }));
  if (o.kind === 'conflict') return patch(q, id, (x) => ({ ...x, state: 'CONFLICT', notBefore: null, lastError: null, refusal: { status: o.status, at: now, reason: o.reason || 'the record changed on the server after this was recorded', server: o.server ?? null } }));
  if (o.kind === 'rejected') return patch(q, id, (x) => ({ ...x, state: 'REJECTED', notBefore: null, lastError: null, refusal: { status: o.status, at: now, reason: o.reason || `the server refused this change (${o.status})`, server: o.server ?? null } }));
  if (o.kind === 'sign-in') return { ...patch(q, id, (x) => ({ ...x, state: 'WAITING', attempts: Math.max(0, x.attempts - 1), lastError: 'sign in again to send this' })), needsSignIn: true };
  const wait = delayMs(e.attempts, rand, limits, o.retryAfterMs || 0);
  return patch(q, id, (x) => ({ ...x, state: 'WAITING', notBefore: new Date(Date.parse(now) + wait).toISOString(), lastError: o.reason }));
}

export const signedIn = (q: Queue): Queue => ({ ...q, needsSignIn: false });

/**
 * A person resolves a conflict or a refusal.
 *   'discard'  the device's change is given up; recorded with who decided. Later changes that followed it are held as REJECTED with
 *              the reason, because what they were built on no longer exists — they are never sent as if nothing happened.
 *   'resend'   the device's change is kept and sent again against the server's current version. It becomes a new entry with a new key
 *              (the request is different, and the API binds a key to its request), which takes the old entry's place in the record's
 *              order; the old entry is closed as DISCARDED and points to its replacement.
 */
export function resolve(q: Queue, id: string, choice: { kind: 'discard'; by: string } | { kind: 'resend'; by: string; newId: string; expects: string | null; body?: unknown }, now: string): Result<Entry | null> {
  const e = find(q, id); if (!e) return no('no such entry on this device');
  if (e.state !== 'CONFLICT' && e.state !== 'REJECTED') return no('only a conflict or a refused change is resolved by a person');
  if (!choice.by) return no('a decision needs the person who made it');
  if (choice.kind === 'discard') {
    let next = patch(q, id, (x) => ({ ...x, state: 'DISCARDED', discardedBy: choice.by }));
    const gone = new Set([id]);
    for (const f of [...next.entries].sort((a, b) => a.seq - b.seq)) if (f.after && gone.has(f.after) && isOpen(f)) { gone.add(f.id); next = patch(next, f.id, (x) => ({ ...x, state: 'REJECTED', refusal: { status: 0, at: now, reason: 'the earlier change this one followed was discarded', server: null } })); }
    return ok(next, null);
  }
  if (!choice.newId || choice.newId.length < 16 || find(q, choice.newId)) return no('the replacement needs a new idempotency key');
  const r: Entry = { ...e, id: choice.newId, body: choice.body === undefined ? e.body : choice.body, expects: choice.expects, after: null, state: 'WAITING', attempts: 0, notBefore: null, lastError: null, ack: null, refusal: null, supersedes: e.id, discardedBy: null };
  const entries = q.entries.map((x) => (x.id === id ? { ...x, state: 'DISCARDED' as const, discardedBy: choice.by } : x.after === id ? { ...x, after: r.id } : x));
  // the replacement keeps the old entry's place in the record's order: its position is between the old entry and whatever came next
  const later = q.entries.map((x) => x.seq).filter((n) => n > e.seq); const nextSeq = later.length ? Math.min(...later) : q.nextSeq;
  const at = entries.findIndex((x) => x.id === id); entries.splice(at + 1, 0, { ...r, seq: (e.seq + nextSeq) / 2 });
  return ok({ ...q, entries }, r);
}

/** May this entry be counted as done by anything that reports progress, readiness or acceptance? Only once the server said so. */
export const counts = (e: Entry): boolean => e.state === 'SENT';
/** How an entry is described to the person who recorded it. Never "saved" or "passed" before the server acknowledged it. */
export function standing(e: Entry): string {
  switch (e.state) {
    case 'WAITING': return e.attempts ? 'Recorded on this device. Not sent yet: it will be tried again.' : 'Recorded on this device. Not sent yet.';
    case 'SENDING': return 'Recorded on this device. Being sent now.';
    case 'SENT': return 'Sent and acknowledged by the server.';
    case 'CONFLICT': return 'Not applied: the record changed on the server after this was recorded. It needs your decision.';
    case 'REJECTED': return 'Not applied: the server refused it. It needs your decision.';
    case 'DISCARDED': return 'Discarded. It was not sent.';
  }
}

export interface Summary { waiting: number; sending: number; sent: number; conflicts: number; rejected: number; discarded: number; needsPerson: number; needsSignIn: boolean; oldestWaiting: string | null; drained: boolean }
export function summary(q: Queue): Summary {
  const n = (s: EntryState) => q.entries.filter((e) => e.state === s).length;
  const open = q.entries.filter((e) => e.state === 'WAITING' || e.state === 'SENDING').sort((a, b) => a.seq - b.seq);
  const s = { waiting: n('WAITING'), sending: n('SENDING'), sent: n('SENT'), conflicts: n('CONFLICT'), rejected: n('REJECTED'), discarded: n('DISCARDED') };
  return { ...s, needsPerson: s.conflicts + s.rejected, needsSignIn: q.needsSignIn, oldestWaiting: open[0]?.recordedAt ?? null, drained: q.entries.every((e) => !isOpen(e)) };
}

/** Settled entries older than `keepMs` are dropped from the device (the server holds them). Unsettled entries are never pruned. */
export const prune = (q: Queue, now: string, keepMs = 7 * 864e5): Queue => ({ ...q, entries: q.entries.filter((e) => isOpen(e) || Date.parse(now) - Date.parse(e.ack?.at ?? e.refusal?.at ?? e.recordedAt) < keepMs) });

// ------------------------------------------------------------------------------------------------------------- storage
export interface Store { read(): string | null; write(text: string): void }
export const memoryStore = (initial: string | null = null): Store & { text: string | null } => { const s = { text: initial, read: () => s.text, write: (t: string) => { s.text = t; } }; return s; };
export type Loaded = { queue: Queue; from: 'empty' | 'stored' } | { queue: Queue; from: 'quarantined'; raw: string; why: string };

const validEntry = (e: unknown): e is Entry => { const x = e as Entry; return !!x && typeof x.id === 'string' && typeof x.seq === 'number' && typeof x.record === 'string' && typeof x.path === 'string' && ['WAITING', 'SENDING', 'SENT', 'CONFLICT', 'REJECTED', 'DISCARDED'].includes(x.state); };
/**
 * Open the device's queue for this owner. What is stored for anyone else is never loaded into this person's queue, and what cannot be
 * read is handed back for safekeeping (`quarantined`) instead of being thrown away: it may be the only copy of someone's field work.
 * Entries that were in flight when the app closed are returned to WAITING.
 */
export function load(store: Store, owner: Owner): Loaded {
  const raw = store.read(); if (raw === null || raw === '') return { queue: empty(owner), from: 'empty' };
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return { queue: empty(owner), from: 'quarantined', raw, why: 'the stored queue is not readable' }; }
  const q = parsed as Queue;
  if (!q || q.v !== 1 || !q.owner || !Array.isArray(q.entries) || !q.entries.every(validEntry)) return { queue: empty(owner), from: 'quarantined', raw, why: 'the stored queue is not in a form this version understands' };
  if (q.owner.tenantId !== owner.tenantId || q.owner.personId !== owner.personId) return { queue: empty(owner), from: 'quarantined', raw, why: 'the stored queue belongs to another person or organisation; it was not opened and was not sent' };
  return { queue: recover({ ...q, owner }), from: 'stored' };
}
export const save = (store: Store, q: Queue): void => store.write(JSON.stringify(q));

// ------------------------------------------------------------------------------------------------------------- sending
export interface Sent { status: number | null; version?: string | null; body?: unknown; reason?: string; retryAfterMs?: number }
export interface DrainOptions { now: () => string; rand?: () => number; limits?: Limits; onChange?: (q: Queue) => void; maxRounds?: number }
/**
 * Send what is ready, one entry per record at a time, saving the state before every attempt and after every answer (`onChange`), so a
 * crash at any point leaves a queue `load` can recover. Returns when nothing more can be sent now.
 * `send` receives the entry and the `expects` to send; it resolves with the status (null for "no answer") and never needs to throw —
 * if it does, that is "no answer".
 */
export async function drain(q: Queue, send: (e: Entry, expects: string | null) => Promise<Sent>, o: DrainOptions): Promise<Queue> {
  const rand = o.rand || Math.random; let rounds = o.maxRounds ?? 1000;
  for (let batch = ready(q, o.now()); batch.length && rounds > 0; batch = ready(q, o.now()), rounds -= 1) {
    for (const e of batch) {
      q = markSending(q, e.id); o.onChange?.(q);
      let r: Sent; try { r = await send(find(q, e.id)!, expectsOf(q, e)); } catch (err) { r = { status: null, reason: err instanceof Error ? err.message : 'no answer' }; }
      const kind = classify(r.status);
      const out: Outcome = kind === 'ok' ? { kind, status: r.status!, version: r.version ?? null, body: r.body } : kind === 'conflict' ? { kind, status: r.status!, server: r.body, reason: r.reason } : kind === 'rejected' ? { kind, status: r.status!, server: r.body, reason: r.reason } : kind === 'sign-in' ? { kind, status: r.status! } : { kind: 'retry', status: r.status, reason: r.reason || (r.status === null ? 'no answer from the server' : `the server answered ${r.status}`), retryAfterMs: r.retryAfterMs };
      q = settle(q, e.id, out, o.now(), rand(), o.limits); o.onChange?.(q);
      if (q.needsSignIn) return q;
    }
  }
  return q;
}
