// Load a TypeScript module of the investor demo in Node for a unit test: esbuild bundles it (with the engines it imports, from their
// built dist) into a temporary ES module, which is imported and returned. The demo's sources are browser code with `.js` import
// specifiers and JSON import attributes, which Node cannot run directly; the bundle is exactly what the page runs, minus React.
//   const M = await load('src/story/assemble.ts');
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(app, '../..');
const esbuild = await import(pathToFileURL(path.join(repo, 'node_modules/esbuild/lib/main.js')).href);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empathia-demo-unit-'));
process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp dir already gone */ } });
let n = 0;
/** Bundle one or more entry modules (paths relative to apps/demo) into one ES module that re-exports each under its path, e.g.
 *  'src/build/store.ts' → `build_store`. */
export const nameOf = (e) => e.replace(/^src\//, '').replace(/\.[jt]sx?$/, '').replace(/[^a-z0-9]/gi, '_');
export async function load(...entries) {
  const src = entries.map((e) => `export * as ${nameOf(e)} from ${JSON.stringify(path.join(app, e))};`).join('\n');
  const out = path.join(dir, `bundle-${++n}.mjs`);
  await esbuild.build({ stdin: { contents: src, resolveDir: app, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', target: ['node22'], outfile: out, logLevel: 'error', alias: { '@empathia/ui': path.join(repo, 'packages/ui/src/index.ts') } });
  return import(pathToFileURL(out).href);
}
