/**
 * Who holds which edition of the IT Onboarding Success Guide in this demonstration.
 *
 * The programme itself (what a new starter learns and does) is read by the roles V2.5.3 admits to Learn, the technical staff, and
 * by the two roles that publish it. Everything about ONE starter (their progress, their check results, what a mentor observed, what
 * a manager wrote at a review) is personal: it is shown to that starter, to their manager, and, for the items a mentor confirms,
 * to their mentor. The administrator sees counts, never a person's notes or ratings.
 *
 * ASSUMPTION awaiting the founder (docs/surpass/ENGINEERING_CHECKPOINT.md): which demonstration role stands for the starter, the
 * manager, the mentor and the administrator. Here: a new Service Engineer; the Service Manager; the Systems Engineer; the Data
 * Steward and the Product Architect. Separation is by role: a starter never confirms a manager's or a mentor's item, a manager
 * never marks the starter's learning as done, and nobody rates themselves.
 */
import type { RoleKey } from '../registry.types.js';
import { ROLE_KEYS, rolesFor } from '../access/policy.js';

const LEARN = rolesFor({ area: 'learn' });
const uniq = (r: readonly RoleKey[]) => ROLE_KEYS.filter((k) => r.includes(k));
export const OB_ROLES = {
  /** may open the guide at all */ read: uniq([...LEARN, 'steward', 'architect']),
  /** reads the programme (the employee edition without anyone's progress) */ programme: uniq([...LEARN, 'steward', 'architect']),
  starter: ['service'] as RoleKey[], manager: ['svcmgr'] as RoleKey[], mentor: ['syseng'] as RoleKey[], administrator: ['steward', 'architect'] as RoleKey[],
} as const;
export const isStarter = (r: RoleKey) => OB_ROLES.starter.includes(r);
export const isManager = (r: RoleKey) => OB_ROLES.manager.includes(r);
export const isMentor = (r: RoleKey) => OB_ROLES.mentor.includes(r);
export const isAdministrator = (r: RoleKey) => OB_ROLES.administrator.includes(r);
export type EditionKey = 'employee' | 'manager' | 'mentor' | 'administrator';
/** The editions a role may open. Everyone admitted reads the employee edition's programme; the other three are their holders'. */
export function editionsFor(r: RoleKey): EditionKey[] {
  if (!OB_ROLES.read.includes(r)) return [];
  return ['employee', ...(isManager(r) ? ['manager' as const] : []), ...(isMentor(r) ? ['mentor' as const] : []), ...(isAdministrator(r) ? ['administrator' as const] : [])];
}
/** Whose progress a role is shown: the starter's own, or the starter's as their manager or mentor. */
export const seesProgress = (r: RoleKey): 'own' | 'manager' | 'mentor' | 'counts' | 'none' => (isStarter(r) ? 'own' : isManager(r) ? 'manager' : isMentor(r) ? 'mentor' : isAdministrator(r) ? 'counts' : 'none');
