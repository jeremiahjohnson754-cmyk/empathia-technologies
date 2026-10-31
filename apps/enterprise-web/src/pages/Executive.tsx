/**
 * Executive passports (P6-C) in the enterprise application: the 27 KPI passports of @empathia/kpi-engine computed by the API
 * over this organization's records. A tile is a passport, not a number: it carries its definition, numerator and denominator,
 * window, coverage, freshness and confidence with reasons. NOT_MEASURABLE is shown as such, never as 0%.
 */
import { useState } from 'react';
import { Button, ErrorState, Facts, Loading, Notice, Tag } from '@empathia/ui';
import { api, useQuery } from '../api.js';

type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info';
interface Passport { id: string; label: string; definition: string; source: string; owner: string; privacy: string; version: string; value: number | null; unit: string; numerator: number | null; denominator: number | null; window: { from: string; to: string; days: number }; coverage: { observed: number; total: number }; freshness: number | null; exclusions: string[]; drill: string[]; confidence: { level: 'high' | 'medium' | 'low' | 'none'; reasons: string[] }; state: 'MEASURED' | 'NOT_MEASURABLE'; reason?: string; byCurrency?: Record<string, number> }
interface Board { now: string; days: number; version: string | null; measured: number; total: number; passports: Passport[]; sources: Record<string, unknown> & { absent: string[] }; note: string }
const CONF: Record<string, Tone> = { high: 'ok', medium: 'info', low: 'warn', none: 'muted' };
const fmt = (p: Passport) => (p.state !== 'MEASURED' || p.value === null ? '—' : p.unit === '%' ? `${Math.round(p.value * 10) / 10}%` : p.byCurrency && Object.keys(p.byCurrency).length ? Object.entries(p.byCurrency).map(([c, v]) => `${c} ${Math.round(v).toLocaleString('en-US')}`).join(' + ') : `${Math.round(p.value * 100) / 100} ${p.unit}`);
const when = (s: string) => s.slice(0, 10);

export function Executive() {
  const [days, setDays] = useState(90);
  const [sel, setSel] = useState<string | null>(null);
  const q = useQuery<Board>(`exec:${days}`, () => api.call('getV1ExecutivePassports' as never, { query: { days: String(days) } } as never) as Promise<Board>);
  if (q.error) return <section className="page"><ErrorState error={q.error} retry={q.reload} /></section>;
  if (!q.data) return <section className="page"><Loading label="Computing the passports" /></section>;
  const b = q.data; const p = b.passports.find((x) => x.id === sel) || null;
  return (
    <section className="page" data-testid="executive">
      <header className="page__head"><div><p className="kicker">Executive · KPI passports {b.version}</p><h1>What is measured, and how well</h1><p className="ui-meta">{b.measured} of {b.total} passports measurable from this organization’s records over the last {b.days} days. {b.note}</p></div>
        <div className="row-actions" data-testid="exec-window">{[30, 90, 180, 365].map((n) => <Button key={n} small kind={n === days ? 'primary' : 'secondary'} onClick={() => { setDays(n); setSel(null); }}>{n} days</Button>)}</div></header>
      <div className="exec__grid" data-testid="exec-grid">{b.passports.map((x) => (
        <button key={x.id} type="button" className={`exec__tile${x.state === 'MEASURED' ? '' : ' nm'}${x.id === sel ? ' on' : ''}`} onClick={() => setSel(x.id)} aria-pressed={x.id === sel}>
          <span className="exec__label">{x.label}</span><span className="exec__value">{x.state === 'MEASURED' ? fmt(x) : 'not measurable'}</span>
          <span className="ui-meta">{x.state === 'MEASURED' ? `${x.numerator ?? '—'} / ${x.denominator ?? '—'} · coverage ${x.coverage.observed}/${x.coverage.total}` : x.reason}</span>
          <Tag tone={CONF[x.confidence.level] || 'muted'}>confidence {x.confidence.level}</Tag>
        </button>))}</div>
      {p ? <section className="card stack" data-testid="passport"><h2 className="h3">KPI passport · {p.label} <Tag tone={p.state === 'MEASURED' ? 'ok' : 'muted'}>{p.state}</Tag></h2><p>{p.definition}</p>
        <Facts items={[['Value', p.state === 'MEASURED' ? fmt(p) : `not measurable — ${p.reason}`], ['Numerator / denominator', p.numerator === null ? '—' : `${p.numerator} / ${p.denominator}`], ['Window', `${when(p.window.from)} → ${when(p.window.to)} (${p.window.days} days)`], ['Coverage', `${p.coverage.observed} of ${p.coverage.total} records observed`], ['Freshness', p.freshness === null ? '—' : `${p.freshness} day(s) since the newest record`], ['Confidence', `${p.confidence.level}${p.confidence.reasons.length ? ` — ${p.confidence.reasons.join('; ')}` : ''}`], ['Source', p.source], ['Owner', p.owner], ['Privacy', p.privacy], ['Version', p.version]]} />
        {p.byCurrency ? <p className="ui-meta">By currency: {Object.entries(p.byCurrency).map(([c, v]) => `${c} ${Math.round(v).toLocaleString('en-US')}`).join(' · ')}</p> : null}
        {p.exclusions.length ? <p className="ui-meta">Exclusions: {p.exclusions.join('; ')}</p> : null}
        {p.drill.length ? <p className="ui-meta">Drill-down: {p.drill.join(' · ')}</p> : null}
      </section> : <Notice tone="muted">Open a passport to read its definition, its arithmetic and why the confidence is what it is.</Notice>}
      <section className="card stack"><h2 className="h3">Sources behind this board</h2>
        <p className="ui-meta">{Object.entries(b.sources).filter(([k]) => k !== 'absent').map(([k, v]) => `${k} ${String(v)}`).join(' · ')}</p>
        <p className="ui-meta">Not present in this starter (their passports are NOT_MEASURABLE): {b.sources.absent.join(', ')}.</p>
      </section>
    </section>
  );
}
