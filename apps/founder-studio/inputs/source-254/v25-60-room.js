// ---------------------------------------------------------------- V2.5.3 · Build a Room with Empathia Lite — the engine (owner directive 2026-10-24)
// One room, one canonical identity, one versioned design and evidence history, many authorized experiences.
//
// A RoomDesign record is the canonical design of one room. It owns:
//   * the room's identity in Core: a PlannedRoom (id R-PLN-…) until the room is OPERATIONAL, then a Room with the same id;
//   * one asset record per proposed device (id PA-…), joined into Core as a PlannedAsset — the same id Search Party, Drawing
//     Intelligence, commissioning and Pro all reference (owner focus 1). A swap changes the model on that asset and keeps its history;
//   * geometry with per-dimension provenance (DECLARED / MODELED / PHOTO_INFERRED / EXTRACTED_UNREVIEWED / ENGINEER_APPROVED), in metres;
//   * proposed connections (network, signal, control, power) — PROPOSED until observed;
//   * a suggested and an approved classification (an override needs an engineer, a reason and leaves an audit record);
//   * immutable revision snapshots, a drawing set, the commissioning applicability and the room issues (RoomIssue records).
// Every service checks the signed-in persona's authority itself and writes history and a ledger event. Nothing here is measured:
// geometry is declared or modeled, coverage is a MODELED hypothesis, catalog values are DECLARED, every applicable commissioning test
// needs physical execution and evidence — nothing passes because a design looks right. A front-end demonstration, not production security.

Object.assign(V25_PREFIX, { RoomDesign: 'RDES', RoomIssue: 'RISS', DrawingSet: 'DSET' });
for (const t of ['RoomDesign', 'RoomIssue', 'DrawingSet']) { if (!V25_TYPES.includes(t)) V25_TYPES.push(t); V25_ENTITY[t] = AZ_KEYS.filter((r) => r !== 'visitor' && r !== 'employee'); }
Object.assign(TYPES, { PlannedRoom: ['Planned room', 'Planned rooms', 'room'], PlannedAsset: ['Planned device', 'Planned devices', 'device'], RoomDesignRevision: ['Room design revision', 'Room design revisions', 'project'],
  PlannedDrawing: ['Drawing (room design)', 'Drawings (room design)', 'doc'], PlannedCxPlan: ['Commissioning plan (planned room)', 'Commissioning plans (planned rooms)', 'commission'], RoomIssue: ['Room issue', 'Room issues', 'issue'] });
Object.assign(RELS, { PLANS_DEVICE: ['plans device', 'planned in'], PROPOSED_LINK: ['has a proposed connection to', 'has a proposed connection from'], DESIGN_OF: ['is a design of', 'is designed by'], DRAWING_OF: ['is a drawing of', 'is drawn by'], CX_PLAN_OF: ['is the commissioning plan of', 'is commissioned by'], ISSUE_ON: ['is an issue on', 'has issue'], REFERENCES_ASSET: ['references', 'is referenced by'] });
for (const t of ['PlannedRoom', 'PlannedAsset', 'RoomIssue']) if (!SEARCH_TYPES.includes(t)) SEARCH_TYPES.push(t);
Object.assign(AZ_ENTITY, { PlannedRoom: AZ_STAFF, PlannedAsset: AZ_STAFF.filter((r) => r !== 'employee'), RoomDesignRevision: AZ_STAFF.filter((r) => r !== 'employee'), PlannedDrawing: AZ_STAFF.filter((r) => r !== 'employee'), PlannedCxPlan: AZ_STAFF.filter((r) => r !== 'employee'), RoomIssue: AZ_STAFF.filter((r) => r !== 'employee') });

const V25_ROOM_LIFECYCLE = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
const V25_ROOM_UNITS = { m: { label: 'metres', toM: 1 }, ft: { label: 'feet', toM: 0.3048 } };
const v25RoomToM = (v, u) => Math.round(Number(v) * (V25_ROOM_UNITS[u] || V25_ROOM_UNITS.m).toM * 1000) / 1000;
const v25RoomFromM = (m, u) => Math.round((Number(m) / (V25_ROOM_UNITS[u] || V25_ROOM_UNITS.m).toM) * 100) / 100;
/** feet-and-inches text (e.g. 24' 6") → metres; plain numbers are read in the given unit */
function v25RoomParseLen(s, unit) { const t = String(s == null ? '' : s).trim(); const fi = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?$/i); if (fi) return Math.round((Number(fi[1]) * 0.3048 + Number(fi[2] || 0) * 0.0254) * 1000) / 1000; const n = Number(t); return Number.isFinite(n) && n > 0 ? v25RoomToM(n, unit) : null; }

// ---------------------------------------------------------------- equipment catalog: generic sample objects and synthetic catalog models
/** Categories. `cat` points at the Core device category where one exists (its fictional brand and models come from CATS); categories
 *  with no Core counterpart are generic-only. Characteristics are DECLARED catalog values for the demonstration, never verified. */
const V25_ROOM_CATS = {
  display: { label: 'Display', group: 'Display', cat: 'display', mount: 'wall', size: [1.65, 0.12], z: 1.2, net: true, poe: 0, sig: 'sink', props: { diagonal_in: 75 } },
  ledwall: { label: 'LED wall', group: 'Display', cat: 'ledwall', mount: 'wall', size: [4.8, 0.2], z: 2.2, net: true, poe: 0, sig: 'sink', props: { width_m: 4.8 } },
  projector: { label: 'Projector', group: 'Display', mount: 'ceiling', size: [0.5, 0.4], z: 2.7, net: true, poe: 0, sig: 'sink', props: { lumens: 7000 } },
  camera: { label: 'Camera', group: 'Video', cat: 'camera', mount: 'wall', size: [0.2, 0.2], z: 1.8, net: true, poe: 25.5, sig: 'source', props: { fov_deg: 70, zoom_x: 12 } },
  bar: { label: 'Video bar', group: 'Video', cat: 'bar', mount: 'wall', size: [0.9, 0.1], z: 1.0, net: true, poe: 0, sig: 'source', props: { fov_deg: 110, pickup_m: 4.5 } },
  micceil: { label: 'Ceiling microphone', group: 'Audio', cat: 'micceil', mount: 'ceiling', size: [0.6, 0.6], z: 2.7, net: true, poe: 12.9, sig: 'source', props: { pickup_m: 3.5, protocol: 'network audio' } },
  mictable: { label: 'Table microphone', group: 'Audio', mount: 'table', size: [0.15, 0.15], z: 0.75, net: true, poe: 4, sig: 'source', props: { pickup_m: 1.5, protocol: 'network audio' } },
  micwireless: { label: 'Wireless microphone system', group: 'Audio', cat: 'micwireless', mount: 'rack', size: [0.45, 0.3], z: 1.0, net: true, poe: 0, sig: 'source', props: { channels: 4, protocol: 'network audio' } },
  speaker: { label: 'Loudspeaker', group: 'Audio', cat: 'speaker', mount: 'ceiling', size: [0.3, 0.3], z: 2.7, net: false, poe: 0, sig: 'sink', props: { coverage_m: 4 } },
  dsp: { label: 'Audio processor (DSP)', group: 'Audio', cat: 'dsp', mount: 'rack', size: [0.45, 0.3], z: 1.2, net: true, poe: 0, sig: 'processor', props: { inputs: 12, protocol: 'network audio' } },
  amp: { label: 'Amplifier', group: 'Audio', cat: 'amp', mount: 'rack', size: [0.45, 0.3], z: 0.9, net: true, poe: 0, sig: 'processor', props: { channels: 4 } },
  compute: { label: 'UC room compute', group: 'Compute', cat: 'compute', mount: 'rack', size: [0.3, 0.2], z: 0.6, net: true, poe: 0, sig: 'processor', props: { usb_ports: 4 } },
  switch: { label: 'Network switch', group: 'Network', mount: 'rack', size: [0.45, 0.3], z: 1.5, net: true, poe: 0, sig: 'none', props: { ports: 24, poe_budget_w: 370 } },
  control: { label: 'Control processor', group: 'Control', cat: 'control', mount: 'rack', size: [0.45, 0.3], z: 1.4, net: true, poe: 0, sig: 'none', props: {} },
  touch: { label: 'Touch panel', group: 'Control', cat: 'touch', mount: 'table', size: [0.25, 0.18], z: 0.75, net: true, poe: 12.9, sig: 'none', props: {} },
  scheduler: { label: 'Scheduling panel', group: 'Control', cat: 'scheduler', mount: 'wall', size: [0.22, 0.05], z: 1.4, net: true, poe: 12.9, sig: 'none', props: {} },
  switcher: { label: 'Video switcher', group: 'Video', cat: 'switcher', mount: 'rack', size: [0.45, 0.3], z: 1.1, net: true, poe: 0, sig: 'processor', props: { inputs: 8 } },
  encoder: { label: 'Stream encoder', group: 'Video', cat: 'encoder', mount: 'rack', size: [0.45, 0.3], z: 1.0, net: true, poe: 0, sig: 'processor', props: {} },
  rack: { label: 'Equipment rack', group: 'Infrastructure', mount: 'floor', size: [0.6, 0.8], z: 0, net: false, poe: 0, sig: 'none', props: { units: 24 } },
  pdu: { label: 'Power distribution unit', group: 'Infrastructure', cat: 'pdu', mount: 'rack', size: [0.45, 0.1], z: 0.2, net: true, poe: 0, sig: 'none', props: { outlets: 8 } },
  lighting: { label: 'Lighting control', group: 'Building', mount: 'wall', size: [0.12, 0.05], z: 1.2, net: true, poe: 0, sig: 'none', props: {} },
  occsensor: { label: 'Occupancy sensor', group: 'Building', cat: 'sensor', mount: 'ceiling', size: [0.12, 0.12], z: 2.7, net: true, poe: 4, sig: 'none', props: {} },
  seccam: { label: 'Security camera', group: 'Security', mount: 'ceiling', size: [0.15, 0.15], z: 2.7, net: true, poe: 12.9, sig: 'none', props: {} },
  iot: { label: 'IoT device', group: 'Building', mount: 'wall', size: [0.1, 0.1], z: 1.2, net: true, poe: 4, sig: 'none', props: {} },
  hvac: { label: 'HVAC element (diffuser / thermostat)', group: 'Building', mount: 'ceiling', size: [0.6, 0.6], z: 2.7, net: false, poe: 0, sig: 'none', props: {} },
  table: { label: 'Table', group: 'Furniture', mount: 'floor', size: [3.6, 1.2], z: 0, net: false, poe: 0, sig: 'none', furniture: true, props: {} },
  chairs: { label: 'Seating block', group: 'Furniture', mount: 'floor', size: [2.4, 1.0], z: 0, net: false, poe: 0, sig: 'none', furniture: true, props: { seats: 6 } },
  lectern: { label: 'Lectern', group: 'Furniture', mount: 'floor', size: [0.6, 0.5], z: 0, net: false, poe: 0, sig: 'none', furniture: true, props: {} },
};
/** Catalog models for a category: the synthetic catalog's fictional makers (CATS), plus the generic sample object every category has. */
function v25RoomModels(cat) { const C = V25_ROOM_CATS[cat]; if (!C) return []; const out = [{ key: 'generic', brand: null, model: null, generic: true, label: `Generic ${C.label.toLowerCase()} (sample object)` }]; const core = C.cat && CATS[C.cat];
  if (core) for (const m of core.models) out.push({ key: `${core.brand} ${m}`, brand: core.brand, model: m, generic: false, label: `${core.brand} ${m} (synthetic catalog model)` }); return out; }

