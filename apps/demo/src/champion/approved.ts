/** How many of the site champion's notes a reviewer has approved. The Knowledge Ledger is the one place that knows. */
import type { Workspace } from '../workspace/store.js';
import { isSiteNote } from '../knowledge/ledger.js';
import { allObjects, loadState } from '../knowledge/store.js';

export const approvedSiteNotes = (w: Workspace | null): number => allObjects(loadState(), w).filter((o) => isSiteNote(o.id) && o.zone !== 5 && o.state === 'APPROVED').length;
