/**
 * Positions, physical assets and installations (ADR-0012) — pure rules shared by the enterprise API and the investor demonstration.
 *
 *   position (PA-xxxx)   the logical slot in a room: purpose, mounting, geometry and its design history (model substitutions)
 *   physical asset (AS-) the unit: category, manufacturer, model (immutable), serial, and how well its identity is known
 *   installation         a dated relationship unit × position, with the reasons, actors and evidence of both ends
 *
 * Nothing here reads a database or a clock. The callers (rooms/installations in the API, Build a Room in the demonstration) hand in the
 * facts, apply a plan inside their own transaction and keep their own bookkeeping; the database constraints are the backstop.
 */
import type { DeviceSubstitution, ChangeKind } from './substitution.js';

export const IDENTITY_STATES = ['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'] as const;
export type IdentityState = (typeof IDENTITY_STATES)[number];
export type InstallReason = 'INITIAL' | 'REPLACEMENT' | 'SUBSTITUTION' | 'RELOCATION' | 'MIGRATED';
export type RemovalReason = 'REPLACED' | 'SUBSTITUTED' | 'RELOCATED' | 'REMOVED';
/** How an installation's start is known: RECORDED when it was recorded; KNOWN_AS_OF_MIGRATION = in place no later than the migration. */
export type EffectiveBasis = 'RECORDED' | 'KNOWN_AS_OF_MIGRATION';

/** Room lifecycle states in which hardware is in place (a position in one of them holds a unit). */
export const INSTALLED_STATES = ['INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'] as const;
/** Room lifecycle states in which a unit may be installed at an empty position: before commissioning results can exist (when the room
 *  reaches INSTALLED_UNVERIFIED every position without a recorded unit gets one of UNKNOWN identity, so none is empty afterwards). */
export const INSTALL_STATES = ['INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED'] as const;
/** Room lifecycle states in which a unit may be replaced like for like (an accepted room is recommissioned first, ADR-0003). */
export const REPLACE_STATES = ['INSTALLED_UNVERIFIED', 'COMMISSIONING'] as const;

export interface PositionFact { code: string; category: string; label: string; model: string; furniture?: boolean }
/** A unit's disposition (migration 0030): IN_SERVICE (installed, or a spare that may be installed) or RETIRED (out of the inventory for
 *  good: never installed again, its code never reused, its whole history kept). Absent = IN_SERVICE (records written before 0030). */
export const DISPOSITIONS = ['IN_SERVICE', 'RETIRED'] as const;
export type Disposition = (typeof DISPOSITIONS)[number];
export const RETIREMENT_REASONS = ['REPLACED', 'FAILED', 'DISPOSED', 'RETURNED_TO_VENDOR', 'LOST'] as const;
export type RetirementReason = (typeof RETIREMENT_REASONS)[number];
export interface Retirement { at: string; by: string | null; reason: RetirementReason; note?: string | null }
export interface AssetFact { code: string; category: string; manufacturer: string | null; model: string; serial: string | null; identityState: IdentityState; disposition?: Disposition; retired?: Retirement | null }
export interface InstallationFact {
  id: string; position: string; asset: string; installedAt: string; removedAt: string | null; basis: EffectiveBasis;
  installReason: InstallReason; removalReason: RemovalReason | null; installedBy: string | null; removedBy: string | null;
}

// ------------------------------------------------------------------------------------------------ one reading of a device
/** What every surface shows for a device: the position, the unit installed there now (null = none), and that unit's identity state. */
export interface DeviceIdentity { position: string; asset: string | null; identityState: IdentityState | null }
/** The open installation at a position (at most one: the database refuses a second). */
export const openAt = (position: string, installations: readonly InstallationFact[]) => installations.find((i) => i.position === position && !i.removedAt) || null;
export function identityOf(position: string, installations: readonly InstallationFact[], assets: ReadonlyMap<string, AssetFact>): DeviceIdentity {
  const i = openAt(position, installations); const a = i ? assets.get(i.asset) : undefined;
  return { position, asset: i ? i.asset : null, identityState: a ? a.identityState : null };
}
/** The same words everywhere: “PA-0061 · unit AS-0009 · identity UNKNOWN”, or “PA-0061 · no unit installed”. */
export const identityText = (d: DeviceIdentity) => (d.asset ? `${d.position} · unit ${d.asset} · identity ${d.identityState}` : `${d.position} · no unit installed`);

