/**
 * The AV Engineering Standards & Design Manual (founder's directive of 11 Nov 2026, §08 Product C): a governed technical reference,
 * an organisation's own edition of it, and the standards-aware workflow that turns it into one room's design requirements and
 * commissioning template. Read by the technical staff V2.5.3 admits to Learn and by the project manager who holds suppliers to it.
 * Who may do which act is V2.5.3's own (`build.design`, `design.decide`), except holding the standard, which is an assumption
 * recorded in docs/surpass/ENGINEERING_CHECKPOINT.md (the Product Architect).
 */
import type { PageDef } from './registry.types.js';
import { MAN_ROLES } from './manual/roles.js';

const WHY = 'Founder, 11 November 2026, §08 Product C: a governed technical reference with standards-aware workflows';
export const MANUAL_PAGES: readonly PageDef[] = [
  {
    id: 'manual', title: 'AV Engineering Standards & Design Manual', purpose: 'The engineering rules a room is designed, built and accepted by; your organisation’s edition of them; one room’s requirements and commissioning template; exceptions and the evidence kept against each', product: 'learn',
    path: '/manual', alias: ['/manual/:view', '/manual/:view/:id'], authority: { roles: MAN_ROLES.read, why: `${WHY}; read by the roles V2.5.3 admits to Learn and by the project manager who holds suppliers to it` },
    actions: [
      { id: 'manual.set', label: 'Save a room’s design requirements and commissioning template', authority: { action: 'build.design' } },
      { id: 'manual.exception', label: 'Ask for an exception to a rule', authority: { action: 'build.design' } },
      { id: 'manual.decide', label: 'Decide an exception, or record whether a requirement is met', authority: { action: 'design.decide' } },
      { id: 'manual.edition', label: 'Settle a value, add a requirement for a building, adopt a revision', authority: { roles: MAN_ROLES.owner, why: `${WHY}; one named owner holds the standard (rule G-01)` } },
    ],
    load: () => import('./manual/ManualPage.js'),
    search: { keywords: 'engineering standards design manual av standard camera placement audio echo canceller reinforcement network port profile commissioning acceptance exception waiver revision requirements template accessibility supplier compliance', aliases: ['standards manual', 'engineering manual', 'design manual', 'av standards', 'exceptions'] },
  },
];
