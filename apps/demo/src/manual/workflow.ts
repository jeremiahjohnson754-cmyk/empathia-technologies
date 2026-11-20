/**
 * From the manual to one room: a reviewable set of design requirements and a commissioning template (founder, §08 Product C:
 * "Allow engineers to select tenant standards, site standards, room archetype, equipment models, approved alternatives, applicable
 * testing requirements, network profiles, accessibility constraints, engineering assumptions. Generate reviewable design
 * requirements and commissioning templates.").
 *
 * Nothing here decides anything new about a room:
 *  - the room, its type, its equipment and its device families are the room's own record (campus/design.ts);
 *  - which tests apply, with their methods, verifiers and accepted evidence, is the commissioning engine's judgement of that record;
 *  - the requirements are the manual's design rules that concern equipment the room has, the organisation's additions for the
 *    room's building, and the accessibility constraints the engineer selects;
 *  - a value is the organisation's own, from the revision in force, or it is "not set". Nothing is filled in.
 * Pure: the same inputs give the same set.
 */
import { defaultCatalog as C } from '@empathia/commissioning-engine';
import type { RoomRecord } from '../campus/design.js';
import { ALL_PRINCIPLES, CHAPTERS, chapterOf, principleById, valueById, type Principle } from './content.js';

export interface HeldValue { value: string; source: string }
export interface SiteAddition { id: string; building: string; principle: string; text: string; at: string; by: string }

/** Constraints an engineer may select for a room. Each brings the manual's rules that answer it. */
export const ACCESS: ReadonlyArray<{ id: string; label: string; principles: readonly string[] }> = [
  { id: 'wheelchair', label: 'A wheelchair user’s place is part of the layout', principles: ['X-06', 'X-04'] },
  { id: 'hearing', label: 'Hearing assistance is required in this room', principles: ['X-02'] },
  { id: 'captions', label: 'Live captions must be available', principles: ['X-03'] },
  { id: 'low-vision', label: 'The interface must suit low vision', principles: ['X-05', 'X-07'] },
];
const FAMILY_WORDS: Record<string, string> = { camera: 'a camera', dsp: 'audio equipment', touch_panel: 'a control panel', network_switch: 'a network switch', display: 'a display', lighting: 'lighting control', uc: 'a room computer', signage: 'a scheduling panel' };
/** The manual's named port profiles (rule N-06). Which one a device takes is proposed from its catalogue group; the network owner confirms. */
export const PROFILES: Record<string, string> = { media: 'Media endpoint', control: 'Control endpoint', compute: 'Room computer', general: 'General AV endpoint', uplink: 'Switch uplink' };
export function profileFor(cat: string): string | null {
  const k = C.categories[cat]; if (!k || !k.net) return null;
  return k.group === 'Network' ? 'uplink' : k.group === 'Audio' || k.group === 'Video' ? 'media' : k.group === 'Control' ? 'control' : k.group === 'Compute' ? 'compute' : 'general';
}

/**
 * Why a rule can never be excepted, or null when it can. Two sources, and either is enough: the manual marks the rule itself, or the
 * rule is checked by a test the commissioning catalogue marks as never waived. The second keeps this record from ever disagreeing
 * with the engine: no exception written here can sit beside a test that the engine will not waive.
 */
export function neverExcepted(p: Principle): string | null {
  if (p.noWaiver) return p.noWaiver;
  const t = (p.tests || []).find((id) => (C.tests[id] || C.packTests[id])?.nonwaivable);
  return t ? `It is checked by “${C.testLabel[t] || C.packTests[t]?.label || t}”, which the commissioning catalogue marks as never waived.` : null;
}

export interface Requirement {
  id: string; origin: 'manual' | 'site' | 'access'; chapter: string; text: string; why: string;
  /** why it applies to this room */ because: string;
  values: Array<{ id: string; name: string; value: string | null; source: string | null }>;
  /** tests of this room's template that check it */ tests: string[];
  noWaiver: string | null;
}
export interface TemplateRow {
  id: string; label: string; domain: string; phase: number; verifier: string; method: string; evidence: string[]; instrument: boolean; nonwaivable: boolean;
  /** the engine's state for this test in this room; never a result */ status: string; why: string[]; missing: string[];
  principles: string[]; criteria: Array<{ id: string; name: string; value: string | null }>;
}
export interface Generated {
  room: string; roomName: string; building: string; archetype: string | null; archetypeName: string; tier: string; lifecycle: string;
  families: string[];
  equipment: Array<{ code: string; cat: string; label: string; device: string; identity: string; profile: string | null }>;
  /** what the room type requires, the categories approved to fill each need, and what this room has */
  roles: Array<{ role: string; approved: string[]; has: string[] }>;
  requirements: Requirement[]; template: TemplateRow[]; notApplicable: number;
  /** what stands between this set and a room that can be judged */ gaps: string[];
  access: string[]; assumptions: string[];
}
export interface Options { values: Readonly<Record<string, HeldValue>>; siteAdds: readonly SiteAddition[]; access: readonly string[]; assumptions: readonly string[] }

const clean = (s: string, n: number) => s.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const held = (ids: readonly string[] | undefined, values: Options['values']) => (ids || []).map((id) => ({ id, name: valueById(id)?.name || id, value: values[id]?.value ?? null, source: values[id]?.source ?? null }));
const concerns = (p: Principle, fams: readonly string[]) => !p.families || p.families.some((f) => fams.includes(f));

