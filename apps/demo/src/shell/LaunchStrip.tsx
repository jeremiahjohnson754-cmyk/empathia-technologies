/**
 * The way in from the corporate website and the way back (#232; founder directive 18 Nov 2026 17:25 §6, "Open This Exact
 * Demonstration"). A website link carries from=site, a catalogued launch id and the website page it came from (packages/ui/src/
 * launches.ts). On arrival the page is shown as the launch's perspective — the visitor chose it on the website, where the button names
 * it — and this strip says so, offers the visitor's previous view back, and links to the exact website page they left.
 *
 * Nothing in the address is trusted beyond the catalogue: an unknown id does nothing, the title and perspective come from the
 * catalogue, and the way back must be a path on the website (never a full address). A perspective is applied once per arrival, so a
 * reload or Back does not undo a switch the visitor made since; viewing as a role grants nothing.
 */
import { useEffect, useState } from 'react';
import { readLaunch, launchById } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import { ROLES, ROLE_KEYS } from '../access/policy.js';
import { WEBSITE_URL } from '../enquiry.js';

const KEY = 'empathia.launch.v1';
interface Held { id: string; back: string; prev: string | null; at: string }
const load = (): Held | null => { try { const v = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return v && typeof v.id === 'string' && launchById(v.id) ? v : null; } catch { return null; } };
const save = (h: Held | null) => { try { if (h) sessionStorage.setItem(KEY, JSON.stringify(h)); else sessionStorage.removeItem(KEY); } catch { /* storage unavailable: the strip lasts the page */ } };
const isRole = (r: string | null): r is RoleKey => !!r && (ROLE_KEYS as readonly string[]).includes(r);

export function LaunchStrip({ route, role, onPerspective }: { route: string; role: RoleKey; onPerspective: (r: RoleKey) => void }) {
  const [held, setHeld] = useState<Held | null>(load);
  useEffect(() => {
    const intent = readLaunch(new URLSearchParams(route.split('?')[1] || ''));
    if (!intent) return;
    const prior = load();
    if (prior && prior.at === route) { setHeld(prior); return; }   // the same arrival again (a reload, Back): keep what the visitor did since
    const want = intent.launch.perspective; const next: Held = { id: intent.launch.id, back: intent.back, prev: isRole(want) && want !== role ? role : null, at: route };
    save(next); setHeld(next);
    if (isRole(want) && want !== role) onPerspective(want);
  }, [route]);   // eslint-disable-line react-hooks/exhaustive-deps
  const l = held ? launchById(held.id) : null;
  if (!held || !l) return null;
  const page = route.split('?')[0]; const here = page === `#${l.route.split('?')[0]}`;
  const shownAs = isRole(l.perspective) ? ROLES[l.perspective].label : l.perspectiveLabel;
  const prev = held.prev && isRole(held.prev) && role === l.perspective ? held.prev : null;   // offer the old view only while the launch's view is still on
  const back = WEBSITE_URL + held.back;
  const dismiss = () => { save(null); setHeld(null); };
  return (
    <div className="ls-strip" role="region" aria-label="Opened from the Empathia website" data-testid="launch-strip" data-launch={l.id} data-here={here}>
      <p className="ls-strip__t">{here
        ? <><b>From the Empathia website:</b> {l.title}. Shown as {shownAs}{role === l.perspective ? '' : ` (you are now viewing as ${ROLES[role].label})`}; viewing as a role grants nothing.</>
        : <><b>You came from the Empathia website</b> ({l.title}).</>}</p>
      <p className="ls-strip__a">
        <a className="ui-btn ui-btn--primary" href={back} data-testid="launch-back">Back to the website</a>
        {here && prev ? <button type="button" className="ui-btn" data-testid="launch-prev" onClick={() => { onPerspective(prev); save({ ...held, prev: null }); setHeld({ ...held, prev: null }); }}>View as {ROLES[prev].label} again</button> : null}
        <button type="button" className="ui-btn ui-btn--quiet" data-testid="launch-dismiss" onClick={dismiss} aria-label="Dismiss this note">Dismiss</button>
      </p>
    </div>
  );
}
