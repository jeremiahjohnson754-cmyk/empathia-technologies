/**
 * The moves a drag makes, without dragging (founder, 20 Nov 2026 05:34, of Expo LIVE: "Hard to move around"; WCAG 2.2 2.5.7 Dragging
 * Movements: what a drag does can also be done with a single pointer and no drag). Four buttons on the picture — turn left, turn right,
 * nearer, farther — and the same moves from the keyboard once the picture has focus: the arrow keys turn and tilt, + and − come nearer and
 * go farther, Shift with the arrows moves along (where the picture can move along). Each press is one step; nothing animates on its own.
 */
import { useEffect, type RefObject } from 'react';

export interface Moves { turn(da: number): void; tilt?(dp: number): void; zoom(f: number): void; pan?(dx: number, dy: number): void }

export function MovePad({ moves, what, prefix }: { moves: Moves; what: string; prefix: string }) {
  return (
    <div className="mvpad" role="group" aria-label={`Move the view of the ${what}`} data-testid={`${prefix}-pad`}>
      <button type="button" aria-label="Turn left" title="Turn left" onClick={() => moves.turn(0.35)} data-testid={`${prefix}-left`}><span aria-hidden="true">⟲</span></button>
      <button type="button" aria-label="Turn right" title="Turn right" onClick={() => moves.turn(-0.35)} data-testid={`${prefix}-right`}><span aria-hidden="true">⟳</span></button>
      <button type="button" aria-label="Come nearer" title="Nearer" onClick={() => moves.zoom(0.75)} data-testid={`${prefix}-in`}><span aria-hidden="true">+</span></button>
      <button type="button" aria-label="Go farther" title="Farther" onClick={() => moves.zoom(1 / 0.75)} data-testid={`${prefix}-out`}><span aria-hidden="true">−</span></button>
    </div>
  );
}

/** The same moves from the keyboard on the picture (a canvas with tabIndex 0). */
export function useMoveKeys(ref: RefObject<HTMLElement | null>, moves: Moves) {
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const k = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return; let done = true;
      if (e.shiftKey && moves.pan && e.key.startsWith('Arrow')) moves.pan(e.key === 'ArrowLeft' ? 60 : e.key === 'ArrowRight' ? -60 : 0, e.key === 'ArrowUp' ? 60 : e.key === 'ArrowDown' ? -60 : 0);
      else if (e.key === 'ArrowLeft') moves.turn(0.15); else if (e.key === 'ArrowRight') moves.turn(-0.15);
      else if (e.key === 'ArrowUp' && moves.tilt) moves.tilt(0.08); else if (e.key === 'ArrowDown' && moves.tilt) moves.tilt(-0.08);
      else if (e.key === '+' || e.key === '=') moves.zoom(0.85); else if (e.key === '-' || e.key === '_') moves.zoom(1 / 0.85);
      else done = false;
      if (done) e.preventDefault();
    };
    el.addEventListener('keydown', k); return () => el.removeEventListener('keydown', k);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
}
