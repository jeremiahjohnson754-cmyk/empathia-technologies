/**
 * The programme records of the demonstration: the two requests, their projects, the governance decisions and the funding. One source —
 * Mission Control's stations (pages/Control.tsx › assemble) and the room page's delivery spine (campus/metrics.ts) both read these.
 * Times are relative to the moment the page opens, as Mission Control always had them. Synthetic.
 */
const DAY = 864e5;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();

export interface ProgrammeProject { id: string; governance: string; delivery: string; updatedAt: string; requestId: string; roomIds: string[]; history: Array<{ to: string; at: string }> }
export interface ProgrammeRequest { id: string; projectId: string; submittedAt: string; title: string }
export interface ProgrammeDecision { projectId: string; decision: 'APPROVED' | 'HELD' | 'REJECTED'; scopeRev: number; at: string }
export interface ProgrammeFunding { projectId: string; kind: 'AUTHORIZED'; amount: number; currency: 'USD'; at: string }

export function programme() {
  const projects: ProgrammeProject[] = [
    { id: 'PRJ-ATLAS-AV', governance: 'FUNDED', delivery: 'FIELD_ACTIVE', updatedAt: ago(6), requestId: 'REQ-0031', roomIds: ['R-ATL-4-218'], history: [{ to: 'ENGINEERING_REVIEW', at: ago(60) }, { to: 'FIELD_ACTIVE', at: ago(12) }] },
    { id: 'PRJ-NST-TH', governance: 'APPROVED', delivery: 'DESIGN_DRAFT', updatedAt: ago(2), requestId: 'REQ-0034', roomIds: ['R-NST-2-101'], history: [{ to: 'ENGINEERING_REVIEW', at: ago(9) }] },
  ];
  const requests: ProgrammeRequest[] = [
    { id: 'REQ-0031', projectId: 'PRJ-ATLAS-AV', submittedAt: ago(80), title: 'Refresh the Atlas executive boardroom for hybrid meetings' },
    { id: 'REQ-0034', projectId: 'PRJ-NST-TH', submittedAt: ago(25), title: 'Northstar town hall: company meetings to every site' },
  ];
  const decisions: ProgrammeDecision[] = [
    { projectId: 'PRJ-ATLAS-AV', decision: 'APPROVED', scopeRev: 1, at: ago(70) },
    { projectId: 'PRJ-NST-TH', decision: 'HELD', scopeRev: 1, at: ago(20) },
    { projectId: 'PRJ-NST-TH', decision: 'APPROVED', scopeRev: 2, at: ago(10) },
  ];
  const funding: ProgrammeFunding[] = [{ projectId: 'PRJ-ATLAS-AV', kind: 'AUTHORIZED', amount: 184000, currency: 'USD', at: ago(65) }];
  return { projects, requests, decisions, funding };
}
