/**
 * The field record page on the server's records (founder, 17 Nov 2026: "integrate the regular Lite, Engineering, Commissioning,
 * ServiceHands, Assurance, and APEX interfaces with those server records"). Only a build that names a server loads this file.
 *
 * `#/install/redline?room=<the sandbox's room>` is the same page as for a campus room. Here the room is read from the server
 * (`GET /v1/rooms/:room`: its design, devices and proposed connections) and analysed in the browser by the same engine the server
 * runs; its field record is read from the server and every action on it is a request made as the person the visitor is viewing as.
 * The server decides: a refusal comes back in the server's words and is in its audit history. The page works nothing out for itself
 * here (founder, 17 Nov 2026: "One authoritative backend. No duplicated business logic. No imaginary synchronization."): who may
 * record or decide, whether a hookup matches the design, which checks to look at again after a move and the counts are the server's
 * answers, shown as given. Nothing is copied into the browser's own stores and nothing is merged: what is shown is the last answer.
 *
 * What differs from a campus room, and is said on the page: the record is kept by the server in the visitor's sandbox; a sandbox keeps
 * no photographs; the people named are the sandbox's own (synthetic).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { analyzeRoom, resultCounts } from '@empathia/commissioning-engine';
import type { RoomDesignInput, PlannedDevice, Connection, RoomLifecycle } from '@empathia/domain-types';
import { Notice } from '@empathia/ui';
import { C, layerOf, type RoomRecord, type Position, type IdentityState } from '../campus/design.js';
import type { FieldState, Result } from '../install/fieldRecord.js';
import type { FieldSource } from '../install/fieldSource.js';
import { personaLabel } from '../build/store.js';
import { connected, SandboxGone, type Connected } from './client.js';
import type { Thread } from './journey.js';

interface RoomDetail {
  room: { code: string; name: string; lifecycle: string; template: string; intendedUse: string; occupancy: number; geometry: RoomDesignInput['geometry']; approvedClassification: unknown };
  devices: Array<PlannedDevice & { asset: string | null; identityState: string }>; connections: Connection[];
}
interface FieldDto {
  writable: boolean; may: { record: boolean; decide: boolean; note: boolean };
  stats: { devices: number; mounted: number; hookups: number; notInDesign: number; moves: { proposed: number; approved: number; rejected: number }; notes: { open: number; total: number } };
  devices: Array<{ asset: string; furniture?: boolean; hookups: string[]; designedConnections: string[]; recheck: Array<string | { test?: string; id?: string }>; mounting: { method: string; heightM: number | null; fixing: string | null; backing: string | null; tether: string | null; note: string | null; by: string; at: string } | null }>;
  hookups: Array<{ hookup: string; asDesigned: boolean; device: string | null; port: string; to: string | null; toPort: string | null; cable: string | null; by: string; at: string; removed: unknown }>;
  moves: Array<{ move: string; device: string | null; state: 'PROPOSED' | 'APPROVED' | 'REJECTED'; from: { x: number; y: number }; to: { x: number; y: number }; reason: string; note: string | null; by: string; at: string; decidedBy: string | null; decidedAt: string | null; decision: string | null }>;
  markups: Array<{ markup: string; x: number; y: number; text: string; state: 'OPEN' | 'RESOLVED'; by: string; at: string; resolvedBy: string | null; resolution: string | null }>;
}

/** The server's room as the record every room page reads. The analysis is the browser's run of the shared engine on the server's design. */
export function recordFromServer(d: RoomDetail): RoomRecord {
  const g = d.room.geometry as RoomDesignInput['geometry'] & { widthM?: number; lengthM?: number; ceiling?: number };
  const devices = d.devices as PlannedDevice[];
  const design: RoomDesignInput = { template: d.room.template, intendedUse: d.room.intendedUse, occupancy: d.room.occupancy, lifecycle: d.room.lifecycle as RoomLifecycle, coreRoomId: d.room.code, geometry: d.room.geometry, devices, connections: d.connections, classification: { approved: (d.room.approvedClassification as never) || null }, results: {} };
  const analysis = analyzeRoom(design, C);
  const positions: Position[] = d.devices.map((x) => { const K = C.categories[x.cat];
    return { code: x.id, cat: x.cat, catLabel: K?.label || x.cat, label: x.label, layer: layerOf(x.cat), x: Number(x.x), y: Number(x.y), z: Number(x.z) || 0, rot: Number(x.rot) || 0, mount: String(x.mount), furniture: !!x.furniture, asset: x.furniture ? null : x.asset,
      identity: (['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'].includes(x.identityState) ? x.identityState : 'UNKNOWN') as IdentityState, device: x.furniture ? 'furniture' : `${K?.label || x.cat} · class template · spec to verify`, provenance: 'the server’s design record (your sandbox)' }; });
  const archetype = analysis.classification.archetype || 'custom';
  return {
    outline: { id: d.room.code, building: 'your sandbox', floor: 0, number: '', name: d.room.name, archetype, capacity: d.room.occupancy, dims: [Number(g.widthM) || 0, Number(g.lengthM) || 0, Number(g.ceiling) || 0], kind: 'designed', intent: d.room.intendedUse, source: 'the server (your sandbox)', aliases: [] },
    archetypeName: archetype, design, analysis, positions, connections: d.connections, installations: [], lifecycle: d.room.lifecycle as RoomLifecycle, nextStep: null, events: [], baselines: [], issues: [], findings: analysis.checks, coverage: [],
    counts: resultCounts(analysis.applicability.rows, {}), reopened: [], geometryProvenance: 'DECLARED',
  };
}

