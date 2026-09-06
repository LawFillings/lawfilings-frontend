import type { DraftSection } from '../components/DraftDocument';
import type { JudgeStyleProfile } from './judgeStyleClient';

const ROLE_ORDER_BY_PREFERENCE: Record<'facts_first' | 'law_first', DraftSection['role'][]> = {
  facts_first: ['facts', 'grounds', 'law'],
  law_first: ['law', 'facts', 'grounds'],
};

/**
 * Reorders a draft's already-templated sections to match an (optional) judge style profile —
 * never generates or rewrites any paragraph text, only changes which order sections appear in.
 * Sections tagged 'facts'/'law'/'grounds' (see DraftSection.role) may be reordered relative to
 * each other; every untagged section (Prayer, Undertaking, Index, Verification, cause-title
 * info, closing/signature blocks, etc.) stays exactly where the wizard originally put it.
 *
 * With no profile, or a 'neutral' structuralPreference (no clear pattern found, or the advocate
 * skipped this step entirely), this is the identity function — the default for every user until
 * they opt in.
 */
export function applyJudgeStyleToSections(sections: DraftSection[], profile: JudgeStyleProfile | null): DraftSection[] {
  if (!profile || profile.structuralPreference === 'neutral') return sections;

  const targetRoleOrder = ROLE_ORDER_BY_PREFERENCE[profile.structuralPreference];
  const isReorderable = (s: DraftSection) => !!s.role && targetRoleOrder.includes(s.role);

  const byRole = new Map<DraftSection['role'], DraftSection[]>();
  for (const section of sections) {
    if (!isReorderable(section)) continue;
    const list = byRole.get(section.role) ?? [];
    list.push(section);
    byRole.set(section.role, list);
  }
  if (byRole.size === 0) return sections;
  const reorderedQueue = targetRoleOrder.flatMap((role) => byRole.get(role) ?? []);

  // Single pass: keep every fixed section exactly where it was; splice the whole reordered
  // queue in at the position of the first reorderable section, then skip the rest (they're
  // already represented in that queue).
  const result: DraftSection[] = [];
  let queueInserted = false;
  for (const section of sections) {
    if (isReorderable(section)) {
      if (!queueInserted) {
        result.push(...reorderedQueue);
        queueInserted = true;
      }
      continue;
    }
    result.push(section);
  }
  return result;
}
