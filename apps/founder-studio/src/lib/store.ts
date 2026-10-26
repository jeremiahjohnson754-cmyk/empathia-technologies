/**
 * Studio state: per-founder conveniences (theme, last route, scenario progress, notes, demo snapshots).
 * Kept in this browser's localStorage under one key; every access is guarded, and the studio works without storage.
 * The demonstrator keeps its own state under its own key (empathia.living-campus.v1); the studio never writes it except
 * when the founder explicitly restores a snapshot or resets the demo.
 */
import { useSyncExternalStore } from 'react';

export const STUDIO_KEY = 'empathia.founder-studio.v1';
export const DEMO_KEYS = ['empathia.living-campus.v1', 'empathia.sound'];

/** A saved demonstrator state. The data itself is kept on disk by the studio server (or in a file the founder downloads). */
export interface SnapshotMeta {
  id: string;
  name: string;
  at: string;
  bytes: number;
}

export interface StudioState {
  theme: 'system' | 'dark' | 'light';
  reducedMotion: boolean;
  scenario: Record<string, number[]>;
  notes: Record<string, string>;
  demoPersonaSwitch: boolean;
  lastVisited: string[];
}

const DEFAULTS: StudioState = { theme: 'system', reducedMotion: false, scenario: {}, notes: {}, demoPersonaSwitch: true, lastVisited: [] };

let state: StudioState = load();
const subs = new Set<() => void>();

function load(): StudioState {
  try {
    const raw = window.localStorage.getItem(STUDIO_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return { ...DEFAULTS, ...(p && typeof p === 'object' ? p : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export let storageAvailable = (() => {
  try { const k = `${STUDIO_KEY}.probe`; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch { return false; }
})();

export function update(fn: (s: StudioState) => StudioState): void {
  state = fn(state);
  try { window.localStorage.setItem(STUDIO_KEY, JSON.stringify(state)); } catch { storageAvailable = false; }
  subs.forEach((f) => f());
}

export function useStudio(): StudioState {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
}

export const getState = () => state;

export function resetStudio(): void {
  try { window.localStorage.removeItem(STUDIO_KEY); } catch { /* storage unavailable */ }
  state = { ...DEFAULTS };
  subs.forEach((f) => f());
}

/** Read the demonstrator's own storage (same origin only). */
export function readDemoStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of DEMO_KEYS) {
    try { const v = window.localStorage.getItem(k); if (v != null) out[k] = v; } catch { /* unavailable */ }
  }
  return out;
}

export function writeDemoStorage(data: Record<string, string>): boolean {
  try {
    for (const k of DEMO_KEYS) window.localStorage.removeItem(k);
    for (const [k, v] of Object.entries(data)) if (DEMO_KEYS.includes(k)) window.localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

export function clearDemoStorage(): boolean {
  try { for (const k of DEMO_KEYS) window.localStorage.removeItem(k); return true; } catch { return false; }
}
