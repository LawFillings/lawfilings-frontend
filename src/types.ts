export type UserRole = 'justice_seeker' | 'advocate';

export type FilingCategory = 'original' | 'reply' | 'interlocutory' | 'appeal' | 'execution';

export type DeadlineSource = 'statutory_fixed' | 'tribunal_assigned';

export interface PecuniaryTier {
  forumLabel: string;
  min?: number;
  max?: number;
}

export interface AppealRouteOption {
  label: string;
  helpText?: string;
  caseTypeId: string;
}

export interface AppealGroup {
  id: string;
  forumType: string;
  question: string;
  options: AppealRouteOption[];
}

export interface EligibilityGate {
  id: string;
  question: string;
  kind: 'yes_no' | 'number';
  helpText?: string;
  /** For yes_no gates: block the wizard if the answer matches this */
  blockOnAnswer?: 'yes' | 'no';
  blockMessage?: string;
  /** For yes_no gates: warn (but don't block) if the answer matches this */
  warnOnAnswer?: 'yes' | 'no';
  warnMessage?: string;
  /** For number gates: block if the value is below this */
  blockBelow?: number;
  blockBelowMessage?: string;
}

export interface JurisdictionRule {
  ruleType: 'pecuniary_tier' | 'debt_threshold' | 'subject_matter_and_bench';
  tiers?: PecuniaryTier[];
  minAmount?: number;
  note?: string;
}

export interface DepositRequirement {
  pct: number;
  reducibleToPct?: number;
  reductionAt?: string;
  basis: string;
  provision: string;
  note?: string;
}

export interface Forum {
  id: string;
  name: string;
  forumType: string;
  advocateMandatory: boolean;
}

export interface CaseType {
  id: string;
  forumType: string;
  name: string;
  governingLaw: string;
  plainLanguageSummary: string | null;
  applicantEligibility: string;
  filingCategory: FilingCategory;
  deadlineSource?: DeadlineSource;
  limitationDays?: number;
  condonableExtensionDays?: number | null;
  deposit?: DepositRequirement;
  jurisdictionRule?: JurisdictionRule;
  eligibilityGates?: EligibilityGate[];
  parentRequired?: boolean;
}

export interface ClauseDef {
  code: string;
  caseTypeId: string;
  category: string;
  title: string;
  bodyTemplate: string;
  plainLanguageExplanation: string | null;
}

export type ComplexityLevel = 'simple' | 'consider_advocate' | 'recommend_advocate';

export interface ComplexityRule {
  caseTypeId: string;
  condition: Record<string, unknown>;
  resultingFlag: ComplexityLevel;
  reason: string;
  blocking: boolean;
}

/** Response to a single paragraph in a para-wise reply step */
export type ParaResponse = 'Admit' | 'Deny' | 'No knowledge' | null;
