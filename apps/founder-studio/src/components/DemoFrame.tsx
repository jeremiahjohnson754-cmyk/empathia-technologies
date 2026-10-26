import { useEffect, useRef, useState } from 'react';
import { FOUNDER_EDITION, openAs, sameOrigin, inspectTypes, inspectRecords, currentPersona } from '../lib/demo';
import { useStudio } from '../lib/store';

const PERSONAS: Array<[string, string]> = [
  ['architect', 'Product Architect (everything)'], ['designer', 'Designer'], ['syseng', 'Systems Engineer'], ['cxeng', 'Commissioning Engineer'],
  ['qa_reviewer', 'QA reviewer'], ['opslead', 'Operations Lead'], ['svcmgr', 'Service Manager'], ['service', 'Service Technician'],
  ['exec', 'Executive'], ['finance', 'Finance'], ['requestor', 'Requestor / Employee'], ['steward', 'Data Steward'], ['secadmin', 'Security Admin'],
];

/** The live Founder Edition in a frame, opened on a route as a persona, with a read-only inspector. */
export function DemoFrame({ routes, persona, title }: { routes: string[]; persona: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const st = useStudio();
  const [route, setRoute] = useState(routes[0]!);
  const [who, setWho] = useState(persona);
  const [msg, setMsg] = useState('Starting the demonstrator…');
  const [inspect, setInspect] = useState(false);
  const [counts, setCounts] = useState<Array<{ type: string; count: number }>>([]);
  const [events, setEvents] = useState(0);
  const [sel, setSel] = useState<string>('');
  const [src] = useState(`${FOUNDER_EDITION}${routes[0]}`);   // set once: later routes navigate inside the same page, without a reload

  const open = async (r: string, p: string) => {
    setRoute(r); setWho(p);
    if (!sameOrigin(ref)) { if (ref.current) ref.current.src = `${FOUNDER_EDITION}${r}`; setMsg('Opened from disk: switch persona inside the page (Persona) — the launcher enables automatic switching.'); return; }
    setMsg(await openAs(ref, r, st.demoPersonaSwitch ? p : null));
  };
  useEffect(() => { const t = setTimeout(() => { void open(routes[0]!, persona); }, 50); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [routes.join('|'), persona]);
  const refresh = () => { const r = inspectTypes(ref); setCounts(r.rows); setEvents(r.events); setMsg(`Inspector: persona ${currentPersona(ref) ?? 'unknown'}; counts read through the page’s sealed read-only facade.`); };

  return (
    <div className="stack">
      <div className="demo">
        <div className="demo-bar">
          <label className="sr-only" htmlFor="demo-route">Page</label>
          <select id="demo-route" value={route} onChange={(e) => void open(e.target.value, who)}>
            {routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="sr-only" htmlFor="demo-persona">Persona</label>
          <select id="demo-persona" value={who} onChange={(e) => void open(route, e.target.value)}>
            {PERSONAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <button className="btn" type="button" onClick={() => void open(route, who)}>Reopen</button>
          <button className="btn" type="button" aria-pressed={inspect} onClick={() => { setInspect(!inspect); refresh(); }}>Inspect data</button>
          <a className="btn" href={`${FOUNDER_EDITION}${route}`} target="_blank" rel="noopener">Open full screen</a>
          <span className="demo-msg" role="status" aria-live="polite">{msg}</span>
        </div>
        <iframe ref={ref} title={`${title} — Founder Edition demonstrator`} src={src} />
      </div>
      {inspect && (
        <div className="panel pad stack" aria-label="Data inspector">
          <div className="row"><h3>Data inspector</h3><span className="chip plain">read-only</span><span className="faint num">{events} events in the page’s ledger</span><button className="btn" type="button" onClick={refresh}>Refresh</button></div>
          {counts.length === 0 ? <p className="muted">Inspection needs the studio launcher (same origin). Opened from disk, the page’s data stays inside the page.</p> : (
            <div className="row">
              {counts.map((c) => (
                <button key={c.type} type="button" className="chip plain" aria-pressed={sel === c.type} onClick={() => setSel(c.type)}>
                  {c.type} <b className="num">{c.count < 0 ? 'n/a' : c.count}</b>
                </button>
              ))}
            </div>
          )}
          {sel && <pre className="code">{JSON.stringify(inspectRecords(ref, sel, 20), null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
