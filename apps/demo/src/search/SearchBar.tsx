/**
 * The search bar of the demonstration (header): an ARIA 1.2 combobox over the demo-wide index (find.ts). Arrow keys move, Enter opens,
 * Escape closes; Enter with nothing highlighted opens the full results page (#/find?q=…). Results are announced politely.
 * The query is read before it is matched (understand.ts): typing mistakes are corrected and said, and a sentence that states conditions
 * ("boardrooms over 12 seats with a camera") is answered with a count from the room records, offered as the first suggestion.
 */
import { useId, useMemo, useRef, useState, type RefObject } from 'react';
import { type Hit } from './find.js';
import { CAMPUS_ROOMS } from '../campus/canon.js';   // the full answer lists every room, however many the campus holds (it read 90 until 13 Nov 2026)
import { understand, canonical, type Reading } from './understand.js';
import { allows } from '../access/policy.js';
import { openable } from '../pages/V25Nav.js';
import type { RoleKey } from '../registry.types.js';
import { Notice } from '@empathia/ui';

const KIND: Record<Hit['kind'], string> = { room: 'Room', building: 'Building', device: 'Device', product: 'Product', page: 'Page', tour: 'Tour', issue: 'Issue', person: 'Person', project: 'Project' };
/** V2.5.3's facets, in its order, for the kinds this index holds */
const FACETS: Array<[Hit['kind'] | 'all', string]> = [['all', 'All'], ['page', 'Workspaces'], ['room', 'Spaces'], ['building', 'Buildings'], ['device', 'Devices'], ['person', 'People'], ['project', 'Projects'], ['issue', 'Issues'], ['product', 'Products'], ['tour', 'Tours']];
/** a person, an issue or a project is shown only to a role that may open its page (V2.5.3: canViewRoute), so the bar never discloses more than the page would */
const GATED = new Set<Hit['kind']>(['issue', 'person', 'project']);
const visible = (role: RoleKey | undefined) => (h: { kind: string; href: string }) => !role || !GATED.has(h.kind as Hit['kind']) || openable(role, h.href);
// the bar's recents (V2.5.3 "Continue where you left off"): the last pages opened from it, in this browser only
const RECENT_KEY = 'empathia.search.recents';
const recents = (): Array<{ href: string; label: string }> => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.href === 'string' && x.href.startsWith('#/') && typeof x.label === 'string').slice(0, 6) : []; } catch { return []; } };
const remember = (href: string, label: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([{ href, label: label.slice(0, 100) }, ...recents().filter((x) => x.href !== href)].slice(0, 6))); } catch { /* the bar works without */ } };
/** the label with the first word of the query marked, as V2.5.3 marked it */
function Marked({ text, q }: { text: string; q: string }) {
  const t = q.trim().toLowerCase().split(/\s+/).filter((x) => x.length > 1)[0]; const i = t ? text.toLowerCase().indexOf(t) : -1;
  return i < 0 ? <>{text}</> : <>{text.slice(0, i)}<mark>{text.slice(i, i + t!.length)}</mark>{text.slice(i + t!.length)}</>;
}
/** what the viewing role may be told: open issues are engineering information (the same field Ask Empathia checks) */
const mayFor = (role?: RoleKey) => (field: string) => !role || allows({ field } as Parameters<typeof allows>[0], role);
const findHref = (q: string) => `#/find?q=${encodeURIComponent(q.trim().slice(0, 80))}`;
interface Opt { id: string; kind: string; label: string; description: string; href: string }

