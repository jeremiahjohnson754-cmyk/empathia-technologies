/**
 * The product landings that make the platform read as one: Commissioning & Assurance (every room by stage with its readiness), Field
 * Intelligence (the integration catalogue with honest states and the measurement/evidence entry points) and Learn (the permission-aware
 * knowledge search). Each is a thin, real view over existing endpoints — nothing here is a mock-up.
 */
import { useState } from 'react';
import { DataTable, Empty, ErrorState, Loading, Notice, ProductHeader, StatusBadge, Tag, LIFECYCLE, INTEGRATION, type Column } from '@empathia/ui';
import type { RoomSummary } from '@empathia/api-client';
import { api, useQuery } from '../api.js';

export function CommissioningHome() {
  const q = useQuery<{ items: RoomSummary[] }>('rooms:ALL', () => api.call('getV1Rooms', { query: { limit: '200' } }));
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading /></section>;
  const stages = ['PLANNED', 'DESIGN_APPROVED', 'INSTALLATION_PENDING', 'INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL'];
  const by = (s: string) => q.data!.items.filter((r) => r.lifecycle === s);
  return (
    <section className="page">
      <ProductHeader product="Commissioning & Assurance" purpose="Requirements → plan → execution → evidence → deficiencies → independent verification → acceptance → immutable baseline → drift and recommissioning. Every result keeps its label; nothing passes from a design."><h1>Rooms by stage</h1></ProductHeader>
      <div className="stage-grid">
        {stages.map((s) => <div key={s} className="stage"><h2 className="h3"><StatusBadge table={LIFECYCLE} value={s} /> <span className="ui-muted">{by(s).length}</span></h2>
          {by(s).length ? <ul className="list">{by(s).map((r) => <li key={r.code}><a href={`#/rooms/${r.code}/${s === 'ACCEPTED' || s === 'OPERATIONAL' ? 'assurance' : 'commissioning'}`}><b>{r.name}</b></a> <span className="mono ui-meta">{r.code}</span> <span className="ui-meta">· {r.building}{r.archetype ? ` · ${r.archetype}` : ''}</span></li>)}</ul> : <p className="ui-meta">none</p>}
        </div>)}
      </div>
      <Notice tone="muted">Open a room for its readiness strip (gate blockers, verified share, outstanding actions), its plan, evidence, deficiencies and baseline lineage.</Notice>
    </section>
  );
}

interface Integration { key: string; category: string; vendor: string; product: string; state: string; mode: string; note: string }
export function FieldIntelligence() {
  const q = useQuery<{ items: Integration[]; note: string }>('integrations', () => api.call('getV1Integrations') as Promise<{ items: Integration[]; note: string }>);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading /></section>;
  const cols: Column<Integration>[] = [
    { key: 'c', header: 'Category', render: (i) => i.category, sort: (i) => i.category },
    { key: 'p', header: 'Capability', render: (i) => <div><b>{i.product}</b><div className="ui-meta">{i.vendor}</div></div>, sort: (i) => i.product },
    { key: 's', header: 'State', render: (i) => <StatusBadge table={INTEGRATION} value={i.state} />, sort: (i) => i.state },
    { key: 'm', header: 'Mode', render: (i) => <Tag tone="muted">{i.mode}</Tag> },
    { key: 'n', header: 'Note', render: (i) => <span className="ui-meta">{i.note}</span> },
  ];
  return (
    <section className="page">
      <ProductHeader product="Field Intelligence" purpose="Authorized, non-intrusive reachability and health checks; evidence collection with provenance; optional hardware-assisted validation only with explicit authorization. Every observation is labelled declared, observed, verified, modeled, unknown or unavailable."><h1>Capabilities and adapters</h1></ProductHeader>
      <Notice tone="warn"><b>No live device is connected.</b> {q.data.note} Baseline monitoring runs only through a VERIFIED adapter; there is none today, so live health everywhere reads <b>NOT_MONITORED</b>.</Notice>
      <DataTable rows={q.data.items} columns={cols} rowKey={(i) => i.key} caption="Integration catalogue" dense />
      <div className="card stack"><h2 className="h3">Safety boundary (fixed)</h2><ul className="why"><li>Default checks never move cameras, change presets, play test signals, alter DSP or network settings, reboot equipment or record conversations.</li><li>Active validation needs the capability verified on the device model, an explicit authorization, safety limits and occupancy awareness.</li><li>Measurements keep provenance, instrument, calibration, unit and method — see a room's Acceptance &amp; assurance tab.</li></ul></div>
    </section>
  );
}

interface Doc { id?: string; title: string; summary?: string; excerpt?: string; classification?: string; citations?: string[]; source?: string }
export function Learn() {
  const [typed, setTyped] = useState(''); const [q, setQ] = useState('');
  const res = useQuery<{ items: Doc[]; note?: string }>(`knowledge:${q}`, () => api.call('getV1Knowledge', { query: q ? { q } : {} }) as Promise<{ items: Doc[]; note?: string }>);
  return (
    <section className="page">
      <ProductHeader product="Learn" purpose="Evidence-backed technical knowledge and reviewed cases, searched with your permissions. Training never grants authority; a case is written from what actually happened, de-identified."><h1>Knowledge</h1></ProductHeader>
      <form className="sp__search" onSubmit={(e) => { e.preventDefault(); setQ(typed.trim()); }}><label className="ui-visually-hidden" htmlFor="learn-q">Search knowledge</label><input id="learn-q" className="sp__input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search guides, standards and reviewed cases" /><button type="submit" className="ui-btn ui-btn--primary">Search</button></form>
      {res.error ? <ErrorState error={res.error} retry={res.reload} /> : !res.data ? <Loading label="Searching" /> : !res.data.items.length ? <Empty title="No document matches">Knowledge is permission-aware: a document outside your role's reach is absent, not hidden.</Empty> : (
        <ul className="list">{res.data.items.map((d, i) => <li key={d.id || i} className="card"><b>{d.title}</b>{d.classification && <> <Tag tone="muted">{d.classification}</Tag></>}<p className="ui-muted">{d.summary || d.excerpt || ''}</p>{d.citations?.length ? <p className="ui-meta">Sources: {d.citations.join(' · ')}</p> : null}</li>)}</ul>)}
      {res.data?.note && <p className="ui-meta">{res.data.note}</p>}
    </section>
  );
}
