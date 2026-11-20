/**
 * The route table: method + path pattern → handler, with its contract (auth, authority, schemas, responses). The same table
 * produces the OpenAPI document (openapi.ts), so every documented endpoint exists and every endpoint is documented.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Schema } from './schema.js';
import type { RequestContext } from '../auth/context.js';

export interface Route {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;                                   // '/v1/rooms/:roomId'
  tag: string;
  summary: string;
  auth: boolean;                                  // false only for /health, /v1/auth/token and /v1/openapi.json
  authority?: string | string[];                  // authority keys (a.b.c) are enforced centrally by the server before the body is read; prose describes a finer rule the handler enforces
  action?: string;                                // the words of the central authority refusal ('<role> may not <action> (needs …)'); default: the summary's first clause
  body?: Schema;
  bodyKind?: 'json' | 'binary';
  query?: Record<string, Schema>;
  idempotent?: boolean;                           // POST honours Idempotency-Key
  responses: Record<number, { description: string; schema?: Schema }>;
  handler: (ctx: RequestContext, req: Req) => Promise<Res>;
}

export interface Req {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  raw: Buffer | null;
  headers: IncomingMessage['headers'];
}
/** The authority keys of a route that the server enforces centrally (prose entries are documentation of a handler-enforced rule). */
export const enforcedAuthorities = (r: Route): string[] => (Array.isArray(r.authority) ? r.authority : r.authority ? [r.authority] : []).filter((k) => /^[a-z_][a-z0-9_.]*$/.test(k));
export interface Res { status: number; body?: unknown; headers?: Record<string, string>; raw?: Buffer }

export class Router {
  readonly routes: Route[] = [];
  add(r: Route): this { this.routes.push(r); return this; }
  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | { allowed: string[] } | null {
    const allowed: string[] = [];
    for (const r of this.routes) {
      const ps = r.path.split('/'); const xs = pathname.split('/');
      if (ps.length !== xs.length) continue;
      const params: Record<string, string> = {}; let ok = true;
      for (let i = 0; i < ps.length; i += 1) {
        const p = ps[i]!; const x = xs[i]!;
        if (p.startsWith(':')) { if (!x) { ok = false; break; } try { params[p.slice(1)] = decodeURIComponent(x); } catch { ok = false; break; } } else if (p !== x) { ok = false; break; }
      }
      if (!ok) continue;
      if (r.method === method) return { route: r, params };
      allowed.push(r.method);
    }
    return allowed.length ? { allowed } : null;
  }
}

export type { ServerResponse };
