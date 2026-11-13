/**
 * V2.5.3's own room pages for Assurance and Commissioning (founder, 13 Nov 2026: "look at v2.5.3 make sure your version of
 * commissioning assurance … surpasses"). Until now these addresses opened the technical room view on a tab; they now open the dedicated
 * comparison and record V2.5.3 had: #/assurance/room/<id>[/ready|/recommission|/history] and
 * #/commissioning/room/<id>[/trace|/deficiencies|/signoff].
 */
import type { PageProps } from '../registry.types.js';
import { AsRoomPage, CxRoomPage } from './RoomRecords.js';
import { REFERENCE_ROOM_ID } from '../campus/canon.js';

const roomOf = (p: PageProps) => p.params.room || REFERENCE_ROOM_ID;
export function AssuranceRoute(p: PageProps) { return <AsRoomPage perspective={p.role} params={{ ...p.params, room: roomOf(p) }} hash={p.hash} />; }
export function CommissioningRoute(p: PageProps) { return <CxRoomPage perspective={p.role} params={{ ...p.params, room: roomOf(p) }} hash={p.hash} />; }
