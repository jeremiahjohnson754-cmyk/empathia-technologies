#!/usr/bin/env node
/**
 * Apply render.yaml's static-site headers and redirect routes to a Render static site that the Blueprint does not manage (assessment
 * SA-01): empathia-website-next and empathia-demo-next were created through the API, so render.yaml's `headers:` and `routes:` never
 * reached them. Dry run by default (prints what is missing); --apply sends it. The key is read from RENDER_API_KEY and never printed.
 *   node scripts/security/render-headers.mjs                       dry run for both -next sites
 *   RENDER_API_KEY=… node scripts/security/render-headers.mjs --apply
 *   node scripts/security/render-headers.mjs --print               only print the parsed configuration (no network)
 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGETS = { 'empathia-website-next': 'empathia-website', 'empathia-demo-next': 'empathia-demo' };   // API-created site → Blueprint service

/** render.yaml's services with their headers and redirect routes (a minimal reader for exactly these fields; no YAML dependency). */
export function parseBlueprint(text) {
  const out = {}; let cur = null; let item = null; let block = null;
  for (const raw of text.split('\n')) {
    const l = raw.replace(/\s+#.*$/, ''); let m;
    if ((m = /^ {4}name: (.+)$/.exec(l))) { cur = out[m[1].trim()] = { headers: [], routes: [] }; block = null; continue; }
    if (!cur) continue;
    if (/^ {4}headers:\s*$/.test(l)) { block = 'headers'; continue; }
    if (/^ {4}routes:\s*$/.test(l)) { block = 'routes'; continue; }
    if (/^ {4}\S/.test(l)) { block = null; continue; }
    if (!block) continue;
    if ((m = /^ {6}- (\w+): (.+)$/.exec(l))) { item = { [m[1]]: unq(m[2]) }; cur[block].push(item); continue; }
    if (item && (m = /^ {8}(\w+): (.+)$/.exec(l))) item[m[1]] = unq(m[2]);
  }
  return out;
}
const unq = (v) => v.trim().replace(/^"(.*)"$/, '$1');

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const bp = parseBlueprint(fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8'));
  if (process.argv.includes('--print')) { console.log(JSON.stringify(Object.fromEntries(Object.entries(TARGETS).map(([t, s]) => [t, bp[s]])), null, 1)); process.exit(0); }
  const key = process.env.RENDER_API_KEY; if (!key) { console.error('RENDER_API_KEY is not set (it is read from the environment only, never from a file or the command line)'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  const api = async (method, p, body) => { const r = await fetch(`https://api.render.com/v1${p}`, { method, headers: { authorization: `Bearer ${key}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); if (!r.ok) throw new Error(`${method} ${p}: HTTP ${r.status}`); return r.status === 204 ? null : r.json(); };
  const items = (j) => (Array.isArray(j) ? j : []).map((x) => x.header || x.route || x);
  for (const [target, source] of Object.entries(TARGETS)) {
    const svc = items(await api('GET', `/services?name=${encodeURIComponent(target)}&limit=5`)).find((s) => s.name === target);
    if (!svc) { console.log(`${target}: not found`); continue; }
    const have = items(await api('GET', `/services/${svc.id}/headers?limit=100`)); const haveR = items(await api('GET', `/services/${svc.id}/routes?limit=100`));
    for (const h of bp[source].headers) {
      const ex = have.find((x) => x.path === h.path && x.name.toLowerCase() === h.name.toLowerCase());
      if (ex && ex.value === h.value) continue;
      console.log(`${target}: ${ex ? 'replace' : 'add'} header ${h.name} on ${h.path}`);
      if (apply) { if (ex) await api('DELETE', `/services/${svc.id}/headers/${ex.id}`); await api('POST', `/services/${svc.id}/headers`, { path: h.path, name: h.name, value: h.value }); }
    }
    for (const r of bp[source].routes) {
      if (haveR.some((x) => x.type === r.type && x.source === r.source && x.destination === r.destination)) continue;
      console.log(`${target}: add ${r.type} ${r.source} → ${r.destination}`);
      if (apply) await api('POST', `/services/${svc.id}/routes`, { type: r.type, source: r.source, destination: r.destination });
    }
  }
  console.log(apply ? 'applied (Render serves new headers after the next deploy or within minutes)' : 'dry run: pass --apply to send');
}
