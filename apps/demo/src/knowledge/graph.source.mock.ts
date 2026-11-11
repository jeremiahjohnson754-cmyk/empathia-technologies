/**
 * A deterministic mock of the three Microsoft Graph calls graph.source.ts makes, for tests only. No page imports this file.
 *
 * It answers in the shapes the pages show (FIXTURES quotes the pages' own examples, read on 2026-11-11), and it takes the less
 * convenient reading wherever a page leaves room, so the source is tested against the harder case:
 *   - delta items carry `parentReference` with an id and NO path, as the page says;
 *   - renaming a folder reports the folder only, never its descendants, as the page says;
 *   - a deleted item carries the `deleted` facet and no name (the page's table for OneDrive for Business and SharePoint);
 *   - a change of permissions alone is NOT reported in the delta (the page describes it only with a header this source does not send);
 *   - `inheritedFrom` is never returned (the permission page says SharePoint libraries do not return it).
 * ASSUMPTIONS of the mock, none taken from a page: the form of its tokens and links, its page size, the host of its download
 * address, and that an expired token answers 410 with `resyncChangesApplyDifferences`.
 */
import { GRAPH_BASE, type HttpResponse } from '../connect/graph.js';
import type { SourceState } from './ingest.js';
import type { DocRequest, DocTransport } from './graph.source.js';

export interface Fixture { source: string; read: string; body: unknown }
/** The pages' own examples, verbatim. */
export const FIXTURES: Readonly<Record<'delta' | 'permissions', Fixture>> = {
  delta: { source: 'https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0', read: '2026-11-11', body: {
    value: [{ id: '0123456789abc', name: 'folder2', folder: {} }, { id: '123010204abac', name: 'file.txt', file: {} }, { id: '2353010204ddgg', name: 'file5.txt', deleted: {} }],
    '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/delta(token=1230919asd190410jlka)' } },
  permissions: { source: 'https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions?view=graph-rest-1.0', read: '2026-11-11', body: { value: [
    { id: '1', roles: ['write'], link: { webUrl: 'https://onedrive.live.com/redir?resid=5D33DD65C6932946!70859&authkey=!AL7N1QAfSWcjNU8&ithint=folder%2cgif', type: 'edit' } },
    { id: '2', '@deprecated.GrantedTo': 'GrantedTo has been deprecated. Refer to GrantedToV2', roles: ['write'], grantedTo: { user: { id: '5D33DD65C6932946', displayName: 'Robin Danielsen' } },
      grantedToV2: { user: { id: '5D33DD65C6932946', displayName: 'Robin Danielsen' }, siteUser: { id: '1', displayName: 'Robin Danielsen', loginName: 'Robin Danielsen' } },
      inheritedFrom: { driveId: '1234567890ABD', id: '1234567890ABC!123', path: '/drive/root:/Documents' } },
    { id: '3', roles: ['write'], link: { webUrl: 'https://onedrive.live.com/redir?resid=5D33DD65C6932946!70859&authkey=!AL7N1QAfSWcjNU8&ithint=folder%2cgif', type: 'edit', application: { id: '12345', displayName: 'Contoso Time Manager' } } },
  ] } },
};

export interface MockItem { id: string; name: string; parent: string | null; folder: boolean; text: string; bytes: number; modified: string; perms: unknown[]; malware?: true; root?: true; /** the download answers with something that is not text */ binary?: true }
export interface MockDrive {
  siteId: string; items: Record<string, MockItem>; log: Array<{ seq: number; id: string; deleted?: true }>; seq: number; pageSize: number;
  /** tokens older than this are gone: the service answers 410 */ expireBefore: number; /** answers to give before the next real one: a number is 429 with that Retry-After, null is 429 without the header, an object is that answer */ script: Array<number | null | HttpResponse>;
  /** every request received, in order */ requests: DocRequest[]; /** an Authorization header reached the download address, or a download was not marked anonymous */ violations: string[];
  /** make the next page of the delta point somewhere else */ poison?: 'next' | 'delta' | 'location' | 'download';
  /** repeat every changed item earlier in the same answer with stale values */ duplicates?: true;
}
const ROOT = 'root-0';
const DL = 'https://downloads.sharepoint.example/dl/';
const day = (seq: number) => new Date(Date.UTC(2026, 9, 1) + seq * 864e5).toISOString();
export const groupPerm = (id: string, role = 'read') => ({ id: `p-${id}`, roles: [role], grantedToV2: { group: { id, displayName: id } } });
export const userPerm = (id: string, role = 'read') => ({ id: `p-${id}`, roles: [role], grantedToV2: { user: { id, displayName: id }, siteUser: { id: '7', displayName: id, loginName: id } } });
export const siteGroupPerm = (name: string) => ({ id: `p-sg-${name}`, roles: ['read'], grantedToV2: { siteGroup: { id: '5', displayName: name, loginName: name } } });
export const linkPerm = () => ({ id: 'p-link', roles: ['read'], link: { type: 'view', webUrl: 'https://contoso.sharepoint.example/:t:/s/x' } });

