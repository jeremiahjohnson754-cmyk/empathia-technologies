# Demo routes, pages and access — the contract

Owner: the shell slice (`rebuild/demo-shell`). The spaces (`rebuild/demo-spaces`) and operations (`rebuild/demo-ops`) slices add their
pages through this contract and never edit `App.tsx`, the shell or the policy.

## Add a page in four steps

1. **Write the page** as a module whose default export takes `PageProps` (`registry.types.ts`):

   ```tsx
   import type { PageProps } from '../registry.types.js';
   import { Section, Action } from '../access/Gate.js';
   export default function RoomPage({ role, params, query, can, sees }: PageProps) {
     return (<>
       <h1>{params.room}</h1>
       <Section id="room.technical">…devices, network, power…</Section>          {/* rendered only if the role may see it */}
       <Action id="sh.request"><button className="ui-btn">Ask for a change</button></Action>  {/* absent, not disabled */}
       {can('assure.run') && <button className="ui-btn">Run the assurance check</button>}
     </>);
   }
   ```
   A page never decides access itself: it asks `can(id)` / `sees(id)` or wraps markup in `<Section id>` / `<Action id>`. A role that may
   not use something does not get the button or the panel at all (D44) — not a disabled one, not a refusal message.

2. **Register it** in your slice's file — `registry.spaces.ts` (spaces) or `registry.ops.ts` (operations). Nobody else edits those files.

   ```ts
   {
     id: 'campus.room', title: 'Room', purpose: 'One room: its devices, health and history', product: 'lite',
     path: '/campus/:building/:floor/:room',          // literals beat parameters; '/x/*' matches the rest
     alias: ['/room/:room'],                         // optional: other (legacy) addresses for the same page
     authority: { area: 'room' },                    // WHO MAY OPEN IT — a V2.5.3 authority, never a hand-written role list
     authorityFor: (params, query) => query.get('view') === 'engineer' ? { field: 'control.engineer' } : undefined,   // optional
     sections: [{ id: 'room.technical', label: 'Devices, network and power', authority: { field: 'technical' } }],
     actions:  [{ id: 'sh.request', label: 'Ask for a change', authority: { action: 'sh.request' } }],
     load: () => import('./pages/spaces/RoomPage.js'),   // lazy: its own chunk, loaded only when the role may open the address
     search: { keywords: 'room devices health', aliases: ['meeting room'] },
   },
   ```

3. **Name the authority from V2.5.3.** `authority` is one of (see `access/v253.ts` for every key — generated from V2.5.3's 12-authz.js):
   `{ area }` (AZ_AREA, pages), `{ field }` (AZ_FIELD, sections), `{ action }` (AZ_ACTION, buttons), `{ compare }`, `{ lens }` (Lite
   modes), `{ layer }` (spatial layers), `{ entity }` (record types), or `{ all: [...] }` to require several. Only for something V2.5.3
   never had: `{ roles: [...], why: 'where this rule comes from' }`. **Deny by default:** a key the tables do not know admits nobody, and
   `tests/unit/demo-policy.test.mjs` fails on any registered page, section or action whose authority is unknown.

4. **Refine by the exact address** when a view or query changes who may look (V2.5.3 did this for `lite?mode=`, `compare/<kind>`,
   `control?mode=engineer`, `assurance?view=analysis`): return the extra authority from `authorityFor`. The Agora Owl access page then names
   only the roles that can open that exact address, query included, and its View-as switch offers exactly those.

## What the shell does with it

- **Routing** (`registry.pages.ts › resolve(hash)`): the most specific matching pattern wins. Addresses no page claims fall back to the
  legacy V2.5.3 address space (`registry.ts › areaOf`) and show their migration status; their access follows the same policy
  (`policy.ts › legacyAuthority`). Unknown addresses fall to V2.5.3's `none` area (Product Architect only).
- **Access** (`access/policy.ts`): `canOpen(role, resolved)`, `canSee`, `canDo`, `whoCanOpen`. A forbidden address renders
  `access/AccessPage.tsx` (the Agora Owl, "Roles whose work it is", a View-as switch) and **never calls `load()`** — the screen's chunk is
  not downloaded (`tests/browser/demo-access.test.mjs` watches the network).
- **Rail and menu**: the nine products in the canonical order (D37/D40). A product appears for a role only when at least one of its
  `landing: true` pages is open to that role; the menu lists every page of a product the role can open.
- **Home tabs**: V2.5.3's `tabsFor(role)` labels, kept only where the role can open the address.
- **Search**: `title`, `purpose`, `search.keywords` and `search.aliases` feed the search bar, filtered by the policy.
- **Role**: the current View-as role is `PageProps.role`. Stored in `localStorage['empathia.demo.perspective']`; the native quick switch
  `.persp select` stays in the header (visually hidden until focused) for the test suites.

## Products (D37/D40) — the `product` key

`mission-control` Mission Control · `lite` Lite · `pro` Pro · `search-party` Search Party · `servicehands` ServiceHands · `commissioning` Commissioning & Assurance ·
`apex` APEX · `field` Field Intelligence · `learn` Learn · `shell` (investor start, policy page: not a product).

## Roles

`visitor employee exec service svcmgr syseng designer installer cxeng ipm bpm ops steward architect` (V2.5.3) and `qa` (Document
Reviewer, ADR-0005; its narrow grants are listed in `policy.ts`). The demonstration opens as `architect` (V2.5.3's Product Architect: the
complete platform, and View as for every role).

## Testing your page

- Unit: `node --test tests/unit/demo-policy.test.mjs` checks every role × every registered page, section and action.
- Browser: open `#/<your address>` as an allowed role (page renders) and as a refused role (owl page, your chunk not requested). Helpers:
  set `localStorage['empathia.demo.perspective']` before load, or `page.selectOption('.persp select', role)`.
