import { useState } from 'react';
import { Button, Drawer, Empty, ErrorState, Field, Loading, StatusBadge, LIFECYCLE } from '@empathia/ui';
import { api, newKey, useMutation, useQuery } from '../api.js';
import { useMe } from '../me.js';

type Projects = { items: Array<{ code: string; name: string; state: string; rooms: Array<{ code: string; name: string; lifecycle: string }> }> };

export function Projects() {
  const { can } = useMe();
  const q = useQuery<Projects>('projects', () => api.call('getV1Projects') as never);
  const [open, setOpen] = useState(false); const [code, setCode] = useState('PRJ-'); const [name, setName] = useState('');
  const mk = useMutation(() => api.call('postV1Projects', { idempotencyKey: newKey(), body: { code, name } }), ['projects']);
  return (
    <section className="page">
      <header className="page__head"><div><h1>Projects</h1><p className="lede">Projects group rooms for decisions, funding and reporting. The executive role decides them.</p></div>
        {can('project.decide') ? <Button kind="primary" onClick={() => setOpen(true)}>New project</Button> : null}</header>
      {q.error ? <ErrorState error={q.error} retry={q.reload} /> : !q.data ? <Loading /> : !q.data.items.length ? <Empty title="No projects" /> :
        <div className="cards">{q.data.items.map((p) => (
          <article key={p.code} className="card stack">
            <header><h2 className="h3">{p.name}</h2><p className="ui-meta mono">{p.code} · {p.state}</p></header>
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