/** `hero`: Mission Control's Search Party bar — Enter with nothing highlighted asks Search Party (#/search?q=…) instead of the results page. */
export function SearchBar({ hero, placeholder, label = 'Search the demonstration', inputRef, role, answers = true, initial = '' }: { hero?: boolean; placeholder?: string; label?: string; inputRef?: RefObject<HTMLInputElement | null>; role?: RoleKey; /** the query already answered on this page, kept in the field so it can be refined */ initial?: string; /** may this role open the results page, where an answer is shown? */ answers?: boolean } = {}) {
  const id = useId(); const [q, setQ] = useState(initial); const [open, setOpen] = useState(false); const [act, setAct] = useState(-1);
  const reading = useMemo<Reading | null>(() => (q.trim() ? understand(q, { limit: 8, may: mayFor(role) }) : null), [q, role]);
  const hits = useMemo<Opt[]>(() => {
    if (!reading) {   // nothing typed yet: V2.5.3's directory, where to go next before a word is typed
      const rec = recents().filter((x) => !role || openable(role, x.href)).map((x, i) => ({ id: `recent-${i}`, kind: 'Recent', label: x.label, description: 'Continue where you left off', href: x.href }));
      const tries = understand('', { limit: 4, may: mayFor(role) }).next.slice(0, 4).map((x, i) => ({ id: `try-${i}`, kind: 'Try', label: x.label, description: 'A question the records answer', href: findHref(x.q) }));
      return [...rec, ...tries];
    }
    const list: Opt[] = reading.hits.filter(visible(role)).map((h) => ({ id: h.id, kind: KIND[h.kind], label: h.label, description: h.description, href: h.href }));
    // a counted answer leads: it is what was asked, and the results page shows the rooms behind the count
    return reading.mode === 'answer' && reading.question && answers ? [{ id: 'answer', kind: 'Answer', label: reading.lead, description: reading.said, href: findHref(q) }, ...list.slice(0, 7)] : list;
  }, [reading, answers, q]);
  const fixed = reading && reading.fixes.length ? `Searching for ${reading.corrected}. ` : '';
  const own = useRef<HTMLInputElement>(null); const box = inputRef || own;
  const go = (href: string, label?: string) => { if (label && !href.startsWith('#/find')) remember(href, label); setOpen(false); setAct(-1); setQ(''); location.hash = href; box.current?.blur(); };
  // Enter with nothing highlighted: a sentence that has a counted answer opens that answer; otherwise the hero bar asks Search Party
  const submit = () => { if (act >= 0 && hits[act]) go(hits[act]!.href, hits[act]!.label); else if (q.trim()) go(hero && !(reading?.mode === 'answer' && reading.question && answers) ? `#/search?q=${encodeURIComponent(q.trim().slice(0, 80))}` : findHref(q)); };
  return (
    <div className={`sbar${hero ? ' sbar--hero' : ''}`} role="search" data-testid={hero ? 'hero-search' : 'searchbar'}>
      <label htmlFor={`${id}-q`} className="ui-visually-hidden">{label}</label>
      <input ref={box} id={`${id}-q`} className="sbar__input" type="search" role="combobox" aria-expanded={open && hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={act >= 0 ? `${id}-o${act}` : undefined}
        value={q} placeholder={placeholder || 'Search rooms, devices, products…'} autoComplete="off" spellCheck={false} maxLength={80}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setAct(-1); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setAct((a) => Math.min(hits.length - 1, a + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAct((a) => Math.max(-1, a - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); submit(); }
          else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); setAct(-1); } else setQ(''); }
        }} />
      <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" className="sbar__list" hidden={!open || !hits.length}>
        {hits.map((h, i) => <li key={h.id} id={`${id}-o${i}`} role="option" aria-selected={i === act} className={`${i === act ? 'on' : ''}${h.id === 'answer' ? ' sbar__answer' : ''}`} data-kind={h.id === 'answer' ? 'answer' : undefined} onMouseDown={(e) => { e.preventDefault(); go(h.href, h.label); }} data-option-kind={h.kind}><span className="sbar__kind">{h.kind}</span><b><Marked text={h.label} q={q} /></b><span className="ui-meta">{h.description}</span></li>)}
      </ul>
      <span className="ui-visually-hidden" role="status" aria-live="polite">{open && !q.trim() && hits.length ? `${hits.length} places to start` : ''}{open && q.trim() ? `${fixed}${hits.length ? `${hits.length} suggestion${hits.length === 1 ? '' : 's'}` : 'No suggestion'}` : ''}</span>
    </div>
  );
}

const SHOW = 12;
/** The counted answer: how the query was read (each condition can be dropped), the figure, the rooms behind it, and where to go next. */
function Answer({ r }: { r: Reading }) {
  const [all, setAll] = useState(false); const rows = all ? r.rows : r.rows.slice(0, SHOW);
  return (
    <section className="fnd-ans" data-testid="find-answer" data-total={r.total} data-subject={r.subject} aria-labelledby="fnd-ans-h">
      <p className="kicker">Answer, counted from the room records</p>
      <h2 id="fnd-ans-h" className="fnd-ans__lead" data-testid="find-lead">{r.lead}</h2>
      {r.filters.length > 0 && <ul className="fnd-ans__read" aria-label="How the search was read" data-testid="find-read">
        {r.filters.map((f, i) => <li key={`${f.kind}-${f.label}`} data-kind={f.kind}><span>{f.label}</span>{r.filters.length > 1 && r.subject === 'rooms' && <a href={findHref(canonical(r.filters.filter((_, k) => k !== i)))} aria-label={`Search again without: ${f.label}`}>×</a>}</li>)}
      </ul>}
      {r.unread.length > 0 && <p className="ui-muted" data-testid="find-unread">Not used: {r.unread.map((w) => `“${w}”`).join(', ')}. No room record mentions {r.unread.length === 1 ? 'it' : 'them'}.</p>}
      {r.withheld && <Notice tone="info">{r.withheld}</Notice>}
      {rows.length > 0 && <ul className="fnd__list" data-testid="find-rows">{rows.map((x) => <li key={x.id}><a href={x.href}><b>{x.label}</b><span className="ui-muted">{x.detail}</span></a></li>)}</ul>}
      {r.rows.length > SHOW && !all && <p><button type="button" className="ui-btn ui-btn--sm" onClick={() => setAll(true)} data-testid="find-all">Show all {r.rows.length}</button></p>}
      {r.next.length > 0 && <div className="fnd-ans__next" data-testid="find-next"><h3 className="build__h">{r.total ? 'Narrow it' : 'Drop one condition'}</h3><ul>{r.next.map((s) => <li key={s.q}><a href={findHref(s.q)}>{s.label}</a></li>)}</ul></div>}
      <p className="ui-meta">Every figure is counted from the {r.outOf} synthetic room records of this demonstration, the same records the room pages show. Nothing is estimated.</p>
    </section>
  );
}

