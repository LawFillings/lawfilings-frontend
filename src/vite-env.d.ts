/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Dynamically imported for its side effects only (registering pdf.js's worker message
// handlers) — see pdfWorkerEntry.ts.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
