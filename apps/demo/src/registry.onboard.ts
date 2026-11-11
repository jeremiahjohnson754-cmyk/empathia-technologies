/**
 * The IT Onboarding Success Guide (founder's directive of 11 Nov 2026, §08 Product A), in four editions. The programme is read by
 * the roles V2.5.3 admits to Learn (the technical staff) and by the two roles that publish it; each act belongs to the role the
 * programme names (onboard/roles.ts). Which demonstration role stands for the starter, the manager, the mentor and the
 * administrator is an assumption recorded in docs/surpass/ENGINEERING_CHECKPOINT.md.
 */
import type { PageDef } from './registry.types.js';
import { OB_ROLES } from './onboard/roles.js';

const WHY = 'Founder, 11 November 2026, §08 Product A: four distinct editions, each for the person it names';
export const ONBOARD_PAGES: readonly PageDef[] = [
  {
    id: 'onboard', title: 'IT Onboarding Success Guide', purpose: 'A new IT colleague’s first ninety days, in four editions: the starter’s programme, the manager’s milestones and reviews, the mentor’s coaching plan, and the administrator’s publishing and reporting', product: 'learn',
    path: '/onboard', alias: ['/onboard/:edition'], authority: { roles: OB_ROLES.read, why: `${WHY}; read by the roles V2.5.3 admits to Learn and by those who publish it` },
    actions: [
      { id: 'onboard.done', label: 'Say an item of your own programme is done', authority: { roles: OB_ROLES.starter, why: `${WHY}; the starter’s own word` } },
      { id: 'onboard.check', label: 'Take a knowledge check', authority: { roles: OB_ROLES.starter, why: `${WHY}; the starter’s own check, marked by the product` } },
      { id: 'onboard.confirm', label: 'Confirm an item a manager or a mentor has to see', authority: { roles: [...OB_ROLES.manager, ...OB_ROLES.mentor], why: `${WHY}; each confirms only the items the programme gives them` } },
      { id: 'onboard.review', label: 'Record a review', authority: { roles: OB_ROLES.manager, why: `${WHY}; a review is the manager’s, and nobody rates themselves` } },
      { id: 'onboard.publish', label: 'Publish a revision of the guide', authority: { roles: OB_ROLES.administrator, why: `${WHY}; tenant-specific publishing and version control` } },
    ],
    load: () => import('./onboard/OnboardPage.js'),
    search: { keywords: 'onboarding new starter first day first week 30 60 90 day plan manager review mentor coaching knowledge check rubric competency certification employee edition administrator edition', aliases: ['onboarding guide', 'it onboarding', 'new starter', '30 60 90'] },
  },
];
