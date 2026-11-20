/**
 * Instant Room (founder's directive of 11 Nov 2026, §11): guided capture of a space on a phone, a plan, and a proposed design.
 * "A technician, employee, designer, or authorized field engineer should be able to use their phone to document and model a space."
 * A proposal changes no record; the designers who would act on one read them here.
 */
import type { PageDef } from './registry.types.js';
import { IR_READERS, IR_ROLES } from './instant/store.js';

const WHY = 'Founder, 11 November 2026, §11: a technician, an employee, a designer or an authorised field engineer captures a space';
const ALL = [...new Set([...IR_ROLES, ...IR_READERS])];
export const INSTANT_PAGES: readonly PageDef[] = [
  {
    id: 'instant', title: 'Instant Room', purpose: 'Capture a space on a phone with guided photographs and a few measurements, see a plan of it and what differs from its record, and save a proposed design', product: 'lite',
    path: '/instant', alias: ['/instant/:room'], authority: { roles: ALL, why: `${WHY}; the designers who read proposals are admitted to read them` },
    actions: [
      { id: 'instant.capture', label: 'Capture a space', authority: { roles: IR_ROLES, why: WHY } },
      { id: 'instant.propose', label: 'Save a proposed design', authority: { roles: IR_ROLES, why: `${WHY}; a proposal changes no record` } },
    ],
    load: () => import('./instant/InstantPage.js'),
    search: { keywords: 'instant room capture photograph photo measure dimensions plan spatial model propose design phone mobile survey', aliases: ['instant room', 'capture a room', 'room capture'] },
  },
];
