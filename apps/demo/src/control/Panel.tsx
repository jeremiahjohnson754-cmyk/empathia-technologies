/**
 * A room's panel (#/control/<room>): V2.5.3's language — one sentence, one room, one dock — with real things to act on. The room is its
 * own plan with what each screen is fed drawn on it; scenes, sources per screen, sound, microphones and privacy, camera presets.
 * Every press goes through control/store.ts `act` (authority, the adapter, the ledger) and the room answers in words.
 * SIMULATED: no command leaves the page, and every answer says so.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, Notice, Tag, Icon, Segmented, type IconName } from '@empathia/ui';
import type { RoleKey } from '../registry.types.js';
import type { Connection } from '@empathia/domain-types';
import { LAYERS, type Layer, type RoomRecord } from '../campus/design.js';
import { Stage, PlanView, IsoView } from '../spatial/Spatial.js';
import { useWorkspace } from '../workspace/useWorkspace.js';
import { panelOf, sentenceOf, metersOf, pathsOf, OFF, type Action, type State } from './model.js';
import { act, stateOf, type Done } from './store.js';
import { connected, SIMULATED, type Feedback } from './adapter.js';

const ALL_LAYERS = new Set<Layer>(LAYERS.map((l) => l.key));
export const DOCK: Array<{ key: 'mic' | 'vol' | 'cam' | 'share' | 'session'; label: string; icon: IconName; layer: string }> = [
  { key: 'mic', label: 'Microphones', icon: 'pulse', layer: 'audio' }, { key: 'vol', label: 'Volume', icon: 'chart', layer: 'audio' }, { key: 'cam', label: 'Camera', icon: 'eye', layer: 'video' },
  { key: 'share', label: 'Share', icon: 'external', layer: 'display' }, { key: 'session', label: 'Session', icon: 'clock', layer: 'control' },
];
export type ModeKey = 'room' | 'meet' | 'present' | 'live' | 'engineer';
const SHOWS: Record<ModeKey, { scenes: boolean; screens: boolean; sound: boolean; cameras: boolean; log: boolean }> = {
  room: { scenes: true, screens: false, sound: false, cameras: false, log: false }, meet: { scenes: true, screens: false, sound: true, cameras: true, log: false },
  present: { scenes: true, screens: true, sound: true, cameras: false, log: false }, live: { scenes: true, screens: true, sound: true, cameras: true, log: false },
  engineer: { scenes: true, screens: true, sound: true, cameras: true, log: true },
};

/** The sentence for a room's panel as it stands now (used by the page's heading). */
export function useRoomSentence(r: RoomRecord, tick: number): string { return useMemo(() => { const p = panelOf(r); return sentenceOf(r, p, stateOf(r.outline.id)!); }, [r, tick]); }

