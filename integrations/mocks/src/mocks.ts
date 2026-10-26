/**
 * Three local mock adapters. Every value is synthetic and generated from a seed; nothing contacts a network. Each mock can inject the
 * faults Harmony must handle (timeout, rate limit with Retry-After, server error, malformed payload, expired credential).
 *   mock-device-inventory — DISCOVER + READ: device register with serials, MACs, firmware (authority for device.inventory, device.firmware)
 *   mock-dsp-readback     — READ + OBSERVE: audio processor parameters read back (read-only; CONTROL not supported)
 *   mock-itsm-readonly    — READ + signed webhooks: service tickets (authority for ticket)
 */
import crypto from 'node:crypto';
import { AdapterError, type Adapter, type AdapterContext, type AdapterDescriptor, type Health, type Observation, type Page } from '@empathia/integration-contracts';

export type Fault = 'timeout' | 'rate_limited' | 'server' | 'malformed' | 'unauthorized';
export interface MockOptions { seed?: number; faults?: Fault[]; pageSize?: number; devices?: number }

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

abstract class MockBase implements Adapter {
  abstract descriptor: AdapterDescriptor;
  protected faults: Fault[];
  protected pageSize: number;
  calls = 0;
  constructor(protected o: MockOptions = {}) { this.faults = [...(o.faults || [])]; this.pageSize = o.pageSize ?? 25; }
  /** Consume the next injected fault, if any. */
  protected trip(): void {
    this.calls += 1;
    const f = this.faults.shift(); if (!f) return;
    if (f === 'timeout') throw new AdapterError('timeout', `${this.descriptor.key}: timed out (injected)`);
    if (f === 'rate_limited') throw new AdapterError('rate_limited', `${this.descriptor.key}: 429 (injected)`, 1500);
    if (f === 'server') throw new AdapterError('server', `${this.descriptor.key}: 503 (injected)`);
    if (f === 'unauthorized') throw new AdapterError('unauthorized', `${this.descriptor.key}: credential refused (injected)`);
    if (f === 'malformed') throw new AdapterError('malformed', `${this.descriptor.key}: payload did not match its schema (injected)`);
  }
  async health(ctx: AdapterContext): Promise<Health> {
    try { this.trip(); return { state: 'OK', checkedAt: ctx.now().toISOString(), latencyMs: 3, detail: 'local mock answered (synthetic)', maturity: 'MOCK' }; }
    catch (e) { return { state: (e as AdapterError).kind === 'unauthorized' ? 'DOWN' : 'DEGRADED', checkedAt: ctx.now().toISOString(), latencyMs: null, detail: (e as Error).message, maturity: 'MOCK' }; }
  }
  protected page<T>(all: T[], cursor: string | null): Page<T> {
    const start = cursor ? Number(cursor) : 0;
    if (!Number.isInteger(start) || start < 0 || start > all.length) throw new AdapterError('malformed', 'bad cursor');
    const items = all.slice(start, start + this.pageSize);
    return { items, next: start + this.pageSize < all.length ? String(start + this.pageSize) : null };
  }
}

const CATS = ['display', 'camera', 'micceil', 'dsp', 'touch', 'compute', 'switch', 'speaker'];
export class MockDeviceInventory extends MockBase {
  descriptor: AdapterDescriptor = { key: 'mock-device-inventory', category: 'Device management', target: 'Empathia local mock (device inventory)', maturity: 'MOCK', mode: 'READ_ONLY', connection: 'NONE', capabilities: { DISCOVER: 'SUPPORTED', READ: 'SUPPORTED', OBSERVE: 'NOT_SUPPORTED', CONTROL: 'NOT_SUPPORTED', VERIFY: 'NOT_SUPPORTED', ORCHESTRATE: 'NOT_APPLICABLE' }, authorityFor: ['device.inventory', 'device.firmware'], rateLimit: { requestsPerMinute: 120, burst: 10 }, auth: { kind: 'api_key', header: 'x-api-key', rotateDays: 90 } };
  private devices() {
    const r = rng(this.o.seed ?? 1); const n = this.o.devices ?? 60;
    return Array.from({ length: n }, (_, i) => { const cat = CATS[Math.floor(r() * CATS.length)]!; const fw = `${1 + Math.floor(r() * 3)}.${Math.floor(r() * 10)}.${Math.floor(r() * 20)}`;
      return { externalId: `inv-${1000 + i}`, serial: `SYN${(100000 + Math.floor(r() * 899999)).toString()}`, mac: Array.from({ length: 6 }, () => Math.floor(r() * 256).toString(16).padStart(2, '0')).join(':'), category: cat, name: `${cat} ${i + 1}`, firmware: fw, room: `SYN-ROOM-${1 + Math.floor(r() * 12)}` }; });
  }
  private toObs(ctx: AdapterContext, d: ReturnType<MockDeviceInventory['devices']>[number]): Observation {
    return { source: this.descriptor.key, sourceMaturity: 'MOCK', kind: 'device.inventory', externalId: d.externalId, canonicalId: null, observedAt: ctx.now().toISOString(), value: { serial: d.serial, mac: d.mac, category: d.category, name: d.name, firmware: d.firmware, room: d.room }, evidence: 'SYNTHETIC_MOCK' };
  }
  async discover(ctx: AdapterContext, cursor: string | null): Promise<Page<Observation>> { this.trip(); const p = this.page(this.devices(), cursor); return { items: p.items.map((d) => this.toObs(ctx, d)), next: p.next }; }
  async poll(ctx: AdapterContext, _since: string | null, cursor: string | null): Promise<Page<Observation>> { return this.discover(ctx, cursor); }
}

