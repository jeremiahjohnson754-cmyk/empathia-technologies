import { DIAGRAMS, SOURCES } from '../data/generated';
import { href, useRoute } from '../lib/router';

function Code({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <pre className="code" tabIndex={0} aria-label="Source code">
      {lines.map((l, i) => <div key={i}><span className="ln">{i + 1}</span>{l || ' '}</div>)}
    </pre>
  );
}

export function Architecture() {
  const r = useRoute();
  const tab = r.sub || 'diagrams';
  const file = SOURCES.find((s) => s.id === r.params.get('file')) || SOURCES[0];
  const dia = DIAGRAMS.find((d) => d.id === r.params.get('d')) || DIAGRAMS[0];
  return (
    <>
      <div className="page-head">
        <h1>Architecture Explorer</h1>
        <p>How the pieces connect today and in the production design — and the actual source code behind the parts a CTO asks about first.</p>
      </div>
      <nav className="tabs" aria-label="Architecture views">
        <a href={href('architecture', 'diagrams')} aria-current={tab === 'diagrams' ? 'page' : undefined}>Diagrams</a>
        <a href={href('architecture', 'source')} aria-current={tab === 'source' ? 'page' : undefined}>Actual source code</a>
      </nav>
      {tab === 'diagrams' && dia && (
        <div className="doc-layout">
          <nav className="doc-index panel pad" aria-label="Diagrams">
            {DIAGRAMS.map((d) => <a key={d.id} href={href('architecture', 'diagrams', { d: d.id })} aria-current={dia.id === d.id ? 'page' : undefined}>{d.title}</a>)}
          </nav>
          <div className="stack">
            <h2>{dia.title}</h2>
            <p className="muted">{dia.about}</p>
            <div className="diagram" dangerouslySetInnerHTML={{ __html: dia.svg }} />
            <details><summary>Editable Mermaid source (<code>{dia.source}</code>)</summary><Code text={dia.mermaid} /></details>
          </div>
        </div>
      )}
      {tab === 'source' && file && (
        <div className="doc-layout">
          <nav className="doc-index panel pad" aria-label="Source files">
            {SOURCES.map((s) => <a key={s.id} href={href('architecture', 'source', { file: s.id })} aria-current={file.id === s.id ? 'page' : undefined}>{s.title}<br /><span className="faint mono" style={{ fontSize: 11 }}>{s.path.split('/').slice(-2).join('/')}</span></a>)}
          </nav>
          <div className="stack">
            <h2>{file.title}</h2>
            <p className="muted">{file.why}</p>
            <dl className="kv"><dt>Path</dt><dd className="mono">{file.path}</dd><dt>Language</dt><dd>{file.language}</dd><dt>Lines</dt><dd className="num">{file.lines}</dd><dt>SHA-256</dt><dd className="mono" style={{ fontSize: 11 }}>{file.sha256}</dd></dl>
            <Code text={file.content} />
          </div>
        </div>
      )}
    </>
  );
}
