// Client script of the public site (no framework in the browser): the menu, and the lead forms. A form posts to the public lead
// endpoint of the API when the deployment configured one (data-api on <html>); otherwise it says so and never pretends to have sent.
const api = document.documentElement.getAttribute('data-api') || '';
const btn = document.querySelector<HTMLButtonElement>('[data-menu]'); const nav = document.getElementById('nav');
if (btn && nav) { btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); nav.classList.toggle('open', !open); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { btn.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); btn.focus(); } }); }
for (const form of Array.from(document.querySelectorAll<HTMLFormElement>('form[data-lead]'))) {
  const status = form.querySelector<HTMLElement>('[data-status]')!; const send = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const say = (cls: string, text: string) => { status.className = 'status ' + cls; status.textContent = text; };
  if (!api) { say('warn', 'The lead endpoint is not configured on this deployment, so this form cannot send yet. Use the address on the contact page instead.'); send.disabled = true; }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (!api) return; if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries()); if (data.website) return;   // honeypot filled: a bot
    send.disabled = true; say('', 'Sending…');
    try { const r = await fetch(`${api}/v1/public/leads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: form.dataset.lead, ...data, website: undefined }) });
      if (r.ok) { form.querySelectorAll<HTMLElement>('label, .row, button').forEach((el) => { el.hidden = true; }); say('ok', 'Received. We will write back to the address you gave.'); }
      else { say('warn', `Not sent (${r.status}). Nothing was stored; please try again or use the contact page.`); send.disabled = false; } }
    catch (e) { say('warn', 'Not sent: the service could not be reached. Nothing was stored; please try again later.'); send.disabled = false; }
  });
}