export function FindPage({ hash, role }: { hash: string; role?: RoleKey }) {
  const q = new URLSearchParams(/\?(.*)$/.exec(hash)?.[1] || '').get('q') || '';
  const r = useMemo(() => understand(q, { limit: CAMPUS_ROOMS.length, may: mayFor(role) }), [q, role]); const hits = r.hits; const answer = r.mode === 'answer';
  const shown = hits.filter(visible(role)); const [facet, setFacet] = useState<Hit['kind'] | 'all'>('all');
  const counts = Object.fromEntries(FACETS.map(([k]) => [k, k === 'all' ? shown.length : shown.filter((h) => h.kind === k).length])); const on = counts[facet] ? facet : 'all';
  const groups = (['room', 'product', 'tour', 'building', 'device', 'person', 'project', 'issue', 'page'] as const).filter((k) => on === 'all' || k === on).map((k) => [k, shown.filter((h) => h.kind === k)] as const).filter(([, l]) => l.length);
  return (
    <section className="fnd" data-native="" data-testid="find-page" data-mode={q ? r.mode : 'start'}>
      <header className="room__hero"><p className="kicker">Search</p><h1>{q ? <>Results for “{q}”</> : 'Search the demonstration'}</h1>
      <div className="fnd__bar"><SearchBar key={q} role={role} initial={q.slice(0, 80)} /></div></header>
      <p className="ui-muted" role="status">{q ? (answer ? `Answered from the room records${shown.length ? `; ${shown.length} page${shown.length === 1 ? '' : 's'} or record${shown.length === 1 ? '' : 's'} also match the words` : ''}.` : `${shown.length} result${shown.length === 1 ? '' : 's'}`) : 'Type in the search bar: a room (“4.218”, “boardroom”), a device (“tv”, “mic”), a product, or a sentence (“boardrooms over 12 seats with a camera”, “how many cameras”, “rooms held”).'}</p>
      {q && r.fixes.length > 0 && <p data-testid="find-fixes">Showing results for <b>{r.corrected}</b>. {r.fixes.map((f) => `“${f.from}” was read as “${f.to}”`).join('; ')}.</p>}
      {answer && <Answer key={q} r={r} />}
      {q && !answer && r.withheld && <Notice tone="info">{r.withheld}</Notice>}
      {q && !answer && r.loose && <Notice tone="info">No record carries every word of “{q}”, so these carry some of them. For a question about relationships (who supports a room, what a failure affects), ask <a href={`#/search?q=${encodeURIComponent(q)}`}>Search Party with this text</a>.</Notice>}
      {q && r.mode === 'empty' && <><Notice tone="info">Nothing matches “{q}”. Try a room number such as 4.218, a device such as “camera”, or a product such as “Search Party”. For relationships, open <a href={`#/search?q=${encodeURIComponent(q)}`}>Search Party with this text</a>.</Notice>
        <div className="fnd-ans__next" data-testid="find-starters"><h2 className="build__h">Searches that have an answer</h2><ul>{r.next.map((s) => <li key={s.q}><a href={findHref(s.q)}>{s.label}</a></li>)}</ul></div></>}
      {!q && <div className="fnd-ans__next" data-testid="find-starters"><h2 className="build__h">Try one</h2><ul>{r.next.map((s) => <li key={s.q}><a href={findHref(s.q)}>{s.label}</a></li>)}</ul></div>}
      {q && shown.length > 0 && <div className="fnd__facets" role="group" aria-label="Narrow the results" data-testid="find-facets">{FACETS.filter(([k]) => k === 'all' || counts[k]).map(([k, l]) => <button key={k} type="button" className={`chip${on === k ? ' on' : ''}`} aria-pressed={on === k} onClick={() => setFacet(k)} data-facet={k}>{l} <span className="ui-meta">{counts[k]}</span></button>)}</div>}
      {answer && groups.length > 0 && <h2 className="build__h fnd__also">Pages and records that match the words</h2>}
      {groups.map(([k, l]) => <div key={k} className="fnd__group"><h2 className="build__h">{k === 'person' ? 'People' : `${KIND[k]}s`} ({l.length})</h2><ul className="fnd__list">{l.map((h) => <li key={h.id}><a href={h.href} onClick={() => remember(h.href, h.label)}><b><Marked text={h.label} q={q} /></b><span className="ui-muted">{h.description}</span>{h.why && <span className="ui-meta">alias {h.why}</span>}</a></li>)}</ul></div>)}
    </section>
  );
}
