import { ApiError } from './apiError';
import type { Language } from './language';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface DocumentTranslation {
  translatedText: string;
  /** True when the source text was longer than the server-side cap and only the leading portion
   * was translated — the caller should tell the user the rest was left out. */
  truncated: boolean;
}

/** Sends already-extracted document text (never the file itself) to be translated into
 * `targetLanguage`. This is a plain machine translation, not a certified one — callers must show
 * that caveat next to the result, not just on this function. */
export async function translateDocumentText(text: string, targetLanguage: Language, token: string): Promise<DocumentTranslation> {
  const res = await fetch(`${API_BASE}/api/copilot/translate-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, targetLanguage }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
