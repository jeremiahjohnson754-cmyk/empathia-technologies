/** Shapes of the Lite records extracted from V2.5.3 (data/v253.ts). */
export interface SpaceDef {
  id: string; name: string; kind: string; group: 'Lobby' | 'Services' | 'Amenities' | 'Commons' | string; floor: number;
  part?: string; size?: [number, number]; existing?: boolean;
  what: string; who: string; hours: string; how: string[]; etiquette?: string[]; issues: string[]; support: string; upkeep: string;
  chapter: string; path: string; services?: Array<[string, string]>;
}
export type GuideSection = [string, string[]];
export type GuideChapter = [string, string, string, GuideSection[]];
export interface GuideDef { id: string; name: string; audience: string; summary: string; chapters: GuideChapter[] }
export interface SpaceObj {
  id: string; kind: string; label: string; x: number; y: number; z: number; w: number; d: number; h: number; rot: number;
  face?: number; space?: string; screen?: string; card?: [string, string, string[]]; lamp?: string; seat?: boolean; [k: string]: unknown;
}
export interface SpaceLayout {
  w: number; d: number; h: number; door?: { wall: string; at: number; width: number }; door2?: { wall: string; at: number; width: number };
  glass?: string[]; big?: boolean; surf?: Record<string, unknown>;
  zones: Array<{ id: string; kind: string; label: string; pts: Array<[number, number]> }>;
  objs: SpaceObj[]; spots?: Record<string, [number, number]>;
}
