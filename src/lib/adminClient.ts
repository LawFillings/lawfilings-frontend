import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface LibraryGap {
  id: string;
  question: string;
  reason: 'no_search_matches' | 'model_declined';
  createdAt: string;
}

function mapGap(raw: any): LibraryGap {
  return { id: raw.id, question: raw.question, reason: raw.reason, createdAt: raw.created_at };
}

async function request(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export async function getLibraryGaps(token: string): Promise<LibraryGap[]> {
  const data = await request('/library-gaps', token);
  return data.map(mapGap);
}

export async function dismissLibraryGap(id: string, token: string): Promise<void> {
  await request(`/library-gaps/${id}`, token, { method: 'DELETE' });
}
