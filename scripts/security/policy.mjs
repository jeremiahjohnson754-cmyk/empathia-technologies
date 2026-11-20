/**
 * The security policy of the two public static sites (apps/website, apps/demo), in one place (assessment 2026-11-04, SA-01/SA-02).
 * render.yaml declares the same headers (tests/security/public-sites.test.mjs proves they match); the builds also write the CSP into
 * every page as <meta http-equiv>, so a site served WITHOUT render.yaml's headers (the two -next static sites were created through the
 * API, outside the Blueprint) still cannot load or send anything off its origin. A meta CSP cannot carry frame-ancestors (browsers
 * ignore it there and log an error), so framing protection still needs the header.
 */
export const DIRECTIVES = (connect = []) => [
  ['default-src', "'self'"], ['connect-src', ["'self'", ...connect].join(' ')], ['img-src', "'self' data:"], ['style-src', "'self'"],
  ['font-src', "'self'"], ['script-src', "'self'"], ['object-src', "'none'"], ['frame-ancestors', "'none'"], ['base-uri', "'none'"],
  ['form-action', "'none'"],
];
const join = (d) => d.map(([k, v]) => `${k} ${v}`).join('; ');
/** The Content-Security-Policy header; `connect` adds origins the page may call (the website's lead API, when one is configured). */
export const cspHeader = (connect = []) => join(DIRECTIVES(connect));
/** The same policy for <meta http-equiv>: everything a meta element may carry. */
export const cspMeta = (connect = []) => join(DIRECTIVES(connect).filter(([k]) => k !== 'frame-ancestors'));
/** Headers every response of both sites carries (HSTS only over HTTPS, so the local servers leave it out). */
export const COMMON_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin',
};
export const HSTS = 'max-age=31536000; includeSubDomains';
/** Put the meta CSP first in <head> (right after <meta charset>), before any script, preload or stylesheet. Idempotent. */
export function injectMetaCsp(html, connect = []) {
  if (/http-equiv="Content-Security-Policy"/i.test(html)) return html;
  const tag = `<meta http-equiv="Content-Security-Policy" content="${cspMeta(connect)}">`;
  const m = /<meta charset[^>]*>/i.exec(html) || /<head[^>]*>/i.exec(html);
  if (!m) throw new Error('injectMetaCsp: no <head>');
  return html.slice(0, m.index + m[0].length) + `\n${tag}` + html.slice(m.index + m[0].length);
}
/** An origin from a configured URL, or null (an unparsable value is refused, never passed into the policy verbatim). */
export const originOf = (u) => { if (!u) return null; try { const o = new URL(u); return /^https?:$/.test(o.protocol) ? o.origin : null; } catch { return null; } };
