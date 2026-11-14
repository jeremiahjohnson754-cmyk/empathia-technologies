/**
 * What the commissioning package adds from this browser for one room: the documentation tracker (only the dossier's room has one), the
 * field captures synchronised into it, the photographs this device still holds for those captures (a capture's photograph stays on the
 * device that took it; the record keeps its fingerprint), and the address links start from. Read only; nothing is written.
 */
import { readDocs, loadCaptures } from '../docs5/store.js';
import { listDrafts } from '../docs5/drafts.js';
import { TRACKED_ROOM, TRACKED_REPORT } from '../docs5/model.js';
import { dataUrlBytes, imageSize } from './media.js';
import type { CxExtras } from './cx.js';

export async function cxExtras(roomId: string): Promise<CxExtras> {
  const baseUrl = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`;
  if (roomId !== TRACKED_ROOM) return { baseUrl };
  const docs = readDocs(); const captures = loadCaptures(); const synced = new Map(captures.map((c) => [c.key, c]));
  const drafts = await listDrafts().catch(() => []);
  const photos = drafts.filter((d) => d.image && synced.has(d.key) && synced.get(d.key)!.photo).map((d) => { const b = dataUrlBytes(d.image!); if (!b) return null; const z = imageSize(b.bytes); const c = synced.get(d.key)!;
    return { key: d.key, name: c.photo!.name, mime: b.mime, bytes: b.bytes, width: z.width, height: z.height, note: c.note, target: `${c.target.kind === 'doc' ? 'document' : 'check'} ${c.target.id}`, at: c.at, by: c.by.label }; }).filter((x): x is NonNullable<typeof x> => !!x);
  return { docs, report: TRACKED_REPORT, captures, photos, baseUrl };
}
