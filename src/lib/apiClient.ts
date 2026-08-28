const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface ThirdPartyMention {
  mentionedText: string;
  context: string;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Calls the backend's third-party detection endpoint. Fails silently (returns []) rather than
 * throwing — this is a nudge feature, not a dependency, and a backend/network hiccup shouldn't
 * interrupt someone mid-draft. Requires a session token in real use; omitted here since the
 * frontend doesn't yet have auth wired up (see backend README's "connecting the frontend" note).
 */
export async function detectThirdPartyMentions(
  freeText: string,
  knownPartyNames: string[],
  token?: string
): Promise<ThirdPartyMention[]> {
  if (!freeText || freeText.trim().length < 10) return [];

  try {
    const res = await fetch(`${API_BASE}/api/copilot/detect-third-parties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ freeText, knownPartyNames }),
    });
    if (!res.ok) return [];
    return (await res.json()) as ThirdPartyMention[];
  } catch {
    // Backend not running, network error, etc. — degrade silently.
    return [];
  }
}
