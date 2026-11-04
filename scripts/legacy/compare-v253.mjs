// Side-by-side capture: V2.5.3 offline (network fully blocked; the file is only rendered, never trusted) vs. the current demo.
//   node scripts/legacy/compare-v253.mjs <outdir> legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html http://127.0.0.1:<port>/ [routes,comma,separated]
import { chromium } from 'playwright';
import path from 'node:path';
const [out, legacy, demoUrl] = process.argv.slice(2);
const routes = (process.argv[5] || '#/investor,#/home,#/campus,#/room,#/search,#/servicehands,#/v25/exec,#/learn,#/pro,#/lite,#/assurance,#/commissioning,#/v25/build,#/v25').split(',');
const b = await chromium.launch();
async function shoot(label, base, block) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  if (block) { await ctx.setOffline(true); await ctx.route('**/*', (r) => /^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()); }
  const p = await ctx.newPage(); await p.goto(base, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
  for (const r of routes) { try { await p.evaluate((x) => { location.hash = x; }, r); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, `${label}-${r.replace(/[^a-z0-9]+/gi,'_')}.png`) }); } catch (e) { console.log(label, r, e.message.slice(0,80)); } }
  await ctx.close();
}
await shoot('v253', 'file://' + path.resolve(legacy), true);
await shoot('now', demoUrl, false);
await b.close();
