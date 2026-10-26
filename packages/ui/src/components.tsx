/**
 * Empathia UI components. Plain React, styled by ui.css over the design tokens. Every interactive component is keyboard operable;
 * every status shows a glyph and a text label; every async surface has loading, empty and error states.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { statusOf, type StatusSpec, type Tone } from './status.js';

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');

// ------------------------------------------------------------------------------------------------ buttons
export interface ButtonProps { children?: ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; busy?: boolean; title?: string; small?: boolean; testId?: string }
export function Button({ children, onClick, kind = 'secondary', type = 'button', disabled, busy, title, small, testId }: ButtonProps) {
  return <button type={type} className={cx('ui-btn', `ui-btn--${kind}`, small && 'ui-btn--sm')} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined} title={title} data-testid={testId}>{busy ? <span className="ui-spin" aria-hidden="true" /> : null}{children}</button>;
}

// ------------------------------------------------------------------------------------------------ status
export function Badge({ spec, compact }: { spec: StatusSpec; compact?: boolean }) {
  return <span className={cx('ui-badge', `ui-tone--${spec.tone}`)} title={spec.help || spec.label}><span className="ui-badge__glyph" aria-hidden="true">{spec.glyph}</span>{compact ? <span className="ui-sr">{spec.label}</span> : spec.label}</span>;
}
export function StatusBadge({ table, value, compact }: { table: Record<string, StatusSpec>; value: string | null | undefined; compact?: boolean }) {
  return <Badge spec={statusOf(table, value)} compact={compact} />;
}
export function Tag({ children, tone = 'muted' }: { children?: ReactNode; tone?: Tone }) { return <span className={cx('ui-tag', `ui-tone--${tone}`)}>{children}</span>; }

// ------------------------------------------------------------------------------------------------ states
export function Loading({ label = 'Loading' }: { label?: string }) { return <div className="ui-state" role="status" aria-live="polite"><span className="ui-spin" aria-hidden="true" />{label}…</div>; }
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="ui-state ui-state--empty"><p className="ui-state__title">{title}</p>{children ? <div className="ui-state__body">{children}</div> : null}{action}</div>;
}
export interface ProblemLike { status?: number; code?: string; detail?: string; message?: string; reasons?: string[]; correlationId?: string | null }
export function ErrorState({ error, retry }: { error: ProblemLike; retry?: () => void }) {
  const reasons = error.reasons || [];
  return (
    <div className="ui-state ui-state--error" role="alert">
      <p className="ui-state__title">{error.status === 403 ? 'Your role cannot do this' : error.status === 404 ? 'Not found in your tenant or sites' : error.status === 422 ? 'Refused by a rule' : 'Something went wrong'}</p>
      <p className="ui-state__body">{error.detail || error.message}</p>
      {reasons.length > 1 ? <ul className="ui-reasons">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
      {error.correlationId ? <p className="ui-meta">Reference {error.correlationId}</p> : null}
      {retry ? <Button onClick={retry} small>Try again</Button> : null}
    </div>
  );
}
export function Notice({ tone = 'info', children }: { tone?: Tone; children?: ReactNode }) { return <div className={cx('ui-notice', `ui-tone--${tone}`)} role={tone === 'bad' ? 'alert' : 'status'}>{children}</div>; }

// ------------------------------------------------------------------------------------------------ figures
export function Stat({ label, value, unit, definition, tone }: { label: string; value: ReactNode; unit?: string; definition?: string; tone?: Tone }) {
  return (
    <div className={cx('ui-stat', tone && `ui-tone--${tone}`)}>
      <div className="ui-stat__value">{value === null || value === undefined ? <span className="ui-muted" title="no data: nothing has been measured">—</span> : value}{unit ? <span className="ui-stat__unit">{unit}</span> : null}</div>
      <div className="ui-stat__label">{label}</div>
      {definition ? <div className="ui-stat__def">{definition}</div> : null}
    </div>
  );
}
/** A horizontal bar showing parts of a whole, with a text legend (the bar alone never carries the numbers). */
export function Composition({ parts, total, label }: { parts: Array<{ key: string; label: string; value: number; tone: Tone }>; total: number; label: string }) {
  return (
    <figure className="ui-comp" aria-label={label}>
      <div className="ui-comp__bar" aria-hidden="true">{parts.filter((p) => p.value > 0).map((p) => <span key={p.key} className={cx('ui-comp__seg', `ui-fill--${p.tone}`)} style={{ flexGrow: p.value }} title={`${p.label}: ${p.value}`} />)}</div>
      <figcaption className="ui-comp__legend">{parts.map((p) => <span key={p.key}><i className={cx('ui-dot', `ui-fill--${p.tone}`)} aria-hidden="true" />{p.label} <b>{p.value}</b></span>)}<span className="ui-muted">of {total}</span></figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------------------------------------ table
export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; sort?: (row: T) => string | number; align?: 'left' | 'right'; width?: string }
export function DataTable<T>({ rows, columns, rowKey, empty, caption, onRowClick, dense }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: ReactNode; caption?: string; onRowClick?: (r: T) => void; dense?: boolean }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const c = columns.find((x) => x.key === sort.key);
    if (!c?.sort) return rows;
    return [...rows].sort((a, b) => { const x = c.sort!(a); const y = c.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [rows, columns, sort]);
  if (!rows.length) return <>{empty ?? <Empty title="Nothing here yet" />}</>;
  return (
    <div className="ui-table-wrap">
      <table className={cx('ui-table', dense && 'ui-table--dense')}>
        {caption ? <caption className="ui-sr">{caption}</caption> : null}
        <thead><tr>{columns.map((c) => (
          <th key={c.key} scope="col" style={{ width: c.width, textAlign: c.align || 'left' }} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
            {c.sort ? <button type="button" className="ui-th-sort" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>{c.header}<span aria-hidden="true">{sort?.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span></button> : c.header}
          </th>))}</tr></thead>
        <tbody>{sorted.map((r) => (
          <tr key={rowKey(r)} className={onRowClick ? 'ui-row--link' : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
            {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || 'left' }}>{c.render(r)}</td>)}
          </tr>))}</tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ forms
export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string | null; children: (id: string, describedBy: string | undefined) => ReactNode; id?: string }) {
  const auto = useId(); const fid = id || auto; const did = hint || error ? `${fid}-d` : undefined;
  return (
    <div className={cx('ui-field', error && 'ui-field--error')}>
      <label htmlFor={fid}>{label}</label>
      {children(fid, did)}
      {error ? <p id={did} className="ui-field__error">{error}</p> : hint ? <p id={did} className="ui-field__hint">{hint}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ tabs
export function Tabs({ tabs, active, onChange, label }: { tabs: Array<{ key: string; label: string; count?: number }>; active: string; onChange: (k: string) => void; label: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (d: number) => { const i = tabs.findIndex((t) => t.key === active); const n = tabs[(i + d + tabs.length) % tabs.length]!; onChange(n.key); refs.current[n.key]?.focus(); };
  return (
    <div className="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} ref={(el: HTMLButtonElement | null) => { refs.current[t.key] = el; }} role="tab" type="button" id={`tab-${t.key}`} aria-selected={t.key === active} aria-controls={`panel-${t.key}`} tabIndex={t.key === active ? 0 : -1}
          className={cx('ui-tab', t.key === active && 'ui-tab--on')} onClick={() => onChange(t.key)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}>
          {t.label}{t.count !== undefined ? <span className="ui-tab__count">{t.count}</span> : null}
        </button>))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ drawer (modal side panel)
export function Drawer({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const back = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    back.current = document.activeElement;
    const el = ref.current; const first = el?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])'); (first || el)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!f.length) return; const a = f[0]!; const z = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); (back.current as HTMLElement | null)?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="ui-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ui-drawer" role="dialog" aria-modal="true" aria-labelledby="ui-drawer-title" ref={ref} tabIndex={-1}>
        <header className="ui-drawer__head"><h2 id="ui-drawer-title">{title}</h2><button type="button" className="ui-x" data-close onClick={onClose} aria-label="Close">×</button></header>
        <div className="ui-drawer__body">{children}</div>
        {footer ? <footer className="ui-drawer__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ definition list
export function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return <dl className="ui-facts">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v ?? <span className="ui-muted">—</span>}</dd></div>)}</dl>;
}
