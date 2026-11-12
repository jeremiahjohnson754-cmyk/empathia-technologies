/**
 * The choice made on a room's spatial drift (V2.5.3's actLiteDrift, restored 12 Nov 2026): restore the commissioned layout, or mark the
 * new layout for engineering review. Kept on this device only, per room; simulated: nothing moves in a real room and no record changes.
 */
import type { RoleKey } from '../registry.types.js';

export type DriftChoice = 'restore' | 'review';
export interface DriftDecision { v: DriftChoice; role: RoleKey; at: string }
const KEY = 'empathia.demo.liteDrift.v1';

export function loadDrift(): Record<string, DriftDecision> {
  try { const raw = window.localStorage.getItem(KEY); const p = raw ? JSON.parse(raw) : {}; return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; } catch { return {}; }
}
export function driftOf(roomId: string): DriftDecision | null {
  const d = loadDrift()[roomId]; return d && (d.v === 'restore' || d.v === 'review') ? d : null;
}
export function setDrift(roomId: string, v: DriftChoice | null, role: RoleKey): void {
  const all = loadDrift(); if (v) all[roomId] = { v, role, at: new Date().toISOString() }; else delete all[roomId];
  try { window.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage refused: the choice lasts for this page only */ }
}