// ---------------------------------------------------------------- room templates (illustrative: not code-compliant or approved designs)
/** dims in metres; devices as [category, x-fraction, y-fraction, rotation, mount override]; furniture the same. Positions are fractions of the room. */
const V25_ROOM_TEMPLATES = {
  huddle: { label: 'Huddle Room', arch: 'HUD', use: 'Small-team hybrid meetings', dims: [3.6, 3.0, 2.7], occ: 4, items: [['table', 0.5, 0.55, 0], ['chairs', 0.5, 0.78, 0], ['display', 0.5, 0.02, 0], ['bar', 0.5, 0.04, 0], ['compute', 0.9, 0.1, 0], ['touch', 0.5, 0.5, 0], ['scheduler', 0.98, 0.9, 90]], considerations: ['Keep the far seat within the video bar\'s pickup range.', 'Glass walls raise reverberation: consider absorption.'] },
  small_conf: { label: 'Small Conference Room', arch: 'COL', use: 'Team meetings with remote participants', dims: [5.0, 3.8, 2.7], occ: 6, items: [['table', 0.5, 0.55, 0], ['chairs', 0.5, 0.82, 0], ['display', 0.5, 0.02, 0], ['camera', 0.5, 0.04, 0], ['micceil', 0.5, 0.55, 0], ['speaker', 0.5, 0.3, 0], ['dsp', 0.92, 0.12, 0], ['compute', 0.92, 0.2, 0], ['touch', 0.5, 0.5, 0], ['switch', 0.92, 0.28, 0]], considerations: ['One ceiling microphone typically covers a six-seat table; confirm with the modeled reach.'] },
  medium_conf: { label: 'Medium Conference Room', arch: 'COL', use: 'Hybrid meetings for 8–12 people', dims: [7.0, 5.0, 2.8], occ: 10, items: [['table', 0.5, 0.55, 0], ['chairs', 0.3, 0.82, 0], ['chairs', 0.7, 0.82, 0], ['display', 0.5, 0.02, 0], ['camera', 0.5, 0.04, 0], ['micceil', 0.35, 0.55, 0], ['micceil', 0.65, 0.55, 0], ['speaker', 0.3, 0.3, 0], ['speaker', 0.7, 0.3, 0], ['dsp', 0.94, 0.1, 0], ['amp', 0.94, 0.16, 0], ['compute', 0.94, 0.22, 0], ['touch', 0.5, 0.5, 0], ['switch', 0.94, 0.28, 0]], considerations: ['Two microphone zones; check the modeled overlap above the table.'] },
  boardroom: { label: 'Boardroom', arch: 'BRD', use: 'Leadership and customer meetings', dims: [9.0, 5.5, 3.0], occ: 18, items: [['table', 0.5, 0.55, 0], ['chairs', 0.3, 0.85, 0], ['chairs', 0.7, 0.85, 0], ['chairs', 0.5, 0.25, 0], ['display', 0.38, 0.02, 0], ['display', 0.62, 0.02, 0], ['camera', 0.5, 0.04, 0], ['camera', 0.5, 0.97, 180], ['micceil', 0.33, 0.55, 0], ['micceil', 0.67, 0.55, 0], ['speaker', 0.25, 0.3, 0], ['speaker', 0.75, 0.3, 0], ['dsp', 0.95, 0.1, 0], ['amp', 0.95, 0.16, 0], ['compute', 0.95, 0.22, 0], ['control', 0.95, 0.28, 0], ['touch', 0.5, 0.5, 0], ['switch', 0.95, 0.34, 0], ['rack', 0.95, 0.2, 0]], considerations: ['Every seat should be inside a modeled camera view; a second camera covers the head of the table.'] },
  executive: { label: 'Executive Conference Room', arch: 'EXE', use: 'Executive collaboration', dims: [8.0, 5.0, 3.0], occ: 12, items: [['table', 0.5, 0.55, 0], ['chairs', 0.35, 0.82, 0], ['chairs', 0.65, 0.82, 0], ['display', 0.5, 0.02, 0], ['camera', 0.5, 0.04, 0], ['micceil', 0.35, 0.55, 0], ['micceil', 0.65, 0.55, 0], ['speaker', 0.3, 0.3, 0], ['speaker', 0.7, 0.3, 0], ['dsp', 0.95, 0.1, 0], ['compute', 0.95, 0.2, 0], ['control', 0.95, 0.28, 0], ['touch', 0.5, 0.5, 0], ['switch', 0.95, 0.34, 0]], considerations: ['Privacy: the camera should not see the corridor glass.'] },
  training: { label: 'Training / Classroom', arch: 'TRN', use: 'Teaching in-room and remote learners', dims: [11.0, 8.0, 3.0], occ: 30, items: [['lectern', 0.5, 0.12, 0], ['chairs', 0.3, 0.5, 0], ['chairs', 0.7, 0.5, 0], ['chairs', 0.3, 0.75, 0], ['chairs', 0.7, 0.75, 0], ['display', 0.3, 0.02, 0], ['display', 0.7, 0.02, 0], ['camera', 0.5, 0.97, 180], ['camera', 0.5, 0.04, 0], ['micceil', 0.3, 0.6, 0], ['micceil', 0.7, 0.6, 0], ['micwireless', 0.95, 0.12, 0], ['speaker', 0.25, 0.4, 0], ['speaker', 0.75, 0.4, 0], ['dsp', 0.95, 0.06, 0], ['amp', 0.95, 0.18, 0], ['compute', 0.95, 0.24, 0], ['touch', 0.5, 0.14, 0], ['switch', 0.95, 0.3, 0]], considerations: ['Questions from the room must be audible to remote learners: ceiling microphones over the audience.'] },
  townhall: { label: 'Town Hall / Multipurpose Space', arch: 'TWN', use: 'All-hands and events with a remote audience', dims: [24.0, 18.0, 6.0], occ: 220, items: [['lectern', 0.5, 0.1, 0], ['chairs', 0.3, 0.45, 0], ['chairs', 0.7, 0.45, 0], ['chairs', 0.3, 0.65, 0], ['chairs', 0.7, 0.65, 0], ['chairs', 0.3, 0.85, 0], ['chairs', 0.7, 0.85, 0], ['ledwall', 0.5, 0.01, 0], ['display', 0.15, 0.02, 0], ['display', 0.85, 0.02, 0], ['camera', 0.5, 0.97, 180], ['camera', 0.2, 0.9, 160], ['camera', 0.8, 0.9, 200], ['micwireless', 0.95, 0.08, 0], ['micceil', 0.35, 0.55, 0], ['micceil', 0.65, 0.55, 0], ['speaker', 0.2, 0.25, 0], ['speaker', 0.8, 0.25, 0], ['speaker', 0.2, 0.7, 0], ['speaker', 0.8, 0.7, 0], ['dsp', 0.97, 0.15, 0], ['amp', 0.97, 0.2, 0], ['amp', 0.97, 0.25, 0], ['compute', 0.97, 0.3, 0], ['switcher', 0.97, 0.35, 0], ['encoder', 0.97, 0.4, 0], ['control', 0.97, 0.45, 0], ['touch', 0.5, 0.12, 0], ['switch', 0.97, 0.5, 0], ['rack', 0.97, 0.3, 0]], considerations: ['Reverberation in a large flat-ceiling space needs an acoustic protocol (RT60 and STIPA).', 'Broadcast feed needs a dedicated encoder path.'] },
  auditorium: { label: 'Auditorium', arch: 'TWN', sub: 'auditorium', use: 'Fixed-seat presentations and lectures', dims: [26.0, 20.0, 7.0], occ: 300, items: [['lectern', 0.5, 0.1, 0], ['chairs', 0.5, 0.5, 0], ['chairs', 0.5, 0.75, 0], ['ledwall', 0.5, 0.01, 0], ['camera', 0.5, 0.97, 180], ['micwireless', 0.95, 0.08, 0], ['speaker', 0.25, 0.3, 0], ['speaker', 0.75, 0.3, 0], ['dsp', 0.97, 0.15, 0], ['amp', 0.97, 0.2, 0], ['compute', 0.97, 0.25, 0], ['switch', 0.97, 0.3, 0]], considerations: ['Sightlines from the back row to the screen set the screen size.'] },
  studio: { label: 'Broadcast / Production Studio', arch: 'STU', use: 'Recorded and streamed presentations', dims: [8.0, 6.0, 3.5], occ: 8, items: [['lectern', 0.5, 0.4, 0], ['camera', 0.3, 0.9, 180], ['camera', 0.5, 0.92, 180], ['camera', 0.7, 0.9, 180], ['micwireless', 0.95, 0.1, 0], ['display', 0.5, 0.02, 0], ['speaker', 0.5, 0.2, 0], ['dsp', 0.95, 0.2, 0], ['switcher', 0.95, 0.3, 0], ['encoder', 0.95, 0.4, 0], ['compute', 0.95, 0.5, 0], ['switch', 0.95, 0.6, 0]], considerations: ['Lighting control matters for picture quality; it is a building-system dependency.'] },
  collab: { label: 'Collaboration Space', arch: 'COL', sub: 'open collaboration', use: 'Drop-in collaboration', dims: [6.0, 5.0, 2.8], occ: 8, items: [['table', 0.5, 0.6, 0], ['display', 0.5, 0.02, 0], ['bar', 0.5, 0.04, 0], ['compute', 0.9, 0.1, 0], ['touch', 0.5, 0.55, 0]], considerations: ['Open spaces leak sound: speech privacy is an assumption to confirm.'] },
  open_office: { label: 'Open Office', arch: null, sub: 'open office', use: 'Desk work; occasional calls at the desk', dims: [20.0, 12.0, 2.8], occ: 40, items: [['occsensor', 0.3, 0.5, 0], ['occsensor', 0.7, 0.5, 0], ['lighting', 0.02, 0.5, 90], ['iot', 0.5, 0.02, 0], ['switch', 0.98, 0.1, 0]], considerations: ['No room AV: building systems only. Classification will say so.'] },
  private_office: { label: 'Private Office', arch: 'FOC', sub: 'private office', use: 'One person, calls at the desk', dims: [3.5, 3.0, 2.7], occ: 1, items: [['table', 0.5, 0.6, 0], ['display', 0.5, 0.02, 0], ['bar', 0.5, 0.04, 0]], considerations: [] },
  lobby: { label: 'Lobby / Reception', arch: null, sub: 'lobby', use: 'Arrival, wayfinding and signage', dims: [12.0, 9.0, 4.0], occ: 20, items: [['display', 0.5, 0.02, 0], ['seccam', 0.1, 0.1, 45], ['seccam', 0.9, 0.9, 225], ['occsensor', 0.5, 0.5, 0], ['switch', 0.98, 0.1, 0]], considerations: ['Signage content and security cameras belong to other owners: record them as dependencies.'] },
  idf: { label: 'Equipment / IDF Room', arch: 'CTL', sub: 'network closet', use: 'Network and AV equipment', dims: [3.0, 2.5, 2.7], occ: 0, items: [['rack', 0.5, 0.3, 0], ['switch', 0.5, 0.3, 0], ['pdu', 0.5, 0.35, 0], ['hvac', 0.5, 0.7, 0]], considerations: ['Cooling and power capacity are building-system context, not modeled here.'] },
  custom: { label: 'Custom / Other', arch: null, use: '', dims: [6.0, 4.0, 2.7], occ: 6, items: [], considerations: [] },
};

// ---------------------------------------------------------------- helpers
const v25RoomDesign = (id) => { const r = v25Get(id); return r && r.type === 'RoomDesign' ? r : null; };
const v25RoomDeny = (why, route) => { try { v25Emit('security.access_denied', { aggregateType: 'Policy', aggregateId: 'policy', aggregateRevision: 1, route: route || 'api:room', role: S.role, reason: why }, { idempotencyKey: `deny:room:${route}:${v25State().events.length}` }); } catch (e) { /* recorded best-effort */ } return { ok: false, why: [why] }; };
const v25RoomEmit = (type, d, payload, key) => v25Emit(type, Object.assign({ aggregateType: 'RoomDesign', aggregateId: d.id, aggregateRevision: d.rev, designId: d.id, roomId: d.coreRoomId }, payload), key ? { idempotencyKey: key } : {});
/** The faults the Private Engineer Edition can inject (failure scenarios must fail loudly, never succeed silently). */
const v25RoomFaults = () => (v25State().roomFaults || (v25State().roomFaults = {}));
function v25RoomGuard(d, need, route) {
  if (!d) return v25RoomDeny('no such room design in this tenant', route);
  if (d.tenant && d.tenant !== V25_TENANT) return v25RoomDeny('another tenant: refused', route);
  if (!v25CanSee(d)) return v25RoomDeny(`${d.id} is outside your scope`, route);
  if (need && !v25Can(need)) return v25RoomDeny(`${v25PersonaLabel()} cannot sign ${need}`, route);
  return null;
}
const v25RoomState = (d) => JSON.parse(JSON.stringify({ geometry: d.geometry, devices: d.devices, connections: d.connections, unit: d.unit, deviceSeq: d.deviceSeq, connSeq: d.connSeq }));
/** Undo / redo: the state before each change is kept (50 steps); an undo is itself a recorded change, never a silent rewrite of history. */
function v25RoomUndo(designId, dir) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.undo'); if (g) return g; if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  const from = dir === 'redo' ? (d.redo || []) : (d.undo || []); if (!from.length) return { ok: false, why: [`nothing to ${dir === 'redo' ? 'redo' : 'undo'}`] }; const to = dir === 'redo' ? (d.undo || (d.undo = [])) : (d.redo || (d.redo = []));
  const step = from.pop(); to.push({ reason: step.reason, state: v25RoomState(d) }); Object.assign(d, JSON.parse(JSON.stringify(step.state)));
  d.history.push({ rev: d.rev, at: v25Now(), by: v25Persona(), reason: `${dir === 'redo' ? 'redo' : 'undo'}: ${step.reason}`, before: {} }); d.rev += 1; d.updatedAt = v25Now();
  v25RoomEmit('room.geometry_updated', d, { revision: d.revisions.length, undo: dir || 'undo', step: step.reason }); v25RoomAnalyze(d, `${dir === 'redo' ? 'redo' : 'undo'}: ${step.reason}`); return { ok: true, design: d };
}
const v25RoomBefore = (d, reason) => { (d.undo || (d.undo = [])).push({ reason, state: v25RoomState(d) }); if (d.undo.length > 50) d.undo.shift(); d.redo = []; };
const v25RoomHist = (d, reason, before) => { d.history.push({ rev: d.rev, at: v25Now(), by: v25Persona(), reason, before: before || {} }); d.rev += 1; d.updatedAt = v25Now(); };
const v25RoomArea = (d) => { const p = d.geometry.points; let a = 0; for (let i = 0; i < p.length; i += 1) { const [x1, y1] = p[i]; const [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.round(Math.abs(a / 2) * 100) / 100; };
const v25RoomBox = (d) => { const xs = d.geometry.points.map((p) => p[0]); const ys = d.geometry.points.map((p) => p[1]); return { w: Math.max(...xs) - Math.min(...xs), l: Math.max(...ys) - Math.min(...ys) }; };
function v25RoomInside(d, x, y) { const p = d.geometry.points; let inside = false; for (let i = 0, j = p.length - 1; i < p.length; j = i, i += 1) { const [xi, yi] = p[i]; const [xj, yj] = p[j]; if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi)) inside = !inside; } return inside; }
const v25RoomRect = (w, l) => [[0, 0], [w, 0], [w, l], [0, l]];
/** A drawn outline: 3 to 40 corners in metres, no crossing or touching edges, at least 2 m² and within 200 m. Repeated consecutive corners
 *  (a closing click on the first corner included) are dropped. The outline is shifted so its lowest corner is at 0,0; the shift is returned. */
function v25RoomPolyCheck(points) {
  if (!Array.isArray(points)) return { why: 'an outline is a list of corners' };
  let p = points.map((q) => [Number(q && q[0]), Number(q && q[1])]);
  if (p.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return { why: 'every corner needs two numbers in metres' };
  p = p.filter((q, i) => { const n = p[(i + 1) % p.length]; return i === p.length - 1 ? Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) > 0.01 : Math.hypot(q[0] - n[0], q[1] - n[1]) > 0.01; });
  if (p.length < 3 || p.length > 40) return { why: `an outline needs 3 to 40 distinct corners (${p.length} given)` };
  const mx = Math.min(...p.map((q) => q[0])); const my = Math.min(...p.map((q) => q[1])); const r3 = (v) => Math.round(v * 1000) / 1000;
  const pts = p.map(([x, y]) => [r3(x - mx), r3(y - my)]); const w = Math.max(...pts.map((q) => q[0])); const l = Math.max(...pts.map((q) => q[1]));
  if (w < 0.5 || l < 0.5 || w > 200 || l > 200) return { why: `the outline is ${w} m by ${l} m: each side of its extent must be between 0.5 m and 200 m` };
  const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const onSeg = (a, b, c) => Math.min(a[0], b[0]) - 1e-9 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 && Math.min(a[1], b[1]) - 1e-9 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9;
  const cross = (a, b, c, e) => { const o1 = orient(a, b, c); const o2 = orient(a, b, e); const o3 = orient(c, e, a); const o4 = orient(c, e, b); if (o1 !== o2 && o3 !== o4) return true; return (o1 === 0 && onSeg(a, b, c)) || (o2 === 0 && onSeg(a, b, e)) || (o3 === 0 && onSeg(c, e, a)) || (o4 === 0 && onSeg(c, e, b)); };
  const n = pts.length;
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) { if (j === i + 1 || (i === 0 && j === n - 1)) continue; if (cross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return { why: `edges ${i + 1} and ${j + 1} cross or touch: an outline must not cross itself` }; }
  let a = 0; for (let i = 0; i < n; i += 1) { const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % n]; a += x1 * y2 - x2 * y1; } a = Math.abs(a / 2);
  if (a < 2) return { why: `the outline encloses ${a.toFixed(2)} m²: at least 2 m² is needed` };
  return { points: pts, w, l, area: Math.round(a * 100) / 100, shift: [mx, my] };
}
const v25RoomShapes = { rect: (w, l) => v25RoomRect(w, l), lshape: (w, l) => [[0, 0], [w, 0], [w, l * 0.55], [w * 0.6, l * 0.55], [w * 0.6, l], [0, l]] };
const v25RoomFamily = (cat) => ({ camera: 'camera', bar: 'camera', micceil: 'dsp', mictable: 'dsp', micwireless: 'dsp', dsp: 'dsp', speaker: 'dsp', amp: 'dsp', touch: 'touch_panel', control: 'touch_panel', switch: 'network_switch', display: 'display', ledwall: 'display', projector: 'display', lighting: 'lighting', compute: 'uc', scheduler: 'signage' })[cat] || null;

// ---------------------------------------------------------------- create
/** Create a room design: from a template, from dimensions, or from an import (photo / scaled plan). Registers the room, its devices and its
 *  drawing set in the shared graph at once; Search Party and Pro read the same records. */
