/**
 * Assurance vocabulary, copied unchanged from the 2.5.4 demonstrator (src/28-static-assure.js lines 6–92 and
 * src/57-derive-assure.js lines 8–10, commit b8986d1). Assurance asks one question, continuously: is the environment still
 * behaving the way it was designed and commissioned to behave? It compares four states (designed, commissioned, current, proposed)
 * across seven layers and seventeen dimensions and names nine kinds of drift.
 */
export const ASSURE_THESIS = 'Is the environment still behaving the way it was designed and commissioned to behave?';

export type Status = 'match' | 'drift' | 'fail' | 'na' | 'unknown' | 'observed';
/** A finding is a dimension that is off its baseline: drift or fail (`OFF` in the demonstrator). */
export const isOff = (s: Status): boolean => s === 'drift' || s === 'fail';
export const STATUS_TEXT: Record<Status, string> = { match: 'Matches baseline', drift: 'Drift', fail: 'Failed', na: 'Not in this room', unknown: 'Not assessed', observed: 'Reported by people' };
export const STATUS_TONE: Record<Status, 'ok' | 'warn' | 'bad' | 'mute' | 'info'> = { match: 'ok', drift: 'warn', fail: 'bad', na: 'mute', unknown: 'mute', observed: 'info' };

/** How a row's current value is known. UNKNOWN means nothing was measured or reported: Assurance does not guess. */
export type EvidenceClass = 'MEASURED' | 'INFERRED' | 'OBSERVED' | 'UNKNOWN';

export const LAYERS = [
  ['physical', 'Physical', 'What is installed, and whether it is there'], ['spatial', 'Spatial', 'Where things are, and what the room is used for'], ['infrastructure', 'Infrastructure', 'Network and power the room depends on'],
  ['configuration', 'Configuration', 'Firmware and settings'], ['functional', 'Functional', 'Whether each system does its job'], ['operational', 'Operational', 'Booking and records'], ['experience', 'Experience', 'What the room is like to use'],
] as const;
export type Layer = (typeof LAYERS)[number][0];

export const DIMENSIONS = [
  ['presence', 'Device presence', 'physical', 'Every commissioned device is installed and answering'],
  ['network', 'Network', 'infrastructure', 'The path from each device to the floor switch and beyond'],
  ['power', 'Power', 'infrastructure', 'The supply the room runs from, and whether it is protected'],
  ['firmware', 'Firmware', 'configuration', 'Each device against the validated firmware baseline'],
  ['configuration', 'Configuration', 'configuration', 'Settings against the commissioned configuration signature'],
  ['signal', 'Signal path', 'functional', 'Source to switcher to display, and microphone to processor to loudspeaker'],
  ['application', 'Application', 'functional', 'The meeting application on the room computer'],
  ['camera', 'Camera', 'functional', 'Presets and seat coverage against what was commissioned'],
  ['audio', 'Audio', 'functional', 'Microphone capture and loudspeaker coverage against what was commissioned'],
  ['display', 'Display', 'functional', 'Displays, their inputs and their brightness'],
  ['control', 'Control', 'functional', 'The touch controller and the room program'],
  ['scheduling', 'Scheduling', 'operational', 'The panel at the door and the booking it shows'],
  ['documentation', 'Documentation', 'operational', 'Whether the records still describe the room'],
  ['spatial', 'Spatial layout', 'spatial', 'Furniture and devices against the commissioning seat map'],
  ['purpose', 'Room purpose', 'spatial', 'How the room is used against what its technology was designed to support'],
  ['environment', 'Environment', 'physical', 'Temperature, air and background noise'],
  ['experience', 'User experience readiness', 'experience', 'What the people who use the room report'],
] as const;
export type Dimension = (typeof DIMENSIONS)[number][0];

export const DRIFT_TYPES = [
  ['CONFIGURATION', 'Configuration drift', 'A setting no longer matches what was commissioned', 'Restore the commissioned value, or recommission with the new one'],
  ['FIRMWARE', 'Firmware drift', 'A device runs a version other than the validated baseline', 'Validate the version and recommission, or return to the baseline'],
  ['DEVICE', 'Device drift', 'A device is missing, offline, or not the one that was commissioned', 'Restore or replace the device, then check its functions'],
  ['PERFORMANCE', 'Performance drift', 'A device still works, more slowly or less reliably than at handover', 'Inspect it; have a replacement evaluated if it continues'],
  ['NETWORK', 'Network drift', 'The path to the room is less stable or differs from the record', 'Raise it with the network team and check again'],
  ['DOCUMENTATION', 'Documentation drift', 'The record no longer describes the room', 'Correct the record, with a person validating it'],
  ['SPATIAL', 'Spatial drift', 'Furniture or devices are not where the seat map shows them', 'Restore the commissioned layout, or recommission the new one'],
  ['PURPOSE', 'Purpose drift', 'The room is used beyond what its technology was designed to support', 'Model the new use in Lite; redesign or restore the intended use'],
  ['DEPENDENCY', 'Dependency drift', 'Something the room depends on changed and the room was not checked again', 'Run the checks the change affects'],
] as const;
export type DriftType = (typeof DRIFT_TYPES)[number][0];

/** What people can report. Each is OBSERVED evidence and names the measurement that would confirm it: [key, label, dimension, confirmation]. */
export const EXPERIENCE_KINDS = [
  ['hear', 'Hard to hear', 'audio', 'A speech-intelligibility measurement at the seat'], ['framing', 'Camera framing poor', 'camera', 'The preset table read from the camera'], ['warm', 'Room too warm', 'environment', 'The temperature reading over a full session'],
  ['start', 'Meeting hard to start', 'application', 'The start-up time and the join log of the room computer'], ['see', 'Display hard to see', 'display', 'Display brightness and the viewing distance from the seat'], ['crowded', 'Room too crowded', 'purpose', 'A seat count against the designed capacity'],
] as const;
export type ExperienceKind = (typeof EXPERIENCE_KINDS)[number][0];

/** Remedies, mildest first: [key, label, tone, what it means]. */
export const REMEDY_CLASSES = [
  ['recommission', 'Recommissioning only', 'info', 'Settings drifted. Restore or accept them, run the affected checks, record a new baseline.'],
  ['minor', 'Minor remediation', 'warn', 'Something failed or is offline. A visit, a fix and a functional check.'],
  ['replace', 'Replacement', 'warn', 'A device is degrading, past support or failing repeatedly.'],
  ['redesign', 'Redesign', 'bad', 'The layout or the use of the room has moved beyond what the technology covers.'],
] as const;
export type Remedy = (typeof REMEDY_CLASSES)[number][0];

/** The seven steps of recommissioning a room (a new baseline never overwrites the old one: it is archived). */
export const RECOMMISSION_STEPS = ['Select scope', 'Run affected commissioning checks', 'Review exceptions', 'Engineer approves', 'Archive previous baseline', 'Create new baseline', 'Create lifecycle event'] as const;

export const dimension = (k: Dimension) => DIMENSIONS.find((d) => d[0] === k)!;
export const driftType = (k: DriftType) => DRIFT_TYPES.find((d) => d[0] === k)!;
