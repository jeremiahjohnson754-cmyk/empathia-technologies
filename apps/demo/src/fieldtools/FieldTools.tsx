/**
 * #/field-tools[/<tool>] — Field Tools (founder, 18 Nov 2026): the calculators service technicians, systems engineers, installers,
 * commissioning engineers and project managers reach for on site, one jump from anywhere. Not to be confused with Commissioning: these
 * answer arithmetic; Commissioning records evidence, and nothing calculated here is a measurement, a test result or an approval.
 *
 * Every result updates as the inputs change, shows its working (the formula, then the numbers substituted), says what it rests on, and
 * draws itself where the quantity has a shape. A calculation can be copied as text, linked with its inputs, or kept in a job on this
 * device. Inputs travel in the link's query (#/field-tools/subnet?ip=10.0.0.1&p=24); nothing is sent anywhere.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { CATEGORIES, TOOLS, toolById, defaults, search, report, type Category, type Tool, type Value, type Result } from './calc.js';
import { Diagram } from './Diagram.js';
import { browserStore, loadJobs, saveJobs, addJob, addEntry, removeEntry, removeJob, jobReport, loadRecent, pushRecent, type Job, type JobEntry } from './jobs.js';

const CAT_ICON: Record<Category, Parameters<typeof Icon>[0]['name']> = { display: 'display', projection: 'display', led: 'grid', signal: 'pulse', audio: 'speaker', acoustics: 'mic', power: 'power', rigging: 'link', network: 'network', cabling: 'route', lighting: 'sun', project: 'users', convert: 'undo' };
const FEATURED = ['projector-lumens', 'video-bandwidth', 'ceiling-speakers', 'subnet', 'watts-amps', 'two-leg-bridle'];
const TONE_WORD = { ok: 'OK', warn: 'Check', bad: 'Not OK', muted: '' } as const;

const href = (t: string, v?: Record<string, Value>) => `#/field-tools/${t}${v ? `?${new URLSearchParams(Object.entries(v).map(([k, x]) => [k, String(x)])).toString()}` : ''}`;
function safeRun(t: Tool, v: Record<string, Value>): Result { try { return t.run(v); } catch { return { outputs: [{ label: 'Result', value: 'These inputs do not give a result: check each one.', tone: 'bad' }], worked: [], warnings: [] }; } }
const headline = (r: Result) => { const k = r.outputs.find((o) => o.key) || r.outputs[0]; return k ? `${k.label}: ${k.value}` : ''; };

async function copyText(text: string, fallback: HTMLTextAreaElement | null): Promise<string> {
  try { await navigator.clipboard.writeText(text); return 'Copied.'; }
  catch { if (fallback) { fallback.value = text; fallback.hidden = false; fallback.focus(); fallback.select(); } return 'This browser refused the clipboard: the text is selected below, copy it from there.'; }
}

export default function FieldTools({ params, query }: PageProps) {
  const store = useMemo(() => browserStore(), []);
  const tool = params.tool ? toolById(params.tool) : null;
  const [q, setQ] = useState(''); const [cat, setCat] = useState<Category | ''>('');
  const [recent, setRecent] = useState<string[]>(() => loadRecent(store));
  const [jobs, setJobsState] = useState<Job[]>(() => loadJobs(store)); const [active, setActive] = useState<string>(() => loadJobs(store)[0]?.id || '');
  const setJobs = (j: Job[]) => { setJobsState(j); saveJobs(store, j); };
  useEffect(() => { if (tool) setRecent(pushRecent(store, tool.id)); }, [tool?.id]);   // eslint-disable-line react-hooks/exhaustive-deps
  const list = search(q, cat);
  const grouped = CATEGORIES.map((c) => ({ c, tools: list.filter((t) => t.category === c.id) })).filter((g) => g.tools.length);

  return <section className="ft" data-native="" data-testid="field-tools" data-open={tool ? 'tool' : 'index'} data-tool={tool?.id || ''}>
    <header className="ft-head">
      <div className="ft-head__t">
        <p className="ft-kicker"><span className="ft-mark" aria-hidden="true"><Icon name="wrench" size={16} /></span> Field Tools</p>
        <h1>{tool ? tool.title : 'The arithmetic of the site walk'}</h1>
        <p className="ft-lede">{tool ? tool.summary : `${TOOLS.length} calculators for the ceiling grid, the rack, the riser and the truss. Each one shows its working and says what it rests on. Not Commissioning: nothing here is a measurement or a test result.`}</p>
      </div>
      <div className="ft-find" role="search">
        <label className="ft-search"><Icon name="search" size={18} /><span className="ui-sr">Find a calculator</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} placeholder="Find a calculator: throw, subnet, 70 V…" data-testid="ft-search" /></label>
        <div className="ft-cats" role="group" aria-label="Category">
          <button type="button" className="ft-cat" aria-pressed={cat === ''} onClick={() => setCat('')}>All <span>{TOOLS.length}</span></button>
          {CATEGORIES.map((c) => <button key={c.id} type="button" className="ft-cat" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? '' : c.id)} data-cat={c.id} title={c.blurb}>{c.label} <span>{TOOLS.filter((t) => t.category === c.id).length}</span></button>)}
        </div>
      </div>
    </header>

    <div className="ft-body">
      <nav className="ft-list" aria-label="Calculators" data-testid="ft-list">
        {tool && <a className="ft-back" href="#/field-tools"><Icon name="grid" size={16} /> All calculators</a>}
        {recent.length > 0 && !q && !cat && <div className="ft-group"><h2>Recent</h2><ul>{recent.map((id) => { const t = toolById(id); return t ? <li key={id}><a href={href(id)} aria-current={tool?.id === id ? 'page' : undefined}>{t.title}</a></li> : null; })}</ul></div>}
        {grouped.length ? grouped.map(({ c, tools }) => <div key={c.id} className="ft-group" data-cat={c.id}>
          <h2><Icon name={CAT_ICON[c.id]} size={14} /> {c.label}</h2>
          <ul>{tools.map((t) => <li key={t.id}><a href={href(t.id)} aria-current={tool?.id === t.id ? 'page' : undefined} data-tool={t.id}>{t.title}</a></li>)}</ul>
        </div>) : <p className="ft-none" role="status">No calculator matches “{q}”. Try a quantity (lumens, amps, dB) or a task (throw, subnet).</p>}
      </nav>

      <div className="ft-main">
        {tool ? <ToolView key={tool.id} tool={tool} query={query} jobs={jobs} active={active} setActive={setActive} setJobs={setJobs} store={!!store} />
          : params.tool ? <div className="ft-panel" role="alert"><h2>No calculator called “{params.tool}”</h2><p>Pick one from the list, or search for it.</p></div>
            : <Welcome />}
      </div>

      <Jobs jobs={jobs} active={active} setActive={setActive} setJobs={setJobs} store={!!store} />
    </div>
  </section>;
}

function Welcome() {
  return <div className="ft-welcome" data-testid="ft-welcome">
    <ul className="ft-featured">{FEATURED.map((id) => { const t = toolById(id)!; return <li key={id}><a href={href(id)} data-tool={id}>
      <span className="ft-featured__c"><Icon name={CAT_ICON[t.category]} size={16} /> {CATEGORIES.find((c) => c.id === t.category)!.label}</span>
      <b>{t.title}</b><span>{t.summary}</span><code>{t.formula[0]}</code></a></li>; })}</ul>
    <div className="ft-panel ft-how">
      <h2>How these work</h2>
      <p>Change any input and every result, the working and the drawing follow at once. Each calculator names the formula, substitutes your numbers into it, and says what it rests on, so you can check it by hand or explain it to a client.</p>
      <p>Keep calculations together in a <b>job</b> for one site visit and copy the job out as text for a crew message or a ticket. Jobs stay in this browser: nothing is sent, and nothing here becomes a record of the room.</p>
      <p className="ft-fine">Estimates from standard physics and long-published practice. Verify against the manufacturer’s data, AVIXA standards and the codes that apply where you work. Electrical, rigging and structural work is designed and approved by the qualified people it belongs to.</p>
    </div>
  </div>;
}

function Field({ f, value, set }: { f: Tool['fields'][number]; value: Value; set: (v: Value) => void }) {
  const id = `ft-in-${f.id}`;
  return <div className="ft-field">
    <label htmlFor={id}>{f.label}</label>
    {f.kind === 'select'
      ? <select id={id} value={String(value)} onChange={(e) => set(e.target.value)} data-field={f.id}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      : <span className="ft-input"><input id={id} type={f.kind === 'text' ? 'text' : 'text'} inputMode={f.kind === 'text' ? 'text' : 'decimal'} value={String(value)} onChange={(e) => set(e.target.value)} data-field={f.id}
          onKeyDown={(e) => { if (f.kind === 'text' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault(); const step = (f.step ?? 1) * (e.shiftKey ? 10 : 1); const x = Number(value) || 0; let y = +(x + (e.key === 'ArrowUp' ? step : -step)).toFixed(6); if (f.min !== undefined) y = Math.max(f.min, y); if (f.max !== undefined) y = Math.min(f.max, y); set(y); }}
          aria-describedby={f.help ? `${id}-h` : undefined} />{f.unit && <span className="ft-unit">{f.unit}</span>}</span>}
    {f.help && <p id={`${id}-h`} className="ft-help">{f.help}</p>}
  </div>;
}

function ToolView({ tool, query, jobs, active, setActive, setJobs, store }: { tool: Tool; query: URLSearchParams; jobs: Job[]; active: string; setActive: (s: string) => void; setJobs: (j: Job[]) => void; store: boolean }) {
  const init = () => { const d = defaults(tool); for (const f of tool.fields) { const x = query.get(f.id); if (x !== null && x.length <= 60) d[f.id] = f.kind === 'select' ? (f.options!.some((o) => o.value === x) ? x : d[f.id]!) : x; } return d; };
  const [v, setV] = useState<Record<string, Value>>(init); const [note, setNote] = useState(''); const [said, setSaid] = useState(''); const fallback = useRef<HTMLTextAreaElement>(null);
  const r = useMemo(() => safeRun(tool, v), [tool, v]);
  const keys = r.outputs.filter((o) => o.key); const rest = r.outputs.filter((o) => !o.key);
  const cat = CATEGORIES.find((c) => c.id === tool.category)!;
  const save = () => { const res = addEntry(jobs, active, { tool: tool.id, values: v, headline: headline(r), note }); if (res.refused) { setSaid(res.refused); return; } setJobs(res.jobs); setNote(''); setSaid(`Kept in “${jobs.find((j) => j.id === active)?.name}”${store ? ' on this device' : ' until this tab closes (this browser refuses storage)'}.`); };
  return <article className="ft-tool" data-testid="ft-tool" data-tool={tool.id}>
    <div className="ft-tool__meta"><span className="ft-chip"><Icon name={CAT_ICON[tool.category]} size={14} /> {cat.label}</span>
      {tool.cts?.map((c) => <a key={c} className="ft-chip ft-chip--cert" href={`#/learn/${c.toLowerCase()}`} title={`Where this sits in the ${c} study space`}>{c}</a>)}</div>

    <div className="ft-grid">
      <form className="ft-panel ft-inputs" onSubmit={(e) => e.preventDefault()} aria-label="Inputs" data-testid="ft-inputs">
        <h2>Inputs</h2>
        <div className="ft-fields">{tool.fields.map((f) => <Field key={f.id} f={f} value={v[f.id]!} set={(x) => setV((o) => ({ ...o, [f.id]: x }))} />)}</div>
        <p className="ft-fine">Arrow keys step a number; Shift steps by ten.</p>
        <button type="button" className="ui-btn ui-btn--sm" onClick={() => setV(defaults(tool))} data-testid="ft-reset">Reset to the example</button>
      </form>

      <div className="ft-panel ft-results" aria-live="polite" data-testid="ft-results">
        <h2>Results</h2>
        <ul className="ft-keys">{keys.map((o) => <li key={o.label} className="ft-key" data-tone={o.tone || ''}><span>{o.label}</span><b>{o.value}</b>{o.tone && o.tone !== 'muted' ? <em>{TONE_WORD[o.tone]}{o.note ? `: ${o.note}` : ''}</em> : o.note ? <em className="ft-em-muted">{o.note}</em> : null}</li>)}</ul>
        {rest.length > 0 && <dl className="ft-rest">{rest.map((o) => <div key={o.label} data-tone={o.tone || ''}><dt>{o.label}</dt><dd>{o.value}{o.tone && o.tone !== 'muted' ? <span className="ft-tone">{TONE_WORD[o.tone]}</span> : null}{o.note ? <small>{o.note}</small> : null}</dd></div>)}</dl>}
        {r.warnings.length > 0 && <ul className="ft-warn">{r.warnings.map((w) => <li key={w}><Icon name="alert" size={14} /> {w}</li>)}</ul>}
        <Diagram tool={tool.id} v={v} />
      </div>
    </div>

    <details className="ft-panel ft-working" open data-testid="ft-working">
      <summary><h2>The working</h2></summary>
      <div className="ft-working__cols">
        <div><h3>Formula</h3><ul className="ft-formula">{tool.formula.map((f) => <li key={f}><code>{f}</code></li>)}</ul></div>
        <div><h3>With your numbers</h3><ol className="ft-steps">{r.worked.map((w, i) => <li key={i}><code>{w}</code></li>)}</ol></div>
      </div>
      <p className="ft-basis"><b>What it rests on.</b> {tool.basis}</p>
      {tool.caution && <p className="ft-caution" role="note"><Icon name="shield" size={16} /> {tool.caution}</p>}
    </details>

    <LearnIt tool={tool} />

    <div className="ft-panel ft-keep" data-testid="ft-keep">
      <h2>Keep or share it</h2>
      <div className="ft-keep__row">
        <button type="button" className="ui-btn ui-btn--sm" data-testid="ft-copy" onClick={async () => setSaid(await copyText(report(tool, v, r, note), fallback.current))}>Copy the report</button>
        <button type="button" className="ui-btn ui-btn--sm" data-testid="ft-link" onClick={async () => setSaid(await copyText(`${location.origin}${location.pathname}${href(tool.id, v)}`, fallback.current))}>Copy a link with these inputs</button>
      </div>
      <label className="ft-field ft-note"><span>Note for the job (optional)</span><input type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rack B, second shelf" data-testid="ft-note" /></label>
      <div className="ft-keep__row">
        {jobs.length ? <><label className="ft-field ft-jobpick"><span>Job</span><select value={active} onChange={(e) => setActive(e.target.value)} data-testid="ft-jobpick">{jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}</select></label>
          <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={save} data-testid="ft-save" disabled={!active}>Save to the job</button></>
          : <p className="ft-fine">Start a job in the Jobs panel to keep calculations together.</p>}
      </div>
      {said && <p className="ft-said" role="status" data-testid="ft-said">{said}</p>}
      <textarea ref={fallback} className="ft-fallback" hidden readOnly aria-label="Text to copy" />
    </div>
  </article>;
}

/** where this arithmetic is studied: the certification questions that use this calculator, loaded only when a tool is open */
function LearnIt({ tool }: { tool: Tool }) {
  const [n, setN] = useState<Record<string, number> | null>(null);
  useEffect(() => { let live = true; import('../certs/exam.js').then((E) => { if (!live) return; const out: Record<string, number> = {}; for (const [c, qs] of Object.entries(E.BANKS)) out[c] = qs.filter((q) => q.tool === tool.id).length; setN(out); }).catch(() => undefined); return () => { live = false; }; }, [tool.id]);
  const used = n ? Object.entries(n).filter(([, k]) => k > 0) : [];
  if (!tool.cts?.length && !used.length) return null;
  return <div className="ft-panel ft-learn" data-testid="ft-learn"><h2><Icon name="book" size={16} /> Learn it</h2>
    <p className="ft-fine">This arithmetic is on the {tool.cts?.join(', ')} exam outlines’ ground. Study it with the formula, then practise:</p>
    <div className="ft-keep__row">{(tool.cts || []).map((c) => <a key={c} className="ui-btn ui-btn--sm" href={`#/learn/${c.toLowerCase()}/math`}>{c} math and physics</a>)}
      {used.map(([c, k]) => <a key={c} className="ui-btn ui-btn--sm" href={`#/learn/${c.toLowerCase()}/practice`} data-testid={`ft-learn-${c}`}>{k} {c} question{k === 1 ? '' : 's'} use it</a>)}</div>
  </div>;
}

