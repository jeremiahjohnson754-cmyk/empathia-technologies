import { EVIDENCE_MEANING, EVIDENCE_STATES, PRODUCTS } from '../data/products';
import { DESTINATIONS } from '../nav';
import { href } from '../lib/router';

const mark = { YES: '●', PARTIAL: '◐', NO: '○' } as const;

export function Maturity() {
  const exportCsv = () => {
    const head = ['id', 'product', 'group', ...EVIDENCE_STATES, 'recorded_state', 'proof', 'builder_suites_passed', 'builder_suites', 'acceptance'];
    const rows = PRODUCTS.map((p) => [p.id, p.name, p.group, ...EVIDENCE_STATES.map((s) => p.ladder[s]), p.state, p.proof, p.builderSuites?.passed ?? '', p.builderSuites?.suites ?? '', p.acceptance]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'empathia-product-maturity.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="page-head">
        <h1>Product maturity</h1>
        <p>Eighteen products against the eight evidence states. ● achieved, ◐ partly, ○ not achieved. No percentage is computed: readiness is not a number until each rung has its own acceptance criteria.</p>
      </div>
      <div className="row"><button className="btn" type="button" onClick={exportCsv}>Export as CSV</button></div>
      <div className="panel table-wrap">
        <table className="ledger">
          <thead><tr><th scope="col">Product</th>{EVIDENCE_STATES.map((s) => <th key={s} scope="col" title={EVIDENCE_MEANING[s]} style={{ textAlign: 'center' }}>{s.replace(/_/g, ' ').toLowerCase()}</th>)}<th scope="col">Builder suites</th></tr></thead>
          <tbody>
            {PRODUCTS.map((p) => (
              <tr key={p.id}>
                <td className="name"><a href={href(DESTINATIONS.find((d) => d.product === p.slug)?.path || 'maturity')}>{p.name}</a><div className="faint" style={{ fontSize: 12 }}>{p.state}</div></td>
                {EVIDENCE_STATES.map((s) => <td key={s} style={{ textAlign: 'center' }} aria-label={`${s}: ${p.ladder[s]}`}>{mark[p.ladder[s]]}</td>)}
                <td className="num faint">{p.builderSuites ? `${p.builderSuites.passed}/${p.builderSuites.suites}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cols-2">
        {EVIDENCE_STATES.map((s) => <div key={s} className="panel pad stack"><b>{s.replace(/_/g, ' ').toLowerCase()}</b><p className="muted">{EVIDENCE_MEANING[s]}</p></div>)}
      </div>
      <div className="notice"><p className="muted">Sources: the builder’s capability register for 2.5.2 (<code>Empathia_V25/release/v2.5.2/PRODUCT_CAPABILITY_REGISTER.csv</code>), the 2.5.3 rc3 release report, and this program’s own tests. Builder suites are counted from that register. One correction is recorded on the Onboard page; the frozen register is not edited.</p></div>
    </>
  );
}
