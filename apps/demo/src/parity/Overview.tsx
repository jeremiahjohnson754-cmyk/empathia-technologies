/**
 * #/parity: every V2.5.3 address area and where it lands in this demonstration — the native page that claims it, or (none, by design)
 * nothing. Computed from the parity ledger and the page registry, so the list is never typed by hand; the browser suite asserts that no
 * area is left without a page.
 */
import { PageHero, StatTile, Tag } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { AREAS, hrefOfArea } from '../registry.js';
import { resolve } from '../registry.pages.js';
import { canOpen } from '../access/policy.js';
import { honest, Zone } from './ui.js';

export default function OverviewPage({ role }: PageProps) {
  const rows = AREAS.filter((a) => a.key !== 'none').map((a) => { const href = hrefOfArea(a.key); const at = resolve(href); return { a, href, page: at?.page || null, open: at ? canOpen(role, at) : false }; });
  const native = rows.filter((r) => r.page).length;
  const groups = [...new Set(rows.map((r) => (r.a.key.startsWith('v25.') ? 'V2.5 pages' : r.page?.product || 'unclaimed')))];
  return (
    <div className="pa" data-testid="parity-overview">
      <PageHero eyebrow="Parity" title="Every V2.5.3 address" product="shell" icon="map" lede={`${AREAS.length - 1} address areas of the original demonstration, each with the page that answers it here. Nothing on this list is typed by hand: it is the parity ledger read against the page registry.`}
        meta={honest(['Computed from the registry', 'accent'], ['Synthetic data', 'warn'])} />
      <div className="kit-grid kit-grid--tiles">
        <StatTile label="Address areas" value={rows.length} icon="map" />
        <StatTile label="With a native page" value={native} unit={` of ${rows.length}`} icon="check" testId="parity-native" />
        <StatTile label="Open to this role" value={rows.filter((r) => r.open).length} icon="user" hint="the rest show the owl page (D44)" />
      </div>
      {groups.map((g) => (
        <Zone key={g} title={g === 'unclaimed' ? 'Not yet claimed by a page' : g} note={`${rows.filter((r) => (r.a.key.startsWith('v25.') ? 'V2.5 pages' : r.page?.product || 'unclaimed') === g).length} areas`}>
          <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th scope="col">Area</th><th scope="col">Address</th><th scope="col">Page here</th><th scope="col">For you</th></tr></thead>
            <tbody>{rows.filter((r) => (r.a.key.startsWith('v25.') ? 'V2.5 pages' : r.page?.product || 'unclaimed') === g).map((r) => <tr key={r.a.key} data-area={r.a.key} data-native={r.page ? 'yes' : 'no'}><th scope="row">{r.a.label}<br /><span className="pa-mono">{r.a.key}</span></th><td><a href={r.href}>{r.href}</a></td><td>{r.page ? r.page.title : <Tag tone="bad">none</Tag>}</td><td>{r.open ? <Tag tone="ok">opens</Tag> : <Tag tone="muted">owl page</Tag>}</td></tr>)}</tbody></table></div>
        </Zone>
      ))}
    </div>
  );
}
