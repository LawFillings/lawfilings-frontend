import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface CauseListEntry {
  itemNo: string;
  caseNo: string;
  parties: string;
  advocates: string;
}

type AllowedMediaType = 'application/pdf' | 'image/jpeg' | 'image/png';

/** Reads a File straight to a base64 string (no data: URL prefix) — used for the manual-upload
 *  path, since Claude's document/image content blocks take raw base64, not a data URL. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // FileReader's readAsDataURL result looks like "data:application/pdf;base64,JVBERi0x...".
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Fetches and tabulates a court's cause list — either by having the backend fetch it directly
 *  (tier-1 "auto" courts) or by uploading a file the advocate downloaded themselves (tier-2
 *  "manual" courts). Never sends the file anywhere except this one extraction call. */
export async function fetchCauseList(
  params: { courtId: string; date: string } & (
    | { source: 'fetch'; scope?: string }
    | { source: 'upload'; file: File }
  ),
  token: string
): Promise<CauseListEntry[]> {
  const body: Record<string, unknown> = { courtId: params.courtId, date: params.date, source: params.source };

  if (params.source === 'fetch' && params.scope) {
    body.scope = params.scope;
  }

  if (params.source === 'upload') {
    const mediaType = mediaTypeForFile(params.file);
    if (!mediaType) {
      throw new Error('Please upload a PDF, JPG, or PNG file.');
    }
    body.fileBase64 = await readFileAsBase64(params.file);
    body.mediaType = mediaType;
  }

  const res = await fetch(`${API_BASE}/api/cause-list/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data.entries ?? [];
}

function mediaTypeForFile(file: File): AllowedMediaType | null {
  if (file.type === 'application/pdf' || file.type === 'image/jpeg' || file.type === 'image/png') {
    return file.type;
  }
  // Some phone cameras/browsers omit or mangle MIME type — fall back to the file extension.
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return null;
}
