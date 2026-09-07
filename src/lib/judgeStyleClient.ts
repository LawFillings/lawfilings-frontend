import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface JudgeStyleProfile {
  structuralPreference: 'facts_first' | 'law_first' | 'neutral';
  citationDensity: 'high' | 'low' | 'neutral';
  summary: string;
}

/** POST /api/copilot/analyze-judge-style — `texts` are already extracted client-side (via
 *  extractTextFromPdf), never the files themselves. `sourceType` picks which the backend treats
 *  them as: 'judgment' (default) for judgments by a specific judge, or 'application' for a sample
 *  application/petition the user wants the draft's structure to follow instead — both return the
 *  identical JudgeStyleProfile shape. Paid-subscription only: a non-subscribed account gets a 402
 *  here, which callers should catch and show PaywallBlock for, same as every other paid action on
 *  this platform. */
export async function analyzeJudgeStyleFromTexts(
  texts: string[],
  token: string,
  sourceType: 'judgment' | 'application' = 'judgment'
): Promise<JudgeStyleProfile> {
  const res = await fetch(`${API_BASE}/api/copilot/analyze-judge-style`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ texts, sourceType }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
