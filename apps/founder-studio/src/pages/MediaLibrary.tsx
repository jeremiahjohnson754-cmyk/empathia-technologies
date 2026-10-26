import { useState } from 'react';
import { FILMS_DATA, MEDIA, type Film } from '../data/generated';
import { href, useRoute } from '../lib/router';

const fmtDur = (s?: number) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const fmtMB = (b?: number) => (b == null ? '—' : `${(b / 1e6).toFixed(b > 1e8 ? 0 : 1)} MB`);
const rightsChip = (s: string) => (s === 'VERIFIED' ? 'ok' : s === 'EXCLUDED' ? 'bad' : 'warn');
export const filmSrc = (f: Film) => `media/films/${f.file}`;

/** Why a film did not play: missing file, or a browser without the H.264 decoder (open-source Chromium builds lack it). */
async function diagnose(f: Film): Promise<'missing' | 'codec' | 'unknown'> {
  const canH264 = document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"') !== '';
  try { const r = await fetch(filmSrc(f), { method: 'HEAD' }); if (!r.ok) return 'missing'; return canH264 ? 'unknown' : 'codec'; } catch { return canH264 ? 'missing' : 'codec'; }
}

function Player({ f }: { f: Film }) {
  const [err, setErr] = useState<false | 'missing' | 'codec' | 'unknown'>(false);
  return (
    <div className="player-wrap">
      <div className="player">
        {f.found && !err ? (
          <video key={f.key} controls preload="metadata" src={filmSrc(f)} onError={() => { void diagnose(f).then(setErr); }} aria-label={f.title} />
        ) : (
          <div className="notice warn" role="status"><p className="muted">
            {!f.found ? <>No file named <code>{f.file}</code> was found by the media probe, so it is NOT_RENDERED here.</>
              : err === 'codec' ? <>The file is here, but this browser cannot decode H.264 video (some Chromium builds ship without it). Open the studio in Chrome, Edge or Safari, or open the file directly from <code>media/films/</code>.</>
                : err === 'unknown' ? <>The file is here but did not play in this browser. Try opening <code>media/films/{f.file}</code> directly.</>
                  : <>The file is not in this studio’s <code>media/films/</code> folder. Copy <code>{f.file}</code> there (it is one of the films you received), or start the studio with the launcher, which finds it in the workspace.</>}
          </p></div>
        )}
        <h2>{f.title}</h2>
        <p className="muted">{f.about}</p>
      </div>
      <aside className="panel pad stack" aria-label="Film record">
        <h3>Record</h3>
        <dl className="kv">
          <dt>Series</dt><dd>{f.series}</dd>
          <dt>Resolution</dt><dd className="num">{f.width ? `${f.width} × ${f.height}` : '—'}</dd>
          <dt>Duration</dt><dd className="num">{fmtDur(f.durationS)}</dd>
          <dt>Codecs</dt><dd>{f.videoCodec ?? '—'} / {f.audioCodec ?? '—'}</dd>
          <dt>Size</dt><dd className="num">{fmtMB(f.bytes)}</dd>
          <dt>SHA-256</dt><dd className="mono" style={{ fontSize: 11 }}>{f.sha256 ?? '—'}</dd>
          <dt>Source</dt><dd className="mono" style={{ fontSize: 11 }}>{f.path ?? '—'}</dd>
          <dt>Rights</dt><dd><span className={`chip ${rightsChip(f.rightsStatus)}`}>{f.rightsStatus}</span>{f.ledgerAssetId ? <span className="faint"> · ledger {f.ledgerAssetId}</span> : null}</dd>
          <dt>Distribution</dt><dd>{f.distribution}</dd>
        </dl>
        <p className="faint">Resolution and duration come from ffprobe on the file itself; rights come from the media-rights ledger, joined by hash. A film not in the ledger is treated exactly like UNVERIFIED: watch it here, do not distribute it.</p>
      </aside>
    </div>
  );
}

export function MediaLibrary() {
  const r = useRoute();
  const [series, setSeries] = useState('All');
  const [tab, setTab] = useState<'films' | 'all'>('films');
  const sel = FILMS_DATA.find((f) => f.key === r.sub);
  const seriesList = ['All', ...new Set(FILMS_DATA.map((f) => f.series))];
  const shown = FILMS_DATA.filter((f) => series === 'All' || f.series === series);
  return (
    <>
      <div className="page-head">
        <h1>Media Library</h1>
        <p>{FILMS_DATA.filter((f) => f.found).length} finished films, each inspected with ffprobe and checked against the rights ledger. {MEDIA.summary.videos} video and {MEDIA.audioCount} audio files are catalogued in the full manifest.</p>
      </div>
      <div className="notice warn"><p className="muted">Internal set. No film here is VERIFIED for an external channel: the narration voices and generated footage have no licence or terms on file. The investor-safe set is currently the 40 first-party UI captures only.</p></div>
      {sel && <Player f={sel} key={sel.key} />}
      <nav className="tabs" aria-label="Media views">
        <button type="button" aria-selected={tab === 'films'} onClick={() => setTab('films')}>Finished films</button>
        <button type="button" aria-selected={tab === 'all'} onClick={() => setTab('all')}>Full video manifest ({MEDIA.videos.length})</button>
      </nav>
      {tab === 'films' ? (
        <>
          <div className="row" role="group" aria-label="Series">{seriesList.map((s) => <button key={s} type="button" className="chip plain" aria-pressed={series === s} onClick={() => setSeries(s)} style={series === s ? { borderColor: 'var(--accent)', color: 'var(--tx)' } : undefined}>{s}</button>)}</div>
          <div className="films">
            {shown.map((f) => (
              <a key={f.key} className="film" href={href('media', f.key)} aria-current={sel?.key === f.key ? 'true' : undefined}>
                <div className="thumb">{f.found ? <span className="num">{f.width && f.height ? `${f.width}×${f.height}` : ''} · {fmtDur(f.durationS)}</span> : 'NOT FOUND'}</div>
                <b>{f.title}</b>
                <span>{f.series} · <span className={`chip ${rightsChip(f.rightsStatus)}`}>{f.rightsStatus}</span></span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="panel table-wrap">
          <table className="ledger">
            <thead><tr><th>Title</th><th>Role</th><th>Resolution</th><th>Duration</th><th>Rights</th><th>Path</th></tr></thead>
            <tbody>{MEDIA.videos.map((m) => <tr key={m.path}><td>{m.title}</td><td className="faint">{m.role.toLowerCase().replace(/_/g, ' ')}</td><td className="num">{m.width ? `${m.width}×${m.height}` : m.probe}</td><td className="num">{fmtDur(m.durationS ?? undefined)}</td><td><span className={`chip ${rightsChip(m.rightsStatus)}`}>{m.rightsStatus}</span></td><td className="faint mono" style={{ fontSize: 11 }}>{m.path}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <p className="faint">Full manifest with hashes, codecs, ledger joins and provenance: <code>{MEDIA.manifestPath}</code>.</p>
    </>
  );
}
