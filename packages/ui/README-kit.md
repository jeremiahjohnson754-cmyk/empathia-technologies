# @empathia/ui kit (QUALITY_UPLIFT, 2026-11-04)

V2.5.3's composition vocabulary, rebuilt on the design tokens, for every uplift slice. Import from `@empathia/ui`; the styles are
`packages/ui/src/kit.css` (already in the demo's `demo.css` and the gallery). Live reference: `node packages/ui/gallery/build.mjs` →
`packages/ui/gallery/dist/index.html#kit` (both themes, phone width).

## Rules (tested in `packages/ui/test/products.test.mjs`)

- **CSP-safe:** no `style` attribute anywhere — geometry is SVG attributes, colour is classes over tokens. Do the same in pages.
- **Values from data:** pass numbers computed from the demo's records; never type a figure into markup. Missing → `null` (shows "—",
  spoken "no data"), never 0.
- **Never colour-only:** every state has a word and a shape (StatusDot), every chart has a legend with values or an aria summary.
- **Route focus:** the page's h1 (PageHero renders it with `tabIndex={-1}`) receives focus after navigation without a ring; controls
  keep `:focus-visible`.
- **Both themes:** Graphite (deep navy, V2.5.3 aurora) and Paper (cool paper, white panels). Spatial stages keep `data-stage`.

## Tokens added by the navy retune

`--hero-1`, `--hero-2` (hero ground), `--glow-a` (teal glow), `--glow-b` (indigo glow), `--hero-grid`, `--sheen` (panel top highlight).
Teal `--accent` stays the only interaction accent; `--p-<id>` the nine products.

## Series (`tone` on charts, chips, cards, tiles)

`Series = 'ok' | 'warn' | 'bad' | 'info' | 'muted' | 'accent' | 'indigo' | 'violet' | <product id>` → class `kit-s--<series>` sets `--s`.

## Components

| Component | Props (essentials) | Notes |
|---|---|---|
| `PageHero` | `eyebrow, title, lede, actions, meta: ReactNode[], aside, product?, icon?, compact?, level=1` | The gradient card; renders the page's one `h1` (tabIndex -1). `meta` = Chips/StatusDots; `aside` = ScoreRing or tiles. `data-testid="page-hero"` |
| `Card` | `title, sub?, icon?, tone?, action?, footer?, level=2, pad=true, glass?` | `<section aria-labelledby>`; icon in a tinted tile. `pad={false}` for lists; `glass` = translucent blurred layer for cards over a hero or a stage |
| `Panel` | `raised?, glass?, as?` | plain surface, no heading. `.kit-glass` is also usable on its own |
| `StatTile` | `label, value, unit?, delta?: {value, unit?, good:'up'\|'down'\|'none', label?}, spark?: number[], hint?, tone?, icon?, href?, digits?` | Delta: arrow + signed value + spoken "up 2, better/worse" |
| `ScoreRing` | `value, max=100, label, band?, caption?, size=112` | Band from score (85+ healthy, 70+ monitor, else action) unless given |
| `Donut` | `segments: {key,label,value,tone}[], label, total='total', unit?, size=148` | Gaps between segments, total in the middle, legend with value and share |
| `Sparkline` | `values, label, tone?, width, height, area?` | `role="img"` with from/to/low/high summary; <2 values → text |
| `ProgressBar` | `value, max=100, label, tone?, valueText?, small?` | `role="progressbar"` with aria-valuetext |
| `MeterRow` (in `<ul className="kit-meters">`) | `label, value, max, sub?, href?, state?` | Building-health rows: name, bar, value, StatusDot |
| `Chip` | `children, tone?, icon?, selected?, onClick?, href?, small?` | Button chips use `aria-pressed` when `selected` is given |
| `TagChip` | `kind: 'status'\|'room'\|'building'\|'device'\|'role'\|'product', children, state? (status), category? (device), tone?, href?, small=true` | Icon names the kind (device icon from its category via `deviceIcon()`), status tags carry the StatusDot shape; spoken "Room: Atlas 4.218" |
| `StatusDot` | `state: 'healthy'\|'monitor'\|'action'\|'modelled'\|'offline', label?, hideLabel?` | Shapes: dot, half ring, triangle, dashed ring, square. `HEALTH`, `bandOf()` exported |
| `Segmented` | `options, value, onChange, label, small?` | radiogroup, roving focus, arrows/Home/End |
| `KitTabs` + `TabPanel` | `tabs, active, onChange, label, idBase` | tablist wired to panels; arrows/Home/End. (`Tabs` from components.tsx still exists) |
| `List` + `ListRow` | `title, sub?, leading?, trailing?, href?\|onClick?, chevron?, current?` | 52 px rows, chevron when it leads somewhere |
| `EmptyState` | `title, children?, action?, icon='inbox', tone?` | `role="status"` |
| `ToastProvider` + `useToast()` | `toast({ message, tone?, undo?, undoLabel?, duration? })` | One polite live region, max 3, pause on hover/focus, Escape dismisses, Undo announces "Undone." |
| `DataTable` (components.tsx) | `+ responsive?`, column `minor?` | No style attributes now (`<col width>`, `ui-al-r`); `responsive` stacks rows into labelled cards < 640 px; clickable rows are keyboard operable |
| `Icon` | `name: IconName, label?, size=20` | 59 icons (incl. device families display, camera, mic, speaker, control, network, power, furniture; keyboard), 24 grid, 1.75 stroke, currentColor; `ICON_NAMES`. Decorative unless `label` |

Layout helpers in kit.css: `.kit-grid` (auto-fit cards, min 260 px), `.kit-grid--tiles` (min 180 px).

## Example

```tsx
<PageHero eyebrow="Pro · Portfolio" icon="chart" title="Atlas is drifting" lede={`${open} open issues across ${rooms} rooms`}
  meta={[<StatusDot key="m" state="modelled" />]} aside={<ScoreRing value={score} label="Building health" />} />
<div className="kit-grid kit-grid--tiles">
  <StatTile label="Open issues" value={open} icon="alert" tone="warn" delta={{ value: open - lastWeek, good: 'down', label: 'vs last week' }} spark={trend} />
</div>
<Card title="Issues by class" icon="chart"><Donut label="Open issues by class" segments={byClass} total="open" /></Card>
```
