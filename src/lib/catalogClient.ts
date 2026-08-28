const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface CaseTypeOption {
  id: string;
  forumType: string;
  name: string;
}

function mapCaseType(raw: any): CaseTypeOption {
  return {
    id: raw.id,
    forumType: raw.forum_type,
    name: raw.name,
  };
}

/** Public reference data — no auth required. */
export async function listCaseTypes(): Promise<CaseTypeOption[]> {
  const res = await fetch(`${API_BASE}/api/case-types`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  return data.map(mapCaseType);
}
