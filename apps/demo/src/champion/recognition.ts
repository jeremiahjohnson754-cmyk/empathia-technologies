/**
 * What a Site Champion has done for their site, and what a stand-in needs to know (founder, §15: "Success recognition",
 * "Succession planning", "Provide recognition and feedback without exposing private employee performance information").
 *
 * Both are read from the record and are counts or lists of open things. Nothing here is a score, a rating or a ranking, nothing
 * compares one person with another, and the champion's own check results and getting-started list are not part of it.
 */
import type * as S from '../workspace/store.js';
import type { WX } from '../hardening/kit.js';
import { roomById, shortName } from '../campus/canon.js';
import { championView, inSite } from './store.js';

export interface Contribution { id: 'checked' | 'access' | 'reports' | 'notes' | 'approved'; label: string; n: number; from: string }
const LIVE = new Set(['OPEN', 'TRIAGED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESTORED', 'PENDING_VERIFICATION']);
const byChampion = (s: string | undefined | null) => /site champion/i.test(s || '');

/** `approvedNotes` is how many of the champion's notes a reviewer has approved (the Knowledge Ledger knows; the caller asks it). */
export function contributions(w: S.Workspace, approvedNotes: number): Contribution[] {
  const c = championView(w); const intake = (w as WX).sh?.intake || {};
  const reports = Object.entries(intake).filter(([id, x]) => byChampion(x.entry) && inSite(w.incidents.find((i) => i.id === id)?.buildingKey)).length;
  return [
    { id: 'checked', label: 'Rooms checked against their record', n: Object.keys(c.verified).length, from: 'Checks recorded on the site page' },
    { id: 'access', label: 'Visits a technician could get into because access was confirmed', n: w.workOrders.filter((x) => inSite(x.buildingKey) && byChampion(x.access?.confirmedBy)).length, from: 'Jobs in the service workspace' },
    { id: 'reports', label: 'Problems reported from a room', n: reports, from: 'Reports in the service workspace' },
    { id: 'notes', label: 'Notes added about rooms', n: c.notes.length, from: 'Notes recorded on the site page' },
    { id: 'approved', label: 'Notes a reviewer approved as guidance', n: Math.max(0, Math.min(approvedNotes, c.notes.length)), from: 'Reviews in the Knowledge Ledger' },
  ];
}
export interface Handover { toConfirm: string[]; open: string[]; notesWaiting: number; nothing: boolean }
/** What is open at the site right now, for whoever stands in: the visits waiting for access, the problems being followed, and notes not yet reviewed. */
export function handover(w: S.Workspace, site: string, approvedNotes: number): Handover {
  const name = (roomId: string) => { const r = roomById(roomId); return r ? shortName(r) : roomId; };
  const toConfirm = w.workOrders.filter((x) => x.buildingKey === site && !['DONE', 'CANCELLED'].includes(x.state) && !x.access).map((x) => `${x.id}: ${x.title} (${name(x.roomId)})`);
  const open = w.incidents.filter((x) => x.buildingKey === site && LIVE.has(x.state)).map((x) => `${x.id}: ${x.title} (${name(x.roomId)}), ${x.state.toLowerCase().replace(/_/g, ' ')}`);
  const notesWaiting = Math.max(0, championView(w).notes.length - approvedNotes);
  return { toConfirm, open, notesWaiting, nothing: !toConfirm.length && !open.length && !notesWaiting };
}