export function RoomPanel({ r, role, use, mode, onChange }: { r: RoomRecord; role: RoleKey; use: boolean; mode: ModeKey; onChange?: () => void }) {
  const o = r.outline; const p = useMemo(() => panelOf(r), [r]); const { apply } = useWorkspace();
  const [st, setSt] = useState<State>(() => stateOf(o.id)!); const [said, setSaid] = useState(''); const [refused, setRefused] = useState<string[] | null>(null); const [last, setLast] = useState<Feedback[]>([]);
  const [vol, setVol] = useState(st.volume); const [view, setView] = useState<'plan' | '3d'>('plan'); const [angle, setAngle] = useState(0);
  useEffect(() => { setSt(stateOf(o.id)!); setSaid(''); setRefused(null); setLast([]); }, [o.id]);
  useEffect(() => { setVol(st.volume); }, [st.volume]);
  // the same room open in another tab, or operated from another page: this panel follows what was last set, never a stale copy
  useEffect(() => { const f = (e: StorageEvent) => { if (e.key === null || e.key === 'empathia.demo.control.v1') { setSt(stateOf(o.id)!); onChange?.(); } }; addEventListener('storage', f); return () => removeEventListener('storage', f); }, [o.id]);
  const show = SHOWS[mode]; const has = (layer: string) => r.positions.some((x) => !x.furniture && x.layer === layer);
  const run = (a: Action) => {
    if (!use) return; const out = apply((w) => act(w, role, o.id, a));
    if ('why' in out) { setRefused(out.why); setSaid(''); return; }
    const d = out as Done; setSt(d.state); setSaid(d.said); setRefused(null); setLast(d.feedback); onChange?.();
  };
  const commitVol = () => { if (vol !== st.volume) run({ type: 'volume', value: vol }); };
  const paths = pathsOf(p, st); const meters = metersOf(st);
  // what the plan shows: each fed screen, what feeds it, and the line between them
  const links: Connection[] = paths.flatMap((x) => { const chain = [...x.via, x.display]; return chain.slice(0, -1).map((from, i) => ({ id: `${x.display}:${i}`, from, to: chain[i + 1]!, kind: 'signal' as const })); });
  const marked = useMemo(() => new Set([...paths.flatMap((x) => [x.display, ...x.via]), ...(st.micMuted ? [] : p.mics.map((m) => m.code)), ...(st.power && !st.muted && paths.length ? p.speakers.map((m) => m.code) : [])]), [st, p]);   // eslint-disable-line react-hooks/exhaustive-deps
  const shared = p.displays.length > 0 && p.displays.every((d) => st.routes[d.code] === 'laptop');
  const dockOn: Record<string, boolean> = { mic: !st.micMuted, vol: !st.muted, cam: !st.privacy, share: shared, session: st.power };
  const tap = (k: string) => run(k === 'mic' ? { type: 'micMute', on: !st.micMuted } : k === 'vol' ? { type: 'mute', on: !st.muted } : k === 'cam' ? { type: 'privacy', on: !st.privacy } : k === 'share' ? { type: 'routeAll', source: shared ? OFF : 'laptop' } : { type: 'power', on: !st.power });
  const cautions = [...new Set(last.map((f) => f.caution).filter((x): x is string => !!x))];
  const srcLabel = (id: string) => (id === OFF ? 'Off' : p.sources.find((s) => s.id === id)?.label || id);

  return (
    <div className="rc" data-testid="room-panel" data-room={o.id} data-power={st.power} data-rev={st.rev} data-scene={st.scene || ''} data-volume={st.volume} data-mic={st.micMuted ? 'muted' : 'on'} data-privacy={st.privacy}>
      <div className="rc-cols">
        <div className="rc-main">
          <Card title="The dock" icon="settings" sub="The same five places in every room">
            <div className="pa-dock" role="group" aria-label="The dock">
              {DOCK.map((d) => { const here = d.key === 'session' ? p.powered.length > 0 : d.key === 'share' ? p.displays.length > 0 : d.key === 'cam' ? p.cameras.length > 0 : d.key === 'mic' ? p.hears : has(d.layer); return (
                <button key={d.key} type="button" className="pa-dock__btn" aria-pressed={here ? !!dockOn[d.key] : undefined} disabled={!here || !use} onClick={() => tap(d.key)} data-dock={d.key} title={!here ? 'Not in this room' : !use ? 'Your role views the panel; it does not operate rooms' : undefined}>
                  <Icon name={d.icon} size={20} /><span>{d.label}</span><span className="pa-note">{!here ? 'not in this room' : d.key === 'vol' ? (st.muted ? 'muted' : String(st.volume)) : d.key === 'cam' ? (st.privacy ? 'closed' : 'open') : dockOn[d.key] ? 'on' : 'off'}</span>
                </button>); })}
            </div>
            <p className="pa-note" aria-live="polite" data-testid="rc-said">{said ? `${said} (simulated: nothing was sent to the room)` : use ? 'Tap a control: the panel answers as the room would; nothing is sent.' : 'Your role may look at the panel; operating a room is for the people who use it.'}</p>
            {refused && <div data-testid="rc-refused"><Notice tone="warn">{refused.join(' ')}</Notice></div>}
            {cautions.map((c) => <div key={c} data-testid="rc-caution"><Notice tone="warn">{c}</Notice></div>)}
          </Card>

          {show.scenes && <Card title="Scenes" icon="spark" sub="One press sets the room for what you are about to do">
            <div className="rc-row" role="group" aria-label="Scenes">{p.scenes.map((s) => <button key={s.id} type="button" className="rc-btn" aria-pressed={st.scene === s.id} disabled={!use} onClick={() => run({ type: 'scene', id: s.id })} data-scene={s.id}><b>{s.label}</b><span>{s.says}</span></button>)}</div>
          </Card>}

          {show.screens && p.displays.length > 0 && <Card title="What each screen shows" icon="display" sub={`${p.displays.length} ${p.displays.length === 1 ? 'screen' : 'screens'} · ${p.sources.length} ${p.sources.length === 1 ? 'source' : 'sources'} in this room`}>
            <div className="rc-routes" data-testid="rc-routes">
              {p.displays.length > 1 && <div className="rc-route" role="radiogroup" aria-label="Every screen"><span className="rc-route__n">Every screen</span><span className="rc-route__o">{[...p.sources.map((s) => s.id), OFF].map((id) => <button key={id} type="button" role="radio" aria-checked={p.displays.every((d) => st.routes[d.code] === id)} className="rc-chip" disabled={!use} onClick={() => run({ type: 'routeAll', source: id })} data-all={id}>{srcLabel(id)}</button>)}</span></div>}
              {p.displays.map((d) => <div key={d.code} className="rc-route" role="radiogroup" aria-label={d.label} data-display={d.code} data-source={st.routes[d.code]}><span className="rc-route__n">{d.label}</span><span className="rc-route__o">{[...p.sources.map((s) => s.id), OFF].map((id) => <button key={id} type="button" role="radio" aria-checked={st.routes[d.code] === id} className="rc-chip" disabled={!use} onClick={() => run({ type: 'route', display: d.code, source: id })} data-source-id={id}>{srcLabel(id)}</button>)}</span></div>)}
            </div>
          </Card>}

          {show.sound && (p.speakers.length > 0 || p.mics.length > 0 || has('audio')) && <Card title="Sound" icon="speaker" sub="The room’s loudspeakers and microphones">
            <div className="rc-sound">
              <div className="rc-vol">
                <button type="button" className="rc-step" aria-label="Volume down" disabled={!use || st.volume <= 0} onClick={() => run({ type: 'volume', value: st.volume - 5 })}>−</button>
                <label className="rc-vol__l"><span className="ui-visually-hidden">Volume</span><input type="range" min={0} max={100} step={5} value={vol} disabled={!use} onChange={(e) => setVol(Number(e.target.value))} onPointerUp={commitVol} onKeyUp={commitVol} onBlur={commitVol} data-testid="rc-volume" /></label>
                <button type="button" className="rc-step" aria-label="Volume up" disabled={!use || st.volume >= 100} onClick={() => run({ type: 'volume', value: st.volume + 5 })}>+</button>
                <output className="rc-vol__v" data-testid="rc-volume-value">{st.muted ? 'Muted' : vol}</output>
              </div>
              <div className="rc-row" role="group" aria-label="Sound switches">
                <button type="button" className="rc-chip" aria-pressed={st.muted} disabled={!use} onClick={() => run({ type: 'mute', on: !st.muted })} data-testid="rc-mute">Mute the room’s sound</button>
                {p.hears && <button type="button" className="rc-chip" aria-pressed={st.micMuted} disabled={!use} onClick={() => run({ type: 'micMute', on: !st.micMuted })} data-testid="rc-micmute">Mute the microphones</button>}
                {(p.hears || p.cameras.length > 0) && <button type="button" className="rc-chip" aria-pressed={st.privacy} disabled={!use} onClick={() => run({ type: 'privacy', on: !st.privacy })} data-testid="rc-privacy">Privacy</button>}
              </div>
              <div className="rc-meters" data-testid="rc-meters" aria-label={`Microphones ${meters.mic ? 'open' : 'closed'}, programme ${meters.program ? 'playing' : 'silent'}`}>
                <div><span>Microphones</span><svg className="rc-meter" width="100%" height="10" preserveAspectRatio="none" focusable="false" aria-hidden="true" data-v={meters.mic}><rect x="0" y="0" height="100%" width={`${Math.round(meters.mic * 100)}%`} rx="3" /></svg></div>
                <div><span>Programme</span><svg className="rc-meter" width="100%" height="10" preserveAspectRatio="none" focusable="false" aria-hidden="true" data-v={meters.program}><rect x="0" y="0" height="100%" width={`${Math.round(meters.program * 100)}%`} rx="3" /></svg></div>
                <p className="ui-meta">A picture of the settings above, not a level: nothing here is measured.</p>
              </div>
            </div>
          </Card>}

          {show.cameras && p.cameras.length > 0 && <Card title="Cameras" icon="camera" sub={st.privacy ? 'Privacy is on: the cameras are closed' : 'Recall a preset; the camera moves to it'}>
            <div className="rc-routes" data-testid="rc-cameras">{p.cameras.map((c) => <div key={c.code} className="rc-route" role="radiogroup" aria-label={c.label} data-camera={c.code} data-preset={st.preset[c.code]}><span className="rc-route__n">{c.label}</span><span className="rc-route__o">{c.presets.map((x) => <button key={x} type="button" role="radio" aria-checked={st.preset[c.code] === x} className="rc-chip" disabled={!use} onClick={() => run({ type: 'preset', camera: c.code, preset: x })}>{x}</button>)}</span></div>)}</div>
          </Card>}

          {show.log && <Card title="What the room was told" icon="wrench" sub="The commands of the last action, and what answered">
            {last.length ? <div className="pa-table-wrap"><table className="pa-table" data-testid="rc-log"><thead><tr><th scope="col">To</th><th scope="col">Command</th><th scope="col">Answer</th><th scope="col">Source</th></tr></thead>
              <tbody>{last.map((f, i) => <tr key={i}><th scope="row" className="pa-mono">{f.target}</th><td>{f.verb} {String(f.value)}</td><td>{f.said}</td><td><Tag tone="warn">{f.provenance}</Tag></td></tr>)}</tbody></table></div>
              : <p className="pa-note">Nothing has been sent since this page opened. Operate the room and its commands appear here.</p>}
            <dl className="rc-conn" data-testid="rc-connection" data-connected={connected().length}>
              <dt>Connection</dt><dd>{SIMULATED.label}.</dd>
              <dt>A real system</dt><dd>Connects through an adapter with the same contract: commands in, answers out, each answer with its source. None is written. It needs the customer’s authorisation for each room, credentials kept on a server and never in the page, a dry run, a rate limit, an emergency stop, and every command in the ledger before it is sent.</dd>
              <dt>The baseline</dt><dd>Operating a room does not change what it was commissioned as: the panel’s state is not part of the room’s record.</dd>
            </dl>
          </Card>}
          {p.lacks.length > 0 && <p className="pa-note" data-testid="rc-lacks">This room’s record has no {p.lacks.join(', no ')}; the panel has nothing to offer for {p.lacks.length === 1 ? 'it' : 'them'}. Lighting and climate are not in these room records.</p>}
        </div>

        <aside className="rc-side" aria-label="The room">
          <Stage label={`${o.name}: what is on, drawn on the room`} testId="rc-stage" toolbar={<>
            <Segmented small label="View" value={view} onChange={setView} options={[{ value: 'plan', label: 'Plan' }, { value: '3d', label: '3D' }]} />
            {view === '3d' && <button type="button" className="ui-btn ui-btn--sm" onClick={() => setAngle((a) => (a + 1) % 4)}><Icon name="undo" size={16} /> Turn</button>}
          </>}>
            {view === 'plan'
              ? <PlanView w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} positions={r.positions} connections={links} layers={ALL_LAYERS} selected={null} onSelect={() => undefined} showLinks={links.length > 0} linksOn marked={marked} markWord="in use now" />
              : <IsoView w={o.dims[0]} l={o.dims[1]} h={o.dims[2]} positions={r.positions} connections={[]} layers={ALL_LAYERS} selected={null} onSelect={() => undefined} showLinks={false} angle={angle} marked={marked} markWord="in use now" />}
          </Stage>
          <p className="rc-cap" data-testid="rc-caption" data-marked={marked.size} data-links={links.length} aria-live="polite">{marked.size ? `Ringed: what is in use now${links.length ? ', with what feeds each screen' : ''}.` : 'Nothing in the room is in use.'}</p>
          <ul className="rc-now" data-testid="rc-now">{p.displays.map((d) => <li key={d.code}><b>{d.label}</b> {st.routes[d.code] === OFF ? 'off' : srcLabel(st.routes[d.code]!)}</li>)}{p.cameras.map((c) => <li key={c.code}><b>{c.label}</b> {st.privacy ? 'closed' : st.preset[c.code]}</li>)}</ul>
        </aside>
      </div>
    </div>
  );
}
