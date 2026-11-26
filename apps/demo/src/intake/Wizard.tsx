/**
 * #/request/new — the request, in at most five steps (founder directive 19 Nov 2026 §04): what you need, where, what it should do, show us
 * the space, review and send. Steps a request does not need are skipped: checking a device opens Scouter after one answer; a fault goes to
 * ServiceHands' report once the room is known. The request is a record from the first step on (a DRAFT with its own id, saved as you go,
 * kept after a refresh or a closed tab) and is sent with the same id.
 *
 * From a room or a device (Lite, a room page, Search Party) the steps are consolidated into one screen: the room is known, so the person
 * says what they need and sends it (founder, 14 Nov 2026: "under 45 seconds to submit a full request"). Photos and the full steps are one
 * press away.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PageHero, Button, Notice, Tag, Field, Icon, Chip } from '@empathia/ui';
import type { PageProps, RoleKey } from '../registry.types.js';
import { ROLES } from '../access/policy.js';
import { fullName, roomById, roomHref } from '../campus/canon.js';
import { roomRecord } from '../campus/design.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { KINDS, CARDS, USES, WHEN, MATTERS, SITES, ADDABLE, GOALS, OTHER_BUILDING, blank, catName, kindOf, cardOf, askGoals, goalLabel, propose, known, problems, handoff, siteName, givenSize, summarise, type Draft, type KindId, type CardId } from './model.js';
import { send, saveDraft, recordById, draftOf, stateOf, policyFor, photoChecklist, readAttachment, attach, detach, alreadyOpen, standing, MAX_ATTACHMENTS, type Request, type Attachment } from './store.js';
import { locate, recentRooms, roomsOf, type Place } from './locate.js';
import { IntakeNav, Preview, ProposedRoom, Summary, RequestItem, KIND_ICON, plural } from './parts.js';
import { load as loadDesk } from '../decisions/store.js';
import { parseHash } from '../registry.pages.js';
import { openable } from '../pages/V25Nav.js';

type StepId = 'what' | 'where' | 'needs' | 'photos' | 'review';
const STEP_LABEL: Record<StepId, string> = { what: 'What you need', where: 'Where', needs: 'What it should do', photos: 'Show us the space', review: 'Review and send' };
/** The steps a kind of request needs, in order. */
export const stepsOf = (k: KindId): StepId[] => k === 'evaluate-device' ? ['what', 'needs'] : k === 'improve-room' || k === 'problem' ? ['what', 'where'] : k === 'general' ? ['what', 'where', 'photos', 'review'] : ['what', 'where', 'needs', 'photos', 'review'];
/** Which answers each step asks for, so a step is checked only for its own answers. */
const FIELDS: Record<StepId, string[]> = { what: ['need', 'goals'], where: ['building', 'floor', 'place', 'roomId'], needs: ['use', 'people', 'position', 'adds', 'date', 'category'], photos: ['dims'], review: [] };
const isTool = (k: KindId) => ['scouter', 'optimizer', 'report'].includes(kindOf(k).goes);
/**
 * Where a tool kind hands the person on: Scouter, the Space Optimizer or the problem report. 24 Nov 2026: an executive who chose
 * "check a device" was offered Scouter, which is not open to executives, and so reached the access page (found when the link guard
 * closed the link and tests/browser/demo-request RQ-19 noticed). A role the tool is not open to is told so, and offered the
 * ordinary request instead, with the room kept.
 */
function Handoff({ role, d, href }: { role: RoleKey; d: Draft; href: string }) {
  const tool = d.kind === 'evaluate-device' ? 'Scouter' : d.kind === 'problem' ? 'The problem report' : 'Space Optimizer';
  if (openable(role, href)) return <a className="ui-btn ui-btn--primary" href={href} data-testid="rq-handoff">{d.kind === 'evaluate-device' ? `Open Scouter for ${catName(d.category).toLowerCase()}s` : d.kind === 'problem' ? 'Report the problem' : 'Open Space Optimizer for this room'}</a>;
  return <p className="ui-muted" data-testid="rq-handoff-closed">{tool} is not open to the {ROLES[role].label}. <a href={`#/request/general${d.roomId ? `?room=${encodeURIComponent(d.roomId)}` : ''}`} data-testid="rq-handoff-ask">Ask the AV operations team for it instead</a>.</p>;
}
const QUICK_KINDS: KindId[] = ['add-devices', 'replace-device', 'change-room', 'event', 'problem', 'improve-room', 'evaluate-device'];
const LEGACY_KEY = 'empathia.demo.request.draft.v1';
const replaceHash = (h: string) => { try { history.replaceState(null, '', h); } catch { /* the address stays as it was */ } };

interface Start { id: string | null; d: Draft; step: StepId; card: CardId | null; quick: boolean; sent: Request | null; note: string | null }
function start(query: URLSearchParams, params: Record<string, string>): Start {
  const draftId = query.get('draft');
  if (draftId) { const r = recordById(draftId); if (r) { const steps = stepsOf(r.kind); const want = (query.get('step') || r.step || 'what') as StepId; return { id: r.id, d: draftOf(r), step: steps.includes(want) ? want : steps[0]!, card: r.card || cardOf(r.kind), quick: false, sent: stateOf(r) === 'DRAFT' ? null : r, note: null }; }
    return { id: null, d: blank(), step: 'what', card: null, quick: false, sent: null, note: `No draft ${draftId} is kept in this browser. Drafts live in the browser they were started in.` }; }
  const kp = params['kind'] && params['kind'] !== 'new' ? params['kind'] : query.get('kind'); const k = KINDS.find((x) => x.id === kp); const room = query.get('room');
  const need = (query.get('need') || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 600);
  if (room && roomById(room)) { const d = blank(k?.id || 'add-devices', { roomId: room, building: roomById(room)!.building, position: query.get('position') || '', need }); return { id: null, d, step: 'needs', card: cardOf(d.kind), quick: true, sent: null, note: null }; }
  if (k) return { id: null, d: blank(k.id, { need }), step: 'what', card: cardOf(k.id), quick: false, sent: null, note: null };
  const c = CARDS.find((x) => x.id === query.get('card')); if (c) return { id: null, d: blank(c.kinds[0]!, { need }), step: 'what', card: c.id, quick: false, sent: null, note: null };
  try { const s = sessionStorage.getItem(LEGACY_KEY); const d = s ? (JSON.parse(s) as Draft) : null; if (d && KINDS.some((x) => x.id === d.kind) && !isTool(d.kind) && d.need) return { id: null, d: { ...blank(d.kind), ...d }, step: 'what', card: cardOf(d.kind), quick: false, sent: null, note: null }; } catch { /* nothing kept */ }
  return { id: null, d: blank('new-room'), step: 'what', card: null, quick: false, sent: null, note: null };
}

