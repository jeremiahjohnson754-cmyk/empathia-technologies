/**
 * Data reports as PDF only (founder, 18 Nov 2026, 07:49: "just like the commissioning report documentation lets make exportable reports
 * pdf only for data reports have this role protected and secured"; task #209). The server is the authority: the figures are the KPI
 * summary (domain/analytics.ts) read as the caller under their own site scope, rendered to a PDF here, never sent anywhere. Who may export:
 * the people who answer for the estate's figures (EXPORT). Every export, and every refusal, is an audit event; the PDF names the reader,
 * the organization, the scope, the time, the definition of each figure and the SHA-256 of the figures it was drawn from, which the
 * response repeats in a header so a reader can match a copy to its audit event.
 */
import crypto from 'node:crypto';
import type { RequestContext } from '../auth/context.js';
import { summary } from '../domain/analytics.js';
import { renderPdf, type Block } from './pdf.js';

/** the executive, the operations lead, the service manager, the security administrator */
export const EXPORT = ['project.decide', 'handoff.accept', 'service.assign', 'policy.configure'];
const pct = (v: unknown) => (typeof v === 'number' ? `${Math.round(v * 1000) / 10}%` : 'not computable (no records)');
const words = (s: string) => s.replace(/_/g, ' ').toLowerCase();
type Ratio = { value: number | null; definition: string };

/** canonical JSON (sorted keys): the hash is of the figures, not of their order */
export function canonical(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(x);
}

export async function estatePdf(ctx: RequestContext, now = new Date()) {
  await ctx.require(EXPORT, 'export a data report', { type: 'Report', id: 'estate-summary' });
  const s = await summary(ctx) as Awaited<ReturnType<typeof summary>>;
  const sha = crypto.createHash('sha256').update(canonical(s)).digest('hex');
  const c = s.commissioning; const i = s.issues; const a = s.assets; const inst = a.installations;
  const blocks: Block[] = [
    { kind: 'title', text: 'Estate data report' },
    { kind: 'kv', rows: [['Organization', ctx.p.tenantSlug], ['Read by', `${ctx.p.name} (${ctx.p.role})`], ['Scope', s.scope === 'tenant' ? 'every site of the organization' : 'the sites this reader is scoped to'], ['Generated', now.toISOString()], ['Figures SHA-256', sha]] },
    { kind: 'p', muted: true, text: 'Every figure is a count of this organization’s records at the time above, read with the reader’s own permissions. Operational performance is not monitored and is not reported. A ratio with no records under it is said to be not computable, never shown as zero.' },
    { kind: 'h', text: 'Rooms by lifecycle' },
    { kind: 'table', cols: [{ label: 'Lifecycle', w: 3 }, { label: 'Rooms', w: 1, right: true }], rows: [...Object.entries(s.rooms.byLifecycle).map(([k, n]) => [words(k), String(n)]), ['total', String(s.rooms.total)]] },
    { kind: 'h', text: 'Commissioning' },
    { kind: 'table', cols: [{ label: 'Current result (latest plan of each room)', w: 3 }, { label: 'Tests', w: 1, right: true }], rows: [...Object.entries(c.byLabel).sort().map(([k, n]) => [words(k), String(n)]), ['applicable tests', String(c.applicableTests)]] },
    { kind: 'table', cols: [{ label: 'Measure', w: 1.3 }, { label: 'Value', w: 0.8, right: true }, { label: 'Definition', w: 3 }], rows: ([['Coverage', c.coverage], ['Verified share of passes', c.verifiedShare], ['Current fail rate', c.firstTimeFailRate]] as Array<[string, Ratio]>).map(([k, r]) => [k, pct(r.value), r.definition]) },
    { kind: 'p', text: `Results recorded on a unit that has since been replaced or substituted: ${c.superseded.results} (of which ${c.superseded.passVerifiedNotCounting} verified passes that no longer count towards acceptance).` },
    { kind: 'h', text: 'Issues and work orders' },
    { kind: 'kv', rows: [['Open issues', String(i.open)], ['Open, high or critical', String(i.openHighOrCritical)], ['Deficiencies resolved', String(i.deficienciesResolved)], ['Mean hours to resolve a deficiency', i.meanHoursToResolveDeficiency == null ? 'not computable (none resolved)' : String(i.meanHoursToResolveDeficiency)]] },
    { kind: 'table', cols: [{ label: 'Category', w: 2.4 }, { label: 'Severity', w: 1 }, { label: 'State', w: 1.2 }, { label: 'Issues', w: 0.8, right: true }], rows: (i.byCategorySeverityState as Array<{ category: string; severity: string; state: string; n: number }>).map((r) => [words(r.category), r.severity, words(r.state), String(r.n)]) },
    { kind: 'table', cols: [{ label: 'Work order state', w: 3 }, { label: 'Work orders', w: 1, right: true }], rows: Object.entries(s.workOrders).map(([k, n]) => [words(k), String(n)]) },
    { kind: 'h', text: 'Devices and evidence' },
    { kind: 'kv', rows: [['Planned devices', String(a.planned)], ['Distinct models', String(a.distinctModels)], ['Still on a generic model', `${a.genericModels} (${pct(a.genericShare.value)})`], ['Installed units', `${inst.installed} of ${inst.positions} positions`],
      ['Units with a recorded identity', pct(inst.identityKnownShare.value)], ['Identity: unknown / declared / observed / verified', `${inst.byIdentity.UNKNOWN} / ${inst.byIdentity.DECLARED} / ${inst.byIdentity.OBSERVED} / ${inst.byIdentity.VERIFIED}`], ['Evidence objects cited by results', `${s.evidence.objects} (${s.evidence.bytes} bytes)`]] },
    { kind: 'p', muted: true, text: `${s.note} Exported as PDF only, by the server, after checking the reader’s authority; the export is recorded in the audit history with the hash above.` },
  ];
  const out = renderPdf({ title: 'Estate data report', author: ctx.p.name, subject: `Empathia estate data report for ${ctx.p.tenantSlug}`, createdAt: now, footer: `Empathia · estate data report · ${ctx.p.tenantSlug} · ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC · figures ${sha.slice(0, 12)}`, blocks });
  const fileSha = crypto.createHash('sha256').update(out.pdf).digest('hex');
  await ctx.audit(null, 'report.export', 'ALLOWED', { type: 'Report', id: 'estate-summary' }, { format: 'pdf', figuresSha256: sha, fileSha256: fileSha, pages: out.pages, bytes: out.pdf.length, substituted: out.substituted, scope: s.scope });
  return { pdf: out.pdf, figuresSha256: sha, fileSha256: fileSha, fileName: `empathia-estate-report-${ctx.p.tenantSlug}-${now.toISOString().slice(0, 10)}.pdf` };
}
