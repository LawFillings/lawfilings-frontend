import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface JudgeStyleProfile {
  structuralPreference: 'facts_first' | 'law_first' | 'neutral';
  citationDensity: 'high' | 'low' | 'neutral';
  summary: string;
}

/** POST /api/copilot/analyze-judge-style — `texts` are judgment texts already extracted
 *  client-side (via extractTextFromPdf), never the files themselves. Paid-subscription only:
 *  a non-subscribed account gets a 402 here, which callers should catch and show PaywallBlock
 *  for, same as every other paid action on this platform. */
export async function analyzeJudgeStyleFromTexts(texts: string[], token: string): Promise<JudgeStyleProfile> {
  const res = await fetch(`${API_BASE}/api/copilot/analyze-judge-style`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ texts }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