export function generate(room: RoomRecord, o: Options): Generated {
  const A = room.analysis; const fams = [...A.applicability.ctx.families].sort(); const arch = A.archetype;
  const applicable = A.applicability.rows.filter((r) => r.applicable); const inTemplate = new Set(applicable.map((r) => r.id));
  const access = ACCESS.filter((a) => o.access.includes(a.id)); const byAccess = new Map<string, string>();
  for (const a of access) for (const p of a.principles) if (!byAccess.has(p)) byAccess.set(p, a.label);

  const requirements: Requirement[] = [];
  const add = (p: Principle, origin: Requirement['origin'], because: string) => requirements.push({ id: p.id, origin, chapter: chapterOf(p.id)!.title, text: p.say, why: p.why, because, values: held(p.values, o.values), tests: (p.tests || []).filter((t) => inTemplate.has(t)), noWaiver: neverExcepted(p) });
  for (const p of ALL_PRINCIPLES) {
    if (byAccess.has(p.id)) { add(p, 'access', `Selected for this room: ${byAccess.get(p.id)!.toLowerCase()}.`); continue; }
    if (p.stage !== 'design' || !concerns(p, fams)) continue;
    add(p, 'manual', p.families ? `The room has ${p.families.filter((f) => fams.includes(f)).map((f) => FAMILY_WORDS[f] || f).join(' and ')}.` : 'A design rule for every room.');
  }
  for (const s of o.siteAdds) if (s.building === room.outline.building && principleById(s.principle)) requirements.push({ id: s.id, origin: 'site', chapter: chapterOf(s.principle)!.title, text: s.text, why: `An addition to ${s.principle} for this building. A site addition tightens the manual; it never loosens it.`, because: `The room is in ${room.outline.building}.`, values: [], tests: [], noWaiver: null });

  const citing = (test: string) => ALL_PRINCIPLES.filter((p) => p.tests?.includes(test));
  const template: TemplateRow[] = applicable.map((r) => {
    const T = C.tests[r.id] || C.packTests[r.id]; const ps = citing(r.id); const vals = [...new Set(ps.flatMap((p) => p.values || []))];
    return { id: r.id, label: r.label, domain: r.domain, phase: r.phase, verifier: r.verifier || T?.verifier || 'not stated', method: T?.method || 'not stated in the catalogue', evidence: [...(r.evidence || T?.accepts || [])], instrument: !!(r.instrument ?? T?.instrument), nonwaivable: !!T?.nonwaivable,
      status: r.status, why: r.why, missing: r.missing || [], principles: ps.map((p) => p.id), criteria: held(vals, o.values).map(({ id, name, value }) => ({ id, name, value })) };
  }).sort((a, b) => a.phase - b.phase || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id));

  const live = room.positions.filter((p) => !p.furniture); const cats = new Set(live.map((p) => p.cat));
  const roles = (arch ? C.required[arch] || [] : []).map((role) => { const approved = C.roleOk[role] || [role]; return { role, approved: approved.map((c) => C.categories[c]?.label || c), has: approved.filter((c) => cats.has(c)).map((c) => C.categories[c]?.label || c) }; });

  const gaps: string[] = [];
  const unset = [...new Set([...requirements.flatMap((r) => r.values), ...template.flatMap((t) => t.criteria)].filter((v) => v.value == null).map((v) => v.name))];
  if (unset.length) gaps.push(`${unset.length} ${unset.length === 1 ? 'value this room depends on is' : 'values this room depends on are'} not set by the organisation: ${unset.join('; ')}. Until one is set, its test records a reading and has no pass mark.`);
  for (const r of roles) if (!r.has.length) gaps.push(`The room type requires ${r.role} equipment (${r.approved.join(' or ')}) and the room’s record has none.`);
  const missing = [...new Set(template.flatMap((t) => t.missing))]; if (missing.length) gaps.push(`The record lacks facts some tests need: ${missing.join(', ')}.`);
  if (!arch) gaps.push('The room has no room type the engine can act on, so no type package applies.');
  for (const a of access) for (const pid of a.principles) { const p = principleById(pid)!; if (p.families && !concerns(p, fams)) gaps.push(`“${a.label}” was selected, and the room’s record has no ${p.families.map((f) => FAMILY_WORDS[f] || f).join(' or ')} to meet ${pid} with.`); }

  return { room: room.outline.id, roomName: room.outline.name, building: room.outline.building, archetype: arch, archetypeName: room.archetypeName, tier: A.applicability.ctx.tier, lifecycle: room.lifecycle, families: fams,
    equipment: live.map((p) => ({ code: p.code, cat: p.cat, label: p.catLabel, device: p.device, identity: p.identity, profile: profileFor(p.cat) })),
    roles, requirements, template, notApplicable: A.applicability.rows.length - applicable.length, gaps: [...new Set(gaps)],
    access: access.map((a) => a.id), assumptions: o.assumptions.map((a) => clean(a, 200)).filter(Boolean).slice(0, 8) };
}

/** How many of the manual's rules a room's set draws on, by chapter: for the page's summary. */
export function byChapter(g: Generated): Array<{ chapter: string; n: number }> {
  return CHAPTERS.map((c) => ({ chapter: c.title, n: g.requirements.filter((r) => r.chapter === c.title).length })).filter((x) => x.n > 0);
}
