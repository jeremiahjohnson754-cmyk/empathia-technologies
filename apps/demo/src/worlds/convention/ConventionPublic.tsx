/**
 * Convention, public journeys: Attend Expo and Keynote & Polls. Attendee-facing; no organiser, exhibitor-private or engineering data is
 * in this module. The poll and the questions work locally and are dropped when the world or the role changes (scope.ts).
 *
 * Larkspur Exchange Convention Centre, the Northlight Technology Expo and every exhibitor named here are fictional.
 */
import { useState, type ComponentType } from 'react';
import { Block, Ev, Pick, Plan, Said, ScreenHead, useScoped, type Place, type ScreenProps, type Zone } from '../kit.js';
import { scopedStore } from '../scope.js';
import { journeyAt } from '../registry.js';

export const EXPO = 'Northlight Technology Expo (fictional)';
const VIEW = [600, 400] as const;
type Cat = 'Audio' | 'Displays' | 'Networks' | 'Control' | 'Collaboration';
interface Exhibitor { id: string; name: string; booth: string; cat: Cat; about: string }
const EXHIBITORS: Exhibitor[] = [
  { id: 'e1', name: 'Quillfinch Audio', booth: 'A1', cat: 'Audio', about: 'Ceiling microphones and room loudspeakers' },
  { id: 'e2', name: 'Tamber & Rook Displays', booth: 'A2', cat: 'Displays', about: 'Large-format and fine-pitch LED displays' },
  { id: 'e3', name: 'Osmoor Networks', booth: 'A3', cat: 'Networks', about: 'Switching for audio and video over IP' },
  { id: 'e4', name: 'Pelliwick Controls', booth: 'A4', cat: 'Control', about: 'Room control and scheduling panels' },
  { id: 'e5', name: 'Harrowgate Collaboration', booth: 'B1', cat: 'Collaboration', about: 'Meeting-room bars and cameras' },
  { id: 'e6', name: 'Venn & Sable Acoustics', booth: 'B2', cat: 'Audio', about: 'Acoustic treatment and measurement services' },
  { id: 'e7', name: 'Lumenwake Projection', booth: 'B3', cat: 'Displays', about: 'Projection for lecture halls and auditoria' },
  { id: 'e8', name: 'Corrie Fold Systems', booth: 'B4', cat: 'Networks', about: 'Monitoring for AV estates' },
];
const boothAt = (b: string): [number, number] => [120 + (Number(b[1]) - 1) * 90, b[0] === 'A' ? 110 : 190];
const ZONES: Zone[] = [
  { id: 'hall', label: 'Hall A', short: '', x: 60, y: 60, w: 400, h: 190, kind: 'ring' },
  ...EXHIBITORS.map((e): Zone => ({ id: e.booth, label: `Booth ${e.booth}`, short: e.booth, x: boothAt(e.booth)[0] - 32, y: boothAt(e.booth)[1] - 26, w: 64, h: 52, kind: 'booth' })),
  { id: 'keynote', label: 'Keynote Theatre', short: 'Keynote', x: 480, y: 60, w: 100, h: 190, kind: 'field' },
  { id: 'r1', label: 'Session Room 1', short: 'Room 1', x: 60, y: 290, w: 150, h: 70, kind: 'stand' }, { id: 'r2', label: 'Session Room 2', short: 'Room 2', x: 230, y: 290, w: 150, h: 70, kind: 'stand' },
  { id: 'food', label: 'Food court', short: 'Food', x: 400, y: 290, w: 180, h: 70, kind: 'green' },
];
const PLACES: Place[] = [{ id: 'entrance', label: 'Main entrance', x: 40, y: 200, kind: 'gate', short: 'E' }, { id: 'reg', label: 'Registration', x: 40, y: 110, kind: 'guest-services', short: 'R' }, { id: 'aid', label: 'First aid', x: 470, y: 270, kind: 'first-aid', short: '+' }, { id: 'quiet', label: 'Quiet room', x: 220, y: 270, kind: 'water', short: 'Q' }];
interface Session { id: string; at: string; title: string; track: 'Keynote' | 'Engineering' | 'Workplace'; room: string; zone: string }
const SESSIONS: Session[] = [
  { id: 's1', at: '09:30', title: 'Opening keynote: rooms that explain themselves', track: 'Keynote', room: 'Keynote Theatre', zone: 'keynote' },
  { id: 's2', at: '11:00', title: 'Audio over IP without the guesswork', track: 'Engineering', room: 'Session Room 1', zone: 'r1' },
  { id: 's3', at: '11:00', title: 'Designing the accessible meeting room', track: 'Workplace', room: 'Session Room 2', zone: 'r2' },
  { id: 's4', at: '13:30', title: 'Commissioning: proof before handover', track: 'Engineering', room: 'Session Room 1', zone: 'r1' },
  { id: 's5', at: '15:00', title: 'What a room should tell its users', track: 'Workplace', room: 'Session Room 2', zone: 'r2' },
];
/** Yours for this visit and this role only: nothing is stored. */
const agenda = scopedStore(() => ({ sessions: [] as string[], meetings: [] as string[], find: '' }));

