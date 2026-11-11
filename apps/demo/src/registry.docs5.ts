/**
 * Commissioning Phase 5: documentation tracking and submission (founder's directive of 11 Nov 2026, §12). V2.5.3 had no such surface,
 * so each authority is an explicit list with where it comes from; recording on the dossier keeps the dossier's own authority (cx.tech).
 */
import type { PageDef } from './registry.types.js';
import { DOC_ROLES as R } from './docs5/roles.js';

export const DOCS5_PAGES: readonly PageDef[] = [
  {
    id: 'docs', title: 'Documentation', purpose: 'What a room must hand over before it is accepted: each deliverable, its owner, due date, revision, findings and acknowledgements', product: 'commissioning',
    path: '/docs', alias: ['/docs/:report', '/docs/:report/:doc'], authority: { roles: R.read, why: 'The dossier’s commissioning-record audiences, the Designer who owns the drawings, and the Site Champion, who is shown only what they acknowledge' },
    sections: [{ id: 'engineering', label: 'The whole checklist, findings, release controls and applicability', authority: { roles: R.engineering, why: 'Engineering record: the Site Champion is shown only the documents they are asked to acknowledge (founder, 11 Nov 2026: no engineering capability by title)' } }],
    actions: [
      { id: 'docs.assign', label: 'Assign a deliverable and set its due date', authority: { roles: R.assign, why: 'Directive §12 "assign owners; track due dates": the Integration PM runs the integrator’s project (V2.5.3: schedule, milestones, deficiencies)' } },
      { id: 'docs.submit', label: 'Submit a revision', authority: { roles: R.submit, why: 'Directive §12: the default owners of the eighteen deliverables' } },
      { id: 'docs.review', label: 'Accept a revision or ask for a correction', authority: { roles: R.review, why: 'Independent review, the same roles that verify on the dossier (ADR-0005); never the role that submitted' } },
      { id: 'docs.acknowledge', label: 'Acknowledge an accepted document', authority: { roles: R.acknowledge, why: 'Directive §12 "track acknowledgements": operations and service take the room over; the Site Champion reads the operator guide (founder, 11 Nov 2026)' } },
      { id: 'docs.vendor', label: 'Record what a vendor sent', authority: { roles: R.vendor, why: 'Directive §12 "track vendor submissions": the Integration PM is the vendor’s counterpart' } },
      { id: 'docs.capture', label: 'Capture a photograph, note or measurement in the room', authority: { roles: R.capture, why: 'Directive §12 "Mobile": the roles that work in the room' } },
      { id: 'docs.record', label: 'Record a document or capture on the dossier', authority: { action: 'cx.tech' } },
    ],
    load: () => import('./docs5/DocsPage.js'),
    search: { keywords: 'documentation deliverables as-built drawings signal flow rack elevations asset list bill of materials configuration backup firmware commissioning results training operator guide warranty handoff phase 5 submission revision', aliases: ['documentation', 'phase 5', 'deliverables', 'as-built', 'handover documents'] },
  },
];
