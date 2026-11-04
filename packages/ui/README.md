# @empathia/ui

React components and their CSS for Empathia surfaces, built on `@empathia/design-tokens`. Consumed from source by the apps' bundlers
(`apps/enterprise-web/build.mjs` aliases `@empathia/ui` to `src/index.ts`).

| File | What |
|---|---|
| `src/components.tsx` | Button, Badge, StatusBadge, Tag, Loading, Empty, ErrorState, Notice, Stat, Composition, DataTable, Field, Tabs, Drawer, Facts |
| `src/status.ts` | status vocabulary: RESULT (no bare PASS), LIFECYCLE, SEVERITY, INTEGRATION, LIVE — glyph + label + tone + help |
| `src/theme.tsx` | `ThemeSwitch` (System / Light / Dark radio group), `useTheme`, `applyThemeChoice`, `readThemeChoice` — key `empathia.theme`; pair with `@empathia/design-tokens/theme-init.js` in `<head>` for no flash (D9) |
| `src/products.ts` | the nine products in the canonical order (D37): id, name, `--p-*` colour, one-line purpose, the apps each owns (Scouter in Lite, D41); `checkProductOrder(names)` for surface suites; drift test `test/products.test.mjs` |
| `src/ui.css` | component styles (`ui-` prefix), tokens only |
| `src/kit.tsx`, `src/kit.css`, `src/icons.tsx` | the uplift kit (PageHero, Card, StatTile, ScoreRing, Donut, Sparkline, ProgressBar, Chip, StatusDot, Segmented, KitTabs, ListRow, EmptyState, Toast, Icon) — see `README-kit.md` |
| `gallery/` | the Storybook-equivalent reference: `node packages/ui/gallery/build.mjs` → `gallery/dist/index.html`; `node packages/ui/gallery/check.mjs` → `GALLERY_CHECK.json` and screenshots in `media/screenshots/design-system/`; `PALETTE_CHECK.json` records the dataviz palette validation (FAIL — see the file) |

Type-check: `node node_modules/typescript/bin/tsc -p packages/ui/tsconfig.json --noEmit` (and `-p packages/ui/gallery/tsconfig.json`).
Design rules and props: `docs/design-system/DESIGN_SYSTEM.md`, `docs/frontend/FRONTEND_ENGINEERING.md`.
