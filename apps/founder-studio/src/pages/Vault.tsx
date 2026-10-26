import { VAULT, DOCS } from '../data/generated';
import { href } from '../lib/router';

const CLASSES: Array<[string, string]> = [
  ['PUBLIC', 'May be published.'],
  ['INVESTOR_DISCLOSABLE', 'May be shown to investors once distribution is approved.'],
  ['CONFIDENTIAL_TECHNICAL', 'Technical diligence under NDA only.'],
  ['INTERNAL_ONLY', 'Founder and employees only.'],
  ['RESTRICTED_IP', 'The source vault and invention records: founder and counsel.'],
  ['THIRD_PARTY_LICENSED', 'Owned by others, used under a licence; redistribution follows that licence.'],
];

export function Vault() {
  return (
    <>
      <div className="page-head">
        <h1>IP &amp; provenance vault</h1>
        <p>An organized, factual record for counsel, investors or an acquirer to examine authorship, ownership and software provenance. It does not itself grant, prove or register any right.</p>
      </div>
      <div className="notice warn"><p className="muted">Attorney-review material. Most of this work was produced by an AI system (Claude) working under your direction; the records say so rather than presenting it as human-authored. Questions of ownership, copyrightability of AI-assisted work, inventorship and the origin of founder-supplied inputs are flagged for qualified legal review, not answered here.</p></div>
      <div className="panel table-wrap">
        <table className="ledger">
          <thead><tr><th>Record</th><th>Classification</th><th>Status</th><th>Where</th></tr></thead>
          <tbody>
            {VAULT.map((v) => {
              const doc = DOCS.find((d) => d.path === v.path);
              return (
                <tr key={v.id}>
                  <td className="name">{doc ? <a href={href('docs', doc.id)}>{v.title}</a> : <b>{v.title}</b>}<div className="faint" style={{ fontSize: 12 }}>{v.about}</div></td>
                  <td><span className="chip plain">{v.classification}</span></td>
                  <td className="faint">{v.status}</td>
                  <td className="faint mono" style={{ fontSize: 11 }}>{v.path}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="cols-3" aria-label="Classification scheme">
        {CLASSES.map(([k, v]) => <div className="panel pad stack" key={k}><b className="mono" style={{ fontSize: 12 }}>{k}</b><p className="muted">{v}</p></div>)}
      </section>
    </>
  );
}
