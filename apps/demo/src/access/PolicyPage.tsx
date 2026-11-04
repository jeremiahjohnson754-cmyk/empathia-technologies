/** The policy page: who may open each native page, see each section and use each action — read from the policy, never edited here. */
import { Notice } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { PAGES } from '../registry.pages.js';
import { ROLES, ROLE_KEYS, rolesFor, describe } from './policy.js';

export function PolicyPage({ role }: PageProps) {
  const rows = PAGES.flatMap((p) => [
    { kind: 'Page', id: p.id, label: p.title, a: p.authority },
    ...(p.sections || []).map((s) => ({ kind: 'Section', id: s.id, label: `${p.title} › ${s.label}`, a: { all: [p.authority, s.authority] } })),
    ...(p.actions || []).map((s) => ({ kind: 'Action', id: s.id, label: `${p.title} › ${s.label}`, a: { all: [p.authority, s.authority] } })),
  ]);
  return (
    <section aria-labelledby="pol-h">
      <p className="kicker">Policy</p>
      <h1 id="pol-h">Who may open, see and do what</h1>
      <p className="lead">One policy decides every page, section and button of this demonstration, ported from V2.5.3's role model. Anything it does not name is refused. Acting as <b>{ROLES[role].label}</b>.</p>
      <Notice tone="info">A demonstration of authorization, not security: the whole synthetic model is in this page. The authenticated application's server decides real access, least privilege, on its own.</Notice>
      <div className="ui-table-wrap policy-table"><table className="ui-table ui-table--dense">
        <caption className="ui-sr">Surfaces by role: a check means the role may use it</caption>
        <thead><tr><th scope="col">Surface</th><th scope="col">Authority</th>{ROLE_KEYS.map((k) => <th key={k} scope="col" title={ROLES[k].label}><abbr title={ROLES[k].label}>{ROLES[k].initials}</abbr></th>)}</tr></thead>
        <tbody>{rows.map((r) => { const who = rolesFor(r.a); return (
          <tr key={`${r.kind}:${r.id}:${r.label}`}><th scope="row"><span className="ui-meta">{r.kind}</span> {r.label}</th><td className="ui-meta">{describe(r.a)}</td>
            {ROLE_KEYS.map((k) => <td key={k} className={k === role ? 'policy-me' : undefined}>{who.includes(k) ? <span aria-label="yes">✓</span> : <span className="ui-muted" aria-label="no">·</span>}</td>)}</tr>); })}</tbody>
      </table></div>
    </section>
  );
}
