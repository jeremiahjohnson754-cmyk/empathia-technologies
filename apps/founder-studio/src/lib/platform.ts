/**
 * The studio's connection to the platform API (the hosted Founder Studio, ADR-0001 §3). The founder signs in to the founder
 * organization; the token is kept for this tab only (sessionStorage) and is sent to the configured API origin and nowhere else.
 * The API decides every permission; the studio only shows what the API answered.
 */
import { EmpathiaClient } from '@empathia/api-client';

const KEY = 'empathia.founder-studio.session';
export const API_BASE = (() => { try { return new URLSearchParams(location.search).get('api') || (window as unknown as { EMPATHIA_API?: string }).EMPATHIA_API || 'http://127.0.0.1:4100'; } catch { return 'http://127.0.0.1:4100'; } })();
const read = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
export const platform = new EmpathiaClient({ baseUrl: API_BASE, token: read(), onUnauthenticated: () => { platform.token = null; try { sessionStorage.removeItem(KEY); } catch { /* no storage */ } notify(); } });
const subs = new Set<() => void>(); const notify = () => subs.forEach((f) => f());
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export async function signInFounder(password: string) {
  const t = await platform.signIn({ email: 'founder@empathia-founder.empathia.invalid', password, tenant: 'empathia-founder', role: 'founder' });
  platform.token = (t as { accessToken: string }).accessToken; try { sessionStorage.setItem(KEY, (t as { accessToken: string }).accessToken); } catch { /* no storage: the session lasts the page */ } notify();
}
export function signOut() { platform.token = null; try { sessionStorage.removeItem(KEY); } catch { /* no storage */ } notify(); }
export const signedIn = () => !!platform.token;
