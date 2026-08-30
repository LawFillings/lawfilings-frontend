/** Reserved key stashed inside a draft's saved `content` JSON, holding the frontend's own
 * wizard-routing slug (an id from `src/data/mockData.ts`'s `caseTypes`, e.g. 'ct-drt-ws') — kept
 * separate from the backend's `case_types` catalog FK (`CaseRecord.caseTypeId`, a random UUID
 * from an entirely different id space) so a saved draft can be resolved back to the wizard that
 * produced it without depending on that catalog matching anything. */
export const WIZARD_CASE_TYPE_KEY = '__wizardCaseTypeId';

export function resolveWizardCaseTypeId(content: unknown): string | undefined {
  if (content && typeof content === 'object' && WIZARD_CASE_TYPE_KEY in content) {
    const value = (content as Record<string, unknown>)[WIZARD_CASE_TYPE_KEY];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}