export function emptyDrive(siteId = 'contoso.sharepoint.example,site-1,web-1'): MockDrive {
  return { siteId, items: { [ROOT]: { id: ROOT, name: 'root', parent: null, folder: true, text: '', bytes: 0, modified: day(0), perms: [], root: true } }, log: [{ seq: 0, id: ROOT }], seq: 0, pageSize: 3, expireBefore: 0, script: [], requests: [], violations: [] };
}
const touch = (d: MockDrive, id: string, deleted = false) => { d.seq++; d.log.push({ seq: d.seq, id, ...(deleted ? { deleted: true as const } : {}) }); if (!deleted && d.items[id]) d.items[id]!.modified = day(d.seq); };
export function addFolder(d: MockDrive, id: string, name: string, parent: string = ROOT) { d.items[id] = { id, name, parent, folder: true, text: '', bytes: 0, modified: '', perms: [] }; touch(d, id); }
export function addFile(d: MockDrive, id: string, name: string, parent: string, text: string, perms: unknown[], extra: Partial<Pick<MockItem, 'bytes' | 'malware' | 'binary'>> = {}) { d.items[id] = { id, name, parent, folder: false, text, bytes: extra.bytes ?? text.length, modified: '', perms, ...(extra.malware ? { malware: true as const } : {}), ...(extra.binary ? { binary: true as const } : {}) }; touch(d, id); }
/** Renaming or moving: the item itself is reported; for a folder, none of its descendants are. */
export function rename(d: MockDrive, id: string, name: string, parent?: string) { const it = d.items[id]; if (!it) return; it.name = name; if (parent) it.parent = parent; touch(d, id); }
export function update(d: MockDrive, id: string, text: string) { const it = d.items[id]; if (!it) return; it.text = text; it.bytes = text.length; touch(d, id); }
export function remove(d: MockDrive, id: string) { if (!d.items[id]) return; for (const k of Object.values(d.items).filter((x) => x.parent === id).map((x) => x.id)) remove(d, k); delete d.items[id]; touch(d, id, true); }
/** A change of permissions alone: nothing is added to the change log. */
export function setPerms(d: MockDrive, id: string, perms: unknown[]) { const it = d.items[id]; if (it) it.perms = perms; }

/** The same library the simulated source holds, as a drive: folders from the paths, a directory-group permission for each group. */
export function driveFromSource(src: SourceState): MockDrive {
  const d = emptyDrive(); const folders = new Map<string, string>();
  for (const doc of Object.values(src.docs)) {
    const parts = doc.path.split('/').filter(Boolean); let parent = ROOT; let at = '';
    for (const p of parts.slice(0, -1)) { at += `/${p}`; if (!folders.has(at)) { const id = `f-${folders.size + 1}`; addFolder(d, id, p, parent); folders.set(at, id); } parent = folders.get(at)!; }
    addFile(d, doc.id, parts[parts.length - 1]!, parent, doc.text, doc.groups.map((g) => groupPerm(g)), { bytes: doc.bytes, ...(doc.malformed ? { binary: true as const } : {}) });
  }
  return d;
}
export const folderId = (d: MockDrive, name: string): string | null => Object.values(d.items).find((x) => x.folder && x.name === name)?.id || null;

const asItem = (it: MockItem) => ({ id: it.id, name: it.name, eTag: `"{${it.id}},${it.modified}"`, size: it.bytes, lastModifiedDateTime: it.modified, ...(it.root ? { root: {} } : {}), ...(it.parent ? { parentReference: { driveId: 'b!mock', id: it.parent } } : {}), ...(it.folder ? { folder: { childCount: 0 } } : { file: { mimeType: 'text/plain' } }), ...(it.malware ? { malware: { description: 'mock' } } : {}) });
const json = (status: number, body: unknown, headers: Record<string, string> = {}): HttpResponse => ({ status, headers: { 'Content-Type': 'application/json', ...headers }, body });