function v25RoomCreate(input) {
  if (!v25Can('room.design')) return v25RoomDeny(`${v25PersonaLabel()} cannot sign room.design (Designer, Systems Engineer)`, 'api:room.create');
  input = input || {}; const T = V25_ROOM_TEMPLATES[input.template || 'custom'] || V25_ROOM_TEMPLATES.custom; const unit = input.unit === 'ft' ? 'ft' : 'm';
  const faults = v25RoomFaults(); if (faults.missingGeometry && !input.import) return { ok: false, why: ['fault injected: the geometry service returned no dimensions — the room is not created with invented ones'] };
  const prov = {}; const val = (k, i) => { if (input[k] != null && input[k] !== '') { const m = v25RoomParseLen(input[k], unit); if (!m) { prov[k] = 'UNREADABLE'; return null; } if (m) { prov[k] = input.import && input.import.kind === 'plan_image' && k !== 'ceiling' ? 'EXTRACTED_UNREVIEWED' : 'DECLARED'; return m; } } prov[k] = input.import && input.import.kind === 'photo' ? 'PHOTO_INFERRED' : 'MODELED'; return T.dims[i]; };
  const L = val('length', 0); const W = val('width', 1); const H = val('ceiling', 2);
  const bad = ['length', 'width', 'ceiling'].filter((k) => prov[k] === 'UNREADABLE'); if (bad.length) return { ok: false, why: [`${bad.join(', ')}: not readable — use metres, feet, or feet and inches like 24' 6" (nothing is substituted for a value you typed)`] };
  if (!(L > 0.5 && W > 0.5 && H > 1.8 && L < 200 && W < 200 && H < 30)) return { ok: false, why: [`dimensions out of range (length ${L} m, width ${W} m, ceiling ${H} m)`] };
  const outline = input.points != null ? v25RoomPolyCheck(input.points) : null; if (outline && outline.why) return { ok: false, why: [`outline refused: ${outline.why}`] };
  const shape = v25RoomShapes[input.shape] ? input.shape : 'rect'; const points = outline ? outline.points : v25RoomShapes[shape](W, L).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
  const bld = input.buildingKey && get(`B-${input.buildingKey}`) ? input.buildingKey : 'ATL'; const floorN = Number.isFinite(Number(input.floorN)) ? Number(input.floorN) : 1;
  const name = String(input.name || `${T.label} (new)`).slice(0, 80);
  const imp = input.import ? v25RoomImportRecord(input.import) : null;
  const d = v25Create('RoomDesign', { name, state: 'PLANNED', lifecycle: 'PLANNED', template: input.template || 'custom', templateLabel: T.label, intendedUse: String(input.use || T.use || ''), occupancy: Number(input.occupancy) > 0 ? Number(input.occupancy) : T.occ,
    unit, geometry: { shape: outline ? 'polygon' : shape, points, ceiling: H, lengthM: outline ? outline.l : L, widthM: outline ? outline.w : W, provenance: outline ? Object.assign(prov, { length: 'DECLARED', width: 'DECLARED', outline: 'DECLARED' }) : prov, confidence: Object.values(prov).every((p) => p === 'DECLARED' || p === 'ENGINEER_APPROVED') ? 'declared' : 'modeled' },
    site: 'SITE-NIC', buildingKey: bld, floorN, project: String(input.project || ''), devices: [], connections: [], revisions: [], classification: { suggested: null, approved: null, overrides: [] }, imports: imp ? [imp] : [],
    applicability: null, applicabilityHistory: [], drawingSetId: null, issueIds: [], considerations: T.considerations.slice(), assumptions: [], provenance: 'DECLARED', scope: { siteId: 'SITE-NIC', buildingKey: bld } }, v25Persona());
  d.coreRoomId = `R-PLN-${d.id.slice(5)}`; d.scope.roomId = d.coreRoomId;
  const [bw, bl] = [v25RoomBox(d).w, v25RoomBox(d).l];
  for (const [cat, fx, fy, rot, mount] of (input.items === undefined ? T.items : input.items)) v25RoomAddInternal(d, cat, { x: fx * bw, y: fy * bl, rot, mount }, 'template');
  v25RoomAutoConnect(d);
  const set = v25Create('DrawingSet', { name: `Drawings · ${name}`, designId: d.id, state: 'DRAFT', drawings: {}, redlines: [], scope: { siteId: 'SITE-NIC', roomId: d.coreRoomId, buildingKey: bld } }, v25Persona()); d.drawingSetId = set.id;
  v25RoomEmit('room.design_created', d, { template: d.template, unit, shape: d.geometry.shape }, `room.design_created:${d.id}`);
  v25RoomClassify(d, 'created'); v25RoomRevisionSnapshot(d, 'created');
  v25RoomAnalyze(d, 'room created');
  return { ok: true, design: d };
}
function v25RoomImportRecord(im) {
  const kind = ['photo', 'plan_image', 'pdf', 'cad'].includes(im.kind) ? im.kind : 'other';
  const supported = { photo: 'conceptual layout only — no dimensions are taken from a photograph', plan_image: 'scaled plan: dimensions become verified only after the scale and geometry are confirmed', pdf: 'stored as a reference; PDF pages are not rendered or measured here (needs an external tool)', cad: 'NOT SUPPORTED here: DWG / RVT / IFC need external engineering tools; record the file and enter the geometry', other: 'NOT SUPPORTED' }[kind];
  const missing = []; if (kind !== 'plan_image' || !im.scaleConfirmed) missing.push('confirmed dimensions'); if (!im.ceiling) missing.push('ceiling height'); if (kind === 'photo') missing.push('a scaled plan or a survey');
  return { id: `IMP-${v25Hash(`${im.name}|${im.size || 0}|${kind}`).slice(0, 8)}`, name: String(im.name || 'import').slice(0, 120), kind, size: Number(im.size) || 0, sanitized: !!im.sanitized, authorized: !!im.authorized, support: supported, confidence: kind === 'plan_image' && im.scaleConfirmed ? 'scale confirmed' : kind === 'plan_image' ? 'scale not confirmed' : 'low', missing, scale: im.scale || null };
}

