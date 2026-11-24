#!/usr/bin/env node
/**
 * Notes when this machine stops running programs for a while.
 *
 * A timer is set for every half second. When it fires two seconds or more after it was due, nothing on the machine ran this process for
 * that long: the virtual machine was paused, or starved by its host. Each such gap is written as one line to the file named in the first
 * argument. scripts/test.mjs starts this beside a run and reads the file after each suite (24 Nov 2026: three checks that measure time
 * failed across two regressions and passed when run again on the same commit, in the same hour that the session was paused).
 *
 * It measures; it decides nothing. It ends when the program that started it ends (its input closes).
 */
import fs from 'node:fs';
const out = process.argv[2]; const tick = 500; const lateMs = Number(process.argv[3] || 2000);
if (!out) { console.error('usage: stall-watch.mjs <file> [lateMs]'); process.exit(2); }
let due = Date.now() + tick;
setInterval(() => { const now = Date.now(); const late = now - due; if (late >= lateMs) { try { fs.appendFileSync(out, JSON.stringify({ at: now, lateMs: late }) + '\n'); } catch { /* the run's directory is gone: the run is over */ } } due = now + tick; }, tick);
process.stdin.on('end', () => process.exit(0)); process.stdin.on('error', () => process.exit(0)); process.stdin.resume();
