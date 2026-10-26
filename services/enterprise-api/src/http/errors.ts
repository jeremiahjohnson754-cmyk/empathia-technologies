/**
 * The error taxonomy (RFC 9457 problem details). Every error response has a stable `type`, a human `title`, the HTTP status, a
 * `detail` and the correlation id. Codes are documented in docs/api/ERRORS.md.
 */
export type ErrorCode =
  | 'unauthenticated' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'rule_refused' | 'idempotency_mismatch'
  | 'payload_too_large' | 'unsupported_media_type' | 'rate_limited' | 'not_configured' | 'internal';

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401, forbidden: 403, not_found: 404, validation: 400, conflict: 409, rule_refused: 422, idempotency_mismatch: 422,
  payload_too_large: 413, unsupported_media_type: 415, rate_limited: 429, not_configured: 501, internal: 500,
};
const TITLE: Record<ErrorCode, string> = {
  unauthenticated: 'Sign-in required', forbidden: 'Not allowed for your role', not_found: 'Not found', validation: 'The request is not valid',
  conflict: 'The record changed or already exists', rule_refused: 'Refused by a business rule', idempotency_mismatch: 'Idempotency key reused with a different request',
  payload_too_large: 'Request too large', unsupported_media_type: 'Unsupported media type', rate_limited: 'Too many requests', not_configured: 'Not configured', internal: 'Internal error',
};

export class ApiError extends Error {
  status: number;
  constructor(public code: ErrorCode, detail: string, public reasons: string[] = []) { super(detail); this.status = STATUS[code]; }
  problem(correlationId: string) {
    return { type: `https://errors.empathia.invalid/${this.code}`, title: TITLE[this.code], status: this.status, detail: this.message, code: this.code, ...(this.reasons.length ? { reasons: this.reasons } : {}), correlationId };
  }
}
export const refused = (why: string[]) => new ApiError('rule_refused', why[0] || 'refused', why);
export const notFound = (what: string) => new ApiError('not_found', `${what} was not found in this tenant`);
export const forbidden = (why: string) => new ApiError('forbidden', why);
export const invalid = (why: string, reasons: string[] = []) => new ApiError('validation', why, reasons);
