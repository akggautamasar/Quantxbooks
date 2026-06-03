// Server-side PDF page rendering — converts every PDF page to a JPEG Buffer.
// Requires `canvas` and `pdfjs-dist` (both declared in next.config.js
// serverComponentsExternalPackages so webpack does not try to bundle them).

export async function pdfToJpegPages(
  pdfData: ArrayBuffer,
  scale = 1.5,
  quality = 0.8,
): Promise<Buffer[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCanvas } = require('canvas');

  // No web workers in Node.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfData),
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  const pages: Buffer[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    pages.push(canvas.toBuffer('image/jpeg', { quality }));
    page.cleanup();
  }

  await doc.destroy();
  return pages;
}
