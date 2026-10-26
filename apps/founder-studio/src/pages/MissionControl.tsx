import { PRODUCTS, type Product } from '../data/products';
import { DESTINATIONS } from '../nav';
import { BUILD, FILMS_DATA, RELEASES } from '../data/generated';
import { href } from '../lib/router';
import { Ladder } from '../components/Ladder';

const destOf = (p: Product) => DESTINATIONS.find((d) => d.product === p.slug)?.path ?? 'maturity';

function Ledger({ items, caption }: { items: Product[]; caption: string }) {
  return (
    <div className="panel table-wrap">
      <table className="ledger">
        <caption className="sr-only">{caption}</caption>
        <thead><tr><th scope="col">Product</th><th scope="col">What it does</th><th scope="col">Evidence</th><th scope="col">Builder suites</th></tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="name"><a href={href(destOf(p))}>{p.name}</a></td>
              <td className="pitch">{p.pitch}</td>
              <td><Ladder ladder={p.ladder} /></td>
              <td className="num faint">{p.builderSuites ? `${p.builderSuites.passed} / ${p.builderSuites.suites}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MissionControl() {
  const films = FILMS_DATA.filter((f) => f.found).length;
  const rc3 = RELEASES.packages.find((p) => p.package === 'Empathia_Investor_Release_253_rc3');
  return (
    <>
      <div className="page-head">
        <h1>Everything Empathia has actually built, in one place.</h1>
        <p>Eighteen products, the room builder, the films and the engineering record. Each product carries its evidence ladder: what is specified, built, demonstrated and tested — and the four rungs no product has reached yet.</p>
      </div>

      <div className="status-band" role="list" aria-label="Release and security status">
        <div role="listitem"><span className="label">Frozen releases</span><span className={`value ${RELEASES.result === 'PASS' ? '' : 'bad'}`}>{RELEASES.result === 'PASS' ? `${RELEASES.packages.length} packages unchanged` : 'CHANGED — see Settings'}</span><span className="faint">checked {RELEASES.checkedAt.slice(0, 10)}</span></div>
        <div role="listitem"><span className="label">Current candidate</span><span className="value">2.5.3 rc3</span><span className="faint mono">{rc3 ? Object.values(rc3.editions)[0]?.slice(0, 12) : ''}…</span></div>
        <div role="listitem"><span className="label">Page-API security</span><span className="value"><span className="chip warn">NOT VERIFIED</span></span><span className="faint">external test required</span></div>
        <div role="listitem"><span className="label">Distribution</span><span className="value"><span className="chip bad">not authorized</span></span><span className="faint">needs your written approval</span></div>
      </div>

      <section className="stack" aria-labelledby="starts">
        <h2 id="starts">Start here</h2>
        <div className="starts">
          <a className="start" href={href('scenarios', 'townhall')}><b>Build a town hall</b><span>The full journey: drawings, a camera swap, commissioning, Search Party, Pro and an issue.</span></a>
          <a className="start" href={href('media', 'FL')}><b>Watch the flagship film</b><span>{films} of {FILMS_DATA.length} finished films are on this computer.</span></a>
          <a className="start" href={href('build-a-room', 'lab')}><b>Run the commissioning engine</b><span>Change a room and watch 94 test definitions re-judged, in your browser.</span></a>
          <a className="start" href={href('architecture', 'source')}><b>Read the actual source</b><span>The room classifier, the applicability algorithm, the evidence schema and the CSS.</span></a>
        </div>
      </section>

      <section className="stack" aria-labelledby="seven">
        <div className="row" style={{ justifyContent: 'space-between' }}><h2 id="seven">The seven operational products</h2><span className="faint">first commercial priority</span></div>
        <Ledger items={PRODUCTS.filter((p) => p.group === 'operational')} caption="The seven operational products" />
      </section>
      <section className="stack" aria-labelledby="eleven">
        <h2 id="eleven">The eleven expansion products</h2>
        <Ledger items={PRODUCTS.filter((p) => p.group === 'expansion')} caption="The eleven expansion products" />
      </section>

      <div className="notice">
        <p className="muted">
          The evidence ladder, left to right: specified · implemented · demonstrated · builder-tested · independently audited · hardware-verified · production-validated · customer-validated.
          Filled means achieved, hatched means partly, empty means not achieved. The 2.5.x reviews were carried out by a separate AI reviewer, so “independently audited” is not claimed for any product.
          Founder Edition: {BUILD.founderEdition ? <>development build of branch <code>{BUILD.founderEdition.branch}</code> at <code>{BUILD.founderEdition.sourceCommit}</code> — not a release candidate.</> : 'not found in this build.'}
        </p>
      </div>
    </>
  );
}
