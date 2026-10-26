import { productBySlug } from '../data/products';
import { SCENARIOS } from '../data/scenarios';
import { DemoFrame } from '../components/DemoFrame';
import { Facts } from './ProductPage';
import { EngineLab } from './EngineLab';
import { href, useRoute } from '../lib/router';

const OUTSIDE: Array<[string, string]> = [
  ['Physical validation', 'No test has been executed on real equipment. Every applicable test is PENDING_INFORMATION, BLOCKED_BY_PREREQUISITE or REQUIRES_PHYSICAL_EXECUTION; a result can only come from a person recording field evidence, and PASS_VERIFIED needs a second person.'],
  ['Post-installation drift', 'A planned room never becomes operational in the demonstrator: OPERATIONAL needs live monitoring evidence on the installed room. Drift against an accepted baseline is Assurance’s job once a room is real.'],
  ['Drawing formats', 'The drawing set is generated from the design (plan, placement, schedule, relationships, signal flow, network, summary). CAD, BIM, DWG and IFC import or extraction are not implemented.'],
  ['Photo dimensions', 'A room from a photo carries template dimensions labelled PHOTO_INFERRED; the engine treats them as missing facts (audit F-01).'],
  ['3D', 'The 3D view is a browser view generated in code, not Unreal Engine 5.'],
  ['Server authority', 'In the demonstrator every rule runs in the page. The production starter (Enterprise Platform) runs the same engine server-side with authenticated users.'],
];

export function BuildARoom() {
  const r = useRoute();
  const p = productBySlug('lite')!;
  const tab = r.sub || 'live';
  const town = SCENARIOS.find((s) => s.id === 'townhall')!;
  const tabs: Array<[string, string]> = [['live', 'Live room builder'], ['townhall', 'Town hall walkthrough'], ['lab', 'Engine Lab'], ['outside', 'What is outside the demonstrator']];
  return (
    <>
      <div className="page-head">
        <h1>Build a Room with Lite</h1>
        <p>Design a space, place and swap equipment, and watch the same canonical room reach drawings, commissioning, Search Party and Pro — with nothing passed and no live health invented.</p>
      </div>
      <nav className="tabs" aria-label="Build a Room">
        {tabs.map(([k, l]) => <a key={k} href={href('build-a-room', k === 'live' ? '' : k)} aria-current={tab === k ? 'page' : undefined}>{l}</a>)}
      </nav>
      {tab === 'live' && (
        <div className="split">
          <DemoFrame routes={['#/v25/build', '#/v25/lite', '#/pro/planned', '#/search']} persona="designer" title="Build a Room" />
          <Facts p={{ ...p, name: 'Build a Room', whatWorks: ['15 templates; feet-and-inches or metres; drawn or typed outlines', 'photo and scaled-plan imports (stay in the browser)', '2D editor with drag and keyboard; browser 3D view', 'classification with an engineer override; Engineer Mode', 'drawing set with revision checks; device schedule', '94-definition applicability; workbook as JSON, CSV and .xlsx', 'Search Party and Pro: PLANNED — NOT YET COMMISSIONED', 'correlated issues; ServiceHands, APEX and Assurance hand-offs; versioned revisions; a guided tour'], simulatedOrMissing: OUTSIDE.map(([k]) => k.toLowerCase()) }} />
        </div>
      )}
      {tab === 'townhall' && (
        <div className="stack">
          <p className="muted">{town.why} About {town.minutes} minutes. <a href={href('scenarios', 'townhall')}>Play it step by step</a> — each step opens the right page as the right persona.</p>
          <ol className="steps">{town.steps.map((s) => <li key={s.title} className="step"><div><b>{s.title}</b><p>{s.doThis}</p><p className="look">Look for: {s.lookFor}</p></div><span className="faint mono">{s.verify ?? ''}</span></li>)}</ol>
        </div>
      )}
      {tab === 'lab' && <EngineLab />}
      {tab === 'outside' && (
        <div className="cols-2">{OUTSIDE.map(([k, v]) => <div key={k} className="panel pad stack"><h3>{k}</h3><p className="muted">{v}</p></div>)}</div>
      )}
    </>
  );
}
