/**
 * The shield for a document's title page and running header: the page's own brand/emblem.svg (the emblem's role, "≥ 96 px", in
 * packages/design-tokens/brand.mjs), drawn once to a 256 px PNG in the browser. No other artwork is used and nothing is fetched from
 * elsewhere. If the browser cannot draw it, the documents are written without the shield rather than with a substitute.
 */
let cached: Promise<Uint8Array | undefined> | null = null;
export function emblemPng(): Promise<Uint8Array | undefined> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const url = new URL('brand/emblem.svg', document.baseURI).href;
      const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
      const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); if (!g) return undefined;
      g.drawImage(img, 0, 0, 256, 256);
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png')); if (!blob) return undefined;
      return new Uint8Array(await blob.arrayBuffer());
    } catch { return undefined; }
  })();
  return cached;
}
