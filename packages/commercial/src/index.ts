/**
 * @empathia/commercial — the price list, the pilot readiness rules and the pilot activation state machines.
 * The connector catalogue is a separate entry (./generated/connectors, export "./connectors") so a page that only shows prices does not carry it.
 */
export * from './types.js';
export { SKUS, BUNDLES, PILOTS, SIGNAL_TERMS, PRICE_SOURCE } from './generated/catalog.js';
export { usd, unitLabel } from './money.js';
export * from './readiness.js';
export * from './machine.js';
export { quote, type QuoteInput, type QuoteLine, type Quote } from './quote.js';

/** What every price on a public page is: the founder's list price, with purchase not yet open. */
export const PRICE_LABEL = 'Founder-approved list price. Self-serve purchase is not open yet.';
/** The families of the price list in the order the price list gives them. */
import { SKUS } from './generated/catalog.js';
export const FAMILIES: readonly string[] = [...new Set(SKUS.map((s) => s.family))];
/** The maturity of a catalogue entry as the readiness rules read it. Nothing in the catalogue is VERIFIED unless it says it is live. */
import type { CatalogueConnector } from './types.js';
import type { ConnectorChoice } from './readiness.js';
export const choiceOf = (c: CatalogueConnector): ConnectorChoice => ({ key: c.key, label: `${c.vendor} ${c.product}`, model: c.model, maturity: c.live && c.proof !== 'NOT_ASSESSED' ? 'VERIFIED' : 'CATALOGUE_ONLY' });
