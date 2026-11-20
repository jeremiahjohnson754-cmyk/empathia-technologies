/**
 * Keyboard shortcuts for getting to work (founder, 10 November: "navigation buttons and shortcuts and jump-to buttons").
 *
 *   g then a letter   jump to one of the current role's places (campus/rolehome.ts › jumpsFor); g then h is always the start page
 *   ?                 the list of shortcuts
 *   /  or  Ctrl K     search (already handled by the shell's quick find; listed here so the sheet is complete)
 *
 * Single-key shortcuts are a hazard for people who use speech input or who brush keys, so (WCAG 2.1.4) they can be turned off, the
 * choice is kept on this device, and they never fire while typing, with a modifier key held, or while a dialog is open.
 */
export interface Shortcut { keys: string; label: string; href?: string }
const PREF = 'empathia.demo.shortcuts';
export const shortcutsOn = (): boolean => { try { return localStorage.getItem(PREF) !== 'off'; } catch { return true; } };
export const setShortcuts = (on: boolean): void => { try { localStorage.setItem(PREF, on ? 'on' : 'off'); } catch { /* lasts for this visit */ } window.dispatchEvent(new Event('empathia:shortcuts')); };
export const typingIn = (t: EventTarget | null): boolean => { const e = t as HTMLElement | null; return !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)); };
export const G_WAIT_MS = 1500;

export interface Machine { armed: number }
/**
 * The decision for one key press, kept pure so it can be tested without a browser. Returns what to do and the next state.
 * `jumps` maps a letter to an address the role may open.
 */
export function onKey(m: Machine, e: { key: string; ctrl: boolean; meta: boolean; alt: boolean; typing: boolean; dialog: boolean; at: number }, jumps: Record<string, string>, on: boolean): { m: Machine; act: { kind: 'go'; href: string } | { kind: 'help' } | { kind: 'armed' } | null } {
  const idle = { armed: 0 };
  if (e.typing || e.dialog || e.ctrl || e.meta || e.alt) return { m: idle, act: null };
  if (e.key === '?') return { m: idle, act: { kind: 'help' } };   // the list is reachable even when shortcuts are off: it is where they are turned on
  if (!on) return { m: idle, act: null };
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (m.armed && e.at - m.armed <= G_WAIT_MS) {
    if (k === 'h') return { m: idle, act: { kind: 'go', href: '#/home' } };
    const href = jumps[k]; return { m: idle, act: href ? { kind: 'go', href } : null };
  }
  if (k === 'g') return { m: { armed: e.at }, act: { kind: 'armed' } };
  return { m: idle, act: null };
}
