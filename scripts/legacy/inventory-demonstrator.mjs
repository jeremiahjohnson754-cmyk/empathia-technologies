#!/usr/bin/env node
// Inventory of a Living Campus demonstrator from its modular source (the committed src/ of the release that built the HTML), for the
// legacy parity ledger. Reads the registries the product itself routes, labels and guards by, so the inventory is what the page does,
// not a pattern guess over minified text:
//   areas       AZ_AREA (every address family, its label and the roles that may view it) + the V2.5 areas (V25_AREA_OF)
//   v25 pages   V25_SEGS (key, label, description, icon, stage) and the pages added by later modules
//   navigation  TABS (bottom navigation), NAV_GROUPS (the More menu), AU_PAGES (search destinations), TOURS (guided experiences)
//   identity    AZ_KEYS (14 UI roles), V25_PERSONAS (22 personas), V25_TYPES (V2.5 record types), V25_EVENTS (event catalog),
//               V25_DESIGN state machines (entity → states/transitions)
//   modules     every src module with its first-line description and byte size; test suites; literal data-act names
//   usage: node scripts/legacy/inventory-demonstrator.mjs <src dir> <out.json> [--label=2.5.3]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const [srcDir, outFile] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opts = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
if (!srcDir || !outFile) { console.error('usage: inventory-demonstrator.mjs <src dir> <out.json> [--label=x]'); process.exit(2); }
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const text = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(srcDir, f), 'utf8')]));
const all = files.map((f) => text[f]).join('\n');
const block = (src, head) => { const i = src.indexOf(head); if (i < 0) return null; let depth = 0, j = src.indexOf('{', i) >= 0 && src.indexOf('[', i) >= 0 ? Math.min(src.indexOf('{', i), src.indexOf('[', i)) : Math.max(src.indexOf('{', i), src.indexOf('[', i)); const open = src[j], close = open === '{' ? '}' : ']'; let inStr = null;
  for (let k = j; k < src.length; k += 1) { const c = src[k]; if (inStr) { if (c === '\\') { k += 1; continue; } if (c === inStr) inStr = null; continue; } if (c === "'" || c === '"' || c === '`') { inStr = c; continue; } if (c === open) depth += 1; if (c === close) { depth -= 1; if (!depth) return src.slice(j, k + 1); } } return null; };
