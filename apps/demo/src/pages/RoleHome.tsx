/**
 * A role's start page (#/home for every role but the AV Operations Lead and the Product Architect, who start on Mission Control).
 * The model is campus/rolehome.ts; this file draws it: the role's home name and the sentence that matters, the one thing to start
 * with, the places to jump to with their keys, V2.5.3's "What changed / What matters / What needs my decision" strip, the role's
 * figures and its queues. A role is shown nothing it cannot open (D44): the model has already removed it.
 */
import { useEffect, useMemo, useState } from 'react';
import type { PageProps } from '../registry.types.js';
import { resolve } from '../registry.pages.js';
import { canOpen, ROLES } from '../access/policy.js';
import { Icon } from '../spatial/parts.js';
import { load as loadWorkspace, type Workspace } from '../workspace/store.js';
import { loadDraft } from '../build/store.js';
import { SearchBar } from '../search/SearchBar.js';
import { startFor, type Row, type Start, type Zone } from '../campus/rolehome.js';
import { shortcutsOn } from '../start/shortcuts.js';

const ICON: Record<string, string> = { ok: 'check', warn: 'alert', bad: 'alert', info: 'clock', muted: 'clock' };
const SEARCH_HINT: Partial<Record<string, string>> = { visitor: 'Where do you need to be? Try “reception” or “parking”', employee: 'Find a room or a place: try “4.218”, “quiet”, “coffee”', exec: 'Ask about the portfolio: try “rooms needing action” or “PRJ-ATLAS-AV”', service: 'A room, a device, an issue: try “ISS-0417” or “camera”', steward: 'Any record: try “switch”, “unverified”, “4.218”' };

