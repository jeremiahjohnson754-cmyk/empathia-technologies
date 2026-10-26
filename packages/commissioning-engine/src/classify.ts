/**
 * Room classification: a deterministic, rule-based classifier. It is NOT a trained model and must never be described as one.
 *
 * Ported line for line from `v25RoomClassifyCompute` (src/v25-60-room.js) and `recommendArch` (src/58-derive-eng.js).
 * Parity with the demonstrator is checked against 92 golden cases (test/parity.test.ts).
 */
import type { Classification, Complexity, PlannedDevice, RoomDesignInput, SizeCategory } from '@empathia/domain-types';
import { area } from './geometry.js';
import { type Catalog, defaultCatalog } from './catalog.js';

/** Equipment category → commissioning device family (the families the rule pack and the discipline packs name). */
export function deviceFamily(cat: string): string | null {
  const map: Record<string, string> = {
    camera: 'camera', bar: 'camera',
    micceil: 'dsp', mictable: 'dsp', micwireless: 'dsp', dsp: 'dsp', speaker: 'dsp', amp: 'dsp',
    touch: 'touch_panel', control: 'touch_panel',
    switch: 'network_switch',
    display: 'display', ledwall: 'display', projector: 'display',
    lighting: 'lighting', compute: 'uc', scheduler: 'signage',
  };
  return map[cat] ?? null;
}

/** The archetype a use and a head-count suggest (src/58-derive-eng.js `recommendArch`). */
export function recommendArch(use: string, cap: number, people?: string): string {
  const n = Number(cap) || 8;
  // a townhall and a control room are one-off designs: Room Builder lays out the archetypes that follow a template
  if (use === 'training' || use === 'event') return 'TRN';
  if (use === 'produce') return 'STU';
  if (use === 'operate') return 'WAR';
  if (use === 'focus') return n <= 4 ? 'FOC' : 'HUD';
  if (n <= 4) return 'FOC';
  if (n <= 6) return 'HUD';
  if (n <= 12) return people === 'leaders' && n >= 10 ? 'EXE' : 'COL';
  if (n <= 14) return 'EXE';
  return 'BRD';
}

export const liveDevices = (d: Pick<RoomDesignInput, 'devices'>): PlannedDevice[] => d.devices.filter((x) => !x.removed);

const AV_CATS = ['display', 'ledwall', 'projector', 'camera', 'bar', 'micceil', 'mictable', 'micwireless', 'speaker'];

/** Classify a room from its declared geometry, intended use, occupancy and equipment. Returns the reasons and the assumptions. */
export function classifyRoom(d: RoomDesignInput, C: Catalog = defaultCatalog): Classification {
  const a = area(d.geometry);
  const live = liveDevices(d);
  const cats = new Set(live.map((x) => x.cat));
  const why: string[] = [];
  const assumptions: string[] = [];
  const seats = live.filter((x) => x.cat === 'chairs').reduce((s, x) => s + (Number(x.props['seats']) || 6), 0);
  const density = d.occupancy >= 60 || /town|auditor|all-hands|event|lecture/i.test(d.intendedUse) ? 0.9 : 2.2;
  const capEst = Math.max(1, Math.floor(a / density));
  assumptions.push(
    `capacity estimate = floor area ${a} m² ÷ ${density} m² per person (${density < 1 ? 'theatre-style seating' : 'meeting seating'}); a planning assumption, not a fire-code occupancy`,
  );
  const people = d.occupancy || seats || capEst;
  const u = String(d.intendedUse || '');
  const useKey = /train|teach|class|lectur/i.test(u)
    ? 'training'
    : /event|all-hands|town/i.test(u)
      ? 'event'
      : /record|stream|studio|broadcast/i.test(u)
        ? 'produce'
        : /operat|control room|war room/i.test(u)
          ? 'operate'
          : /focus|one person|desk/i.test(u)
            ? 'focus'
            : '';
  let arch: string | null = recommendArch(useKey, people, /leader|executive|board/i.test(u) ? 'leaders' : 'team');
  const tpl = C.templates[d.template];
  const tplArch = tpl ? tpl.arch ?? undefined : undefined;
  if (typeof arch !== 'string' || !C.archetypes[arch]) arch = null;
  const hasAv = AV_CATS.some((c) => cats.has(c));
  if (!hasAv && cats.has('rack') && cats.has('switch')) {
    arch = 'CTL';
    why.push('equipment rack and network switch, no room AV: an equipment / IDF room');
  } else if (!hasAv) {
    arch = null;
    why.push('no displays, cameras, microphones or loudspeakers: not a meeting space (building systems only)');
  } else if (people >= 100 || a >= 250) {
    arch = 'TWN';
    why.push(`${people} people / ${a} m²: a town hall or multipurpose space`);
  } else if (tplArch && (!arch || C.archetypes[tplArch]!.cap[0] <= people * 1.5)) {
    arch =
      arch && arch !== tplArch && Math.abs(C.archetypes[arch]!.cap[0] - people) < Math.abs(C.archetypes[tplArch]!.cap[0] - people)
        ? arch
        : tplArch;
    why.push(`template ${tpl!.label} and ${people} people`);
  } else if (arch) {
    why.push(`intended use “${d.intendedUse || 'not stated'}” and ${people} people`);
  }
  const size: SizeCategory = a < 15 ? 'small' : a < 40 ? 'medium' : a < 100 ? 'large' : 'extra large';
  why.push(`floor area ${a} m² → ${size}`);
  const fams = new Set(live.map((x) => deviceFamily(x.cat)).filter((f): f is string => !!f));
  const n = live.filter((x) => !x.furniture).length;
  const tier: Complexity = arch === 'TWN' || n >= 14 ? 'critical' : n >= 8 || fams.size >= 5 ? 'advanced' : n >= 4 || fams.size >= 3 ? 'standard' : 'basic';
  why.push(`${n} devices across ${fams.size} families → ${tier} technology complexity`);
  const sub = tpl?.sub || (arch ? C.archetypes[arch]!.name.toLowerCase() : 'not a meeting space');
  const conf = d.geometry.confidence === 'declared' && d.intendedUse ? 'medium' : 'low';
  if (conf === 'low') assumptions.push('dimensions or intended use are not declared: the classification rests on template defaults');
  return {
    archetype: arch,
    archetypeName: arch ? C.archetypes[arch]!.name : 'Not a meeting space',
    subtype: sub,
    intendedUse: d.intendedUse || 'not stated',
    capacityEstimate: capEst,
    people,
    sizeCategory: size,
    complexity: tier,
    families: [...fams],
    cxRoomType: arch ? C.roomType[arch] || 'boardroom' : null,
    source: 'rule-based classifier (v25-60) over declared geometry, intended use, occupancy and equipment',
    confidence: conf,
    why,
    assumptions,
  };
}

/**
 * The archetype the other engines act on: an engineer's approved classification unless it has gone stale
 * (the suggestion changed and the approval was not an override), otherwise the current suggestion.
 */
export function effectiveArchetype(d: RoomDesignInput, suggested: Classification): string | null {
  const ap = d.classification.approved;
  if (!ap) return suggested.archetype;
  const stale = !!ap.stale || (ap.archetype !== suggested.archetype && !ap.override);
  return stale ? suggested.archetype : ap.archetype;
}
