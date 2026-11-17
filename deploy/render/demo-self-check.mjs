#!/usr/bin/env node
/**
 * The deployment check, run from inside the deployed service (deploy/render/demo-start.sh starts it when DEMO_SELF_CHECK=on).
 * Why it exists: the check (scripts/staging/demo-smoke.mjs, SM-01…12) is HTTP only and is meant to be run from outside. Where the
 * machine that would run it cannot reach the service's public address, this runs the same file against the API's own address in the
 * container and writes every line to the service's log, prefixed SELF-CHECK, where it can be read.
 * What it is not: it does not pass through the platform's edge (TLS, the proxy's forwarded address, a browser's cross-origin
 * request). It opens three sandboxes each time, so it is off unless switched on for one deploy.
 */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const base = `http://127.0.0.1:${process.env.PORT || 4100}`;
const say = (s) => process.stdout.write(`SELF-CHECK ${s}\n`);
const origin = String(process.env.CORS_ORIGINS || '').split(',')[0].trim();

let up = false;
for (let i = 0; i < 180 && !up; i++) { try { up = (await fetch(`${base}/health`)).status === 200; } catch { /* not yet */ } if (!up) await new Promise((r) => setTimeout(r, 500)); }
if (!up) { say('NOT RUN: the API did not answer /health on its own address within 90 s'); process.exit(1); }

const args = [path.join(root, 'scripts/staging/demo-smoke.mjs'), base, ...(origin ? [`--origin=${origin}`] : [])];
const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let buf = ''; const flush = (d) => { buf += d; const lines = buf.split('\n'); buf = lines.pop(); for (const l of lines) if (l.trim()) say(l); };
p.stdout.on('data', flush); p.stderr.on('data', flush);
p.on('exit', (code) => { if (buf.trim()) say(buf); say(`finished: exit ${code} (inside the service, against ${base}; not through the public edge)`); process.exit(code || 0); });