function Jobs({ jobs, active, setActive, setJobs, store }: { jobs: Job[]; active: string; setActive: (s: string) => void; setJobs: (j: Job[]) => void; store: boolean }) {
  const [name, setName] = useState(''); const [said, setSaid] = useState(''); const fallback = useRef<HTMLTextAreaElement>(null); const [confirm, setConfirm] = useState('');
  const job = jobs.find((j) => j.id === active) || null;
  const describe = (e: JobEntry) => { const t = toolById(e.tool); return `${t?.title || e.tool} — ${e.headline}${e.note ? ` (${e.note})` : ''}`; };
  const fullReport = (j: Job) => jobReport(j, (e) => { const t = toolById(e.tool); if (!t) return describe(e); const r = safeRun(t, e.values); return report(t, e.values, r, e.note); });
  return <aside className="ft-panel ft-jobs" aria-label="Jobs" data-testid="ft-jobs">
    <h2><Icon name="inbox" size={16} /> Jobs</h2>
    <p className="ft-fine">{store ? 'Kept in this browser only. Nothing is sent, and a job is not a record of the room.' : 'This browser refuses storage: jobs last until this tab closes.'}</p>
    <form className="ft-newjob" onSubmit={(e) => { e.preventDefault(); const r = addJob(jobs, name); if (r.refused) { setSaid(r.refused); return; } setJobs(r.jobs); setActive(r.job!.id); setName(''); setSaid(`Started “${r.job!.name}”.`); }}>
      <label className="ui-sr" htmlFor="ft-jobname">New job name</label>
      <input id="ft-jobname" type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Harbor Hall 201, walk-through" data-testid="ft-jobname" />
      <button type="submit" className="ui-btn ui-btn--sm" data-testid="ft-newjob">Start a job</button>
    </form>
    {jobs.length > 0 && <label className="ft-field"><span>Open job</span><select value={active} onChange={(e) => { setActive(e.target.value); setConfirm(''); }}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.name} ({j.entries.length})</option>)}</select></label>}
    {job && <>
      {job.entries.length ? <ol className="ft-entries" data-testid="ft-entries">{job.entries.map((e) => <li key={e.id}>
        <a href={href(e.tool, e.values)}><b>{toolById(e.tool)?.title || e.tool}</b><span>{e.headline}</span>{e.note && <i>{e.note}</i>}</a>
        <button type="button" className="ft-x" onClick={() => setJobs(removeEntry(jobs, job.id, e.id))} aria-label={`Remove ${toolById(e.tool)?.title || e.tool} from the job`}><Icon name="close" size={14} /></button>
      </li>)}</ol> : <p className="ft-fine">No calculations yet: open a calculator and save it to this job.</p>}
      <div className="ft-keep__row">
        <button type="button" className="ui-btn ui-btn--sm" disabled={!job.entries.length} onClick={async () => setSaid(await copyText(fullReport(job), fallback.current))} data-testid="ft-copyjob">Copy the job</button>
        {confirm === job.id
          ? <><button type="button" className="ui-btn ui-btn--sm ui-btn--danger" onClick={() => { const rest = removeJob(jobs, job.id); setJobs(rest); setActive(rest[0]?.id || ''); setConfirm(''); setSaid(`Deleted “${job.name}” from this browser.`); }}>Delete “{job.name}”</button><button type="button" className="ui-btn ui-btn--sm" onClick={() => setConfirm('')}>Keep it</button></>
          : <button type="button" className="ui-btn ui-btn--sm" onClick={() => setConfirm(job.id)}>Delete the job…</button>}
      </div>
    </>}
    {said && <p className="ft-said" role="status">{said}</p>}
    <textarea ref={fallback} className="ft-fallback" hidden readOnly aria-label="Text to copy" />
  </aside>;
}