// ---------------------------------------------------------------- devices: add, move, swap, remove, duplicate
function v25RoomAddInternal(d, cat, pos, why) {
  const C = V25_ROOM_CATS[cat]; if (!C) return null; const n = (d.deviceSeq = (d.deviceSeq || 0) + 1); const id = v25Id('PA');
  const role = `${C.label} ${d.devices.filter((x) => x.cat === cat && !x.removed).length + 1}`;
  const dev = { id, cat, label: role, role, model: 'generic', generic: true, brand: null, modelName: null, x: Math.round((pos.x || 0) * 100) / 100, y: Math.round((pos.y || 0) * 100) / 100, z: pos.z != null ? pos.z : C.z, rot: Number(pos.rot) || 0, mount: pos.mount || C.mount, props: Object.assign({}, C.props), furniture: !!C.furniture, lifecycle: 'PLANNED', modelHistory: [], addedRev: d.rev, seq: n, provenance: 'DECLARED', note: why || '' };
  d.devices.push(dev); return dev;
}
function v25RoomAdd(designId, cat, pos) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.add'); if (g) return g;
  if (!V25_ROOM_CATS[cat]) return { ok: false, why: [`unknown equipment category ${cat}`] }; if (v25RoomFaults().conflictingId) return { ok: false, why: [`fault injected: the identity service returned asset id ${v25Hash(d.id + cat).slice(0, 4).toUpperCase()} that already belongs to another record in the graph — nothing was created and no record was overwritten`] }; if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: a change after approval is a change order (new revision, re-review)`] };
  v25RoomBefore(d, `add ${cat}`); const before = { devices: d.devices.length }; const dev = v25RoomAddInternal(d, cat, pos || {}, 'added'); v25RoomAutoConnect(d, dev.id); v25RoomHist(d, `device added: ${dev.label}`, before);
  v25RoomEmit('room.device_added', d, { assetId: dev.id, category: cat }, `room.device_added:${dev.id}`); v25RoomAnalyze(d, `device added ${dev.id}`); return { ok: true, design: d, device: dev };
}
function v25RoomMove(designId, assetId, pos) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.move'); if (g) return g; const dev = d.devices.find((x) => x.id === assetId && !x.removed); if (!dev) return { ok: false, why: ['no such device in this design'] };
  if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  v25RoomBefore(d, `move ${assetId}`); const before = { [assetId]: { x: dev.x, y: dev.y, z: dev.z, rot: dev.rot, mount: dev.mount } };
  for (const k of ['x', 'y', 'z', 'rot']) if (pos[k] != null && Number.isFinite(Number(pos[k]))) dev[k] = Math.round(Number(pos[k]) * 100) / 100; if (pos.mount && ['wall', 'ceiling', 'floor', 'table', 'rack'].includes(pos.mount)) dev.mount = pos.mount;
  v25RoomHist(d, `device moved: ${dev.label}`, before); v25RoomEmit('room.device_moved', d, { assetId, x: dev.x, y: dev.y, mount: dev.mount }); v25RoomAnalyze(d, `device moved ${assetId}`); return { ok: true, design: d, device: dev };
}
/** Swap the model (or the category) of one proposed device. The asset keeps its id; the previous model is kept in its history and in every
 *  earlier revision snapshot. Dependent drawings and tests are re-evaluated. */
function v25RoomSwap(designId, assetId, to) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.swap'); if (g) return g; const dev = d.devices.find((x) => x.id === assetId && !x.removed); if (!dev) return { ok: false, why: ['no such device in this design'] };
  if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  const cat = to && to.cat && V25_ROOM_CATS[to.cat] ? to.cat : dev.cat; const models = v25RoomModels(cat); const m = models.find((x) => x.key === (to && to.model)) || (cat !== dev.cat ? models[0] : null);
  if (!m) return { ok: false, why: [`no catalog model ${to && to.model} for ${cat}`] }; if (cat === dev.cat && m.key === dev.model) return { ok: false, why: ['that is already the selected model'] };
  v25RoomBefore(d, `swap ${assetId}`); const from = { cat: dev.cat, model: dev.model, label: dev.label }; dev.modelHistory.push(Object.assign({ rev: d.rev, at: v25Now(), by: v25Persona() }, from));
  if (cat !== dev.cat) { const C = V25_ROOM_CATS[cat]; dev.cat = cat; dev.props = Object.assign({}, C.props); dev.mount = C.mount; dev.furniture = !!C.furniture; }
  Object.assign(dev, { model: m.key, generic: m.generic, brand: m.brand, modelName: m.model });
  if (!m.generic && cat === 'camera' && /II$/.test(m.model)) dev.props.fov_deg = 80;   // a declared catalog characteristic that differs between the two synthetic camera models
  v25RoomHist(d, `device swapped: ${dev.label} ${from.model} → ${m.key}`, { [assetId]: from });
  v25RoomEmit('room.device_swapped', d, { assetId, from: `${from.cat}:${from.model}`, to: `${cat}:${m.key}` }); v25RoomAnalyze(d, `device swapped ${assetId}`); return { ok: true, design: d, device: dev };
}
function v25RoomRemove(designId, assetId) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.remove'); if (g) return g; const dev = d.devices.find((x) => x.id === assetId && !x.removed); if (!dev) return { ok: false, why: ['no such device in this design'] };
  if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  v25RoomBefore(d, `remove ${assetId}`); dev.removed = true; dev.removedRev = d.rev; dev.lifecycle = 'REMOVED_FROM_DESIGN'; const cut = d.connections.filter((c) => !c.removed && (c.from === assetId || c.to === assetId)); for (const c of cut) { c.removed = true; c.removedRev = d.rev; }
  v25RoomHist(d, `device removed: ${dev.label}`, { [assetId]: 'present' }); v25RoomEmit('room.device_removed', d, { assetId }); v25RoomAnalyze(d, `device removed ${assetId}`); return { ok: true, design: d };
}
function v25RoomDuplicate(designId, assetId) { const d = v25RoomDesign(designId); const dev = d && d.devices.find((x) => x.id === assetId && !x.removed); if (!dev) return v25RoomGuard(d, 'room.design', 'api:room.duplicate') || { ok: false, why: ['no such device in this design'] }; const r = v25RoomAdd(designId, dev.cat, { x: dev.x + 0.5, y: dev.y + 0.3, rot: dev.rot, mount: dev.mount }); if (r.ok && !dev.generic) v25RoomSwap(designId, r.device.id, { model: dev.model }); return r; }

// ---------------------------------------------------------------- connections (proposed)
/** Propose the connections a device needs, from the device roles (all PROPOSED; nothing is observed). */
function v25RoomAutoConnect(d, onlyId) {
  const live = d.devices.filter((x) => !x.removed && !x.furniture); const first = (cats) => live.find((x) => cats.includes(x.cat)); const sw = first(['switch']); const dsp = first(['dsp']); const comp = first(['compute']); const amp = first(['amp']); const swr = first(['switcher']);
  const want = (from, to, kind, why) => { if (!from || !to || from.id === to.id) return; if (onlyId && from.id !== onlyId && to.id !== onlyId) return; if (d.connections.some((c) => !c.removed && c.from === from.id && c.to === to.id && c.kind === kind)) return; d.connections.push({ id: `CN-${d.id.slice(5)}-${(d.connSeq = (d.connSeq || 0) + 1)}`, from: from.id, to: to.id, kind, state: 'PROPOSED', why, addedRev: d.rev }); };
  for (const x of live) {
    const C = V25_ROOM_CATS[x.cat]; if (C.net && sw && x.cat !== 'switch') want(x, sw, 'network', 'networked device → room switch');
    if (['micceil', 'mictable', 'micwireless'].includes(x.cat)) want(x, dsp, 'signal', 'microphone → audio processor');
    if (x.cat === 'speaker') want(amp || dsp, x, 'signal', `${amp ? 'amplifier' : 'audio processor'} → loudspeaker`);
    if (x.cat === 'amp') want(dsp, x, 'signal', 'audio processor → amplifier');
    if (['camera', 'bar'].includes(x.cat)) want(x, comp || swr, 'signal', 'camera → room compute');
    if (['display', 'ledwall', 'projector'].includes(x.cat)) want(swr || comp, x, 'signal', 'room compute → display');
    if (x.cat === 'dsp' && comp) want(comp, x, 'signal', 'room compute ↔ audio processor (far-end audio)');
    if (x.cat === 'touch' && (comp || first(['control']))) want(x, first(['control']) || comp, 'control', 'touch panel → controller');
  }
}
function v25RoomConnection(designId, op, c) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.connection'); if (g) return g; if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  if (op === 'remove') { const x = d.connections.find((y) => y.id === c.id && !y.removed); if (!x) return { ok: false, why: ['no such connection'] }; v25RoomBefore(d, `remove connection ${x.id}`); x.removed = true; x.removedRev = d.rev; v25RoomHist(d, `connection removed: ${x.id}`, { [x.id]: 'present' }); v25RoomEmit('room.connection_changed', d, { connectionId: x.id, change: 'removed' }); v25RoomAnalyze(d, `connection removed ${x.id}`); return { ok: true, design: d, connection: x }; }
  if (op === 'add') { const a = d.devices.find((y) => y.id === c.from && !y.removed); const b = d.devices.find((y) => y.id === c.to && !y.removed); if (!a || !b || a.id === b.id) return { ok: false, why: ['a connection needs two different devices of this design'] }; if (!['network', 'signal', 'control', 'power'].includes(c.kind)) return { ok: false, why: ['kind is network, signal, control or power'] };
    if (d.connections.some((y) => !y.removed && y.from === a.id && y.to === b.id && y.kind === c.kind)) return { ok: false, why: ['that connection is already proposed'] };
    v25RoomBefore(d, 'add connection'); const x = { id: `CN-${d.id.slice(5)}-${(d.connSeq = (d.connSeq || 0) + 1)}`, from: a.id, to: b.id, kind: c.kind, state: 'PROPOSED', why: 'added by the designer', addedRev: d.rev }; d.connections.push(x); v25RoomHist(d, `connection added: ${x.id}`, {}); v25RoomEmit('room.connection_changed', d, { connectionId: x.id, change: 'added' }); v25RoomAnalyze(d, `connection added ${x.id}`); return { ok: true, design: d, connection: x }; }
  return { ok: false, why: ['op is add or remove'] };
}

// ---------------------------------------------------------------- geometry
function v25RoomGeometry(designId, g2) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.geometry'); if (g) return g; if (d.lifecycle !== 'PLANNED') return { ok: false, why: [`the design is ${d.lifecycle}: changes need a change order`] };
  if (g2 && g2.points != null) return v25RoomOutline(d, g2);
  v25RoomBefore(d, 'geometry'); const unit = g2.unit === 'ft' ? 'ft' : g2.unit === 'm' ? 'm' : d.unit; const before = { geometry: JSON.parse(JSON.stringify(d.geometry)), unit: d.unit }; const G = d.geometry; const prov = Object.assign({}, G.provenance); delete prov.outline;
  const L = g2.length != null ? v25RoomParseLen(g2.length, unit) : G.lengthM; const W = g2.width != null ? v25RoomParseLen(g2.width, unit) : G.widthM; const H = g2.ceiling != null ? v25RoomParseLen(g2.ceiling, unit) : G.ceiling;
  if (!(L > 0.5 && W > 0.5 && H > 1.8 && L < 200 && W < 200 && H < 30)) return { ok: false, why: ['dimensions out of range or not readable (use metres, feet, or feet and inches like 24\' 6")'] };
  if (g2.length != null) prov.length = 'DECLARED'; if (g2.width != null) prov.width = 'DECLARED'; if (g2.ceiling != null) prov.ceiling = 'DECLARED';
  const shape = g2.shape && v25RoomShapes[g2.shape] ? g2.shape : G.shape === 'polygon' ? 'rect' : G.shape; const sx = W / (v25RoomBox(d).w || W); const sy = L / (v25RoomBox(d).l || L);
  for (const x of d.devices) { x.x = Math.round(x.x * sx * 100) / 100; x.y = Math.round(x.y * sy * 100) / 100; }
  d.geometry = { shape, points: v25RoomShapes[shape](W, L).map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]), ceiling: H, lengthM: L, widthM: W, provenance: prov, confidence: Object.values(prov).every((p) => p === 'DECLARED' || p === 'ENGINEER_APPROVED') ? 'declared' : 'modeled' }; d.unit = unit;
  v25RoomHist(d, 'geometry updated', before); v25RoomEmit('room.geometry_updated', d, { revision: d.revisions.length, lengthM: L, widthM: W, ceilingM: H, shape }); v25RoomClassify(d, 'geometry changed'); v25RoomAnalyze(d, 'geometry updated'); return { ok: true, design: d };
}
/** A drawn outline replaces the room's shape. Corners are in the plan's metres; devices keep their place relative to the outline (they move by
 *  the same shift), and any device left outside it is raised by the placement check. The ceiling is kept unless a new one is given. */
function v25RoomOutline(d, g2) {
  const o = v25RoomPolyCheck(g2.points); if (o.why) return { ok: false, why: [`outline refused: ${o.why}`] };
  const H = g2.ceiling != null ? v25RoomParseLen(g2.ceiling, d.unit) : d.geometry.ceiling; if (!(H > 1.8 && H < 30)) return { ok: false, why: ['ceiling out of range or not readable'] };
  v25RoomBefore(d, 'outline'); const before = { geometry: JSON.parse(JSON.stringify(d.geometry)), unit: d.unit };
  for (const x of d.devices) { x.x = Math.round((x.x - o.shift[0]) * 100) / 100; x.y = Math.round((x.y - o.shift[1]) * 100) / 100; }
  const prov = Object.assign({}, d.geometry.provenance, { length: 'DECLARED', width: 'DECLARED', outline: 'DECLARED' }); if (g2.ceiling != null) prov.ceiling = 'DECLARED';
  d.geometry = { shape: 'polygon', points: o.points, ceiling: H, lengthM: o.l, widthM: o.w, provenance: prov, confidence: Object.values(prov).every((p) => p === 'DECLARED' || p === 'ENGINEER_APPROVED') ? 'declared' : 'modeled' };
  v25RoomHist(d, `outline drawn (${o.points.length} corners, ${o.area} m²)`, before); v25RoomEmit('room.geometry_updated', d, { revision: d.revisions.length, lengthM: o.l, widthM: o.w, ceilingM: H, shape: 'polygon', corners: o.points.length, areaM2: o.area });
  v25RoomClassify(d, 'geometry changed'); v25RoomAnalyze(d, 'outline drawn'); return { ok: true, design: d, area: o.area };
}
/** An engineer confirms the scale and geometry of an imported scaled plan: only then are the dimensions marked approved from the plan. */
function v25RoomConfirmScale(designId, input) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.classify.approve', 'api:room.confirm_scale'); if (g) return g; const im = d.imports.find((x) => x.kind === 'plan_image'); if (!im) return { ok: false, why: ['no scaled plan was imported for this design'] };
  if (!(Number(input.knownLengthM) > 0 && Number(input.measuredPx) > 0)) return { ok: false, why: ['scale confirmation needs a known length and the matching distance on the plan'] };
  im.scale = { mPerPx: Number(input.knownLengthM) / Number(input.measuredPx), confirmedBy: v25Persona(), at: v25Now() }; im.confidence = 'scale confirmed'; im.missing = im.missing.filter((x) => x !== 'confirmed dimensions');
  for (const k of ['length', 'width']) d.geometry.provenance[k] = 'ENGINEER_APPROVED'; d.geometry.confidence = d.geometry.provenance.ceiling === 'DECLARED' ? 'declared' : 'modeled';
  v25RoomHist(d, 'scale and geometry confirmed against the plan', {}); v25RoomEmit('room.geometry_updated', d, { revision: d.revisions.length, lengthM: d.geometry.lengthM, widthM: d.geometry.widthM, ceilingM: d.geometry.ceiling, shape: d.geometry.shape, confirmed: true }); v25RoomAnalyze(d, 'scale confirmed'); return { ok: true, design: d };
}

// ---------------------------------------------------------------- classification
/** Rule-based classification over declared geometry, intended use, occupancy and equipment. Explainable; never final until approved. */
function v25RoomClassifyCompute(d) {
  const area = v25RoomArea(d); const live = d.devices.filter((x) => !x.removed); const cats = new Set(live.map((x) => x.cat)); const why = []; const assumptions = [];
  const seats = live.filter((x) => x.cat === 'chairs').reduce((a, x) => a + (Number(x.props.seats) || 6), 0); const density = d.occupancy >= 60 || /town|auditor|all-hands|event|lecture/i.test(d.intendedUse) ? 0.9 : 2.2;
  const capEst = Math.max(1, Math.floor(area / density)); assumptions.push(`capacity estimate = floor area ${area} m² ÷ ${density} m² per person (${density < 1 ? 'theatre-style seating' : 'meeting seating'}); a planning assumption, not a fire-code occupancy`);
  const people = d.occupancy || seats || capEst; const u = String(d.intendedUse || ''); const useKey = /train|teach|class|lectur/i.test(u) ? 'training' : /event|all-hands|town/i.test(u) ? 'event' : /record|stream|studio|broadcast/i.test(u) ? 'produce' : /operat|control room|war room/i.test(u) ? 'operate' : /focus|one person|desk/i.test(u) ? 'focus' : ''; let arch = typeof recommendArch === 'function' ? recommendArch(useKey, people, /leader|executive|board/i.test(u) ? 'leaders' : 'team') : null; const tplArch = (V25_ROOM_TEMPLATES[d.template] || {}).arch;
  if (arch && arch.key) arch = arch.key; if (typeof arch !== 'string' || !ARCHETYPES[arch]) arch = null;
  const hasAv = ['display', 'ledwall', 'projector', 'camera', 'bar', 'micceil', 'mictable', 'micwireless', 'speaker'].some((c) => cats.has(c));
  if (!hasAv && cats.has('rack') && cats.has('switch')) { arch = 'CTL'; why.push('equipment rack and network switch, no room AV: an equipment / IDF room'); }
  else if (!hasAv) { arch = null; why.push('no displays, cameras, microphones or loudspeakers: not a meeting space (building systems only)'); }
  else { if (people >= 100 || area >= 250) { arch = 'TWN'; why.push(`${people} people / ${area} m²: a town hall or multipurpose space`); } else if (tplArch && (!arch || ARCHETYPES[tplArch].cap[0] <= people * 1.5)) { arch = arch && arch !== tplArch && Math.abs(ARCHETYPES[arch].cap[0] - people) < Math.abs(ARCHETYPES[tplArch].cap[0] - people) ? arch : tplArch; why.push(`template ${V25_ROOM_TEMPLATES[d.template].label} and ${people} people`); } else if (arch) why.push(`intended use “${d.intendedUse || 'not stated'}” and ${people} people`); }
  const size = area < 15 ? 'small' : area < 40 ? 'medium' : area < 100 ? 'large' : 'extra large'; why.push(`floor area ${area} m² → ${size}`);
  const fams = new Set(live.map((x) => v25RoomFamily(x.cat)).filter(Boolean)); const n = live.filter((x) => !x.furniture).length;
  const tier = arch === 'TWN' || n >= 14 ? 'critical' : n >= 8 || fams.size >= 5 ? 'advanced' : n >= 4 || fams.size >= 3 ? 'standard' : 'basic'; why.push(`${n} devices across ${fams.size} families → ${tier} technology complexity`);
  const sub = (V25_ROOM_TEMPLATES[d.template] || {}).sub || (arch ? ARCHETYPES[arch].name.toLowerCase() : 'not a meeting space');
  const conf = d.geometry.confidence === 'declared' && d.intendedUse ? 'medium' : 'low'; if (conf === 'low') assumptions.push('dimensions or intended use are not declared: the classification rests on template defaults');
  return { archetype: arch, archetypeName: arch ? ARCHETYPES[arch].name : 'Not a meeting space', subtype: sub, intendedUse: d.intendedUse || 'not stated', capacityEstimate: capEst, people, sizeCategory: size, complexity: tier, families: [...fams], cxRoomType: arch ? (V25_ROOM_TYPE[arch] || 'boardroom') : null, source: 'rule-based classifier (v25-60) over declared geometry, intended use, occupancy and equipment', confidence: conf, why, assumptions };
}
function v25RoomClassify(d, reason) {
  const s = v25RoomClassifyCompute(d); const prev = d.classification.suggested; d.classification.suggested = Object.assign({ at: v25Now(), revisionNo: d.revisions.length }, s);
  if (!prev || prev.archetype !== s.archetype || prev.complexity !== s.complexity) v25RoomEmit('room.classification_proposed', d, { archetype: s.archetype || 'NONE', complexity: s.complexity, reason }, `room.classification_proposed:${d.id}:${s.archetype}:${s.complexity}:${d.rev}`);
  if (d.classification.approved && d.classification.approved.archetype !== s.archetype && !d.classification.approved.override) { d.classification.approved.stale = true; }
  return s;
}
/** An authorized engineer approves the suggestion or overrides it (with a reason). Both are stored; the override is in the audit history. */
function v25RoomApproveClass(designId, input) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.classify.approve', 'api:room.classify'); if (g) return g; input = input || {}; const s = d.classification.suggested;
  if (v25RoomFaults().rejectApproval) return { ok: false, why: ['fault injected: the approval service rejected the signature — the classification stays proposed'] };
  const arch = input.archetype === undefined ? s.archetype : input.archetype; if (arch !== null && !ARCHETYPES[arch]) return { ok: false, why: [`unknown room type ${arch}`] };
  const override = arch !== s.archetype; if (override && !(input.reason && String(input.reason).trim().length >= 10)) return { ok: false, why: ['an override of the suggested classification needs a reason (10 characters or more)'] };
  const before = { approved: d.classification.approved }; d.classification.approved = { archetype: arch, archetypeName: arch ? ARCHETYPES[arch].name : 'Not a meeting space', cxRoomType: arch ? (V25_ROOM_TYPE[arch] || 'boardroom') : null, override, reason: String(input.reason || 'suggestion accepted'), by: v25Persona(), at: v25Now(), suggestedWas: s.archetype };
  if (override) d.classification.overrides.push({ from: s.archetype, to: arch, reason: d.classification.approved.reason, by: v25Persona(), at: v25Now() });
  v25RoomHist(d, override ? `classification overridden: ${s.archetype} → ${arch}` : 'classification approved', before); v25RoomEmit('room.classification_approved', d, { archetype: arch || 'NONE', approvedBy: v25Persona(), override });
  v25RoomAnalyze(d, 'classification approved'); return { ok: true, design: d };
}
const v25RoomArch = (d) => (d.classification.approved && !d.classification.approved.stale ? d.classification.approved.archetype : (d.classification.suggested || {}).archetype);

// ---------------------------------------------------------------- revisions
function v25RoomRevisionSnapshot(d, reason) { const snap = { n: d.revisions.length + 1, at: v25Now(), by: v25Persona(), reason, rev: d.rev, geometry: JSON.parse(JSON.stringify(d.geometry)), devices: JSON.parse(JSON.stringify(d.devices.filter((x) => !x.removed))), connections: JSON.parse(JSON.stringify(d.connections.filter((x) => !x.removed))), classification: JSON.parse(JSON.stringify(d.classification.approved || d.classification.suggested || {})), hash: '' }; snap.hash = v25Hash(JSON.stringify([snap.geometry, snap.devices, snap.connections])); d.revisions.push(Object.freeze(snap)); return snap; }
function v25RoomSaveRevision(designId, reason) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.save'); if (g) return g; const last = d.revisions[d.revisions.length - 1];
  const probe = v25Hash(JSON.stringify([d.geometry, d.devices.filter((x) => !x.removed), d.connections.filter((x) => !x.removed)])); if (last && last.hash === probe) return { ok: false, why: [`nothing changed since revision ${last.n}`] };
  const snap = v25RoomRevisionSnapshot(d, String(reason || 'saved').slice(0, 200)); v25RoomHist(d, `revision ${snap.n} saved`, {}); v25RoomEmit('room.design_revision_saved', d, { revision: snap.n, hash: snap.hash }, `room.design_revision_saved:${d.id}:${snap.n}`); v25RoomAnalyze(d, `revision ${snap.n} saved`); return { ok: true, design: d, revision: snap };
}
/** Compare two revisions: geometry, devices added / removed / moved / swapped, connections added / removed. */
function v25RoomCompare(designId, a, b) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, null, 'api:room.compare'); if (g) return g; const A = d.revisions.find((r) => r.n === Number(a)); const B = b === 'current' ? { n: 'current', geometry: d.geometry, devices: d.devices.filter((x) => !x.removed), connections: d.connections.filter((x) => !x.removed) } : d.revisions.find((r) => r.n === Number(b));
  if (!A || !B) return { ok: false, why: ['no such revision'] }; const ia = new Map(A.devices.map((x) => [x.id, x])); const ib = new Map(B.devices.map((x) => [x.id, x]));
  const added = B.devices.filter((x) => !ia.has(x.id)).map((x) => ({ id: x.id, label: x.label })); const removed = A.devices.filter((x) => !ib.has(x.id)).map((x) => ({ id: x.id, label: x.label }));
  const moved = []; const swapped = []; for (const [id, x] of ib) { const y = ia.get(id); if (!y) continue; if (Math.hypot(x.x - y.x, x.y - y.y) > 0.05 || x.mount !== y.mount) moved.push({ id, label: x.label, from: [y.x, y.y, y.mount], to: [x.x, x.y, x.mount] }); if (x.model !== y.model || x.cat !== y.cat) swapped.push({ id, label: x.label, from: `${y.cat}:${y.model}`, to: `${x.cat}:${x.model}` }); }
  const ca = new Set(A.connections.map((c) => c.id)); const cb = new Set(B.connections.map((c) => c.id));
  const geo = ['lengthM', 'widthM', 'ceiling', 'shape'].filter((k) => A.geometry[k] !== B.geometry[k]).map((k) => ({ field: k, from: A.geometry[k], to: B.geometry[k] }));
  return { ok: true, a: A.n, b: B.n, geometry: geo, added, removed, moved, swapped, connectionsAdded: [...cb].filter((x) => !ca.has(x)), connectionsRemoved: [...ca].filter((x) => !cb.has(x)) };
}

// ---------------------------------------------------------------- analysis: design checks → issues, applicability, drawing staleness, Core join
const V25_ROOM_REQUIRED = { TWN: ['camera', 'dsp', 'mic', 'speaker', 'display', 'switch', 'compute'], BRD: ['camera', 'dsp', 'mic', 'speaker', 'display', 'compute'], EXE: ['camera', 'dsp', 'mic', 'speaker', 'display', 'compute'], TRN: ['camera', 'dsp', 'mic', 'speaker', 'display', 'compute'], COL: ['camera', 'display', 'compute'], HUD: ['display', 'camera'], FOC: ['display'], STU: ['camera', 'dsp', 'mic', 'encoder'], CTL: ['switch'] };
const V25_ROOM_ROLEOK = { camera: ['camera', 'bar'], mic: ['micceil', 'mictable', 'micwireless', 'bar'], speaker: ['speaker', 'bar'], display: ['display', 'ledwall', 'projector'], dsp: ['dsp'], switch: ['switch'], compute: ['compute', 'bar'], encoder: ['encoder'] };
/** The design checks. Each finding has a stable correlation key, so the same underlying deficiency reported again (on every save, or by another
 *  detector) updates one issue instead of creating a new one. Severity comes with a rationale. All findings here are DESIGN DEFICIENCIES. */
function v25RoomChecks(d) {
  const out = []; const live = d.devices.filter((x) => !x.removed); const av = live.filter((x) => !x.furniture); const arch = v25RoomArch(d); const conns = d.connections.filter((c) => !c.removed); const byId = new Map(live.map((x) => [x.id, x]));
  const f = (key, cat, severity, rationale, title, assets, source, action) => out.push({ key, category: 'DESIGN_DEFICIENCY', check: cat, severity, rationale, title, assets: assets || [], source, action });
  for (const role of V25_ROOM_REQUIRED[arch] || []) if (!live.some((x) => V25_ROOM_ROLEOK[role].includes(x.cat))) f(`missing-equipment:${role}`, 'missing_required_equipment', 'High', `the ${arch ? ARCHETYPES[arch].name : ''} room type requires a ${role} for its intended use`, `No ${role} in a ${arch ? ARCHETYPES[arch].name.toLowerCase() : 'room'}`, [], 'design editor: required-equipment rule', `add a ${role} to the design`);
  const reach = (from, kinds, test) => { const seen = new Set([from]); const q = [from]; while (q.length) { const n = q.shift(); for (const c of conns) { if (!kinds.includes(c.kind)) continue; const o = c.from === n ? c.to : c.to === n ? c.from : null; if (o && !seen.has(o)) { if (test(byId.get(o))) return true; seen.add(o); q.push(o); } } } return false; };
  for (const x of av) {
    const C = V25_ROOM_CATS[x.cat];
    if (['micceil', 'mictable', 'micwireless'].includes(x.cat) && live.some((y) => y.cat === 'dsp') && !reach(x.id, ['signal', 'network'], (y) => y && y.cat === 'dsp')) f(`unresolved-connection:${x.id}:dsp`, 'unresolved_connection', 'High', 'a microphone without a path to the audio processor is not heard by anyone', `${x.label} has no signal path to the audio processor`, [x.id], 'connectivity check', 'propose the microphone → audio processor connection');
    if (['camera'].includes(x.cat) && live.some((y) => ['compute', 'switcher'].includes(y.cat)) && !reach(x.id, ['signal'], (y) => y && ['compute', 'switcher'].includes(y.cat))) f(`unresolved-connection:${x.id}:compute`, 'unresolved_connection', 'High', 'a camera without a video path to the room compute sends no picture to the far end', `${x.label} has no video path to the room compute`, [x.id], 'connectivity check', 'propose the camera → room compute connection');
    if (x.cat === 'speaker' && live.some((y) => ['dsp', 'amp'].includes(y.cat)) && !reach(x.id, ['signal'], (y) => y && ['dsp', 'amp'].includes(y.cat))) f(`unresolved-connection:${x.id}:amp`, 'unresolved_connection', 'Medium', 'a loudspeaker with no amplifier or processor feed plays nothing', `${x.label} is not fed by an amplifier`, [x.id], 'connectivity check', 'connect the loudspeaker to an amplifier');
    if (['display', 'ledwall', 'projector'].includes(x.cat) && live.some((y) => ['compute', 'switcher'].includes(y.cat)) && !reach(x.id, ['signal'], (y) => y && ['compute', 'switcher'].includes(y.cat))) f(`unresolved-connection:${x.id}:source`, 'unresolved_connection', 'Medium', 'a display with no source shows nothing', `${x.label} has no source connection`, [x.id], 'connectivity check', 'connect the display to the room compute or the switcher');
    if (C.net && live.some((y) => y.cat === 'switch') && x.cat !== 'switch' && !conns.some((c) => c.kind === 'network' && (c.from === x.id || c.to === x.id))) f(`unresolved-connection:${x.id}:network`, 'unresolved_connection', 'Medium', 'a networked device without a network connection cannot be managed or monitored', `${x.label} has no network connection`, [x.id], 'network check', 'propose the device → switch connection');
    if (!x.furniture && !v25RoomInside(d, x.x, x.y) && x.mount !== 'rack') f(`placement:${x.id}:outside`, 'placement_constraint', 'Medium', 'a device placed outside the room outline cannot be installed as drawn', `${x.label} is outside the room outline`, [x.id], 'placement check', 'move it inside the room');
    if (!x.role || !String(x.role).trim()) f(`missing-role:${x.id}`, 'missing_device_role', 'Low', 'every device needs an assigned role for the schedule and the tests', `${x.id} has no assigned role`, [x.id], 'schedule check', 'assign a role');
  }
  const sw = live.find((x) => x.cat === 'switch'); if (sw) { const budget = Number(sw.props.poe_budget_w) || 0; const draw = conns.filter((c) => c.kind === 'network' && (c.to === sw.id || c.from === sw.id)).map((c) => byId.get(c.from === sw.id ? c.to : c.from)).filter(Boolean).reduce((a, y) => a + (V25_ROOM_CATS[y.cat].poe || 0), 0); if (draw > budget) f(`incompatible:${sw.id}:poe`, 'incompatible_components', 'High', `declared PoE draw ${draw} W exceeds the switch's declared budget ${budget} W (catalog values, not measured)`, `PoE budget exceeded on ${sw.label}`, [sw.id], 'compatibility check (declared catalog values)', 'choose a switch with a larger PoE budget or power some devices locally'); }
  const disp = live.filter((x) => x.cat === 'display'); if (disp.length && arch && ['BRD', 'TRN', 'EXE', 'COL'].includes(arch)) { const far = Math.max(...live.filter((x) => x.cat === 'chairs').map((c) => Math.min(...disp.map((y) => Math.hypot(c.x - y.x, c.y - y.y)))), 0); const imgH = ((Number(disp[0].props.diagonal_in) || 75) * 0.0254) * 0.49; if (far > imgH * 8) f(`sightline:${disp[0].id}`, 'placement_constraint', 'Medium', `the farthest seating block is ${far.toFixed(1)} m from the nearest display; a common planning ratio is about 6–8 × the image height (${(imgH * 8).toFixed(1)} m here) — a MODELED rule of thumb, not a verified sightline study`, 'Farthest seats are beyond the modeled viewing distance', disp.map((x) => x.id), 'sightline hypothesis (modeled)', 'larger displays, a second display or seats closer to the screen'); }
  if (live.some((x) => x.cat === 'camera') && live.some((x) => x.cat === 'bar')) f('incompatible:camera-and-bar', 'incompatible_components', 'Low', 'a video bar and a separate camera both claim the far-end picture; one must be the designated camera', 'Two video sources compete for the far-end picture', live.filter((x) => ['camera', 'bar'].includes(x.cat)).map((x) => x.id), 'compatibility check', 'designate one camera or remove the video bar');
  return out;
}
/** Create or update the single issue for each finding; resolve issues whose finding no longer fires (with the traceable resolution). */
function v25RoomIssues(d, findings, source) {
  const now = v25Now(); const live = new Map(findings.map((x) => [x.key, x])); const mine = v25All('RoomIssue', (i) => i.designId === d.id);
  for (const fd of findings) {
    let i = mine.find((x) => x.key === fd.key);
    if (!i) { i = v25Create('RoomIssue', { name: fd.title, designId: d.id, key: fd.key, category: fd.category, check: fd.check, severity: fd.severity, rationale: fd.rationale, assets: fd.assets, detectors: [fd.source], state: 'OPEN', status: 'OPEN', owner: null, queue: 'Design review queue (unassigned)', nextAction: fd.action, firstSeenRev: d.revisions.length, lastSeenRev: d.revisions.length, affectedRevision: d.revisions.length, seen: 1, evidence: [{ at: now, source: fd.source, finding: fd.rationale, revision: d.revisions.length }], resolution: null, retest: 'the design check must stop firing on a saved revision; an engineer reviews the change', provenance: 'MODELED', scope: { siteId: d.scope.siteId, buildingKey: d.buildingKey, roomId: d.coreRoomId } }, 'system');
      d.issueIds.push(i.id); v25Emit('deficiency.identified', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: i.rev, issueId: i.id, key: fd.key, designId: d.id, roomId: d.coreRoomId, category: fd.category, severity: fd.severity }, { idempotencyKey: `deficiency.identified:${i.id}` });
      v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: i.rev, issueId: i.id, status: 'OPEN', change: 'created', roomId: d.coreRoomId }, { idempotencyKey: `issue.created:${i.id}` }); continue; }
    if (i.state === 'RESOLVED') { v25Update(i.id, { state: 'OPEN', status: 'OPEN', reopenedAt: now, resolution: Object.assign({}, i.resolution, { reopened: true }), lastSeenRev: d.revisions.length, seen: i.seen + 1, evidence: i.evidence.concat([{ at: now, source: fd.source, finding: `reopened: ${fd.rationale}`, revision: d.revisions.length }]) }, 'system', 'the finding fired again');
      v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, status: 'OPEN', change: 'reopened', roomId: d.coreRoomId }); continue; }
    const det = i.detectors.includes(fd.source) ? i.detectors : i.detectors.concat([fd.source]); if (det.length !== i.detectors.length || i.severity !== fd.severity) { v25Update(i.id, { detectors: det, severity: fd.severity, rationale: fd.rationale, lastSeenRev: d.revisions.length, seen: i.seen + 1 }, 'system', `correlated: ${fd.source}`); v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, status: i.state, change: 'correlated', roomId: d.coreRoomId }); }
  }
  for (const i of mine) if (i.state === 'OPEN' && i.category === 'DESIGN_DEFICIENCY' && !live.has(i.key)) {
    v25Update(i.id, { state: 'RESOLVED', status: 'RESOLVED', resolution: { at: now, by: v25Persona(), revision: d.revisions.length, designRev: d.rev, how: `the design check no longer fires after: ${source}`, evidence: 'design re-analysis (the check is re-run on every change); verification: an engineer reviews the next saved revision' } }, v25Persona(), `resolved by ${source}`);
    v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, status: 'RESOLVED', change: 'resolved', roomId: d.coreRoomId });
  }
}
/** Run every dependent analysis after a change: design checks → issues; drawing staleness; commissioning applicability; the Core join. */
function v25RoomAnalyze(d, source) {
  v25RoomClassify(d, source); v25RoomIssues(d, v25RoomChecks(d).concat(v25RoomDrawingFindings(d)), source); v25RoomApplicabilityCompile(d, source, true); v25RoomJoin(d);
}

