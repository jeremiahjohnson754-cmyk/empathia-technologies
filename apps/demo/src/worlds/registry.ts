/**
 * The world registry (handoff v1.8 §3, ADR-022): four worlds, 4–6 task journeys each, and the 52 world-specific role configurations of
 * v1.7 §3 (Enterprise 13, Stadium 14, University 13, Convention 12), organised by world and purpose and never shown as one list.
 *
 * A world, a journey or a role configuration is a PRESENTATION choice. It grants nothing: the access policy (access/policy.ts) stays the
 * only authority for every registered page, and the fifteen View-as role keys keep working unchanged. Enterprise configurations map onto
 * those keys where the specification names the same role; the other worlds' configurations only choose which synthetic screens of that
 * world are presented.
 *
 * The 52 identifiers and labels are product data: they are the role_id and display_label of the v1.4 four-worlds role navigation
 * matrix (13 Enterprise, 14 Stadium, 13 University, 12 Convention), kept exactly. A role_id is unique within its world only (three
 * worlds have a `visitor`), so a configuration is addressed as `<world>.<role_id>`. None may be renamed or removed: the no-loss test
 * (tests/unit/demo-worlds.test.mjs) holds the list.
 *
 * The venues are fictional. They are inspired by kinds of place only; no real venue, institution, team or partner is named or implied.
 */
import type { RoleKey } from '../registry.types.js';

export type WorldKey = 'enterprise' | 'stadium' | 'university' | 'convention';
export const WORLD_KEYS: readonly WorldKey[] = ['enterprise', 'stadium', 'university', 'convention'];
export const isWorld = (w: unknown): w is WorldKey => typeof w === 'string' && (WORLD_KEYS as readonly string[]).includes(w);

export interface World {
  key: WorldKey;
  name: string;
  /** the fictional place the world is set in */
  place: string;
  line: string;
  /** what a first-time visitor finds here, in one sentence */
  about: string;
  /** role configurations the specification counts for this world (v1.7 §3) */
  roleCount: number;
  /** the configuration a visitor opens the world as: the safe, public one */
  defaultConfig: string;
}

export const WORLDS: Readonly<Record<WorldKey, World>> = {
  enterprise: { key: 'enterprise', name: 'Enterprise', place: 'Northstar Innovation Campus', line: 'A workplace estate of rooms, devices and the evidence behind them', about: 'The original Living Campus: every room, device, test and service record of a fictional enterprise, with the fifteen View-as roles.', roleCount: 13, defaultConfig: 'enterprise.visitor' },
  stadium: { key: 'stadium', name: 'Stadium', place: 'Harborlight Stadium', line: 'A match day, from the seat to the broadcast gallery', about: 'A fictional open-air stadium: find a seat and a step-free way to it, the nearest amenities, and — for venue roles — the broadcast and AV systems behind the event.', roleCount: 14, defaultConfig: 'stadium.visitor' },
  university: { key: 'university', name: 'University', place: 'Kestrel Valley University', line: 'A campus day, from the first class to the last shuttle', about: 'A fictional university campus: a student’s day, a 2D map with wayfinding, a learning quest, and — for campus roles — the teaching spaces and the classroom AV estate.', roleCount: 13, defaultConfig: 'university.visitor' },
  convention: { key: 'convention', name: 'Convention', place: 'Larkspur Exchange Convention Centre', line: 'A technology expo, from the hall floor to the keynote', about: 'A fictional convention centre hosting a technology expo: the hall map, sessions and exhibitors, a moderated keynote poll, and — for event roles — exhibitor, production and venue work.', roleCount: 12, defaultConfig: 'convention.convention_visitor' },
};

