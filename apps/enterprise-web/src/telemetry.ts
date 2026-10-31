/**
 * Browser telemetry for the enterprise app, on the same port as the API (@empathia/observability, platform "javascript").
 *   - release: empathia-enterprise-web@<version>+<sha> — the sha is stamped by the build (EMPATHIA_RELEASE_SHA), so a browser error
 *     and an API error from the same deployment share a release and can be correlated in the tracker;
 *   - transport: the serving process may write <meta name="empathia-sentry-dsn"> (the same pattern as the API origin); without it
 *     nothing leaves the browser (NullTransport). A ?dsn= override does not exist, in any build;
 *   - what is reported: uncaught errors, unhandled promise rejections, React render failures (ErrorBoundary), and API responses
 *     with status ≥ 500 — tagged with the API's correlation id so the two sides of one failure meet;
 *   - what is never reported: request bodies, tokens, form values, e-mail addresses (scrubbed by the port), the URL's query string.
 */
import { Telemetry, NullTransport, SentryTransport, scrub } from '@empathia/observability';
import { ApiProblem } from '@empathia/api-client';

declare const EMPATHIA_RELEASE_SHA: string;
declare const EMPATHIA_DEV_BUILD: boolean;
const sha = typeof EMPATHIA_RELEASE_SHA !== 'undefined' ? EMPATHIA_RELEASE_SHA : 'unknown';
const meta = (n: string) => (document.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null)?.content || null;
const dsn = meta('empathia-sentry-dsn');
const environment = meta('empathia-environment') || (typeof EMPATHIA_DEV_BUILD !== 'undefined' && EMPATHIA_DEV_BUILD ? 'development' : 'production');

function build(): Telemetry {
  let transport: NullTransport | SentryTransport = new NullTransport();
  if (dsn) { try { transport = new SentryTransport(dsn); } catch { transport = new NullTransport(); } }   // a malformed DSN disables reporting; it never breaks the app
  return new Telemetry({ release: { name: 'empathia-enterprise-web', version: '0.1.0', sha, environment }, platform: 'javascript', transport, tracesSampleRate: 0, logger: 'enterprise-web' });
}
export const telemetry: Telemetry = build();

/** The page the error happened on, as a route pattern (hash router): '#/rooms/:id' rather than the concrete id. */
export const routeOf = (hash = location.hash): string => hash.split('?')[0]!.replace(/\/[A-Z0-9][A-Z0-9-]{3,}(?=\/|$)/g, '/:id').replace(/\/\d+(?=\/|$)/g, '/:id') || '#/';

let installed = false;
/** Installs the window-level handlers once. Idempotent; safe under StrictMode. */
export function installTelemetry(): void {
  if (installed) return; installed = true;
  // read-only status for operators and the browser tests (counts, transport kind and release — never a key or an event)
  (window as unknown as { empathiaTelemetry?: () => ReturnType<Telemetry['status']> }).empathiaTelemetry = () => telemetry.status();
  window.addEventListener('error', (e) => { void telemetry.captureException(e.error ?? new Error(String(e.message)), { route: routeOf(), tags: { kind: 'window.error' } }); });
  window.addEventListener('unhandledrejection', (e) => { void telemetry.captureException(e.reason, { route: routeOf(), tags: { kind: 'unhandledrejection' } }); });
}

/** Reports an API failure the server owned (status ≥ 500) with the server's correlation id; 4xx answers are the person's to read, not failures. */
export function reportApiProblem(e: unknown, where: string): void {
  if (!(e instanceof ApiProblem) || e.status < 500) return;
  void telemetry.captureMessage(`API ${e.status} ${e.code} during ${scrub(where)}`, { level: 'error', route: routeOf(), correlationId: e.correlationId || undefined, status: e.status, tags: { kind: 'api.problem' } });
}
