import { acts } from '../data/lawLibraryData';
import type { Act, ActSection } from '../data/lawLibraryData';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'on', 'for', 'and', 'or',
  'what', 'how', 'does', 'do', 'can', 'which', 'this', 'that', 'it', 'be', 'as', 'by', 'with',
  'under', 'about', 'i', 'my', 'me', 'if', 'when', 'who',
]);

const MAX_TOTAL = 10;
const MAX_PER_ACT = 3;

/** Counts how many question tokens appear in a section's heading + text — plus its section
 *  number, which otherwise wouldn't be searchable at all (a query like "section 302" could never
 *  find section 302 by number, only by accidentally matching a word in its heading/text). An
 *  exact match on the section number is a much stronger signal than an ordinary word match — a
 *  user asking about "section 302" almost certainly means that specific provision — so it's
 *  weighted heavily to make sure the right section actually surfaces instead of being crowded out
 *  by generic matches like "section" itself. */
function scoreSection(section: ActSection, tokens: string[]): number {
  if (!section.text) return 0;
  const haystack = (section.heading + ' ' + section.text).toLowerCase();
  const sectionNoLower = section.sectionNo.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (t === sectionNoLower) score += 10;
    else if (haystack.includes(t)) score++;
  }
  return score;
}

/**
 * Simple keyword match across every Act sourced into the Law Library — the sole grounding
 * mechanism for the global "Ask the Library" box (there is no per-Act scoping any more; a single
 * search box below the Constitution/Acts dropdown serves every question, so it always searches
 * everything). Deliberately lightweight — substring scoring over ~1,500 sourced sections is fast
 * enough client-side without embeddings or a backend search index. Capped per Act so one large
 * Act (e.g. the Constitution) can't crowd out everything else, and capped in total to keep each
 * Anthropic call small and cheap.
 */
export function searchLibrarySections(question: string): { act: Act; section: ActSection }[] {
  const tokens = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (tokens.length === 0) return [];

  const scored: { act: Act; section: ActSection; score: number }[] = [];
  for (const act of acts) {
    for (const section of act.sections) {
      const score = scoreSection(section, tokens);
      if (score > 0) scored.push({ act, section, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const result: { act: Act; section: ActSection }[] = [];
  const perActCount = new Map<string, number>();
  for (const entry of scored) {
    const count = perActCount.get(entry.act.id) ?? 0;
    if (count >= MAX_PER_ACT) continue;
    result.push({ act: entry.act, section: entry.section });
    perActCount.set(entry.act.id, count + 1);
    if (result.length >= MAX_TOTAL) break;
  }
  return result;
}