// ------------------------------------------------------------------------------------------------ plans and refusals
/** A plan, or the reasons it is refused; `conflict` marks a refusal caused by a concurrent or stale change (HTTP 409, not 422). */
export type Planned<T> = { ok: true; plan: T } | { ok: false; conflict: boolean; why: string[] };
const no = (why: string, conflict = false): { ok: false; conflict: boolean; why: string[] } => ({ ok: false, conflict, why: [why] });
/** The unit to install: an existing (spare) asset with its current installation elsewhere if any, or a new one to register. */
export type IncomingUnit =
  | { existing: AssetFact; openElsewhere: InstallationFact | null }
  | { create: { manufacturer?: string | null; serial?: string | null } };

export interface InstallPlan { position: string; asset: string | null; model: string; manufacturer: string | null; serial: string | null; identityState: IdentityState; installReason: 'INITIAL' }
/** Install a unit at an empty position. */
export function planInstall(i: { lifecycle: string; position: PositionFact; open: InstallationFact | null; incoming: IncomingUnit }): Planned<InstallPlan> {
  if (!(INSTALL_STATES as readonly string[]).includes(i.lifecycle)) return no(`units are installed while the room is ${INSTALL_STATES.join(', ')} (this one is ${i.lifecycle})${['ACCEPTED', 'OPERATIONAL'].includes(i.lifecycle) ? ': an accepted room is recommissioned first' : ''}`);
  if (i.position.furniture) return no(`${i.position.code} is furniture: it has no tracked unit`);
  if (i.open) return no(`${i.position.code} already holds ${i.open.asset} (installed ${i.open.installedAt}): one unit per position — replace it instead`, true);
  const unit = incomingUnit(i.position, i.position.model, i.incoming); if ('ok' in unit) return unit;
  return { ok: true, plan: { position: i.position.code, installReason: 'INITIAL', ...unit } };
}

export interface ReplacementPlan {
  /** REPLACEMENT: another unit of the same model (field work); SUBSTITUTION: a unit of a different model (a design change). */
  kind: 'REPLACEMENT' | 'SUBSTITUTION'; change: ChangeKind; designChange: boolean;
  close: { installation: string; asset: string; reason: 'REPLACED' | 'SUBSTITUTED' };
  /** what becomes of the unit taken out: RETIRE (the default: it leaves the inventory and its code is never used again) or SPARE (the
   *  person replacing it says it goes back to the spares, still in service) */
  outgoing: 'RETIRE' | 'SPARE';
  open: { position: string; asset: string | null; model: string; manufacturer: string | null; serial: string | null; identityState: IdentityState; installReason: 'REPLACEMENT' | 'SUBSTITUTION' };
}
/**
 * Replace the unit at a position: close the current installation and open a new one with a new or a spare unit. A unit of the
 * position's model is a like-for-like REPLACEMENT; a different model is a model SUBSTITUTION (a design change, made only while an
 * accepted room is recommissioned, and approved as a revision). `expected` is the installation the caller last read: a different one
 * means someone changed the position since, and the plan is refused as a conflict.
 */
export function planReplacement(i: { lifecycle: string; recommissioning: boolean; position: PositionFact; open: InstallationFact | null; expected?: string | null; model?: string | null; incoming: IncomingUnit; outgoing?: 'RETIRE' | 'SPARE' }): Planned<ReplacementPlan> {
  const model = i.model || i.position.model;
  const kind = model === i.position.model ? 'REPLACEMENT' : 'SUBSTITUTION';
  if (kind === 'REPLACEMENT' && !(REPLACE_STATES as readonly string[]).includes(i.lifecycle)) return no(`a unit is replaced while the room is ${REPLACE_STATES.join(' or ')} (this one is ${i.lifecycle})${['ACCEPTED', 'OPERATIONAL'].includes(i.lifecycle) ? ': an accepted room is recommissioned first (ACCEPTED → COMMISSIONING, plan.compile)' : ''}`);
  if (kind === 'SUBSTITUTION' && !i.recommissioning) return no(`a different model at ${i.position.code} is a design change: it is made while the room is PLANNED, or while an accepted room is recommissioned (this one is ${i.lifecycle})`);
  if (!i.open) return no(`${i.position.code} has no current installation: install a unit first`);
  if (i.expected && i.expected !== i.open.id) return no(`the current installation at ${i.position.code} is ${i.open.id}, not ${i.expected}: the position changed since it was read — read it again`, true);
  if ('existing' in i.incoming && i.incoming.existing.code === i.open.asset) return no(`${i.open.asset} is already the unit at ${i.position.code}`);
  const unit = incomingUnit(i.position, model, i.incoming); if ('ok' in unit) return unit;
  return { ok: true, plan: { kind, change: kind === 'REPLACEMENT' ? 'REPLACED' : 'SUBSTITUTED', designChange: kind === 'SUBSTITUTION',
    close: { installation: i.open.id, asset: i.open.asset, reason: kind === 'REPLACEMENT' ? 'REPLACED' : 'SUBSTITUTED' }, outgoing: i.outgoing === 'SPARE' ? 'SPARE' : 'RETIRE',
    open: { position: i.position.code, installReason: kind, ...unit } } };
}

