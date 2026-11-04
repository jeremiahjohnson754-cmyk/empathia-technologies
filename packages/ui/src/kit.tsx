/**
 * The Empathia component kit (QUALITY_UPLIFT, 2026-11-04): the V2.5.3 composition vocabulary — gradient hero card, icon-headed cards,
 * stat tiles with sparklines, score rings, donuts, progress bars, chips and status dots, list rows, empty states, toasts with Undo —
 * rebuilt on the design tokens. Styles in kit.css (prefix kit-), documented in packages/ui/README-kit.md.
 *
 * Rules every component keeps:
 *   - CSP-safe: no style attribute anywhere; geometry lives in SVG attributes, colour in classes over tokens.
 *   - Values come from the caller's data; nothing is typed in. Every chart has a text equivalent (legend with values, aria-label summary),
 *     and no state is carried by colour alone (a word, a shape or both travel with it).
 *   - Keyboard and screen reader complete; motion only where prefers-reduced-motion allows (kit.css).
 */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
type RKE = { key: string; preventDefault: () => void };
import { Icon, type IconName } from './icons.js';
import type { Tone } from './status.js';

const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');
/** A data-series colour: a status tone, a data hue, or one of the nine products (their --p-<id>). */
export type Series = Tone | 'indigo' | 'violet' | 'mission-control' | 'lite' | 'pro' | 'search-party' | 'servicehands' | 'commissioning' | 'apex' | 'field' | 'learn';
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '—');
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

// ================================================================================================ status vocabulary for health
export type HealthState = 'healthy' | 'monitor' | 'action' | 'modelled' | 'offline';
export const HEALTH: Record<HealthState, { label: string; tone: Tone; help: string }> = {
  healthy: { label: 'Healthy', tone: 'ok', help: 'Everything measured is within its baseline' },
  monitor: { label: 'Monitor', tone: 'warn', help: 'Drifting from its baseline; nothing has failed yet' },
  action: { label: 'Action needed', tone: 'bad', help: 'Something has failed or is blocked and needs a person' },
  modelled: { label: 'Modelled', tone: 'info', help: 'Synthetic or forecast: computed by the model, not measured' },
  offline: { label: 'No data', tone: 'muted', help: 'Nothing has reported, so nothing is claimed' },
};
/** The health band a 0–100 score falls in (V2.5.3 bands: 85 and over healthy, 70 and over monitor). */
export const bandOf = (score: number | null | undefined): HealthState => (score === null || score === undefined || !Number.isFinite(score) ? 'offline' : score >= 85 ? 'healthy' : score >= 70 ? 'monitor' : 'action');

/** A small shape that differs per state (circle, ring, triangle, dashed ring, square), so the dot is never colour-only; the label is text. */
export function StatusDot({ state, label, hideLabel, className }: { state: HealthState; label?: string; hideLabel?: boolean; className?: string }) {
  const s = HEALTH[state] ?? HEALTH.offline; const text = label ?? s.label;
  return (
    <span className={cx('kit-dot', `ui-tone--${s.tone}`, className)} data-state={state} title={s.help}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        {state === 'healthy' ? <circle cx="5" cy="5" r="4" className="kit-dot__fill" />
          : state === 'monitor' ? <><circle cx="5" cy="5" r="3.6" className="kit-dot__ring" /><path d="M5 1.4a3.6 3.6 0 0 1 0 7.2Z" className="kit-dot__fill" /></>
          : state === 'action' ? <path d="M5 .8 9.4 9H.6Z" className="kit-dot__fill" />
          : state === 'modelled' ? <circle cx="5" cy="5" r="3.6" className="kit-dot__ring kit-dot__ring--dash" />
          : <rect x="1.5" y="1.5" width="7" height="7" rx="1" className="kit-dot__ring" />}
      </svg>
      {hideLabel ? <span className="ui-sr">{text}</span> : <span className="kit-dot__t">{text}</span>}
    </span>
  );
}

// ================================================================================================ chips
export function Chip({ children, tone, icon, selected, onClick, href, small, title, className }: { children: ReactNode; tone?: Tone | Series; icon?: IconName; selected?: boolean; onClick?: () => void; href?: string; small?: boolean; title?: string; className?: string }) {
  const cls = cx('kit-chip', tone && `kit-s--${tone}`, tone && 'kit-chip--tone', selected && 'kit-chip--on', small && 'kit-chip--sm', (onClick || href) && 'kit-chip--act', className);
  const inner = <>{icon ? <Icon name={icon} size={small ? 14 : 16} /> : null}<span>{children}</span></>;
  if (href) return <a className={cls} href={href} title={title} aria-current={selected ? 'true' : undefined}>{inner}</a>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-pressed={selected === undefined ? undefined : selected} title={title}>{inner}</button>;
  return <span className={cls} title={title}>{inner}</span>;
}