/** The room a request is about: search by name, number, QR address or device code; recent rooms; or building and room, as lists. */
function RoomPicker({ d, set, err, onNotListed, w, id }: { d: Draft; set: (p: Partial<Draft>) => void; err: (f: string) => string | null; onNotListed?: () => void; w: ReturnType<typeof useWorkspace>['w']; id: string | null }) {
  const [q, setQ] = useState(''); const hits = useMemo(() => locate(q), [q]); const recent = useMemo(() => recentRooms(), []);
  const room = roomById(d.roomId); const facts = known(d); const dupes = useMemo(() => (room ? alreadyOpen(w, room.id, id) : []), [room, w, id]);
  const choose = (p: Place) => { set({ roomId: p.roomId, building: roomById(p.roomId)!.building, position: p.position && d.kind === 'replace-device' ? p.position : d.position }); setQ(''); };
  return (
    <div className="ik-where" data-testid="ik-where">
      <Field label="Find the room" hint="Its name or number (for example 4.218), the address on its QR label, or the code of a device in it (PA-0106).">{(fid, by) =>
        <input id={fid} aria-describedby={by} type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} data-testid="ik-find" aria-controls="ik-hits" />}</Field>
      {q.trim().length >= 2 && <ul id="ik-hits" className="ik-hits" data-testid="ik-hits" aria-live="polite">{hits.length ? hits.map((h) => <li key={`${h.roomId}-${h.position || ''}`}>
        <button type="button" onClick={() => choose(h)} data-testid="ik-hit" data-room={h.roomId}><b>{h.label}</b><span>{h.detail}</span><span className="ui-meta">Found {h.why}</span></button></li>)
        : <li className="ik-hits__none">No room matches “{q.trim()}”. Try its number, or choose the building and the room below.</li>}</ul>}
      {recent.length > 0 && !room && <div className="ik-recent"><span className="ui-meta">Rooms you asked about before</span>{recent.map((r) => <button key={r} type="button" className="ui-btn ui-btn--sm" onClick={() => set({ roomId: r, building: roomById(r)!.building, position: '' })} data-testid="ik-recent">{fullName(roomById(r)!)}</button>)}</div>}
      <div className="rq-row">
        <Field label="Building">{(fid) => <select id={fid} value={d.building === OTHER_BUILDING ? SITES[0]!.key : d.building} onChange={(e) => set({ building: e.target.value, roomId: '', position: '' })} data-testid="rq-building">{SITES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>}</Field>
        <Field label="Room" error={err('roomId')}>{(fid, by) => <select id={fid} aria-describedby={by} aria-invalid={!!err('roomId')} value={d.roomId} onChange={(e) => set({ roomId: e.target.value, position: '' })} data-testid="rq-room"><option value="">{d.kind === 'general' ? 'Not about one room' : 'Choose a room'}</option>{roomsOf(d.building).map((r) => <option key={r.id} value={r.id}>{fullName(r)}</option>)}</select>}</Field>
      </div>
      {onNotListed && !room && <p className="ik-notlisted"><button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={onNotListed} data-testid="ik-not-listed">The room is not on the list</button> <span className="ui-meta">Say where it is in your own words; the team finds it. No room record is made up.</span></p>}
      {facts.length > 0 && <div className="rq-known" data-testid="rq-known"><h3 className="rq-h">Already on record, so you are not asked</h3><dl>{facts.map(([l, v, src]) => <div key={l}><dt>{l}</dt><dd>{v} <span className="ui-meta">{src}</span></dd></div>)}</dl>
        {room && <p className="ui-meta"><a href={roomHref(room)}>Open {fullName(room)}</a> · <a href={`#/lite/b/${room.building}/${room.floor}`}>See floor {room.floor} in Lite</a></p>}</div>}
      {dupes.length > 0 && <div className="ik-dupes" data-testid="ik-dupes" role="note"><h3 className="rq-h">Already open for this room</h3><ul>{dupes.map((x) => <li key={x.id}>{x.href ? <a href={x.href}>{x.title}</a> : <b>{x.title}</b>} <span className="ui-meta">{x.id} · {x.where}</span></li>)}</ul>
        <p className="ui-meta">If yours is one of these, follow that one instead. If it is a different need, carry on: it is a request of its own.</p></div>}
    </div>
  );
}

