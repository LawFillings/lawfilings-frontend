const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface CaseLawResult {
  title: string;
  docId: string;
  snippet: string;
  court: string | null;
  date: string | null;
  citation: string | null;
  indianKanoonUrl: string;
}

export type CourtCategory = 'supreme_court' | 'high_courts' | 'tribunals';

export async function searchCaseLaw(
  query: string,
  token: string,
  courtCategory?: CourtCategory
): Promise<CaseLawResult[]> {
  const res = await fetch(`${API_BASE}/api/case-law/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, courtCategory }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Search failed (${res.status})`);
  }
  return data;
}