// ================================================================================================ hero
/**
 * The page's hero: V2.5.3's gradient card (navy ground, a teal glow and an indigo glow, a faint grid), with eyebrow, the page's one h1,
 * a lede, actions, meta chips and an optional aside (a ScoreRing, StatTiles…). The h1 carries tabIndex=-1 so route focus can land on it
 * without drawing a ring (kit.css shows outlines on :focus-visible only).
 */
export function PageHero({ eyebrow, title, lede, actions, meta, aside, product, icon, id, level = 1, compact, className }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode; meta?: ReactNode[]; aside?: ReactNode; product?: string; icon?: IconName; id?: string; level?: 1 | 2; compact?: boolean; className?: string }) {
  const auto = useId(); const hid = id || `hero-${auto.replace(/:/g, '')}`;
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <header className={cx('kit-hero', product && `ui-p--${product}`, product && 'kit-hero--p', compact && 'kit-hero--compact', !!aside && 'kit-hero--aside', className)} aria-labelledby={hid} data-testid="page-hero">
      <div className="kit-hero__main">
        {eyebrow ? <p className="kit-hero__eyebrow">{icon ? <Icon name={icon} size={16} /> : null}<span>{eyebrow}</span></p> : null}
        <H id={hid} className="kit-hero__title" tabIndex={-1}>{title}</H>
        {lede ? <p className="kit-hero__lede">{lede}</p> : null}
        {meta && meta.length ? <ul className="kit-hero__meta" aria-label="About this page">{meta.map((m, i) => <li key={i}>{m}</li>)}</ul> : null}
        {actions ? <div className="kit-hero__actions">{actions}</div> : null}
      </div>
      {aside ? <div className="kit-hero__aside">{aside}</div> : null}
    </header>
  );
}

// ================================================================================================ cards
/** A card with an icon header (the icon sits in a tinted tile in the series/product colour), an optional action, body and footer. */
export function Card({ title, sub, icon, tone, action, footer, children, level = 2, pad = true, className, id, testId }: { title?: ReactNode; sub?: ReactNode; icon?: IconName; tone?: Series; action?: ReactNode; footer?: ReactNode; children?: ReactNode; level?: 2 | 3 | 4; pad?: boolean; className?: string; id?: string; testId?: string }) {
  const auto = useId(); const hid = `${id || 'card'}-${auto.replace(/:/g, '')}-h`;
  const H = (`h${level}`) as 'h2' | 'h3' | 'h4';
  return (
    <section className={cx('kit-card', !pad && 'kit-card--flush', tone && `kit-s--${tone}`, className)} aria-labelledby={title ? hid : undefined} id={id} data-testid={testId}>
      {title ? (
        <header className="kit-card__head">
          {icon ? <span className="kit-card__icon" aria-hidden="true"><Icon name={icon} size={18} /></span> : null}
          <div className="kit-card__titles"><H id={hid} className="kit-card__title">{title}</H>{sub ? <p className="kit-card__sub">{sub}</p> : null}</div>
          {action ? <div className="kit-card__action">{action}</div> : null}
        </header>
      ) : null}
      <div className="kit-card__body">{children}</div>
      {footer ? <footer className="kit-card__foot">{footer}</footer> : null}
    </section>
  );
}
/** A plain raised surface (no header semantics) for grouping. */
export function Panel({ children, className, raised, as = 'div' }: { children?: ReactNode; className?: string; raised?: boolean; as?: 'div' | 'section' | 'aside' }) {
  const T = as; return <T className={cx('kit-panel', raised && 'kit-panel--raised', className)}>{children}</T>;
}

