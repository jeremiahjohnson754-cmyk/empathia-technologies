import { useEffect, useState } from 'react';
import { BUILD, RELEASES } from '../data/generated';
import { clearDemoStorage, readDemoStorage, resetStudio, storageAvailable, update, useStudio, writeDemoStorage, type SnapshotMeta } from '../lib/store';
import { serverMode } from '../components/Shell';

/** Snapshots of the demonstrator's state are kept on disk by the studio launcher (server mode), or downloaded as a file. */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`api/${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export function Settings() {
  const st = useStudio();
  const [snaps, setSnaps] = useState<SnapshotMeta[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'' | 'demo' | 'studio'>('');
  const server = serverMode();
  const load = () => { if (server) api<SnapshotMeta[]>('snapshots').then(setSnaps).catch((e) => setMsg(`Snapshots unavailable: ${e.message}`)); };
  useEffect(load, [server]);

  const save = async () => {
    const data = readDemoStorage();
    if (!Object.keys(data).length) { setMsg('The demonstrator has not saved anything yet: make a change in it first.'); return; }
    if (server) { await api('snapshots', { method: 'POST', body: JSON.stringify({ name: name || 'Untitled snapshot', data }) }); setName(''); setMsg('Snapshot saved on this computer.'); load(); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ name: name || 'snapshot', at: new Date().toISOString(), data }, null, 1)], { type: 'application/json' })); a.download = `empathia-demo-state-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); setMsg('Downloaded the demonstrator state as a file.');
  };
  const restore = async (id: string) => { const s = await api<{ data: Record<string, string> }>(`snapshots/${encodeURIComponent(id)}`); setMsg(writeDemoStorage(s.data) ? 'Restored. Reopen any product page to see it.' : 'Could not write the demonstrator’s storage.'); };
  const remove = async (id: string) => { await api(`snapshots/${encodeURIComponent(id)}`, { method: 'DELETE' }); load(); };
  const importFile = async (f: File) => { try { const j = JSON.parse(await f.text()); setMsg(writeDemoStorage(j.data || {}) ? `Restored “${j.name || f.name}”.` : 'Could not write the demonstrator’s storage.'); } catch { setMsg('That file is not a demonstrator state file.'); } };

  return (
    <>
      <div className="page-head"><h1>Settings and demo reset</h1><p>Appearance, saved states of the demonstrator, data reset, and the build record of this studio.</p></div>
      {msg && <div className="notice" role="status"><p className="muted">{msg}</p></div>}
      <div className="cols-2">
        <section className="panel pad stack" aria-labelledby="appearance">
          <h2 id="appearance">Appearance</h2>
          <div className="row" role="radiogroup" aria-label="Theme">
            {(['system', 'dark', 'light'] as const).map((t) => <label key={t} className="check"><input type="radio" name="theme" checked={st.theme === t} onChange={() => update((s) => ({ ...s, theme: t }))} /> {t}</label>)}
          </div>
          <label className="check"><input type="checkbox" checked={st.reducedMotion} onChange={(e) => update((s) => ({ ...s, reducedMotion: e.target.checked }))} /> reduce motion</label>
          <label className="check"><input type="checkbox" checked={st.demoPersonaSwitch} onChange={(e) => update((s) => ({ ...s, demoPersonaSwitch: e.target.checked }))} /> switch the demonstrator’s persona automatically on each page</label>
          {!storageAvailable && <p className="faint">This browser blocks storage here: settings last until the tab closes.</p>}
        </section>
        <section className="panel pad stack" aria-labelledby="snapshots">
          <h2 id="snapshots">Save and reopen the demonstrator</h2>
          <p className="muted">Everything you build in the demonstrator stays in this browser. Save it as a named state to come back to, or start a new scenario from a clean seed.</p>
          <div className="row"><input className="field" placeholder="Name this state" aria-label="Snapshot name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn primary" type="button" onClick={() => void save()}>{server ? 'Save state' : 'Download state'}</button></div>
          {server ? (
            <ul className="list">{snaps.length === 0 ? <li className="faint">No saved states yet.</li> : snaps.map((s) => <li key={s.id}><span><b>{s.name}</b> <span className="faint num">{new Date(s.at).toLocaleString()} · {(s.bytes / 1024).toFixed(0)} KB</span> <button className="btn" type="button" onClick={() => void restore(s.id)}>Reopen</button> <button className="btn danger" type="button" onClick={() => void remove(s.id)}>Delete</button></span></li>)}</ul>
          ) : <label className="btn">Open a state file<input type="file" accept="application/json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); }} /></label>}
        </section>
        <section className="panel pad stack" aria-labelledby="reset">
          <h2 id="reset">Reset</h2>
          <p className="muted">Resetting the demonstrator returns every product to its synthetic seed. Save a state first if you want to come back to your work.</p>
          {confirm === 'demo' ? (
            <div className="row"><span>Reset the demonstrator to its seed?</span><button className="btn danger" type="button" onClick={() => { setMsg(clearDemoStorage() ? 'The demonstrator is back to its seed. Reopen a product page.' : 'Could not clear the demonstrator’s storage (opened from disk: use the page’s own reset).'); setConfirm(''); }}>Reset demonstrator</button><button className="btn" type="button" onClick={() => setConfirm('')}>Cancel</button></div>
          ) : <button className="btn" type="button" onClick={() => setConfirm('demo')}>Reset the demonstrator…</button>}
          {confirm === 'studio' ? (
            <div className="row"><span>Forget studio settings and scenario marks?</span><button className="btn danger" type="button" onClick={() => { resetStudio(); setConfirm(''); setMsg('Studio settings reset.'); }}>Reset studio</button><button className="btn" type="button" onClick={() => setConfirm('')}>Cancel</button></div>
          ) : <button className="btn" type="button" onClick={() => setConfirm('studio')}>Reset studio settings…</button>}
        </section>
        <section className="panel pad stack" aria-labelledby="build">
          <h2 id="build">This build</h2>
          <dl className="kv">
            <dt>Studio built</dt><dd>{BUILD.builtAt}</dd>
            <dt>Source commit</dt><dd className="mono">{BUILD.commit}</dd>
            <dt>Engine</dt><dd className="mono">{BUILD.engine}</dd>
            <dt>Founder Edition</dt><dd>{BUILD.founderEdition ? <><span className="mono">{BUILD.founderEdition.file}</span><br /><span className="faint">branch {BUILD.founderEdition.branch} @ {BUILD.founderEdition.sourceCommit} — development build, not a release</span><br /><span className="mono" style={{ fontSize: 11 }}>{BUILD.founderEdition.sha256}</span></> : 'not included'}</dd>
            <dt>Frozen releases</dt><dd>{RELEASES.result} at {RELEASES.checkedAt} ({RELEASES.packages.length} packages, {RELEASES.archives.length} archives)</dd>
          </dl>
        </section>
      </div>
    </>
  );
}