// ---- identity and the area table (evaluated in a sandbox with the role groups the source defines)
const authz = text['12-authz.js'];
const ctx = {};
vm.createContext(ctx);
const consts = authz.split('\n').filter((l) => /^const (AZ_KEYS|AZ_ENG|AZ_PLAN|AZ_FIELDWORK|AZ_DELIVERY|AZ_TECH|AZ_STAFF|AZ_DATA|AZ_BROAD|AZ_MONEY|AZ_LEAD) = /.test(l)).join('\n');
const azAnd = (authz.match(/^(?:const azAnd = |function azAnd)[^\n]*\n/m) || [''])[0] || 'const azAnd = (...xs) => [...new Set(xs.flat())];';
vm.runInContext('const uniq = (arr) => [...new Set(arr)];\nconst AZ_ACTION = {};\n' + consts + '\n' + azAnd, ctx);
let areas = {};
try { areas = vm.runInContext('(' + block(authz, 'const AZ_AREA = ') + ')', ctx); } catch (e) { console.error('AZ_AREA eval failed: ' + e.message); }
// V1.4 areas are guarded by AZ_ACTION entries (role lists keyed by action): load those tables first, then the area additions
for (const t of Object.values(text)) for (const m of t.matchAll(/AZ_ACTION(?:\.([A-Za-z_$][\w$]*)|\['([^']+)'\]) = (\[[^\n;]*?\]);/g)) { try { vm.runInContext(`AZ_ACTION[${JSON.stringify(m[1] || m[2])}] = ${m[3]};`, ctx); } catch (e) { /* unevaluable: left out */ } }
for (const t of Object.values(text)) { const i = t.indexOf('Object.assign(AZ_ACTION, '); if (i >= 0) { const b = block(t.slice(i), '{'); try { vm.runInContext(`Object.assign(AZ_ACTION, ${b});`, ctx); } catch (e) { /* left out */ } } }
for (const [f, t] of Object.entries(text)) for (const m of t.matchAll(/AZ_AREA(?:\.([A-Za-z_$][\w$]*)|\['([^']+)'\]) = (\[[^\n]*?\]);/g)) { const k = m[1] || m[2]; try { areas[k] = vm.runInContext('(' + m[3] + ')', ctx); areas[k].push(f); } catch (e) { areas[k] = ['<unevaluated>', m[3].slice(0, 80), f]; } }
const areaTable = Object.entries(areas).map(([k, v]) => ({ area: k, roles: Array.isArray(v[0]) ? v[0] : String(v[0]), label: v[1], addedBy: v[2] || '12-authz.js' }));
const azKeys = vm.runInContext('AZ_KEYS', ctx);
const v25AreaOf = {}; for (const [f, t] of Object.entries(text)) { const b = t.includes('const V25_AREA_OF = ') ? block(t, 'const V25_AREA_OF = ') : null; if (b) Object.assign(v25AreaOf, vm.runInContext('(' + b + ')', vm.createContext({}))); for (const m of t.matchAll(/V25_AREA_OF\.([a-z0-9_]+) = '([^']+)'/g)) v25AreaOf[m[1]] = m[2] + ` (${f})`; }
// ---- V2.5 pages
const segs = []; for (const [f, t] of Object.entries(text)) { const b = t.includes('const V25_SEGS = ') ? block(t, 'const V25_SEGS = ') : null; if (b) { try { for (const s of vm.runInContext('(' + b + ')', vm.createContext({}))) segs.push({ key: s[0], label: s[1], description: s[2], icon: s[3], stage: s[4], module: f }); } catch (e) { console.error('V25_SEGS: ' + e.message); } }
  for (const m of t.matchAll(/V25_SEGS\.push\((\[[^\n]*?\])\)/g)) { try { for (const s of [vm.runInContext('(' + m[1] + ')', vm.createContext({}))].flat(1).filter((x) => Array.isArray(x))) segs.push({ key: s[0], label: s[1], description: s[2], icon: s[3], stage: s[4], module: f }); } catch (e) { segs.push({ key: '<unevaluated>', raw: m[1].slice(0, 100), module: f }); } } }
const personas = (() => { const t = text['v25-01-core.js'] || ''; const b = block(t, 'const V25_PERSONAS = Object.freeze('); try { return Object.fromEntries(Object.entries(vm.runInContext('(' + b + ')', vm.createContext({}))).map(([k, v]) => [k, { label: v.label, base: v.base, home: v.home, authority: v.authority }])); } catch (e) { return { error: e.message }; } })();
const typesM = all.match(/const V25_TYPES = (\[[^\]]*\])/); const v25Types = typesM ? vm.runInContext(typesM[1], vm.createContext({})) : [];
const eventsB = block(text['v25-01-core.js'] || '', 'const V25_EVENTS = Object.freeze('); let v25Events = [];
try { v25Events = Object.keys(vm.runInContext('(' + eventsB + ')', vm.createContext({}))); } catch (e) { v25Events = [...new Set([...all.matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map((m) => m[1]).filter((x) => /^(request|vendor|project|intake|design|drawing|device|standardization|lite|commission|document|final_photos|documentation|handoff|assurance|work_order|field|service|incident|apex|coverage|search_party|security|policy|standard|sop|sow|training|usage|integration|metric|workflow|fipv|room|deficiency|issue|executive|photos|purchase|part|control)\./.test(x)))]; }
const designB = block(text['v25-00-design.js'] || '', 'const V25_DESIGN = Object.freeze('); let machines = {};
try { const d = vm.runInContext('(' + designB + ')', vm.createContext({})); const sm = d.stateMachines && d.stateMachines.machines ? d.stateMachines.machines : {}; for (const [k, v] of Object.entries(sm)) machines[k] = { states: v.states || [], transitions: Array.isArray(v.transitions) ? v.transitions.length : v.transitions ? Object.keys(v.transitions).length : 0 }; machines.__design = { stateMachineVersion: d.stateMachines && d.stateMachines.version, rulePackVersion: d.rulePack && d.rulePack.version, ontologyEdges: (d.ontology || []).length, registryEntities: (d.registry || []).length, measurementFields: ((d.measurement || {}).fields || []).length }; } catch (e) { machines = { error: e.message }; }
// ---- navigation
const evalList = (t, head) => { const b = block(t, head); if (!b) return []; try { return vm.runInContext('(' + b + ')', vm.createContext({ S: { role: 'architect' } })); } catch (e) { return [{ error: e.message }]; } };
const tabs = evalList(text['70-ui-core.js'] || '', 'const TABS = ').map((t) => ({ key: t[0], label: t[1], href: t[3] }));
const navGroups = evalList(text['82-ui-suite.js'] || '', 'const NAV_GROUPS = ').map((g) => ({ group: g[0], items: (g[1] || []).map((it) => ({ key: it[0], label: it[1], description: it[2], href: it[3] })) }));
const auPages = evalList(text['92-search-registry.js'] || '', 'const AU_PAGES = ').map((p) => ({ href: p[0], label: p[1], description: p[2], icon: p[3], keywords: p[4], primary: !!p[5] }));
const toursB = block(text['295-static-v1.js'] || '', 'const TOURS = '); let tours = {}; try { const T = vm.runInContext('(' + toursB + ')', vm.createContext({})); for (const [k, v] of Object.entries(T)) tours[k] = { title: v.title || v.label || k, steps: (v.steps || []).length }; } catch (e) { tours = { error: e.message }; }
for (const [f, t] of Object.entries(text)) for (const m of t.matchAll(/TOURS\.([a-z0-9_]+) = /g)) if (!tours[m[1]]) tours[m[1]] = { title: m[1], steps: null, module: f };
// ---- modules, views, actions, tests
const modules = files.map((f) => ({ module: f, bytes: Buffer.byteLength(text[f]), description: (text[f].split('\n')[0] || '').replace(/^\/\/\s*-*\s*/, '').replace(/^\/\*+\s*/, '').trim().slice(0, 220) }));
const views = [...new Set([...all.matchAll(/P8_VIEWS(?:\.([A-Za-z_$][\w$]*)|\['([^']+)'\]) = /g)].map((m) => m[1] || m[2]))].sort();
const acts = [...new Set([...all.matchAll(/data-act="([a-z0-9_.-]+)"/g)].map((m) => m[1]))].sort();
const testsDir = path.join(srcDir, '..', 'tests'); const tests = fs.existsSync(testsDir) ? fs.readdirSync(testsDir).filter((f) => /\.m?js$/.test(f)).sort() : [];
const out = { label: opts.label || path.basename(path.resolve(srcDir, '..')), source: path.resolve(srcDir), modules: modules.length, bytes: modules.reduce((a, m) => a + m.bytes, 0),
  uiRoles: azKeys, areas: areaTable, v25AreaOf, v25Pages: segs, personas, v25Types, v25Events, stateMachines: machines, tabs, navGroups, searchDestinations: auPages, tours, views, actions: acts.length, actionNames: acts, tests, moduleList: modules };
fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ modules: modules.length, areas: areaTable.length, v25Pages: segs.length, personas: Object.keys(personas).length, types: v25Types.length, events: v25Events.length, machines: Object.keys(machines).length, tabs: tabs.length, navItems: navGroups.reduce((a, g) => a + g.items.length, 0), searchDestinations: auPages.length, tours: Object.keys(tours).length, views: views.length, actions: acts.length, tests: tests.length }));
