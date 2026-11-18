/**
 * #/platforms — Platform jumps (connected builds only; founder, 18 Nov 2026, 07:49). The platforms a jump can open and where each goes
 * for the sandbox's organization, read from the server as the person chosen at the top; the operations lead sets the organization's
 * address for a platform (the server refuses anyone else and says why); a room or a unit can be given its own address. Every name here
 * is a vendor's or product's, used only to say what the platform is: no integration, certification or partnership exists or is implied.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Notice, Tag } from '@empathia/ui';
import { connected, SandboxGone, type Availability, type Sandbox } from '../connected/client.js';
import { SubjectJumps, host } from '../connected/Jumps.js';
import { PEOPLE } from './Flagship.js';

interface Platform { key: string; name: string; vendor: string; category: string; for: string; at: string[]; defaultUrl?: { url: string; source: string }; configured: { url: string; label: string | null; enabled: boolean; setAt: string } | null; opens: string | null }
interface Catalogue { items: Platform[]; note: string; may: { configure: boolean; record: boolean } }
const CAT: Record<string, string> = { 'device-cloud': 'Device clouds', 'meeting-rooms': 'Meeting rooms', collaboration: 'Collaboration', dsp: 'Audio processing', 'audio-network': 'Audio networks', signage: 'Signage and booking', audio: 'Microphones', design: 'Drawings and models', itsm: 'Service management' };
const WHO = [...PEOPLE.filter(([k]) => !/\d$/.test(k))];

export function PlatformsPage() {
  const c = useMemo(() => connected(), []);
  const [avail, setAvail] = useState<Availability | null>(null); const [sb, setSb] = useState<Sandbox | null>(() => c.sandbox());
  const [who, setWho] = useState('opslead'); const [cat, setCat] = useState<Catalogue | null>(null); const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const [edit, setEdit] = useState<string | null>(null); const [url, setUrl] = useState(''); const [on, setOn] = useState(true); const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<Array<{ code: string; name: string }>>([]); const [room, setRoom] = useState('');
  const read = useCallback(async (as: string) => {
    try { const [a, r] = await Promise.all([c.call<Catalogue>(as, 'GET', '/v1/platforms'), c.call<{ items: Array<{ code: string; name: string }> }>(as, 'GET', '/v1/rooms?limit=50')]);
      setCat(a.ok ? a.body : null); if (!a.ok) setSaid({ ok: false, text: `The server answered ${a.status}: ${a.detail}` });
      if (r.ok) { setRooms(r.body.items); setRoom((x) => x || r.body.items[0]?.code || ''); } }
    catch (e) { if (e instanceof SandboxGone) { setSb(null); setCat(null); } setSaid({ ok: false, text: (e as Error).message }); }
  }, [c]);
  useEffect(() => { let live = true; void (async () => { const a = await c.availability(); if (!live) return; setAvail(a); if (a.enabled && c.sandbox()) await read(who); })(); return () => { live = false; }; }, [c]);   // eslint-disable-line react-hooks/exhaustive-deps
  const open = async () => { setBusy(true); setSaid(null); try { const a = await c.open(); if (!a.ok || !a.body) setSaid({ ok: false, text: `The server answered ${a.status}: ${a.detail}` }); else { setSb(a.body); await read(who); } } catch (e) { setSaid({ ok: false, text: (e as Error).message }); } finally { setBusy(false); } };
  const save = async (key: string) => { setBusy(true); setSaid(null);
    try { const a = await c.call(who, 'PUT', `/v1/platforms/${key}`, { url: url.trim(), enabled: on });
      if (a.ok) { setSaid({ ok: true, text: `Saved. Every jump to this platform now goes to ${host(url.trim())}${on ? '' : ' — turned off, so it opens nothing'}. The change is in the audit history.` }); setEdit(null); await read(who); }
      else setSaid({ ok: false, text: `The server refused (${a.status}): ${a.detail}${a.reasons?.length ? ` — ${a.reasons.join('; ')}` : ''}` }); }
    catch (e) { setSaid({ ok: false, text: (e as Error).message }); } finally { setBusy(false); } };
  const groups = useMemo(() => { const g = new Map<string, Platform[]>(); for (const p of cat?.items || []) g.set(p.category, [...(g.get(p.category) || []), p]); return [...g]; }, [cat]);

  return <section className="wk" data-native="workspace" data-testid="pj-page">
    <header className="wk-head"><h1>Platform jumps</h1>
      <p className="wk-lede">Open the organization’s own portal for a room, a unit or the estate — its device cloud, meeting-room portal, audio processing, signage or service desk — from where the work is. Each jump is a link to the organization’s address; Empathia sends nothing to the platform and reads nothing from it.</p></header>
    {avail && !avail.enabled ? <div data-testid="pj-off"><Notice tone="warn">The demonstration server is not taking sandboxes right now{avail.reason ? `: ${avail.reason}` : ''}. Nothing here works without it.</Notice></div> : null}
    {!sb ? <Card icon="spark" title="Open a sandbox" sub="A private copy of the demonstration on the server, for a few hours" testId="pj-open"><p className="build__row"><button type="button" className="ui-btn ui-btn--primary" data-testid="pj-open-btn" disabled={busy || !avail?.enabled} onClick={() => void open()}>Open a sandbox</button></p></Card> : <>
      <div className="build__row sq-bar">
        <label className="kit-field">Acting as <select value={who} data-testid="pj-who" onChange={(e) => { setWho(e.target.value); setEdit(null); void read(e.target.value); }}>{[['opslead', 'Operations lead'] as [string, string], ...WHO.filter(([k]) => k !== 'opslead')].map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        {cat ? <span className="ui-meta" data-testid="pj-may" data-configure={cat.may.configure}>{cat.may.configure ? 'May set the organization’s addresses (the server’s answer).' : 'Reads the jumps; setting the organization’s addresses is for the operations lead or the security administrator.'}</span> : null}
      </div>
      {said ? <div data-testid="pj-said" data-ok={said.ok}><Notice tone={said.ok ? 'ok' : 'bad'}>{said.text}</Notice></div> : null}
      {cat ? <Notice tone="info"><b>Links, not integrations.</b> {cat.note} Vendor and product names say what each platform is.</Notice> : null}
      <div className="pj-grid">{groups.map(([g, ps]) => <Card key={g} icon="link" title={CAT[g] || g} testId={`pj-cat-${g}`}>
        <ul className="pj-list">{ps.map((p) => <li key={p.key} data-platform={p.key} data-opens={p.opens || ''}>
          <div className="pj-row"><b>{p.name}</b> {p.opens ? <a href={p.opens} target="_blank" rel="noopener noreferrer" data-testid={`pj-go-${p.key}`}>Open ({host(p.opens)})</a> : <Tag tone="muted">{p.configured && !p.configured.enabled ? 'turned off' : 'not set'}</Tag>}</div>
          <span className="ui-meta">{p.for}. {p.configured ? `The organization’s address${p.configured.label ? ` (“${p.configured.label}”)` : ''}.` : p.defaultUrl ? <>The vendor’s documented sign-in address (<a href={p.defaultUrl.source} target="_blank" rel="noopener noreferrer">its page</a>, read 18 Nov 2026).</> : 'Its portal is the organization’s own: nothing until someone sets it.'}</span>
          {cat?.may.configure ? edit === p.key ? <div className="build__row pj-edit">
            <label className="kit-field">Address (https) <input type="url" inputMode="url" value={url} maxLength={300} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} data-testid="pj-url" /></label>
            <label><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> On</label>
            <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" disabled={busy || !/^https:\/\/\S+$/.test(url.trim())} onClick={() => void save(p.key)} data-testid="pj-save">Save</button>
            <button type="button" className="ui-btn ui-btn--sm" onClick={() => setEdit(null)}>Cancel</button></div>
            : <button type="button" className="ui-btn ui-btn--sm" onClick={() => { setEdit(p.key); setUrl(p.configured?.url || ''); setOn(p.configured?.enabled ?? true); }} data-testid={`pj-edit-${p.key}`}>{p.configured ? 'Change' : 'Set the address'}</button> : null}
        </li>)}</ul></Card>)}</div>
      {rooms.length ? <Card icon="room" title="For one room" sub="Its own address in a platform where someone recorded it, else the organization’s portal" testId="pj-room">
        <label className="kit-field">Room <select value={room} onChange={(e) => setRoom(e.target.value)} data-testid="pj-room-pick">{rooms.map((r) => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}</select></label>
        {room ? <SubjectJumps key={`${who}/${room}`} c={c} who={who} subject="room" refCode={room} /> : null}
        <p className="ui-meta">The same jumps are on the <a href={`#/flagship/${encodeURIComponent(room)}`}>room’s page</a>.</p></Card> : null}
    </>}
    <p className="ui-meta">Every address in a sandbox is synthetic or a vendor’s public sign-in page; the sandbox expires. Nothing is sent to any platform.</p>
  </section>;
}