function incomingUnit(p: PositionFact, model: string, u: IncomingUnit): { asset: string | null; model: string; manufacturer: string | null; serial: string | null; identityState: IdentityState } | { ok: false; conflict: boolean; why: string[] } {
  if ('existing' in u) {
    const a = u.existing;
    if (a.disposition === 'RETIRED') return no(`${a.code} was retired${a.retired ? ` (${a.retired.reason.toLowerCase().replace(/_/g, ' ')}, ${a.retired.at.slice(0, 10)})` : ''}: a retired unit is never installed again, and its code is never reused — register the incoming unit as a new asset`);
    if (u.openElsewhere) return no(`${a.code} is installed at ${u.openElsewhere.position} since ${u.openElsewhere.installedAt}: a unit occupies one position at a time — replace or remove it there first`, true);
    if (a.category !== p.category) return no(`${a.code} is a ${a.category}; ${p.code} is a ${p.category} position`);
    if (a.model !== model) return no(`${a.code} is a ${a.model}; ${p.code} needs a ${model}${model === p.model ? ' (a different model is a design change: substitute the model of the position instead)' : ''}`);
    return { asset: a.code, model: a.model, manufacturer: a.manufacturer, serial: a.serial, identityState: a.identityState };
  }
  const serial = u.create.serial?.trim() || null;
  return { asset: null, model, manufacturer: u.create.manufacturer?.trim() || null, serial, identityState: serial ? 'DECLARED' : 'UNKNOWN' };
}

export interface IdentityPlan { from: IdentityState; to: IdentityState; serial: string; manufacturer: string | null; evidence: string | null }
/**
 * Record what is known of a unit's identity. It only moves forward: UNKNOWN → DECLARED needs a serial (as read from the label, the
 * packing list or the order); OBSERVED and VERIFIED need an evidence object; VERIFIED is never by a person who declared or observed it
 * (`priorActors`). A recorded serial or manufacturer is final: a different serial is a different unit. Nothing is ever downgraded.
 */
export function planIdentity(a: AssetFact, to: string, input: { serial?: string | null; manufacturer?: string | null; evidence?: string | null; actor: string; priorActors: readonly string[] }): Planned<IdentityPlan> {
  if (!(IDENTITY_STATES as readonly string[]).includes(to) || to === 'UNKNOWN') return no('the identity is recorded as DECLARED, OBSERVED or VERIFIED');
  if (a.disposition === 'RETIRED') return no(`${a.code} is retired: its identity is final, as it was when it left the inventory`);
  const rank = (s: string) => IDENTITY_STATES.indexOf(s as IdentityState);
  if (rank(to) <= rank(a.identityState)) return no(`${a.code} is ${a.identityState}: ${to} is not a step forward (an identity is never downgraded or recorded twice)`);
  const serial = input.serial?.trim() || null; const maker = input.manufacturer?.trim() || null;
  if (a.serial && serial && serial !== a.serial) return no(`${a.code} carries serial ${a.serial}: a different serial is a different unit — register it as its own asset`);
  if (a.manufacturer && maker && maker !== a.manufacturer) return no(`${a.code} is recorded as made by ${a.manufacturer}: a recorded manufacturer is final`);
  const s = a.serial || serial;
  if (!s) return no(`${to} needs the unit's serial number (nothing is recorded as known without it)`);
  if ((to === 'OBSERVED' || to === 'VERIFIED') && !input.evidence) return no(`${to} needs an evidence object (a photograph of the label, a scan, a read-back)`);
  if (to === 'VERIFIED' && input.priorActors.includes(input.actor)) return no('separation of duties: an identity is verified by someone other than the person who declared or observed it');
  return { ok: true, plan: { from: a.identityState, to: to as IdentityState, serial: s, manufacturer: a.manufacturer || maker, evidence: input.evidence || null } };
}

