// Client script of the public site (no framework in the browser): the menu, the lead forms and the films. A form posts to the public
// lead endpoint of the API when the deployment configured one (data-api on <html>); otherwise it says so and never pretends to have sent.
import MOVED from '../redirects.json';
const api = document.documentElement.getAttribute('data-api') || '';
const shownAt = performance.now();   // the API refuses a form sent faster than a person can fill it (minimum fill time)

// menu: one button, aria-expanded, Escape closes and returns focus, a click outside closes
const btn = document.querySelector<HTMLButtonElement>('[data-menu]'); const nav = document.getElementById('nav');
if (btn && nav) {
  const set = (open: boolean) => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); document.body.classList.toggle('menu-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (btn.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target as Node) && !btn.contains(e.target as Node)) set(false); });
}

// products menu (<details>, works without script): Escape closes it and returns focus, a click outside closes it
const pmenu = document.querySelector<HTMLDetailsElement>('.pmenu');
if (pmenu) {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pmenu.open) { pmenu.open = false; pmenu.querySelector('summary')?.focus(); e.stopPropagation(); } }, true);
  document.addEventListener('click', (e) => { if (pmenu.open && !pmenu.contains(e.target as Node)) pmenu.open = false; });
}

// theme: System / Light / Dark (D9). The choice is kept in this browser only (key empathia.theme) and wins over the system setting.
const root = document.documentElement; const KEY = 'empathia.theme';
const current = () => root.getAttribute('data-theme') || 'system';
const paint = () => { const c = current(); document.querySelectorAll<HTMLButtonElement>('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === c))); };
document.querySelectorAll<HTMLButtonElement>('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
  const t = b.dataset.themeSet || 'system';
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
  try { localStorage.setItem(KEY, t); } catch { /* storage unavailable: the choice lasts the page */ }
  paint();
}));
addEventListener('storage', (e) => { if (e.key === KEY) { if (e.newValue === 'light' || e.newValue === 'dark') root.setAttribute('data-theme', e.newValue); else root.removeAttribute('data-theme'); paint(); } });
paint();

// not-found page: show the address asked for (as text, never as markup) and, if it moved, where it lives now
const asked = document.querySelector<HTMLElement>('[data-asked]');
if (asked) {
  const p = location.pathname.replace(/\/+$/, '') || '/'; let shown = location.pathname; try { shown = decodeURIComponent(shown); } catch { /* malformed escape: show it as typed */ }
  asked.textContent = shown.length > 120 ? shown.slice(0, 120) + '…' : shown;
  const to = (MOVED as Record<string, string>)[p]; const box = document.querySelector<HTMLElement>('[data-moved]');
  if (to && box) { const a = document.createElement('a'); a.href = to; a.textContent = to; box.append('This page moved to ', a, '.'); box.hidden = false; }
}

// films: only one plays at a time
const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('.film video'));
for (const v of videos) v.addEventListener('play', () => { for (const o of videos) if (o !== v && !o.paused) o.pause(); });

for (const form of Array.from(document.querySelectorAll<HTMLFormElement>('form[data-lead]'))) {
  const status = form.querySelector<HTMLElement>('[data-status]')!; const send = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const say = (cls: string, text: string) => { status.className = 'status ' + cls; status.textContent = text; };
  if (!api) { say('warn', 'The lead endpoint is not configured on this deployment, so this form cannot send yet. The contact page explains how to reach us in the meantime.'); send.disabled = true; }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (!api) return; if (!form.reportValidity()) return;
    const raw = Object.fromEntries(new FormData(form).entries()) as Record<string, string>; if (raw.website) return;   // honeypot filled: a bot
    const data: Record<string, unknown> = { ...raw, consent: raw.consent === 'on' || raw.consent === 'true', elapsedMs: Math.round(performance.now() - shownAt) }; delete data.website; for (const k of ['audience', 'scope']) if (!data[k]) delete data[k];
    send.disabled = true; say('', 'Sending…');
    try {
      const r = await fetch(`${api}/v1/public/leads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: form.dataset.lead, ...data }) });
      const body = await r.json().catch(() => ({})) as { id?: string; receivedAt?: string; message?: string; detail?: string };
      if (r.ok && body.id) {
        form.querySelectorAll<HTMLElement>('label, .row, button, .note').forEach((el) => { el.hidden = true; });
        const at = body.receivedAt ? new Date(body.receivedAt).toLocaleString() : '';
        say('ok', `Received — reference ${body.id.slice(0, 8).toUpperCase()}${at ? `, ${at}` : ''}. Keep the reference; we will write back to the address you gave.`); status.focus();
      } else { say('warn', `Not sent (${r.status}${body.detail || body.message ? `: ${body.detail || body.message}` : ''}). Nothing was stored; please try again.`); send.disabled = false; }
    } catch { say('warn', 'Not sent: the service could not be reached. Nothing was stored; please try again later.'); send.disabled = false; }
  });
}

// short scenes: play a silent clip only while it is in view, never when the reader asks for reduced motion (the poster stays)
const scenes = document.querySelectorAll<HTMLVideoElement>('video[data-scene]');
if (scenes.length && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target as HTMLVideoElement; if (e.isIntersecting) { v.muted = true; v.play().catch(() => undefined); } else v.pause(); }), { threshold: 0.35 });
  scenes.forEach((v) => io.observe(v));
}
