/**
 * The platform as one picture, the same one the corporate website draws (apps/website/src/platform.tsx Plate), from the same file
 * (packages/ui families.ts): seventeen capabilities in six family columns, standing on what they share, standing on one record.
 * A column is as tall as its family is large. A filled block is a core product; an outlined block is a further capability, a simulation
 * here. A block is a link only for a role that may open that capability; otherwise it is its name, marked as not open to this role.
 * 24 Nov 2026 (founder, 23 Nov 19:22: "One platform, six product families, shared engineering intelligence").
 */
import { FAMILIES, SHARED, CAPABILITIES } from '@empathia/ui';

export function Plate({ opens }: { opens: (href: string) => boolean }) {
  const closed = FAMILIES.flatMap((f) => f.members).filter((m) => !(m.demo && opens(`#${m.demo}`))).length;
  return (<figure className="pl" data-testid="plate" data-closed={closed}>
    <ol className="pl__cols">{FAMILIES.map((f) => (<li key={f.id}><h3><a href={`#fam-${f.id}`}>{f.name}</a></h3>
      <ul aria-label={`In ${f.name}`}>{f.members.map((m) => { const href = m.demo ? `#${m.demo}` : null; const ok = !!href && opens(href); return (
        <li key={m.id} data-kind={m.kind} data-open={ok ? '1' : '0'}>{ok ? <a href={href!} data-testid={`plate-open-${m.id}`}>{m.name}</a> : <span title="Not open to this role">{m.name}</span>}</li>); })}</ul></li>))}</ol>
    <div className="pl__shared"><b>Shared engineering intelligence</b><ul>{SHARED.map((s) => <li key={s.id}>{s.title}</li>)}</ul></div>
    <div className="pl__record"><b>One record</b><span>Every room, device, person and job has one identity, from the first request to the last service visit.</span></div>
    <figcaption><span data-kind="product">Core product ({CAPABILITIES.filter((c) => c.kind === 'product').length})</span><span data-kind="capability">Further capability, simulated here ({CAPABILITIES.filter((c) => c.kind !== 'product').length})</span>{closed ? <span data-open="0">Not open to this role ({closed})</span> : null}</figcaption>
  </figure>);
}