// ------------------------------------------------------------------ role configurations
export type Purpose = 'audience' | 'teaching' | 'exhibiting' | 'production' | 'engineering' | 'operations' | 'leadership';
export const PURPOSES: Readonly<Record<Purpose, { label: string; about: string }>> = {
  audience: { label: 'Visit, work and take part', about: 'Public and everyday perspectives' },
  teaching: { label: 'Teach and research', about: 'Academic perspectives' },
  exhibiting: { label: 'Exhibit and present', about: 'Perspectives of the people on the programme and the show floor' },
  production: { label: 'Produce and broadcast', about: 'Show, event and broadcast perspectives' },
  engineering: { label: 'Engineer and service', about: 'Technical perspectives: systems, AV, IT and service' },
  operations: { label: 'Operate the place', about: 'Operations, facilities, support and security perspectives' },
  leadership: { label: 'Lead and administer', about: 'Executive and administration perspectives' },
};
export const PURPOSE_ORDER: readonly Purpose[] = ['audience', 'teaching', 'exhibiting', 'production', 'engineering', 'operations', 'leadership'];

export interface RoleConfig {
  /** `<world>.<role_id>`: the address form (a role_id is unique within its world only) */
  id: string;
  world: WorldKey;
  /** the matrix role_id, exactly */
  roleId: string;
  /** the matrix display_label, exactly */
  label: string;
  /** the matrix default_lens */
  lens: string;
  purpose: Purpose;
  /** Enterprise only: the View-as role key this configuration is, when the demonstration has that role */
  roleKey?: RoleKey;
  /** Enterprise only: the nearest View-as role when there is no exact one (said as "nearest", never as the same role) */
  nearest?: RoleKey;
}
const c = (world: WorldKey, roleId: string, label: string, lens: string, purpose: Purpose, extra: Partial<RoleConfig> = {}): RoleConfig => ({ id: `${world}.${roleId}`, world, roleId, label, lens, purpose, ...extra });

