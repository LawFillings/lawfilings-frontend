import type { Act, ActSection } from '../data/lawLibraryData';
import type { Language } from './language';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface ActCitation {
  actShortTitle: string;
  sectionNo: string;
}

export interface ActQaTurn {
  question: string;
  answer: string;
  citedSections: ActCitation[];
  answeredFromProvidedText: boolean;
  /** 'general' turns come from ask-general (the model's own knowledge, unverified) rather than
   *  the grounded Library search — kept distinct so the UI never renders the two identically. */
  mode: 'grounded' | 'general';
}

export type AskAboutActResult =
  | { ok: true; answer: string; citedSections: ActCitation[]; answeredFromProvidedText: boolean }
  | { ok: false; error: string };

export type AskGeneralResult = { ok: true; answer: string } | { ok: false; error: string };

/**
 * Asks the backend a question grounded in `sections` — the top keyword matches across the whole
 * Law Library, from searchLibrarySections.ts — see aiCopilot.ts on the backend for why the model
 * is restricted to exactly this text rather than answering from its own general knowledge.
 * Unlike detectThirdPartyMentions, this is an explicit user action, not a background nudge, so
 * failures are surfaced rather than swallowed.
 */
export async function askLibrary(
  matches: { act: Act; section: ActSection }[],
  question: string,
  history: { question: string; answer: string }[],
  language: Language
): Promise<AskAboutActResult> {
  try {
    const sections = matches.map(({ act, section }) => ({
      actShortTitle: act.shortTitle,
      actNumber: act.actNumber,
      sectionNo: section.sectionNo,
      heading: section.heading,
      text: section.text,
    }));

    const res = await fetch(`${API_BASE}/api/law-library/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections, question, history, language }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.error ?? 'This tool is unavailable right now — please try again in a moment' };
    }

    const data = (await res.json()) as { answer: string; citedSections: ActCitation[]; answeredFromProvidedText: boolean };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: 'Could not reach the server — check your connection and try again' };
  }
}

/**
 * The general-info fallback — answers from the model's own knowledge, not restricted to sourced
 * Act text. Deliberately a separate call from askLibrary above, not a parameter on it, so a
 * caller can never blur "grounded" and "general" into the same request/response shape by
 * accident — see aiCopilot.ts's answerGeneralLegalQuestion for the full rationale.
 */
export async function askGeneral(
  question: string,
  history: { question: string; answer: string }[],
  language: Language
): Promise<AskGeneralResult> {
  try {
    const res = await fetch(`${API_BASE}/api/law-library/ask-general`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, language }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.error ?? 'This tool is unavailable right now — please try again in a moment' };
    }

    const data = (await res.json()) as { answer: string };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: 'Could not reach the server — check your connection and try again' };
  }
}

/**
 * Fire-and-forget: records that the client-side keyword search found zero candidate sections for
 * this question, so it never even reached askLibrary. Failures here are swallowed on purpose —
 * this is a backlog signal for the team, never something that should interrupt the user's flow.
 */
export function logSearchGap(question: string) {
  fetch(`${API_BASE}/api/law-library/log-gap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }).catch(() => {});
}
