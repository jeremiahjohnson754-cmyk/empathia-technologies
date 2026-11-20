/**
 * What the Technical Knowledge Ledger adds to the shared contract's knowledge object (contract.ts, owned by the integrator and not
 * edited here): the structured forms a page can draw and a test can recompute — worked examples, numbered steps, a decision tree —
 * and, for a metadata-only reference, one line on what it applies to. Everything else is the contract's.
 */
import type { KnowledgeObject } from './contract.js';
import type { RoleKey } from '../registry.types.js';
import type { Worked } from './calc.js';

export interface TreeNode { ask: string; yes: string; no: string }
export interface LedgerObject extends KnowledgeObject {
  /** worked examples, each computed by calc.ts (their one-line forms are also in the contract's `calculations`) */
  worked?: readonly Worked[];
  /** a procedure's steps, in order */
  steps?: readonly string[];
  /** a decision tree read top to bottom: each node's "no" or "yes" either ends it or leads to the next node */
  tree?: readonly TreeNode[];
  /** for a metadata-only reference: what it is used for here, in our own words (never the source's text) */
  applies?: string;
}

/** The two synthetic customers. `corporate_demo` is the demonstration estate (Northstar); the second exists to prove isolation. */
export const HOME_TENANT = 'corporate_demo';
export const OTHER_TENANT = 'brindlewick_demo';
export const TENANTS: ReadonlyArray<{ id: string; name: string; note: string }> = [
  { id: HOME_TENANT, name: 'Northstar', note: 'the demonstration estate' },
  { id: OTHER_TENANT, name: 'Brindlewick Works', note: 'a second, fictional customer that exists to show that customers are kept apart' },
];
export const tenantName = (id: string | null) => TENANTS.find((t) => t.id === id)?.name || 'Empathia';

/** Roles whose work is the equipment: who a technical write-up is written for and, for private incident reviews, who may read it. */
export const TECHNICAL: readonly RoleKey[] = ['service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ops', 'architect', 'qa'];
export const DESIGN: readonly RoleKey[] = ['syseng', 'designer', 'cxeng', 'architect'];
export const NETWORK: readonly RoleKey[] = ['syseng', 'designer', 'cxeng', 'ops', 'architect', 'installer'];
export const AUDIENCES = ['Everyone', 'Technicians', 'Engineers and designers', 'Network and IT'] as const;
export type Audience = typeof AUDIENCES[number];