// ---------------------------------------------------------------- commissioning applicability (the 94-definition library, judged one by one)
const V25_ROOM_INFO = { Acoustic: ['ceiling height', 'room dimensions', 'seating'], Audio: ['microphone placement', 'seating'], Video: ['camera placement', 'seating'], Network: ['network connections'], Display: ['display placement'] };
function v25RoomFacts(d) { const live = d.devices.filter((x) => !x.removed); const f = new Set(); if (d.geometry.provenance.ceiling !== 'PHOTO_INFERRED') f.add('ceiling height'); if (d.geometry.provenance.length !== 'PHOTO_INFERRED' && d.geometry.provenance.width !== 'PHOTO_INFERRED') f.add('room dimensions'); if (live.some((x) => x.cat === 'chairs' || x.cat === 'table')) f.add('seating'); if (live.some((x) => ['micceil', 'mictable', 'micwireless', 'bar'].includes(x.cat))) f.add('microphone placement'); if (live.some((x) => ['camera', 'bar'].includes(x.cat))) f.add('camera placement'); if (d.connections.some((c) => !c.removed && c.kind === 'network')) f.add('network connections'); if (live.some((x) => ['display', 'ledwall', 'projector'].includes(x.cat))) f.add('display placement'); return f; }
/** Judge every test definition (33 base + 61 pack tests = 94) for this room: APPLICABLE (with why), NOT_APPLICABLE (with justification), and for
 *  applicable tests one execution state: PENDING_INFORMATION / BLOCKED_BY_PREREQUISITE / REQUIRES_PHYSICAL_EXECUTION. Never PASS. */