/** Photographs and files, with the checklist for this kind of request and the photo policy that applies, said plainly. */
function Photos({ d, id, role, atts, setAtts, set, err }: { d: Draft; id: string | null; role: RoleKey; atts: Attachment[]; setAtts: (a: Attachment[]) => void; set: (p: Partial<Draft>) => void; err: (f: string) => string | null }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ tone: 'info' | 'bad'; text: string } | null>(null); const [over, setOver] = useState(false);
  const pol = policyFor(d); const list = photoChecklist(d);
  const add = async (files: FileList | File[] | null, item: string | null) => {
    if (!files || !id) return; const arr = [...files].slice(0, MAX_ATTACHMENTS); if (!arr.length) return; setBusy(true); setMsg(null);
    const read: Attachment[] = []; const no: string[] = [];
    for (const f of arr) { const a = await readAttachment(f, role, item); if ('why' in a) no.push(...a.why); else read.push(a); }
    const r = read.length ? attach(id, role, read) : null; setBusy(false);
    if (r && 'why' in r) { setMsg({ tone: 'bad', text: r.why.join(' ') }); return; }
    if (r) setAtts(r.record.attachments || []);
    const said = [no.join(' '), r && r.duplicates ? `${plural(r.duplicates, 'file')} already added, so not added again.` : '', r && r.previewsDropped ? 'This browser is out of room for previews: the files are listed without them.' : ''].filter(Boolean).join(' ');
    setMsg(said ? { tone: no.length ? 'bad' : 'info', text: said } : read.length ? { tone: 'info', text: `${plural(read.length, 'file')} added.` } : null);
  };
  const remove = (aid: string) => { if (!id) return; const r = detach(id, aid); if (!('why' in r)) setAtts(r.attachments || []); };
  const of = (item: string) => atts.filter((a) => a.item === item);
  const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const g = d.dims || { w: null, l: null, h: null }; const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return (
    <div className="ik-photos" data-testid="ik-photos" data-policy={pol.policy}>
      <p className="ik-policy"><Icon name="camera" size={18} /><span><b>{pol.policy === 'LOCATION_VERIFICATION_REQUIRED' ? 'A photograph is needed to send this request.' : pol.policy === 'DOCUMENTATION_REQUIRED' ? 'Photographs or a plan are needed before design, not to send.' : 'Photos are optional.'}</b> {pol.why}</span></p>
      <ul className="ik-check" data-testid="ik-checklist">{list.map(([item, label]) => <li key={item} data-done={of(item).length > 0 || undefined}>
        <span className="ik-check__l">{of(item).length > 0 ? <Icon name="check" size={16} /> : <Icon name="camera" size={16} />}{label}</span>
        <span className="ik-check__a">{of(item).map((a) => a.preview ? <img key={a.id} src={a.preview} alt={`${label}: ${a.name}`} /> : <Tag key={a.id} tone="muted">{a.name}</Tag>)}
          <label className="ui-btn ui-btn--sm"><input className="ik-file" type="file" accept="image/*" capture="environment" disabled={busy || !id} onChange={(e) => { void add(e.currentTarget.files, item); e.currentTarget.value = ''; }} data-testid={`ik-photo-${item}`} />Add a photo</label></span></li>)}</ul>
      <div className={`ik-drop${over ? ' on' : ''}`} onDragOver={(e: { preventDefault: () => void }) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e: { preventDefault: () => void; dataTransfer: DataTransfer }) => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files, null); }} data-testid="ik-drop">
        <label className="ui-btn"><input className="ik-file" type="file" multiple accept="image/*,application/pdf,.dwg,.dxf,.rvt,.ifc,.vsdx" disabled={busy || !id} onChange={(e) => { void add(e.currentTarget.files, null); e.currentTarget.value = ''; }} data-testid="ik-files" />Add photographs, plans or drawings</label>
        <span className="ui-meta">or drop them here · JPEG, PNG, HEIC, PDF, DWG, DXF, RVT, IFC, VSDX · up to {MAX_ATTACHMENTS}</span>
      </div>
      {busy && <p role="status" className="ui-meta">Reading the files…</p>}
      {msg && <p role={msg.tone === 'bad' ? 'alert' : 'status'} className={`sc-msg sc-msg--${msg.tone === 'bad' ? 'no' : 'ok'}`} data-testid="ik-photo-msg">{msg.text}</p>}
      {atts.length > 0 && <ul className="ik-atts" data-testid="ik-atts">{atts.map((a) => <li key={a.id} data-testid="ik-att">
        {a.preview ? <img src={a.preview} alt={a.name} /> : <span className="ik-atts__file" aria-hidden="true"><Icon name="book" size={20} /></span>}
        <span><b>{a.name}</b><span className="ui-meta">{size(a.bytes)}{a.item ? ` · ${list.find((x) => x[0] === a.item)?.[1] || a.item}` : ''} · location documented by you, not verified</span></span>
        <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={() => remove(a.id)} aria-label={`Remove ${a.name}`}>Remove</button></li>)}</ul>}
      <p className="ui-meta">The originals stay on your device. This demonstration keeps each file’s name, size, fingerprint and a small preview in this browser; nothing is uploaded, and nothing is read from a photograph: no size, no device, no measurement.</p>
      {d.kind === 'new-room' && <fieldset className="ik-dims" data-testid="ik-dims"><legend>Do you know its size? <span className="ui-meta">Optional. Leave it empty if not: an engineer or a site survey measures it.</span></legend>
        <div className="rq-row">
          <Field label="Width, m" error={err('dims')}>{(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={!!err('dims')} type="number" inputMode="decimal" step="0.1" min={1.5} max={80} value={g.w ?? ''} onChange={(e) => set({ dims: { ...g, w: num(e.target.value) } })} data-testid="ik-dim-w" />}</Field>
          <Field label="Length, m">{(fid) => <input id={fid} type="number" inputMode="decimal" step="0.1" min={1.5} max={120} value={g.l ?? ''} onChange={(e) => set({ dims: { ...g, l: num(e.target.value) } })} data-testid="ik-dim-l" />}</Field>
          <Field label="Ceiling, m">{(fid) => <input id={fid} type="number" inputMode="decimal" step="0.1" min={2.2} max={25} value={g.h ?? ''} onChange={(e) => set({ dims: { ...g, h: num(e.target.value) } })} data-testid="ik-dim-h" />}</Field>
        </div>
        {givenSize(d) && <p className="ui-meta">The proposal uses your size, labeled as yours: not surveyed until an engineer confirms it.</p>}</fieldset>}
    </div>
  );
}

function Section({ title, step, onEdit, children, testId }: { title: string; step: StepId | null; onEdit: (s: StepId) => void; children: ReactNode; testId: string }) {
  return <section className="ik-rev" data-testid={testId}><header><h3>{title}</h3>{step && <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={() => onEdit(step)} aria-label={`Change ${title.toLowerCase()}`}>Change</button>}</header>{children}</section>;
}

