// Build-time renderer: one static HTML document per page (SEO, fast first paint, no JavaScript needed to read the site).
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPages, type SiteContext } from './content.js';
import { Shell } from './site.js';
export function renderAll(ctx: SiteContext, opts: { api?: string | null; base?: string } = {}): { path: string; html: string; title: string }[] {
  const pages = buildPages(ctx);
  return pages.map((page) => {
    const body = renderToStaticMarkup(<Shell page={page} pages={pages} demoUrl={ctx.demoUrl} preview={ctx.preview} />);
    const canonical = (opts.base || '') + page.path;
    const html = `<!doctype html>
<html lang="en" data-theme="dark"${opts.api ? ` data-api="${esc(opts.api)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="theme-color" content="#090C11">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:type" content="website">
${ctx.preview ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="preload" href="/fonts/poppins-700.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/poppins-400.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/site.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Empathia Technologies', url: opts.base || undefined, founder: { '@type': 'Person', name: 'Jeremiah Johnson' }, description: 'Empathia Living Campus: an operating platform for enterprise AV, collaboration and workplace technology.' }).replace(/</g, '\\u003c')}</script>
</head>
<body>${body}<script src="/site.js" defer></script></body>
</html>
`;
    return { path: page.path, html, title: page.title };
  });
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
