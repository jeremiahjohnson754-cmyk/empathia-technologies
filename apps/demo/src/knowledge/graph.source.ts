/**
 * A Microsoft Graph document source for governed ingestion: one SharePoint site's document library, read through the same engine as
 * the simulated library (ingest.ts › applyDelta).
 *
 * STATUS: MOCK-TESTED. Written to the request and response shapes published on learn.microsoft.com, each read on 2026-11-11
 * (GRAPH_DOC_CALLS carries the page for every call). It has never been run against a Microsoft 365 tenant: there is no tenant, no
 * test account and no credential in this demonstration. No page of the demonstration imports this file; `ingest.ts › connected()`
 * stays empty. This file makes no network call of its own: every request goes through a transport the caller supplies, and the only
 * transport that exists is the deterministic mock in graph.source.mock.ts.
 *
 * What the pages say, and what this file does about it:
 *   - driveItem: delta. "The parentReference property on items won't include a value for path … renaming a folder doesn't result in
 *     any descendants of the folder being returned from delta. When using delta you should always track items by id." So this source
 *     keeps the tree of ids it has seen, and builds every path from it; a renamed folder moves its files here although the service
 *     reported none of them.
 *   - "The same item may appear more than once in a delta feed … You should use the last occurrence you see." Done in order.
 *   - "Deleted items are returned with the deleted facet. Items with this property set should be removed from your local state."
 *   - 410 Gone carries "a Location header containing a new nextLink that starts a fresh delta enumeration from scratch". This source
 *     only reads, so both documented resync codes mean the same here: take the service's version, and drop what it no longer has.
 *   - Throttling: "Wait the number of seconds specified in the Retry-After header. Retry the request." Without the header, "an
 *     exponential backoff retry policy". The SAME request is retried; after `maxAttempts` nothing is changed.
 *   - Download: /content "Returns a 302 Found response redirecting to a preauthenticated download URL … You don't need to include an
 *     Authorization header when you access the download URL." The follow-up request is marked `anonymous` so a transport never
 *     sends the tenant's token to it.
 *
 * Decisions that are this file's own, each fail-closed:
 *   - Who may read a document is read from its own permissions at EVERY sync, for every document in scope, whether or not the delta
 *     mentioned it. The delta page's way of reporting permission changes needs "Sites.FullControl.All"; this source does not ask
 *     for that, and does not rely on a permission-only change appearing in the feed. Cost: one request per document per sync.
 *   - A reader is a named user or a directory group with the role read, write or owner. A SharePoint site group, and a sharing link
 *     with no named people, grant NOBODY here and are reported, because this source cannot tell who is in them. A document left
 *     with no reader is not imported (ingest.ts). `inheritedFrom` is not used: the permission page says SharePoint libraries do not
 *     return it.
 *   - Only folders an administrator selected are read. Nothing is downloaded, and no permission is read, outside them.
 *   - Only .md and .txt are read as text. .docx and .pdf are refused with the reason (no text extraction is built). A file the
 *     service marks with the malware facet is never downloaded. A file over the size limit is never downloaded.
 *   - A link is followed only when it is on Microsoft Graph's own address; a stored or returned link anywhere else is refused.
 *
 * NOT BUILT: resolving which directory groups a signed-in reader belongs to; sites other than the one named; lists and pages;
 * document versions (`/versions`); change notifications; any real transport or token acquisition.
 */
// The request and response shapes and the base address are declared here, not imported from the calendar adapter: each Graph
// source stands alone, so that nothing which ships can reach either by an import (tests/unit/demo-connect.test.mjs › CX-31).
export interface HttpRequest { method: 'GET' | 'POST' | 'DELETE'; url: string; headers: Record<string, string>; body?: unknown }
export interface HttpResponse { status: number; headers: Record<string, string>; body: unknown }
export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
import { ALLOWED_TYPES, MAX_BYTES, applyDelta, folderOf, type Changes, type Index, type SourceDoc, type SourceProvenance, type SyncReport } from './ingest.js';

