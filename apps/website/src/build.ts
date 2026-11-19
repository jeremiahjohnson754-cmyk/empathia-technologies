/**
 * Build Your Empathia, the page's script (dist/build.js, loaded on /pricing only). It reads the controls, asks estimate() for the
 * figures and writes the receipt with the same renderer the page was pre-rendered with (build-view.ts). It keeps the estate in the
 * address (#build?sr=…) so an estimate can be shared, and copies a plain-text summary for the enquiry form. It sends nothing
 * anywhere and stores nothing. Price Book 3: three room groups with their devices, a bundle, and Search Party's outside assets.
 */
import { PROFILES, DEFAULT_STATE, ADDONS, compute, receiptHtml, stateHash, parseHash, summaryText, normalize, deviceRange, rangeText, roomsOf, type BuildState, type AddonSku } from './build-view.js';

type Kind = 'small' | 'mid' | 'large';
type NumKey = 'smallRooms' | 'smallDevices' | 'midRooms' | 'midDevices' | 'largeRooms' | 'largeDevices' | 'users' | 'outside';
const NUMS: NumKey[] = ['smallRooms', 'smallDevices', 'midRooms', 'midDevices', 'largeRooms', 'largeDevices', 'users', 'outside'];
const KINDS: Kind[] = ['small', 'mid', 'large'];
const MAX: Record<NumKey, number> = { smallRooms: 100000, midRooms: 100000, largeRooms: 100000, smallDevices: 100000000, midDevices: 100000000, largeDevices: 100000000, users: 1000000, outside: 100000000 };

