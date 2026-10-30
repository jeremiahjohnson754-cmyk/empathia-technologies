/** OpenAPI 3.1 generated from the route table: every endpoint documented, every documented endpoint real. */
import { enforcedAuthorities } from './http/router.js';
import type { Router } from './http/router.js';
import type { Schema } from './http/schema.js';

const toOas = (s: Schema): Record<string, unknown> => {
  const o: Record<string, unknown> = {};
  if (s.type) o['type'] = s.nullable ? [s.type, 'null'] : s.type;
  for (const k of ['enum', 'minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'pattern', 'format', 'description', 'example', 'additionalProperties', 'required'] as const) if (s[k] !== undefined) o[k] = s[k];
  if (s.properties) o['properties'] = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toOas(v)]));
  if (s.items) o['items'] = toOas(s.items);
  return o;
};

export function openapi(r: Router): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const x of r.routes) {
    const p = x.path.replace(/:([A-Za-z]+)/g, '{$1}');
    const params = [...x.path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({ name: m[1], in: 'path', required: true, schema: { type: 'string' } }))
      .concat(Object.entries(x.query || {}).map(([k, s]) => ({ name: k, in: 'query', required: false, schema: toOas(s) as never })))
      .concat(x.idempotent ? [{ name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', minLength: 8, maxLength: 128 } as never }] : []);
    (paths[p] ||= {})[x.method.toLowerCase()] = {
      tags: [x.tag], summary: x.summary, operationId: `${x.method.toLowerCase()}${x.path.replace(/[/:{}-]+(.)/g, (_m, c: string) => c.toUpperCase())}`,
      ...(x.authority ? { 'x-authority': x.authority, 'x-authority-enforced': enforcedAuthorities(x) } : {}),
      security: x.auth ? [{ bearer: [] }] : [],
      parameters: params,
      ...(x.body ? { requestBody: { required: true, content: { 'application/json': { schema: toOas(x.body) } } } } : x.bodyKind === 'binary' ? { requestBody: { required: true, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } } } : {}),
      responses: Object.fromEntries(Object.entries(x.responses).map(([code, v]) => [code, { description: v.description, ...(Number(code) >= 400 ? { content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } } } : v.schema ? { content: { 'application/json': { schema: toOas(v.schema) } } } : {}) }])),
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Empathia Enterprise API (production starter)', version: '0.1.0', description: 'Server-side authority for the Build a Room vertical slice. Synthetic data only. Not production-ready: see docs/operations/PRODUCTION_READINESS_CHECKLIST.md.' },
    servers: [{ url: 'http://127.0.0.1:4100', description: 'local development' }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: { Problem: { type: 'object', required: ['type', 'title', 'status', 'detail', 'code', 'correlationId'], properties: { type: { type: 'string' }, title: { type: 'string' }, status: { type: 'integer' }, detail: { type: 'string' }, code: { type: 'string' }, reasons: { type: 'array', items: { type: 'string' } }, correlationId: { type: 'string' } } } },
    },
    paths,
  };
}
