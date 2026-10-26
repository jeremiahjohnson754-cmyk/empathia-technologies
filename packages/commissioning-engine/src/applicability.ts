/**
 * Commissioning applicability: judge every test definition in the library (33 base + 61 discipline-pack = 94 in 2.5.x) for one room.
 *
 * Each definition is APPLICABLE (with the rules that selected it) or NOT_APPLICABLE (with a justification). An applicable test gets
 * exactly one execution state: PENDING_INFORMATION (facts missing), BLOCKED_BY_PREREQUISITE (design not approved) or
 * REQUIRES_PHYSICAL_EXECUTION. The engine NEVER produces a pass: results only come from recorded field evidence (results.ts).
 *
 * Ported from `v25RoomApplicabilityCompute` (src/v25-60-room.js), `v25RequiredTests` (src/v25-05-design.js) and `v25CxApplies`
 * (src/v25-096-cxuni.js). Deterministic; O(T) in the library size with small constant per test.
 */
import type {
  Applicability, ApplicabilityContext, ApplicabilityRow, Classification, RoomDesignInput,
} from '@empathia/domain-types';
import { type Catalog, type PackApplies, type TestDefinition, defaultCatalog } from './catalog.js';
import { deviceFamily, liveDevices } from './classify.js';
import { resultLabel } from './results.js';

export interface RequiredTests {
  ids: string[];
  why: Record<string, string[]>;
  version: string;
}

/** The base rule pack: which of the 33 base tests a project needs, and why. */
export function requiredTests(
  p: { projectType: string; roomArchetype: string | null; risk?: string },
  opts: { families?: string[]; risk?: string | null; hasDevices?: boolean },
  C: Catalog = defaultCatalog,
): RequiredTests {
  const rp = C.rulePack;
  const ids: string[] = [];
  const why: Record<string, string[]> = {};
  const addAll = (list: string[] | undefined, reason: string) => {
    for (const t of list || []) {
      if (!ids.includes(t)) ids.push(t);
      (why[t] ||= []).push(reason);
    }
  };
  addAll(rp.base_tests.map((t) => t.id), 'base: every project');
  addAll(rp.project_types[p.projectType]?.tests, `project type ${p.projectType}`);
  const rt = p.roomArchetype ? C.roomType[p.roomArchetype] : undefined;
  if (rt) addAll(rp.room_types[rt]?.tests, `room type ${rt}`);
  for (const fam of opts.families || []) addAll(rp.devices[fam]?.tests, `device family ${fam}`);
  const risk = opts.risk || p.risk;
  if (risk && rp.risk[risk]) addAll(rp.risk[risk]!.tests, `risk ${risk}`);
  if (opts.hasDevices) addAll(['design_conformance'], 'V2.5 addition (+v21aliases): the released revision selects devices, so the installed inventory is checked against the drawing');
  if (rt === 'townhall') addAll(['reverberation_rt60'], 'V2.5 addition (rule version +v21aliases): townhall acoustic protocol needs reverberation time (ISO 3382-2) beside STIPA');
  return { ids, why, version: rp.version };
}

/** A discipline-pack test applies when every dimension it names matches the room context. */
export function packApplies(applies: PackApplies | undefined, ctx: ApplicabilityContext): { ok: boolean; why: string[]; whyNot: string[] } {
  const a = applies || {};
  const hit: string[] = [];
  const miss: string[] = [];
  const dim = (key: keyof PackApplies, vals: string[], label: string) => {
    const want = a[key];
    if (!want) return;
    const ok = want.some((v) => vals.includes(v));
    (ok ? hit : miss).push(`${label} ${want.join('/')}`);
  };
  dim('types', [ctx.type], 'project type');
  dim('rooms', [ctx.room], 'room type');
  dim('families', ctx.families, 'device family');
  dim('tiers', [ctx.tier], 'complexity');
  dim('risk', [ctx.risk], 'risk');
  return { ok: !miss.length, why: hit.length ? hit : ['applies to every project'], whyNot: miss };
}

/** The facts a design can supply. PHOTO_INFERRED dimensions do not count as facts. */
export function knownFacts(d: RoomDesignInput): Set<string> {
  const live = liveDevices(d);
  const f = new Set<string>();
  const pv = d.geometry.provenance;
  if (pv.ceiling !== 'PHOTO_INFERRED') f.add('ceiling height');
  if (pv.length !== 'PHOTO_INFERRED' && pv.width !== 'PHOTO_INFERRED') f.add('room dimensions');
  if (live.some((x) => x.cat === 'chairs' || x.cat === 'table')) f.add('seating');
  if (live.some((x) => ['micceil', 'mictable', 'micwireless', 'bar'].includes(x.cat))) f.add('microphone placement');
  if (live.some((x) => ['camera', 'bar'].includes(x.cat))) f.add('camera placement');
  if (d.connections.some((c) => !c.removed && c.kind === 'network')) f.add('network connections');
  if (live.some((x) => ['display', 'ledwall', 'projector'].includes(x.cat))) f.add('display placement');
  return f;
}