export const ROLE_CONFIGS: readonly RoleConfig[] = [
  // ---- enterprise (13)
  c('enterprise', 'employee', 'Employee', 'workplace', 'audience', { roleKey: 'employee' }),
  c('enterprise', 'visitor', 'Visitor', 'visitor', 'audience', { roleKey: 'visitor' }),
  c('enterprise', 'service_technician', 'Service Technician', 'technician', 'engineering', { nearest: 'service' }),
  c('enterprise', 'service_engineer', 'Service Engineer', 'engineer', 'engineering', { roleKey: 'service' }),
  c('enterprise', 'systems_engineer', 'Systems Engineer', 'engineer', 'engineering', { roleKey: 'syseng' }),
  c('enterprise', 'product_architect', 'Product Architect', 'design', 'engineering', { roleKey: 'architect' }),
  c('enterprise', 'av_ops_lead', 'AV Operations Lead', 'operations', 'operations', { roleKey: 'ops' }),
  c('enterprise', 'commissioning_engineer', 'Commissioning Engineer', 'engineering', 'engineering', { roleKey: 'cxeng' }),
  c('enterprise', 'network_engineer', 'Network Engineer', 'network', 'engineering'),
  c('enterprise', 'executive', 'Executive', 'executive', 'leadership', { roleKey: 'exec' }),
  c('enterprise', 'msp_manager', 'MSP Provider Manager', 'provider_ops', 'operations'),
  c('enterprise', 'tenant_admin', 'Tenant Administrator', 'admin', 'leadership'),
  c('enterprise', 'learner', 'Learner/Trainer', 'learning', 'audience'),
  // ---- stadium (14)
  c('stadium', 'fan', 'Fan', 'public_fan', 'audience'),
  c('stadium', 'away_fan', 'Away Fan', 'away_fan_preference', 'audience'),
  c('stadium', 'premium_guest', 'Premium Guest', 'premium_guest', 'audience'),
  c('stadium', 'visitor', 'Visitor', 'visitor', 'audience'),
  c('stadium', 'guest_services', 'Guest Services', 'guest_services', 'operations'),
  c('stadium', 'broadcast_engineer', 'Broadcast Engineer', 'broadcast', 'production'),
  c('stadium', 'av_it_engineer', 'AV / IT Engineer', 'engineering', 'engineering'),
  c('stadium', 'event_producer', 'Event Producer / Show Caller', 'show_production', 'production'),
  c('stadium', 'venue_ops_lead', 'Venue Operations Lead', 'operations', 'operations'),
  c('stadium', 'service_technician', 'Service Technician', 'field_support', 'engineering'),
  c('stadium', 'security_safety_lead', 'Security / Safety Lead', 'safety', 'operations'),
  c('stadium', 'executive', 'Venue Executive', 'executive', 'leadership'),
  c('stadium', 'venue_admin', 'Venue Tenant Administrator', 'admin', 'leadership'),
  c('stadium', 'msp_engineer', 'MSP Engineer', 'delegated_support', 'engineering'),
  // ---- university (13)
  c('university', 'student', 'Student', 'student_life', 'audience'),
  c('university', 'prospective_student', 'Prospective Student', 'recruitment_visitor', 'audience'),
  c('university', 'visitor', 'Visitor', 'public_visitor', 'audience'),
  c('university', 'faculty', 'Faculty / Instructor', 'teaching', 'teaching'),
  c('university', 'researcher', 'Researcher', 'research', 'teaching'),
  c('university', 'campus_staff', 'Campus Staff', 'staff', 'operations'),
  c('university', 'student_support', 'Student Support / Advisor', 'advising', 'operations'),
  c('university', 'av_it_engineer', 'Campus AV / IT Engineer', 'engineering', 'engineering'),
  c('university', 'facilities_engineer', 'Facilities Engineer / Operations', 'facilities', 'engineering'),
  c('university', 'learning_designer', 'Learning Experience Designer', 'content_design', 'teaching'),
  c('university', 'university_executive', 'University Executive', 'executive', 'leadership'),
  c('university', 'tenant_admin', 'University Tenant Administrator', 'admin', 'leadership'),
  c('university', 'msp_engineer', 'MSP Engineer', 'delegated_support', 'engineering'),
  // ---- convention (12)
  c('convention', 'convention_attendee', 'Attendee', 'attendee', 'audience'),
  c('convention', 'convention_visitor', 'Visitor', 'visitor', 'audience'),
  c('convention', 'convention_exhibitor', 'Exhibitor', 'exhibitor', 'exhibiting'),
  c('convention', 'convention_sponsor', 'Sponsor', 'sponsor', 'exhibiting'),
  c('convention', 'convention_speaker', 'Speaker', 'speaker', 'exhibiting'),
  c('convention', 'convention_event_organizer', 'Event Organizer', 'organizer', 'production'),
  c('convention', 'convention_show_producer', 'Show Producer', 'producer', 'production'),
  c('convention', 'convention_broadcast_engineer', 'Broadcast Engineer', 'broadcast', 'production'),
  c('convention', 'convention_av_it_engineer', 'AV/IT Engineer', 'engineer', 'engineering'),
  c('convention', 'convention_facilities_safety', 'Facilities & Safety', 'facilities', 'operations'),
  c('convention', 'convention_executive', 'Convention Executive', 'executive', 'leadership'),
  c('convention', 'convention_msp_delegated', 'Delegated MSP Engineer', 'delegated_support', 'engineering'),
];
export const ROLE_CONFIG_IDS: readonly string[] = ROLE_CONFIGS.map((r) => r.id);
export const configById = (id: string | null | undefined): RoleConfig | undefined => ROLE_CONFIGS.find((r) => r.id === id);
export const configsOf = (w: WorldKey): RoleConfig[] => ROLE_CONFIGS.filter((r) => r.world === w);
/** A world's configurations grouped by purpose, in the fixed purpose order; empty groups are dropped. */
export const groupsOf = (w: WorldKey): { purpose: Purpose; configs: RoleConfig[] }[] => PURPOSE_ORDER.map((purpose) => ({ purpose, configs: configsOf(w).filter((r) => r.purpose === purpose) })).filter((g) => g.configs.length > 0);

