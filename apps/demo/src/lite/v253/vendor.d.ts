/** Types for the generated V2.5.3 room module (vendor.js). The module is V2.5.3's own code; its scene items are the L3 shapes in ../l3.tsx. */
export interface V253 {
  L3_DEFS: string;
  liteRoomScene: (cam: { sy: number; cy: number; s: number; small: boolean }) => { cx: number; cy: number; R: number; top: number; items: unknown[]; seq: number };
  layoutOf: (room: unknown, state: string, opts?: unknown) => V253Layout;
  liteLayoutNow: () => V253Layout;
  setLV: (v: unknown) => void; setS: (v: unknown) => void;
  [k: string]: unknown;
}
export interface V253Object { id: string; kind: string; x: number; y: number; z: number; w: number; d: number; h: number; rot: number; cat?: string; n?: number; label?: string; deviceId?: string; flag?: string; proposed?: boolean; [k: string]: unknown }
export interface V253Layout { w: number; d: number; h: number; objs: V253Object[]; seats: Array<{ id: string; x: number; y: number }>; cams: Array<{ id: string; x: number; y: number; presets: Array<{ name: string; aim: number; fov: number; range: number }> }>; mics: unknown[]; zones: unknown[]; hero: boolean; roomId: string; state: string; [k: string]: unknown }
export function makeV253(shim: Record<string, unknown>): V253;
