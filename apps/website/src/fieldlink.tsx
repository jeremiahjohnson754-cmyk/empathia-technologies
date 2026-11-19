// FieldLink (founder directive 18 Nov 2026 17:25): the optional hardware family, presented as what it is — a concept reference design
// (Rev 0.9), not manufactured, not certified, with illustrative proposed prices. Every engineering value is from the founder's FieldLink
// engineering dossier and carries its class from that dossier: V vendor-documented constraint, C calculated for stated assumptions,
// T target or provisional selection. Never on this page: the dossier's cost-of-goods, margins or supplier assumptions, any claim that a
// named vendor's interface is available, or anything that implies Empathia needs this hardware.
import React from 'react';
import { SOLIDS, POSE, project, fillOf } from './fieldlink-geom.js';

type Cls = 'V' | 'C' | 'T';
const CLS: Record<Cls, string> = { V: 'Vendor-documented constraint', C: 'Calculated for stated assumptions', T: 'Target or provisional selection' };
const Kl = ({ c }: { c: Cls }) => <abbr className={`fl-cls fl-cls--${c}`} title={CLS[c]}>{c}</abbr>;
interface Device { id: 'nano' | 'edge' | 'pulse'; name: string; tag: string; where: string; price: string; img: { w: number; h: number }; benefits: string[]; specs: [string, string, Cls][] }
const DEVICES: Device[] = [
  { id: 'nano', name: 'FieldLink Nano', tag: 'Portable diagnostics', where: 'A USB-C accessory for approved, compatible host computers, and a technician’s field kit', price: '$249', img: { w: 720, h: 467 },
    benefits: ['Local observations on supported hosts', 'Portable field evidence, tied to the exact room and asset in Empathia', 'Its own cryptographic identity'],
    specs: [['Form', 'USB-C dongle; envelope 75 × 20 × 13 mm', 'T'], ['Power', 'USB 5 V; at most 0.5 A, and only after the host has enumerated it and advertised the allowance', 'V'],
      ['Power budget', 'Design peak 1.70 W with a 20 % contingency, against 2.50 W available (5.00 V × 0.500 A)', 'C'], ['Regulated rail', '3.3 V, 0.33 A total peak load assumed', 'C'],
      ['Compute', 'Low-power microcontroller with secure boot and signed application updates', 'T'], ['Sensors', 'Optional temperature and humidity; low-power accelerometer; optional MEMS microphone with privacy controls', 'T'],
      ['USB behaviour', 'A vendor-specific authorized interface. No keyboard injection and no hidden human-interface behaviour', 'T'],
      ['Hosts', 'Supported managed computers only. Modifying a certified, locked-down meeting-room host is not assumed', 'V'],
      ['Data integrity', 'Monotonic sequence numbers, time synchronized through an approved host or the backend, local buffering', 'T']] },
  { id: 'edge', name: 'FieldLink Edge', tag: 'Local intelligence gateway', where: 'An equipment rack, a collaboration room, or a multiroom site', price: '$1,499', img: { w: 720, h: 504 },
    benefits: ['Authorized, read-only observations of the devices it is allowed to reach', 'Buffers observations when the upstream link drops, then forwards them once, in order', 'Ties what it sees to Empathia’s canonical room and asset records'],
    specs: [['Form', 'Fanless enclosure, target 160 × 110 × 45 mm; optional rack accessory', 'T'], ['Power', 'IEEE 802.3at PoE+ powered-device module, 25.5 W continuous output (a candidate module)', 'V'],
      ['Power budget', 'Design draw 23.1 W with a 20 % contingency, against the module’s 25.5 W — a worked example, not a measured unit', 'C'],
      ['Compute', 'Linux-capable ARM module or industrial x86 gateway, with a TPM or secure element', 'T'], ['Memory and storage', '4 GB RAM and 32 GB encrypted solid-state storage as the baseline', 'T'],
      ['Network', 'One 1 GbE port for management and ingest; a second port only through a scoped VLAN and security design', 'T'],
      ['Collectors', 'Read-only HTTPS interfaces, SNMPv3, syslog, supported vendor adapters and probes the site has authorized', 'T'],
      ['Buffer', 'Encrypted durable store; batched retry with de-duplication and quotas', 'T'], ['Management', 'Signed over-the-air updates with anti-rollback, a local watchdog, remote revocation, diagnostics', 'T']] },
  { id: 'pulse', name: 'FieldLink Pulse', tag: 'Distributed environmental sensing', where: 'Zones of larger rooms: town halls, lecture theatres, venues', price: '$499', img: { w: 720, h: 582 },
    benefits: ['Environmental observations placed where people sit', 'Spatially referenced readings across a room’s zones', 'Optional acoustic measurement as a design target, once a calibrated chain is validated'],
    specs: [['Form', 'About 86 mm across and 28 mm high; mounting orientation and acoustic vent still to verify', 'T'], ['Power', '5 V, 1 A from an approved external supply; a PoE variant only after a redesign', 'T'],
      ['Power budget', 'Design peak 2.43 W with a 20 % contingency, against 5.00 W available', 'C'], ['Sensors', 'Temperature and humidity; a calibrated microphone candidate; optional light and occupancy', 'T'],
      ['Audio', 'No meeting audio is kept by default; metrics are derived on the device', 'T'], ['Time', 'Correlating events needs UTC sync; coherent acoustic tests need a more exact synchronized method', 'T'],
      ['Transport', 'Wired preferred for synchronized studies; a wireless variant only with radio approvals', 'T'], ['Environment', '0–40 °C indoor as the baseline target', 'T'],
      ['Maintenance', 'A calibration record, a physically identifiable asset ID, and drift detection', 'T']] },
];
const WITHOUT = ['Enterprise asset records: every room, device and position', 'Commissioning workflows, from adaptive test plans to acceptance', 'Search Party: people, assets, rooms and who can help', 'ServiceHands work orders and dispatch', 'Lite: the room in 3D, designed and as built', 'Assurance: accepted baselines and drift', 'Health from vendor and management interfaces you authorize', 'Issue Intelligence and analytics', 'Learn and SIGNAL'];
const WITH = ['Local sensor observations from the room itself', 'Environmental data that does not depend on any device vendor', 'More local context where the site supports it', 'Processing at the edge, close to the equipment', 'Observations buffered through a network outage', 'Measurements across a room’s zones', 'Evidence attributed to a specific piece of hardware', 'Potentially deeper commissioning and Assurance validation'];
const WHY: { k: string; title: string; story: string; fits: string; limit: string }[] = [
  { k: 'A', title: 'One room', story: 'An organization wants a compact, approved local diagnostic interface in a single room.', fits: 'Nano, if the room’s host computer supports it.', limit: 'A certified, locked-down meeting-room host may not allow it. Then the room’s own management interface, or an Edge, is the route.' },
  { k: 'B', title: 'A shared rack', story: 'One rack holds several managed devices that serve many rooms.', fits: 'One Edge as the local observation and integration point.', limit: 'Each device and each vendor interface still needs explicit approval and testing. An Edge does not reach every VLAN by itself.' },
  { k: 'C', title: 'A large town hall', story: 'Distributed loudspeakers, microphones, cameras, processing and several audience zones.', fits: 'An Edge, with Pulse nodes in the zones that matter.', limit: 'Acoustic results need a validated, calibrated measurement chain. Until then Pulse reports environmental data and design targets.' },
  { k: 'D', title: 'A network-limited site', story: 'The upstream connection drops from time to time.', fits: 'Edge buffers approved observations and forwards them when the link returns.', limit: 'Buffering covers a bounded window; quotas, retention and storage size are site decisions.' },
  { k: 'E', title: 'Independent verification', story: 'An authorized engineer needs evidence from a sensor, not only a vendor’s own report of device health.', fits: 'Pulse or Nano observations, tied to the room and asset.', limit: 'An observation is evidence of what that sensor saw, with its method and calibration — not proof of the whole room.' },
  { k: 'F', title: 'Lifecycle intelligence', story: 'What FieldLink observes becomes part of the room’s history.', fits: 'Observations can contribute to Field Intelligence, Assurance and Core Replay.', limit: 'The ingestion interfaces are proposed designs, not deployed services.' },
  { k: 'G', title: 'An MSP or enterprise operations team', story: 'A provider wants consistent observability across chosen customer sites.', fits: 'A standardized, approved hardware package across those sites.', limit: 'Coverage depends on each customer’s authorization and on which devices allow it. No outcome is promised.' },
];
const COMPARE: [string, string, string, string][] = [
  ['Connectivity', 'USB-C to an approved host', '1 GbE with PoE+ in; read-only collectors out', 'Wired to an Edge or supply; wireless only after approvals'],
  ['Where it goes', 'A host computer or a technician’s kit', 'A rack or a room', 'Zones of a larger room'],
  ['Power', 'USB bus power, ≤ 0.5 A after enumeration', 'PoE+ (IEEE 802.3at), 25.5 W module', '5 V, 1 A external supply'],
  ['Senses', 'Optional environment, motion, audio level', 'The devices it is authorized to read', 'Environment; acoustic metrics as a target'],
  ['Role', 'Portable local diagnostics', 'Local gateway, buffer and adapter host', 'Distributed observations across zones'],
  ['Main limit', 'Needs a host that permits it', 'Needs each device and vendor approved', 'Acoustic claims need a validated calibration chain'],
  ['Proposed price', '$249', '$1,499', '$499'],
];
const LIFE: { step: string; body: string; kind: string }[] = [
  { step: 'Without FieldLink', body: 'Empathia already reads the room’s authorized management interfaces, the records people enter, imported documentation and commissioning evidence.', kind: 'what exists today, on synthetic data' },
  { step: 'An Edge is installed', body: 'In the rack, enrolled to the tenant with its own identity; only the devices the site approves are in its scope.', kind: 'proposed design' },
  { step: 'Pulse nodes in the zones', body: 'Placed where the audience sits; each knows its room and zone.', kind: 'proposed design' },
  { step: 'An observation is made', body: 'Signed, time-stamped, with its method and calibration — or marked uncalibrated.', kind: 'a real observation, once hardware exists; simulated until then' },
  { step: 'Field Intelligence receives it', body: 'Normalized, with its source and freshness; a candidate alert, never an automatic action.', kind: 'proposed interface' },
  { step: 'Lite shows where', body: 'The sensor’s position in the room’s 3D model; the approved geometry is not edited.', kind: 'proposed interface' },
  { step: 'Assurance compares', body: 'Against the accepted baseline: a difference is drift against something known, labelled modeled or verified as it really is.', kind: 'modeled, or verified with a validated method' },
  { step: 'Core Replay keeps it', body: 'In the room’s history, with its provenance, beside every earlier baseline.', kind: 'proposed interface' },
  { step: 'ServiceHands and Search Party', body: 'An authorized person links it to a work order; Search Party finds who is responsible for that room.', kind: 'an authorized action by a person' },
];

