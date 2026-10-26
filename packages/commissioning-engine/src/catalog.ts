/**
 * The rule tables the room engines read. They are extracted, unchanged, from the demonstrator build by
 * `scripts/extract/extract-domain-data.mjs` (see `packages/domain-data/data/PROVENANCE.json` for the source hash).
 *
 * The engines take a `Catalog` argument instead of importing globals, so the same code runs in the browser (Founder Studio),
 * in the enterprise API (server-side authority) and in tests, and so a tenant-specific rule pack can be swapped in later.
 */
import ARCHETYPES from '@empathia/domain-data/data/ARCHETYPES.json' with { type: 'json' };
import V25_CX_CATALOGUE from '@empathia/domain-data/data/V25_CX_CATALOGUE.json' with { type: 'json' };
import V25_DESIGN_rulePack from '@empathia/domain-data/data/V25_DESIGN_rulePack.json' with { type: 'json' };
import V25_DOMAIN_PERSONA from '@empathia/domain-data/data/V25_DOMAIN_PERSONA.json' with { type: 'json' };
import V25_ROOM_CATS from '@empathia/domain-data/data/V25_ROOM_CATS.json' with { type: 'json' };
import V25_ROOM_INFO from '@empathia/domain-data/data/V25_ROOM_INFO.json' with { type: 'json' };
import V25_ROOM_REQUIRED from '@empathia/domain-data/data/V25_ROOM_REQUIRED.json' with { type: 'json' };
import V25_ROOM_ROLEOK from '@empathia/domain-data/data/V25_ROOM_ROLEOK.json' with { type: 'json' };
import V25_ROOM_TEMPLATES from '@empathia/domain-data/data/V25_ROOM_TEMPLATES.json' with { type: 'json' };
import V25_ROOM_TYPE from '@empathia/domain-data/data/V25_ROOM_TYPE.json' with { type: 'json' };
import V25_TEST_LABEL from '@empathia/domain-data/data/V25_TEST_LABEL.json' with { type: 'json' };
import V25_TESTS from '@empathia/domain-data/data/V25_TESTS.json' with { type: 'json' };
import V25_VERIFIER_PERSONAS from '@empathia/domain-data/data/V25_VERIFIER_PERSONAS.json' with { type: 'json' };

export interface Archetype {
  name: string;
  /** Seating capacity range [min, max]. */
  cap: [number, number];
  [k: string]: unknown;
}

export interface EquipmentCategory {
  label: string;
  group: string;
  cat?: string;
  mount: string;
  net: boolean;
  /** Declared catalogue PoE draw in watts (not measured). */
  poe: number;
  sig: string;
  furniture?: boolean;
  props?: Record<string, unknown>;
}

/** One base test definition (33 in the 2.5.x library). */
export interface TestDefinition {
  domain: string;
  tier: number;
  phase: number;
  verifier: string;
  method: string;
  accepts: string[];
  na: boolean;
  nonwaivable: boolean;
  dict?: string;
  family?: string;
  instrument?: boolean;
  window?: boolean;
  deps?: string[];
}

export interface PackApplies {
  types?: string[];
  rooms?: string[];
  families?: string[];
  tiers?: string[];
  risk?: string[];
}

/** One discipline-pack test definition (61 in the 2.5.x library, 11 packs). */
export interface PackTestDefinition extends TestDefinition {
  pack: string;
  label: string;
  applies?: PackApplies;
}

export interface RulePack {
  version: string;
  logic?: unknown;
  base_tests: Array<{ id: string; domain: string; evidence: string; required_roles: string[] }>;
  project_types: Record<string, { tests?: string[]; [k: string]: unknown }>;
  room_types: Record<string, { tests?: string[]; [k: string]: unknown }>;
  devices: Record<string, { tests?: string[]; docs?: string[] }>;
  risk: Record<string, { tests?: string[]; [k: string]: unknown }>;
}

export interface RoomTemplate {
  label: string;
  arch?: string | null;
  sub?: string;
  use?: string;
  dims?: [number, number, number];
  occ?: number;
  items?: Array<[string, number, number, number]>;
  considerations?: string[];
}

export interface Catalog {
  archetypes: Record<string, Archetype>;
  roomType: Record<string, string>;
  categories: Record<string, EquipmentCategory>;
  templates: Record<string, RoomTemplate>;
  required: Record<string, string[]>;
  roleOk: Record<string, string[]>;
  info: Record<string, string[]>;
  tests: Record<string, TestDefinition>;
  testLabel: Record<string, string>;
  packTests: Record<string, PackTestDefinition>;
  rulePack: RulePack;
  domainPersona: Record<string, string>;
  verifierPersonas: Record<string, string[]>;
}

/** The catalogue as shipped in the 2.5.3 rc3 / 2.5.4 demonstrator. */
export const defaultCatalog: Catalog = {
  archetypes: ARCHETYPES as unknown as Record<string, Archetype>,
  roomType: V25_ROOM_TYPE as Record<string, string>,
  categories: V25_ROOM_CATS as unknown as Record<string, EquipmentCategory>,
  templates: V25_ROOM_TEMPLATES as unknown as Record<string, RoomTemplate>,
  required: V25_ROOM_REQUIRED as Record<string, string[]>,
  roleOk: V25_ROOM_ROLEOK as Record<string, string[]>,
  info: V25_ROOM_INFO as Record<string, string[]>,
  tests: V25_TESTS as unknown as Record<string, TestDefinition>,
  testLabel: V25_TEST_LABEL as Record<string, string>,
  packTests: V25_CX_CATALOGUE as unknown as Record<string, PackTestDefinition>,
  rulePack: V25_DESIGN_rulePack as unknown as RulePack,
  domainPersona: V25_DOMAIN_PERSONA as Record<string, string>,
  verifierPersonas: V25_VERIFIER_PERSONAS as Record<string, string[]>,
};
