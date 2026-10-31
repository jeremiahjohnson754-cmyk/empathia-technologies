// Client script of the public site (no framework in the browser): the menu, the lead forms and the films. A form posts to the public
// lead endpoint of the API when the deployment configured one (data-api on <html>); otherwise it says so and never pretends to have sent.
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