/** The server's field record in the shape the page reads. One mounting per device (the current version); a sandbox keeps no photographs. */
export function toFieldState(f: FieldDto, t: Thread | null): FieldState {
  return {
    v: 1,
    mount: Object.fromEntries(f.devices.filter((d) => d.mounting).map((d) => { const m = d.mounting!; return [d.asset, [{ method: m.method, heightM: m.heightM, fixing: m.fixing || '', backing: m.backing || '', tether: (['yes', 'no', 'n/a'].includes(String(m.tether)) ? m.tether : 'n/a') as 'yes' | 'no' | 'n/a', note: m.note || '', by: m.by, at: m.at }]]; })),
    hookups: f.hookups.filter((h) => !h.removed).map((h) => ({ id: h.hookup, device: h.device || '', port: h.port, to: h.to || '', toPort: h.toPort || '', cable: h.cable || '', by: h.by, at: h.at })),
    moves: f.moves.map((m) => ({ id: m.move, device: m.device || '', from: m.from, to: m.to, reason: m.reason, note: m.note || '', photo: null, by: m.by, at: m.at, state: m.state, ...(m.decidedBy ? { decidedBy: m.decidedBy, decidedAt: m.decidedAt || undefined, decision: m.decision || undefined } : {}) })),
    markups: f.markups.map((k) => ({ id: k.markup, x: k.x, y: k.y, text: k.text, by: k.by, at: k.at, state: k.state, ...(k.resolvedBy ? { resolvedBy: k.resolvedBy, resolution: k.resolution || '' } : {}) })),
    // the server's audit history of this room, latest first: who did what, allowed and refused (the page shows what the server kept, not a copy made here)
    log: (t?.audit.latest || []).map((e) => ({ at: e.at, by: e.actor_role || 'system', what: `${e.action} · ${e.aggregate_type} ${e.aggregate_id}`, outcome: (e.outcome === 'DENIED' ? 'DENIED' : 'ALLOWED') as 'ALLOWED' | 'DENIED' })),
  };
}

/** The server's record behind the page's interface. Every action is one request as `role`; the record is read again after it, refused or not. */
export function serverSource(c: Connected, room: string, role: string, f0: FieldDto, t0: Thread | null, readOnly: boolean): FieldSource {
  let dto = f0; let state = toFieldState(f0, t0); let may = { record: !readOnly && f0.writable && f0.may.record, decide: !readOnly && f0.writable && f0.may.decide };
  const reload = async () => {
    const [f, t] = await Promise.all([c.call<FieldDto>(role, 'GET', `/v1/rooms/${room}/field-record`), c.call<Thread>(role, 'GET', `/v1/rooms/${room}/thread`)]);
    if (f.ok) { dto = f.body; state = toFieldState(f.body, t.ok ? t.body : null); may = { record: !readOnly && f.body.writable && f.body.may.record, decide: !readOnly && f.body.writable && f.body.may.decide }; }
  };
  const act = async (method: string, path: string, body: unknown): Promise<Result> => {
    try {
      const a = await c.call(role, method, `/v1/rooms/${room}/field-record${path}`, body);
      await reload();   // a refusal is in the server's history too, so the record is read again either way
      return a.ok ? { ok: true, state } : { ok: false, why: [`Refused by the server (${a.status}): ${a.detail}`, ...a.reasons] };
    } catch (e) { return { ok: false, why: [e instanceof SandboxGone ? `The sandbox is no longer there (${e.message}). Open a new one from the connected page.` : 'The server did not answer. Nothing was recorded.'] }; }
  };
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    where: 'server', read: () => state, get may() { return may; }, actingAs: personaLabel(role),
    facts: {
      // the two device counts are rows of the server's answer counted, not a rule applied: a device with a recorded hookup; a device the design connects that has none
      stats: () => ({ devices: dto.stats.devices, mounted: dto.stats.mounted, hookups: dto.stats.hookups, notInDesign: dto.stats.notInDesign, proposed: dto.stats.moves.proposed, approved: dto.stats.moves.approved, openNotes: dto.stats.notes.open,
        devicesHooked: dto.devices.filter((d) => d.hookups.length > 0).length, needHookup: dto.devices.filter((d) => d.designedConnections.length > 0 && d.hookups.length === 0).length }),
      asDesigned: (hookup) => !!dto.hookups.find((h) => h.hookup === hookup)?.asDesigned,
      recheck: (device) => (dto.devices.find((d) => d.asset === device)?.recheck || []).map((x) => (typeof x === 'string' ? x : String(x.test || x.id || ''))).filter(Boolean),
    },
    recordMounting: (device, m) => act('PUT', `/mounting/${encodeURIComponent(device)}`, { method: m.method, heightM: num(m.heightM), fixing: m.fixing || '', backing: m.backing || '', tether: m.tether || 'n/a', note: m.note || '' }),
    recordHookup: (h) => act('POST', '/hookups', { device: h.device, port: h.port, to: h.to, toPort: h.toPort || '', cable: h.cable || '' }),
    proposeMove: (m) => act('POST', '/moves', { device: m.device, x: m.x, y: m.y, reason: m.reason, note: m.note || '' }),
    decideMove: (id, approve, decision) => act('POST', `/moves/${encodeURIComponent(id)}/decide`, { approve, decision: decision || '' }),
    addMarkup: (m) => act('POST', '/markups', m),
    resolveMarkup: (id, resolution) => act('POST', `/markups/${encodeURIComponent(id)}/resolve`, { resolution }),
  };
}

