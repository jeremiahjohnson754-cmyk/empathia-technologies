/**
 * Offline and this device (#/offline): whether the app is saved on this device, what works without a connection, the optional packs a
 * visitor can keep (SIGNAL seasons, the library, narration), how much space it takes, and the way to remove all of it.
 *
 * Stated plainly on the page: this demonstration keeps a visitor's work in this browser and sends nothing to a server, so there is
 * nothing to synchronise. The product's field queue (results recorded offline and sent on reconnect) is not part of this page.
 */
import { useEffect, useState } from 'react';
import { Button, Notice, ProgressBar } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { Block, Rows } from '../worlds/kit.js';
import { dropPack, keepPack, keptState, loadPacks, mib, storage, turnOff, turnOn, type Kept, type Pack } from './offline.js';
import { useOffline } from './Strip.js';
import { FieldQueueDemo } from './FieldQueueDemo.js';

const PHASE_WORD = { unsupported: 'Cannot be saved in this browser', off: 'Not saved', saving: 'Saving the app on this device…', ready: 'Saved on this device', failed: 'Not saved: saving did not finish' } as const;
/** What a field user can rely on without a connection once the app is saved. Each line names a page of this demonstration. */
const WORKS: readonly { name: string; href: string; what: string }[] = [
  { name: 'Lite', href: '#/lite', what: 'find a room, open its plan and 3D view, read how to use it, report a problem' },
  { name: 'Commissioning', href: '#/commissioning', what: 'run a room’s tests, record results and notes, see what is still missing' },
  { name: 'Assurance', href: '#/assurance', what: 'readiness by room, the signals behind it, what changed' },
  { name: 'ServiceHands', href: '#/servicehands', what: 'today’s jobs, the steps of a job, parts and notes' },
  { name: 'Estates and wayfinding', href: '#/worlds', what: 'the four worlds, their places and step-free routes' },
];

