import { useState } from 'react';
import { Button, Drawer, Empty, ErrorState, Field, Loading, StatusBadge, LIFECYCLE } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';
import { href } from '../router.js';

type Projects = { items: Array<{ code: string; name: string; state: string; governance?: string; delivery?: string | null; scopeRev?: number; rooms: Array<{ code: string; name: string; lifecycle: string }> }> };

export function Projects() {
  const { can } = useMe();
  const q = useQuery<Projects>('projects', () => api.call('getV1Projects') as never);
  const [open, setOpen] = useState(false); const [code, setCode] = useState('PRJ-'); const [name, setName] = useState('');
  const mk = useMutation(() => api.call('postV1Projects', { idempotencyKey: newKey(), body: { code, name } }), ['projects']);
  return (
    <section className="page">
      <header className="page__head"><div><h1>Projects</h1><p className="lede">Every project is governed: intake → review → brief → approval → collaborative design → execution and handoff → operational transition. Open one for its stage, its next governed steps and what blocks them.</p></div>
        {can('project.decide') ? <Button kind="primary" onClick={() => setOpen(true)}>New project</Button> : null}</header>
      <p className="subnav"><b>Projects</b> · <a href={href('requests')}>Requests</a></p>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !q.data ? <Loading /> : !q.data.items.length ? <Empty title="No projects" /> :
        <div className="cards">{q.data.items.map((p) => (
          <article key={p.code} className="card stack">
            <header><h2 className="h3"><a href={href('projects', p.code)}>{p.name}</a></h2><p className="ui-meta mono">{p.code} · {p.state}{p.governance ? ` · ${p.governance}` : ''}{p.delivery ? ` · ${p.delivery}` : ''}{p.scopeRev ? ` · scope rev ${p.scopeRev}` : ''}</p></header>
            {p.rooms.length ? <ul className="plain">{p.rooms.map((r) => <li key={r.code}><a className="mono" href={`#/rooms/${r.code}`}>{r.code}</a> {r.name} <StatusBadge table={LIFECYCLE} value={r.lifecycle} /></li>)}</ul> : <p className="ui-muted">No rooms in your sites</p>}
          </article>))}</div>}
      <Drawer open={open} title="New project" onClose={() => setOpen(false)} footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button kind="primary" busy={mk.busy} onClick={async () => { if (await mk.run(undefined)) setOpen(false); }}>Create project</Button></>}>
        <Field label="Code" hint="PRJ- followed by capitals, digits or hyphens">{(id, h) => <input id={id} aria-describedby={h} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={36} />}</Field>
        <Field label="Name">{(id) => <input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />}</Field>
        {mk.error ? <ErrorState error={mk.error} /> : null}
      </Drawer>
    </section>
  );
}
