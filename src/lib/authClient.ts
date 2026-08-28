import type { UserRole } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export type VerificationStatus = 'not_applicable' | 'pending' | 'verified' | 'rejected';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  barCouncilNo?: string;
  barState?: string;
  verificationStatus: VerificationStatus;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface SignupDetails {
  barCouncilNo?: string;
  barState?: string;
  verificationDocUrl?: string;
}

// The backend returns raw Postgres column names (full_name, not fullName) — there's no
// camelCase-mapping layer server-side, so the client does the conversion, matching every other
// type in this codebase (types.ts is camelCase throughout).
function mapUser(raw: {
  id: string;
  full_name: string;
  email: string;
  role: string;
  bar_council_no: string | null;
  bar_state: string | null;
  verification_status: string;
}): AuthUser {
  return {
    id: raw.id,
    fullName: raw.full_name,
    email: raw.email,
    role: raw.role as UserRole,
    barCouncilNo: raw.bar_council_no ?? undefined,
    barState: raw.bar_state ?? undefined,
    verificationStatus: raw.verification_status as VerificationStatus,
  };
}

/**
 * Unlike detectThirdPartyMentions's fail-silent pattern, auth errors (wrong password, duplicate
 * email) must reach the UI — silently swallowing them would make signup/login look broken.
 */
async function postAuth(path: string, body: unknown): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return { user: mapUser(data.user), token: data.token };
}

export function signup(
  fullName: string,
  email: string,
  password: string,
  role: UserRole,
  details?: SignupDetails
) {
  return postAuth('signup', { fullName, email, password, role, ...details });
}

export function login(email: string, password: string) {
  return postAuth('login', { email, password });
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }).catch(() => {
    // Best-effort — if this fails the local session is cleared regardless (see auth.tsx).
  });
}