export default function Wizard({ role, query, params }: PageProps) {
  const { w, apply } = useWorkspace();
  const first = useMemo(() => start(query, params), []);   // eslint-disable-line react-hooks/exhaustive-deps
  const [id, setId] = useState<string | null>(first.id); const [d, setD] = useState<Draft>(first.d); const [step, setStep] = useState<StepId>(first.step); const [card, setCard] = useState<CardId | null>(first.card);
  const [quick, setQuick] = useState(first.quick); const [sent, setSent] = useState<Request | null>(first.sent); const [note] = useState<string | null>(first.note);
  const [atts, setAtts] = useState<Attachment[]>(() => (first.id ? recordById(first.id)?.attachments || [] : []));
  const [tried, setTried] = useState<StepId | null>(null); const [refused, setRefused] = useState<string[] | null>(null); const [saved, setSaved] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLDivElement>(null); const sentRef = useRef<HTMLHeadingElement>(null); const headRef = useRef<HTMLHeadingElement>(null);
  const [attempt, setAttempt] = useState(0);
  // a shortcut that names a kind or a room replaces what is on screen (a link followed from another page while this one is open)
  const qkey = `${params['kind'] || ''}|${query.get('kind') || ''}|${query.get('room') || ''}|${query.get('position') || ''}|${query.get('card') || ''}|${query.get('draft') || ''}`; const firstKey = useRef(qkey);
  const reset = (s: Start) => { setId(s.id); setD(s.d); setStep(s.step); setCard(s.card); setQuick(s.quick); setSent(s.sent); setTried(null); setRefused(null); setAtts(s.id ? recordById(s.id)?.attachments || [] : []); };
  useEffect(() => { if (qkey === firstKey.current) return; firstKey.current = qkey; reset(start(query, params)); }, [qkey]);   // eslint-disable-line react-hooks/exhaustive-deps
  // the address this page writes for itself (replaceState) fires no event; any other change of address is a person going somewhere, so a
  // link to a new request, or back to the same kind after sending, starts from that address (the shell may keep this page mounted)
  useEffect(() => { const on = () => { const { segs, query: q } = parseHash(location.hash); if (segs[0] !== 'request' || ['help', 'spaces', 'queue'].includes(segs[1] || '')) return;
    if (!segs[1] && !q.get('kind') && !q.get('room') && !q.get('draft') && !q.get('card')) return; reset(start(q, segs[1] && segs[1] !== 'new' ? { kind: segs[1] } : {})); };
    window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (attempt) formRef.current?.querySelector<HTMLElement>('[aria-invalid=true]')?.focus(); }, [attempt]);
  useEffect(() => { if (sent) sentRef.current?.focus(); }, [sent]);
  // the one-screen request keeps its answers for the life of the tab, as the portal always has
  useEffect(() => { if (quick && !id) { try { sessionStorage.setItem(LEGACY_KEY, JSON.stringify(d)); } catch { /* the answers last the page */ } } }, [d, quick, id]);
  // a draft that has an id is saved as it changes (shortly after the last keystroke)
  useEffect(() => { if (!id || sent) return; const t = setTimeout(() => { const r = saveDraft(role, d, id, step); setSaved('why' in r ? r.why[0]! : 'Saved in this browser'); }, 400); return () => clearTimeout(t); }, [d, id, step, role, sent]);

  const k = kindOf(d.kind); const steps = stepsOf(d.kind); const at = Math.max(0, steps.indexOf(step)); const p = useMemo(() => propose(d), [d]); const errs = useMemo(() => problems(d), [d]);
  const own = (s: StepId) => Object.fromEntries(Object.entries(errs).filter(([f]) => FIELDS[s].includes(f) && !(f === 'need' && isTool(d.kind))));
  const shown = (f: string) => { if (!tried) return null; const upto = tried === 'review' ? steps : steps.slice(0, steps.indexOf(tried) + 1); return upto.some((s) => FIELDS[s].includes(f)) || tried === 'review' ? errs[f] || null : null; };
  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setRefused(null); };
  const setKind = (kind: KindId) => { setD((x) => ({ ...blank(kind), need: x.need, roomId: x.roomId, building: x.building, goals: askGoals(kind) ? x.goals : [], place: x.place, dims: x.dims, when: x.when, matters: x.matters })); setTried(null); setRefused(null); };
  const go = (s: StepId) => { setStep(s); setTried(null); setRefused(null); if (id) replaceHash(`#/request/new?draft=${id}&step=${s}`); requestAnimationFrame(() => headRef.current?.focus()); };
  const ensureDraft = (s: StepId): string | null => { if (isTool(d.kind)) return null; const r = saveDraft(role, d, id, s); if ('why' in r) { setRefused(r.why); return null; } setId(r.id); replaceHash(`#/request/new?draft=${r.id}&step=${s}`); try { sessionStorage.removeItem(LEGACY_KEY); } catch { /* nothing kept */ } return r.id; };
  const next = () => { const e = own(step); setTried(step); if (Object.keys(e).length) { setRefused(Object.values(e)); setAttempt((n) => n + 1); return; } const to = steps[at + 1]; if (!to) return; if (!isTool(d.kind)) ensureDraft(to); go(to); };
  const back = () => { const to = steps[at - 1]; if (to) go(to); };
  const finishLater = () => { const r = saveDraft(role, d, id, step, true); if ('why' in r) { setRefused(r.why); return; } setId(r.id); location.hash = '#/requests'; };
  const submit = () => {
    setTried('review'); if (Object.keys(errs).length && !(isTool(d.kind))) { setRefused(Object.values(errs)); setAttempt((n) => n + 1); return; }
    const out = apply((nx) => send(nx, role as RoleKey, d, undefined, id));
    if ('why' in out) { setRefused(out.why); return; }
    setRefused(null); setSent(out); setId(out.id); setTried(null); replaceHash(`#/request/new?draft=${out.id}`);   // a refresh shows it as received; the link to its page still navigates try { sessionStorage.removeItem(LEGACY_KEY); } catch { /* nothing to clear */ }
  };
  const copy = async () => { const { title, summary } = summarise(d, p); const text = `${title}\n${summary}${id ? `\nDraft ${id}` : ''}`; try { await navigator.clipboard.writeText(text); setCopied(true); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); setCopied(true); } catch { setCopied(false); } ta.remove(); } };
  const go2 = handoff(d); const desk = useMemo(() => loadDesk(), [sent]);   // eslint-disable-line react-hooks/exhaustive-deps
  const room = roomById(d.roomId); const rec = room ? roomRecord(room.id) : null; const site = SITES.find((b) => b.key === d.building) || null;
  const qty = (cat: string) => d.adds.find((a) => a.cat === cat)?.qty || 0;
  const setQty = (cat: string, n: number) => set({ adds: [...d.adds.filter((a) => a.cat !== cat), ...(n > 0 ? [{ cat, qty: Math.min(12, n) }] : [])] });
  const cardDef = CARDS.find((c) => c.id === card) || null; const kindsHere = quick ? QUICK_KINDS : cardDef ? cardDef.kinds : [];

  // ── what each step asks ─────────────────────────────────────────────────────────────────────────────
  const kindTiles = kindsHere.length > 1 && <fieldset className="rq-kinds"><legend className="rq-h">{quick ? `What do you need in ${room ? fullName(room) : 'this room'}?` : 'Which of these is it?'}</legend>
    <div className="rq-kinds__grid" role="radiogroup" aria-label="Kind of request">{kindsHere.map((x) => { const K = kindOf(x); return (
      <label key={x} className={`rq-kind${d.kind === x ? ' on' : ''}`} data-testid={`rq-kind-${x}`}><input type="radio" name="rq-kind" value={x} checked={d.kind === x} onChange={() => setKind(x)} /><Icon name={KIND_ICON[x]} size={22} /><b>{K.label}</b><span>{K.blurb}</span></label>); })}</div></fieldset>;
  const needField = !isTool(d.kind) && <Field label={d.kind === 'general' ? 'Tell us what you need, in your own words' : 'What do you need, in a sentence?'} hint={d.kind === 'general' ? 'Anything that helps: what is happening, who it is for, by when. You do not need to know the technical words.' : 'For example: “The finance team needs a room where six people can meet suppliers on video.”'} error={shown('need')}>{(fid, by) =>
    <textarea id={fid} aria-describedby={by} aria-invalid={!!shown('need')} rows={d.kind === 'general' ? 5 : 3} maxLength={600} value={d.need} onChange={(e) => set({ need: e.target.value })} data-testid="rq-need" />}</Field>;
  const goalChips = askGoals(d.kind) && <fieldset className="rq-chips" data-testid="ik-goals"><legend>What should be better? <span className="ui-meta">Optional, any that apply</span></legend>{GOALS.map(([g, l]) => { const on = d.goals.includes(g); return <label key={g} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => set({ goals: on ? d.goals.filter((x) => x !== g) : [...d.goals, g] })} />{l}</label>; })}</fieldset>;
  const whatStep = <>
    {!cardDef && !quick && <div className="ik-cards ik-cards--pick" role="radiogroup" aria-label="What is it about?">{CARDS.map((c) => <label key={c.id} className={`ik-card${card === c.id ? ' on' : ''}`} data-testid={`ik-card-${c.id}`}><input type="radio" name="ik-card" checked={card === c.id} onChange={() => { setCard(c.id); setKind(c.kinds[0]!); }} /><Icon name={c.icon} size={24} /><b>{c.label}</b><span>{c.blurb}</span></label>)}
      <label className={`ik-card ik-card--unsure${card === null && d.kind === 'general' ? ' on' : ''}`} data-testid="ik-card-unsure"><input type="radio" name="ik-card" checked={false} onChange={() => { setCard('help'); setKind('general'); }} /><Icon name="info" size={24} /><b>Not sure?</b><span>Say it in your own words. The right team picks it up.</span></label></div>}
    {cardDef && !quick && <p className="ik-cardline"><span className="ui-meta">About:</span> <b>{cardDef.label}</b> <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={() => setCard(null)} data-testid="ik-card-change">Choose something else</button></p>}
    {kindTiles}
    {cardDef && <p className="rq-then"><Icon name="arrow-right" size={16} /> <span>{k.then}</span></p>}
    {cardDef && needField}
    {cardDef && goalChips}
  </>;
  const whereStep = d.kind === 'new-room' ? <div className="ik-where" data-testid="ik-where">
    <div className="rq-row">
      <Field label="Building" error={shown('building')}>{(fid, by) => <select id={fid} aria-describedby={by} value={d.building} onChange={(e) => set({ building: e.target.value, floor: e.target.value === OTHER_BUILDING ? d.floor : 1 })} data-testid="rq-building">{SITES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}<option value={OTHER_BUILDING}>A building not on this list</option></select>}</Field>
      {d.building === OTHER_BUILDING
        ? <Field label="Floor" hint="0 for the ground floor" error={shown('floor')}>{(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={!!shown('floor')} type="number" inputMode="numeric" min={0} max={200} value={Number.isFinite(d.floor) ? d.floor : ''} onChange={(e) => set({ floor: Number(e.target.value) })} />}</Field>
        : <Field label="Floor" error={shown('floor')}>{(fid, by) => <select id={fid} aria-describedby={by} value={d.floor} onChange={(e) => set({ floor: Number(e.target.value) })} data-testid="rq-floor">{Array.from({ length: site?.floors || 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>}</Field>}
    </div>
    {d.building === OTHER_BUILDING && <Field label="Which building?" hint="Its name or address, as people know it. It is not on record yet; someone confirms it." error={shown('building')}>{(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={!!shown('building')} type="text" maxLength={80} value={d.place.building} onChange={(e) => set({ place: { ...d.place, building: e.target.value } })} data-testid="ik-place-building" />}</Field>}
    <Field label="What do people call this space?" hint="Optional: “Level 3 project room”, “the old print room”." error={shown('place')}>{(fid, by) => <input id={fid} aria-describedby={by} type="text" maxLength={80} value={d.place.name} onChange={(e) => set({ place: { ...d.place, name: e.target.value } })} data-testid="ik-place-name" />}</Field>
    <p className="ik-prov" data-testid="ik-provisional-note"><Icon name="place" size={18} /><span>This becomes a <b>provisional space</b>: requested, not built, and not an operational room. Where it is stays “documented by you” until someone on site confirms it.{site ? <> <a href={`#/lite/b/${site.key}/${d.floor}`}>See floor {d.floor} of {site.name} in Lite</a>.</> : null}</span></p>
  </div> : <RoomPicker d={d} set={set} err={shown} w={w} id={id} onNotListed={d.kind === 'general' || isTool(d.kind) ? undefined : () => { setKind('general'); setCard('help'); }} />;
  const needsStep = <>
    {d.kind === 'new-room' && <>
      <fieldset className="rq-chips"><legend>What is the room for?</legend>{USES.map((u) => <label key={u.id} className={d.use === u.id ? 'on' : ''}><input type="radio" name="rq-use" checked={d.use === u.id} onChange={() => set({ use: u.id })} />{u.label}</label>)}</fieldset>
      <Field label="How many people at once?" error={shown('people')}>{(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={!!shown('people')} type="number" inputMode="numeric" min={1} max={600} value={Number.isFinite(d.people) ? d.people : ''} onChange={(e) => set({ people: Number(e.target.value) })} data-testid="rq-people" />}</Field></>}
    {d.kind === 'replace-device' && rec && <Field label="Which device?" hint="Choose it here, or press it in the picture." error={shown('position')}>{(fid, by) => <select id={fid} aria-describedby={by} aria-invalid={!!shown('position')} value={d.position} onChange={(e) => set({ position: e.target.value })} data-testid="rq-position"><option value="">Choose a device</option>{rec.positions.filter((x) => !x.furniture).map((x) => <option key={x.code} value={x.code}>{x.label} ({x.code})</option>)}</select>}</Field>}
    {d.kind === 'evaluate-device' && <Field label="What kind of device?" error={shown('category')}>{(fid, by) => <select id={fid} aria-describedby={by} value={d.category} onChange={(e) => set({ category: e.target.value })} data-testid="rq-category">{ADDABLE.map((c) => <option key={c} value={c}>{catName(c)}</option>)}</select>}</Field>}
    {(d.kind === 'add-devices' || d.kind === 'event' || d.kind === 'new-room') && (d.kind === 'new-room' || rec) && <Extras optional={d.kind === 'new-room'} count={d.adds.reduce((n, a) => n + a.qty, 0)}><fieldset className="rq-adds" aria-describedby={shown('adds') ? 'rq-adds-e' : undefined}><legend>{d.kind === 'new-room' ? 'Extra equipment (the room already comes with what a room of this kind needs)' : d.kind === 'event' ? 'Extra equipment for the event' : 'What should be added?'}</legend>
      <ul>{ADDABLE.map((c) => <li key={c} data-on={qty(c) > 0 || undefined}><span>{catName(c)}</span><span className="rq-step"><button type="button" aria-label={`One fewer ${catName(c)}`} disabled={qty(c) === 0} onClick={() => setQty(c, qty(c) - 1)}>−</button><output aria-live="polite" data-testid={`rq-qty-${c}`}>{qty(c)}</output><button type="button" aria-label={`One more ${catName(c)}`} disabled={qty(c) >= 12} onClick={() => setQty(c, qty(c) + 1)} data-testid={`rq-more-${c}`}>+</button></span></li>)}</ul>
      {shown('adds') && <p id="rq-adds-e" className="ui-field__error">{shown('adds')}</p>}</fieldset></Extras>}
    {d.kind === 'event' && <Field label="Day of the event" error={shown('date')}>{(fid, by) => <input id={fid} aria-describedby={by} aria-invalid={!!shown('date')} type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} data-testid="rq-date" />}</Field>}
    {!isTool(d.kind) && <div className="rq-row">
      {d.kind !== 'event' && <Field label="When is it wanted?">{(fid) => <select id={fid} value={d.when} onChange={(e) => set({ when: e.target.value })} data-testid="rq-when">{WHEN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>}
      <Field label="If it has to wait">{(fid) => <select id={fid} value={d.matters} onChange={(e) => set({ matters: e.target.value })} data-testid="rq-matters">{MATTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}</Field>
    </div>}
  </>;
  const pol = policyFor(d); const checklist = photoChecklist(d); const missing = checklist.filter(([i]) => !atts.some((a) => a.item === i));
  const reviewStep = <div className="ik-review" data-testid="ik-review">
    <Section title="Your request" step="what" onEdit={go} testId="ik-rev-what"><p><b>{kindOf(d.kind).label}.</b> {d.need.trim() || <span className="ui-muted">Nothing said yet.</span>}</p>{d.goals.length > 0 && <p className="ik-goalline">{d.goals.map((g) => <Chip key={g} small tone="muted">{goalLabel(g)}</Chip>)}</p>}</Section>
    <Section title="Location" step="where" onEdit={go} testId="ik-rev-where"><p>{d.kind === 'new-room' ? <>{d.place.name.trim() ? `${d.place.name.trim()}, ` : 'A new space, '}{siteName(d)}, floor {d.floor}. <Tag tone="warn">Provisional</Tag> <span className="ui-meta">documented by you; someone on site confirms it</span></> : room ? <>{fullName(room)} <span className="ui-meta">on record</span></> : <span className="ui-muted">Not about one room.</span>}</p></Section>
    {steps.includes('needs') && <Section title="Desired result" step="needs" onEdit={go} testId="ik-rev-needs"><p>{p ? `${p.title}. ${plural(p.equipment.reduce((s, e) => s + e.count, 0), 'device')}${p.marked.length ? `, ${p.marked.length} from your request` : ''}; ${p.tests.added} ${d.kind === 'new-room' ? 'tests would apply' : 'tests to run'}.` : 'As you described it.'}</p></Section>}
    <Section title="Attachments" step="photos" onEdit={go} testId="ik-rev-photos"><p>{atts.length ? plural(atts.length, 'file') : 'None added.'}{missing.length && atts.length ? ` Not yet shown: ${missing.map(([, l]) => l.replace(/^Show /, '').toLowerCase()).join('; ')}.` : ''} <span className="ui-meta">{pol.policy === 'DOCUMENTATION_REQUIRED' ? 'Needed before design; someone on site can supply them.' : 'Optional for this request.'}</span></p></Section>
    <Section title="Timing" step={steps.includes('needs') ? 'needs' : null} onEdit={go} testId="ik-rev-time"><p>{d.kind === 'event' ? (d.date ? `On ${d.date}.` : 'No day given.') : `${WHEN.find((x) => x[0] === d.when)?.[1] || ''}.`} If it has to wait: {MATTERS.find((x) => x[0] === d.matters)?.[1]?.toLowerCase()}.</p></Section>
    <Section title="Next steps" step={null} onEdit={go} testId="ik-rev-next"><p>{k.then}</p><p className="ui-meta">Nobody is assigned and no date is promised by sending. You can follow it, step by step, from My requests.</p></Section>
  </div>;

  const proposedSide = p ? <div className="ik-side__in"><Preview p={p} d={d} onPick={d.kind === 'replace-device' ? (c) => { if (p.positions.some((x) => x.code === c && !x.furniture)) set({ position: c }); } : undefined} /><Summary p={p} d={d} /></div> : null;
  const stepBody: Record<StepId, ReactNode> = { what: whatStep, where: whereStep, needs: needsStep, photos: <Photos d={d} id={id} role={role} atts={atts} setAtts={setAtts} set={set} err={shown} />, review: reviewStep };
  const last = at === steps.length - 1; const toolEnd = isTool(d.kind) && last;

  // ── received ───────────────────────────────────────────────────────────────────────────────────────
  if (sent && !quick) { const s = standing(sent, w, desk); const sp = sent.draft ? propose(draftOf(sent)) : null; return (
    <div className="ik" data-native="" data-testid="request-page" data-kind={sent.kind} data-view="received">
      <IntakeNav role={role} here="new" />
      <section className="ik-received" data-testid="rq-sent" data-id={sent.id} data-goes={sent.goes} aria-labelledby="ik-rec-h">
        <h1 id="ik-rec-h" ref={sentRef} tabIndex={-1}>Your request has been received.</h1>
        <dl className="ik-received__facts"><div><dt>Request</dt><dd data-testid="ik-rec-id">{sent.id}</dd></div><div><dt>Status</dt><dd data-testid="ik-rec-status"><b>{s.words}</b></dd></div><div><dt>Next · {s.owner}</dt><dd>{s.next}</dd></div>
          {sent.provisional && <div><dt>Provisional space</dt><dd data-testid="ik-rec-prv">{sent.provisional.id}: {sent.provisional.name}, {sent.provisional.buildingName}, floor {sent.provisional.floor}. Awaiting review; not an operational room.</dd></div>}</dl>
        <p className="ik-received__acts"><a className="ui-btn ui-btn--primary" href={`#/requests/${sent.id}`} data-testid="ik-track">Follow this request</a><a className="ui-btn" href="#/request">Ask for something else</a></p>
        <p className="ui-meta">{sent.title}. Nobody is assigned and no date is promised by sending. Kept in this browser; synthetic.</p>
      </section>
      {sp && sent.kind !== 'replace-device' && <section className="ik-sec" aria-labelledby="ik-prop-h"><h2 id="ik-prop-h">{sent.kind === 'new-room' ? 'The room you asked for, as proposed' : 'The room with your request, as proposed'}</h2><ProposedRoom p={sp} d={draftOf(sent)} people={sent.kind === 'new-room' ? draftOf(sent).people : roomById(sent.roomId || '')?.capacity || 8} /></section>}
    </div>); }

  // ── one screen, from a room or a device ────────────────────────────────────────────────────────────
  if (quick) return (
    <div className="ik rq" data-native="" data-testid="request-page" data-kind={d.kind} data-view="quick">
      <IntakeNav role={role} here="new" />
      <PageHero compact eyebrow="Request" icon="plus" title={room ? `Ask for work in ${fullName(room)}` : 'Ask for work in a room'} lede="The room is already on record, so you are only asked what you need. You will see what you are asking for before you send it." meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">Asking as the {ROLES[role].label}</span>]} />
      {kindTiles}
      <div className="rq-cols" ref={formRef}>
        <div className="rq-form rq-a">
          <div className="rq-row">
            <Field label="Building">{(fid) => <select id={fid} value={d.building} onChange={(e) => set({ building: e.target.value, roomId: '', position: '' })} data-testid="rq-building">{SITES.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>}</Field>
            <Field label="Room" error={shown('roomId')}>{(fid, by) => <select id={fid} aria-describedby={by} aria-invalid={!!shown('roomId')} value={d.roomId} onChange={(e) => set({ roomId: e.target.value, position: '' })} data-testid="rq-room"><option value="">Choose a room</option>{roomsOf(d.building).map((r) => <option key={r.id} value={r.id}>{fullName(r)}</option>)}</select>}</Field>
          </div>
          {facts(d)}
          {needsStep}
        </div>
        <div className="rq-form rq-b">
          {isTool(d.kind) ? <div className="rq-send"><p className="rq-then"><Icon name="arrow-right" size={16} /> <span>{k.then}</span></p>{go2 ? <Handoff role={role} d={d} href={go2} /> : <p className="ui-muted">Choose the room first.</p>}</div> : <>
            {needField}
            <div className="rq-send">
              {refused && <div role="alert" className="ui-notice ui-tone--bad" data-testid="rq-refused"><b>Not sent yet.</b><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></div>}
              <Button kind="primary" onClick={submit} testId="rq-send">Send the request</Button>
              <p className="ui-meta">Sending creates {k.goes === 'desk' ? 'a project on the decision desk' : 'a job in ServiceHands'}. Nothing is ordered, approved or changed by asking.</p>
              <button type="button" className="ui-btn ui-btn--quiet" onClick={() => { const nid = ensureDraft('photos'); if (nid) { setQuick(false); go('photos'); } }} data-testid="ik-more"><Icon name="camera" size={16} /> Add photos or more detail</button>
            </div></>}
          {sent && <div className="rq-sent" data-testid="rq-sent" data-id={sent.id} data-goes={sent.goes}><h3 ref={sentRef} tabIndex={-1}>Your request has been received: {sent.id}</h3>
            <ul className="rq-mine">{<RequestItem r={sent} w={w} desk={loadDesk()} role={role} />}</ul></div>}
        </div>
        <div className="rq-side" aria-live="polite">
          <h2 className="build__h">What you are asking for</h2>
          {proposedSide || <Notice tone="info">{d.kind === 'problem' ? 'ServiceHands asks what is wrong and suggests what to try first.' : 'Choose the room and the picture appears here.'}</Notice>}
        </div>
      </div>
    </div>
  );

  // ── the steps ──────────────────────────────────────────────────────────────────────────────────────
  return (
    <div className="ik" data-native="" data-testid="request-page" data-kind={d.kind} data-view="wizard" data-step={step} data-draft={id || undefined}>
      <IntakeNav role={role} here="new" />
      <PageHero compact eyebrow="New request" icon="plus" title={cardDef ? cardDef.label : 'What can we help you with?'} lede="A few plain answers. Everything the records already know is filled in, and you see what you are asking for before you send it."
        meta={[<Tag key="s" tone="warn">Synthetic data</Tag>, <span key="r">Asking as the {ROLES[role].label}</span>, ...(id ? [<span key="d" data-testid="ik-draft-id">Draft {id} · {saved || 'saved in this browser'}</span>] : [])]} />
      {note && <Notice tone="warn">{note}</Notice>}
      <ol className="ik-steps" aria-label="Steps" data-testid="ik-steps">{steps.map((s, i) => <li key={s} aria-current={s === step ? 'step' : undefined} data-done={i < at || undefined}>
        {i <= at || (id && i <= at + 1) ? <button type="button" onClick={() => (i < at ? go(s) : i === at + 1 ? next() : undefined)} disabled={i === at}><span className="ik-steps__n">{i < at ? <Icon name="check" size={14} /> : i + 1}</span><span className="ik-steps__l">{STEP_LABEL[s]}</span></button>
          : <span><span className="ik-steps__n">{i + 1}</span><span className="ik-steps__l">{STEP_LABEL[s]}</span></span>}</li>)}</ol>
      <div className={`ik-cols${(step === 'needs' || step === 'where') && proposedSide ? '' : ' ik-cols--one'}`}>
        <div className="ik-main" ref={formRef}>
          <h2 className="ik-step__h" ref={headRef} tabIndex={-1}>{at + 1} · {step === 'needs' && d.kind !== 'new-room' && d.kind !== 'event' ? 'The details' : STEP_LABEL[step]}</h2>
          {stepBody[step]}
          {step === 'review' && p && <section className="ik-sec" aria-labelledby="ik-prop-h2"><h3 id="ik-prop-h2">{d.kind === 'new-room' ? 'The room you are asking for, as proposed' : 'The room with your request, as proposed'}</h3><ProposedRoom p={p} d={d} people={d.kind === 'new-room' ? d.people : room?.capacity || 8} /><Summary p={p} d={d} /></section>}
          {refused && <div role="alert" className="ui-notice ui-tone--bad" data-testid="rq-refused"><b>{step === 'review' ? 'Not sent yet.' : 'Before you go on:'}</b><ul>{refused.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          <div className="ik-actions">
            {at > 0 && <Button kind="quiet" onClick={back} testId="ik-back">Back</Button>}
            {toolEnd ? (go2 ? <Handoff role={role} d={d} href={go2} /> : <p className="ui-muted">Choose the room first.</p>)
              : last ? <>
                <Button kind="primary" onClick={submit} testId="rq-send">Send the request</Button>
                <Button onClick={finishLater} testId="ik-later">Save and finish later</Button>
                <Button kind="quiet" onClick={() => void copy()} testId="ik-copy">{copied ? 'Copied' : 'Copy the summary'}</Button></>
                : <><Button kind="primary" onClick={next} testId="ik-next" disabled={step === 'what' && !cardDef}>Next: {STEP_LABEL[steps[at + 1]!]}</Button>{id && <Button kind="quiet" onClick={finishLater} testId="ik-later">Save and finish later</Button>}</>}
          </div>
          {last && !toolEnd && <p className="ui-meta">Sending creates {k.goes === 'desk' ? 'a project on the decision desk' : k.goes === 'servicehands' ? 'a job in ServiceHands' : 'a request for the AV operations team to route'}. Nothing is ordered, approved or changed by asking.</p>}
        </div>
        {(step === 'needs' || step === 'where') && proposedSide && <aside className="ik-side" aria-live="polite" aria-label="What you are asking for"><h2 className="build__h">What you are asking for</h2>{proposedSide}</aside>}
      </div>
    </div>
  );
}

/** What the records already know about the room (the one-screen request shows it at the top). */
function facts(d: Draft) { const f = known(d); return f.length ? <div className="rq-known" data-testid="rq-known"><h3 className="rq-h">Already on record, so you are not asked</h3><dl>{f.map(([l, v, src]) => <div key={l}><dt>{l}</dt><dd>{v} <span className="ui-meta">{src}</span></dd></div>)}</dl></div> : null; }

/** Optional extras stay folded until wanted, so a new room is four answers long; equipment requests show them at once. */
function Extras({ optional, count, children }: { optional: boolean; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(count > 0);
  if (!optional) return <>{children}</>;
  return <details className="rq-extras" open={open} onToggle={(e: { currentTarget: HTMLDetailsElement }) => setOpen(e.currentTarget.open)} data-testid="rq-extras"><summary>Anything extra? <span className="ui-meta">{count ? `${count} added` : 'optional'}</span></summary>{children}</details>;
}