export function driveTransport(d: MockDrive): DocTransport {
  const base = `${GRAPH_BASE}/sites/${encodeURIComponent(d.siteId)}/drive`;
  return async (req) => {
    d.requests.push(req);
    const auth = Object.keys(req.headers).some((h) => h.toLowerCase() === 'authorization');
    if (req.url.startsWith(DL)) {
      if (!req.anonymous) d.violations.push(`download not marked anonymous: ${req.url}`); if (auth) d.violations.push(`Authorization sent to the download address: ${req.url}`);
      const it = d.items[decodeURIComponent(req.url.slice(DL.length).split('?')[0]!)]; if (!it || it.folder) return json(404, { error: { code: 'itemNotFound', message: 'mock' } });
      return { status: 200, headers: { 'Content-Type': 'text/plain' }, body: it.binary ? { bytes: 'not text' } : it.text };
    }
    if (req.anonymous) d.violations.push(`anonymous request to Microsoft Graph: ${req.url}`);
    const s = d.script.shift(); if (s !== undefined) return typeof s === 'number' ? json(429, { error: { code: 'TooManyRequests', message: 'mock' } }, { 'Retry-After': String(s) }) : s === null ? json(429, { error: { code: 'TooManyRequests', message: 'mock' } }) : s;
    if (!req.url.startsWith(`${base}/`)) return json(404, { error: { code: 'itemNotFound', message: 'mock: not this site' } });
    const rest = req.url.slice(base.length);
    const perm = /^\/items\/([^/]+)\/permissions$/.exec(rest); if (perm) { const it = d.items[decodeURIComponent(perm[1]!)]; return it ? json(200, { value: it.perms }) : json(404, { error: { code: 'itemNotFound', message: 'mock' } }); }
    const content = /^\/items\/([^/]+)\/content$/.exec(rest); if (content) { const it = d.items[decodeURIComponent(content[1]!)]; if (!it || it.folder) return json(404, { error: { code: 'itemNotFound', message: 'mock' } });
      return { status: 302, headers: { Location: d.poison === 'download' ? `http://downloads.sharepoint.example/dl/${it.id}` : `${DL}${encodeURIComponent(it.id)}?tempauth=mock` }, body: null }; }
    const delta = /^\/root\/delta(?:\?(.*))?$/.exec(rest); if (!delta) return json(400, { error: { code: 'BadRequest', message: 'mock' } });
    const q = new URLSearchParams(delta[1] || ''); const token = q.get('token'); const skip = Number(q.get('mockskip') || 0);
    const from = token === null ? -1 : /^s\d+$/.test(token) ? Number(token.slice(1)) : NaN;
    if (Number.isNaN(from) || from > d.seq) return json(400, { error: { code: 'invalidRequest', message: 'mock: unknown token' } });
    if (from >= 0 && from < d.expireBefore) return json(410, { error: { code: 'resyncChangesApplyDifferences', message: 'mock: the token is gone' } }, { Location: d.poison === 'location' ? 'https://graph.example.net/v1.0/fresh' : `${base}/root/delta` });
    const all: Array<Record<string, unknown>> = from < 0
      ? [d.items[ROOT]!, ...Object.values(d.items).filter((x) => x.folder && !x.root), ...Object.values(d.items).filter((x) => !x.folder)].map(asItem)
      : [...new Set(d.log.filter((e) => e.seq > from).map((e) => e.id))].flatMap((id): Array<Record<string, unknown>> => { const it = d.items[id]; if (!it) return [{ id, deleted: { state: 'deleted' } }];
        const now = asItem(it); return d.duplicates ? [{ ...now, name: `stale-${it.name}`, size: 1 }, now] : [now]; });
    const page = all.slice(skip, skip + d.pageSize); const more = skip + d.pageSize < all.length; const upto = q.get('mockupto') ? Number(q.get('mockupto')) : d.seq;
    const next = d.poison === 'next' ? 'https://graph.example.net/v1.0/next' : `${base}/root/delta?${token === null ? '' : `token=${token}&`}mockskip=${skip + d.pageSize}&mockupto=${upto}`;
    const done = d.poison === 'delta' ? 'https://graph.example.net/v1.0/delta' : `${base}/root/delta?token=s${upto}`;
    return json(200, { '@odata.context': `${GRAPH_BASE}/$metadata#Collection(driveItem)`, value: page, ...(more ? { '@odata.nextLink': next } : { '@odata.deltaLink': done }) });
  };
}