// ================================================================================================ sparkline
/** A line of values (oldest first) with its last point marked. role="img" with a summary a screen reader can use. */
export function Sparkline({ values, label, tone = 'accent', width = 120, height = 32, area = true, className }: { values: number[]; label: string; tone?: Series; width?: number; height?: number; area?: boolean; className?: string }) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return <span className={cx('kit-spark', 'kit-spark--none', className)}>{v.length ? `${label}: ${fmt(v[0]!, 1)}` : `${label}: no data`}</span>;
  const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1, p = 3;
  const xs = (i: number) => p + (i * (width - 2 * p)) / (v.length - 1);
  const ys = (x: number) => p + (height - 2 * p) * (1 - (x - lo) / span);
  const line = v.map((x, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(x).toFixed(1)}`).join(' ');
  const fill = `${line} L${xs(v.length - 1).toFixed(1)} ${height - 1} L${xs(0).toFixed(1)} ${height - 1} Z`;
  const summary = `${label}: ${v.length} points, from ${fmt(v[0]!, 1)} to ${fmt(v[v.length - 1]!, 1)}, low ${fmt(lo, 1)}, high ${fmt(hi, 1)}`;
  return (
    <svg className={cx('kit-spark', `kit-s--${tone}`, className)} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} focusable="false">
      <title>{summary}</title>
      {area ? <path d={fill} className="kit-spark__area" /> : null}
      <path d={line} className="kit-spark__line" />
      <circle cx={xs(v.length - 1)} cy={ys(v[v.length - 1]!)} r="2.6" className="kit-spark__dot" />
    </svg>
  );
}

// ================================================================================================ stat tile
export interface Delta { value: number; unit?: string; /** which direction is good: drives the tone and the spoken word, never the arrow */ good?: 'up' | 'down' | 'none'; label?: string }
/** A figure with its unit, label, change and trend. A missing value shows an em dash with "no data", never a zero. */
export function StatTile({ label, value, unit, delta, spark, hint, tone, icon, href, digits = 0, testId }: { label: string; value: number | string | null | undefined; unit?: string; delta?: Delta; spark?: number[]; hint?: ReactNode; tone?: Series; icon?: IconName; href?: string; digits?: number; testId?: string }) {
  const shown = value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value)) ? null : typeof value === 'number' ? fmt(value, digits) : value;
  const dir = delta ? (delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat') : null;
  const better = delta && dir !== 'flat' && delta.good && delta.good !== 'none' ? (delta.good === dir ? 'better' : 'worse') : null;
  const body = (
    <>
      <div className="kit-tile__top">
        {icon ? <span className="kit-tile__icon" aria-hidden="true"><Icon name={icon} size={16} /></span> : null}
        <span className="kit-tile__label">{label}</span>
      </div>
      <div className="kit-tile__value">{shown === null ? <><span aria-hidden="true">—</span><span className="ui-sr">no data</span></> : shown}{shown !== null && unit ? <span className="kit-tile__unit">{unit}</span> : null}</div>
      <div className="kit-tile__foot">
        {delta && dir ? (
          <span className={cx('kit-delta', better === 'better' ? 'ui-tone--ok' : better === 'worse' ? 'ui-tone--bad' : 'ui-tone--muted')} data-dir={dir}>
            {dir !== 'flat' ? <Icon name={dir === 'up' ? 'arrow-up' : 'arrow-down'} size={14} /> : null}
            <span aria-hidden="true">{dir === 'flat' ? '±0' : `${delta.value > 0 ? '+' : '−'}${fmt(Math.abs(delta.value), 1)}`}{delta.unit || ''}</span>
            <span className="ui-sr">{dir === 'flat' ? 'no change' : `${dir} ${fmt(Math.abs(delta.value), 1)}${delta.unit || ''}`}{better ? `, ${better}` : ''}</span>
            {delta.label ? <span className="kit-delta__l">{delta.label}</span> : null}
          </span>
        ) : hint ? <span className="kit-tile__hint">{hint}</span> : null}
        {spark && spark.length > 1 ? <Sparkline values={spark} label={`${label} trend`} tone={tone || 'accent'} width={84} height={26} /> : null}
      </div>
    </>
  );
  const cls = cx('kit-tile', tone && `kit-s--${tone}`, href && 'kit-tile--link');
  return href ? <a className={cls} href={href} data-testid={testId}>{body}</a> : <div className={cls} data-testid={testId}>{body}</div>;
}

// ================================================================================================ score ring
/** A score out of max (e.g. 87/100) as a ring, with the band word under it. */
export function ScoreRing({ value, max = 100, label, size = 112, band, caption }: { value: number | null | undefined; max?: number; label: string; size?: number; band?: HealthState; caption?: ReactNode }) {
  const ok = value !== null && value !== undefined && Number.isFinite(value);
  const pct = ok ? clamp((value as number) / max, 0, 1) : 0;
  const state = band ?? (ok ? bandOf((pct * 100)) : 'offline');
  const r = 42, C = 2 * Math.PI * r;
  const words = ok ? `${label}: ${fmt(value as number)} out of ${fmt(max)}, ${HEALTH[state].label}` : `${label}: no data`;
  return (
    <figure className={cx('kit-ring', `ui-tone--${HEALTH[state].tone}`)} data-state={state}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={words} focusable="false">
        <title>{words}</title>
        <circle cx="50" cy="50" r={r} className="kit-ring__track" />
        {ok ? <circle cx="50" cy="50" r={r} className="kit-ring__arc" strokeDasharray={`${(C * pct).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 50 50)" /> : null}
        <text x="50" y="49" textAnchor="middle" className="kit-ring__v" aria-hidden="true">{ok ? fmt(value as number) : '—'}</text>
        <text x="50" y="66" textAnchor="middle" className="kit-ring__max" aria-hidden="true">/{fmt(max)}</text>
      </svg>
      <figcaption className="kit-ring__cap"><span className="kit-ring__label">{label}</span><StatusDot state={state} />{caption ? <span className="kit-ring__more">{caption}</span> : null}</figcaption>
    </figure>
  );
}

