/**
 * The bridge to the embedded Founder Edition demonstrator.
 *
 * The studio never reaches into the demonstrator's internals to change data. It only:
 *   - navigates the frame to a route;
 *   - switches persona by clicking the demonstrator's OWN persona control (#/v25/persona → data-act="v25-persona"), exactly as a
 *     person would — so every authorization rule of the page still applies;
 *   - reads records through the page's sealed, read-only facade (window.__V25__.get / .all) for the data inspector.
 * All of this needs the studio and the demonstrator on the same origin (the studio server). Opened from disk, the frame still
 * works; only persona switching and inspection are unavailable, and the studio says so.
 */
import type { RefObject } from 'react';

export const FOUNDER_EDITION = 'demonstrators/founder/Empathia-Founder-Edition.html';

type V25Facade = {
  persona: () => string;
  state: () => { records?: Record<string, { type: string }>; events?: unknown[] };
  get: (id: string) => unknown;
  all: (type: string, pred?: (x: unknown) => boolean) => unknown[];
  version?: string;
};

export function frameWindow(ref: RefObject<HTMLIFrameElement | null>): (Window & { __V25__?: V25Facade }) | null {
  try {
    const w = ref.current?.contentWindow as (Window & { __V25__?: V25Facade }) | null;
    if (!w) return null;
    void w.location.href; // throws when cross-origin
    return w;
  } catch {
    return null;
  }
}

export const sameOrigin = (ref: RefObject<HTMLIFrameElement | null>) => !!frameWindow(ref);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until<T>(fn: () => T | null | undefined | false, ms = 8000): Promise<T | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const v = fn(); if (v) return v as T; } catch { /* not ready */ }
    await wait(80);
  }
  return null;
}

export async function ready(ref: RefObject<HTMLIFrameElement | null>): Promise<boolean> {
  return !!(await until(() => frameWindow(ref)?.__V25__, 20000));
}

export function currentPersona(ref: RefObject<HTMLIFrameElement | null>): string | null {
  try { return frameWindow(ref)?.__V25__?.persona() ?? null; } catch { return null; }
}

/** Switch persona through the page's own persona control, then open the route. Returns what happened, in words. */
export async function openAs(ref: RefObject<HTMLIFrameElement | null>, route: string, persona: string | null): Promise<string> {
  const w = frameWindow(ref);
  if (!w) return 'The demonstrator is open from disk: persona switching needs the studio launcher (same origin).';
  if (!(await ready(ref))) return 'The demonstrator did not start within 20 seconds.';
  if (persona && currentPersona(ref) !== persona) {
    w.location.hash = '#/v25/persona';
    const btn = await until(() => w.document.querySelector<HTMLElement>(`[data-act="v25-persona"][data-persona="${persona}"]`));
    if (btn) { btn.click(); await until(() => currentPersona(ref) === persona, 4000); }
  }
  w.location.hash = route;
  const now = currentPersona(ref);
  return persona && now !== persona ? `Opened ${route}; the page kept persona ${now} (its persona control did not offer ${persona}).` : `Opened ${route} as ${now}.`;
}

export interface InspectRow { type: string; count: number }

/** Read-only record counts for the inspector, through the sealed facade (a copy of the page's store; nothing is written back). */
export function inspectTypes(ref: RefObject<HTMLIFrameElement | null>): { rows: InspectRow[]; events: number } {
  const V = frameWindow(ref)?.__V25__;
  if (!V) return { rows: [], events: 0 };
  try {
    const s = V.state();
    const counts: Record<string, number> = {};
    for (const r of Object.values(s.records || {})) counts[r.type] = (counts[r.type] || 0) + 1;
    return { rows: Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => ({ type, count })), events: (s.events || []).length };
  } catch {
    return { rows: [], events: 0 };
  }
}

export function inspectRecords(ref: RefObject<HTMLIFrameElement | null>, type: string, limit = 20): unknown[] {
  const V = frameWindow(ref)?.__V25__;
  if (!V) return [];
  try { return Object.values(V.state().records || {}).filter((r) => r.type === type).slice(0, limit); } catch { return []; }
}
