import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface AdvocateListing {
  id: string;
  fullName: string;
  barCouncilNo: string | null;
  barState: string | null;
  city: string | null;
  practiceState: string | null;
  practiceForums: string[];
  languages: string[];
  bio: string | null;
  practicingSinceYear: number | null;
}

export interface AdvocateProfile {
  city: string | null;
  practiceState: string | null;
  practiceForums: string[];
  languages: string[];
  bio: string | null;
  practicingSinceYear: number | null;
  listed: boolean;
}

export interface AdvocateInquiry {
  id: string;
  forumType: string | null;
  caseTypeLabel: string | null;
  state: string | null;
  message: string;
  status: 'new' | 'read';
  createdAt: string;
  senderName: string;
  senderEmail: string | null;
  senderPhone: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/advocates${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data as T;
}

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/** Public directory — no login needed to browse, matching an informational-directory framing
 *  rather than a lawyer soliciting clients through the platform. */
export function listAdvocates(filters: { forumType?: string; state?: string; language?: string }): Promise<AdvocateListing[]> {
  const params = new URLSearchParams();
  if (filters.forumType) params.set('forumType', filters.forumType);
  if (filters.state) params.set('state', filters.state);
  if (filters.language) params.set('language', filters.language);
  const qs = params.toString();
  return req(`${qs ? `?${qs}` : ''}`);
}

export function getAdvocate(id: string): Promise<AdvocateListing> {
  return req(`/${id}`);
}

export function getMyAdvocateProfile(token: string): Promise<AdvocateProfile> {
  return req('/me/profile', { headers: authHeader(token) });
}

export function saveMyAdvocateProfile(profile: AdvocateProfile, token: string): Promise<AdvocateProfile> {
  return req('/me/profile', { method: 'PUT', headers: authHeader(token), body: JSON.stringify(profile) });
}

export function sendAdvocateInquiry(
  advocateId: string,
  details: { message: string; forumType?: string; caseTypeLabel?: string; state?: string },
  token: string
): Promise<{ id: string; createdAt: string }> {
  return req(`/${advocateId}/inquiries`, { method: 'POST', headers: authHeader(token), body: JSON.stringify(details) });
}

export function getMyInquiries(token: string): Promise<AdvocateInquiry[]> {
  return req('/me/inquiries', { headers: authHeader(token) });
}

export async function markInquiryRead(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/advocates/me/inquiries/${id}/read`, {
    method: 'PATCH',
    headers: authHeader(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
}
