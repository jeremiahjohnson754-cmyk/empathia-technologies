/**
 * A small JSON-Schema subset used for request validation AND for the OpenAPI document, so the contract and the implementation
 * cannot drift apart (the route table is the single source of both). Supports: type, properties, required, items, enum,
 * minLength/maxLength, minimum/maximum, pattern, format (uuid, date-time), additionalProperties: false, nullable.
 */
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: readonly (string | number)[];
  minLength?: number; maxLength?: number; minimum?: number; maximum?: number; minItems?: number; maxItems?: number;
  pattern?: string;
  format?: 'uuid' | 'date-time';
  additionalProperties?: boolean;
  nullable?: boolean;
  description?: string;
  example?: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validate(s: Schema, v: unknown, at = 'body'): string[] {
  const out: string[] = [];
  if (v === null || v === undefined) { if (!s.nullable && v === null) out.push(`${at} must not be null`); return out; }
  switch (s.type) {
    case 'object': {
      if (typeof v !== 'object' || Array.isArray(v)) return [`${at} must be an object`];
      const o = v as Record<string, unknown>;
      for (const k of s.required || []) if (o[k] === undefined) out.push(`${at}.${k} is required`);
      for (const [k, x] of Object.entries(o)) {
        const p = s.properties?.[k];
        if (!p) { if (s.additionalProperties === false) out.push(`${at}.${k} is not a known field`); continue; }
        out.push(...validate(p, x, `${at}.${k}`));
      }
      return out;
    }
    case 'array':
      if (!Array.isArray(v)) return [`${at} must be an array`];
      if (s.minItems != null && v.length < s.minItems) out.push(`${at} needs at least ${s.minItems} items`);
      if (s.maxItems != null && v.length > s.maxItems) out.push(`${at} allows at most ${s.maxItems} items`);
      v.forEach((x, i) => out.push(...(s.items ? validate(s.items, x, `${at}[${i}]`) : [])));
      return out;
    case 'string':
      if (typeof v !== 'string') return [`${at} must be a string`];
      if (s.minLength != null && v.length < s.minLength) out.push(`${at} must be at least ${s.minLength} characters`);
      if (s.maxLength != null && v.length > s.maxLength) out.push(`${at} must be at most ${s.maxLength} characters`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) out.push(`${at} has an invalid format`);
      if (s.format === 'uuid' && !UUID.test(v)) out.push(`${at} must be a UUID`);
      if (s.format === 'date-time' && Number.isNaN(Date.parse(v))) out.push(`${at} must be a date-time`);
      if (s.enum && !s.enum.includes(v)) out.push(`${at} must be one of ${s.enum.join(', ')}`);
      return out;
    case 'integer': case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v) || (s.type === 'integer' && !Number.isInteger(v))) return [`${at} must be ${s.type === 'integer' ? 'an integer' : 'a number'}`];
      if (s.minimum != null && v < s.minimum) out.push(`${at} must be ≥ ${s.minimum}`);
      if (s.maximum != null && v > s.maximum) out.push(`${at} must be ≤ ${s.maximum}`);
      if (s.enum && !s.enum.includes(v)) out.push(`${at} must be one of ${s.enum.join(', ')}`);
      return out;
    case 'boolean':
      return typeof v === 'boolean' ? [] : [`${at} must be true or false`];
    default:
      return out;
  }
}

// shorthands used by the route table
export const str = (o: Partial<Schema> = {}): Schema => ({ type: 'string', ...o });
export const int = (o: Partial<Schema> = {}): Schema => ({ type: 'integer', ...o });
export const num = (o: Partial<Schema> = {}): Schema => ({ type: 'number', ...o });
export const bool = (o: Partial<Schema> = {}): Schema => ({ type: 'boolean', ...o });
export const arr = (items: Schema, o: Partial<Schema> = {}): Schema => ({ type: 'array', items, ...o });
export const obj = (properties: Record<string, Schema>, required: string[] = [], o: Partial<Schema> = {}): Schema => ({ type: 'object', properties, required, additionalProperties: false, ...o });
export const anyObj = (description = ''): Schema => ({ type: 'object', description });