export interface RetirementPlan { asset: string; reason: RetirementReason; note: string | null }
/**
 * Retire a unit: it leaves the active inventory for good. Only a unit that is not installed anywhere (close its installation first:
 * a replacement does both at once), and only once — a retired unit never returns, and its code is never issued to another unit.
 */
export function planRetirement(a: AssetFact, open: InstallationFact | null, reason: string, note?: string | null): Planned<RetirementPlan> {
  if (!(RETIREMENT_REASONS as readonly string[]).includes(reason)) return no(`a retirement gives its reason: ${RETIREMENT_REASONS.join(', ')}`);
  if (a.disposition === 'RETIRED') return no(`${a.code} is already retired${a.retired ? ` (${a.retired.at.slice(0, 10)})` : ''}: a retirement is recorded once and is final`);
  if (open) return no(`${a.code} is installed at ${open.position} since ${open.installedAt}: replace or remove it there first`, true);
  const n = note?.trim() || null;
  if (n && n.length > 500) return no('the note is at most 500 characters');
  return { ok: true, plan: { asset: a.code, reason: reason as RetirementReason, note: n } };
}

/** The inventory: units in service (installed, or spare) and the retired register (out of service for good, their codes reserved). */
export interface InventoryRow { asset: AssetFact; installedAt: string | null; position: string | null; placements: number }
export function inventoryOf(assets: readonly AssetFact[], installations: readonly InstallationFact[]): { inService: InventoryRow[]; spares: InventoryRow[]; retired: InventoryRow[] } {
  const rows = assets.map((a) => { const open = installations.find((i) => i.asset === a.code && !i.removedAt) || null; return { asset: a, installedAt: open?.installedAt ?? null, position: open?.position ?? null, placements: installations.filter((i) => i.asset === a.code).length }; });
  const retired = rows.filter((r) => r.asset.disposition === 'RETIRED');
  const live = rows.filter((r) => r.asset.disposition !== 'RETIRED');
  return { inService: live.filter((r) => r.position), spares: live.filter((r) => !r.position), retired };
}
// ------------------------------------------------------------------------------------------------ the device register (0031)
/** What the installation team reads on site about a unit, beside its identity: hostname, IPv4, MAC, firmware, location. */
export interface RegisterEntry { hostname: string | null; ip: string | null; mac: string | null; firmware: string | null; location: string | null }
export const REGISTER_FIELDS = ['hostname', 'ip', 'mac', 'firmware', 'location'] as const;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const HOSTNAME = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const MAC = /^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/;
const FIRMWARE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,39}$/;
/**
 * Plan a new version of a unit's register row: the fields given replace the current ones (an empty string clears one), the rest are kept.
 * Refused: a retired unit; a value in the wrong form; an address or hostname on a unit that is not networked; nothing changed.
 * Uniqueness across units (a hostname, address or MAC current on another unit) is the caller's query and the database's backstop.
 */
export function planRegisterEntry(a: AssetFact, networked: boolean, current: RegisterEntry | null, input: Partial<Record<(typeof REGISTER_FIELDS)[number], string | null>>): Planned<RegisterEntry> {
  if (a.disposition === 'RETIRED') return no(`${a.code} is retired: a retired unit takes no register entry`);
  const why: string[] = []; const next: RegisterEntry = { hostname: current?.hostname ?? null, ip: current?.ip ?? null, mac: current?.mac ?? null, firmware: current?.firmware ?? null, location: current?.location ?? null };
  for (const k of REGISTER_FIELDS) { if (!(k in input)) continue; const v = (input[k] ?? '').toString().trim(); next[k] = v || null; }
  if (next.hostname && !HOSTNAME.test(next.hostname)) why.push('a hostname is one label of letters, digits and dashes (at most 63), not starting or ending with a dash');
  if (next.ip && !IPV4.test(next.ip)) why.push('an IP address is four numbers 0–255 separated by dots');
  if (next.mac && !MAC.test(next.mac)) why.push('a MAC address is six pairs of hexadecimal digits separated by colons or dashes');
  if (next.firmware && !FIRMWARE.test(next.firmware)) why.push('a firmware version is up to 40 letters, digits, dots, dashes or spaces');
  if (next.location && next.location.length > 120) why.push('a location is at most 120 characters');
  if (!networked && (next.ip || next.hostname || next.mac)) why.push(`${a.category} is not a networked device class: it has no IP address, hostname or MAC`);
  if (why.length) return { ok: false, conflict: false, why };
  if (current && REGISTER_FIELDS.every((k) => (current[k] ?? null) === (next[k] ?? null))) return no('nothing changed: the register already says this');
  if (next.mac) next.mac = next.mac.toLowerCase().replace(/-/g, ':');
  return { ok: true, plan: next };
}
/** What a register row still needs: the serial (on the unit's identity) for every unit; hostname and IP for a networked one (v1.3 rule). */
export function registerMissing(a: AssetFact | null, networked: boolean, e: RegisterEntry | null): string[] {
  const m: string[] = [];
  if (!a) return ['a unit (nothing is installed at the position)'];
  if (!a.serial) m.push('serial');
  if (networked && !e?.hostname) m.push('hostname');
  if (networked && !e?.ip) m.push('IP address');
  return m;
}

