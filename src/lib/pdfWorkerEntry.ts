import { polyfillReadableStreamAsyncIterator } from './polyfillReadableStreamAsyncIterator';

// Deliberately a dynamic import, not `import 'pdfjs-dist/...'` at the top level — static imports
// run their side effects before any of *this* module's own top-level code, regardless of where
// they're written in the source, so a static import here would load pdf.js's worker code (and
// let it touch ReadableStream) before the polyfill call below ever ran. A dynamic import is a
// real function call in control-flow order, so it actually runs second.
polyfillReadableStreamAsyncIterator();
await import('pdfjs-dist/build/pdf.worker.min.mjs');