function AttendExpo({ world, journey, config }: ScreenProps) {
  const [a, setA] = useScoped(agenda);
  const [cat, setCat] = useState<'all' | Cat>('all'); const [sel, setSel] = useState<string>('e1');
  const q = a.find.trim().toLowerCase();
  const list = EXHIBITORS.filter((e) => (cat === 'all' || e.cat === cat) && (!q || `${e.name} ${e.about} ${e.cat} ${e.booth}`.toLowerCase().includes(q)));
  const s = list.find((e) => e.id === sel) ?? list[0];
  const toggle = (id: string) => setA((v) => ({ ...v, sessions: v.sessions.includes(id) ? v.sessions.filter((x) => x !== id) : [...v.sessions, id] }));
  const clash = SESSIONS.filter((x) => a.sessions.includes(x.id)).some((x, _, all) => all.some((y) => y.id !== x.id && y.at === x.at));
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">{EXPO}. Exhibitors, sessions and rooms are invented.</p></ScreenHead>
    <div className="w-two">
      <Block title="Exhibitors" sub={`${list.length} of ${EXHIBITORS.length}`} testId="exhibitors">
        <label className="w-field"><span>Find an exhibitor</span><input type="search" value={a.find} onChange={(e) => setA((v) => ({ ...v, find: e.target.value }))} placeholder="Name, product or booth" data-testid="expo-find" /></label>
        <Pick label="Category" value={cat} options={[['all', 'All'], ['Audio', 'Audio'], ['Displays', 'Displays'], ['Networks', 'Networks'], ['Control', 'Control'], ['Collaboration', 'Collaboration']]} onChange={setCat} />
        {list.length ? <ul className="w-list w-list--pick">{list.map((e) => <li key={e.id}><button type="button" className="w-item" aria-pressed={s?.id === e.id} onClick={() => setSel(e.id)} data-exhibitor={e.id}><b>{e.name}</b><span className="ui-meta">Booth {e.booth} · {e.cat} · {e.about}</span></button></li>)}</ul>
          : <p className="ui-meta" data-testid="expo-empty">No exhibitor matches. Clear the search or choose All.</p>}
      </Block>
      <div>
        <Plan label={`Hall map${s ? `: booth ${s.booth}, ${s.name}, highlighted` : ''}`} view={VIEW} zones={ZONES} places={PLACES} lit={s ? [s.booth] : []} selected="entrance" route={s ? [[40, 200], [boothAt(s.booth)[0], 150], boothAt(s.booth)] : undefined}
          caption={<>2D hall map · not to scale · E entrance, R registration, Q quiet room. Aisles are step-free throughout.</>} />
        {s && <Block title={s.name} sub={`Booth ${s.booth} · fictional exhibitor`} testId="exhibitor-detail">
          <p>{s.about}.</p>
          {a.meetings.includes(s.id) ? <p><span className="ui-tag ui-tone--info" data-testid="meeting-held">Meeting request held locally</span> <button type="button" className="ui-btn ui-btn--quiet w-btn" onClick={() => setA((v) => ({ ...v, meetings: v.meetings.filter((x) => x !== s.id) }))}>Withdraw</button></p>
            : <p><button type="button" className="ui-btn w-btn" onClick={() => setA((v) => ({ ...v, meetings: [...v.meetings, s.id] }))} data-testid="meeting-ask">Ask to meet {s.name}</button></p>}
          <p className="ui-meta">Asking to meet would share your name with this exhibitor only, with your consent, and you could withdraw it. Here the request stays in this page.</p>
        </Block>}
      </div>
    </div>
    <div className="w-two">
      <Block title="Sessions" sub="add to your agenda" testId="sessions">
        <ul className="w-list">{SESSIONS.map((x) => <li key={x.id}><b>{x.at} · {x.title}</b> <span className="ui-meta">{x.track} · {x.room}</span> <button type="button" className="ui-btn w-btn" aria-pressed={a.sessions.includes(x.id)} onClick={() => toggle(x.id)} aria-label={`${a.sessions.includes(x.id) ? 'Remove' : 'Add'} ${x.title}`}>{a.sessions.includes(x.id) ? 'In my agenda' : 'Add'}</button></li>)}</ul>
        <p className="ui-meta">Room capacity is not shown: no verified count exists in this demonstration <Ev state="UNAVAILABLE" /></p>
      </Block>
      <Block title="My agenda" sub="kept for this visit only" testId="agenda">
        {a.sessions.length ? <ol className="w-way">{SESSIONS.filter((x) => a.sessions.includes(x.id)).map((x) => <li key={x.id}>{x.at} · {x.title} <span className="ui-meta">{x.room}</span></li>)}</ol> : <p className="ui-meta">Nothing yet. Add a session to start your agenda.</p>}
        <Said>{clash ? 'Two of your sessions are at the same time.' : `${a.sessions.length} session${a.sessions.length === 1 ? '' : 's'} in your agenda.`}</Said>
      </Block>
    </div>
  </>);
}

