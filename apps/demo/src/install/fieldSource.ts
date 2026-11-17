/**
 * Where a room's field record is kept (founder, 17 Nov 2026: "integrate the regular Lite, Engineering, Commissioning, ServiceHands,
 * Assurance, and APEX interfaces with those server records").
 *
 * The field record page is one page. For a campus room the record is the browser's (install/fieldRecord.ts). For the room of a
 * visitor's sandbox, in a build that names a server, it is the server's (connected/fieldServer.tsx): the page reads what the server
 * holds and every action is a request the server may refuse. The page itself does not know which it is talking to, beyond saying so.
 */
import type { RoomRecord } from '../campus/design.js';
import * as F from './fieldRecord.js';

export type MountingInput = Parameters<typeof F.recordMounting>[3];
export type HookupInput = Parameters<typeof F.recordHookup>[2];
export type MoveInput = Parameters<typeof F.proposeMove>[2];

export interface FieldSource {
  where: 'browser' | 'server';
  /** the record as it stands now; read again after every action */
  read(): F.FieldState;
  /** what the server says the person acting may do. Absent for the browser's record, where the page asks the demonstration's policy */
  may?: { record: boolean; decide: boolean };
  /** who the server is answering as, in its own words (server only) */
  actingAs?: string;
  /** The server's own answers to the questions the page would otherwise work out (server only). One backend decides: whether a hookup
   *  matches the design, which checks to look at again after a move, and the counts. The page shows them and derives nothing of its own. */
  facts?: { stats(): ReturnType<typeof F.fieldStats>; asDesigned(hookup: string): boolean; recheck(device: string): string[] };
  recordMounting(device: string, m: MountingInput): Promise<F.Result>;
  recordHookup(h: HookupInput): Promise<F.Result>;
  proposeMove(m: MoveInput): Promise<F.Result>;
  decideMove(id: string, approve: boolean, decision?: string): Promise<F.Result>;
  addMarkup(m: { x: number; y: number; text: string }): Promise<F.Result>;
  resolveMarkup(id: string, resolution: string): Promise<F.Result>;
}

/** The browser's record, behind the same interface: each action completes at once. */
export function browserSource(r: RoomRecord, persona: string): FieldSource {
  return {
    where: 'browser',
    read: () => F.readField(r.outline.id),
    recordMounting: async (device, m) => F.recordMounting(r, persona, device, m),
    recordHookup: async (h) => F.recordHookup(r, persona, h),
    proposeMove: async (m) => F.proposeMove(r, persona, m),
    decideMove: async (id, approve, decision) => F.decideMove(r, persona, id, approve, decision),
    addMarkup: async (m) => F.addMarkup(r, persona, m),
    resolveMarkup: async (id, resolution) => F.resolveMarkup(r, persona, id, resolution),
  };
}
