import { ApiError } from './apiError';
import type { Language } from './language';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface DocumentTranslation {
  /** True when the source text was longer than the server-side cap and only the leading portion
   * was translated — the caller should tell the user the rest was left out. */
  truncated: boolean;
}

/** Sends already-extracted document text (never the file itself) to be translated into
 * `targetLanguage`. This is a plain machine translation, not a certified one — callers must show
 * that caveat next to the result, not just on this function.
 *
 * The translation streams in rather than arriving all at once — a full document can take a while
 * to generate, and without this the caller would see nothing at all for that whole stretch.
 * `onChunk` is called with each piece of translated text as it arrives, in order. */
export async function translateDocumentText(
  text: string,
  targetLanguage: Language,
  token: string,
  onChunk: (textDelta: string) => void
): Promise<DocumentTranslation> {
  const res = await fetch(`${API_BASE}/api/copilot/translate-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, targetLanguage }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }

  const truncated = res.headers.get('X-Translation-Truncated') === 'true';

  // Read via a manual reader loop, not `for await (const chunk of res.body)` — Safari's
  // ReadableStream doesn't support the async-iterator protocol that sugar relies on (the same gap
  // pdf.js hits internally; see pdfTextExtraction.ts), but `.getReader()` works everywhere.
  const reader = res.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } else {
    onChunk(await res.text());
  }

  return { truncated };
}
