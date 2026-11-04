// Build-time renderer: one static HTML document per page (SEO, fast first paint, no JavaScript needed to read the site), plus the
// not-found document (404.html) served with status 404.
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPages, notFoundPage, type SiteContext, type Page } from './content.js';
import { Shell } from './site.js';
export interface RenderOpts { api?: string | null; base?: string; iconLinks?: string }
export function renderAll(ctx: SiteContext, opts: RenderOpts = {}): { path: string; html: string; title: string }[] {
  const pages = buildPages({ ...ctx, api: !!opts.api });
  const doc = (page: Page, notFound = false) => {
    const body = renderToStaticMarkup(<Shell page={page} pages={pages} demoUrl={ctx.demoUrl} preview={ctx.preview} />);
    const canonical = (opts.base || '') + page.path;
    return `<!doctype html>
<html lang="en"${opts.api ? ` data-api="${esc(opts.api)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0e1012" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#f7f5f1" media="(prefers-color-scheme: light)">
${notFound ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${esc(canonical)}">\n`}<meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:type" content="website">
${ctx.preview ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="referrer" content="strict-origin-when-cross-origin">
${opts.iconLinks || '<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml">'}
<link rel="preload" href="/fonts/inter-display-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css">
<script src="/theme.js"></script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Empathia Technologies', url: opts.base || undefined, founder: { '@type': 'Person', name: 'Jeremiah Johnson' }, description: 'Empathia Living Campus: an operating platform for enterprise AV, collaboration and workplace technology.' }).replace(/</g, '\\u003c')}</script>
</head>
<body>${body}<script src="/site.js" defer></script></body>
</html>
`;
  };
  const out = pages.map((page) => ({ path: page.path, html: doc(page), title: page.title }));
  const nf = notFoundPage(); out.push({ path: '/404', html: doc(nf, true), title: nf.title });
  return out;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
