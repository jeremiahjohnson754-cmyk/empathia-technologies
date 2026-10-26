import { useState } from 'react';
import { Button, DataTable, Drawer, Empty, ErrorState, Field, Loading, StatusBadge, LIFECYCLE, Tabs, type Column } from '@empathia/ui';
import type { RoomSummary } from '@empathia/api-client';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { go } from '../router.js';
import { useMe } from '../me.js';

const TEMPLATES = ['huddle', 'small_conf', 'medium_conf', 'boardroom', 'executive', 'training', 'townhall', 'auditorium', 'studio', 'collab', 'open_office', 'private_office', 'lobby', 'idf', 'custom'];

export function Rooms() {
  const { can } = useMe();
  const [lifecycle, setLifecycle] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const q = useQuery<{ items: RoomSummary[] }>(`rooms:${lifecycle}`, () => api.call('getV1Rooms', { query: { limit: '200', ...(lifecycle === 'ALL' ? {} : { lifecycle: lifecycle as never }) } }));
  const cols: Column<RoomSummary>[] = [
    { key: 'code', header: 'Room', render: (r) => <a href={`#/rooms/${r.code}`} className="mono">{r.code}</a>, sort: (r) => r.code, width: '130px' },
    { key: 'name', header: 'Name', render: (r) => r.name, sort: (r) => r.name },
    { key: 'type', header: 'Type', render: (r) => r.archetype || <span className="ui-muted">unclassified</span>, sort: (r) => r.archetype || '' },
    { key: 'bld', header: 'Building', render: (r) => <span className="mono">{r.building}</span>, sort: (r) => r.building },
    { key: 'occ', header: 'People', render: (r) => r.occupancy, sort: (r) => r.occupancy, align: 'right' },
    { key: 'life', header: 'Lifecycle', render: (r) => <StatusBadge table={LIFECYCLE} value={r.lifecycle} />, sort: (r) => r.lifecycle },
    { key: 'rev', header: 'Rev', render: (r) => r.rev, align: 'right' },
  ];
  return (
    <section className="page">
      <header className="page__head">
        <div><h1>Rooms</h1><p className="lede">Planned and installed rooms in your tenant{''} — each is one database record with its devices, revisions, plan and evidence.</p></div>
        {can('room.design') ? <Button kind="primary" onClick={() => setCreating(true)} testId="new-room">New room</Button> : null}
      </header>
      <Tabs label="Filter by lifecycle" active={lifecycle} onChange={setLifecycle} tabs={[{ key: 'ALL', label: 'All' }, ...Object.keys(LIFECYCLE).map((k) => ({ key: k, label: LIFECYCLE[k]!.label }))]} />
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !q.data ? <Loading /> :
        <DataTable rows={q.data.items} columns={cols} rowKey={(r) => r.code} onRowClick={(r) => go('rooms', r.code)} caption="Rooms"
          empty={<Empty title={lifecycle === 'ALL' ? 'No rooms yet' : `No rooms are ${LIFECYCLE[lifecycle]?.label.toLowerCase()}`}>{can('room.design') ? 'Create one from a template to start a design.' : 'A designer creates rooms.'}</Empty>} />}
      <NewRoom open={creating} onClose={() => setCreating(false)} />
    </section>
  );
}

function NewRoom({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: '', template: 'huddle', buildingCode: '', floor: '1', length: '', width: '', ceiling: '', occupancy: '' });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const sites = useQuery<{ items: Array<{ code: string; name: string; buildings: Array<{ code: string; name: string }> }> }>(open ? 'sites' : null, () => api.call('getV1Sites') as never);
  const m = useMutation(() => api.call('postV1Rooms', { idempotencyKey: newKey(), body: { name: f.name, template: f.template, ...(f.buildingCode ? { buildingCode: f.buildingCode } : {}), floor: Number(f.floor) || 1, unit: 'm', ...(f.length ? { length: f.length } : {}), ...(f.width ? { width: f.width } : {}), ...(f.ceiling ? { ceiling: f.ceiling } : {}), ...(f.occupancy ? { occupancy: Number(f.occupancy) } : {}) } }), ['rooms']);
  const submit = async () => { const r = await m.run(undefined); if (r) { onClose(); go('rooms', r.code); } };
  return (
    <Drawer open={open} title="New room" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button kind="primary" busy={m.busy} onClick={submit} disabled={!f.name.trim()} testId="create-room">Create room</Button></>}>
      <Field label="Name">{(id) => <input id={id} value={f.name} onChange={set('name')} maxLength={80} placeholder="Northstar Huddle 1.04" data-testid="room-name" />}</Field>
      <Field label="Template" hint="The template sets typical devices and dimensions; you change them afterwards.">{(id, d) => <select id={id} aria-describedby={d} value={f.template} onChange={set('template')}>{TEMPLATES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>}</Field>
      <Field label="Building">{(id) => <select id={id} value={f.buildingCode} onChange={set('buildingCode')}><option value="">First available</option>{(sites.data?.items || []).flatMap((s) => s.buildings.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name} ({s.code})</option>))}</select>}</Field>
      <div className="row3">
        <Field label="Length (m)" hint="blank: template value">{(id, d) => <input id={id} aria-describedby={d} inputMode="decimal" value={f.length} onChange={set('length')} />}</Field>
        <Field label="Width (m)">{(id) => <input id={id} inputMode="decimal" value={f.width} onChange={set('width')} />}</Field>
        <Field label="Ceiling (m)">{(id) => <input id={id} inputMode="decimal" value={f.ceiling} onChange={set('ceiling')} />}</Field>
      </div>
      <div className="row3">
        <Field label="Floor">{(id) => <input id={id} inputMode="numeric" value={f.floor} onChange={set('floor')} />}</Field>
        <Field label="People" hint="blank: template value">{(id, d) => <input id={id} aria-describedby={d} inputMode="numeric" value={f.occupancy} onChange={set('occupancy')} />}</Field>
      </div>
      {m.error ? <ErrorState error={m.error} /> : null}
    </Drawer>
  );
}