// ================================================================================================ donut
export interface Segment { key: string; label: string; value: number; tone: Series }
/** Parts of a whole as a ring with gaps between segments, the total in the middle, and a legend that carries every value and share. */
export function Donut({ segments, label, total: totalLabel = 'total', size = 148, unit, className }: { segments: Segment[]; label: string; total?: string; size?: number; unit?: string; className?: string }) {
  const parts = segments.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const sum = parts.reduce((a, s) => a + s.value, 0);
  const r = 40, C = 2 * Math.PI * r, gap = parts.length > 1 ? 1.6 : 0;
  let at = 0;
  const arcs = parts.map((s) => { const len = (s.value / sum) * C; const a = { s, len: Math.max(len - gap, 0.01), off: at }; at += len; return a; });
  const pct = (v: number) => (sum ? Math.round((v / sum) * 100) : 0);
  return (
    <figure className={cx('kit-donut', className)}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {arcs.length ? null : <circle cx="50" cy="50" r={r} className="kit-donut__track" />}
        {arcs.map((a) => <circle key={a.s.key} cx="50" cy="50" r={r} className={cx('kit-donut__seg', `kit-s--${a.s.tone}`)} strokeDasharray={`${a.len.toFixed(2)} ${(C - a.len).toFixed(2)}`} strokeDashoffset={(-a.off).toFixed(2)} transform="rotate(-90 50 50)" />)}
        <text x="50" y="50" textAnchor="middle" className="kit-donut__v">{fmt(sum)}</text>
        <text x="50" y="63" textAnchor="middle" className="kit-donut__t">{totalLabel}</text>
      </svg>
      <figcaption className="kit-donut__legend">
        <span className="ui-sr">{label}: {fmt(sum)}{unit ? ` ${unit}` : ''} {totalLabel}.</span>
        <ul aria-label={label}>{segments.map((s) => (
          <li key={s.key} className={`kit-s--${s.tone}`}>
            <span className="kit-legend__sw" aria-hidden="true" /><span className="kit-legend__l">{s.label}</span>
            <b className="kit-legend__v">{fmt(s.value)}{unit ? ` ${unit}` : ''}</b><span className="kit-legend__p">{pct(s.value)}%</span>
          </li>))}</ul>
      </figcaption>
    </figure>
  );
}

// ================================================================================================ progress
/** A determinate bar; the value and its words travel with it (aria-valuetext and the visible figure). */
export function ProgressBar({ value, max = 100, label, tone = 'accent', showValue = true, valueText, small }: { value: number; max?: number; label: string; tone?: Series; showValue?: boolean; valueText?: string; small?: boolean }) {
  const v = Number.isFinite(value) ? clamp(value, 0, max) : 0; const p = max ? (v / max) * 100 : 0; const lid = useId();
  const text = valueText ?? `${Math.round(p)}%`;
  return (
    <div className={cx('kit-progress', `kit-s--${tone}`, small && 'kit-progress--sm')}>
      <div className="kit-progress__row"><span id={lid} className="kit-progress__l">{label}</span>{showValue ? <span className="kit-progress__v" aria-hidden="true">{text}</span> : null}</div>
      <div role="progressbar" aria-labelledby={lid} aria-valuemin={0} aria-valuemax={max} aria-valuenow={v} aria-valuetext={text} className="kit-progress__track">
        <svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect className="kit-progress__fill" x="0" y="0" height="100%" width={`${p.toFixed(2)}%`} rx="3" /></svg>
      </div>
    </div>
  );
}

