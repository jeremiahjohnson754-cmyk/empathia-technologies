/**
 * #/list (the Core model's record types), #/list/<Type> (records of one type), #/list/<Type>/<id> (one record's passport) and
 * #/set, #/set/<family>, #/set/<family>:<rule> (the records behind a number). V2.5.3's 92-search-registry.js and #/set views, rebuilt on
 * the Core index (./core.ts): every row is a record of this demonstration, every count is a count of rows.
 */
import { useState } from 'react';
import { PageHero, Card, StatTile, Chip, Segmented, EmptyState, Tag, Donut, type Segment } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { allows } from '../access/policy.js';
import { TYPES, TYPE_KEYS, isType, PROV_TEXT, RULES, type EntityType, type Rec } from './core.js';
import { useCore, canEntity, visible, recHref, honest, Crumbs, Pills, RecList, FactsTable, Zone, ProvTag, TypeIcon, toneOf } from './ui.js';
import { FAMILIES, setOf, familyOf, setAuthority, LEGACY_FAMILY } from './sets.js';

export default function RecordsPage(p: PageProps) {
  let seg = p.hash.replace(/^#\/?/, '').split(/[?~]/)[0]!.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  if (seg[0] === 'pro' || seg[0] === 'v14' || seg[0] === 'registry') seg = ['list', 'Device'];   // #/pro/registry, #/v14/registry, #/registry: the device register
  if (seg[0] !== 'set' && seg[0] !== 'list') seg = ['list'];             // #/core, #/suite/core: the Core model index
  return <div className="pa" data-native="" data-testid="parity-records">{seg[0] === 'set' ? <Sets {...p} k={seg[1] || ''} /> : seg[2] ? <Passport {...p} type={seg[1]!} id={seg.slice(2).join('/')} /> : seg[1] ? <TypeList {...p} type={seg[1]} /> : <Index {...p} />}</div>;
}

function Index({ role }: PageProps) {
  const core = useCore();
  const types = TYPE_KEYS.filter((t) => canEntity(role, t));
  const total = types.reduce((s, t) => s + core.byType[t].length, 0);
  const prov = (['KNOWN', 'INFERRED', 'SIMULATED'] as const).map((k) => ({ key: k, label: k === 'KNOWN' ? 'Known' : k === 'INFERRED' ? 'Inferred' : 'Simulated', value: types.reduce((s, t) => s + core.byType[t].filter((r) => r.prov === k).length, 0), tone: (k === 'KNOWN' ? 'ok' : k === 'INFERRED' ? 'info' : 'warn') as Segment['tone'] }));
  return (
    <>
      <PageHero eyebrow="Core model · records" title="Every record, by type" product="search-party" icon="layers"
        lede={`${total.toLocaleString('en-US')} records in ${types.length} types you may open, each built from the demonstration’s own room records, workspace and decision desk. Open a type to see its records; open a record for its passport.`}
        meta={honest(['Synthetic data', 'warn'], ['Records, not live systems', 'muted'])}
        aside={<Donut segments={prov} label="Records by provenance" total="records" size={132} />} />
      <div className="kit-grid" role="list" aria-label="Record types">
        {types.map((t) => { const n = core.byType[t].length; return (
          <a key={t} role="listitem" className="pa-card-link" href={`#/list/${t}`} data-testid={`type-${t}`}>
            <h3><TypeIcon type={t} />{TYPES[t].plural}</h3>
            <p>{TYPES[t].blurb}</p>
            <span className="pa-card-link__meta"><b>{n.toLocaleString('en-US')}</b> {n === 1 ? 'record' : 'records'} · grouped by {TYPES[t].facet.toLowerCase()}</span>
          </a>
        ); })}
      </div>
      {types.length < TYPE_KEYS.length ? <p className="pa-note">{TYPE_KEYS.length - types.length} other record types are not part of this role’s work and are not listed (V2.5.3 entity rules).</p> : null}
    </>
  );
}

function TypeList({ type }: PageProps & { type: string }) {
  const core = useCore(); const [facet, setFacet] = useState('all'); const [q, setQ] = useState('');
  if (!isType(type)) return <EmptyState title={`There is no record type “${type}”`} icon="search" action={<a className="ui-btn" href="#/list">Every record type</a>}>The Core model holds {TYPE_KEYS.length} types.</EmptyState>;
  const info = TYPES[type]; const all = core.byType[type];
  const facets = [...new Set(all.map((r) => (info.facet === 'Building' ? r.building || '—' : r.state || '—')))].sort();
  const counts = Object.fromEntries(facets.map((f) => [f, all.filter((r) => (info.facet === 'Building' ? r.building || '—' : r.state || '—') === f).length]));
  const needle = q.trim().toLowerCase();
  const rows = all.filter((r) => (facet === 'all' || (info.facet === 'Building' ? r.building || '—' : r.state || '—') === facet) && (!needle || `${r.name} ${r.sub} ${r.id}`.toLowerCase().includes(needle)));
  const known = all.filter((r) => r.prov === 'KNOWN').length;
  return (
    <>
      <Crumbs items={[['Core model', '#/list'], [info.plural]]} />
      <PageHero compact eyebrow="Core model" title={info.plural} product="search-party" icon={info.icon as never} lede={`${all.length.toLocaleString('en-US')} in the model. ${info.blurb}. Tap any one to open its passport.`}
        meta={honest(['Synthetic data', 'warn'], [`${known} known · ${all.length - known} inferred or simulated`, 'muted'])} />
      <div className="pa-toolbar">
        <label className="pa-field">Filter by words<input className="pa-select" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${info.plural.toLowerCase()}`} aria-describedby="pa-list-count" /></label>
        {facets.length > 1 && facets.length <= 8 ? <Segmented small label={`Filter by ${info.facet.toLowerCase()}`} value={facet} onChange={setFacet} options={[{ value: 'all', label: 'All', count: all.length }, ...facets.map((f) => ({ value: f, label: f.replace(/_/g, ' ').toLowerCase(), count: counts[f] }))]} /> : facets.length > 8 ? (
          <label className="pa-field">{info.facet}<select className="pa-select" value={facet} onChange={(e) => setFacet(e.target.value)}><option value="all">All ({all.length})</option>{facets.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ').toLowerCase()} ({counts[f]})</option>)}</select></label>) : null}
      </div>
      <p id="pa-list-count" className="pa-note" aria-live="polite">{rows.length === all.length ? `All ${all.length} shown` : `${rows.length} of ${all.length} match`}</p>
      <RecList recs={rows} label={info.plural} empty={`No ${info.plural.toLowerCase()} match`} />
    </>
  );
}

function Passport({ role, type, id }: PageProps & { type: string; id: string }) {
  const core = useCore();
  const r = isType(type) ? core.byType[type].find((x) => x.id === id) : undefined;
  if (!r) return <EmptyState title="No record with this address" icon="search" action={<a className="ui-btn" href={isType(type) ? `#/list/${type}` : '#/list'}>{isType(type) ? `Every ${TYPES[type].label.toLowerCase()}` : 'Every record type'}</a>}>Nothing in this demonstration’s records is called <code>{id}</code>.</EmptyState>;
  const links = r.links.map((l) => ({ l, to: core.byType[l.type]?.find((x) => x.id === l.id) })).filter((x) => x.to && canEntity(role, x.to.type));
  const back = core.all.filter((x) => x.links.some((l) => l.id === r.id && l.type === r.type) && canEntity(role, x.type));
  const byType = TYPE_KEYS.map((t) => [t, back.filter((x) => x.type === t)] as const).filter(([, l]) => l.length);
  return (
    <>
      <Crumbs items={[['Core model', '#/list'], [TYPES[r.type].plural, `#/list/${r.type}`], [r.id]]} />
      <PageHero compact eyebrow={`${TYPES[r.type].label} passport`} title={r.name} product="search-party" icon={TYPES[r.type].icon as never} lede={r.sub}
        meta={[<ProvTag key="p" prov={r.prov} />, r.state ? <Tag key="s" tone={toneOf(r.tone)}>{r.state.replace(/_/g, ' ').toLowerCase()}</Tag> : null, <Chip key="id" small tone="muted">{r.id}</Chip>].filter(Boolean) as never}
        actions={r.href ? <a className="ui-btn ui-btn--primary" href={r.href}>Open where it lives</a> : undefined} />
      <div className="pa-split">
        <Card title="What the record says" icon="book" sub={PROV_TEXT[r.prov]}><FactsTable facts={r.facts} caption="Facts" /><p className="pa-note">Source: {r.source}</p></Card>
        <Card title="Linked records" icon="link" sub={`${links.length + back.length} relationships on record`}>
          {links.length ? <RecList recs={links.map((x) => x.to!)} label="This record points to" trailing={(x) => <Tag tone="muted">{r.links.find((l) => l.id === x.id)?.rel}</Tag>} /> : null}
          {byType.map(([t, l]) => <div key={t} className="pa-zone"><h3 className="pa-zone__note">{TYPES[t].plural} that point here</h3><RecList recs={l} label={`${TYPES[t].plural} that point here`} step={6} /></div>)}
          {!links.length && !back.length ? <p className="pa-note">No other record links to this one.</p> : null}
        </Card>
      </div>
    </>
  );
}

/** The passport's body without the page around it: what the record says and its linked records. The Lite room opens it as a sheet over
 *  the room (V2.5.3 opened the room passport over the room, 13 Nov 2026 founder: "without losing the current room, camera view, or spatial
 *  context"). */
export function PassportBody({ role: role0, type, id, headingId }: { role: string; type: string; id: string; headingId?: string }) {
  const core = useCore(); const role = role0 as PageProps['role'];
  const r = isType(type) ? core.byType[type].find((x) => x.id === id) : undefined;
  if (!r) return <p className="pa-note">No record with this address.</p>;
  const links = r.links.map((l) => ({ l, to: core.byType[l.type]?.find((x) => x.id === l.id) })).filter((x) => x.to && canEntity(role, x.to.type));
  const back = core.all.filter((x) => x.links.some((l) => l.id === r.id && l.type === r.type) && canEntity(role, x.type));
  const byType = TYPE_KEYS.map((t) => [t, back.filter((x) => x.type === t)] as const).filter(([, l]) => l.length);
  return <div className="pa-sheetbody" data-testid="passport-body">
    <p className="pa-sheet__eyebrow">{TYPES[r.type].label} passport</p>
    <h2 id={headingId} tabIndex={-1} className="pa-sheet__h">{r.name}</h2>
    <p className="pa-note">{r.sub}</p>
    <div className="wk-chips"><ProvTag prov={r.prov} />{r.state ? <Tag tone={toneOf(r.tone)}>{r.state.replace(/_/g, ' ').toLowerCase()}</Tag> : null}<Chip small tone="muted">{r.id}</Chip></div>
    <Card title="What the record says" icon="book" sub={PROV_TEXT[r.prov]}><FactsTable facts={r.facts} caption="Facts" /><p className="pa-note">Source: {r.source}</p></Card>
    <Card title="Linked records" icon="link" sub={`${links.length + back.length} relationships on record`}>
      {links.length ? <RecList recs={links.map((x) => x.to!)} label="This record points to" trailing={(x) => <Tag tone="muted">{r.links.find((l) => l.id === x.id)?.rel}</Tag>} /> : null}
      {byType.map(([t, l]) => <div key={t} className="pa-zone"><h3 className="pa-zone__note">{TYPES[t].plural} that point here</h3><RecList recs={l} label={`${TYPES[t].plural} that point here`} step={6} /></div>)}
      {!links.length && !back.length ? <p className="pa-note">No other record links to this one.</p> : null}
    </Card>
  </div>;
}

function Sets({ role, k: raw }: PageProps & { k: string }) {
  const k = LEGACY_FAMILY[raw] ?? raw;
  const core = useCore();
  const mayFamily = (key: string) => allows(setAuthority(key), role);
  const fams = FAMILIES.filter((f) => mayFamily(f.key === 'as' ? f.sets[0]!.key : f.key));
  const s = setOf(k); const fam = s ? s.family : familyOf(k);
  if (k && !fam) return <EmptyState title={`No set is called “${k}”`} icon="search" action={<a className="ui-btn" href="#/set">Every set</a>}>Sets are named family:rule, for example <code>dev:uncovered</code>.</EmptyState>;
  if (!fam) return (
    <>
      <PageHero eyebrow="The records behind a number" title="Every number opens its records" product="search-party" icon="chart" lede="Each set is a stated rule over the demonstration’s records. A figure on any page that counts one of these opens the rows it counted."
        meta={honest(['Synthetic data', 'warn'], ['Modeled · not measured', 'muted'])} />
      {fams.map((f) => <Zone key={f.key} title={f.label} note={f.blurb}><div className="kit-grid">{f.sets.filter((x) => allows(setAuthority(x.key), role)).map((x) => { const n = visible(role, x.items(core)).length; return <a key={x.key} className="pa-card-link" href={`#/set/${x.key}`}><h3>{x.title}</h3><p>{x.how}</p><span className="pa-card-link__meta"><b>{n}</b> records</span></a>; })}</div></Zone>)}
    </>
  );
  const items = s ? visible(role, s.items(core)) : [];
  const types = [...new Set(items.map((x) => x.type))] as EntityType[];
  return (
    <>
      <Crumbs items={[['Sets', '#/set'], [fam.label, `#/set/${fam.key}`], ...(s ? [[s.title] as [string]] : [])]} />
      {s ? (
        <>
          <PageHero compact eyebrow={fam.blurb} title={s.title} product="search-party" icon="chart" lede={<><b>{items.length.toLocaleString('en-US')} {types.length === 1 ? (items.length === 1 ? TYPES[types[0]!].label.toLowerCase() : TYPES[types[0]!].plural.toLowerCase()) : 'records'}.</b> {s.how}</>}
            meta={honest(['The records behind the number', 'accent'], ['Modeled · not measured', 'muted'])} />
          <Pills label={`${fam.label} sets`} items={fam.sets.map((x) => ({ label: x.title, href: `#/set/${x.key}`, on: x.key === s.key, count: visible(role, x.items(core)).length }))} />
          {fam.key === 'room' || fam.key === 'as' ? <p className="pa-note">{RULES.health}</p> : fam.key === 'dev' ? <p className="pa-note">{RULES.stage}</p> : null}
          <RecList recs={items} label={s.title} empty="No records match: this number is zero." />
        </>
      ) : (
        <>
          <PageHero compact eyebrow="The records behind a number" title={fam.blurb} product="search-party" icon="chart" lede={`${fam.sets.length} stated rules over the ${fam.label.toLowerCase()} on record.`} meta={honest(['Synthetic data', 'warn'])} />
          <div className="kit-grid kit-grid--tiles">{fam.sets.map((x) => <StatTile key={x.key} label={x.title} value={visible(role, x.items(core)).length} href={`#/set/${x.key}`} hint={x.how} />)}</div>
        </>
      )}
    </>
  );
}
