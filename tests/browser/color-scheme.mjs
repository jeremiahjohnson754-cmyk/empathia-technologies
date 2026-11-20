// Run any browser suite under a forced system colour scheme, without editing the suite:
//
//   PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs tests/browser/<suite>.test.mjs
//
// PW_COLOR_SCHEME = dark | light | no-preference (unset: this module does nothing). Every Playwright browser this process launches gets
// that scheme as the default for browser.newContext(), browser.newPage() and launchPersistentContext(); a suite that sets colorScheme
// itself (for example a test of "Light chosen on a dark device") keeps its own value. The scheme is the *system* preference: the
// surfaces' System/Light/Dark choice (localStorage "empathia.theme") still wins over it, as D9 requires.
// Works whether the suite imports node_modules/playwright/index.mjs or require('playwright'): both resolve to the one CommonJS module.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scheme = process.env.PW_COLOR_SCHEME;
const ALLOWED = ['dark', 'light', 'no-preference'];
if (scheme && !ALLOWED.includes(scheme)) throw new Error(`PW_COLOR_SCHEME must be one of ${ALLOWED.join(', ')} (got "${scheme}")`);

if (scheme) {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const candidates = [path.join(repo, 'node_modules/playwright'), '/opt/npm-tools/node_modules/playwright', '/home/claude/.npm-global/lib/node_modules/playwright'];
  const where = candidates.find((p) => fs.existsSync(path.join(p, 'package.json')));
  if (!where) throw new Error('color-scheme.mjs: playwright not found (node scripts/bootstrap.mjs)');
  const require = createRequire(path.join(fs.realpathSync(where), 'package.json'));
  const pw = require(fs.realpathSync(where));
  const withScheme = (opts) => ({ colorScheme: scheme, ...(opts || {}) });
  const patchBrowser = (browser) => {
    if (!browser || browser.__empathiaScheme) return browser;
    const newContext = browser.newContext.bind(browser); const newPage = browser.newPage.bind(browser);
    browser.newContext = (opts) => newContext(withScheme(opts));
    browser.newPage = (opts) => newPage(withScheme(opts));
    browser.__empathiaScheme = scheme;
    return browser;
  };
  for (const name of ['chromium', 'firefox', 'webkit']) {
    const type = pw[name]; if (!type || type.__empathiaScheme) continue;
    const launch = type.launch.bind(type); const connect = type.connect?.bind(type); const persistent = type.launchPersistentContext.bind(type);
    type.launch = async (...a) => patchBrowser(await launch(...a));
    if (connect) type.connect = async (...a) => patchBrowser(await connect(...a));
    type.launchPersistentContext = (dir, opts) => persistent(dir, withScheme(opts));
    type.__empathiaScheme = scheme;
  }
  process.env.EMPATHIA_FORCED_COLOR_SCHEME = scheme;
  console.log(`# color-scheme: Playwright contexts default to prefers-color-scheme: ${scheme}`);
}