// ================================================================================================ segmented control and tabs
/** A single choice among a few (radio semantics, roving focus, arrows/Home/End). For page sections use Tabs. */
export function Segmented<T extends string>({ options, value, onChange, label, small }: { options: Array<{ value: T; label: string; icon?: IconName; count?: number }>; value: T; onChange: (v: T) => void; label: string; small?: boolean }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const key = (e: RKE, i: number) => {
    const n = options.length; let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n; else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
    if (j >= 0) { e.preventDefault(); onChange(options[j]!.value); refs.current[j]?.focus(); }
  };
  return (
    <div className={cx('kit-seg', small && 'kit-seg--sm')} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o.value} ref={(el: HTMLButtonElement | null) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1}
          className={cx('kit-seg__opt', o.value === value && 'kit-seg__opt--on')} onClick={() => onChange(o.value)} onKeyDown={(e) => key(e, i)}>
          {o.icon ? <Icon name={o.icon} size={16} /> : null}<span>{o.label}</span>{o.count !== undefined ? <span className="kit-seg__n">{o.count}</span> : null}
        </button>))}
    </div>
  );
}
/** Tabs with their panels wired (ids, aria-controls, roving focus, Home/End). Render the active panel with <TabPanel>. */
export function KitTabs({ tabs, active, onChange, label, idBase }: { tabs: Array<{ key: string; label: string; icon?: IconName; count?: number }>; active: string; onChange: (k: string) => void; label: string; idBase: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const go = (i: number) => { const t = tabs[(i + tabs.length) % tabs.length]!; onChange(t.key); refs.current[t.key]?.focus(); };
  const at = tabs.findIndex((t) => t.key === active);
  return (
    <div className="kit-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} ref={(el: HTMLButtonElement | null) => { refs.current[t.key] = el; }} type="button" role="tab" id={`${idBase}-tab-${t.key}`} aria-controls={`${idBase}-panel-${t.key}`} aria-selected={t.key === active} tabIndex={t.key === active ? 0 : -1}
          className={cx('kit-tab', t.key === active && 'kit-tab--on')} onClick={() => onChange(t.key)}
          onKeyDown={(e) => { const k = e.key; if (k === 'ArrowRight') { e.preventDefault(); go(at + 1); } else if (k === 'ArrowLeft') { e.preventDefault(); go(at - 1); } else if (k === 'Home') { e.preventDefault(); go(0); } else if (k === 'End') { e.preventDefault(); go(tabs.length - 1); } }}>
          {t.icon ? <Icon name={t.icon} size={16} /> : null}<span>{t.label}</span>{t.count !== undefined ? <span className="kit-tab__n">{t.count}</span> : null}
        </button>))}
    </div>
  );
}
export function TabPanel({ idBase, tab, children }: { idBase: string; tab: string; children?: ReactNode }) {
  return <div role="tabpanel" id={`${idBase}-panel-${tab}`} aria-labelledby={`${idBase}-tab-${tab}`} tabIndex={0} className="kit-tabpanel">{children}</div>;
}

// ================================================================================================ list rows
export function List({ children, label, className }: { children?: ReactNode; label?: string; className?: string }) { return <ul className={cx('kit-list', className)} aria-label={label}>{children}</ul>; }
/** One row: leading visual, title and sub line, trailing value, and a chevron when the row leads somewhere. */
export function ListRow({ title, sub, leading, trailing, href, onClick, chevron, current, testId }: { title: ReactNode; sub?: ReactNode; leading?: ReactNode; trailing?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; current?: boolean; testId?: string }) {
  const leads = !!(href || onClick); const showChev = chevron ?? leads;
  const inner = <>{leading ? <span className="kit-row__lead">{leading}</span> : null}<span className="kit-row__text"><span className="kit-row__title">{title}</span>{sub ? <span className="kit-row__sub">{sub}</span> : null}</span>{trailing ? <span className="kit-row__trail">{trailing}</span> : null}{showChev ? <Icon name="chevron-right" size={18} className="kit-row__chev" /> : null}</>;
  return (
    <li className="kit-row-li" data-testid={testId}>
      {href ? <a className="kit-row kit-row--act" href={href} aria-current={current ? 'page' : undefined}>{inner}</a>
        : onClick ? <button type="button" className="kit-row kit-row--act" onClick={onClick}>{inner}</button>
        : <div className="kit-row">{inner}</div>}
    </li>
  );
}

