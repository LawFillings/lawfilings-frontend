// A thin wrapper around pdfjs-dist's real worker script, not the script itself — see
// pdfWorkerEntry.ts for why (a Safari-only ReadableStream gap the worker hits internally).
import pdfWorkerUrl from './pdfWorkerEntry?url';
import { polyfillReadableStreamAsyncIterator } from './polyfillReadableStreamAsyncIterator';

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
  // Main-thread half of the same fix as pdfWorkerEntry.ts — pdf.js needs this polyfill on both
  // sides of the worker boundary. Must run before the dynamic import below, which is what
  // actually first touches pdf.js's own code.
  polyfillReadableStreamAsyncIterator();
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buffer = await file.arrayBuffer();
  // disableStream/disableAutoFetch: the whole file is already in memory (no URL to stream or
  // range-fetch from), so these have no effect on Chrome/Firefox either way — kept for intent.
  // Does NOT fix the Safari worker-transfer ReadableStream issue (see NoTextLayerError catch
  // site in callers) — that needs a different approach; pdfjs-dist 6.x removed the old
  // `disableWorker` document-init option, so it can no longer be forced off this way.
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableStream: true, disableAutoFetch: true }).promise;

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
