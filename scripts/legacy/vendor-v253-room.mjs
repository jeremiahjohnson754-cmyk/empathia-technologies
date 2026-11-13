#!/usr/bin/env node
// Regenerates apps/demo/src/lite/v253/vendor.js: V2.5.3's own room-interior code (layouts, hero rooms, room shell, objects, the room
// scene and its fill patterns), carried over verbatim from the founder's V2.5.3 offline file.
//
//   node scripts/legacy/vendor-v253-room.mjs [legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html] [--check]
//
// How: the file's largest script is parsed with the TypeScript parser (as text; it is never run). Starting from the room-scene roots,
// every top-level function and constant they reach is collected, except the names V2.5.3 read from its entity store, its view state and its
// reporting engines (STOP): those become the factory's parameters, supplied by v253room.ts from this campus's records. The definitions are
// written in V2.5.3's source order inside `makeV253(shim)`. --check compares with the committed file instead of writing it.
// The legacy HTML is engineer-private and gitignored; this script and its output are what is committed.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import ts from '../../node_modules/typescript/lib/typescript.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2); const check = args.includes('--check');
const src = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) || 'legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html');
const OUT = path.join(ROOT, 'apps/demo/src/lite/v253/vendor.js');
const ROOTS = ['liteRoomScene', 'layoutOf', 'genericLayout', 'HERO_LAYOUT', 'drawRoomShell', 'drawObject', 'l3Scene', 'l3Hit', 'liteLayoutFor', 'liteLayoutNow', 'liteSpec', 'devicesByCat', 'L3_COL', 'OBJ_COL', 'L3_DEFS'];
const STOP = new Set('get,all,LV,S,esc,icon,chip,plural,out1,outs,in1,ins,canViewEntity,canViewRoute,azLens,ROUTE,render,toast,nav,liteRefresh,liteCrumbs,lensBar,liteHead,save,metricsOf,stateOf,DB,newDB,db10,money,moneyRange,fmtDate,fmtHours,fmtMonth,engThread,healthState,scoutState,curSeason,seasonOf,designScoreOf,captureOf,acousticsOf,surfacesOf,stiPath,rtCalibrationOf,userBaselineOf,implementedFor,com6Phase,comBuiltFix,canViewField,plainAside,plainRole,plainSub,subOf,typeLabel,typeFamily,iconFor,gearOf,assuranceOf,OBJECT_CARDS,azFindings,engDesignFor,remedyOf'.split(','));
// the shim's parameters, in the order the committed module declares them (only those the closure reads are kept)
const SHIM = ['LV', 'engDesignFor', 'all', 'S', 'get', 'outs', 'ins', 'gearOf', 'esc', 'chip', 'canViewEntity', 'stateOf', 'plainAside', 'plainRole', 'plainSub', 'subOf', 'iconFor', 'DB', 'metricsOf', 'userBaselineOf', 'implementedFor', 'comBuiltFix', 'out1', 'in1', 'OBJECT_CARDS', 'azFindings', 'canViewField', 'plural', 'assuranceOf', 'nav'];
const RETURNS = ['liteRoomScene', 'liteLayoutFor', 'liteLayoutNow', 'layoutOf', 'genericLayout', 'HERO_LAYOUT', 'drawRoomShell', 'drawObject', 'liteSpec', 'devicesByCat', 'L3_COL', 'OBJ_COL'];

const buf = fs.readFileSync(src); const sha = crypto.createHash('sha256').update(buf).digest('hex'); const html = buf.toString('utf8');
const app = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
const sf = ts.createSourceFile('app.js', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let stmts = sf.statements; const iife = stmts.find((s) => ts.isExpressionStatement(s) && s.getText(sf).length > app.length * 0.5);
if (iife) { let body = null; const f = (n) => { if (!body && (ts.isFunctionExpression(n) || ts.isArrowFunction(n)) && n.getText(sf).length > app.length * 0.5) body = n.body; ts.forEachChild(n, f); }; f(iife); if (body && body.statements) stmts = body.statements; }
const defs = new Map();
for (const st of stmts) {
  if (ts.isFunctionDeclaration(st) && st.name) defs.set(st.name.text, { pos: st.pos, node: st, text: st.getText(sf) });
  else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) defs.set(d.name.text, { pos: d.pos, node: d, text: `${st.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let'} ${d.getText(sf)};` });
}
const refs = (node) => { const out = new Set(); const w = (n) => { if (ts.isIdentifier(n)) out.add(n.text); ts.forEachChild(n, w); }; w(node); return out; };
const got = new Map(); const used = new Set(); const todo = [...ROOTS];
while (todo.length) {
  const n = todo.pop(); if (got.has(n) || STOP.has(n)) continue; const d = defs.get(n); if (!d) throw new Error(`V2.5.3 has no top-level ${n}`);
  got.set(n, d); for (const r of refs(d.node)) { if (STOP.has(r)) used.add(r); else if (defs.has(r) && !got.has(r)) todo.push(r); }
}
const body = [...got.values()].filter((d) => d !== got.get('L3_DEFS')).sort((a, b) => a.pos - b.pos).map((d) => d.text);
const shim = SHIM.filter((k) => used.has(k)); const missing = [...used].filter((k) => !SHIM.includes(k));
if (missing.length) throw new Error(`the closure reads ${missing.join(', ')}: add them to SHIM and to v253room.ts`);
const head = `/* eslint-disable */
// @ts-nocheck
/**
 * V2.5.3 room interiors, carried over verbatim (founder directive 12 Nov 2026: restore the original Lite room interiors; "preserve the
 * original hero-room layouts and custom arrangements. Do not replace them with a uniform generic template").
 * Generated by scripts/legacy/vendor-v253-room.mjs from the founder's V2.5.3 offline file (sha256 ${sha.slice(0, 8)}…): the dependency closure of
 * liteRoomScene, layoutOf, genericLayout, HERO_LAYOUT, drawRoomShell and drawObject, found by walking V2.5.3's own code with the
 * TypeScript parser, emitted in source order inside a factory. Whatever V2.5.3 read from its entity store, its view state (LV, S) and its
 * reporting engines is injected by v253room.ts from this campus model's room records. Do not edit by hand: regenerate.
 */
export function makeV253(shim) {
  let { ${shim.join(', ')} } = shim;
`;
const out = `${head}${body.join('\n')}\n  ${got.get('L3_DEFS').text}\n  return { L3_DEFS, ${RETURNS.join(', ')}, setLV: (v) => { LV = v; }, setS: (v) => { S = v; } };\n}\n`;
if (check) { const now = fs.readFileSync(OUT, 'utf8'); console.log(now === out ? `vendor.js matches V2.5.3 (${got.size} definitions, ${out.length} bytes)` : `vendor.js DIFFERS from the regenerated module (${now.length} vs ${out.length} bytes)`); process.exit(now === out ? 0 : 1); }
fs.writeFileSync(OUT, out); console.log(`wrote ${path.relative(ROOT, OUT)}: ${got.size} definitions, ${out.length} bytes, from ${path.basename(src)} (sha256 ${sha.slice(0, 12)}…)`);