// ------------------------------------------------------------------ journeys
/** public: any configuration of the world, the visitor included. Every other kind needs one of the configurations it names. */
export type JourneyKind = 'public' | 'student' | 'teaching' | 'exhibiting' | 'production' | 'engineering' | 'operations' | 'leadership';
export interface Journey {
  /** `<world>.<slug>`; the slug is the address segment */
  id: string;
  world: WorldKey;
  slug: string;
  title: string;
  blurb: string;
  kind: JourneyKind;
  /** the configurations of this world that are presented this journey ('all' for a public one) */
  configs: 'all' | readonly string[];
  /** the configuration the journey card opens as when the current one is not presented it */
  opensAs: string;
  /** Enterprise only: the existing page the journey opens, and the View-as role it opens as when the current role may not open it */
  enterprise?: { href: string; roleKey: RoleKey };
  /** the module that holds the screen: `public` or `pro` (the restricted screens are a separate chunk, never loaded for a public journey) */
  module?: 'public' | 'pro';
  /** configurations that are presented an extra section of a public journey (the keynote's moderation desk), and what it is */
  also?: { configs: readonly string[]; what: string };
}
const j = (world: WorldKey, slug: string, title: string, blurb: string, kind: JourneyKind, configs: 'all' | string[], opensAs: string, extra: Partial<Journey> = {}): Journey =>
  ({ id: `${world}.${slug}`, world, slug, title, blurb, kind, configs: configs === 'all' ? 'all' : configs.map((s) => `${world}.${s}`), opensAs: `${world}.${opensAs}`, module: kind === 'public' || kind === 'student' ? 'public' : 'pro', ...extra });
const ent = (slug: string, title: string, blurb: string, kind: JourneyKind, opensAs: string, href: string, roleKey: RoleKey): Journey => j('enterprise', slug, title, blurb, kind, 'all', opensAs, { enterprise: { href, roleKey }, module: undefined });

export const JOURNEYS: readonly Journey[] = [
  ent('explore-workplace', 'Explore Workplace', 'Find a space and the way to it: the rooms of the campus, what each offers and how to use it.', 'public', 'employee', '#/lite', 'employee'),
  ent('find-support', 'Find & Support', 'Find a room, a device or a person’s work, and see what a failing device affects.', 'public', 'service_engineer', '#/search', 'service'),
  ent('engineer-commission', 'Engineer & Commission', 'Adaptive test plans, evidence and the acceptance that is refused when proof is missing.', 'engineering', 'commissioning_engineer', '#/commissioning', 'cxeng'),
  ent('manage-operations', 'Manage Operations', 'Mission Control: today’s priorities, open issues and the service queue.', 'operations', 'av_ops_lead', '#/home', 'ops'),
  ent('executive-overview', 'Executive Overview', 'Portfolio health, exposure and decisions, each figure with its numerator and denominator.', 'leadership', 'executive', '#/pro/exec', 'exec'),

  j('stadium', 'attend-game', 'Attend Game', 'Your seat, the gate to use and a step-free way there, on a 2D plan.', 'public', 'all', 'fan'),
  j('stadium', 'find-amenities', 'Find Amenities', 'Food, restrooms, first aid and guest services near your seat, with how fresh each status is.', 'public', 'all', 'fan'),
  j('stadium', 'broadcast-production', 'Broadcast & Production', 'The run of show, the sources on the programme and the modelled crowd acoustics.', 'production', ['event_producer', 'broadcast_engineer'], 'event_producer'),
  j('stadium', 'venue-engineering', 'Venue Engineering', 'The AV and broadcast signal chain, device passports and the evidence state of each.', 'engineering', ['av_it_engineer', 'broadcast_engineer', 'service_technician', 'msp_engineer'], 'av_it_engineer'),
  j('stadium', 'venue-operations', 'Venue Operations', 'Gates, incidents and service work during an event, with event-time gates on disruptive work.', 'operations', ['venue_ops_lead', 'security_safety_lead', 'guest_services'], 'venue_ops_lead'),

  j('university', 'student-life', 'Student Life', 'A student’s day: classes, reminders, dining and the next shuttle.', 'student', ['student'], 'student'),
  j('university', 'discover-campus', 'Discover Campus', 'A 2D campus map with walking, cycling and shuttle routes, and a step-free option.', 'public', 'all', 'visitor'),
  j('university', 'study-play', 'Study & Play', 'A circuit quest with scoring and feedback, and badges that cost and pay nothing.', 'public', 'all', 'student'),
  j('university', 'teaching-research', 'Teaching & Research', 'Is the lecture theatre ready for my session, and which research spaces are free.', 'teaching', ['faculty', 'researcher'], 'faculty'),
  j('university', 'campus-technology', 'Campus Technology', 'The classroom AV estate, room by room, with the service workflow.', 'engineering', ['av_it_engineer', 'facilities_engineer', 'msp_engineer'], 'av_it_engineer'),

  j('convention', 'attend-expo', 'Attend Expo', 'The hall map, the sessions and the exhibitors, with your own agenda.', 'public', 'all', 'convention_attendee'),
  j('convention', 'exhibitor-experience', 'Exhibitor Experience', 'Your booth, consented leads you can delete, and meeting requests.', 'exhibiting', ['convention_exhibitor', 'convention_sponsor'], 'convention_exhibitor'),
  j('convention', 'keynote-polls', 'Keynote & Polls', 'Vote in the keynote poll and ask a question; a moderator decides what is shown.', 'public', 'all', 'convention_attendee', { also: { configs: ['convention.convention_speaker', 'convention.convention_event_organizer', 'convention.convention_show_producer'], what: 'the moderation desk' } }),
  j('convention', 'production-broadcast', 'Production & Broadcast', 'The keynote’s run of show and the signal chain from stage to stream.', 'production', ['convention_show_producer', 'convention_broadcast_engineer'], 'convention_show_producer'),
  j('convention', 'venue-operations', 'Venue Operations', 'Hall readiness and service requests across the venue, by event.', 'operations', ['convention_event_organizer', 'convention_av_it_engineer', 'convention_facilities_safety', 'convention_msp_delegated'], 'convention_av_it_engineer'),
];
export const journeysOf = (w: WorldKey): Journey[] => JOURNEYS.filter((x) => x.world === w);
export const journeyAt = (w: WorldKey, slug: string): Journey | undefined => JOURNEYS.find((x) => x.world === w && x.slug === slug);

