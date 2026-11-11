/**
 * Where the event day is kept: one record in this browser, read and written by every page of the event (the game-day page and the
 * incident page under it). There is one state, so a step taken on the incident page is what the game-day page shows on return.
 * Synthetic; nothing leaves the browser.
 */
import { PHASES, start, type GameDay } from './engine.js';

export const KEY = 'empathia.demo.gameday.v1';
export const load = (): GameDay => { try { const g = JSON.parse(localStorage.getItem(KEY) || 'null') as GameDay | null; if (g && (PHASES as readonly string[]).includes(g.phase) && Array.isArray(g.incidents)) return g; } catch { /* a blocked or corrupted store starts a fresh day */ } return start(); };
export const keep = (g: GameDay) => { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* the day still runs without storage */ } };
