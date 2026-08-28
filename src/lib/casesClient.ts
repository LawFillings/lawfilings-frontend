import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface CaseRecord {
  id: string;
  ownerId: string;
  ownerRole: 'justice_seeker' | 'advocate';
  forumId: string | null;
  caseTypeId: string | null;
  /** Resolved name of the case type (from the `case_types` catalog), if `caseTypeId` is set. */
  caseTypeName: string | null;
  /** A user-written type label, for when nothing in the case_types catalog fits — mutually
   * exclusive with caseTypeId/caseTypeName (at most one of the two is set at a time). */
  customTypeLabel: string | null;
  title: string;
  status: 'assessing' | 'drafting' | 'ready' | 'filed' | 'disposed';
  createdAt: string;
  /** Bumped on title/type changes and on any status-update add/edit/delete. */
  updatedAt: string;
  /** Soonest upcoming hearing date logged against this case (via status updates), if any. */
  nextHearingDate: string | null;
  /** Most recent free-text status label entered on the case detail page, if any. */
  latestStatusLabel: string | null;
  /** True if a draft has ever been created for this case — false for manually-added diary entries. */
  hasDraft: boolean;
}

export interface DraftRecord {
  id: string;
  caseId: string;
  title: string;
  content: unknown;
  version: number;
  status: 'in_progress' | 'ready' | 'filed';
  updatedAt: string;
}

export interface StatusUpdateRecord {
  id: string;
  caseId: string;
  updatedBy: string;
  statusLabel: string;
  note: string | null;
  hearingDate: string | null;
  createdAt: string;
}

/** Formats a "YYYY-MM-DD" date-only string as "DD/MM/YYYY" by splitting the string rather than
 * going through `new Date(...)`, which parses date-only strings as UTC midnight and then shifts
 * by the viewer's timezone offset on display — silently landing on the wrong day for anyone west
 * of UTC. */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

// Every endpoint below returns raw Postgres column names (snake_case), same pattern as auth —
// mapping happens client-side rather than in the backend.
function mapCase(raw: any): CaseRecord {
  return {
    id: raw.id,
    ownerId: raw.owner_id,
    ownerRole: raw.owner_role,
    forumId: raw.forum_id,
    caseTypeId: raw.case_type_id,
    caseTypeName: raw.case_type_name ?? null,
    customTypeLabel: raw.custom_type_label ?? null,
    title: raw.title,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? raw.created_at,
    nextHearingDate: raw.next_hearing_date ?? null,
    latestStatusLabel: raw.latest_status_label ?? null,
    hasDraft: raw.has_draft ?? false,
  };
}

function mapDraft(raw: any): DraftRecord {
  return {
    id: raw.id,
    caseId: raw.case_id,
    title: raw.title,
    content: raw.content,
    version: raw.version,
    status: raw.status,
    updatedAt: raw.updated_at,
  };
}

function mapStatusUpdate(raw: any): StatusUpdateRecord {
  return {
    id: raw.id,
    caseId: raw.case_id,
    updatedBy: raw.updated_by,
    statusLabel: raw.status_label,
    note: raw.note,
    hearingDate: raw.hearing_date,
    createdAt: raw.created_at,
  };
}

async function request(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export interface CreateCaseInput {
  forumId?: string;
  caseTypeId?: string;
  title: string;
  ownerRole: 'justice_seeker' | 'advocate';
  /** Only meaningful for manually-added diary entries — wizard-created cases default to 'assessing'. */
  status?: CaseRecord['status'];
}

export async function createCase(input: CreateCaseInput, token: string): Promise<CaseRecord> {
  const data = await request('/cases', token, { method: 'POST', body: JSON.stringify(input) });
  return mapCase(data);
}

export async function listCases(token: string): Promise<CaseRecord[]> {
  const data = await request('/cases', token);
  return data.map(mapCase);
}

export async function getCase(caseId: string, token: string): Promise<CaseRecord & { drafts: DraftRecord[] }> {
  const data = await request(`/cases/${caseId}`, token);
  return { ...mapCase(data), drafts: data.drafts.map(mapDraft) };
}

export async function updateCaseTitle(caseId: string, title: string, token: string): Promise<CaseRecord> {
  const data = await request(`/cases/${caseId}`, token, { method: 'PUT', body: JSON.stringify({ title }) });
  return mapCase(data);
}

/** Saves title and/or type together in a single request — used by the Case Detail page's unified
 * Edit/Save, so one Save commits every case-level field at once instead of one request per field. */
export async function updateCase(
  caseId: string,
  updates: { title?: string; caseTypeId?: string | null; customTypeLabel?: string | null },
  token: string
): Promise<CaseRecord> {
  const data = await request(`/cases/${caseId}`, token, { method: 'PUT', body: JSON.stringify(updates) });
  return mapCase(data);
}

export async function deleteCase(caseId: string, token: string): Promise<void> {
  await request(`/cases/${caseId}`, token, { method: 'DELETE' });
}

/** caseTypeId and customTypeLabel are mutually exclusive — pass one, leave the other null/undefined
 * (both null clears the type back to unassigned "Diary"). */
export async function updateCaseType(
  caseId: string,
  type: { caseTypeId?: string | null; customTypeLabel?: string | null },
  token: string
): Promise<CaseRecord> {
  const data = await request(`/cases/${caseId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ caseTypeId: type.caseTypeId ?? null, customTypeLabel: type.customTypeLabel ?? null }),
  });
  return mapCase(data);
}

export async function createDraft(caseId: string, title: string, content: unknown, token: string): Promise<DraftRecord> {
  const data = await request(`/cases/${caseId}/drafts`, token, {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
  return mapDraft(data);
}

export async function updateDraft(caseId: string, draftId: string, content: unknown, token: string): Promise<DraftRecord> {
  const data = await request(`/cases/${caseId}/drafts/${draftId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
  return mapDraft(data);
}

export interface CreateStatusUpdateInput {
  statusLabel: string;
  note?: string;
  hearingDate?: string;
}

export async function createStatusUpdate(
  caseId: string,
  input: CreateStatusUpdateInput,
  token: string
): Promise<StatusUpdateRecord> {
  const data = await request(`/cases/${caseId}/status-updates`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapStatusUpdate(data);
}

export async function listStatusUpdates(caseId: string, token: string): Promise<StatusUpdateRecord[]> {
  const data = await request(`/cases/${caseId}/status-updates`, token);
  return data.map(mapStatusUpdate);
}

export async function updateStatusUpdate(
  caseId: string,
  statusUpdateId: string,
  input: CreateStatusUpdateInput,
  token: string
): Promise<StatusUpdateRecord> {
  const data = await request(`/cases/${caseId}/status-updates/${statusUpdateId}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return mapStatusUpdate(data);
}

export async function deleteStatusUpdate(caseId: string, statusUpdateId: string, token: string): Promise<void> {
  await request(`/cases/${caseId}/status-updates/${statusUpdateId}`, token, { method: 'DELETE' });
}
