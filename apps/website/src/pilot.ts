// The Pilot Readiness check on /pilots (handoff v1.8 §4.2; V18-PILOT-03/04/05/06). It reads the four answers from the page, runs the
// shared rules (packages/commercial/src/readiness.ts — the same function the enterprise API and the demonstration use) and writes the
// result into the page as text. It makes no request, stores nothing and has no field for a credential. The next step it names is the
// enquiry form already on the page: there is no checkout here.
import { assessReadiness, READINESS_MEANING, isPilotSku, APPROVERS, type Approver, type ConnectorChoice, type ReadinessInput, type Readiness } from '../../../packages/commercial/src/readiness.ts';

const root = document.querySelector<HTMLElement>('[data-wizard]');
if (root) {
  const out = root.querySelector<HTMLElement>('[data-result]')!; const body = root.querySelector<HTMLElement>('[data-result-body]')!;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const list = (title: string, items: string[]) => { const s = el('section', undefined, 'wiz__part'); if (!items.length) return s; s.append(el('h4', title)); const ul = el('ul'); for (const i of items) ul.append(el('li', i)); s.append(ul); return s; };
  const whole = (name: string, max: number) => { const i = root.querySelector<HTMLInputElement>(`input[name=${name}]`)!; const n = Math.floor(Number(i.value)); const v = Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : 1; i.value = String(v); return v; };
  const checked = (name: string) => root.querySelector<HTMLInputElement>(`input[name=${name}]:checked`)?.value || '';

  function read(): ReadinessInput {
    const sku = checked('sku'); const sel = root!.querySelector<HTMLSelectElement>('select[name=connector]')!; const o = sel.selectedOptions[0];
    let connector: ReadinessInput['connector'] = 'NONE';
    if (sel.value === 'NOT_LISTED') connector = 'NOT_LISTED';
    else if (sel.value !== 'NONE' && o) connector = { key: sel.value, label: o.dataset.label || o.textContent || sel.value, model: (o.dataset.model || 'CLOUD_API') as ConnectorChoice['model'], maturity: o.dataset.maturity === 'VERIFIED' ? 'VERIFIED' : 'CATALOGUE_ONLY' };
    const a = checked('approver') as Approver;
    return { sku: isPilotSku(sku) ? sku : 'PILOT-DISCOVERY', connector, rooms: whole('rooms', 999), sites: whole('sites', 99), approver: APPROVERS.includes(a) ? a : 'UNKNOWN' };
  }
  function show(input: ReadinessInput, r: Readiness) {
    out.dataset.state = r.state; body.replaceChildren();
    const head = el('p', undefined, 'wiz__state'); head.append(el('strong', READINESS_MEANING[r.state].label), el('code', r.state)); body.append(head, el('p', READINESS_MEANING[r.state].meaning, 'wiz__meaning'));
    const source = input.connector === 'NONE' ? 'no live source' : input.connector === 'NOT_LISTED' ? 'a platform that is not listed' : input.connector.label;
    body.append(el('p', `${r.pilot} · ${r.price} once · ${input.rooms} room${input.rooms === 1 ? '' : 's'} at ${input.sites} site${input.sites === 1 ? '' : 's'} · ${source}`, 'wiz__summary'));
    body.append(list('Why', r.reasons), list('What you need first', r.prerequisites), list('Approvals needed', r.approvals), list('Limits of this pilot', r.limitations));
    const s = el('section', undefined, 'wiz__part'); s.append(el('h4', 'Scope limits')); const dl = el('dl', undefined, 'wiz__scope');
    for (const [k, v] of [['Rooms', `up to ${r.scope.roomLimit}`], ['Sites', `up to ${r.scope.siteLimit}`], ['Live sources', r.scope.connectorLimit ? String(r.scope.connectorLimit) : 'none'], ['Length', `${r.scope.days} days`]] as const) { const d = el('div'); d.append(el('dt', k), el('dd', v)); dl.append(d); }
    s.append(dl); body.append(s, list('Terms, in plain words', r.terms));
    if (r.alternative) { const a = el('section', undefined, 'wiz__part wiz__alt'); a.append(el('h4', 'An alternative that fits'), el('p', `${r.alternative.pilot}. ${r.alternative.why}`)); body.append(a); }
    const n = el('section', undefined, 'wiz__part wiz__next'); n.append(el('h4', 'Next step'), el('p', r.nextStep)); const go = el('a', 'Go to the enquiry form', 'btn'); go.href = '#enquire'; n.append(go); body.append(n);
    out.hidden = false; out.focus({ preventScroll: true }); out.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  const run = () => { const input = read(); show(input, assessReadiness(input)); };
  root.querySelector<HTMLButtonElement>('[data-check]')!.addEventListener('click', run);
  // a changed answer withdraws the result (it never shows a stale scope, and focus stays where the visitor is typing); Check again shows the new one
  const stale = () => { if (!out.hidden) { out.hidden = true; delete out.dataset.state; body.replaceChildren(); } };
  root.addEventListener('change', stale); root.addEventListener('input', stale);
}
