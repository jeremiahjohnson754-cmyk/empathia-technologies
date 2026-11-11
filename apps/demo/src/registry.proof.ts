/**
 * Pages of the v1.8 proof slice: the Proof Center (#/proof), the QR Hub (#/scan) and the commissioning dossier (#/dossier), which
 * together are the demonstration half of the commercial-to-engineering path: claim → asset passport → tests and evidence → deficiency
 * → independent verification → acceptance → export. Where V2.5.3 has an authority for a step, that authority decides (cx.tech records,
 * cx.accept accepts, issue.report reports); where it has none, the roles are listed with the reason.
 */
import type { PageDef, RoleKey } from './registry.types.js';

const EVERYONE: readonly RoleKey[] = ['visitor', 'employee', 'exec', 'service', 'svcmgr', 'syseng', 'designer', 'installer', 'cxeng', 'ipm', 'bpm', 'ops', 'steward', 'architect', 'qa'];
/** who reads a commissioning dossier: V2.5.3's Assurance and commissioning-record audiences, and the Document Reviewer (ADR-0005) */
export const DOSSIER_READERS: readonly RoleKey[] = ['exec', 'service', 'svcmgr', 'syseng', 'ops', 'architect', 'cxeng', 'installer', 'ipm', 'qa'];
/** who sees an asset's technical record (serial, lifecycle, evidence counts): the same audience without the executive summary reader */
const TECHNICAL: readonly RoleKey[] = ['service', 'svcmgr', 'syseng', 'ops', 'architect', 'cxeng', 'installer', 'ipm', 'qa'];

export const PROOF_PAGES: readonly PageDef[] = [
  {
    id: 'proof', title: 'Proof Center', purpose: 'Every claim about the product, with how far it is verified and what it does not show', product: 'shell',
    path: '/proof', alias: ['/proof/:claim'], authority: { roles: EVERYONE, why: 'v1.8 Proof Center: published claims are public' },
    load: () => import('./proof/ProofCenter.js'),
    search: { keywords: 'proof center claims evidence verified synthetic specified registry trust', aliases: ['proof', 'proof center', 'claims', 'what is real'] },
  },
  {
    id: 'scan', title: 'QR Hub', purpose: 'One identifier opens one passport, with only the actions this role may take', product: 'lite',
    path: '/scan', alias: ['/scan/:id', '/qr-hub', '/qr-hub/:id'], authority: { roles: EVERYONE, why: 'v1.6 QR Hub: anyone may read a label; what it opens depends on the role' },
    sections: [
      { id: 'scan.technical', label: 'Serial, lifecycle and evidence', authority: { roles: TECHNICAL, why: 'v1.6 QR Hub role matrix: the technical record of an asset' } },
      { id: 'scan.acceptance', label: 'Acceptance state', authority: { roles: DOSSIER_READERS, why: 'the readers of the commissioning dossier' } },
    ],
    actions: [
      { id: 'scan.openTest', label: 'Open the tests', authority: { roles: DOSSIER_READERS, why: 'the readers of the commissioning dossier' } },
      { id: 'scan.attach', label: 'Attach evidence', authority: { action: 'cx.tech' } },
      { id: 'scan.issue', label: 'Report a problem', authority: { action: 'issue.report' } },
      { id: 'scan.attest', label: 'Add a local attestation', authority: { roles: ['employee'], why: 'Founder directive of 11 November 2026, §13: a site champion may attest locally and does not replace the approvers. The demonstration has no separate champion role, so the Employee view stands in for the room’s site champion' } },
      { id: 'scan.export', label: 'Export the report', authority: { roles: DOSSIER_READERS, why: 'the readers of the commissioning dossier' } },
    ],
    load: () => import('./proof/QrHub.js'),
    search: { keywords: 'qr hub scan label asset passport identifier sim-av-0042 lookup', aliases: ['qr hub', 'scan', 'scan a label', 'SIM-AV-0042'] },
  },
  {
    id: 'dossier', title: 'Commissioning dossier', purpose: 'Atlas 4.218: every test, its evidence, the deficiencies, and why acceptance is held', product: 'commissioning',
    path: '/dossier', alias: ['/dossier/:id'], authority: { roles: DOSSIER_READERS, why: 'V2.5.3 Assurance and commissioning-record audiences, and the Document Reviewer (ADR-0005)' },
    sections: [{ id: 'dossier.evidence', label: 'Evidence records', authority: { roles: TECHNICAL, why: 'evidence references are engineering detail; the executive reads the totals' } }],
    actions: [
      { id: 'dossier.record', label: 'Record a result or evidence', authority: { action: 'cx.tech' } },
      { id: 'dossier.raise', label: 'Raise a deficiency', authority: { action: 'cx.tech' } },
      { id: 'dossier.verify', label: 'Verify a result', authority: { roles: ['qa', 'svcmgr', 'ops', 'architect'], why: 'independent verification: the Document Reviewer and the roles V2.5.3 lets accept; never the role that recorded the result' } },
      // Final sign-off is phase 6 and takes two approvals in order (founder, 10 November 2026). Until then V2.5.3's cx.accept decided one acceptance.
      { id: 'dossier.accept', label: 'Give the first approval of the final sign-off', authority: { roles: ['svcmgr', 'exec'], why: 'Founder, 10 November 2026: phase 6 is approved first by the Service Manager or the Executive, once everything in commissioning is done' } },
      { id: 'dossier.countersign', label: 'Give the second approval of the final sign-off', authority: { roles: ['ops', 'syseng'], why: 'Founder, 10 November 2026: then by the Operations Lead or the Systems Engineer, an internal role' } },
      { id: 'dossier.waive.business', label: 'Accept a business risk by a documented waiver', authority: { roles: ['exec'], why: 'Founder, 11 November 2026 (02:25): for business-risk acceptance, the appropriately authorised business decision-maker. Here: the Executive. Waiver authority stays separate from the two approvals' } },
      { id: 'dossier.waive.technical', label: 'Waive a technical deviation, subject to engineering review', authority: { roles: ['ops'], why: 'Founder, 11 November 2026 (02:25): an Operations Lead may approve an eligible documented waiver; a technical deviation requires engineering review before it stands' } },
      { id: 'dossier.waive.review', label: 'Give the engineering review of a technical waiver', authority: { roles: ['architect'], why: 'Founder, 11 November 2026 (02:25): technical deviations require appropriate engineering review. Default policy, an assumption: the review comes from an engineering authority outside both approval stages (here the Product Architect), so the Service Manager, Executive, Operations Lead and Systems Engineer stay free to approve; a customer names its own engineering authority' } },
      { id: 'dossier.export', label: 'Export', authority: { roles: DOSSIER_READERS, why: 'a reader may export what they can read' } },
    ],
    load: () => import('./proof/Dossier.js'),
    search: { keywords: 'commissioning dossier executive report acceptance held deficiency evidence export atlas 4.218 sim-report', aliases: ['dossier', 'commissioning dossier', 'executive dossier', 'acceptance'] },
  },
];
