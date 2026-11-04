# Empathia brand assets

Cleared for use by the founder (2026-11-03 04:39, decision D39; roles kept on every surface). The SVGs are drawn by
`media/brand/concepts/draw.py` — never edit them by hand. The PNGs and `favicon.svg` are derived by `../make-brand.mjs`. The roles and
the build helpers (`BRAND`, `copyBrand(dest, roles)`, `iconLinks(base)`, `writeManifest`, `injectHead`) are in `../brand.mjs`
(package exports `@empathia/design-tokens/brand` and `@empathia/design-tokens/brand/*`).

## Roles (D39)

| File | Role | Where it may appear |
|---|---|---|
| `emblem.svg` | **the brand emblem**: the flagship aspis, a drafting compass on the round Spartan shield, ≥ 96 px | website lockups (hero or footer, with "THE LIVING SYSTEM"), the about/founder page |
| `emblem-small.svg` | the **small shield**, 16–64 px | browser-tab icons (`favicon.svg` is a copy) and the shell headers of all three surfaces, beside the visible name "Empathia" (decorative, `alt=""`) |
| `app-tile.svg` | the **tile** | app icons only (`apple-touch-icon.png` 180, `icon-192.png`, `icon-512.png`, the web app manifest) |
| `owl.svg` | the **Agora Owl** | not-found and no-access pages only, as a supporting illustration (decorative); it never competes with the emblem |
| `original-mark.svg` | the **original V2.5.3 mark**, kept unchanged | single-colour glyph; history |
| `favicon.svg`, `favicon-32.png` | tab icons | `<head>` of every page (`iconLinks`) |
| `emblem-1024.png` | social cards | `og:image` only; **never loaded by a page** |

War paint (`media/brand/concepts/4-war-paint.svg`) is for marketing only and never appears in a product.

Wordmark: "Empathia" in Inter 800 in headers; "EMPATHIA" in capitals with "THE LIVING SYSTEM" tracked 0.3 em only in lockups, as on the
film end cards. Colours: green `#45cfc1`, ink red `#c1121f`, bronze `#b08442`, black `#121011`.

Not here: `emblem-flat.svg` (flat colour for print), named in the recovered helper, was not among the recovered files; regenerate it
from `draw.py` before adding the role back.
