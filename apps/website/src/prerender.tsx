// Build-time renderer: one static HTML document per page (SEO, fast first paint, no JavaScript needed to read the site).
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGES } from './content.js';
import { Shell } from './site.js';
export function renderPage(path: string, opts: { api?: string | null; base?: string } = {}): { html: string; title: string } {
  const page = PAGES.find((p) => p.path === path); if (!page) throw new Error('no page ' + path);
  const body = renderToStaticMarkup(<Shell page={page}>{page.body}</Shell>);
  const canonical = (opts.base || '') + page.path;
  const html = `<!doctype html>
<html lang="en" data-theme="dark"${opts.api ? ` data-api="${opts.api}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:type" content="website">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="stylesheet" href="/site.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Empathia Technologies', url: opts.base || undefined, description: 'Empathia Living Campus: an operating platform for enterprise AV, collaboration and workplace technology.' })}</script>
</head>
<body>${body}<script src="/site.js" defer></script></body>
</html>
`;
  return { html, title: page.title };
}
export const PATHS = PAGES.map((p) => p.path);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
