/**
 * Status vocabulary shared by every Empathia surface. Each status has a text label and a glyph, so a status is never carried by colour
 * alone (WCAG 1.4.1). Tone names map to CSS classes in ui.css, which map to design tokens.
 */
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent';
export interface StatusSpec { label: string; glyph: string; tone: Tone; help: string }

/** Commissioning result labels. There is no bare PASS: a pass is either independently verified or awaiting verification. */
export const RESULT: Record<string, StatusSpec> = {
  PASS_VERIFIED: { label: 'Passed, verified', glyph: '✓✓', tone: 'ok', help: 'Recorded PASS with evidence, independently verified by a different person' },
  PASS_UNVERIFIED: { label: 'Passed, awaiting verification', glyph: '✓', tone: 'info', help: 'Recorded PASS with evidence; a different person must still verify it' },
  FAIL: { label: 'Failed', glyph: '✕', tone: 'bad', help: 'Recorded FAIL; a commissioning deficiency is open until a verified retest' },
  NOT_SUPPORTED: { label: 'Not supported', glyph: '⊘', tone: 'warn', help: 'The installed equipment cannot perform this test' },
  INCONCLUSIVE: { label: 'Inconclusive', glyph: '?', tone: 'warn', help: 'The test ran but its outcome could not be determined' },
  NOT_TESTED: { label: 'Not tested', glyph: '○', tone: 'muted', help: 'No result recorded' },
};

export const LIFECYCLE: Record<string, StatusSpec> = {
  PLANNED: { label: 'Planned', glyph: '◇', tone: 'muted', help: 'A design; nothing installed, nothing commissioned' },
  DESIGN_APPROVED: { label: 'Design approved', glyph: '◆', tone: 'info', help: 'An engineer approved the classification and a saved revision' },
  INSTALLATION_PENDING: { label: 'Installation pending', glyph: '▷', tone: 'info', help: 'Installation window approved' },
  INSTALLED_UNVERIFIED: { label: 'Installed, unverified', glyph: '▶', tone: 'warn', help: 'Installed; no commissioning evidence yet' },
  COMMISSIONING: { label: 'Commissioning', glyph: '⚙', tone: 'accent', help: 'Field results are being recorded and verified' },
  ACCEPTED: { label: 'Accepted', glyph: '✓', tone: 'ok', help: 'Every applicable test passed and was independently verified; signed baseline' },
  OPERATIONAL: { label: 'Operational', glyph: '●', tone: 'ok', help: 'Accepted and under live monitoring' },
};

export const SEVERITY: Record<string, StatusSpec> = {
  Critical: { label: 'Critical', glyph: '▲▲', tone: 'bad', help: 'Blocks design approval and acceptance' },
  High: { label: 'High', glyph: '▲', tone: 'bad', help: 'Blocks design approval and acceptance' },
  Medium: { label: 'Medium', glyph: '■', tone: 'warn', help: 'Does not block design approval; must be closed before acceptance' },
  Low: { label: 'Low', glyph: '·', tone: 'muted', help: 'Advisory' },
};

/** Integration maturity. A catalogued integration is never presented as connected unless VERIFIED. */
export const INTEGRATION: Record<string, StatusSpec> = {
  VERIFIED: { label: 'Verified', glyph: '✓', tone: 'ok', help: 'A working adapter tested against an authorized environment' },
  MOCK: { label: 'Mock', glyph: '◌', tone: 'info', help: 'A local mock answers; no real system is contacted' },
  CONTRACT_ONLY: { label: 'Contract only', glyph: '▭', tone: 'muted', help: 'An interface contract exists; no adapter, no connection, no partnership' },
  NOT_CONFIGURED: { label: 'Not configured', glyph: '–', tone: 'muted', help: 'No credentials or endpoint configured' },
};

export const LIVE: Record<string, StatusSpec> = {
  NOT_MONITORED: { label: 'Not monitored', glyph: '–', tone: 'muted', help: 'No live monitoring evidence: health is unknown, not good' },
};

export const statusOf = (table: Record<string, StatusSpec>, key: string | null | undefined): StatusSpec =>
  (key && table[key]) || { label: String(key ?? 'Unknown').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), glyph: '·', tone: 'muted', help: '' };