/** A code is never reused: true when `code` names any unit on record, retired or not. */
export const codeTaken = (code: string, assets: readonly Pick<AssetFact, 'code'>[]) => assets.some((a) => a.code === code);

// ------------------------------------------------------------------------------------------------ changes of unit and history
/** One change of unit at a position, in the terms the reverification rule takes (`reopenedBySubstitution`). */
export interface UnitChange extends DeviceSubstitution { kind: ChangeKind; fromAsset: string | null; toAsset: string | null; at: string; by: string | null }
/**
 * The like-for-like replacements the installation records show after `sinceMs`: each REPLACEMENT installation with the unit it replaced
 * (the closed installation at the same position that ended when it began). Model substitutions are design changes and come from the
 * position's design history; `attachUnits` names their units.
 */
export function replacementsOf(positions: readonly PositionFact[], installations: readonly InstallationFact[], sinceMs = -Infinity): UnitChange[] {
  const pos = new Map(positions.map((p) => [p.code, p]));
  return installations.filter((i) => i.installReason === 'REPLACEMENT' && Date.parse(i.installedAt) > sinceMs && pos.has(i.position)).map((i) => {
    const p = pos.get(i.position)!; const prev = previousAt(i, installations);
    return { assetId: p.code, label: p.label, category: p.category, from: prev?.asset || 'an unrecorded unit', to: i.asset, kind: 'REPLACED' as const, model: p.model, fromAsset: prev?.asset || null, toAsset: i.asset, at: i.installedAt, by: i.installedBy };
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
/** The installation that ended at a position when `i` began there (the unit `i` replaced), if recorded. */
export function previousAt(i: InstallationFact, installations: readonly InstallationFact[]): InstallationFact | null {
  return installations.filter((x) => x.position === i.position && x.removedAt && Date.parse(x.removedAt) <= Date.parse(i.installedAt)).sort((a, b) => Date.parse(b.removedAt!) - Date.parse(a.removedAt!))[0] || null;
}
/** Name the units of a model substitution: the SUBSTITUTION installation at the position that began at (or just before) the change. */
export function substitutionUnits(position: string, atMs: number, installations: readonly InstallationFact[]): { fromAsset: string | null; toAsset: string | null } {
  const i = installations.filter((x) => x.position === position && x.installReason === 'SUBSTITUTION' && Date.parse(x.installedAt) <= atMs + 1000).sort((a, b) => Date.parse(b.installedAt) - Date.parse(a.installedAt))[0];
  return i ? { fromAsset: previousAt(i, installations)?.asset || null, toAsset: i.asset } : { fromAsset: null, toAsset: null };
}
/** A position's installation timeline, oldest first (its design history is kept apart, on the position). */
export const timelineOf = (position: string, installations: readonly InstallationFact[]) => installations.filter((i) => i.position === position).sort((a, b) => Date.parse(a.installedAt) - Date.parse(b.installedAt));
/** A unit's installations across positions and rooms, oldest first: the history follows the unit when it moves. */
export const placementsOf = (asset: string, installations: readonly InstallationFact[]) => installations.filter((i) => i.asset === asset).sort((a, b) => Date.parse(a.installedAt) - Date.parse(b.installedAt));
/** One line per installation record, the same words in the API's history and the demonstration's register and story. */
export function installationSentence(i: InstallationFact, who: (id: string | null) => string = (x) => x || 'nobody recorded'): string {
  const start = i.basis === 'KNOWN_AS_OF_MIGRATION' ? `in place at ${i.position} as of ${i.installedAt} (known as of the migration; installation date not on record)` : `installed at ${i.position} on ${i.installedAt} by ${who(i.installedBy)} (${i.installReason.toLowerCase()})`;
  return `${i.asset} ${start}${i.removedAt ? `; removed ${i.removedAt} by ${who(i.removedBy)} (${String(i.removalReason).toLowerCase()})` : '; still installed'}`;
}
