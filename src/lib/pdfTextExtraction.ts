import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/**
 * Thrown when a PDF has no usable text layer (a scanned/image-only document) — the caller should
 * show a distinct message rather than sending near-empty text to the extraction endpoint. Reading
 * scans will need OCR/vision, which this first pass deliberately doesn't attempt.
 */
export class NoTextLayerError extends Error {
  constructor() {
    super('This PDF has no selectable text — it looks like a scanned document, not a text-based one.');
  }
}

// Below this, a PDF is treated as having no real text layer (a handful of stray characters from
// page furniture/watermarks rather than actual body text).
const MIN_TEXT_LENGTH = 50;

/** Extracts plain text from a text-layer PDF, entirely in the browser — the file itself never
 *  leaves the client, only whatever text this pulls out of it. */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText);
  }

  const text = pageTexts.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  if (text.length < MIN_TEXT_LENGTH) {
    throw new NoTextLayerError();
  }
  return text;
}
