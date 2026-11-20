/** Shapes of the generated price list and connector catalogue (src/generated/*). */
export interface Sku { sku: string; name: string; family: string; billingUnit: string; /** the source's own text, e.g. "1099.99" */ price: string; cents: number; scope: string }
export interface Bundle { id: string; name: string; /** the source's own text, e.g. "5%" */ discount: string; discountPct: number; skus: string[]; summary: string; rule: string }
export type PilotSku = 'PILOT-DISCOVERY' | 'PILOT-READONLY' | 'PILOT-HARDWARE' | 'PILOT-CAMPUS';
export interface Pilot { sku: PilotSku; name: string; price: string; cents: number; duration: string; days: number; scope: string; caveat: string }
export interface SignalTerm { sku: string; term: string; months: number; amount: string; cents: number; monthly: string; savingPct: string; unit: string }
export type ConnectionModel = 'CLOUD_API' | 'EDGE_BRIDGE' | 'BOTH';
export interface CatalogueConnector { key: string; category: string; vendor: string; product: string; model: ConnectionModel; catalogStatus: string; sandbox: boolean; live: boolean; implementation: string; proof: string }
