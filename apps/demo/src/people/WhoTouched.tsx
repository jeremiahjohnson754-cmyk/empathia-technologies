/** Everyone who touched a room: the people from its service jobs (with the layers they worked) and the roles from its commissioning
 *  record (with how many steps each took). Links each person to their experience on #/v25/people. Synthetic people. */
import { useMemo } from 'react';
import { Card, Tag } from '@empathia/ui';
import { whoTouched, allJobs } from './involvement.js';
import { LAYER_LABEL } from '../service/analytics.js';
import { load as loadDesk } from '../decisions/store.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { personaLabel } from '../build/store.js';

export function WhoTouched({ roomIds, title = 'Everyone who touched this room' }: { roomIds: string[]; title?: string }) {
  const { w } = useWorkspace(); const desk = useMemo(() => loadDesk(), []);
  const projectOf = useMemo(() => { const m = new Map(desk.projects.filter((p) => p.roomId).map((p) => [p.roomId!, p.id])); return (room: string) => m.get(room) || null; }, [desk]);
  const t = useMemo(() => whoTouched(allJobs(w, projectOf), roomIds), [w, projectOf, roomIds.join()]);
  return (
    <Card icon="users" title={title} sub="People from its service jobs, roles from its commissioning record; experience is evidence, never authority" testId="who-touched">
      <div className="wk-g2">
        <div><h4 className="ui-meta">People ({t.people.length})</h4>
          {t.people.length ? <ul className="plain">{t.people.map((x) => <li key={x.person.id} data-testid="wt-person" data-person={x.person.id}><a href={`#/v25/people?p=${x.person.id}`}>{x.person.name}</a> <span className="ui-meta">{x.person.org} · {x.jobs} job{x.jobs === 1 ? '' : 's'} · {x.layers.map((l) => LAYER_LABEL[l]).join(', ')} · last {x.last.slice(0, 10)}</span></li>)}</ul> : <p className="ui-muted">No service job has been worked here.</p>}</div>
        <div><h4 className="ui-meta">Roles on its record ({t.roles.length})</h4>
          {t.roles.length ? <ul className="plain">{t.roles.map((x) => <li key={x.role} data-testid="wt-role"><Tag tone="muted">{personaLabel(x.role)}</Tag> <span className="ui-meta">{x.steps} step{x.steps === 1 ? '' : 's'} · last {x.last.slice(0, 10)}</span></li>)}</ul> : <p className="ui-muted">No steps recorded.</p>}</div>
      </div>
    </Card>
  );
}
