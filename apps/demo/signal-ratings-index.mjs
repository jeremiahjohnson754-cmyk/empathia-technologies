// The data the SIGNAL ratings engine reads (apps/demo/src/signal/ratings.ts), cut from the build package's content bundle: each
// decision's season, dimensions, severity, question and which options are canonical or failing; the season and tier of every piece;
// titles for the notes; drill kinds and domains. Used by the demo build (signal/ratings.json) and by the unit tests.
export function buildRatingsIndex(app) {
  const dec = {};
  for (const [cid, list] of Object.entries(app.decisionIndex)) for (const d of list) {
    dec[d.id] = { cid, se: Number(cid.slice(1, 3)), dims: d.dims || [], sev: d.sev || 1, q: d.q, opts: Object.fromEntries(Object.entries(d.opts || {}).map(([k, o]) => [k, { ...(o.canonical ? { c: 1 } : {}), ...(o.fail ? { f: 1 } : {}) }])) };
  }
  const pick = (bag) => Object.fromEntries(Object.entries(bag || {}).map(([id, x]) => [id, x.title || id]));
  return { dec, seasonOf: app.seasonOf, tierOf: app.tierOf, titles: { quiz: pick(app.quizzes), drill: pick(app.drills), lab: pick(app.labs), incident: pick(app.incidents), meltdown: pick(app.meltdowns) },
    drillKind: Object.fromEntries(Object.entries(app.drills).map(([id, d]) => [id, { type: d.type, domain: d.domain }])) };
}
