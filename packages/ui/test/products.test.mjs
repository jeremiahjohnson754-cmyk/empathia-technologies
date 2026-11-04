// The canonical product list (packages/ui/src/products.ts) against the tokens and the decisions; ui.css against the tokens.
//   node --test packages/ui/test/*.test.mjs      (Node ≥ 22.18 runs the .ts directly by type stripping)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, PRODUCT_NAMES, PRODUCT_APPS, productById, productOfApp, checkProductOrder } from '../src/products.ts';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = JSON.parse(fs.readFileSync(path.join(repo, 'packages/design-tokens/tokens.json'), 'utf8'));
const tokenProducts = Object.entries(T.product).filter(([k]) => !k.startsWith('$'));
const D37 = ['Mission Control', 'Lite', 'Pro', 'Search Party', 'ServiceHands', 'Commissioning & Assurance', 'APEX', 'Field Intelligence', 'Learn'];

test('nine products in the D37 order, numbered 1–9', () => {
  assert.deepEqual([...PRODUCT_NAMES], D37);
  assert.deepEqual(PRODUCTS.map((p) => p.order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('no drift from the tokens: same ids, names and order; each colour token exists', () => {
  assert.deepEqual(PRODUCTS.map((p) => p.id), tokenProducts.map(([id]) => id));
  assert.deepEqual(PRODUCTS.map((p) => p.name), tokenProducts.map(([, v]) => v.name));
  for (const p of PRODUCTS) {
    assert.equal(p.colorVar, `--p-${p.id}`); assert.equal(p.color, `var(--p-${p.id})`); assert.equal(p.inkVar, `--p-${p.id}-ink`);
    assert.ok(T.product[p.id].dark && T.product[p.id].light, `token for ${p.id}`);
  }
});

test('every product has a one-line purpose (no full stop, ≤ 110 characters) and is frozen', () => {
  for (const p of PRODUCTS) assert.ok(p.purpose.length > 20 && p.purpose.length <= 110 && !/[.]$/.test(p.purpose) && !p.purpose.includes('\n'), p.name);
  assert.ok(Object.isFrozen(PRODUCTS));
});

test('D41: Scouter is owned by Lite and featured there; every app names its owning product', () => {
  assert.equal(productOfApp('Scouter')?.id, 'lite');
  assert.equal(productOfApp(' scouter ')?.name, 'Lite');
  assert.ok(productById('lite').apps.find((a) => a.name === 'Scouter')?.featured);
  for (const a of PRODUCT_APPS) assert.ok(productById(a.product)?.apps.includes(a), a.name);
  assert.equal(productOfApp('Nope'), undefined);
});

test('checkProductOrder: surfaces may add their own entries, but names and order must match', () => {
  assert.deepEqual(checkProductOrder(['Investor start', ...D37, 'Administration']), []);
  assert.equal(checkProductOrder(['Mission Control', 'Pro', 'APEX', 'ServiceHands', 'Lite', 'Search Party', 'Commissioning & Assurance', 'Field Intelligence', 'Learn']).length, 1);
  assert.match(checkProductOrder(D37.slice(1)).join(), /"Mission Control" is missing/);
  assert.deepEqual(checkProductOrder(['Lite', 'APEX'], { requireAll: false }), []);
  assert.match(checkProductOrder([...D37, 'Lite']).join(), /twice/);
});

test('ui.css: on the tokens — no literal colours outside comments; the primary hover keeps its fill; a class per product', () => {
  const css = fs.readFileSync(path.join(repo, 'packages/ui/src/ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(css.match(/#[0-9a-f]{3,8}\b/gi) || [], [], 'hex colours belong in tokens.json');
  assert.match(css, /\.ui-btn--primary:hover:not\(:disabled\) \{ background: var\(--accent\); border-color: var\(--accent\); filter: brightness\(1\.08\); \}/);
  assert.match(css, /\.ui-btn--primary \{[^}]*color: var\(--accent-ink\)/);
  for (const p of PRODUCTS) assert.ok(css.includes(`.ui-p--${p.id} { --p: var(${p.colorVar});`), p.id);
  // every var() is declared by the built tokens (or by ui.css itself)
  const built = path.join(repo, 'packages/design-tokens/dist/tokens.css');
  if (!fs.existsSync(built)) return;   // tokens not built: the tokens' own suite reports that
  const defined = new Set((fs.readFileSync(built, 'utf8').match(/--[a-z0-9-]+(?=:)/g) || []).map((v) => v.slice(2)));
  const local = new Set(['tone', 'p', 'p-ink']);
  for (const u of new Set((css.match(/var\(--[a-z0-9-]+/g) || []).map((v) => v.slice(6)))) assert.ok(local.has(u) || defined.has(u), `--${u} is not a token`);
});