function v25RoomApplicabilityCompute(d) {
  const live = d.devices.filter((x) => !x.removed && !x.furniture); const arch = v25RoomArch(d); const fams = new Set(live.map((x) => v25RoomFamily(x.cat)).filter(Boolean)); if (fams.has('touch_panel') && arch !== 'CTL') fams.add('uc');
  const cls = d.classification.suggested || {}; const tier = cls.complexity || 'basic'; const p = { projectType: 'new_install', roomArchetype: arch, roomId: d.coreRoomId, risk: tier === 'critical' ? 'critical' : 'standard' };
  const req = v25RequiredTests(p, { families: [...fams], risk: p.risk === 'standard' ? null : p.risk, hasDevices: live.length > 0 }); const roomType = arch ? (V25_ROOM_TYPE[arch] || 'boardroom') : 'none'; const ctx = { type: 'new_install', room: roomType, families: [...fams], tier, risk: p.risk };
  const facts = v25RoomFacts(d); const approved = ['DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'].includes(d.lifecycle); const installed = ['INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'].includes(d.lifecycle);
  const devRefs = (T) => { const fam = T.family || ({ Video: 'camera', Audio: 'dsp', Acoustic: 'dsp', Display: 'display', Network: 'network_switch', Control: 'touch_panel' })[T.domain]; const key = fam === 'touch' ? 'touch_panel' : fam; return live.filter((x) => key && v25RoomFamily(x.cat) === key).map((x) => x.id); };
  const rows = []; const judge = (id, T, label, pack, ok, why, whyNot) => {
    if (!ok) { rows.push({ id, label, pack: pack || null, domain: T.domain, phase: T.phase, tier: T.tier, applicable: false, status: 'NOT_APPLICABLE', why: [], justification: whyNot }); return; }
    const need = (V25_ROOM_INFO[T.domain] || []).filter((x) => !facts.has(x)); const status = need.length ? 'PENDING_INFORMATION' : !approved ? 'BLOCKED_BY_PREREQUISITE' : 'REQUIRES_PHYSICAL_EXECUTION';
    rows.push({ id, label, pack: pack || null, domain: T.domain, phase: T.phase, tier: T.tier, applicable: true, status, why, missing: need, prerequisite: !approved ? 'the design is not approved (DESIGN_APPROVED is required before any field test)' : !installed && T.phase >= 2 ? 'the room is not installed: the test needs physical execution on installed equipment' : null,
      verifier: T.verifier, personas: T.family ? [V25_DOMAIN_PERSONA[T.family]] : (V25_VERIFIER_PERSONAS[T.verifier] || []), evidence: T.accepts, instrument: !!T.instrument, window: !!T.window, devices: devRefs(T), result: v25RoomResultOf(d, id) });
  };
  for (const [id, T] of Object.entries(V25_TESTS)) judge(id, T, V25_TEST_LABEL[id] || id, null, req.ids.includes(id), req.why[id] || [], `no rule names it for new_install / ${roomType} / ${[...fams].join('+') || 'no device family'} / risk ${p.risk}`);
  for (const [id, T] of Object.entries(V25_CX_CATALOGUE)) { if (V25_TESTS[id]) continue; const j = v25CxApplies(T, ctx); judge(id, T, T.label, T.pack, j.ok, j.why.map((w) => `pack ${T.pack}: ${w}`), `pack ${T.pack}: needs ${j.whyNot.join(' and ')}; this room is new_install / ${roomType} / ${[...fams].join('+') || 'no family'} / ${tier}`); }
  rows.sort((a, b) => Number(b.applicable) - Number(a.applicable) || a.phase - b.phase || a.tier - b.tier || a.id.localeCompare(b.id));
  const packs = [...new Set(rows.filter((r) => r.applicable && r.pack).map((r) => r.pack))];
  return { library: rows.length, applicable: rows.filter((r) => r.applicable).length, notApplicable: rows.filter((r) => !r.applicable).length, byStatus: rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}), packs, ctx, rows, passed: 0 };
}
function v25RoomApplicabilityCompile(d, source, silent) {
  const a = v25RoomApplicabilityCompute(d); const prev = d.applicability; const key = (x) => `${x.id}:${x.applicable}:${x.status}:${x.result || ''}`; const sig = v25Hash(a.rows.map(key).join('|'));
  (d.evaluations || (d.evaluations = [])).push({ at: v25Now(), trigger: source, revisionNo: d.revisions.length, changed: prev ? (prev.sig === sig ? 0 : null) : null, applicable: a.applicable, families: a.ctx.families, room: a.ctx.room, tier: a.ctx.tier }); if (d.evaluations.length > 200) d.evaluations.splice(0, d.evaluations.length - 200);   // every change re-evaluates, including when nothing changes (owner focus 3)
  if (prev && prev.sig === sig) { d.applicability.lastEvaluatedAt = v25Now(); d.applicability.lastTrigger = source; return prev; }
  const pm = new Map(((prev && prev.rows) || []).map((r) => [r.id, r])); const diff = prev ? a.rows.filter((r) => !pm.has(r.id) || pm.get(r.id).applicable !== r.applicable || pm.get(r.id).status !== r.status).map((r) => ({ id: r.id, from: pm.has(r.id) ? (pm.get(r.id).applicable ? pm.get(r.id).status : 'NOT_APPLICABLE') : null, to: r.applicable ? r.status : 'NOT_APPLICABLE', why: r.applicable ? r.why : r.justification })) : [];
  if (prev) d.applicabilityHistory.push({ at: prev.at, revisionNo: prev.revisionNo, applicable: prev.applicable, byStatus: prev.byStatus, sig: prev.sig, ctx: prev.ctx });
  d.applicability = Object.assign(a, { at: v25Now(), revisionNo: d.revisions.length, sig, trigger: source, diff });
  d.evaluations[d.evaluations.length - 1].changed = diff.length;
  v25RoomEmit('commission.applicability_compiled', d, { revision: d.revisions.length, applicable: a.applicable, library: a.library, changed: diff.length, trigger: source }, `commission.applicability_compiled:${d.id}:${sig}`);
  return d.applicability;
}
/** The commissioning workbook for this room, in the commissioning workbook's own tab structure. Results are never pre-filled. */
function v25RoomWorkbook(designId) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, null, 'api:room.workbook'); if (g) return g; if (v25RoomFaults().invalidEvidence) return { ok: false, why: ['fault injected: the evidence store returned an invalid record — the workbook is not generated'] };
  const A = d.applicability || v25RoomApplicabilityCompile(d, 'workbook'); const live = d.devices.filter((x) => !x.removed && !x.furniture); const issues = v25All('RoomIssue', (i) => i.designId === d.id);
  const C = v25RoomResultCounts(d, A); const R = d.results || {};
  const tabs = { Dashboard: [['room', d.name], ['canonical room id', d.coreRoomId], ['design', d.id], ['revision', d.revisions.length], ['lifecycle', d.lifecycle], ['library', A.library], ['applicable', A.applicable], ['not applicable', A.notApplicable], ['results recorded', C.recorded], ['passed and independently verified', C.verified], ['passed, awaiting independent verification', C.awaiting], ['failed', C.failed], ['not supported', C.notSupported], ['inconclusive', C.inconclusive], ['not tested', C.notTested], ['note', 'results appear only as recorded in the page with evidence; a PASS counts only when someone other than the recorder has verified it; nothing is pre-filled from the design']],
    Project: [['site', d.site], ['building', d.buildingKey], ['floor', d.floorN], ['room type (approved)', d.classification.approved ? d.classification.approved.archetypeName : 'not approved'], ['room type (suggested)', (d.classification.suggested || {}).archetypeName], ['intended use', d.intendedUse], ['occupancy', d.occupancy]],
    Equipment: live.map((x) => ({ asset_id: x.id, role: x.label, category: V25_ROOM_CATS[x.cat].label, make: x.brand || 'generic', model: x.modelName || 'generic sample object', mount: x.mount, x_m: x.x, y_m: x.y, lifecycle: x.lifecycle, provenance: 'DECLARED (design)' })),
    Testing: A.rows.map((r) => ({ test_id: r.id, label: r.label, pack: r.pack || 'base', phase: r.phase, tier: r.tier, applicable: r.applicable ? 'YES' : 'NO', status: r.status, why: (r.applicable ? r.why : [r.justification]).join('; '), missing_information: (r.missing || []).join('; '), prerequisite: r.prerequisite || '', verifier: r.verifier || '', evidence_accepted: (r.evidence || []).join('/'), devices: (r.devices || []).join(' '), result: !r.applicable ? 'N/A' : v25RoomResultLabel(R[r.id]), evidence_ref: R[r.id] && r.applicable ? `${R[r.id].evidence.kind} ${R[r.id].evidence.ref}` : '', recorded_by: R[r.id] && r.applicable ? R[r.id].by : '', recorded_at: R[r.id] && r.applicable ? R[r.id].at : '', verified_by: R[r.id] && r.applicable && R[r.id].verified ? R[r.id].verified.by : '' })),
    Issues: issues.map((i) => ({ issue_id: i.id, key: i.key, category: i.category, severity: i.severity, status: i.state, title: i.name, assets: i.assets.join(' '), owner: i.owner || i.queue, next_action: i.nextAction })),
    Closeout: [['all applicable tests verified', `${A.applicable > 0 && C.verified === A.applicable ? 'YES' : 'NO'} (${C.verified} of ${A.applicable} passed and independently verified; ${C.recorded} recorded)`], ['open design deficiencies', issues.filter((i) => i.state === 'OPEN' && i.category === 'DESIGN_DEFICIENCY').length], ['open installation / commissioning deficiencies', issues.filter((i) => i.state === 'OPEN' && i.category === 'INSTALLATION_COMMISSIONING_DEFICIENCY').length], ['accepted baseline', d.baseline ? `signed by ${d.baseline.signedBy} at ${d.baseline.at}` : 'none'], ['customer acceptance', 'not signed']] };
  const wb = { schema: 'empathia.cx-workbook.planning.v2.5.3', generatedFrom: { designId: d.id, revision: d.revisions.length, applicabilitySig: A.sig }, tabs, status: { results: 'recorded results are shown as recorded: PASS_VERIFIED only after independent verification, PASS_UNVERIFIED until then, FAIL, NOT_SUPPORTED and INCONCLUSIVE as recorded; NOT_TESTED where nothing is recorded', xlsx: 'the page builds the .xlsx itself (seven sheets, header rows frozen and filtered, a result list on the Testing sheet); it also exports this JSON and the testing tab as CSV', formulas: 'three counts on the .xlsx Dashboard (applicable, not yet tested, passed and independently verified), recomputed by the spreadsheet; none in the JSON or CSV' } };
  v25RoomEmit('commission.workbook_generated', d, { revision: d.revisions.length, tests: A.rows.length, applicable: A.applicable }, `commission.workbook_generated:${d.id}:${A.sig}`); return { ok: true, workbook: wb };
}

// ---------------------------------------------------------------- Drawing Intelligence: the drawing set
const V25_ROOM_DRAWINGS = { plan: 'Dimensioned 2D plan', placement: 'Equipment placement plan', schedule: 'Equipment schedule', relationships: 'Proposed device relationship diagram', signal: 'Signal-flow schematic', network: 'Proposed network relationship view', summary: 'Engineering summary' };
const v25RoomDrawingInput = (d, kind) => v25Hash(JSON.stringify(kind === 'plan' ? [d.geometry] : kind === 'schedule' || kind === 'placement' ? [d.geometry, d.devices.filter((x) => !x.removed).map((x) => [x.id, x.cat, x.model, x.x, x.y, x.mount, x.label])] : kind === 'summary' ? [d.geometry, d.devices.filter((x) => !x.removed).map((x) => [x.id, x.cat, x.model, x.x, x.y, x.mount]), d.connections.filter((c) => !c.removed).map((c) => [c.from, c.to, c.kind]), [(d.classification.approved || {}).archetype, (d.classification.suggested || {}).archetype, (d.classification.suggested || {}).complexity]] : [d.devices.filter((x) => !x.removed).map((x) => [x.id, x.cat, x.model]), d.connections.filter((c) => !c.removed).map((c) => [c.from, c.to, c.kind])]));
/** DRAFT (never generated) / GENERATED / REVIEW_REQUIRED (inputs changed since generation or approval) / APPROVED (engineer, for one input state). */
function v25RoomDrawingStates(d) { const set = v25Get(d.drawingSetId); const out = {}; for (const k of Object.keys(V25_ROOM_DRAWINGS)) { const g = set && set.drawings[k]; const h = v25RoomDrawingInput(d, k); out[k] = !g ? { state: 'DRAFT' } : g.inputHash !== h ? Object.assign({}, g, { state: 'REVIEW_REQUIRED', was: g.state }) : g; } return out; }
function v25RoomDrawingFindings(d) { const st = v25RoomDrawingStates(d); return Object.entries(st).filter(([k, s]) => s.state === 'REVIEW_REQUIRED' && s.was === 'APPROVED' && ['schedule', 'placement'].includes(k)).map(([k]) => ({ key: `drawing-disagreement:${k}`, category: 'DESIGN_DEFICIENCY', check: 'drawing_schedule_disagreement', severity: 'Medium', rationale: `the approved ${V25_ROOM_DRAWINGS[k].toLowerCase()} no longer matches the design`, title: `Approved ${V25_ROOM_DRAWINGS[k].toLowerCase()} disagrees with the design`, assets: [], source: 'Drawing Intelligence: revision check', action: 'regenerate and re-approve the drawing' })); }
function v25RoomGenerate(designId, kinds) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.drawings'); if (g) return g; if (v25RoomFaults().integrationDown) return { ok: false, why: ['fault injected: Drawing Intelligence is unavailable — no drawing was generated and none is marked current'] };
  const set = v25Get(d.drawingSetId); const drawings = Object.assign({}, set.drawings); const made = [];
  for (const k of kinds && kinds.length ? kinds : Object.keys(V25_ROOM_DRAWINGS)) { if (!V25_ROOM_DRAWINGS[k]) continue; drawings[k] = { kind: k, label: V25_ROOM_DRAWINGS[k], state: 'GENERATED', inputHash: v25RoomDrawingInput(d, k), revisionNo: d.revisions.length, designRev: d.rev, roomId: d.coreRoomId, at: v25Now(), by: v25Persona(), stamp: 'GENERATED DIAGRAM — not an engineer-stamped construction drawing or approved shop drawing' }; made.push(k); }
  v25Update(set.id, { drawings, state: 'GENERATED' }, v25Persona(), `generated: ${made.join(', ')}`);
  v25Emit('drawing.revision_generated', { aggregateType: 'DrawingSet', aggregateId: set.id, aggregateRevision: v25Get(set.id).rev, designId: d.id, drawing: made.join(','), revision: d.revisions.length, roomId: d.coreRoomId });
  v25RoomAnalyze(d, 'drawings generated'); return { ok: true, set: v25Get(set.id), generated: made };
}
function v25RoomApproveDrawing(designId, kind) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.classify.approve', 'api:room.drawing_approve'); if (g) return g; const set = v25Get(d.drawingSetId); const st = v25RoomDrawingStates(d)[kind];
  if (!st || st.state !== 'GENERATED') return { ok: false, why: [`only a current GENERATED drawing can be approved (this one is ${st ? st.state : 'unknown'})`] };
  v25Update(set.id, { drawings: Object.assign({}, set.drawings, { [kind]: Object.assign({}, set.drawings[kind], { state: 'APPROVED', approvedBy: v25Persona(), approvedAt: v25Now() }) }) }, v25Persona(), `approved: ${kind}`); v25Emit('drawing.revision_generated', { aggregateType: 'DrawingSet', aggregateId: set.id, aggregateRevision: v25Get(set.id).rev, designId: d.id, drawing: kind, revision: d.revisions.length, roomId: d.coreRoomId, approved: true });
  v25RoomAnalyze(d, `drawing approved ${kind}`); return { ok: true, set: v25Get(set.id) };
}
function v25RoomRedline(designId, note) { const d = v25RoomDesign(designId); const g = v25RoomGuard(d, 'room.design', 'api:room.redline'); if (g) return g; if (!note || !note.text) return { ok: false, why: ['a redline needs text'] }; const set = v25Get(d.drawingSetId); const r = { id: `RL-${set.redlines.length + 1}`, drawing: note.drawing || 'plan', text: String(note.text).slice(0, 400), x: Number(note.x) || 0, y: Number(note.y) || 0, by: v25Persona(), at: v25Now(), revisionNo: d.revisions.length, state: 'OPEN' }; v25Update(set.id, { redlines: set.redlines.concat([r]) }, v25Persona(), 'redline added'); return { ok: true, redline: r }; }

