import { useState } from 'react';
import { SCENARIOS } from '../data/scenarios';
import { DemoFrame } from '../components/DemoFrame';
import { href, useRoute } from '../lib/router';
import { update, useStudio } from '../lib/store';

export function Scenarios() {
  const r = useRoute();
  const st = useStudio();
  const sc = SCENARIOS.find((s) => s.id === r.sub);
  const [i, setI] = useState(0);
  if (!sc) {
    return (
      <>
        <div className="page-head"><h1>Interactive scenarios</h1><p>Journeys through the real pages of the Founder Edition. Each step opens the right page as the right persona; you do the work with the page’s own controls.</p></div>
        <div className="cols-2">
          {SCENARIOS.map((s) => {
            const done = (st.scenario[s.id] || []).length;
            return (
              <a key={s.id} className="start" href={href('scenarios', s.id)}>
                <b>{s.title}</b><span>{s.why}</span>
                <span className="faint num">{s.steps.length} steps · about {s.minutes} min · {done ? `${done} done` : 'not started'}</span>
              </a>
            );
          })}
        </div>
      </>
    );
  }
  const done = st.scenario[sc.id] || [];
  const step = sc.steps[Math.min(i, sc.steps.length - 1)]!;
  const mark = (k: number) => update((s) => { const d = new Set(s.scenario[sc.id] || []); if (d.has(k)) d.delete(k); else d.add(k); return { ...s, scenario: { ...s.scenario, [sc.id]: [...d].sort((a, b) => a - b) } }; });
  const exportRun = () => {
    const report = { scenario: sc.id, title: sc.title, exportedAt: new Date().toISOString(), steps: sc.steps.map((s, k) => ({ n: k + 1, title: s.title, route: s.route, persona: s.persona, markedDone: done.includes(k), automatedCheck: s.verify || null })), note: 'Steps marked done by the founder in the Founder Studio. A mark is a personal note, not test evidence; the automated checks named are the evidence.' };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); a.download = `scenario-${sc.id}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="page-head">
        <a href={href('scenarios')} className="faint">← All scenarios</a>
        <h1>{sc.title}</h1>
        <p>{sc.why}</p>
      </div>
      <div className="split" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
        <DemoFrame routes={[step.route]} persona={step.persona} title={sc.title}/>
        <div className="panel pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}><b className="num">{done.length} of {sc.steps.length} done</b><button className="btn" type="button" onClick={exportRun}>Export this run</button></div>
          <ol className="steps">
            {sc.steps.map((s, k) => (
              <li key={s.title} className={`step${done.includes(k) ? ' done' : ''}${k === i ? ' active' : ''}`}>
                <div>
                  <button type="button" className="btn" style={{ padding: 0, border: 0, background: 'none', textAlign: 'left', whiteSpace: 'normal' }} onClick={() => setI(k)} aria-current={k === i ? 'step' : undefined}><b>{s.title}</b></button>
                  {k === i && (<><p>{s.doThis}</p><p className="look">Look for: {s.lookFor}</p>{s.verify && <p className="faint">Automated check: <code>{s.verify}</code></p>}<p className="faint">As <code>{s.persona}</code> on <code>{s.route}</code></p></>)}
                </div>
                <label className="check"><input type="checkbox" checked={done.includes(k)} onChange={() => mark(k)} /><span className="sr-only">Mark “{s.title}” done</span></label>
              </li>
            ))}
          </ol>
          <div className="row"><button className="btn" type="button" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button><button className="btn primary" type="button" disabled={i >= sc.steps.length - 1} onClick={() => setI(i + 1)}>Next step</button></div>
        </div>
      </div>
    </>
  );
}