export const GRAPH_DOC_READ = '2026-11-11';
export interface DocCall { id: 'delta' | 'permissions' | 'content' | 'throttling'; what: string; request: string | null; delegated: string | null; application: string | null; source: string; says: string }
/** Each call, the least-privileged permission its page lists, and the page. Read on GRAPH_DOC_READ. */
export const GRAPH_DOC_CALLS: readonly DocCall[] = [
  { id: 'delta', what: 'Changes in a site’s document library since the last read', request: 'GET /sites/{siteId}/drive/root/delta', delegated: 'Files.Read', application: 'Files.Read.All',
    source: 'https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0', says: 'Pages end in @odata.nextLink; the last ends in @odata.deltaLink. Track items by id. 410 Gone restarts the enumeration from its Location header.' },
  { id: 'permissions', what: 'Who may read one document', request: 'GET /sites/{siteId}/drive/items/{itemId}/permissions', delegated: 'Files.Read', application: 'Files.Read.All',
    source: 'https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions?view=graph-rest-1.0', says: 'Returns the permissions applied to the item and those inherited from its ancestors. A caller who is not the owner sees only what applies to them.' },
  { id: 'content', what: 'The text of one document', request: 'GET /sites/{siteId}/drive/items/{item-id}/content', delegated: 'Files.Read', application: 'Files.Read.All',
    source: 'https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0', says: '302 Found to a preauthenticated address, valid for minutes; no Authorization header is sent to it.' },
  { id: 'throttling', what: 'Being asked to slow down', request: null, delegated: null, application: null,
    source: 'https://learn.microsoft.com/en-us/graph/throttling', says: '429 Too Many Requests with Retry-After in seconds: wait, then retry the request. Without the header, back off exponentially.' },
];
/** Questions only a real tenant answers; each is a step in the deployment guide, and none is assumed here. */
export const GRAPH_DOC_OPEN: readonly string[] = [
  'Whether an application granted Sites.Selected on one site may call delta, permissions and content there (the three pages list Files.Read.All as the least-privileged application permission and do not mention Sites.Selected).',
  'Whether the permissions call, made by an application, returns every permission on a document (the page describes the owner and a non-owner caller, not an application).',
  'Which member of grantedToV2 carries a Microsoft 365 group and which a security group (the page marks every member optional).',
  'How long a deltaLink stays valid before the service answers 410 Gone.',
];

export interface DocRequest extends HttpRequest { /** a preauthenticated download address: the transport must send NO Authorization header */ anonymous?: true }
export type DocTransport = (req: DocRequest) => Promise<HttpResponse>;

interface Node { name: string; parent: string | null; folder: boolean; root?: true; bytes: number; modified: string; blocked?: string }
interface Seen { path: string; version: number; hash: string; groups: string[]; refusedAs: string | null }
/** What this source remembers between reads: where to read from next, the tree of ids, and what it last told the index. Holds no document text. */
export interface GraphSourceState { link: string | null; tree: Record<string, Node>; seen: Record<string, Seen> }
export const emptyGraphState = (): GraphSourceState => ({ link: null, tree: {}, seen: {} });