const APPROVED = ['DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
const INSTALLED = ['INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
const DOMAIN_FAMILY: Record<string, string> = { Video: 'camera', Audio: 'dsp', Acoustic: 'dsp', Display: 'display', Network: 'network_switch', Control: 'touch_panel' };

/**
 * Judge the whole library for a room.
 * @param arch the effective archetype (see classify.effectiveArchetype)
 * @param suggested the current suggested classification (its complexity sets the tier)
 */
export function computeApplicability(d: RoomDesignInput, arch: string | null, suggested: Pick<Classification, 'complexity'>, C: Catalog = defaultCatalog): Applicability {
  const live = liveDevices(d).filter((x) => !x.furniture);
  const fams = new Set(live.map((x) => deviceFamily(x.cat)).filter((f): f is string => !!f));
  if (fams.has('touch_panel') && arch !== 'CTL') fams.add('uc');
  const tier = suggested.complexity || 'basic';
  const risk: 'standard' | 'critical' = tier === 'critical' ? 'critical' : 'standard';
  const req = requiredTests(
    { projectType: 'new_install', roomArchetype: arch, risk },
    { families: [...fams], risk: risk === 'standard' ? null : risk, hasDevices: live.length > 0 },
    C,
  );
  const roomType = arch ? C.roomType[arch] || 'boardroom' : 'none';
  const ctx: ApplicabilityContext = { type: 'new_install', room: roomType, families: [...fams], tier, risk };
  const facts = knownFacts(d);
  const approved = APPROVED.includes(d.lifecycle);
  const installed = INSTALLED.includes(d.lifecycle);
  const devRefs = (T: TestDefinition) => {
    const fam = T.family || DOMAIN_FAMILY[T.domain];
    const key = fam === 'touch' ? 'touch_panel' : fam;
    return live.filter((x) => key && deviceFamily(x.cat) === key).map((x) => x.id);
  };
  const rows: ApplicabilityRow[] = [];
  const judge = (id: string, T: TestDefinition, label: string, pack: string | null, ok: boolean, why: string[], whyNot: string) => {
    if (!ok) {
      rows.push({ id, label, pack: pack || null, domain: T.domain, phase: T.phase, tier: T.tier, applicable: false, status: 'NOT_APPLICABLE', why: [], justification: whyNot });
      return;
    }
    const need = (C.info[T.domain] || []).filter((x) => !facts.has(x));
    const status = need.length ? 'PENDING_INFORMATION' : !approved ? 'BLOCKED_BY_PREREQUISITE' : 'REQUIRES_PHYSICAL_EXECUTION';
    rows.push({
      id, label, pack: pack || null, domain: T.domain, phase: T.phase, tier: T.tier, applicable: true, status, why, missing: need,
      prerequisite: !approved
        ? 'the design is not approved (DESIGN_APPROVED is required before any field test)'
        : !installed && T.phase >= 2
          ? 'the room is not installed: the test needs physical execution on installed equipment'
          : null,
      verifier: T.verifier,
      personas: T.family ? [C.domainPersona[T.family]!] : C.verifierPersonas[T.verifier] || [],
      evidence: T.accepts,
      instrument: !!T.instrument,
      window: !!T.window,
      devices: devRefs(T),
      // R3-2: the machine-readable result is the same label every view and export shows — never a bare PASS.
      result: resultLabel((d.results || {})[id]),
    });
  };
  for (const [id, T] of Object.entries(C.tests)) {
    judge(id, T, C.testLabel[id] || id, null, req.ids.includes(id), req.why[id] || [], `no rule names it for new_install / ${roomType} / ${[...fams].join('+') || 'no device family'} / risk ${risk}`);
  }
  for (const [id, T] of Object.entries(C.packTests)) {
    if (C.tests[id]) continue;
    const j = packApplies(T.applies, ctx);
    judge(id, T, T.label, T.pack, j.ok, j.why.map((w) => `pack ${T.pack}: ${w}`), `pack ${T.pack}: needs ${j.whyNot.join(' and ')}; this room is new_install / ${roomType} / ${[...fams].join('+') || 'no family'} / ${tier}`);
  }
  rows.sort((a, b) => Number(b.applicable) - Number(a.applicable) || a.phase - b.phase || a.tier - b.tier || a.id.localeCompare(b.id));
  const packs = [...new Set(rows.filter((r) => r.applicable && r.pack).map((r) => r.pack!))];
  return {
    library: rows.length,
    applicable: rows.filter((r) => r.applicable).length,
    notApplicable: rows.filter((r) => !r.applicable).length,
    byStatus: rows.reduce<Applicability['byStatus']>((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}),
    packs,
    ctx,
    rows,
  };
}
