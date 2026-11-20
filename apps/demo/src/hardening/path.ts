/** The path segments of a #/ address, without its query. */
export function opsPath(hash: string): string[] { return (hash.replace(/^#\/?/, '').split('?')[0] || '').split('/').filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch { return x; } }); }