// ------------------------------------------------------------------ presentation (never authority)
/**
 * The configuration an address presents: `?as=<id>` when it names a configuration of THIS world, otherwise the world's safe default.
 * A configuration of another world is never carried across (v1.8 §3.2: never carry a role into a new context).
 */
export function configFor(world: WorldKey, as: string | null | undefined): RoleConfig {
  const asked = configById(as);
  return asked && asked.world === world ? asked : configById(WORLDS[world].defaultConfig)!;
}
/** Is this journey presented to this configuration? Presentation only; a journey of another world never is. */
export function presents(config: RoleConfig, journey: Journey): boolean {
  if (config.world !== journey.world) return false;
  return journey.configs === 'all' || journey.configs.includes(config.id);
}
/** The configurations of the journey's world that are presented it. */
export const whoPresents = (journey: Journey): RoleConfig[] => configsOf(journey.world).filter((r) => presents(r, journey));
/** The journeys of its world a configuration is presented. */
export const journeysFor = (config: RoleConfig): Journey[] => journeysOf(config.world).filter((x) => presents(config, x));
/** A configuration the demonstration gives no screen of its own beyond the public journeys: said as "specified, not yet demonstrated". */
export const specifiedOnly = (config: RoleConfig): boolean => {
  if (config.world === 'enterprise') return !config.roleKey;
  return config.purpose !== 'audience' && !journeysOf(config.world).some((x) => (x.configs !== 'all' && x.configs.includes(config.id)) || !!x.also?.configs.includes(config.id));
};

// ------------------------------------------------------------------ addresses
export const worldHref = (w: WorldKey, as?: string, extra?: Record<string, string>): string => { const q = new URLSearchParams({ ...(as && as !== WORLDS[w].defaultConfig ? { as } : {}), ...(extra || {}) }).toString(); return `#/world/${w}${q ? `?${q}` : ''}`; };
export const journeyHref = (x: Journey, as?: string): string => `#/world/${x.world}/${x.slug}${as && as !== WORLDS[x.world].defaultConfig ? `?as=${encodeURIComponent(as)}` : ''}`;
/** The address a journey card leads to for the current configuration: as itself when it is presented the journey, else as `opensAs`. */
export function journeyTarget(x: Journey, current: RoleConfig): { href: string; as: RoleConfig; switches: boolean } {
  const ok = presents(current, x); const as = ok ? current : configById(x.opensAs)!;
  return { href: journeyHref(x, as.id), as, switches: !ok };
}
