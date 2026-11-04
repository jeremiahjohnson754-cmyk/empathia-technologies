/** Scouter's data: this build's own catalogue, room templates and requirement table (packages/domain-data), unchanged. */
import CATS from '@empathia/domain-data/data/V25_ROOM_CATS.json' with { type: 'json' };
import TEMPLATES from '@empathia/domain-data/data/V25_ROOM_TEMPLATES.json' with { type: 'json' };
import REQUIRED from '@empathia/domain-data/data/V25_ROOM_REQUIRED.json' with { type: 'json' };
import { ROOM_KEYS, type Cat, type Template } from './evaluate.js';

export const cats = CATS as unknown as Record<string, Cat>;
export const templates = TEMPLATES as unknown as Record<string, Template>;
export const required = REQUIRED as unknown as Record<string, string[]>;
export const ROOMS = ROOM_KEYS.filter((k) => templates[k]).map((k) => ({ key: k, ...templates[k]! }));