// ---------------------------------------------------------------- lifecycle (governed); operational status needs accepted evidence
function v25RoomLifecycle(designId, to, input) {
  const d = v25RoomDesign(designId); const from = d && d.lifecycle; const need = { DESIGN_APPROVED: 'room.design.approve', INSTALLATION_PENDING: 'window.approve', INSTALLED_UNVERIFIED: 'work.evidence', COMMISSIONING: 'plan.compile', ACCEPTED: 'customer.accept', OPERATIONAL: 'handoff.accept', PLANNED: 'room.design.approve' }[to];
  const g = v25RoomGuard(d, need, `api:room.lifecycle:${to}`); if (g) return g; const i = V25_ROOM_LIFECYCLE.indexOf(from); const j = V25_ROOM_LIFECYCLE.indexOf(to);
  if (j !== i + 1 && !(to === 'PLANNED' && from === 'DESIGN_APPROVED')) return { ok: false, why: [`no transition ${from} → ${to}: the room moves one governed step at a time`] };
  if (v25RoomFaults().rejectApproval && to === 'DESIGN_APPROVED') return { ok: false, why: ['fault injected: the approval was rejected — the design stays PLANNED'] };
  const why = []; const open = v25All('RoomIssue', (x) => x.designId === d.id && x.state === 'OPEN'); const A = d.applicability || {};
  if (to === 'DESIGN_APPROVED') { if (!d.classification.approved || d.classification.approved.stale) why.push('the room classification is not approved by an engineer'); if (open.some((x) => x.severity === 'High' || x.severity === 'Critical')) why.push(`${open.filter((x) => ['High', 'Critical'].includes(x.severity)).length} open High/Critical design deficiencies`); if (!d.revisions.length) why.push('no saved revision'); }
  if (to === 'ACCEPTED') { const rows = (A.rows || []).filter((r) => r.applicable); if (!rows.length || rows.some((r) => r.result !== 'PASS_VERIFIED')) { const C = v25RoomResultCounts(d, A); why.push(`acceptance needs every applicable test executed, passed and independently verified with evidence: ${C.verified} of ${rows.length} passed and independently verified (${C.recorded} recorded: ${v25RoomResultWords(C).replace(/^\d+ passed and independently verified, /, '')}; ${C.notTested} not tested)`); } }
  if (to === 'ACCEPTED' && open.length) why.push(`${open.length} open issue(s): every deficiency is closed with its retest before acceptance`);
  if (to === 'OPERATIONAL') { if (!d.baseline) why.push('no accepted, signed baseline'); why.push('operational status needs live monitoring evidence on the installed room; an offline synthetic demonstrator cannot produce it, so the room stays ACCEPTED (it is never shown as operational without that evidence)'); }
  if (why.length) return { ok: false, why };
  d.lifecycle = to; d.state = to; if (to === 'INSTALLED_UNVERIFIED') for (const x of d.devices) if (!x.removed) x.lifecycle = 'INSTALLED_UNVERIFIED';
  if (to === 'PLANNED') d.approvedRevision = null; if (to === 'DESIGN_APPROVED') d.approvedRevision = d.revisions.length;
  if (to === 'ACCEPTED') d.baseline = { at: v25Now(), signedBy: v25Persona(), revision: d.approvedRevision, results: JSON.parse(JSON.stringify(d.results || {})), devices: d.devices.filter((x) => !x.removed).map((x) => [x.id, x.model]), state: 'ACCEPTED_BASELINE', note: 'signed accepted baseline (synthetic): the as-accepted design and the verified results; not live monitoring' };
  v25RoomHist(d, `lifecycle ${from} → ${to}`, { lifecycle: from }); v25RoomEmit(to === 'DESIGN_APPROVED' ? 'room.design_approved' : 'room.lifecycle_changed', d, { from, to, revision: d.revisions.length }); v25RoomAnalyze(d, `lifecycle ${to}`); return { ok: true, design: d };
}
function v25RoomAssignIssue(issueId, owner) {
  const i = v25Get(issueId); if (!i || i.type !== 'RoomIssue') return v25RoomDeny('no such room issue', 'api:room.issue_assign'); if (!v25CanSee(i)) return v25RoomDeny(`${issueId} is outside your scope`, 'api:room.issue_assign'); if (!v25Can(['issue.assign', 'route.internal'])) return v25RoomDeny(`${v25PersonaLabel()} cannot assign room issues`, 'api:room.issue_assign');
  if (!owner || !V25_PERSONAS[owner]) return { ok: false, why: ['assign to a persona of this demonstration'] }; v25Update(i.id, { owner, queue: null }, v25Persona(), `assigned to ${owner}`); v25Emit('issue.assigned', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, owner }); return { ok: true, issue: v25Get(i.id) };
}
function v25RoomFault(name, on) { const ek = typeof V25_EDITION !== 'undefined' ? V25_EDITION.kind : 'development'; if (/^investor/.test(ek)) return v25RoomDeny('fault injection is not part of an investor edition', 'api:room.fault'); if (!(ek === 'engineer-private' && v25Can(['room.design', 'room.classify.approve', 'plan.compile'])) && !(ek === 'development' && v25Can('*'))) return v25RoomDeny('fault injection is part of the Private Engineer Edition (or the architect persona)', 'api:room.fault'); if (!['integrationDown', 'rejectApproval', 'missingGeometry', 'conflictingId', 'invalidEvidence'].includes(name)) return { ok: false, why: ['unknown fault'] }; v25RoomFaults()[name] = !!on; return { ok: true, faults: Object.assign({}, v25RoomFaults()) }; }

// ---------------------------------------------------------------- the Core join (Search Party and Pro read these)
function v25CoreDrop(id) { const e = DB.e.get(id); if (!e) return; for (const r of (DB.out.get(id) || []).slice()) unlink(id, r.type, r.to); for (const r of (DB.inn.get(id) || []).slice()) unlink(r.from, r.type, id); DB.e.delete(id); const t = DB.t[e.type]; if (t) { const k = t.indexOf(e); if (k >= 0) t.splice(k, 1); } }
const v25CoreUpsert = (type, id, name, props) => { const e = DB.e.get(id); if (e && e.type === type) { Object.assign(e, props, { name }); return e; } if (e) v25CoreDrop(id); return add(type, id, name, props); };
const v25CoreLinkOnce = (a, rel, b, note) => { if (!DB.e.has(a) || !DB.e.has(b)) return; if ((DB.out.get(a) || []).some((r) => r.type === rel && r.to === b)) return; link(a, rel, b, note); };
function v25RoomJoin(d) {
  if (typeof add !== 'function' || typeof DB === 'undefined') return; if (v25RoomFaults().conflictingId && DB.e.has(d.coreRoomId) && DB.e.get(d.coreRoomId).designId !== d.id) return;
  const operational = d.lifecycle === 'OPERATIONAL'; const cls = d.classification.approved || d.classification.suggested || {}; const live = d.devices.filter((x) => !x.removed); const open = v25All('RoomIssue', (i) => i.designId === d.id);
  const room = v25CoreUpsert(operational ? 'Room' : 'PlannedRoom', d.coreRoomId, d.name, { designId: d.id, planned: !operational, lifecycle: d.lifecycle, lifecycleLabel: d.lifecycle === 'PLANNED' ? 'PLANNED — NOT YET COMMISSIONED' : d.lifecycle.replace(/_/g, ' '), buildingKey: d.buildingKey, floorN: d.floorN, archetype: cls.archetype || null, archetypeName: cls.archetypeName || 'unclassified', classificationApproved: !!d.classification.approved, capacity: cls.capacityEstimate || d.occupancy, criticality: 'Standard', dims: { l: d.geometry.lengthM, w: d.geometry.widthM, h: d.geometry.ceiling }, deviceCount: live.filter((x) => !x.furniture).length, openDesignIssues: open.filter((i) => i.state === 'OPEN').length, health: null, healthState: 'Not commissioned', uptime: null, sourceType: 'Lite room design (proposed)', validationStatus: 'Proposed', confidenceScore: 40, summary: `Planned room from Build a Room with Lite (${d.id}). Not installed; no live health, uptime or alerts.` });
  const floor = `F-${d.buildingKey}-${d.floorN}`; v25CoreLinkOnce(room.id, 'BELONGS_TO', DB.e.has(floor) ? floor : `B-${d.buildingKey}`); if (cls.archetype && DB.e.has(`ARC-${cls.archetype}`)) v25CoreLinkOnce(room.id, 'IS_ARCHETYPE', `ARC-${cls.archetype}`);
  const keep = new Set(live.filter((x) => !x.furniture).map((x) => x.id));
  for (const x of d.devices) { if (x.furniture) continue; if (x.removed) { v25CoreDrop(x.id); continue; } const C = V25_ROOM_CATS[x.cat];
    v25CoreUpsert(operational ? 'Device' : 'PlannedAsset', x.id, `${d.name} · ${x.label}`, { designId: d.id, planned: !operational, category: C.cat || x.cat, catLabel: C.label, domain: C.group, brand: x.brand || 'Generic', model: x.modelName || 'generic sample object', generic: x.generic, state: x.lifecycle === 'INSTALLED_UNVERIFIED' ? 'Installed (unverified)' : 'Planned', stage: 'Planned', lifecycle: x.lifecycle, roomId: d.coreRoomId, buildingKey: d.buildingKey, floorN: d.floorN, sourceType: 'Lite room design (proposed)', validationStatus: 'Proposed', confidenceScore: 40, health: null, healthState: 'Not monitored', mount: x.mount, position: [x.x, x.y], modelHistory: x.modelHistory.slice() });
    v25CoreLinkOnce(room.id, 'PLANS_DEVICE', x.id, 'proposed (not installed)'); }
  for (const e of [...(DB.t.PlannedAsset || [])].concat(DB.t.Device || []).filter((e) => e.designId === d.id && !keep.has(e.id))) v25CoreDrop(e.id);
  const liveConn = new Set(d.connections.filter((c) => !c.removed).map((c) => `${c.from}>${c.to}`)); for (const x of keep) for (const r of (DB.out.get(x) || []).slice()) if (r.type === 'PROPOSED_LINK' && !liveConn.has(`${x}>${r.to}`)) unlink(x, 'PROPOSED_LINK', r.to);
  for (const c of d.connections) if (!c.removed && keep.has(c.from) && keep.has(c.to)) v25CoreLinkOnce(c.from, 'PROPOSED_LINK', c.to, `PROPOSED ${c.kind} connection — not observed`);
  for (const s of d.revisions) { const id = `${d.id}-R${s.n}`; v25CoreUpsert('RoomDesignRevision', id, `${d.name} · revision ${s.n}`, { designId: d.id, n: s.n, hash: s.hash, reason: s.reason, at: s.at, deviceCount: s.devices.filter((x) => !x.furniture).length }); v25CoreLinkOnce(id, 'DESIGN_OF', room.id); }
  const set = v25Get(d.drawingSetId); if (set) { const st = v25RoomDrawingStates(d); for (const [k, s] of Object.entries(st)) { const id = `${set.id}-${k}`; if (s.state === 'DRAFT') { v25CoreDrop(id); continue; } v25CoreUpsert('PlannedDrawing', id, `${d.name} · ${V25_ROOM_DRAWINGS[k]}`, { designId: d.id, kind: k, state: s.state, revisionNo: s.revisionNo }); v25CoreLinkOnce(id, 'DRAWING_OF', room.id); if (['schedule', 'placement'].includes(k)) for (const x of keep) v25CoreLinkOnce(id, 'REFERENCES_ASSET', x); } }
  if (d.applicability) { const id = `${d.id}-CX`; v25CoreUpsert('PlannedCxPlan', id, `${d.name} · commissioning applicability`, { designId: d.id, library: d.applicability.library, applicable: d.applicability.applicable, notApplicable: d.applicability.notApplicable, byStatus: d.applicability.byStatus, passed: 0 }); v25CoreLinkOnce(id, 'CX_PLAN_OF', room.id); for (const r of d.applicability.rows) if (r.applicable) for (const a of r.devices || []) if (keep.has(a)) v25CoreLinkOnce(id, 'REFERENCES_ASSET', a); }
  for (const i of open) { v25CoreUpsert('RoomIssue', i.id, i.name, { designId: d.id, category: i.category, severity: i.severity, status: i.state === 'OPEN' ? 'Open' : 'Resolved', key: i.key, owner: i.owner || i.queue, planned: true }); v25CoreLinkOnce(i.id, 'ISSUE_ON', room.id); for (const a of i.assets) if (keep.has(a)) v25CoreLinkOnce(i.id, 'AFFECTS', a); }
}
{ const was = v25Derive; v25Derive = function v25DeriveRooms() { was(); try { for (const d of v25All('RoomDesign')) v25RoomJoin(d); if (typeof buildIndex === 'function') buildIndex(); } catch (e) { if (window.console) window.console.warn('room join', String(e)); } }; }

// ---------------------------------------------------------------- results, verification, commissioning deficiencies, remediation, APEX (§11–12)
const V25_ROOM_RESULTS = ['PASS', 'FAIL', 'NOT_SUPPORTED', 'INCONCLUSIVE'];
/** How a recorded result reads in exports and messages (audit 253 F-03). Never PASS_VERIFIED without an independent verification. */
const v25RoomResultLabel = (r) => (!r ? 'NOT_TESTED' : r.state === 'PASS' ? (r.verified && r.verified.by && r.verified.by !== r.by ? 'PASS_VERIFIED' : 'PASS_UNVERIFIED') : String(r.state));
/** Counts over the applicable tests, from the results recorded in the page. */
function v25RoomResultCounts(d, A) { const rows = ((A || d.applicability || {}).rows || []).filter((r) => r.applicable); const R = d.results || {}; const L = rows.map((r) => v25RoomResultLabel(R[r.id]));
  return { applicable: rows.length, recorded: L.filter((x) => x !== 'NOT_TESTED').length, verified: L.filter((x) => x === 'PASS_VERIFIED').length, awaiting: L.filter((x) => x === 'PASS_UNVERIFIED').length, failed: L.filter((x) => x === 'FAIL').length, notSupported: L.filter((x) => x === 'NOT_SUPPORTED').length, inconclusive: L.filter((x) => x === 'INCONCLUSIVE').length, notTested: L.filter((x) => x === 'NOT_TESTED').length }; }
/** The recorded-results breakdown in words, every recorded state included (audit 253 rc2, R2-3). */
const v25RoomResultWords = (C) => [`${C.verified} passed and independently verified`, `${C.awaiting} passed awaiting verification`, `${C.failed} failed`].concat(C.notSupported ? [`${C.notSupported} not supported`] : []).concat(C.inconclusive ? [`${C.inconclusive} inconclusive`] : []).join(', ');
/** The machine-readable result of a test row (audit 253 rc3 R3-2): the same label every view and export uses — never a bare PASS. */
function v25RoomResultOf(d, id) { return v25RoomResultLabel((d.results || {})[id]); }
/** Record a physical test result on an installed room: only the test's responsible persona (or the commissioning engineer), only with an
 *  accepted evidence kind and a reference, only once the room is in COMMISSIONING. A design never produces a result. */