function RowItem({ r }: { r: Row }) {
  const body = (<><span className={`row__ic row__ic--${r.tone || 'muted'}`} aria-hidden="true"><Icon name={ICON[r.tone || 'muted'] || 'clock'} /></span><span className="rh-row__b"><b>{r.title}</b><span className="ui-meta">{r.sub}</span></span>{r.tag && <span className={`ui-tag ui-tone--${r.tone === 'muted' || !r.tone ? 'info' : r.tone} rh-row__tag`}>{r.tag}</span>}{r.href && <Icon name="chevron" size={16} />}</>);
  return <li className="rh-row" data-testid="rh-row" data-id={r.id}>{r.href ? <a href={r.href}>{body}</a> : <div>{body}</div>}</li>;
}
function ZoneBlock({ z }: { z: Zone }) {
  const [all, setAll] = useState(false); const rows = all ? z.rows : z.rows.slice(0, 5);
  return (
    <section className="mc-card rh-zone" aria-labelledby={`rh-z-${z.id}`} data-testid="rh-zone" data-zone={z.id}>
      <div className="mc-card__head"><h2 id={`rh-z-${z.id}`}>{z.title}</h2>{z.hint && <span className="ui-meta">{z.hint}</span>}{z.more && <a className="mc-link" href={z.more.href}>{z.more.label} <Icon name="chevron" size={14} /></a>}</div>
      {z.rows.length ? <ul className="rh-rows">{rows.map((r) => <RowItem key={r.id} r={r} />)}{z.rows.length > 5 && <li className="rh-row rh-row--more"><button type="button" className="sp__more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show ${z.rows.length - 5} more of ${z.rows.length}`}</button></li>}</ul>
        : <p className="rh-empty" data-testid="rh-empty">{z.empty}</p>}
    </section>
  );
}
const STRIP_TITLE = { changed: 'What changed', matters: 'What matters', decide: 'What needs my decision' } as const;
const STRIP_NONE = { changed: 'Nothing new in the last day.', matters: 'Nothing needs you.', decide: 'No decision is waiting for you.' } as const;

/** The jump bar: the role's places, one action each, with the key that goes there. Used by every start page, Mission Control included. */
export function JumpBar({ s }: { s: Pick<Start, 'jumps' | 'name'> }) {
  const [keys, setKeys] = useState(shortcutsOn);
  useEffect(() => { const f = () => setKeys(shortcutsOn()); window.addEventListener('empathia:shortcuts', f); return () => window.removeEventListener('empathia:shortcuts', f); }, []);
  if (!s.jumps.length) return null;
  return (
    <nav className="rh-jump" aria-label="Jump to" data-testid="rh-jump">
      <h2 className="rh-jump__h">Jump to</h2>
      <ul>{s.jumps.map((j) => <li key={j.key}><a href={j.href} className="rh-jump__a" data-key={j.key} aria-keyshortcuts={keys ? `g ${j.key}` : undefined}><span className="rh-jump__t"><b>{j.label}</b><span className="ui-meta">{j.sub}</span></span>{keys && <span className="rh-jump__k" aria-hidden="true"><kbd>g</kbd><kbd>{j.key}</kbd></span>}</a></li>)}</ul>
      <button type="button" className="mc-link rh-jump__help" onClick={() => window.dispatchEvent(new Event('empathia:shortcuts-open'))} data-testid="rh-shortcuts">Keyboard shortcuts <kbd>?</kbd></button>
    </nav>
  );
}

export function useStart(role: PageProps['role']): Start {
  const [w, setW] = useState<Workspace | null>(() => { try { return loadWorkspace(); } catch { return null; } });
  useEffect(() => { const f = () => { try { setW(loadWorkspace()); } catch { /* keep */ } }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, []);
  return useMemo(() => { const opens = (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); }; let draft: { code: string; name: string } | null = null; try { draft = loadDraft(); } catch { draft = null; } return startFor({ role, w, opens, draft }); }, [role, w]);
}

export default function RoleHome({ role }: PageProps) {
  const s = useStart(role); const R = ROLES[role];
  const opens = (href: string) => { const r = resolve(href.split('?')[0]!); return !!r && canOpen(role, r); };
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="home rh" data-native="" data-testid="home" data-r={role} data-start={role}>
      <header className="rh-hero" data-testid="rh-hero">
        <p className="kicker"><span className="ava rh-ava" aria-hidden="true">{R.initials}</span>{s.name} · {R.label} · {today}</p>
        <h1 tabIndex={-1}>{s.headline}</h1>
        <p className="rh-sum" data-testid="rh-summary">{s.summary}</p>
        {s.primary && <div className="rh-start" data-testid="rh-start"><a className="ui-btn ui-btn--primary rh-start__a" href={s.primary.href} data-testid="rh-primary"><Icon name="spark" /> {s.primary.label}</a><span className="ui-meta">{s.primary.why}</span></div>}
        {opens('#/search') && <div className="rh-search"><SearchBar hero role={role} answers={opens('#/find')} label="Ask Search Party" placeholder={SEARCH_HINT[role] || 'Search rooms, devices, people and records'} /></div>}
      </header>
      <JumpBar s={s} />
      {s.strip && <section className="rh-strip" aria-label="Mission Control" data-testid="rh-strip" data-n={s.strip.cols.length}>
        {s.strip.cols.map((c) => <div key={c} className={`rh-strip__c${c === 'decide' ? ' rh-strip__c--decide' : ''}`} data-col={c}><h2>{STRIP_TITLE[c]}</h2>{s.strip![c].length ? <ul>{s.strip![c].map((r) => <li key={r.id}>{r.href ? <a href={r.href}><b>{r.title}</b><span className="ui-meta">{r.sub}</span></a> : <div><b>{r.title}</b><span className="ui-meta">{r.sub}</span></div>}</li>)}</ul> : <p className="rh-empty">{STRIP_NONE[c]}</p>}</div>)}
      </section>}
      {s.tiles.length > 0 && <ul className="rh-tiles" aria-label={`${s.name} in numbers`} data-testid="rh-tiles">{s.tiles.map((t) => { const body = <><span className="rh-tile__l">{t.label}</span><span className="rh-tile__v" data-tone={t.tone}><b>{t.value}</b>{t.unit && <small>{t.unit}</small>}</span>{t.hint && <span className="ui-meta">{t.hint}</span>}</>; return <li key={t.label} className="rh-tile">{t.href ? <a href={t.href}>{body}</a> : <div>{body}</div>}</li>; })}</ul>}
      {s.zones.length > 0 && <div className={`rh-zones rh-zones--${Math.min(2, s.zones.length)}`}>{s.zones.map((z) => <ZoneBlock key={z.id} z={z} />)}</div>}
      <p className="ui-meta mc-foot" data-testid="rh-basis">{s.basis} Viewing as a role grants nothing.</p>
    </section>
  );
}
