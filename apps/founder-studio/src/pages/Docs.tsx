import { useState } from 'react';
import { DOCS } from '../data/generated';
import { href, useRoute } from '../lib/router';

export function Docs() {
  const r = useRoute();
  const [q, setQ] = useState('');
  const doc = DOCS.find((d) => d.id === r.sub);
  const groups = [...new Set(DOCS.map((d) => d.group))];
  const match = (t: string) => !q || t.toLowerCase().includes(q.toLowerCase());
  return (
    <>
      <div className="page-head">
        <h1>Engineering documentation</h1>
        <p>{DOCS.length} documents: the blueprint a software team needs to continue without this conversation — product, architecture, data, API, algorithms, frontend, QA and security, operations and execution.</p>
      </div>
      <div className="doc-layout">
        <nav className="doc-index panel pad" aria-label="Documents">
          <input className="field" placeholder="Filter documents" aria-label="Filter documents" value={q} onChange={(e) => setQ(e.target.value)} />
          {groups.map((g) => {
            const items = DOCS.filter((d) => d.group === g && match(`${d.title} ${d.path}`));
            if (!items.length) return null;
            return (
              <div key={g}>
                <div className="faint" style={{ fontSize: 12, padding: '6px 8px 2px' }}>{g}</div>
                {items.map((d) => <a key={d.id} href={href('docs', d.id)} aria-current={doc?.id === d.id ? 'page' : undefined}>{d.title}</a>)}
              </div>
            );
          })}
        </nav>
        {doc ? (
          <article className="panel pad stack">
            <div className="row"><span className="chip plain">{doc.classification}</span><span className="faint mono" style={{ fontSize: 11 }}>{doc.path}</span><span className="faint num">{doc.words.toLocaleString()} words</span></div>
            <div className="doc" dangerouslySetInnerHTML={{ __html: doc.html }} />
            <p className="faint mono" style={{ fontSize: 11 }}>sha256 {doc.sha256}</p>
          </article>
        ) : (
          <div className="panel pad stack"><p className="muted">Choose a document. Start with <a href={href('docs', DOCS.find((d) => /START|README|INDEX/i.test(d.title))?.id || DOCS[0]?.id || '')}>the index</a>.</p></div>
        )}
      </div>
    </>
  );
}
