/**
 * Two QR codes for every Lite room (founder, 14 Nov 2026): a PUBLIC one for the door, which opens the room in the employee and room-user
 * modes only, and an ENGINEERING one for the rack or the ceiling tile, which opens the engineer mode. A code is only an address: it
 * grants nothing. The engineering code opens engineer mode only for a role that may use it (the router refuses everyone else), and the
 * public code shows no other mode, whoever scans it. Shown to the roles that may use the engineer mode (they place the labels); each code
 * can be saved as a print-ready SVG label.
 */
import { useMemo } from 'react';
import { Card } from '@empathia/ui';
import { qrMatrix, qrPath } from './qr.js';

export const publicCodeFor = (base: string, room: string) => `${base}#/lite/room/${room}?mode=user&qr=public`;
export const engineeringCodeFor = (base: string, room: string) => `${base}#/lite/room/${room}?mode=engineer&qr=eng`;

function labelSvg(text: string, title: string, sub: string): string | null {
  const q = qrMatrix(text); if (!q) return null; const n = q.size + 8; const s = 6; const W = n * s; const H = W + 96;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>`
    + `<g transform="translate(${4 * s},${4 * s}) scale(${s})"><path d="${qrPath(q)}" fill="#000" shape-rendering="crispEdges"/></g>`
    + `<text x="${W / 2}" y="${W + 30}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#000">${esc(title)}</text>`
    + `<text x="${W / 2}" y="${W + 58}" font-family="Helvetica, Arial, sans-serif" font-size="14" text-anchor="middle" fill="#333">${esc(sub)}</text>`
    + `<text x="${W / 2}" y="${W + 82}" font-family="Helvetica, Arial, sans-serif" font-size="11" text-anchor="middle" fill="#666">Empathia demonstration · this code grants no access</text></svg>`;
}
function save(name: string, svg: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function RoomQrCodes({ roomId, name }: { roomId: string; name: string }) {
  const base = typeof location === 'undefined' ? '' : `${location.origin}${location.pathname}`;
  const codes = useMemo(() => [
    { key: 'public', title: 'Public code', who: 'Employees and room users', where: 'On the door and the table card', text: publicCodeFor(base, roomId), opens: 'Opens this room in the employee and room-user modes only; no other mode is offered from it.' },
    { key: 'engineering', title: 'Engineering code', who: 'Authorised engineering personnel', where: 'Inside the rack, on the ceiling tile, at the equipment', text: engineeringCodeFor(base, roomId), opens: 'Opens the engineer mode, and only for a role allowed to use it: anyone else is refused. The code itself grants nothing.' },
  ], [base, roomId]);
  return (
    <Card title="Room QR codes" sub="Two labels per room: one for everyone who uses it, one for engineering" icon="grid" testId="lite-room-qr">
      <div className="lt-qr2">{codes.map((c) => { const q = qrMatrix(c.text); const n = q ? q.size + 8 : 0; return (
        <figure key={c.key} className="lt-qr2__item" data-testid={`lite-qr-${c.key}`} data-text={c.text}>
          {q ? <svg width={148} height={148} viewBox={`-4 -4 ${n} ${n}`} role="img" aria-label={`${c.title} for ${name}`} shapeRendering="crispEdges"><rect x={-4} y={-4} width={n} height={n} fill="#fff" /><path d={qrPath(q)} fill="#000" /></svg> : <p className="ui-meta">The address is too long for a code.</p>}
          <figcaption><b>{c.title}</b> · {c.who}<span className="ui-meta">{c.where}</span><span>{c.opens}</span>
            <button type="button" className="ui-btn" data-testid={`lite-qr-save-${c.key}`} onClick={() => { const svg = labelSvg(c.text, `${c.title}: ${name}`, c.who); if (svg) save(`${roomId}-${c.key}-qr.svg`, svg); }}>Save the label (SVG)</button></figcaption>
        </figure>); })}</div>
      <p className="ui-meta">A QR code is an address, not a key: what it opens depends on who is signed in.</p>
    </Card>
  );
}