export class MockDspReadback extends MockBase {
  descriptor: AdapterDescriptor = { key: 'mock-dsp-readback', category: 'Audio and DSP', target: 'Empathia local mock (DSP parameter readback)', maturity: 'MOCK', mode: 'READ_ONLY', connection: 'NONE', capabilities: { DISCOVER: 'NOT_SUPPORTED', READ: 'SUPPORTED', OBSERVE: 'SUPPORTED', CONTROL: 'NOT_SUPPORTED', VERIFY: 'NOT_SUPPORTED', ORCHESTRATE: 'NOT_APPLICABLE' }, authorityFor: ['dsp.parameter'], rateLimit: { requestsPerMinute: 60, burst: 5 }, auth: { kind: 'none', why: 'local mock' } };
  async poll(ctx: AdapterContext, _since: string | null, cursor: string | null): Promise<Page<Observation>> {
    this.trip(); const r = rng(this.o.seed ?? 2);
    const params = Array.from({ length: 16 }, (_, i) => ({ id: `dsp-ch${i + 1}`, gainDb: Math.round((r() * 24 - 12) * 10) / 10, muted: r() < 0.1, aec: r() < 0.9 }));
    const p = this.page(params, cursor);
    return { items: p.items.map((x) => ({ source: this.descriptor.key, sourceMaturity: 'MOCK', kind: 'dsp.parameter', externalId: x.id, canonicalId: null, observedAt: ctx.now().toISOString(), value: { gainDb: x.gainDb, muted: x.muted, aec: x.aec }, evidence: 'SYNTHETIC_MOCK' })), next: p.next };
  }
}

export class MockItsm extends MockBase {
  static readonly WEBHOOK_SECRET_REF = 'secret://tenant/mock-itsm/webhook';
  descriptor: AdapterDescriptor = { key: 'mock-itsm-readonly', category: 'Service and ITSM', target: 'Empathia local mock (service desk)', maturity: 'MOCK', mode: 'READ_ONLY', connection: 'WEBHOOK', capabilities: { DISCOVER: 'NOT_SUPPORTED', READ: 'SUPPORTED', OBSERVE: 'SUPPORTED', CONTROL: 'NOT_SUPPORTED', VERIFY: 'NOT_SUPPORTED', ORCHESTRATE: 'NOT_SUPPORTED' }, authorityFor: ['ticket'], rateLimit: { requestsPerMinute: 30, burst: 5 }, auth: { kind: 'oauth2_client_credentials', scopes: ['tickets.read'], rotateDays: 90 } };
  constructor(o: MockOptions = {}, private webhookKey: Buffer = Buffer.from('mock-webhook-key-for-tests-only')) { super(o); }
  async poll(ctx: AdapterContext, since: string | null, cursor: string | null): Promise<Page<Observation>> {
    this.trip(); const r = rng(this.o.seed ?? 3); const base = Date.parse('2026-10-01T00:00:00Z');
    const t = Array.from({ length: 40 }, (_, i) => ({ id: `INC${(20000 + i).toString()}`, at: new Date(base + i * 6 * 3600000).toISOString(), state: r() < 0.3 ? 'resolved' : 'open', room: `SYN-ROOM-${1 + Math.floor(r() * 12)}`, summary: ['No audio from ceiling microphones', 'Display will not wake', 'Meeting will not start', 'Camera framing off'][Math.floor(r() * 4)]! }));
    const p = this.page(t.filter((x) => !since || x.at > since), cursor);
    return { items: p.items.map((x) => ({ source: this.descriptor.key, sourceMaturity: 'MOCK', kind: 'ticket', externalId: x.id, canonicalId: null, observedAt: x.at, value: { state: x.state, room: x.room, summary: x.summary }, evidence: 'SYNTHETIC_MOCK' })), next: p.next };
  }
  sign(body: Buffer, ts: string): string { return crypto.createHmac('sha256', this.webhookKey).update(`${ts}.`).update(body).digest('hex'); }
  /** Verifies HMAC-SHA256 over "timestamp.body" with a 5-minute window; an unsigned or replayed delivery is refused. */
  async receiveWebhook(ctx: AdapterContext, headers: Record<string, string>, body: Buffer): Promise<Observation[]> {
    const ts = headers['x-mock-timestamp'] || ''; const sig = headers['x-mock-signature'] || '';
    if (!ts || !sig) throw new AdapterError('refused', 'unsigned webhook');
    if (Math.abs(ctx.now().getTime() - Date.parse(ts)) > 5 * 60000) throw new AdapterError('refused', 'webhook outside the 5-minute window (possible replay)');
    const want = Buffer.from(this.sign(body, ts), 'hex'); const got = Buffer.from(sig, 'hex');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) throw new AdapterError('refused', 'bad webhook signature');
    let j: { id?: string; state?: string; room?: string; summary?: string };
    try { j = JSON.parse(body.toString('utf8')); } catch { throw new AdapterError('malformed', 'webhook body is not JSON'); }
    if (!j.id || !j.state) throw new AdapterError('malformed', 'webhook body lacks id or state');
    return [{ source: this.descriptor.key, sourceMaturity: 'MOCK', kind: 'ticket', externalId: j.id, canonicalId: null, observedAt: ts, value: { state: j.state, room: j.room ?? null, summary: j.summary ?? '' }, evidence: 'SYNTHETIC_MOCK' }];
  }
}
