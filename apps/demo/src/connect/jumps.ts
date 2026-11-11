/**
 * Connect on the role start pages (campus/rolehome.ts hosts it with one line): a "Schedule a meeting" jump for a role that
 * schedules, when its list has room for one and the letter is free. "g" and "h" are reserved by the shortcuts; a list holds seven.
 */
import type { RoleKey } from '../registry.types.js';
import { maySchedule } from './access.js';

type JumpRow = [key: string, label: string, href: string, sub: string];
const JUMP: JumpRow = ['m', 'Schedule a meeting', '#/meet', 'With the right person, at a time that works'];
export const JUMP_LIMIT = 7;
/** The start-page jump for a role that schedules, when its list has room and the letter is free ("g" and "h" are reserved). */
export function connectJumps(role: RoleKey, existing: ReadonlyArray<readonly [string, string, string, string]>): JumpRow[] {
  if (!maySchedule(role) || existing.length >= JUMP_LIMIT || existing.some((j) => j[0] === JUMP[0] || j[2] === JUMP[2])) return [];
  return [JUMP];
}
