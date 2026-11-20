/**
 * The nine Empathia products — ONE list every surface reads (website, investor demo, enterprise app). Order is canonical (D37, kept on
 * every surface by D40); the colour of each is its --p-<id> token (packages/design-tokens/tokens.json → product, same ids, same order).
 * `apps` are the named applications a product owns; Scouter lives inside Lite and stays easy to find there (D41).
 * Drift is caught by packages/ui/test/products.test.mjs (against the tokens) and by each surface's own suite (checkProductOrder).
 * No imports: this file runs as-is under Node's type stripping and in every bundler.
 */
export type ProductId = 'mission-control' | 'lite' | 'pro' | 'search-party' | 'servicehands' | 'commissioning' | 'apex' | 'field' | 'learn';

export interface ProductApp {
  name: string;
  purpose: string;
  /** the product that owns this app */
  product: ProductId;
  /** shown by name wherever its product is listed (D41: Scouter) */
  featured?: boolean;
}

export interface Product {
  id: ProductId;
  /** the product's name, the same on every surface */
  name: string;
  /** 1-based position in the canonical order (D37) */
  order: number;
  /** one line on what it does (menus, rails, tooltips, product pages) */
  purpose: string;
  /** the colour token, e.g. "--p-lite", and a ready CSS value, e.g. "var(--p-lite)" */
  colorVar: `--p-${ProductId}`;
  color: `var(--p-${ProductId})`;
  /** text/icon colour on a fill of the product colour */
  inkVar: `--p-${ProductId}-ink`;
  /** the applications the product owns */
  apps: ProductApp[];
}

const def = (order: number, id: ProductId, name: string, purpose: string, apps: Omit<ProductApp, 'product'>[] = []): Product => ({
  id, name, order, purpose, colorVar: `--p-${id}`, color: `var(--p-${id})`, inkVar: `--p-${id}-ink`, apps: apps.map((a) => ({ ...a, product: id })),
});

export const PRODUCTS: readonly Product[] = Object.freeze([
  def(1, 'mission-control', 'Mission Control', 'What changed, what matters and what needs action, across every product', [
    { name: 'Executive intelligence', purpose: 'Every measure with its numerator, denominator, window, coverage and freshness' },
  ]),
  def(2, 'lite', 'Lite', 'Spatial room design on the real engine, with equipment proposals from comparable rooms', [
    { name: 'Build a Room', purpose: 'A room model from an archetype, dimensions, plans and photos, each with its provenance', featured: true },
    { name: 'Scouter', purpose: 'Equipment proposals from comparable rooms, reviewed by the discipline engineer', featured: true },
  ]),
  def(3, 'pro', 'Pro', 'Operational intelligence: portfolio, projects and service performance'),
  def(4, 'search-party', 'Search Party', 'Universal search and the relationships between rooms, devices, people and projects'),
  def(5, 'servicehands', 'ServiceHands', 'Work orders closed with field evidence and a verified retest'),
  def(6, 'commissioning', 'Commissioning & Assurance', 'Adaptive test plans, evidence, independent verification, accepted baselines and drift', [
    { name: 'Universal Commissioning', purpose: 'Adaptive test plans with the reason for every test, and independent verification' },
    { name: 'Assurance', purpose: 'Accepted baselines and drift read against them' },
  ]),
  def(7, 'apex', 'APEX', 'Diagnosis with its evidence: cited layers, ranked hypotheses, bounded action'),
  def(8, 'field', 'Field Intelligence', 'What a collector declares, what a check observes, what is verified'),
  def(9, 'learn', 'Learn', 'Reviewed cases and training from what actually happened', [
    { name: 'SIGNAL', purpose: 'The story and labs that link lessons to competencies; training never grants authority' },
  ]),
]);

export const PRODUCT_IDS: readonly ProductId[] = PRODUCTS.map((p) => p.id);
export const PRODUCT_NAMES: readonly string[] = PRODUCTS.map((p) => p.name);
/** every app with the product that owns it */
export const PRODUCT_APPS: readonly ProductApp[] = PRODUCTS.flatMap((p) => p.apps);

export const productById = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id);
/** the product that owns an app (by app name, case-insensitive), e.g. productOfApp('Scouter')?.id === 'lite' */
export const productOfApp = (app: string): Product | undefined => { const a = PRODUCT_APPS.find((x) => x.name.toLowerCase() === app.trim().toLowerCase()); return a && productById(a.product); };

/**
 * A surface's suite passes the product names it shows, in the order shown (extra non-product entries such as the demo's
 * "Investor start" or the enterprise app's "Administration" are ignored). Returns [] when names and order match the canonical list,
 * otherwise one message per problem.
 */
export function checkProductOrder(shown: readonly string[], opts: { requireAll?: boolean } = {}): string[] {
  const problems: string[] = [];
  const known = shown.filter((n) => PRODUCT_NAMES.includes(n));
  const seen = new Set<string>();
  for (const n of known) { if (seen.has(n)) problems.push(`"${n}" is shown twice`); seen.add(n); }
  const expected = PRODUCT_NAMES.filter((n) => seen.has(n));
  const actual = known.filter((n, i) => known.indexOf(n) === i);
  if (expected.join('|') !== actual.join('|')) problems.push(`order is ${actual.join(' · ')}; canonical (D37) is ${expected.join(' · ')}`);
  if (opts.requireAll !== false) for (const n of PRODUCT_NAMES) if (!seen.has(n)) problems.push(`"${n}" is missing`);
  return problems;
}