export default function OfflinePage(_: PageProps) {
  const s = useOffline();
  const [packs, setPacks] = useState<Pack[] | null>(null); const [packErr, setPackErr] = useState(false);
  const [kept, setKept] = useState<Record<string, Kept>>({}); const [busy, setBusy] = useState<Record<string, [number, number]>>({});
  const [said, setSaid] = useState(''); const [space, setSpace] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const refresh = async (ps: Pack[]) => { const k: Record<string, Kept> = {}; for (const p of ps) { try { k[p.id] = await keptState(p); } catch { k[p.id] = 'none'; } } setKept(k); setSpace(await storage()); };
  useEffect(() => { let live = true; loadPacks().then((ps) => { if (!live) return; setPacks(ps); void refresh(ps); }).catch(() => { if (live) setPackErr(true); }); return () => { live = false; }; }, [s.phase]);
  const ready = s.phase === 'ready';
  const keep = async (p: Pack) => {
    setBusy((b) => ({ ...b, [p.id]: [0, p.files.length] }));
    const r = await keepPack(p, (d, t) => setBusy((b) => ({ ...b, [p.id]: [d, t] })));
    setBusy((b) => { const n = { ...b }; delete n[p.id]; return n; });
    setSaid(r.failed.length ? `${p.label}: ${r.failed.length} of ${p.files.length} files could not be fetched. What arrived is kept; choose Keep again when the connection is steadier.` : `${p.label} is kept on this device.`);
    if (packs) await refresh(packs);
  };
  const drop = async (p: Pack) => { if (!packs) return; await dropPack(p, packs); setSaid(`${p.label} was removed from this device.`); await refresh(packs); };
  const removeAll = async () => { await turnOff(); setConfirm(false); setSaid('Everything saved for offline use was removed from this device. Your work in the demonstration was not touched.'); if (packs) await refresh(packs); };
  const story = (packs || []).filter((p) => p.kind === 'story'); const other = (packs || []).filter((p) => p.kind !== 'story');
  const shared = story[0]?.sharedBytes || 0;
  const row = (p: Pack) => { const k = kept[p.id] || 'none'; const b = busy[p.id]; return (
    <li key={p.id} className="of-pack" data-testid="offline-pack" data-pack={p.id} data-kept={k}>
      <div className="of-pack__t"><b>{p.label}</b><span className="ui-meta">{p.chapters ? `${p.chapters} chapters · ` : ''}{mib(p.bytes)}{k === 'kept' ? ' · kept on this device' : k === 'part' ? ' · partly kept' : ''}</span></div>
      {b ? <ProgressBar label={`Keeping ${p.label}`} value={b[0]} max={b[1]} valueText={`${b[0]} of ${b[1]} files`} small />
        : k === 'kept' ? <Button small onClick={() => void drop(p)} testId="offline-drop">Remove</Button>
        : <Button small kind={k === 'part' ? 'primary' : 'secondary'} disabled={!ready || !s.online} onClick={() => void keep(p)} testId="offline-keep">{k === 'part' ? 'Finish keeping' : 'Keep on this device'}</Button>}
    </li>); };
  return (
    <div className="w of" data-testid="offline-page" data-phase={s.phase} data-online={s.online}>
      <p className="kicker w-kicker">This device</p>
      <h1 tabIndex={-1}>Offline and this device</h1>
      <p className="lead">Once the app is saved here, every page opens without a connection: in a plant room, on a loading dock, on a train. Your work in this demonstration is kept in this browser either way.</p>
      {!s.online && <Notice tone="warn"><b>You are offline.</b> {ready ? 'The app is saved on this device, so every page still opens.' : 'The app has not been saved on this device, so pages you have not opened yet will not load until the connection returns.'}</Notice>}
      <Block title="The app" testId="offline-app">
        <Rows label="Offline status" testId="offline-status" rows={[
          { k: 'This device', v: <b data-testid="offline-phase">{PHASE_WORD[s.phase]}</b>, sub: s.why || undefined },
          ...(ready ? [{ k: 'Saved build', v: <code data-testid="offline-version">{s.version || 'unknown'}</code>, sub: s.files ? `${s.files} files: the page, its code, fonts and every screen` : undefined }] : []),
          { k: 'Connection', v: s.online ? 'Connected' : 'Offline', sub: 'as the browser reports it; a sign-in page on public Wi-Fi can still read as connected' },
          ...(space ? [{ k: 'Space used by this site', v: `about ${mib(space.usage)}`, sub: `${space.persisted ? 'The browser has agreed to keep these files.' : 'The browser may remove saved files if the device runs short of space.'}` }] : []),
        ]} />
        <div className="of-acts">
          {(s.phase === 'off' || s.phase === 'failed') && <Button kind="primary" disabled={!s.online} onClick={() => void turnOn()} testId="offline-save">Save the app on this device</Button>}
          {(ready || s.phase === 'saving') && !confirm && <Button onClick={() => setConfirm(true)} testId="offline-remove">Remove everything saved for offline use</Button>}
          {confirm && <span className="of-confirm" role="group" aria-label="Confirm removal">Remove the saved app and every kept pack from this device? <Button kind="primary" onClick={() => void removeAll()} testId="offline-remove-yes">Remove</Button> <Button onClick={() => setConfirm(false)}>Keep them</Button></span>}
        </div>
      </Block>
      <Block title="What works without a connection" sub="once the app is saved" testId="offline-works">
        <ul className="of-works">{WORKS.map((w) => <li key={w.name}><a href={w.href}>{w.name}</a><span>{w.what}</span></li>)}</ul>
        <p className="ui-muted">What you do in these pages is written to this browser as you do it and is still there after a reload, connected or not. This demonstration sends nothing to a server, so there is nothing to synchronise. In the product, results recorded in the field without a connection wait in a queue and are sent when it returns. The rules of that queue are demonstrated below against a simulated server; no screen of this demonstration sends its work through it.</p>
      </Block>
      <FieldQueueDemo online={s.online} />
      <Block title="Keep more on this device" sub="optional" testId="offline-packs">
        {packErr && <Notice tone="warn">The list of packs could not be fetched. It will load when the connection returns.</Notice>}
        {!ready && !packErr && <p className="ui-muted">Packs are served by the saved app, so the app is saved first.</p>}
        {story.length > 0 && <>
          <h3 className="of-h3">SIGNAL story</h3>
          <p className="ui-muted">A chapter you have opened is already kept. A season pack keeps all of its chapters and their art; the first one also keeps {mib(shared)} of drawings every season shares.</p>
          <ul className="of-packs" aria-label="SIGNAL story seasons">{story.map(row)}</ul>
        </>}
        {other.length > 0 && <><h3 className="of-h3">Reference and audio</h3><ul className="of-packs" aria-label="Reference and audio packs">{other.map(row)}</ul></>}
      </Block>
      <p className="w-said" role="status" aria-live="polite" data-testid="offline-said">{said}</p>
    </div>
  );
}
