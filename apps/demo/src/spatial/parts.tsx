/**
 * The core screens' vocabulary over the `packages/ui` kit (uplift/system-shell): the health band of campus/metrics.ts mapped to the kit's
 * HealthState, and the kit's StatusDot, Chip, ScoreRing, StatTile, Icon, List/ListRow, MeterRow, EmptyState and PageHero re-exported.
 * The band thresholds are V2.5.3's as its records show them (89 Healthy, 87 Monitor): 88 and over healthy, 75–87 monitor.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { StatusDot as KDot, Chip as KChip, ScoreRing as KRing, StatTile as KTile, Icon as KIcon, type HealthState, type IconName } from '@empathia/ui';
import { BAND_LABEL, type Band } from '../campus/metrics.js';
export { List, ListRow, MeterRow, EmptyState, PageHero, Card } from '@empathia/ui';

export const stateOf = (b: Band): HealthState => (b === 'none' ? 'offline' : b);
const SERIES: Record<Band, 'ok' | 'warn' | 'bad' | 'muted'> = { healthy: 'ok', monitor: 'warn', action: 'bad', none: 'muted' };
/** My icon names → the kit's. */
const NAME: Record<string, IconName> = {
  heart: 'pulse', device: 'device', alert: 'alert', cycle: 'route', link: 'link', map: 'map', cube: 'layers', plus: 'plus', passport: 'ticket', clock: 'clock', check: 'check',
  search: 'search', people: 'users', building: 'building', chevron: 'chevron-right' as IconName, graph: 'link', spark: 'spark', room: 'room', shield: 'shield', chart: 'chart',
};
export const iconName = (n: string): IconName => NAME[n] || (n as IconName);

export function Icon({ name, size = 18 }: { name: string; size?: number }) { return <KIcon name={iconName(name)} size={size} />; }
export function StatusDot({ band, label }: { band: Band; label?: string }) { return <KDot state={stateOf(band)} label={label ?? BAND_LABEL[band]} />; }
export function Chip({ children, tone = 'muted', title, href, selected, icon }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent'; title?: string; href?: string; selected?: boolean; icon?: string }) {
  return <KChip tone={tone} title={title} href={href} selected={selected} icon={icon ? iconName(icon) : undefined} small>{children}</KChip>;
}
export function ScoreRing({ score, band, size = 96, label, caption }: { score: number | null; band: Band; size?: number; label: string; caption?: ReactNode }) {
  return <KRing value={score} band={stateOf(band)} size={size} label={label} caption={caption} />;
}
/** A tile; `tone` is a health band, or 'text' for a word-valued tile. */
export function StatTile({ label, value, unit, sub, tone, icon, testId, href }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: Band | 'text'; icon?: string; testId?: string; href?: string }) {
  const t = tone && tone !== 'text' ? SERIES[tone] : undefined;
  return <div className={`tilecell${tone === 'text' ? ' tilecell--text' : ''}`}><KTile label={label} value={value as string | number | null} unit={unit} hint={sub} tone={t} icon={icon ? iconName(icon) : undefined} testId={testId} href={href} /></div>;
}

export function Section({ title, aside, children, id, testId }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string; testId?: string }) {
  return <section className="sect" aria-labelledby={id} data-testid={testId}><div className="sect__head"><h2 id={id}>{title}</h2>{aside && <span className="sect__aside">{aside}</span>}</div>{children}</section>;
}

/** May the current role open this address? Provided by each core page from the policy (D44: a link that would be refused is not offered). */
export const OpensContext = createContext<(href: string) => boolean>(() => true);
export const useOpens = () => useContext(OpensContext);
/** A link the role can follow, or the same words as plain text when it cannot. */
export function A({ href, className, children, testId }: { href: string; className?: string; children: ReactNode; testId?: string }) {
  const opens = useOpens();
  return opens(href.split('?')[0]!) ? <a href={href} className={className} data-testid={testId}>{children}</a> : <span className={className} data-testid={testId}>{children}</span>;
}
