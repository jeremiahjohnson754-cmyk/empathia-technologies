/**
 * Plan view of a room: the outline (metres) and every planned device at its x/y, drawn to one scale. Read-only here; the Founder
 * Studio's Build a Room is the full editor. Colours come from tokens, so the drawing follows light and dark mode.
 */
import type { Device } from '@empathia/api-client';

export function FloorPlan({ points, devices, label }: { points: Array<[number, number]>; devices: Device[]; label: string }) {
  if (!points?.length) return null;
  const xs = points.map((p) => p[0]); const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1, pad = Math.max(w, h) * 0.08;
  const vb = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2.6}`;
  const unit = Math.max(w, h) / 60;
  const shown = devices.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  return (
    <figure className="plan">
      <svg viewBox={vb} role="img" aria-label={`${label}: outline ${w.toFixed(1)} by ${h.toFixed(1)} metres with ${shown.length} devices`} preserveAspectRatio="xMidYMid meet">
        <polygon points={points.map((p) => p.join(',')).join(' ')} className="plan__room" strokeWidth={unit * 0.4} />
        {shown.map((d) => (
          <g key={d.id} transform={`translate(${d.x} ${d.y})`}>
            <title>{`${d.id} ${d.label} (${d.cat}) at ${d.x.toFixed(1)}, ${d.y.toFixed(1)} m${d.furniture ? ' — furniture' : ''}`}</title>
            {d.furniture ? <rect x={-unit * 1.2} y={-unit * 1.2} width={unit * 2.4} height={unit * 2.4} className="plan__furn" /> : <circle r={unit * 1.1} className={`plan__dev plan__dev--${d.mount}`} strokeWidth={unit * 0.25} />}
          </g>))}
        <g transform={`translate(${minX} ${maxY + pad * 1.3})`}>
          <line x1={0} y1={0} x2={Math.min(5, w)} y2={0} className="plan__scale" strokeWidth={unit * 0.3} />
          <text x={Math.min(5, w) + unit} y={unit * 1.2} className="plan__text" fontSize={unit * 3.2}>{Math.min(5, w)} m</text>
        </g>
      </svg>
      <figcaption className="ui-meta">{h.toFixed(1)} m long × {w.toFixed(1)} m wide · {shown.filter((d) => !d.furniture).length} devices · ○ wall/floor/table · ◎ ceiling · ▢ furniture</figcaption>
    </figure>
  );
}