// ================================================================================================ empty state
export function EmptyState({ title, children, action, icon = 'inbox', tone }: { title: string; children?: ReactNode; action?: ReactNode; icon?: IconName; tone?: Series }) {
  return (
    <div className={cx('kit-empty', tone && `kit-s--${tone}`)} role="status">
      <span className="kit-empty__icon" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <p className="kit-empty__title">{title}</p>
      {children ? <div className="kit-empty__body">{children}</div> : null}
      {action ? <div className="kit-empty__action">{action}</div> : null}
    </div>
  );
}

// ================================================================================================ toasts
export interface ToastInput { message: ReactNode; tone?: Tone; undo?: () => void; undoLabel?: string; /** ms; default 6 s, 10 s with Undo */ duration?: number }
interface ToastItem extends ToastInput { id: number }
const ToastCtx = createContext<((t: ToastInput) => number) | null>(null);
/** Provides useToast(). One polite live region; at most three toasts; each pauses while hovered or focused; Escape dismisses. */
export function ToastProvider({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]); const [said, setSaid] = useState('');
  const n = useRef(0);
  const drop = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => { const id = ++n.current; setItems((xs) => [...xs.slice(-2), { ...t, id }]); return id; }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <section className="kit-toasts" aria-label="Notifications">
        <div role="status" aria-live="polite" aria-atomic="false" className="kit-toasts__live">
          {items.map((t) => <Toast key={t.id} t={t} onDone={() => drop(t.id)} onUndone={() => setSaid('Undone.')} />)}
        </div>
        <p className="ui-sr" aria-live="polite">{said}</p>
      </section>
    </ToastCtx.Provider>
  );
}
function Toast({ t, onDone, onUndone }: { t: ToastItem; onDone: () => void; onUndone: () => void }) {
  const [hold, setHold] = useState(false);
  useEffect(() => { if (hold) return; const h = setTimeout(onDone, t.duration ?? (t.undo ? 10000 : 6000)); return () => clearTimeout(h); }, [hold]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cx('kit-toast', `ui-tone--${t.tone || 'accent'}`)} data-testid="toast" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(); } }}>
      <Icon name={t.tone === 'bad' ? 'alert' : t.tone === 'warn' ? 'alert' : 'check'} size={18} className="kit-toast__icon" />
      <span className="kit-toast__msg">{t.message}</span>
      {t.undo ? <button type="button" className="kit-toast__undo" onClick={() => { t.undo!(); onUndone(); onDone(); }}><Icon name="undo" size={16} /><span>{t.undoLabel || 'Undo'}</span></button> : null}
      <button type="button" className="kit-toast__x" onClick={onDone} aria-label="Dismiss"><Icon name="close" size={16} /></button>
    </div>
  );
}
/** Show a toast: toast({ message, undo }) → id. Outside a ToastProvider it does nothing (and says so once in the console). */
export function useToast() {
  const f = useContext(ToastCtx);
  return useMemo(() => f ?? ((_t: ToastInput) => { if (!warned) { warned = true; console.warn('useToast: no <ToastProvider>'); } return 0; }), [f]);
}
let warned = false;

// ================================================================================================ meter row (label + bar + value) for building health lists
export function MeterRow({ label, value, max = 100, sub, href, state }: { label: ReactNode; value: number | null; max?: number; sub?: ReactNode; href?: string; state?: HealthState }) {
  const s = state ?? bandOf(value === null ? null : (value / max) * 100);
  const p = value === null ? 0 : clamp(value / max, 0, 1) * 100;
  const inner = (
    <>
      <span className="kit-meter__l"><span className="kit-meter__name">{label}</span>{sub ? <span className="kit-meter__sub">{sub}</span> : null}</span>
      <span className={cx('kit-meter__bar', `ui-tone--${HEALTH[s].tone}`)} aria-hidden="true"><svg width="100%" height="100%" preserveAspectRatio="none" focusable="false"><rect x="0" y="0" height="100%" width={`${p.toFixed(1)}%`} rx="3" /></svg></span>
      <span className="kit-meter__v">{value === null ? '—' : fmt(value)}<span className="ui-sr"> out of {fmt(max)}</span></span>
      <StatusDot state={s} hideLabel />
    </>
  );
  return <li className="kit-meter">{href ? <a href={href} className="kit-meter__row kit-meter__row--act">{inner}</a> : <div className="kit-meter__row">{inner}</div>}</li>;
}
