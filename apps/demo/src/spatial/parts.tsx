/**
 * Small presentational parts the core screens share (campus, room, home, Search Party). Interim until the `packages/ui` kit lands; the
 * names and props follow the kit's (ScoreRing, StatTile, Chip, StatusDot, Bar, Section) so the swap is an import change.
 */
import type { ReactNode } from 'react';
import { BAND_LABEL, type Band } from '../campus/metrics.js';

const TONE_OF: Record<Band, string> = { healthy: 'ok', monitor: 'warn', action: 'bad', none: 'muted' };

/** A status dot with a glyph, so colour is never the only signal (● healthy, ▲ monitor, ◆ action, ○ none). */
export function StatusDot({ band, label }: { band: Band; label?: ReactNode }) {
  return <span className={`sdot sdot--${TONE_OF[band]}`}><span className="sdot__g" aria-hidden="true">{band === 'healthy' ? '●' : band === 'monitor' ? '▲' : band === 'action' ? '◆' : '○'}</span>{label ?? BAND_LABEL[band]}</span>;
}

export function Chip({ children, tone = 'muted', title }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent'; title?: string }) {
  return <span className={`chip chip--${tone}`} title={title}>{children}</span>;
}

/** A score ring 0–100 (or "—" when not scored). The number is in the text; the ring only repeats it. */
export function ScoreRing({ score, band, size = 64, label }: { score: number | null; band: Band; size?: number; label: string }) {
  const r = 26; const c = 2 * Math.PI * r; const v = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <svg className={`ring ring--${TONE_OF[band]}`} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${label}: ${score == null ? 'not scored' : `${score} of 100, ${BAND_LABEL[band]}`}`}>
      <circle cx="32" cy="32" r={r} className="ring__track" />
      <circle cx="32" cy="32" r={r} className="ring__val" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" className="ring__n">{score == null ? '—' : score}</text>
    </svg>
  );
}

export function StatTile({ label, value, unit, sub, tone, icon, children, testId }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: string; icon?: ReactNode; children?: ReactNode; testId?: string }) {
  return (
    <div className={`tile${tone ? ` tile--${tone}` : ''}`} data-testid={testId}>
      <div className="tile__top">{icon && <span className="tile__icon" aria-hidden="true">{icon}</span>}<span className="tile__label">{label}</span></div>
      <div className="tile__value"><b>{value}</b>{unit && <span className="tile__unit">{unit}</span>}</div>
      {sub && <div className="tile__sub">{sub}</div>}
      {children}
    </div>
  );
}

/** A thin bar 0–100 with its value stated beside it by the caller. */
export function Bar({ value, band }: { value: number | null; band: Band }) {
  return <span className={`hbar hbar--${TONE_OF[band]}`} aria-hidden="true"><span style={{ width: `${value == null ? 0 : Math.max(2, Math.min(100, value))}%` }} /></span>;
}

export function Section({ title, aside, children, id, testId }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string; testId?: string }) {
  return <section className="sect" aria-labelledby={id} data-testid={testId}><div className="sect__head"><h2 id={id}>{title}</h2>{aside && <span className="sect__aside">{aside}</span>}</div>{children}</section>;
}

/** Line icons (stroke = currentColor), 20 px. */
const P: Record<string, string> = {
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  device: 'M4 5h16v11H4zM9 20h6M12 16v4',
  alert: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  cycle: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  link: 'M10 14l4-4M8 16l-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M16 8l2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  plus: 'M12 5v14M5 12h14',
  passport: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12l4 4 10-10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20c0-2.6-1.6-4.8-4-5.6',
  building: 'M5 21V5l7-2v18M12 8l7 2v11M8 8h1M8 12h1M8 16h1M15 13h1M15 17h1M3 21h18',
  chevron: 'M9 6l6 6-6 6',
  graph: 'M6 6a2 2 0 1 0 0 .1M18 6a2 2 0 1 0 0 .1M12 18a2 2 0 1 0 0 .1M7.5 7.5l3.5 9M16.5 7.5l-3.5 9M8 6h8',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  room: 'M4 20V8l8-5 8 5v12zM9 20v-6h6v6',
};
export function Icon({ name, size = 18 }: { name: keyof typeof P | string; size?: number }) {
  return <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name] || P.spark} /></svg>;
}
