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

/** True when the signed-in account is the operator account the server recognises as admin (the
 *  server decides — nothing about who is admin is baked into this site's code). */
export async function isAdmin(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/whoami`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLibraryGaps(token: string): Promise<LibraryGap[]> {
  const data = await request('/library-gaps', token);
  return data.map(mapGap);
}

export async function dismissLibraryGap(id: string, token: string): Promise<void> {
  await request(`/library-gaps/${id}`, token, { method: 'DELETE' });
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface AdvocateReview {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  barCouncilNo: string | null;
  barState: string | null;
  verificationDocUrl: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

/** Advocate accounts in one verification state, oldest first. */
export async function listAdvocateReviews(status: VerificationStatus, token: string): Promise<AdvocateReview[]> {
  return request(`/advocates?status=${status}`, token);
}

/** Approve or reject an advocate's verification; the advocate is emailed the outcome. */
export async function decideAdvocateVerification(
  id: string,
  decision: 'verified' | 'rejected',
  token: string
): Promise<void> {
  await request(`/advocates/${id}/verification`, token, { method: 'POST', body: JSON.stringify({ decision }) });
}