const root = document.querySelector<HTMLElement>('[data-build]');
if (root) {
  const $ = <T extends Element>(q: string) => root.querySelector<T>(q);
  const $$ = <T extends Element>(q: string) => Array.from(root.querySelectorAll<T>(q));
  const form = $<HTMLFormElement>('[data-by-controls]')!; const receipt = $<HTMLElement>('[data-by-receipt]')!;
  const copy = $<HTMLButtonElement>('[data-by-copy]'); const hint = $<HTMLElement>('[data-by-hint]');
  const users = $<HTMLInputElement>('[data-by-range-users]')!; const bundle = $<HTMLSelectElement>('[data-by-bundle]')!;
  let s: BuildState = parseHash(location.hash) || { ...DEFAULT_STATE };
  const num = (k: NumKey) => $<HTMLInputElement>(`[data-by="${k}"]`)!;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const R = (k: Kind) => `${k}Rooms` as const; const D = (k: Kind) => `${k}Devices` as const;

  /** Show the figures for the estate as entered; a field being typed in keeps what is typed, the others show the value used. */
  function paint(push: boolean) {
    const v = normalize(s);
    for (const k of NUMS) { const n = num(k); if (document.activeElement !== n) n.value = String(v[k]); }
    for (const k of KINDS) {
      const rooms = v[R(k)]; const [lo, hi] = deviceRange(k, rooms); const d = num(D(k));
      d.min = String(lo); d.max = String(hi ?? MAX[D(k)]);
      $<HTMLElement>(`[data-by-range="${k}"]`)!.textContent = rangeText(k, rooms);
    }
    if (v.users > Number(users.max)) users.max = String(v.users); users.value = String(v.users);
    bundle.value = v.bundle;
    for (const k of ['nano', 'edge', 'pulse'] as const) $<HTMLOutputElement>(`[data-by-out="${k}"]`)!.value = String(v[k]);
    for (const b of $$<HTMLButtonElement>('[data-by-step]')) { const k = b.dataset.byStep as 'nano' | 'edge' | 'pulse'; if (b.dataset.d === '-1') b.disabled = v[k] === 0; }
    for (const c of $$<HTMLInputElement>('[data-by-add]')) c.checked = v.addons.includes(c.dataset.byAdd as AddonSku);
    $<HTMLElement>('[data-by-outside]')!.hidden = !v.addons.includes('SEARCH');
    const n = roomsOf(v); const sm = $<HTMLInputElement>('[data-by-small]'); if (sm) { sm.checked = v.startedSmall; sm.closest('label')!.hidden = n < 25 || n > 47; }
    for (const b of $$<HTMLButtonElement>('[data-preset]')) { const p = PROFILES[Number(b.dataset.preset)]!; b.setAttribute('aria-pressed', String(KINDS.every((k) => p[R(k)] === v[R(k)] && p[D(k)] === v[D(k)]) && p.users === v.users)); }
    try { receipt.innerHTML = receiptHtml(compute(v)); receipt.removeAttribute('data-error'); const m = $<HTMLElement>('[data-by-mini-annual]'); if (m) m.textContent = receipt.querySelector('[data-total=annual]')!.textContent; }
    catch (err) { receipt.setAttribute('data-error', ''); const p = receipt.querySelector('.by-r__err') || receipt.insertBefore(document.createElement('p'), receipt.firstChild); p.className = 'by-r__err'; p.textContent = `${(err as Error).message}. Change the numbers above to see an estimate.`; }
    if (push) history.replaceState(null, '', stateHash(v));
  }
  const whole = (t: string, max: number) => { const x = Math.floor(Number(t)); return Number.isFinite(x) ? clamp(x, 0, max) : 0; };
  form.addEventListener('input', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t === users) { s.users = whole(t.value, MAX.users); paint(true); return; }
    const k = t.dataset.by as NumKey | undefined;
    if (k) { if (t.value === '') return; s[k] = whole(t.value, MAX[k]); paint(true); return; }
    if (t.dataset.bySmall !== undefined) { s.startedSmall = t.checked; paint(true); return; }
    if (t.dataset.byAdd) { const a = t.dataset.byAdd as AddonSku; s.addons = t.checked ? ADDONS.map((x) => x.sku).filter((x) => x === a || s.addons.includes(x)) : s.addons.filter((x) => x !== a); paint(true); }
  });
  bundle.addEventListener('change', () => { s.bundle = bundle.value; paint(true); });
  // on leaving a field, the estate becomes what was used: an empty field, no rooms, or devices the rooms cannot hold
  form.addEventListener('focusout', (ev) => { if ((ev.target as HTMLElement).dataset.by) setTimeout(() => { s = normalize(s); paint(false); }, 0); });
  form.addEventListener('submit', (ev) => ev.preventDefault());
  form.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button'); if (!b) return;
    if (b.dataset.preset) { const p = PROFILES[Number(b.dataset.preset)]!; s = { ...s, smallRooms: p.smallRooms, smallDevices: p.smallDevices, midRooms: p.midRooms, midDevices: p.midDevices, largeRooms: p.largeRooms, largeDevices: p.largeDevices, users: p.users }; paint(true); return; }
    if (b.dataset.byStep) { const k = b.dataset.byStep as 'nano' | 'edge' | 'pulse'; s[k] = clamp(s[k] + Number(b.dataset.d), 0, 9999); paint(true); }
  });
  copy?.addEventListener('click', async () => {
    const v = normalize(s); const text = summaryText(v, compute(v), location.origin + location.pathname + stateHash(v));
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
    catch { copy.textContent = 'Select and copy the estimate below'; const ta = document.createElement('textarea'); ta.className = 'by__copied'; ta.readOnly = true; ta.value = text; copy.after(ta); ta.select(); }
    setTimeout(() => { copy.textContent = 'Copy this estimate'; }, 2400);
  });
  window.addEventListener('hashchange', () => { const p = parseHash(location.hash); if (p) { s = p; paint(false); root.scrollIntoView({ block: 'start' }); } });
  form.hidden = false; if (copy) copy.hidden = false; if (hint) hint.hidden = false; $<HTMLElement>('[data-by-nojs]')?.setAttribute('hidden', '');
  paint(false);
  if (parseHash(location.hash)) root.scrollIntoView({ block: 'start' });
}
