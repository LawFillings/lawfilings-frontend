const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface PrecedentRecord {
  id: string;
  caseTitle: string;
  citation: string | null;
  court: string | null;
  year: number | null;
  summary: string | null;
  sourceUrl: string | null;
}

function mapPrecedent(raw: any): PrecedentRecord {
  return {
    id: raw.id,
    caseTitle: raw.case_title,
    citation: raw.citation,
    court: raw.court,
    year: raw.year,
    summary: raw.summary,
    sourceUrl: raw.source_url,
  };
}

/**
 * Fetches curated precedents for a case type. Fails silently (returns []) rather than throwing —
 * this is reference material shown alongside drafting, not a dependency; a backend/network hiccup
 * shouldn't interrupt someone mid-draft. No auth required, same as the rest of the free catalog.
 */
export async function fetchPrecedents(caseTypeId: string): Promise<PrecedentRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/api/case-types/${caseTypeId}/precedents`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(mapPrecedent);
  } catch {
    return [];
  }
}
