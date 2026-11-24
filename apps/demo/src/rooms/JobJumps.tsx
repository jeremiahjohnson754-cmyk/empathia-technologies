/**
 * "This job in": one service job's places across the products, the job's counterpart of the room row (RoomJumps.tsx, the same shape
 * and the same rule: only places the role may open are listed, absent and not disabled). Added 24 Nov 2026 after walking the
 * Enterprise 3.0 journeys (founder, 23 Nov 19:22: prove the products work together): from a work order, a case under
 * investigation, a room scan or a lesson, a person could reach the room but not the diagnosis, the scan or the proof for the same job.
 * The row names what closing the job does not do, because that is the mistake the journey warns about (J5).
 */
import { Icon, type IconName } from '@empathia/ui';
import type { Incident } from '../workspace/store.js';
import { roomById, roomHref } from '../campus/canon.js';
import { isRole } from '../access/policy.js';
import { flowFor } from '../voice/model.js';
import { opensFor } from './RoomJumps.js';

export type JobPlace = 'service' | 'apex' | 'scan' | 'commissioning' | 'assurance' | 'voice' | 'learn' | 'room';
export function jobPlaces(inc: Pick<Incident, 'id' | 'roomId' | 'workOrderId' | 'apexId'>, may: (href: string) => boolean): Array<{ key: JobPlace; label: string; href: string; icon: IconName }> {
  const o = roomById(inc.roomId);
  const all: Array<{ key: JobPlace; label: string; href: string; icon: IconName }> = [
    { key: 'service', label: 'ServiceHands', href: inc.workOrderId ? `#/servicehands/wo/${inc.workOrderId}` : `#/servicehands?id=${inc.id}`, icon: 'wrench' },
    { key: 'apex', label: inc.apexId ? `APEX ${inc.apexId}` : 'Diagnose in APEX', href: inc.apexId ? `#/v25/apex?case=${inc.apexId}` : `#/v25/apex?incident=${inc.id}`, icon: 'spark' },
    { key: 'scan', label: 'Room scan', href: `#/v25/fi/scan/${inc.roomId}`, icon: 'pulse' },
    ...(flowFor(inc.roomId) ? [{ key: 'voice' as JobPlace, label: 'Calling', href: `#/voice/callpath/${inc.roomId}`, icon: 'network' as IconName }] : []),
    { key: 'commissioning', label: 'Commissioning', href: `#/commissioning/room/${inc.roomId}`, icon: 'check' },
    { key: 'assurance', label: 'Assurance', href: `#/assurance/room/${inc.roomId}`, icon: 'shield' },
    { key: 'learn', label: 'Learn from this room', href: `#/learn/cases/TC-${inc.roomId}`, icon: 'book' },
    ...(o ? [{ key: 'room' as JobPlace, label: 'The room', href: roomHref(o), icon: 'room' as IconName }] : []),
  ];
  return all.filter((p) => may(p.href));
}
export function JobJumps({ inc, here, perspective }: { inc: Pick<Incident, 'id' | 'roomId' | 'workOrderId' | 'apexId'>; here: JobPlace; perspective: string }) {
  if (!isRole(perspective)) return null;
  const ps = jobPlaces(inc, opensFor(perspective)).filter((p) => p.key !== here);
  if (!ps.length) return null;
  return <nav className="room-jumps job-jumps" aria-label={`Job ${inc.id} elsewhere in Empathia`} data-testid="job-jumps" data-job={inc.id}>
    <span className="room-jumps__l">{inc.id} in</span>
    {ps.map((p) => <a key={p.key} href={p.href} data-testid={`job-jump-${p.key}`} title={p.key === 'commissioning' ? 'Closing a job does not pass a commissioning test' : undefined}><Icon name={p.icon} size={14} />{p.label}</a>)}
  </nav>;
}