// ---- the keynote poll (works locally; counted, never attributed)
const OPTIONS = ['Knowing a room works before the meeting', 'One place to find any device', 'Proof that a repair fixed it', 'Rooms that are easier to use'];
interface Q { id: string; text: string; state: 'pending' | 'shown' | 'declined'; mine?: boolean }
const poll = scopedStore(() => ({ open: true, voted: null as number | null, counts: [41, 27, 33, 19], asked: 0,
  questions: [{ id: 'q1', text: 'How do you know a room is ready without visiting it?', state: 'shown' }, { id: 'q2', text: 'What does “verified” mean for a device nobody has inspected?', state: 'pending' }, { id: 'q3', text: 'Buy my product at booth Z9!!!', state: 'pending' }] as Q[] }));

function KeynotePolls({ world, journey, config }: ScreenProps) {
  const [p, setP] = useScoped(poll); const [draft, setDraft] = useState('');
  const moderator = !!journeyAt('convention', 'keynote-polls')!.also?.configs.includes(config.id);
  const total = p.counts.reduce((x, y) => x + y, 0); const results = p.voted != null || !p.open || moderator;
  const vote = (i: number) => setP((s) => (s.open && s.voted == null ? { ...s, voted: i, counts: s.counts.map((n, k) => (k === i ? n + 1 : n)) } : s));
  const ask = () => { const text = draft.trim(); if (!text) return; setP((s) => ({ ...s, asked: s.asked + 1, questions: [...s.questions, { id: `mine-${s.asked + 1}`, text: text.slice(0, 200), state: 'pending', mine: true }] })); setDraft(''); };
  const decide = (id: string, state: Q['state']) => setP((s) => ({ ...s, questions: s.questions.map((x) => (x.id === id ? { ...x, state } : x)) }));
  return (<>
    <ScreenHead world={world} journey={journey} config={config}><p className="ui-meta">{EXPO} · opening keynote. Starting tallies are invented; your vote is added in this page only.</p></ScreenHead>
    <div className="w-two">
      <Block title="Poll: what matters most to you?" sub={p.open ? 'open' : 'closed by the moderator'} testId="poll">
        <div className="w-poll" role="group" aria-label="Poll options">
          {OPTIONS.map((o, i) => { const pct = Math.round((p.counts[i]! / total) * 100); return (
            <button key={o} type="button" className="w-poll__o" aria-pressed={p.voted === i} disabled={!p.open || p.voted != null} onClick={() => vote(i)} data-option={i}>
              <span>{o}</span>
              {results && <span className="w-poll__r"><svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true"><rect className="w-poll__bg" width="100" height="6" rx="3" /><rect className="w-poll__bar" width={pct} height="6" rx="3" /></svg><b>{pct}%</b> <span className="ui-meta">{p.counts[i]} votes</span></span>}
            </button>); })}
        </div>
        <Said>{!p.open ? 'The poll is closed. Results are shown.' : p.voted != null ? `Your vote for “${OPTIONS[p.voted]}” was counted. ${total} votes in all.` : 'Choose one option. Results appear after you vote.'}</Said>
        <p className="ui-meta">Votes are counted, not attributed: the poll keeps a tally, never who chose what <Ev state="SIMULATED" /></p>
      </Block>
      <Block title="Questions for the speaker" sub="moderated" testId="questions">
        <label className="w-field"><span>Your question</span><input type="text" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(); }} data-testid="question-input" /></label>
        <button type="button" className="ui-btn w-btn" onClick={ask} disabled={!draft.trim()} data-testid="question-send">Send to the moderator</button>
        <h3>On screen</h3>
        <ul className="w-list" data-testid="questions-shown">{p.questions.filter((x) => x.state === 'shown').map((x) => <li key={x.id}>{x.text}{x.mine && <span className="ui-meta"> · yours</span>}</li>)}</ul>
        {p.questions.some((x) => x.mine && x.state !== 'shown') && <><h3>Yours</h3><ul className="w-list" data-testid="questions-mine">{p.questions.filter((x) => x.mine && x.state !== 'shown').map((x) => <li key={x.id}>{x.text} <span className="ui-tag ui-tone--muted">{x.state === 'pending' ? 'Waiting for the moderator' : 'Not shown'}</span></li>)}</ul></>}
        <p className="ui-meta">A question appears on screen only after a moderator accepts it.</p>
      </Block>
    </div>
    {moderator && (
      <Block title="Moderation desk" sub={`presented to the ${config.label}`} testId="moderation">
        <p><button type="button" className="ui-btn w-btn" onClick={() => setP((s) => ({ ...s, open: !s.open }))} data-testid="poll-toggle">{p.open ? 'Close the poll' : 'Reopen the poll'}</button></p>
        {p.questions.some((x) => x.state === 'pending') ? <ul className="w-list" aria-label="Questions waiting">{p.questions.filter((x) => x.state === 'pending').map((x) => <li key={x.id} data-pending={x.id}>{x.text} <button type="button" className="ui-btn w-btn" onClick={() => decide(x.id, 'shown')} aria-label={`Show: ${x.text}`}>Show</button> <button type="button" className="ui-btn w-btn" onClick={() => decide(x.id, 'declined')} aria-label={`Decline: ${x.text}`}>Decline</button></li>)}</ul> : <p className="ui-meta">No question is waiting.</p>}
        <p className="ui-meta">The desk moderates this session only. It shows no attendee identity and no other event’s data.</p>
      </Block>)}
  </>);
}

export const SCREENS: Record<string, ComponentType<ScreenProps>> = { 'attend-expo': AttendExpo, 'keynote-polls': KeynotePolls };
