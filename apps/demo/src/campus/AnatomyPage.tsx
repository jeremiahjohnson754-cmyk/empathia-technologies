/**
 * #/scouter/anatomy[/<class>] — Scouter's anatomy, restored 12 Nov 2026 from V2.5.3's viewScouterAnatomy (read as text). A device class
 * opened into its blocks: what each does, how it fails, the test that tells, what sits upstream and downstream. Break one (simulated) to
 * see where the symptom travels, then say which layer owns the fault. An educational functional model: not a maker's disassembly
 * instructions; nothing here opens a housing or touches mains. Words from V2.5.3 (campus/anatomy.ts).
 */
import { useEffect, useState } from 'react';
import { PageHero, Card, Chip, Button } from '@empathia/ui';
import type { PageProps } from '../registry.types.js';
import { SCA_CLASSES, SCA_LAYERS, SCA_CAT, downstream } from './anatomy.js';

const layerOf = (k: string) => SCA_LAYERS.find((l) => l[0] === k) || [k, k, '#8aa0c8'];
export default function AnatomyPage({ params }: PageProps) {
  const cls = SCA_CAT[params.cls || ''] || (SCA_CLASSES[params.cls || ''] ? params.cls! : null);
  const [layer, setLayer] = useState('signal'); const [sel, setSel] = useState<string | null>(null); const [broken, setBroken] = useState<string | null>(null); const [guess, setGuess] = useState<string | null>(null); const [rec, setRec] = useState(false);
  useEffect(() => { setLayer('signal'); setSel(null); setBroken(null); setGuess(null); setRec(false); }, [cls]);
  if (!cls) return <section className="lt-page" data-native="" data-testid="anatomy-index">
    <PageHero product="lite" icon="device" compact eyebrow="Scouter · anatomy" title="Open a device class into its blocks" lede="Signal, power, network, control, firmware and mounting, for the classes a room is made of. An educational functional model, never a maker’s instructions." />
    <ul className="lt-tiles">{Object.entries(SCA_CLASSES).map(([k, v]) => <li key={k}><a className="lt-tile" href={`#/scouter/anatomy/${k}`} data-class={k}><b>{v.label}</b><span className="ui-muted">{v.blocks.length} blocks · {new Set(v.blocks.map((b) => b[2])).size} layers</span></a></li>)}</ul>
  </section>;
  const C = SCA_CLASSES[cls]!; const S = C.blocks.find((b) => b[0] === sel), B = C.blocks.find((b) => b[0] === broken); const down = broken ? downstream(cls, broken) : [];
  const W = 760, H = 380, n = C.blocks.length, cols = Math.min(4, n), bw = 160, bh = 64, gx = (W - cols * bw) / (cols + 1), rows = Math.ceil(n / cols), gy = (H - rows * bh) / (rows + 1);
  const pos: Record<string, [number, number]> = {}; C.blocks.forEach((b, i) => { pos[b[0]] = [gx + (i % cols) * (bw + gx), gy + Math.floor(i / cols) * (bh + gy)]; });
  const name = (id: string) => C.blocks.find((b) => b[0] === id)?.[1] || '—';
  return <section className="lt-page lt-anatomy" data-native="" data-testid="anatomy" data-class={cls}>
    <nav aria-label="Breadcrumb" className="crumbs"><ol><li><a href="#/scouter">Scouter</a></li><li><a href="#/scouter/anatomy">Anatomy</a></li><li><span aria-current="page">{C.label}</span></li></ol></nav>
    <PageHero product="lite" icon="device" compact eyebrow="Scouter · anatomy" title={`${C.label}, opened into its blocks`} lede="What each block does, how it fails, the test that tells, and what sits upstream and downstream. Break one to see where the symptom travels."
      meta={[<Chip key="a" small tone="info">Educational functional model</Chip>, <Chip key="b" small tone="muted">Not a maker’s disassembly instructions</Chip>, <Chip key="c" small tone="muted">Nothing here opens a housing or touches mains</Chip>]} />
    <div className="lt-roomgrid">
      <div className="stack">
        <div className="ln-tabs" role="radiogroup" aria-label="Layer">{[...SCA_LAYERS.map((l) => [l[0], l[1]]), ['all', 'Every layer']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={layer === k} className="ui-btn ui-btn--quiet" onClick={() => setLayer(k!)} data-layer={k}>{l}</button>)}</div>
        <div className="lab__svgwrap"><svg className="ch__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${C.label}: ${n} blocks and the links between them${broken ? `; ${name(broken)} is broken` : ''}`} data-testid="anatomy-diagram">
          <rect width={W} height={H} fill="#0B1220" />
          {C.blocks.flatMap((b) => [b[6], b[7]].filter((o) => o && o !== '—' && pos[o]).map((o) => { const a = pos[b[0]]!, c = pos[o]!, on = layer === 'all' || layer === b[2];
            return <path key={`${b[0]}-${o}`} d={`M${a[0] + bw / 2} ${a[1] + bh / 2} L${c[0] + bw / 2} ${c[1] + bh / 2}`} stroke={layerOf(b[2])[2]} strokeWidth={on ? 2 : 0.8} opacity={on ? 0.7 : 0.18} strokeDasharray={o === b[7] ? undefined : '4 4'} />; }))}
          {C.blocks.map((b) => { const [x, y] = pos[b[0]]!, on = layer === 'all' || layer === b[2], isB = broken === b[0], aff = down.includes(b[0]);
            return <g key={b[0]} role="button" tabIndex={0} aria-label={`${b[1]}: ${b[3]}`} aria-pressed={sel === b[0]} data-block={b[0]} onClick={() => setSel(b[0])} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(b[0]); } }} style={{ cursor: 'pointer' }} opacity={on || isB || aff ? 1 : 0.35}>
              <rect x={x} y={y} width={bw} height={bh} rx={12} fill={isB ? 'rgba(255,107,107,.22)' : aff ? 'rgba(245,185,66,.14)' : 'rgba(15,26,48,.9)'} stroke={isB ? '#f0655a' : aff ? '#f2b84b' : layerOf(b[2])[2]} strokeWidth={sel === b[0] ? 2.5 : 1.2} />
              <text x={x + 10} y={y + 26} fontSize={13} fontWeight={700} fill="#F8FAFC">{b[1].length > 21 ? `${b[1].slice(0, 20)}…` : b[1]}</text><text x={x + 10} y={y + 46} fontSize={11} fill={layerOf(b[2])[2]}>{layerOf(b[2])[1]}{isB ? ' · broken' : aff ? ' · affected' : ''}</text></g>; })}
        </svg></div>
        <p className="ui-meta">Solid lines run downstream (the direction the signal, power or command travels); dashed lines point upstream. Tap a block.</p>
        <p className="lt-acts">{broken ? <Button onClick={() => { setBroken(null); setGuess(null); }} testId="anatomy-fix">Repair {B?.[1]} (ends the simulation)</Button> : S ? <Button kind="primary" onClick={() => { setBroken(S[0]); setGuess(null); }} testId="anatomy-break">Break {S[1]} (simulated)</Button> : null}<a className="ui-btn ui-btn--quiet" href="#/scouter">Candidates in Scouter</a></p>
        {B && <div className="lt-anatomy__fault" data-testid="anatomy-fault"><h3>Simulated fault: {B[1]}</h3>
          <p><b>Symptom you would see:</b> {B[4]}.{down.length ? <> <b>Downstream it looks like:</b> {down.map((d) => C.blocks.find((b) => b[0] === d)![4].toLowerCase()).join('; ')}.</> : null}</p>
          <p><b>Which layer owns this fault?</b></p>
          <div className="ln-tabs" role="group" aria-label="Your answer">{SCA_LAYERS.map((l) => <button key={l[0]} type="button" className="ui-btn ui-btn--quiet" aria-pressed={guess === l[0]} onClick={() => setGuess(l[0])} data-guess={l[0]}>{l[1]}</button>)}</div>
          {guess && <p aria-live="polite" data-testid="anatomy-verdict" data-right={guess === B[2]}>{guess === B[2] ? <><b className="ok">Right: {layerOf(B[2])[1]}.</b> The safe order is the test that proves it before anything is swapped: <b>{B[5]}</b>.</> : <><b className="warn">Not that layer.</b> Read the block’s own symptom again; the downstream blocks only show the consequence.</>}</p>}
          {guess === B[2] && !rec && <p><Button kind="primary" onClick={() => setRec(true)} testId="anatomy-record">Record the verification step</Button></p>}
          {rec && <p className="ui-meta" data-testid="anatomy-recorded">Recorded for this visit: isolated a {C.label} fault to its {layerOf(B[2])[1].toLowerCase()} layer — {B[1]}: {B[5]}. Practice, not a credential.</p>}
        </div>}
      </div>
      <aside className="lt-panel" aria-label="The selected block">
        {S ? <Card title={S[1]} icon="device" testId="anatomy-block"><dl className="lt-dl"><dt>Layer</dt><dd>{layerOf(S[2])[1]}</dd><dt>Does</dt><dd>{S[3]}</dd><dt>Fails as</dt><dd>{S[4]}</dd><dt>Test</dt><dd>{S[5]}</dd><dt>Upstream</dt><dd>{S[6] && S[6] !== '—' ? name(S[6]) : '—'}</dd><dt>Downstream</dt><dd>{S[7] && S[7] !== '—' ? name(S[7]) : '—'}</dd></dl>
          <p className="ui-meta">Safe troubleshooting order: observe, test the block that explains the symptom, confirm upstream is healthy, then act. Swap nothing on a guess.</p></Card>
          : <Card title="Pick a block" icon="info"><p>Each block carries its own symptom and its own test. The layer buttons dim the others so one kind of path reads at a time.</p></Card>}
        <Card title="Other classes" icon="layers"><ul className="plain stack">{Object.entries(SCA_CLASSES).filter(([k]) => k !== cls).map(([k, v]) => <li key={k}><a href={`#/scouter/anatomy/${k}`}>{v.label}</a></li>)}</ul></Card>
      </aside>
    </div>
  </section>;
}