type Phase = { is: 'reading' } | { is: 'none'; why: string } | { is: 'other'; room: string } | { is: 'refused'; why: string } | { is: 'ready'; rec: RoomRecord; source: FieldSource; stoodIn: boolean };

/** Reads the sandbox's room and its field record from the server, then hands both to the page. Says plainly when it cannot. */
export function ServerRoom({ roomId, persona, children }: { roomId: string; persona: string; children: (r: RoomRecord, source: FieldSource, note: ReactNode) => ReactNode }) {
  const c = useMemo(() => connected(), []); const [p, setP] = useState<Phase>({ is: 'reading' });
  useEffect(() => { let alive = true; const set = (x: Phase) => { if (alive) setP(x); }; setP({ is: 'reading' });
    void (async () => {
      const sb = c.sandbox();
      if (!sb) return set({ is: 'none', why: '' });
      if (sb.room !== roomId) return set({ is: 'other', room: sb.room });
      const read = async (role: string) => Promise.all([c.call<RoomDetail>(role, 'GET', `/v1/rooms/${roomId}`), c.call<FieldDto>(role, 'GET', `/v1/rooms/${roomId}/field-record`), c.call<Thread>(role, 'GET', `/v1/rooms/${roomId}/thread`)]);
      try {
        // the sandbox has fifteen people; a perspective that is none of them (the Product Architect, for one) reads as its Executive and records nothing
        let role = persona; let got: Awaited<ReturnType<typeof read>>;
        try { got = await read(role); } catch (e) { if (e instanceof SandboxGone) throw e; role = 'exec'; got = await read(role); }
        const [d, f, t] = got;
        if (!d.ok || !f.ok) return set({ is: 'refused', why: `The server answered ${!d.ok ? d.status : f.status}: ${!d.ok ? d.detail : f.detail}` });
        set({ is: 'ready', rec: recordFromServer(d.body), source: serverSource(c, roomId, role, f.body, t.ok ? t.body : null, role !== persona), stoodIn: role !== persona });
      } catch (e) { set(e instanceof SandboxGone ? { is: 'none', why: e.message } : { is: 'refused', why: 'The server did not answer.' }); }
    })();
    return () => { alive = false; }; }, [c, roomId, persona]);

  if (p.is === 'ready') return <>{children(p.rec, p.source, p.stoodIn ? <>Your sandbox has no {personaLabel(persona)}. The record is shown as its Executive reads it; to record, view as the Installer, and to decide a move, as the Systems Engineer.</> : null)}</>;
  return (
    <section className="wk" data-testid="field-redline" data-source="server" data-state={p.is}>
      {p.is === 'reading' ? <p className="ui-muted" role="status">Reading the room from the server…</p>
        : p.is === 'none' ? <Notice tone="info"><b>{roomId} is not a campus room.</b> {p.why ? `The sandbox it belonged to is no longer there (${p.why}). ` : ''}If it is the room of a sandbox on the server, <a href="#/connected">open or resume your sandbox</a> first.</Notice>
          : p.is === 'other' ? <Notice tone="info"><b>{roomId} is not the room of your sandbox.</b> Your sandbox’s room is <a href={`#/install/redline?room=${p.room}`}>{p.room}</a>.</Notice>
            : <Notice tone="warn"><b>The room could not be read.</b> {p.why} <a href="#/connected">The connected page</a> shows whether the server is answering.</Notice>}
    </section>
  );
}
