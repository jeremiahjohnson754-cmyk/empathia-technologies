// "Follow one device" (founder directive 18 Nov 2026 17:25 §6): one ceiling microphone in one room, seen from five products, each stage a
// capture of the demonstration at that exact state, and each with "Open this exact demonstration", which opens the demonstration at the
// same room, device, view and perspective (a typed launch, packages/ui/src/launches.ts) with a way back to this section.
// Without the script every stage is shown, one after another; with it (site.js), the stages become a stepper on one stage. Nothing
// here moves on its own.
import React from 'react';
import { FOLLOW, FOLLOW_ROOM, FOLLOW_POSITION, FOLLOW_ASSET, launchHref } from '../../../packages/ui/src/launches.ts';
import type { Capture } from './ui.js';

const STAGES: Record<string, { product: string; p: string; alt: string }> = {
  'follow-lite': { product: 'Lite', p: 'lite', alt: 'Lite showing the furnished Atlas 4.218 boardroom in 3D, with ceiling microphone 1 selected and its details beside the room' },
  'follow-commissioning': { product: 'Commissioning', p: 'commissioning', alt: 'The commissioning record of Atlas 4.218: each test with what was required, what was observed, who recorded it and who verified it' },
  'follow-assurance': { product: 'Assurance', p: 'commissioning', alt: 'Assurance for Atlas 4.218: the accepted baseline and its revisions' },
  'follow-support': { product: 'Search Party', p: 'search-party', alt: 'Search Party focused on Atlas 4.218: who supports the room and its relationships, each with its source' },
  'follow-replay': { product: 'Core Replay', p: 'mission-control', alt: 'Core Replay of Atlas 4.218 stopped at the like-for-like camera change, with the reopened tests named' },
};

export function Follow({ demoUrl, captures }: { demoUrl: string; captures: Record<string, Capture> }) {
  return (
    <section className="section follow" id="follow" aria-labelledby="follow-h" data-follow="">
      <div className="wrap">
        <p className="label">Follow one device</p>
        <h2 id="follow-h">One microphone, five products, one record</h2>
        <p className="lede follow__lede">Atlas 4.218 is a boardroom on the fictional demonstration campus. Its ceiling microphone 1 is position {FOLLOW_POSITION}, and the unit installed there is asset {FOLLOW_ASSET}. Follow it through the platform: every product below reads the same room record, {FOLLOW_ROOM}, and each button opens the demonstration at exactly that view.</p>
        <div className="follow__nav" role="tablist" aria-label="The five views of one microphone" hidden>
          {FOLLOW.map((l, i) => <button key={l.id} type="button" role="tab" id={`${l.id}-tab`} aria-controls={l.id} aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1} className="follow__tab"><span className="follow__tn">{i + 1}</span>{STAGES[l.id]!.product}</button>)}
        </div>
        <ol className="follow__stages">
          {FOLLOW.map((l, i) => {
            const s = STAGES[l.id]!; const cap = captures[l.id];
            return (
              <li key={l.id} id={l.id} className="follow__stage" data-p={s.p} data-stage={i + 1}>
                {cap ? <figure className="shot follow__shot">
                  <div className="shot__frame"><img src={`/media/product/${l.id}-1280.webp`} srcSet={`/media/product/${l.id}-640.webp 640w, /media/product/${l.id}-1280.webp 1280w`} sizes="(max-width: 1100px) 92vw, 760px" width={cap.w} height={cap.h} loading="lazy" decoding="async" alt={`${s.alt} (synthetic demonstration data).`} />
                    <span className="shot__badge" aria-hidden="true">Synthetic demonstration data</span></div>
                  <figcaption><b>Captured from the demonstration</b><span>At this exact view, as the {l.perspectiveLabel}</span></figcaption>
                </figure> : null}
                <div className="follow__txt">
                  <p className="follow__k"><span className="follow__n" aria-hidden="true">{i + 1}</span>{s.product}</p>
                  <h3>{l.title}</h3>
                  <p>{l.shows}</p>
                  <p className="follow__go"><a className="btn btn--primary" href={launchHref(demoUrl, l, `/platform#${l.id}`)} data-launch={l.id}>Open this exact demonstration</a></p>
                  <p className="follow__as">Opens as the {l.perspectiveLabel}, on synthetic data, with a way back here. Viewing as a role grants nothing.</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
