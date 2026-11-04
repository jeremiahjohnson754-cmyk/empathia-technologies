/**
 * Empathia UI gallery — the Storybook-equivalent reference for @empathia/ui (built offline with esbuild; Storybook is not
 * installable in this build environment). Every component in src/components.tsx is shown in its states, every status value of
 * src/status.ts is shown as a badge, and the token sheet lists every CSS variable of @empathia/design-tokens.
 * Synthetic content only. Build: node packages/ui/gallery/build.mjs → packages/ui/gallery/dist/index.html
 */
import { StrictMode, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { KitGallery } from './kit-gallery.js';
import {
  Badge, Button, Composition, DataTable, Drawer, Empty, ErrorState, Facts, Field, Loading, Notice, Stat, StatusBadge, Tabs, Tag,
  RESULT, LIFECYCLE, SEVERITY, INTEGRATION, LIVE, type Column, type Tone,
} from '@empathia/ui';

declare const __TOKENS__: Array<{ name: string; light: string; dark: string }>;
const TOKENS = __TOKENS__;

function Section({ id, title, children, note }: { id: string; title: string; children?: ReactNode; note?: string }) {
  return (
    <section className="g-sec" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {note ? <p className="g-note">{note}</p> : null}
      <div className="g-body">{children}</div>
    </section>
  );
}
const Row = ({ children, label }: { children?: ReactNode; label?: string }) => <div className="g-row">{label ? <span className="g-lbl">{label}</span> : null}{children}</div>;

interface Asset { id: string; label: string; cat: string; result: string; n: number }
const ASSETS: Asset[] = [
  { id: 'PA-0001', label: 'Display 1', cat: 'display', result: 'PASS_VERIFIED', n: 3 },
  { id: 'PA-0002', label: 'Camera 1', cat: 'camera', result: 'PASS_UNVERIFIED', n: 1 },
  { id: 'PA-0003', label: 'Ceiling microphone 1', cat: 'micceil', result: 'FAIL', n: 2 },
  { id: 'PA-0004', label: 'Touch panel 1', cat: 'touch', result: 'NOT_TESTED', n: 0 },
];
const COLS: Column<Asset>[] = [
  { key: 'id', header: 'Asset', render: (r) => <span className="g-mono">{r.id}</span>, sort: (r) => r.id },
  { key: 'label', header: 'Device', render: (r) => r.label, sort: (r) => r.label },
  { key: 'cat', header: 'Category', render: (r) => <Tag>{r.cat}</Tag>, sort: (r) => r.cat },
  { key: 'res', header: 'Result', render: (r) => <StatusBadge table={RESULT} value={r.result} />, sort: (r) => r.result },
  { key: 'n', header: 'Evidence', render: (r) => r.n, sort: (r) => r.n, align: 'right' },
];

type Theme = 'system' | 'light' | 'dark';
function setTheme(t: Theme) { if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

function Gallery() {
  const [theme, setT] = useState<Theme>((new URLSearchParams(location.search).get('theme') as Theme) || 'system');
  const [tab, setTab] = useState('overview');
  const [drawer, setDrawer] = useState(new URLSearchParams(location.search).get('drawer') === 'open');
  const [name, setName] = useState('');
  const pick = (t: Theme) => { setT(t); setTheme(t); };
  setTheme(theme);
  const tones: Tone[] = ['ok', 'warn', 'bad', 'info', 'accent', 'muted'];
  return (
    <>
      <a className="g-skip" href="#g-main">Skip to the components</a>
      <header className="g-head">
        <div><h1>Empathia UI</h1><p className="g-note">@empathia/ui components over @empathia/design-tokens · synthetic content · reference for engineers</p></div>
        <div role="radiogroup" aria-label="Theme" className="g-theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => <button key={t} type="button" role="radio" aria-checked={theme === t} className={`ui-btn ui-btn--sm ${theme === t ? 'ui-btn--primary' : 'ui-btn--secondary'}`} onClick={() => pick(t)} data-theme-pick={t}>{t[0]!.toUpperCase() + t.slice(1)}</button>)}
        </div>
      </header>
      <nav className="g-toc" aria-label="Sections">{['kit', 'buttons', 'status', 'tags', 'states', 'figures', 'table', 'forms', 'tabs', 'drawer', 'facts', 'tokens'].map((s) => <a key={s} href={`#${s}`}>{s}</a>)}</nav>
      <main id="g-main" tabIndex={-1}>
        <Section id="kit" title="Kit (QUALITY_UPLIFT)" note="PageHero · Card · StatTile · ScoreRing · Donut · Sparkline · ProgressBar · MeterRow · Chip · StatusDot · Segmented · KitTabs · ListRow · EmptyState · Toast with Undo · DataTable responsive · Icon — packages/ui/README-kit.md">
          <KitGallery />
        </Section>
        <Section id="buttons" title="Button" note="kind: primary | secondary | quiet | danger · small · busy (aria-busy, spinner, disabled while busy) · disabled">
          <Row label="default"><Button kind="primary">Save changes</Button><Button>Cancel</Button><Button kind="quiet">Show details</Button><Button kind="danger">Remove device</Button></Row>
          <Row label="small"><Button kind="primary" small>Verify</Button><Button small>Record</Button><Button kind="quiet" small>Assign</Button><Button kind="danger" small>Remove</Button></Row>
          <Row label="busy / disabled"><Button kind="primary" busy>Saving</Button><Button disabled>Not allowed</Button><Button kind="primary" disabled title="Your role cannot approve">Approve design</Button></Row>
        </Section>

        <Section id="status" title="Status badges" note="Every status shows a glyph and a word; colour is never the only signal. There is no bare PASS: a pass is verified (✓✓) or awaiting verification (✓).">
          {([['Commissioning result', RESULT], ['Room lifecycle', LIFECYCLE], ['Issue severity', SEVERITY], ['Integration maturity', INTEGRATION], ['Live health', LIVE]] as const).map(([label, table]) => (
            <Row key={label} label={label}>{Object.keys(table).map((k) => <StatusBadge key={k} table={table} value={k} />)}</Row>))}
          <Row label="compact (glyph + screen-reader text)">{Object.keys(RESULT).map((k) => <StatusBadge key={k} table={RESULT} value={k} compact />)}</Row>
          <Row label="unknown value"><StatusBadge table={RESULT} value="SOMETHING_NEW" /><Badge spec={{ label: 'Custom', glyph: '◆', tone: 'accent', help: 'a custom spec' }} /></Row>
        </Section>

        <Section id="tags" title="Tag" note="Monospace category or state labels. Tones: ok | warn | bad | info | accent | muted.">
          <Row>{tones.map((t) => <Tag key={t} tone={t}>{t}</Tag>)}<Tag>display</Tag><Tag tone="info">signal</Tag></Row>
        </Section>

        <Section id="states" title="Loading, empty, error and notice states" note="Every async surface has all three states. Errors name what went wrong, list the server's reasons, and give the correlation id; they never apologise.">
          <div className="g-grid">
            <Loading label="Loading R-PLN-0001" />
            <Empty title="No rooms yet" action={<Button kind="primary" small>New room</Button>}>Create one from a template to start a design.</Empty>
            <ErrorState error={{ status: 403, code: 'forbidden', detail: 'designer may not move a room to DESIGN_APPROVED (needs room.design.approve)', correlationId: 'corr-7f3a9c21' }} />
            <ErrorState error={{ status: 404, code: 'not_found', detail: 'room R-PLN-0099 not found', correlationId: 'corr-0b11d2e4' }} />
            <ErrorState error={{ status: 422, code: 'rule_refused', detail: 'the room classification is not approved by an engineer', reasons: ['the room classification is not approved by an engineer', '1 open High/Critical design deficiencies', 'no saved revision'], correlationId: 'corr-5c66e0a8' }} retry={() => undefined} />
            <ErrorState error={{ message: 'Network request failed' }} retry={() => undefined} />
          </div>
          <Row label="notice">{(['info', 'ok', 'warn', 'bad', 'muted'] as Tone[]).map((t) => <Notice key={t} tone={t}>A {t} notice: synthetic data, not production-ready.</Notice>)}</Row>
        </Section>

        <Section id="figures" title="Figures" note="Stat shows “—” (not 0) when nothing was measured. Composition is a part-of-whole bar whose numbers are always in the text legend.">
          <div className="g-stats">
            <Stat label="Rooms" value={4} />
            <Stat label="Commissioning coverage" value={3.1} unit="%" definition="tests with any recorded result ÷ applicable tests" />
            <Stat label="Open high/critical issues" value={1} tone="bad" />
            <Stat label="Mean time to resolve" value={null} unit="h" definition="no deficiency resolved yet" />
          </div>
          <Composition label="Applicable tests by result" total={65} parts={[
            { key: 'v', label: 'Passed, verified', value: 2, tone: 'ok' }, { key: 'u', label: 'Awaiting verification', value: 1, tone: 'info' },
            { key: 'f', label: 'Failed', value: 1, tone: 'bad' }, { key: 'o', label: 'Not supported / inconclusive', value: 1, tone: 'warn' }, { key: 'n', label: 'Not tested', value: 60, tone: 'muted' }]} />
        </Section>

        <Section id="table" title="DataTable" note="Sortable headers are buttons (aria-sort reflects the order); numbers are tabular; rows with onRowClick also carry a link in their first cell for keyboard users.">
          <DataTable rows={ASSETS} columns={COLS} rowKey={(r) => r.id} caption="Devices (synthetic)" />
          <DataTable dense rows={ASSETS.slice(0, 2)} columns={COLS} rowKey={(r) => r.id} caption="Dense" />
          <DataTable rows={[] as Asset[]} columns={COLS} rowKey={(r) => r.id} empty={<Empty title="No devices">Add a device from the palette.</Empty>} />
        </Section>

        <Section id="forms" title="Field" note="The label is a real <label>; hint and error are linked with aria-describedby; error replaces hint.">
          <div className="g-grid">
            <Field label="Room name" hint="Up to 80 characters">{(id, d) => <input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} placeholder="Northstar Huddle 1.04" />}</Field>
            <Field label="Template">{(id) => <select id={id} defaultValue="huddle"><option value="huddle">huddle</option><option value="boardroom">boardroom</option><option value="townhall">townhall</option></select>}</Field>
            <Field label="Length (m)" error="not readable — use metres, feet, or feet and inches like 24' 6&quot;">{(id, d) => <input id={id} aria-describedby={d} aria-invalid="true" defaultValue="twelve" />}</Field>
            <Field label="Reason" hint="At least 10 characters; kept with the approval">{(id, d) => <textarea id={id} aria-describedby={d} rows={2} />}</Field>
          </div>
        </Section>

        <Section id="tabs" title="Tabs" note="Roving tabindex: Tab enters the tab list at the selected tab; ← and → move between tabs (WAI-ARIA tabs pattern).">
          <Tabs label="Room sections" active={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'devices', label: 'Devices', count: 7 }, { key: 'issues', label: 'Issues', count: 1 }, { key: 'commissioning', label: 'Commissioning', count: 65 }]} />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="g-panel">Panel: {tab}</div>
        </Section>

        <Section id="drawer" title="Drawer" note="Modal side panel: focus moves inside, Tab is trapped, Esc or the scrim closes it, focus returns to the opener.">
          <Row><Button kind="primary" onClick={() => setDrawer(true)}>Open drawer</Button></Row>
          <Drawer open={drawer} title="Record Power budget" onClose={() => setDrawer(false)} footer={<><Button onClick={() => setDrawer(false)}>Cancel</Button><Button kind="primary">Record result</Button></>}>
            <Notice tone="muted">A PASS is recorded as “awaiting verification” until a different person verifies it.</Notice>
            <Field label="Outcome">{(id) => <select id={id}><option>PASS</option><option>FAIL</option><option>NOT_SUPPORTED</option><option>INCONCLUSIVE</option></select>}</Field>
            <Field label="Evidence file" hint="Stored by SHA-256">{(id, d) => <input id={id} aria-describedby={d} type="file" />}</Field>
          </Drawer>
        </Section>

        <Section id="facts" title="Facts" note="Definition list for record headers; a missing value shows “—”.">
          <Facts items={[['Template', 'huddle'], ['Intended use', 'Small-team hybrid meetings'], ['People', 4], ['Size', '3.6 × 3.0 m'], ['Approved type', null], ['Applicable tests', '65 of 94']]} />
        </Section>

        <Section id="tokens" title="Design tokens" note="Every custom property of packages/design-tokens/dist/tokens.css with its light and dark value. The swatch column uses the live variable, so it follows the theme switch.">
          <div className="ui-table-wrap"><table className="ui-table ui-table--dense g-tokens">
            <caption className="ui-sr">Design tokens</caption>
            <thead><tr><th scope="col">Token</th><th scope="col">Live</th><th scope="col">Light</th><th scope="col">Dark</th></tr></thead>
            <tbody>{TOKENS.map((t) => (
              <tr key={t.name}><td className="g-mono">{t.name}</td><td>{specimen(t.name)}</td><td className="g-mono">{t.light}</td><td className="g-mono">{t.dark}</td></tr>))}</tbody>
          </table></div>
        </Section>
      </main>
      <footer className="g-foot">Empathia UI gallery · built from packages/ui/src · synthetic content · not production-ready</footer>
    </>
  );
}

function specimen(name: string): ReactNode {
  const v = `var(${name})`;
  if (/^--(bg|bg2|panel|panel2|line|line2|tx|tx2|tx3|accent|accent-bg|indigo|violet|ok|warn|bad|info|ev-)/.test(name)) return <span className="g-swatch" style={{ background: v }} aria-hidden="true" />;
  if (name.startsWith('--fs-')) return <span style={{ fontSize: v }}>Aa 123</span>;
  if (name.startsWith('--font-')) return <span style={{ fontFamily: v }}>Room R-PLN-0001</span>;
  if (name.startsWith('--sp-')) return <span className="g-space" style={{ width: v }} aria-hidden="true" />;
  if (name.startsWith('--r-')) return <span className="g-radius" style={{ borderRadius: v }} aria-hidden="true" />;
  if (name === '--shadow') return <span className="g-radius" style={{ boxShadow: v }} aria-hidden="true" />;
  return <span className="g-mono">—</span>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Gallery /></StrictMode>);
