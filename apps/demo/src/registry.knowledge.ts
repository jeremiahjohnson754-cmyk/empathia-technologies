/**
 * Pages of the knowledge lane (owner: agent/knowledge-fabric): the Technical Knowledge Ledger and governed document ingestion
 * (founder's directive of 11 Nov 2026, §07 and §09). Contract: registry.types.ts and README-routes.md.
 *
 * Opening the ledger grants nothing by itself. Which objects a reader receives is decided object by object by the knowledge
 * contract's `mayRead` (knowledge/contract.ts): the zone, the owning customer and the source's own access list. Reviewing uses
 * V2.5.3's engineering-review authority (AZ_ACTION review.decide) and speaking for the customer uses its governance authority
 * (AZ_ACTION govern); neither was invented here.
 */
import type { Authority, PageDef } from './registry.types.js';
import { ROLE_KEYS, rolesFor } from './access/policy.js';

const REVIEW: Authority = { action: 'review.decide' }; const GOVERN: Authority = { action: 'govern' };
const OPEN: Authority = { roles: ROLE_KEYS, why: 'the Knowledge Ledger (directive §07) never existed in V2.5.3: every role may open it, because public and Empathia-authored knowledge is for everyone, and what else a reader receives is decided per object by the knowledge contract (zone, owning customer, the source’s access list), never by this page' };
const SOURCES: Authority = { roles: ROLE_KEYS.filter((k) => rolesFor(GOVERN).includes(k) || rolesFor(REVIEW).includes(k)), why: 'governed document ingestion (directive §09) never existed in V2.5.3: it is opened by the roles V2.5.3 lets govern the customer’s data (AZ_ACTION govern), who connect and scope a source, and by the roles it lets decide an engineering review (AZ_ACTION review.decide), who approve what was read' };

export const KNOWLEDGE_PAGES: readonly PageDef[] = [
  {
    id: 'knowledge', title: 'Knowledge Ledger', purpose: 'What is known, where it came from, how far it may be trusted and who may read it: five trust zones, kept apart', product: 'search-party',
    path: '/knowledge', alias: ['/knowledge/:id'], authority: OPEN,
    sections: [{ id: 'knowledge.queue', label: 'Candidates awaiting review', authority: REVIEW }],
    actions: [{ id: 'knowledge.review', label: 'Approve or reject a candidate', authority: REVIEW }, { id: 'knowledge.consent', label: 'Give the customer’s consent to share', authority: GOVERN }, { id: 'knowledge.release', label: 'Release a shared copy', authority: REVIEW }],
    load: () => import('./knowledge/KnowledgePage.js'),
    search: { keywords: 'knowledge ledger standards concepts calculations procedures decision tree failure pattern reference trust zones tenant private shared consent review citation source', aliases: ['knowledge', 'knowledge ledger', 'technical knowledge'] },
  },
  {
    id: 'knowledge.sources', title: 'Document sources', purpose: 'Bring a customer’s documents in under governance: connect, authorize, scope, preview, classify, import, validate, index, approve, surface (a simulated source)', product: 'search-party',
    path: '/knowledge/sources', authority: SOURCES,
    actions: [{ id: 'knowledge.sources.admin', label: 'Connect, scope and sync a document source', authority: GOVERN }, { id: 'knowledge.sources.approve', label: 'Approve an imported document', authority: REVIEW }],
    load: () => import('./knowledge/IngestPage.js'),
    search: { keywords: 'document source ingestion import sync delta library permissions revoke delete connector governed', aliases: ['document sources', 'ingestion'] },
  },
];