function v25RoomRecord(designId, testId, input) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, null, 'api:room.result'); if (g) return g; input = input || {};
  if (d.lifecycle !== 'COMMISSIONING') return { ok: false, why: [`results are recorded on an installed room in COMMISSIONING (this one is ${d.lifecycle}): nothing passes from a design`] };
  const row = (d.applicability.rows || []).find((r) => r.id === testId); if (!row || !row.applicable) return { ok: false, why: [`${testId} does not apply to this room`] };
  const me = v25Persona(); if (!(row.personas || []).includes(me) && me !== 'cxeng' && me !== 'architect') return v25RoomDeny(`${V25_PERSONAS[me] ? V25_PERSONAS[me].label : me} is not the responsible role for ${testId} (${(row.personas || []).join(', ')})`, `api:room.result:${testId}`);
  if (!V25_ROOM_RESULTS.includes(input.state)) return { ok: false, why: ['state is PASS, FAIL, NOT_SUPPORTED or INCONCLUSIVE'] };
  if (v25RoomFaults().invalidEvidence) return { ok: false, why: ['fault injected: the evidence record failed validation — the result is not recorded'] };
  const ev = input.evidence || {}; if (!(row.evidence || []).includes(ev.kind)) return { ok: false, why: [`evidence kind ${ev.kind || '(none)'} is not accepted for ${testId}; accepted: ${(row.evidence || []).join(', ')}`] }; if (!ev.ref || String(ev.ref).trim().length < 4) return { ok: false, why: ['a result needs an evidence reference'] };
  if (row.instrument && !ev.instrument) return { ok: false, why: [`${testId} is instrument-measured: name the instrument and its calibration`] };
  const results = d.results || (d.results = {}); const prev = results[testId]; results[testId] = { state: input.state, evidence: { kind: ev.kind, ref: String(ev.ref).slice(0, 200), instrument: ev.instrument || null }, by: me, at: v25Now(), verified: null, history: (prev ? (prev.history || []).concat([{ state: prev.state, by: prev.by, at: prev.at, verified: prev.verified }]) : []) };
  v25RoomHist(d, `result ${testId}: ${input.state}`, { [testId]: prev ? prev.state : 'NOT_TESTED' });
  v25Emit('commission.test_result_submitted', { aggregateType: 'RoomDesign', aggregateId: d.id, aggregateRevision: d.rev, planId: `${d.id}-CX`, testId, state: input.state, resultLabel: v25RoomResultLabel(results[testId]), evidence: ev.kind, designId: d.id, roomId: d.coreRoomId });   // resultLabel: a submitted PASS is PASS_UNVERIFIED (R3-2)
  if (input.state === 'FAIL') { v25Emit('commission.test_failed', { aggregateType: 'RoomDesign', aggregateId: d.id, aggregateRevision: d.rev, planId: `${d.id}-CX`, testId, roomId: d.coreRoomId }); v25RoomCxIssue(d, row, results[testId]); }
  if (input.state === 'PASS') v25RoomCxRetest(d, testId);
  v25RoomApplicabilityCompile(d, `result ${testId}`, true); v25RoomJoin(d); return { ok: true, design: d, result: results[testId] };
}
/** Independent verification: someone other than the recorder confirms a PASS (as in the commissioning engine). */
function v25RoomVerify(designId, testId) {
  const d = v25RoomDesign(designId); const g = v25RoomGuard(d, ['tests.verify.all', 'test.verify', 'customer.accept'], 'api:room.verify'); if (g) return g; const r = (d.results || {})[testId];
  if (!r || r.state !== 'PASS') return { ok: false, why: ['only a recorded PASS can be verified'] }; if (r.by === v25Persona()) return { ok: false, why: ['verification must be independent of the person who recorded the result'] }; if (r.verified) return { ok: false, why: ['already verified'] };
  r.verified = { by: v25Persona(), at: v25Now() }; v25RoomHist(d, `result ${testId} verified`, {}); v25RoomEmit('room.test_verified', d, { testId, resultLabel: v25RoomResultLabel(r), verifiedBy: r.verified.by }); v25RoomCxRetest(d, testId); v25RoomApplicabilityCompile(d, `verified ${testId}`, true); v25RoomJoin(d); return { ok: true, design: d };
}
/** A failed test opens (or updates) one INSTALLATION / COMMISSIONING deficiency, correlated with any open design issue on the same assets. */
function v25RoomCxIssue(d, row, res) {
  const key = `test-failed:${row.id}`; const assets = row.devices || []; let i = v25All('RoomIssue', (x) => x.designId === d.id && x.key === key)[0]; const related = v25All('RoomIssue', (x) => x.designId === d.id && x.key !== key && x.assets.some((a) => assets.includes(a))).map((x) => x.id);
  if (!i) { i = v25Create('RoomIssue', { name: `${row.label} failed`, designId: d.id, key, category: 'INSTALLATION_COMMISSIONING_DEFICIENCY', check: 'commissioning_test_failed', severity: row.tier === 1 ? 'High' : 'Medium', rationale: `the ${row.label} test failed on the installed room (evidence ${res.evidence.kind} ${res.evidence.ref})`, assets, detectors: ['commissioning: physical test result'], state: 'OPEN', status: 'OPEN', owner: null, queue: 'Commissioning deficiency queue (unassigned)', nextAction: 'remediate, then retest; a closed work order does not pass the test', firstSeenRev: d.revisions.length, lastSeenRev: d.revisions.length, affectedRevision: d.revisions.length, seen: 1, related, evidence: [{ at: v25Now(), source: 'test result', finding: `FAIL by ${res.by}`, revision: d.revisions.length }], resolution: null, retest: `${row.id} must PASS and be independently verified`, workOrders: [], hypotheses: [], provenance: 'FIELD_OBSERVED', scope: { siteId: d.scope.siteId, buildingKey: d.buildingKey, roomId: d.coreRoomId } }, 'system');
    d.issueIds.push(i.id); v25Emit('commission.deficiency_opened', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: i.rev, planId: `${d.id}-CX`, testId: row.id, issueId: i.id }); v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: i.rev, issueId: i.id, status: 'OPEN', change: 'created', roomId: d.coreRoomId }); return i; }
  v25Update(i.id, { state: 'OPEN', status: 'OPEN', seen: i.seen + 1, related: [...new Set(i.related.concat(related))], evidence: i.evidence.concat([{ at: v25Now(), source: 'test result', finding: `FAIL again by ${res.by}`, revision: d.revisions.length }]) }, 'system', 'the test failed again'); v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, status: 'OPEN', change: 'failed again', roomId: d.coreRoomId }); return i;
}
function v25RoomCxRetest(d, testId) { const i = v25All('RoomIssue', (x) => x.designId === d.id && x.key === `test-failed:${testId}` && x.state === 'OPEN')[0]; const r = (d.results || {})[testId]; if (!i || !r || r.state !== 'PASS' || !r.verified) return;
  v25Update(i.id, { state: 'RESOLVED', status: 'RESOLVED', resolution: { at: v25Now(), by: r.verified.by, revision: d.revisions.length, how: `retest ${testId} PASS by ${r.by}, verified by ${r.verified.by} (evidence ${r.evidence.kind} ${r.evidence.ref})`, evidence: r.evidence } }, r.verified.by, 'resolved by a verified retest');
  v25Emit('commission.deficiency_resolved', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, planId: `${d.id}-CX`, testId, issueId: i.id }); v25Emit('issue.created_or_updated', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, status: 'RESOLVED', change: 'resolved', roomId: d.coreRoomId }); }
/** ServiceHands: a controlled remediation work order for an installation / commissioning deficiency. Closing it never passes the test. */
function v25RoomWorkOrder(issueId, op, input) {
  const i = v25Get(issueId); if (!i || i.type !== 'RoomIssue') return v25RoomDeny('no such room issue', 'api:room.work_order'); if (!v25CanSee(i)) return v25RoomDeny(`${issueId} is outside your scope`, 'api:room.work_order'); const d = v25Get(i.designId); input = input || {};
  if (op === 'create') { if (!v25Can(['service.assign', 'service.triage'])) return v25RoomDeny(`${v25PersonaLabel()} cannot raise ServiceHands work orders`, 'api:room.work_order'); if (i.category !== 'INSTALLATION_COMMISSIONING_DEFICIENCY') return { ok: false, why: ['a design deficiency on a planned room gets a design change, not a field work order'] }; if (i.state !== 'OPEN') return { ok: false, why: ['the issue is not open'] };
    const tech = input.techPersona && V25_PERSONAS[input.techPersona] ? input.techPersona : 'service'; const wo = { id: `RWO-${i.id.slice(5)}-${(i.workOrders || []).length + 1}`, state: 'OPEN', issueId: i.id, roomId: d.coreRoomId, assets: i.assets.slice(), evidence: i.evidence.slice(-1), assignedTo: tech, retest: i.retest, createdBy: v25Persona(), at: v25Now() };
    // the hand-off into ServiceHands dispatch: the same remediation as a ServiceHands work order, with its hard-gated staffing, preflight, field evidence and
    // independent verification. Both records point at each other; neither closure passes the test — only a verified commissioning retest does.
    const sh = v25WorkOrderCreate({ roomId: d.coreRoomId, workType: 'break_fix', kind: 'service', deficiencyId: i.id, title: `Remediate: ${i.name}`, summary: `Build a Room ${i.category.replace(/_/g, ' ').toLowerCase()} ${i.id} on ${d.name} (${d.id}). Assets ${i.assets.join(', ') || 'none named'}. ${i.retest ? `Retest required: ${i.retest}. ` : ''}Closing this work order does not pass the test; the commissioning retest must be recorded with evidence and independently verified in Build a Room.` });
    if (sh.ok) { wo.serviceWorkOrderId = sh.workOrder.id; v25Update(sh.workOrder.id, { roomIssueId: i.id, roomWorkOrderId: wo.id, designId: d.id }, v25Persona(), `linked to ${i.id} / ${wo.id}`); } else wo.serviceHandoff = { ok: false, why: sh.why };
    v25Update(i.id, { workOrders: (i.workOrders || []).concat([wo]), owner: tech, queue: null }, v25Persona(), `work order ${wo.id} raised${sh.ok ? ` (ServiceHands ${sh.workOrder.id})` : ''}`); v25Emit('room.work_order_created', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, workOrderId: wo.id, issueId: i.id, roomId: d.coreRoomId }); return { ok: true, workOrder: wo }; }
  if (op === 'close') { const wo = (i.workOrders || []).find((w) => w.id === input.id); if (!wo || wo.state !== 'OPEN') return { ok: false, why: ['no open work order with that id'] }; if (wo.assignedTo !== v25Persona() && !v25Can(['service.close'])) return v25RoomDeny('only the assigned technician or the service manager closes the work order', 'api:room.work_order');
    const wos = i.workOrders.map((w) => (w.id === wo.id ? Object.assign({}, w, { state: 'CLOSED', closedBy: v25Persona(), closedAt: v25Now(), note: String(input.note || 'remediation done; retest required') }) : w)); v25Update(i.id, { workOrders: wos }, v25Persona(), `work order ${wo.id} closed — the test still needs a verified retest`); v25Emit('room.work_order_closed', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, workOrderId: wo.id, issueId: i.id }); return { ok: true, issue: v25Get(i.id) }; }
  return { ok: false, why: ['op is create or close'] };
}
// ServiceHands context packet for a planned room: its proposed (or installed, unverified) assets come from the room's own plan, not from Core
// Device records, and the packet says so. The operational context stays as ServiceHands computes it.
{ const was = v25ServiceContext; const ctxPlanned = function v25ServiceContextPlanned(wo) { const c = was(wo); if (c.room && c.room.type === 'PlannedRoom') {
    c.devices = outs(c.room.id, 'PLANS_DEVICE', 'PlannedAsset').map((a) => ({ id: a.id, name: a.name, category: a.catLabel || a.category || 'planned asset', model: `${a.brand && a.brand !== 'Generic' ? `${a.brand} ` : ''}${a.model || 'generic'} — ${a.state === 'Planned' ? 'planned, not installed' : a.state || 'planned, not installed'}`, supportEnd: null, cost: null }));
    c.planned = { designId: c.room.designId, lifecycle: c.room.lifecycleLabel || c.room.lifecycle, note: 'a Build a Room design: not an operational room; health, uptime and alerts are not monitored' };
    if (wo.roomIssueId) c.intent = c.intent || `Remediation for ${wo.roomIssueId}`; } return c; };
  v25ServiceContext = ctxPlanned; if (V25API.svc) V25API.svc.context = ctxPlanned; }
/** APEX: evidence-based hypotheses about a deficiency's cause — always HYPOTHESIS until a physical check confirms one. */
function v25RoomApex(issueId) {
  const i = v25Get(issueId); if (!i || i.type !== 'RoomIssue') return v25RoomDeny('no such room issue', 'api:room.apex'); if (!v25CanSee(i)) return v25RoomDeny(`${issueId} is outside your scope`, 'api:room.apex'); if (!v25Can(['tests.verify.all', 'test.verify', 'rfi.resolve', 'design.release'])) return v25RoomDeny(`${v25PersonaLabel()} cannot run APEX analysis`, 'api:room.apex');
  const d = v25Get(i.designId); const hyps = []; for (const rid of i.related || []) { const r = v25Get(rid); if (r) hyps.push({ cause: `design issue ${r.id}: ${r.name}`, basis: `shares asset(s) ${r.assets.filter((a) => i.assets.includes(a)).join(', ')} with this deficiency`, state: 'HYPOTHESIS' }); }
  for (const a of i.assets) { const x = d.devices.find((y) => y.id === a); if (x && x.modelHistory.length) hyps.push({ cause: `${x.label} was swapped (${x.modelHistory.map((h) => h.model).join(' → ')} → ${x.model})`, basis: 'a substitution after the design was reviewed', state: 'HYPOTHESIS' }); if (x && x.generic) hyps.push({ cause: `${x.label} is still a generic sample object`, basis: 'the installed model was never recorded in the design', state: 'HYPOTHESIS' }); }
  if (!hyps.length) hyps.push({ cause: 'no design-side cause found in the records', basis: 'only physical inspection can tell', state: 'HYPOTHESIS' });
  v25Update(i.id, { hypotheses: hyps }, v25Persona(), 'APEX hypotheses recorded (not verified faults)'); v25Emit('room.hypothesis_recorded', { aggregateType: 'RoomIssue', aggregateId: i.id, aggregateRevision: v25Get(i.id).rev, issueId: i.id, count: hyps.length }); return { ok: true, hypotheses: hyps };
}

V25API.room = { cats: V25_ROOM_CATS, templates: V25_ROOM_TEMPLATES, drawingsList: V25_ROOM_DRAWINGS, lifecycleStates: V25_ROOM_LIFECYCLE, units: V25_ROOM_UNITS, models: v25RoomModels, parseLen: v25RoomParseLen, toM: v25RoomToM, fromM: v25RoomFromM,
  create: v25RoomCreate, undo: (id) => v25RoomUndo(id, 'undo'), redo: (id) => v25RoomUndo(id, 'redo'), add: v25RoomAdd, move: v25RoomMove, swap: v25RoomSwap, remove: v25RoomRemove, duplicate: v25RoomDuplicate, connection: v25RoomConnection, geometry: v25RoomGeometry, confirmScale: v25RoomConfirmScale,
  approveClassification: v25RoomApproveClass, save: v25RoomSaveRevision, compare: v25RoomCompare, checks: (id) => { const d = v25RoomDesign(id); return d ? v25RoomChecks(d) : []; }, applicability: (id) => { const d = v25RoomDesign(id); return d ? d.applicability : null; },
  workbook: v25RoomWorkbook, generate: v25RoomGenerate, approveDrawing: v25RoomApproveDrawing, redline: v25RoomRedline, drawingStates: (id) => { const d = v25RoomDesign(id); return d ? v25RoomDrawingStates(d) : null; }, lifecycle: v25RoomLifecycle, assignIssue: v25RoomAssignIssue, fault: v25RoomFault,
  issues: (id) => v25All('RoomIssue', (i) => i.designId === id), list: () => v25All('RoomDesign'), record: v25RoomRecord, verify: v25RoomVerify, workOrder: v25RoomWorkOrder, apex: v25RoomApex };
