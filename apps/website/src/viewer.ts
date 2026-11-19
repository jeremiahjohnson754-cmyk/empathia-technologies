// FieldLink: turn the concept enclosures (founder 18 Nov 2026 17:25 §10, Version D). Loaded on /fieldlink only. Drag, the arrow keys
// on the drawing, or the buttons turn it; the three device buttons pick the enclosure; Reset returns to the first pose. Nothing moves
// on its own. The geometry and its limits are in fieldlink-geom.ts.
import { SOLIDS, POSE, project, fillOf } from './fieldlink-geom.js';
const root = document.querySelector<HTMLElement>('[data-turn]');
if (root) {
  const svg = root.querySelector<SVGSVGElement>('svg')!; const g = svg.querySelector('g')!; const NS = 'http://www.w3.org/2000/svg';
  const env = root.querySelector('[data-turn-env]')!; const said = root.querySelector('[data-turn-said]')!;
  let id = 'edge', yaw = POSE.yaw, pitch = POSE.pitch;
  const draw = () => {
    const s = SOLIDS.find((x) => x.id === id)!; g.replaceChildren(...project(s, yaw, pitch).map((f) => { const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', f.pts); p.setAttribute('fill', fillOf(f.shade)); return p; }));
    svg.setAttribute('aria-label', `${s.name}, concept enclosure, turned ${Math.round(((yaw * 180) / Math.PI + 360) % 360)} degrees and tilted ${Math.round((pitch * 180) / Math.PI)} degrees`);
    env.textContent = `${s.name}: ${s.envelope}`;
  };
  const turn = (dy: number, dp: number) => { yaw += dy; pitch = Math.max(0.15, Math.min(1.45, pitch + dp)); draw(); };
  root.querySelectorAll<HTMLButtonElement>('[data-turn-dev]').forEach((b) => b.addEventListener('click', () => { id = b.dataset.turnDev!; root.querySelectorAll('[data-turn-dev]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); said.textContent = `Showing ${b.textContent}.`; }));
  const acts: Record<string, [number, number]> = { left: [-0.3, 0], right: [0.3, 0], up: [0, -0.15], down: [0, 0.15] };
  root.querySelectorAll<HTMLButtonElement>('[data-turn-act]').forEach((b) => b.addEventListener('click', () => { const a = b.dataset.turnAct!; if (a === 'reset') { yaw = POSE.yaw; pitch = POSE.pitch; draw(); } else turn(...acts[a]!); }));
  svg.addEventListener('keydown', (e) => { const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (k) { e.preventDefault(); turn(...acts[k]!); } });
  let drag: { x: number; y: number } | null = null;
  svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => { if (!drag) return; turn((e.clientX - drag.x) * 0.012, (e.clientY - drag.y) * 0.008); drag = { x: e.clientX, y: e.clientY }; });
  const end = () => { drag = null; }; svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  root.querySelector<HTMLElement>('[data-turn-controls]')!.hidden = false; draw();
}
