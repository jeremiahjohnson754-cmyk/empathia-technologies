/**
 * Documentation & Submission (50/10 master directive §3.1 and §9; V3.9: "Required documentation must be present"; the source workbooks'
 * documentation tracker and sign-off packet, structure only). A mandatory gate between functional verification and acceptance, with its
 * own visibility, approval status and auditable submissions. Shared by the API (migration 0043) and any page that shows the matrix.
 *
 *   matrix      the documents a room requires, from what it contains: always the as-builts, the firmware list, the photographs of the
 *               room, the commissioning report; a rack elevation and a rack photograph where there is a rack; an IP schema where
 *               there is a network switch; a DSP file and its screenshot where there is an audio processor; control code where there
 *               is a control processor; a camera screenshot where there are cameras; a UC screenshot where there is a room computer.
 *   submission  one evidence file per document, versioned; reviewed (approved or rejected) by someone other than its submitter.
 *   signatures  two, dated: the integrator's (vendor) and the owner's (internal), by two different people, over the packet as it
 *               stands. A document approved, rejected or resubmitted after a signature voids it: the packet it signed is gone.
 *
 * The workbook's fifteenth item, the final sign-off PDF, is not a document to upload here: it is the two signatures themselves.
 */

export type DocumentKind = 'as_built_drawings' | 'rack_elevation' | 'ip_schema' | 'dsp_file' | 'control_code' | 'firmware_list' | 'photo_set'
  | 'photo_rack' | 'photo_front_of_room' | 'photo_ceiling' | 'screenshot_dsp' | 'screenshot_camera' | 'screenshot_uc' | 'commissioning_report';

export interface DocumentSpec { kind: DocumentKind; label: string; photo: boolean; needs: string[] | null }
/** needs: the device categories of which the room must have at least one for the document to be required (null = always) */
export const DOCUMENT_SPECS: readonly DocumentSpec[] = [
  { kind: 'as_built_drawings', label: 'As-built drawings', photo: false, needs: null },
  { kind: 'rack_elevation', label: 'Rack elevation', photo: false, needs: ['rack'] },
  { kind: 'ip_schema', label: 'IP schema', photo: false, needs: ['switch'] },
  { kind: 'dsp_file', label: 'Audio processor (DSP) file', photo: false, needs: ['dsp'] },
  { kind: 'control_code', label: 'Control code', photo: false, needs: ['control'] },
  { kind: 'firmware_list', label: 'Firmware list', photo: false, needs: null },
  { kind: 'photo_set', label: 'Photograph set of the room', photo: true, needs: null },
  { kind: 'photo_rack', label: 'Photograph: the rack', photo: true, needs: ['rack'] },
  { kind: 'photo_front_of_room', label: 'Photograph: the front of the room', photo: true, needs: null },
  { kind: 'photo_ceiling', label: 'Photograph: the ceiling devices', photo: true, needs: null },
  { kind: 'screenshot_dsp', label: 'Screenshot: DSP configuration', photo: false, needs: ['dsp'] },
  { kind: 'screenshot_camera', label: 'Screenshot: camera presets', photo: false, needs: ['camera'] },
  { kind: 'screenshot_uc', label: 'Screenshot: UC client', photo: false, needs: ['compute'] },
  { kind: 'commissioning_report', label: 'Commissioning report', photo: false, needs: null },
];
export const DOCUMENT_KINDS: readonly DocumentKind[] = DOCUMENT_SPECS.map((d) => d.kind);

/** The documents a room requires, from the categories of its devices (furniture does not count). */
export function requiredDocuments(categories: readonly string[]): DocumentSpec[] {
  const has = new Set(categories);
  return DOCUMENT_SPECS.filter((d) => !d.needs || d.needs.some((c) => has.has(c)));
}

export type DocumentState = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type SignatureSide = 'VENDOR' | 'INTERNAL';
export const SIGNATURE_SIDES: readonly SignatureSide[] = ['VENDOR', 'INTERNAL'];

/** The documentation fact of the acceptance gate. */
export interface DocumentationFact {
  required: readonly DocumentKind[];
  /** the current state of each required document (absent = never submitted) */
  states: Partial<Record<DocumentKind, DocumentState>>;
  /** which sides have signed the packet as it stands now */
  signed: Partial<Record<SignatureSide, boolean>>;
}

export interface DocumentationStatus { required: number; approved: number; percent: number; missing: DocumentKind[]; waiting: DocumentKind[]; rejected: DocumentKind[]; unsigned: SignatureSide[]; complete: boolean }
export function documentationStatus(f: DocumentationFact): DocumentationStatus {
  const by = (s: DocumentState | undefined) => f.required.filter((k) => f.states[k] === s);
  const approved = by('APPROVED').length;
  const missing = f.required.filter((k) => !f.states[k]); const waiting = by('SUBMITTED'); const rejected = by('REJECTED');
  const unsigned = SIGNATURE_SIDES.filter((s) => !f.signed[s]);
  return { required: f.required.length, approved, percent: f.required.length ? Math.round((approved / f.required.length) * 100) : 100, missing, waiting, rejected, unsigned,
    complete: approved === f.required.length && !unsigned.length };
}

const label = (k: DocumentKind) => DOCUMENT_SPECS.find((d) => d.kind === k)?.label ?? k;
/** Why the documentation holds acceptance — null when it does not. One wording for the API and the pages. */
export function documentationBlocker(f: DocumentationFact): string | null {
  const s = documentationStatus(f); if (s.complete) return null;
  const parts: string[] = [];
  if (s.missing.length) parts.push(`not submitted: ${s.missing.map(label).join(', ')}`);
  if (s.waiting.length) parts.push(`awaiting review: ${s.waiting.map(label).join(', ')}`);
  if (s.rejected.length) parts.push(`rejected, to resubmit: ${s.rejected.map(label).join(', ')}`);
  if (s.unsigned.length) parts.push(`signature outstanding: ${s.unsigned.map((x) => (x === 'VENDOR' ? 'the integrator’s' : 'the owner’s')).join(' and ')}${s.approved < s.required ? ' (signed once every document is approved)' : ''}`);
  return `documentation and submission: ${s.approved} of ${s.required} required documents approved (${s.percent}%) — ${parts.join('; ')}`;
}

/** Why a signature may not be given now (empty = it may): every required document approved, and the other side not signed by the same person. */
export function signatureBlockers(f: DocumentationFact, side: SignatureSide, person: string, otherSigner: string | null): string[] {
  const s = documentationStatus(f); const why: string[] = [];
  if (s.approved < s.required) why.push(`the packet is signed once every required document is approved (${s.approved} of ${s.required})`);
  if (f.signed[side]) why.push(`the ${side === 'VENDOR' ? 'integrator’s' : 'owner’s'} signature is on the packet already`);
  if (otherSigner && otherSigner === person) why.push('the two signatures are by two different people');
  return why;
}
