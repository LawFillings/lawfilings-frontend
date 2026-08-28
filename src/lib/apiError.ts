/**
 * Thrown by API clients instead of a plain Error, preserving the HTTP status code so callers
 * can branch on it (e.g. 402 -> show the paywall) without parsing the error message string.
 * Stays `instanceof Error` and keeps `.message` populated identically to a plain Error, so every
 * existing `catch (err) { err instanceof Error ? err.message : ... }` callsite is unaffected.
 */
export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}
