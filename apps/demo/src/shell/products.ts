/**
 * The nine products in the canonical order (D37/D40), with the ids of the design tokens (--p-<id>). The shared list is kept in
 * packages/ui/src/products.ts by the foundation slice; this file mirrors it for the demo shell until that lands, and must keep its order.
 */
import type { ProductKey } from '../registry.types.js';
export interface Product { id: Exclude<ProductKey, 'shell'>; name: string; purpose: string }
export const PRODUCTS: readonly Product[] = [
  { id: 'mission-control', name: 'Mission Control', purpose: 'What changed, what matters, what needs action' },
  { id: 'lite', name: 'Lite', purpose: 'Spaces in 3D: build a room, explore the campus, evaluate devices with Scouter' },
  { id: 'pro', name: 'Pro', purpose: 'Operational intelligence, portfolio and service performance' },
  { id: 'search-party', name: 'Search Party', purpose: 'Universal entity search and relationship intelligence' },
  { id: 'servicehands', name: 'ServiceHands', purpose: 'Hard-gated eligibility, preflight and field execution' },
  { id: 'commissioning', name: 'Commissioning & Assurance', purpose: 'Plans, evidence, verification, acceptance and baselines' },
  { id: 'apex', name: 'APEX', purpose: 'Diagnosis tiers A0–A5 with their evidence' },
  { id: 'field', name: 'Field Intelligence', purpose: 'What the collector declares, observes and verifies' },
  { id: 'learn', name: 'Learn', purpose: 'Evidence-backed cases and training' },
];