export const fieldlinkPage = (demo: (href?: string) => string) => ({
  path: '/fieldlink', title: 'FieldLink, optional hardware (concept) — Empathia Technologies', script: 'fieldlink.js',
  description: 'FieldLink Nano, Edge and Pulse: a concept family of optional devices that would let Empathia observe and verify more of a room locally. Empathia is complete without them. Concept reference design, Rev 0.9; prices proposed and illustrative.',
  body: (
    <div data-fieldlink>
      <section className="fl-hero" aria-labelledby="fl-h"><div className="wrap fl-hero__grid">
        <div className="fl-hero__copy">
          <p className="label">Empathia FieldLink · concept · Rev 0.9</p>
          <h1 id="fl-h">FieldLink</h1>
          <p className="fl-hero__sub">Physical intelligence for intelligent spaces.</p>
          <p className="lede">Three optional devices that would let Empathia observe and verify more of a room on its own: a portable diagnostic, a local gateway and distributed sensors. Empathia is a complete software platform without them.</p>
          <div className="actions"><a className="btn btn--primary" href="#family">See the three devices</a><a className="btn" href="#optional">Do I need FieldLink?</a><a className="btn btn--ghost" href="#specs">Specifications</a></div>
          <p className="fl-status" data-fl-status><b>Concept reference design.</b> No FieldLink unit has been built, certified or priced by a supplier. Prices are proposed and illustrative. The pictures are concept renders.</p>
        </div>
        <figure className="fl-hero__fig">
          <picture><source type="image/webp" srcSet="/media/fieldlink/family-prices-640.webp 640w, /media/fieldlink/family-prices-960.webp 960w, /media/fieldlink/family-prices-1600.webp 1600w" sizes="(max-width: 900px) 100vw, 56vw" />
            <img src="/media/fieldlink/family-prices-960.jpg" srcSet="/media/fieldlink/family-prices-640.jpg 640w, /media/fieldlink/family-prices-960.jpg 960w, /media/fieldlink/family-prices-1600.jpg 1600w" sizes="(max-width: 900px) 100vw, 56vw" width={1600} height={816} alt="Concept image of the three FieldLink devices on a dark surface, each with its card. Nano, USB-C, compatible hosts: proposed $249, portable diagnostics. Edge, PoE, rack and room gateway: proposed $1,499, local intelligence hub. Pulse, distributed room sensors: proposed $499, distributed environmental sensing. Optional hardware: Empathia software works independently. Concept products and illustrative prices." fetchPriority="high" /></picture>
          <figcaption>Concept image, not a photograph of manufactured hardware. Prices are proposed and illustrative.</figcaption>
        </figure>
      </div></section>

      <section className="section fl-optional" id="optional" aria-labelledby="fl-opt"><div className="wrap">
        <p className="eyebrow">Do I need FieldLink to use Empathia?</p>
        <h2 id="fl-opt" data-fl-answer>No. FieldLink is optional.</h2>
        <p className="lede">Empathia works through the interfaces, records and evidence an organization already has and authorizes. FieldLink extends what the platform can observe. It does not unlock the software.</p>
        <div className="fl-vs">
          <div className="fl-vs__col"><h3>Empathia without FieldLink</h3><p className="fl-vs__k">Complete on its own</p><ul>{WITHOUT.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="fl-vs__col fl-vs__col--with"><h3>With FieldLink, where a site authorizes it</h3><p className="fl-vs__k">Everything on the left, plus</p><ul>{WITH.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </div></section>

      <section className="section fl-family" id="family" aria-labelledby="fl-fam"><div className="wrap">
        <p className="eyebrow">The family</p><h2 id="fl-fam">Three devices, three places in a building</h2>
        <ul className="fl-cards">{DEVICES.map((d) => <li key={d.id} className="fl-card" id={d.id} data-fl-device={d.id}>
          <img className="fl-card__img" src={`/media/fieldlink/${d.id}-720.webp`} width={d.img.w} height={d.img.h} alt={`Concept render of ${d.name}`} loading="lazy" />
          <div className="fl-card__body">
            <h3>{d.name}</h3><p className="fl-card__tag">{d.tag}</p><p>{d.where}.</p>
            <ul className="fl-card__list">{d.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
            <p className="fl-price"><span className="fl-price__k">Proposed price</span> <b>{d.price}</b> <span className="fl-price__n">illustrative · not for sale</span></p>
            <p className="fl-card__state">Status: concept reference design</p>
            <a className="btn" href={`#spec-${d.id}`}>View specifications</a>
          </div></li>)}</ul>
      </div></section>

      <section className="section fl-turn-s" id="turn" aria-labelledby="fl-turn"><div className="wrap">
        <p className="label">Turn the concepts</p><h2 id="fl-turn">The enclosures, from every side</h2>
        <p className="lede">Only the outer envelope each concept specifies, at its target dimensions. No port, vent, button or interior is drawn, because none is designed yet.</p>
        <figure className="fl-turn" data-turn="">
          <div className="fl-turn__stage">
            <svg viewBox="0 0 400 280" role="img" tabIndex={0} aria-label="FieldLink Edge, concept enclosure" aria-describedby="fl-turn-how"><g>{project(SOLIDS[1]!, POSE.yaw, POSE.pitch).map((f, i) => <polygon key={i} points={f.pts} fill={fillOf(f.shade)} />)}</g></svg>
          </div>
          <div className="fl-turn__controls" data-turn-controls="" hidden>
            <div className="fl-turn__devs" role="group" aria-label="Enclosure">{SOLIDS.map((x) => <button key={x.id} type="button" className="btn" data-turn-dev={x.id} aria-pressed={x.id === 'edge'}>{x.name.replace('FieldLink ', '')}</button>)}</div>
            <div className="fl-turn__acts" role="group" aria-label="Turn">
              <button type="button" className="btn" data-turn-act="left">Turn left</button><button type="button" className="btn" data-turn-act="right">Turn right</button>
              <button type="button" className="btn" data-turn-act="up">Tilt up</button><button type="button" className="btn" data-turn-act="down">Tilt down</button>
              <button type="button" className="btn btn--quiet" data-turn-act="reset">Reset</button>
            </div>
          </div>
          <figcaption><span data-turn-env="">FieldLink Edge: {SOLIDS[1]!.envelope}</span> <span id="fl-turn-how">Drag it, or focus it and use the arrow keys. A concept envelope, not a finished design.</span> <span className="sr" aria-live="polite" data-turn-said=""></span></figcaption>
        </figure>
      </div></section>

      <section className="section" id="why" aria-labelledby="fl-why"><div className="wrap">
        <p className="eyebrow">Why buy FieldLink?</p><h2 id="fl-why">Seven situations, each with its limit</h2>
        <p className="lede">Each scenario names the device that would fit and what it would still not do. None promises a faster repair time, a coverage percentage, an acoustic accuracy or compatibility with every manufacturer.</p>
        <ol className="fl-why">{WHY.map((w) => <li key={w.k} className="fl-why__c"><p className="fl-why__k">Scenario {w.k}</p><h3>{w.title}</h3><p>{w.story}</p><p><b>Fits:</b> {w.fits}</p><p className="fl-why__lim"><b>Limit:</b> {w.limit}</p></li>)}</ol>
      </div></section>

      <section className="section" id="compare" aria-labelledby="fl-cmp"><div className="wrap">
        <p className="eyebrow">Side by side</p><h2 id="fl-cmp">Compare Nano, Edge and Pulse</h2>
        <div className="fl-table-wrap" tabIndex={0} role="region" aria-label="Comparison of FieldLink Nano, Edge and Pulse"><table className="fl-table">
          <thead><tr><th scope="col"><span className="sr">Property</span></th>{DEVICES.map((d) => <th key={d.id} scope="col">{d.name.replace('FieldLink ', '')}</th>)}</tr></thead>
          <tbody>{COMPARE.map(([k, ...v]) => <tr key={k}><th scope="row">{k}</th>{v.map((x, i) => <td key={i}>{x}</td>)}</tr>)}</tbody>
        </table></div>
        <p className="note">All values are design targets or worked examples from the FieldLink engineering dossier (Rev 0.9), not measurements of a built unit.</p>
      </div></section>

      <section className="section" id="how" aria-labelledby="fl-how"><div className="wrap">
        <p className="eyebrow">How it would fit</p><h2 id="fl-how">The life of one observation</h2>
        <p className="lede">Each step says what kind of evidence it is. A real observation, a simulated scenario, a modeled prediction and a verified measurement are never shown as the same thing.</p>
        <svg className="fl-arch" viewBox="0 0 960 150" role="img" aria-label="Architecture: the physical layer (AV and UC equipment, networks, rooms) feeds the FieldLink layer (Nano on an approved host, Edge as a scoped gateway, Pulse in sensor zones), which sends signed, buffered events to the Empathia core (device registration, identities, evidence ledger, tenant authorization), which serves the products (Lite and Core Replay, Assurance and Field Intelligence, ServiceHands and Search Party, Pro, APEX and Learn).">
          {[['Physical layer', 'Equipment · networks · rooms'], ['FieldLink layer', 'Nano · Edge · Pulse'], ['Empathia core', 'Identity · evidence ledger · authorization'], ['Products', 'Lite · Assurance · Core Replay · ServiceHands']].map(([t, s], i) => <g key={t} transform={`translate(${10 + i * 240},20)`}><rect width={200} height={100} rx={14} className={`fl-arch__box${i === 1 ? ' fl-arch__box--fl' : ''}`} /><text x={100} y={44} className="fl-arch__t">{t}</text><text x={100} y={70} className="fl-arch__s">{s}</text>{i < 3 && <path d="M206 50 h28 m-8 -6 l8 6 l-8 6" className="fl-arch__a" />}</g>)}
        </svg>
        <ol className="fl-life">{LIFE.map((l, i) => <li key={l.step}><span className="fl-life__n" aria-hidden="true">{i + 1}</span><div><h3>{l.step}</h3><p>{l.body}</p><p className="fl-life__k">{l.kind}</p></div></li>)}</ol>
        <div className="actions"><a className="btn btn--primary" href={demo('#/v25/fi')}>Open Field Intelligence in the demonstration</a><a className="btn" href={demo('#/replay/R-ATL-4-218')}>See a room’s history in Core Replay</a></div>
        <p className="note">The demonstration runs on synthetic data, without FieldLink: it shows the software that observations would feed, not a FieldLink device.</p>
      </div></section>

      <section className="section fl-specs" id="specs" aria-labelledby="fl-sp"><div className="wrap">
        <p className="eyebrow">For engineers</p><h2 id="fl-sp">Specifications, as design targets</h2>
        <p className="lede">Every value carries its class from the engineering dossier: <Kl c="V" /> {CLS.V.toLowerCase()}, <Kl c="C" /> {CLS.C.toLowerCase()}, <Kl c="T" /> {CLS.T.toLowerCase()}. None is a manufacturing tolerance.</p>
        {DEVICES.map((d) => <details key={d.id} className="fl-spec" id={`spec-${d.id}`} data-fl-spec={d.id}><summary><b>{d.name}</b> <span>{d.tag}</span></summary>
          <dl className="fl-spec__dl">{d.specs.map(([k, v, c]) => <div key={k}><dt>{k}</dt><dd>{v} <Kl c={c} /></dd></div>)}<div><dt>Development status</dt><dd>Concept reference design, Rev 0.9. No prototype, bench measurement, certification or supplier quotation exists.</dd></div><div><dt>Proposed price</dt><dd>{d.price}, illustrative</dd></div></dl></details>)}
        <h3 className="fl-sub">What every unit must do</h3>
        <ul className="fl-reqs">{[
          ['SYS-01', 'A unique cryptographic identity and controlled enrollment to one tenant'], ['SYS-02', 'Every measurement carries its source, UTC time, confidence, method, calibration and room or asset'],
          ['SYS-03', 'Collection is passive and privacy-preserving by default'], ['SYS-04', 'An offline buffer with sequence numbers and recovery that never duplicates'],
          ['SYS-05', 'Only authorized, scoped device interfaces and site-approved network probes'], ['SYS-06', 'No arbitrary commands, no keyboard injection, nothing disruptive by default'],
          ['SYS-07', 'No measurement claim without its method and an appropriate calibration'], ['SYS-08', 'Sensor, gateway and firmware status visible in Empathia'],
        ].map(([k, v]) => <li key={k}><b>{k}</b> {v}</li>)}</ul>
        <h3 className="fl-sub">What an acoustic result would need</h3>
        <div className="fl-table-wrap" tabIndex={0} role="region" aria-label="Acoustic validation levels"><table className="fl-table">
          <thead><tr><th scope="col">Level</th><th scope="col">The claim it permits</th><th scope="col">The evidence it needs</th></tr></thead>
          <tbody>{[['A · Ambient', 'Noise level and environmental trend, if calibrated', 'A calibrated response and noise-floor test'], ['B · Coverage', 'Spatially sampled response under controlled excitation', 'Source positions, microphone placements, timing and uncertainty'], ['C · RT60', 'Reverberation, by an appropriate validated procedure', 'Suitable excitation and decay, standard-compliant processing'], ['D · STI', 'Speech transmission index per IEC 60268-16', 'A validated meter or method, signal, conditions and report']].map(([a, b, c]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>)}</tbody></table></div>
        <p className="note">An ordinary MEMS microphone is not a calibrated speech-intelligibility instrument. Pulse’s acoustic capability stays a design target until a validated measurement chain exists.</p>
      </div></section>

      <section className="section" id="pricing" aria-labelledby="fl-pr"><div className="wrap">
        <p className="eyebrow">Pricing, plainly</p><h2 id="fl-pr">What a proposed price would and would not include</h2>
        <div className="fl-pricing">
          <ul className="fl-pricing__dev">{DEVICES.map((d) => <li key={d.id}><span>{d.name}</span><b>{d.price}</b></li>)}</ul>
          <ul className="fl-pricing__sep">
            <li><b>The device price</b> is for the device. It is a planning assumption, not a supplier-validated production price, and nothing is for sale.</li>
            <li><b>Installation, calibration and support</b> would be separate and optional, quoted for a site.</li>
            <li><b>Empathia’s software</b> is a separate subscription (see <a href="/pricing">pricing</a>). Buying hardware would not include unrestricted or lifetime use of the platform.</li>
            <li><b>Not one Edge per room.</b> How many devices a site needs follows its architecture and support needs.</li>
          </ul>
        </div>
      </div></section>

      <section className="section" aria-labelledby="fl-lim"><div className="wrap fl-limits">
        <p className="eyebrow">Limits</p><h2 id="fl-lim">What this page does not claim</h2>
        <ul>
          <li>No FieldLink unit has been built. There is no prototype, bench power trace, circuit board layout, regulatory certification or supplier quotation.</li>
          <li>The images are AI-generated concept renders of the industrial design, not photographs and not engineering drawings.</li>
          <li>Interfaces, event names and the database design in the dossier are proposals, not deployed services.</li>
          <li>Being able to name a device or a vendor is not proof that its interface, scope or licence is available to FieldLink.</li>
          <li>The engineering dossier, blueprints and financial model are not published. Qualified reviewers can ask for them.</li>
        </ul>
      </div></section>

      <section className="band"><div className="wrap"><h2>Interested in FieldLink?</h2><p>The next step is a scoped feasibility prototype with a design partner, on one to three rooms. Write to us through the contact page and say that your message is about FieldLink.</p><div className="actions"><a className="btn btn--primary btn--lg" href="/contact">Contact us</a><a className="btn btn--lg" href={demo('#/investor')}>Explore the software it extends</a></div></div></section>
    </div>
  ),
});