export interface GraphSourceConfig {
  siteId: string; /** the top-level folders an administrator selected, as '/Standards' */ scope: readonly string[]; transport: DocTransport;
  /** how a wait is spent; tests record it instead of sleeping */ sleep?: (seconds: number) => Promise<void>; maxAttempts?: number; /** for expiry of permissions */ now?: number;
  provenance?: Extract<SourceProvenance, 'GRAPH' | 'GRAPH_MOCK'>;
}
export type FailKind = 'throttled' | 'unauthorized' | 'forbidden' | 'not-found' | 'refused-link' | 'unexpected';
export interface ReadStats { requests: number; waits: number[]; notes: string[]; resynced: boolean }
export type GraphRead = ({ ok: true; delta: Changes; state: GraphSourceState } & ReadStats) | ({ ok: false; kind: FailKind; why: string } & ReadStats);

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === 'string' && x ? x : null);
const header = (r: HttpResponse, name: string): string | null => { const k = Object.keys(r.headers || {}).find((h) => h.toLowerCase() === name.toLowerCase()); return k ? str(r.headers[k]) : null; };
/** Only Microsoft Graph's own address is ever followed. */
export const onGraph = (url: unknown): url is string => typeof url === 'string' && url.startsWith(`${GRAPH_BASE}/`) && !/[\s<>"]/.test(url);
const hashOf = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const extOf = (name: string) => (/\.([A-Za-z0-9]+)$/.exec(name)?.[1] || '').toLowerCase();
const TEXT_TYPES = ['md', 'txt'];
const enc = encodeURIComponent;

export const reqDelta = (siteId: string, link: string | null): DocRequest => ({ method: 'GET', url: link ?? `${GRAPH_BASE}/sites/${enc(siteId)}/drive/root/delta`, headers: { Accept: 'application/json' } });
export const reqPermissions = (siteId: string, itemId: string): DocRequest => ({ method: 'GET', url: `${GRAPH_BASE}/sites/${enc(siteId)}/drive/items/${enc(itemId)}/permissions`, headers: { Accept: 'application/json' } });
export const reqContent = (siteId: string, itemId: string): DocRequest => ({ method: 'GET', url: `${GRAPH_BASE}/sites/${enc(siteId)}/drive/items/${enc(itemId)}/content`, headers: {} });
export const reqDownload = (url: string): DocRequest => ({ method: 'GET', url, headers: {}, anonymous: true });

export interface DeltaItem { id: string; name: string | null; parent: string | null; kind: 'file' | 'folder' | 'deleted' | 'other'; root: boolean; bytes: number; modified: string; malware: boolean }
/** One page of driveItem: delta. Anything that is not an item with an id is dropped; nothing in a page is trusted beyond its shape. */
export function parseDeltaPage(body: unknown): { items: DeltaItem[]; next: string | null; delta: string | null } | null {
  if (!isObj(body) || !Array.isArray(body['value'])) return null;
  const items: DeltaItem[] = [];
  for (const v of body['value']) { if (!isObj(v)) continue; const id = str(v['id']); if (!id) continue;
    const parent = isObj(v['parentReference']) ? str(v['parentReference']['id']) : null;
    items.push({ id, name: str(v['name']), parent, root: isObj(v['root']), kind: isObj(v['deleted']) ? 'deleted' : isObj(v['folder']) ? 'folder' : isObj(v['file']) ? 'file' : 'other',
      bytes: typeof v['size'] === 'number' && v['size'] >= 0 ? v['size'] : 0, modified: (str(v['lastModifiedDateTime']) || '').slice(0, 10), malware: isObj(v['malware']) }); }
  return { items, next: str(body['@odata.nextLink']), delta: str(body['@odata.deltaLink']) };
}

const READ_ROLES = new Set(['read', 'write', 'owner']);
const NO_EXPIRY = /^0001-/;
/**
 * The readers a permissions answer names. A user is `user:<id>`, a directory group `group:<id>`. SharePoint site groups and links
 * with no named people grant nobody and are listed in `unresolved`. An expired permission, and one with no reading role, is ignored.
 */
export function readersOf(body: unknown, now: number): { groups: string[]; unresolved: string[] } | null {
  if (!isObj(body) || !Array.isArray(body['value'])) return null;
  const groups = new Set<string>(); const unresolved = new Set<string>();
  const take = (set: unknown): boolean => { if (!isObj(set)) return false; let got = false;
    const u = isObj(set['user']) ? str(set['user']['id']) : null; if (u) { groups.add(`user:${u}`); got = true; }
    const g = isObj(set['group']) ? str(set['group']['id']) : null; if (g) { groups.add(`group:${g}`); got = true; }
    for (const k of ['sharePointGroup', 'siteGroup']) if (!got && isObj(set[k])) { unresolved.add(`SharePoint group “${str((set[k] as Record<string, unknown>)['displayName']) || 'unnamed'}”`); return true; }
    return got; };
  for (const p of body['value']) { if (!isObj(p)) continue;
    const roles = Array.isArray(p['roles']) ? p['roles'].filter((r): r is string => typeof r === 'string') : []; if (!roles.some((r) => READ_ROLES.has(r))) continue;
    const exp = str(p['expirationDateTime']); if (exp && !NO_EXPIRY.test(exp)) { const t = Date.parse(exp); if (!Number.isNaN(t) && t <= now) continue; }
    let named = take(p['grantedToV2']);
    if (Array.isArray(p['grantedToIdentitiesV2'])) for (const s of p['grantedToIdentitiesV2']) named = take(s) || named;
    if (!named && !isObj(p['grantedToV2']) && isObj(p['grantedTo'])) named = take({ user: (p['grantedTo'] as Record<string, unknown>)['user'] });   // the deprecated member, only when the current one is absent
    if (!named && isObj(p['link'])) unresolved.add('a sharing link with no named people');
  }
  return { groups: [...groups].sort(), unresolved: [...unresolved].sort() };
}

/** The path of an item from the tree of ids, as '/Folder/Sub/name.md'; null when a parent is missing or the chain loops. */
export function pathOf(tree: Record<string, Node>, id: string): string | null {
  const parts: string[] = []; let cur: string | null = id; const guard = new Set<string>();
  while (cur) { if (guard.has(cur)) return null; guard.add(cur); const n: Node | undefined = tree[cur]; if (!n) return null; if (n.root) break; parts.unshift(n.name); cur = n.parent; }
  return parts.length ? `/${parts.join('/')}` : null;
}

/**
 * Read what changed, as the engine's `Changes`. On any failure the caller's state is untouched: the result carries no state.
 * `state` null, or one with no link, enumerates the whole library (`full`).
 */
export async function graphRead(cfg: GraphSourceConfig, state: GraphSourceState | null): Promise<GraphRead> {
  const stats: ReadStats = { requests: 0, waits: [], notes: [], resynced: false }; const max = cfg.maxAttempts ?? 4; const sleep = cfg.sleep ?? (async () => undefined); const now = cfg.now ?? Date.now();
  const fail = (kind: FailKind, why: string): GraphRead => ({ ok: false, kind, why, ...stats });
  /** One request, retried in place when the service says to slow down. */
  const send = async (req: DocRequest): Promise<HttpResponse | GraphRead> => {
    for (let n = 0; n < max; n++) {
      stats.requests++; const r = await cfg.transport(req); if (r.status !== 429) return r;
      const ra = Number(header(r, 'Retry-After')); const wait = Number.isFinite(ra) && ra > 0 ? Math.min(Math.ceil(ra), 300) : 2 ** n; stats.waits.push(wait); await sleep(wait);
    }
    return fail('throttled', `Microsoft Graph asked us to slow down ${max} times in a row. Nothing was changed; try again later.`);
  };
  const refuse = (r: HttpResponse, what: string, permission: string): GraphRead =>
    r.status === 401 ? fail('unauthorized', `Microsoft Graph did not accept the sign-in while ${what}. Nothing was changed.`)
    : r.status === 403 ? fail('forbidden', `Microsoft Graph refused ${what}. An administrator grants the application ${permission} for this site. Nothing was changed.`)
    : r.status === 404 ? fail('not-found', `Microsoft Graph did not find the site or the item while ${what}. Nothing was changed.`)
    : fail('unexpected', `Microsoft Graph answered ${r.status} while ${what}. Nothing was changed.`);

  const start = state?.link ?? null; if (start !== null && !onGraph(start)) return fail('refused-link', 'The stored place to read from is not an address of Microsoft Graph. It was not followed; disconnect and import again.');
  let tree: Record<string, Node> = { ...(state?.tree || {}) }; let full = start === null; if (full) tree = {};
  const touched = new Set<string>(); let link: string | null = start; let deltaLink: string | null = null;
  for (let page = 0; page < 500 && !deltaLink; page++) {
    const r = await send(reqDelta(cfg.siteId, link)); if ('ok' in r) return r;
    if (r.status === 410) {   // the place we were reading from is gone: start again from where the service says
      const loc = header(r, 'Location'); if (!onGraph(loc)) return fail('refused-link', 'Microsoft Graph asked for a fresh read but gave no address of its own to read from. Nothing was changed.');
      if (stats.resynced) return fail('unexpected', 'Microsoft Graph asked for a fresh read twice in one sync. Nothing was changed.');
      const code = isObj(r.body) && isObj(r.body['error']) ? str(r.body['error']['code']) : null;
      stats.resynced = true; stats.notes.push(`The service asked for a fresh read of the whole library${code ? ` (${code})` : ''}; this source only reads, so the service’s version is taken as it is.`);
      tree = {}; touched.clear(); full = true; link = loc; continue;
    }
    if (r.status !== 200) return refuse(r, 'reading what changed in the library', 'Files.Read.All');
    const p = parseDeltaPage(r.body); if (!p) return fail('unexpected', 'Microsoft Graph’s answer about what changed could not be read. Nothing was changed.');
    for (const it of p.items) {   // in order: a later occurrence of the same item replaces an earlier one
      if (it.kind === 'deleted') { delete tree[it.id]; touched.add(it.id); continue; }
      if (it.kind === 'other' && !it.root) continue;
      const prev = tree[it.id];
      tree[it.id] = { name: it.name ?? prev?.name ?? '', parent: it.parent ?? prev?.parent ?? null, folder: it.kind !== 'file', bytes: it.bytes, modified: it.modified || prev?.modified || '', ...(it.root ? { root: true as const } : {}), ...(it.malware ? { blocked: 'The source reports that this file contains malware. It was not downloaded.' } : {}) };
      touched.add(it.id);
    }
    if (p.delta) { if (!onGraph(p.delta)) return fail('refused-link', 'Microsoft Graph’s answer pointed to an address that is not its own. It was not followed; nothing was changed.'); deltaLink = p.delta; }
    else if (p.next) { if (!onGraph(p.next)) return fail('refused-link', 'Microsoft Graph’s answer pointed to an address that is not its own. It was not followed; nothing was changed.'); link = p.next; }
    else return fail('unexpected', 'Microsoft Graph’s answer had neither a next page nor a place to read from next time. Nothing was changed.');
  }
  if (!deltaLink) return fail('unexpected', 'The library did not finish listing its changes. Nothing was changed.');

  const before = state?.seen || {}; const seen: Record<string, Seen> = {}; const changes: Changes['changes'] = []; const unresolvedAll = new Set<string>();
  /** The text of one file: ask for it, then fetch the address the service redirects to, without the tenant's token. */
  const download = async (id: string, name: string): Promise<string | GraphRead> => {
    const cr = await send(reqContent(cfg.siteId, id)); if ('ok' in cr) return cr; if (cr.status !== 302) return refuse(cr, `asking for “${name}”`, 'Files.Read.All');
    const loc = header(cr, 'Location'); if (!loc || !/^https:\/\/[^\s<>"]+$/.test(loc)) return fail('refused-link', `The address given for downloading “${name}” is not a secure web address. Nothing was changed.`);
    const dr = await send(reqDownload(loc)); if ('ok' in dr) return dr; if (dr.status !== 200) return refuse(dr, `downloading “${name}”`, 'Files.Read.All');
    return typeof dr.body === 'string' ? dr.body : '\uFFFD';   // anything that is not text reads as damaged, and the engine refuses it
  };
  for (const [id, node] of Object.entries(tree)) {
    if (node.folder) continue; const path = pathOf(tree, id); if (!path || !cfg.scope.includes(folderOf(path))) continue;   // outside the selected folders nothing more is asked
    const was = before[id]; const ext = extOf(node.name);
    const pr = await send(reqPermissions(cfg.siteId, id)); if ('ok' in pr) return pr; if (pr.status !== 200) return refuse(pr, `reading who may read “${node.name}”`, 'Files.Read.All');
    const readers = readersOf(pr.body, now); if (!readers) return fail('unexpected', `Microsoft Graph’s answer about who may read “${node.name}” could not be read. Nothing was changed.`);
    readers.unresolved.forEach((u) => unresolvedAll.add(u));
    const refusedAs = node.blocked ? node.blocked : !ALLOWED_TYPES.includes(ext as (typeof ALLOWED_TYPES)[number]) ? 'type' : node.bytes > MAX_BYTES ? 'size' : !TEXT_TYPES.includes(ext) ? `Text is not yet extracted from .${ext} files by the Microsoft Graph source. The file was not downloaded.` : null;
    const moved = !was || was.path !== path || was.groups.join() !== readers.groups.join() || was.refusedAs !== refusedAs;
    let text = ''; let hash = refusedAs ? '' : was?.hash ?? ''; let version = was?.version ?? 1;
    if (!refusedAs && (moved || full || touched.has(id))) {   // the text is read again whenever the entry has to be rebuilt
      const t = await download(id, node.name); if (typeof t !== 'string') return t;
      text = t; hash = hashOf(text); if (was && was.hash && was.hash !== hash) version = was.version + 1;
    }
    seen[id] = { path, version, hash, groups: readers.groups, refusedAs };
    if (!moved && !full && was!.hash === hash) continue;   // nothing about this document differs from what the index was last told
    changes.push({ id, doc: { id, path, bytes: node.bytes, version, modified: node.modified, text, groups: readers.groups, ...(refusedAs && refusedAs !== 'type' && refusedAs !== 'size' ? { blocked: refusedAs } : {}) } });
  }
  if (!full) for (const id of Object.keys(before)) if (!seen[id]) changes.push({ id, doc: null });   // deleted, moved out of the selected folders, or no longer listed (a full read lets the engine drop what it did not see)
  if (unresolvedAll.size) stats.notes.push(`Not counted as readers, because who is in them cannot be told from here: ${[...unresolvedAll].join('; ')}.`);
  return { ok: true, delta: { provenance: cfg.provenance ?? 'GRAPH_MOCK', full, changes, token: deltaLink }, state: { link: deltaLink, tree, seen }, ...stats };
}

/** Bring an index in step with a library read through Microsoft Graph. On failure the index and the source's state are returned as they were. */
export async function graphSync(index: Index, cfg: Omit<GraphSourceConfig, 'scope'>, state: GraphSourceState | null, at: string): Promise<{ index: Index; state: GraphSourceState | null; report: SyncReport; read: GraphRead }> {
  const read = await graphRead({ ...cfg, scope: index.scope }, index.token === null ? null : state);
  const attempts = read.waits.map((waitS, i) => ({ n: i + 1, waitS }));
  if (!read.ok) return { index, state, read, report: { at, ok: false, why: read.why, full: false, added: [], updated: [], renamed: [], removed: [], refused: [], flagged: [], permissions: [], returnedToReview: [], attempts, token: index.token } };
  const r = applyDelta(index, read.delta, at); return { index: r.index, state: read.state, read, report: { ...r.report, attempts } };
}
