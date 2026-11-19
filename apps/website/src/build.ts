/**
 * Build Your Empathia, the page's script (dist/build.js, loaded on /pricing only). It reads the controls, asks estimate() for the
 * figures and writes the receipt with the same renderer the page was pre-rendered with (build-view.ts). It keeps the estate in the
 * address (#build?rooms=…) so an estimate can be shared, and copies a plain-text summary for the enquiry form. It sends nothing
 * anywhere and stores nothing.
 */
import { PROFILES, DEFAULT_STATE, ADDONS, compute, receiptHtml, stateHash, parseHash, summaryText, type BuildState, type AddonSku } from './build-view.js';

const root = document.querySelector<HTMLElement>('[data-build]');
if (root) {
  const $ = <T extends Element>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends Element>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const form = $<HTMLFormElement>('[data-by-controls]')!; const receipt = $<HTMLElement>('[data-by-receipt]')!;
  const copy = $<HTMLButtonElement>('[data-by-copy]'); const hint = $<HTMLElement>('[data-by-hint]');
  let s: BuildState = parseHash(location.hash) || { ...DEFAULT_STATE };
  const num = (k: string) => $<HTMLInputElement>(`[data-by="${k}"]`)!; const rng = (k: string) => $<HTMLInputElement>(`[data-by-range="${k}"]`)!;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  function paint(push: boolean) {
    s.large = clamp(s.large, 0, s.rooms);
    for (const k of ['rooms', 'large', 'users'] as const) {
      const v = s[k]; const n = num(k); if (document.activeElement !== n) n.value = String(v);
      const r = rng(k); if (k === 'rooms' && v > Number(r.max)) r.max = String(v); if (k === 'large') r.max = String(Math.max(1, s.rooms)); if (k === 'users' && v > Number(r.max)) r.max = String(v); r.value = String(v);
    }
    num('large').max = String(s.rooms);
    for (const k of ['nano', 'edge', 'pulse'] as const) $<HTMLOutputElement>(`[data-by-out="${k}"]`)!.value = String(s[k]);
    for (const b of $$<HTMLButtonElement>('[data-by-step]')) { const k = b.dataset.byStep as 'nano' | 'edge' | 'pulse'; if (b.dataset.d === '-1') b.disabled = s[k] === 0; }
    for (const c of $$<HTMLInputElement>('[data-by-add]')) c.checked = s.addons.includes(c.dataset.byAdd as AddonSku);
    for (const b of $$<HTMLButtonElement>('[data-preset]')) { const p = PROFILES[Number(b.dataset.preset)]!; b.setAttribute('aria-pressed', String(p.rooms === s.rooms && p.large === s.large && p.users === s.users)); }
    try { receipt.innerHTML = receiptHtml(compute(s)); receipt.removeAttribute('data-error'); const m = $<HTMLElement>('[data-by-mini-annual]'); if (m) m.textContent = receipt.querySelector('[data-total=annual]')!.textContent; }
    catch (err) { receipt.setAttribute('data-error', ''); const p = receipt.querySelector('.by-r__err') || receipt.insertBefore(document.createElement('p'), receipt.firstChild); p.className = 'by-r__err'; p.textContent = `${(err as Error).message}. Change the numbers above to see an estimate.`; }
    if (push) history.replaceState(null, '', stateHash(s));
  }
  const whole = (v: string, max: number) => { const x = Math.floor(Number(v)); return Number.isFinite(x) ? clamp(x, 0, max) : 0; };
  form.addEventListener('input', (ev) => {
    const t = ev.target as HTMLInputElement; const k = (t.dataset.by || t.dataset.byRange) as 'rooms' | 'large' | 'users' | undefined;
    if (k) { if (t.value === '') return; s[k] = whole(t.value, k === 'users' ? 1000000 : 100000); if (k === 'rooms') s.rooms = Math.max(1, s.rooms); paint(true); return; }
    if (t.dataset.byAdd) { const a = t.dataset.byAdd as AddonSku; s.addons = t.checked ? ADDONS.map((x) => x.sku).filter((x) => x === a || s.addons.includes(x)) : s.addons.filter((x) => x !== a); paint(true); }
  });
  // a field being typed in keeps what is typed; on leaving it, it shows the value used (an empty field, 0 rooms or more large rooms than rooms)
  form.addEventListener('focusout', (ev) => { const t = ev.target as HTMLInputElement; if (t.dataset.by) setTimeout(() => paint(false), 0); });
  form.addEventListener('submit', (ev) => ev.preventDefault());
  form.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('button'); if (!b) return;
    if (b.dataset.preset) { const p = PROFILES[Number(b.dataset.preset)]!; s = { ...s, rooms: p.rooms, large: p.large, users: p.users }; paint(true); return; }
    if (b.dataset.byStep) { const k = b.dataset.byStep as 'nano' | 'edge' | 'pulse'; s[k] = clamp(s[k] + Number(b.dataset.d), 0, 9999); paint(true); }
  });
  copy?.addEventListener('click', async () => {
    const text = summaryText(s, compute(s), location.origin + location.pathname + stateHash(s));
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
    catch { copy.textContent = 'Select and copy the estimate below'; const ta = document.createElement('textarea'); ta.className = 'by__copied'; ta.readOnly = true; ta.value = text; copy.after(ta); ta.select(); }
    setTimeout(() => { copy.textContent = 'Copy this estimate'; }, 2400);
  });
  window.addEventListener('hashchange', () => { const p = parseHash(location.hash); if (p) { s = p; paint(false); root.scrollIntoView({ block: 'start' }); } });
  form.hidden = false; if (copy) copy.hidden = false; if (hint) hint.hidden = false; $<HTMLElement>('[data-by-nojs]')?.setAttribute('hidden', '');
  paint(false);
  if (parseHash(location.hash)) root.scrollIntoView({ block: 'start' });
}
