// Maps a wizard's in-progress selections (state, cause of action, etc.) to specific, curated
// sections of Acts already sourced into lawLibraryData.ts. Deliberately narrow: only wired up
// for the cause types that actually have a sourced Act behind them (money-lending, so far).
// Extend MONEY_LENDING_SECTION_BY_ACT_ID as more categories are sourced — do not fall back to
// fuzzy text search, since a wrong-but-plausible-looking statutory citation is worse than none.
import { acts } from '../data/lawLibraryData';
import type { Act, ActSection } from '../data/lawLibraryData';

export interface ActReferenceMatch {
  act: Act;
  section: ActSection;
}

// For each state's money-lending Act, the single section most relevant to "is this loan/lender
// subject to a licensing requirement, and what happens to a suit if the lender isn't licensed."
// Picked by hand from each Act's curated sections (see lawLibraryData.ts) rather than matched by
// keyword, since heading wording varies too much across states for that to be reliable.
const MONEY_LENDING_SECTION_BY_ACT_ID: Record<string, string> = {
  'act-rajasthan-money-lenders-1963': '11',
  'act-chhattisgarh-money-lenders-1934': '11-H',
  'act-odisha-money-lenders-1939': '8',
  'act-nagaland-money-lenders-2005': '3',
  'act-goa-money-lenders-2013': '13',
  'act-arunachal-pradesh-money-lending-2018': '13',
  'act-gujarat-money-lenders-2011': '26',
  'act-dnh-dd-money-lending-2014': '13',
  'act-andhra-pradesh-mfi-money-lending-2011': '3',
  'act-telangana-mfi-money-lending-2011': '3',
  'act-punjab-registration-money-lenders-1938': '3',
  'act-punjab-registration-money-lenders-1938-haryana': '3',
  'act-punjab-registration-money-lenders-1938-delhi': '3',
  'act-himachal-pradesh-registration-money-lenders-1976': '3',
  'act-up-regulation-money-lending-1976': '18',
  'act-jk-money-lenders-2010': '12',
};

interface MatchContext {
  causeType?: string | null;
  stateLabel?: string;
}

function findSection(act: Act, sectionNo: string): ActSection | undefined {
  return act.sections.find((s) => s.sectionNo === sectionNo);
}

// Wizards sometimes use a shorter/differently-punctuated state label than lawLibraryData.ts's
// INDIAN_STATES_AND_UTS (e.g. the district-court wizard says "Delhi", the Law Library says
// "Delhi (NCT)"). Normalize both sides before comparing rather than requiring every wizard to
// match the Law Library's exact strings.
function normalizeStateLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/** Returns curated Act-section references relevant to the given wizard context, if any. */
export function findRelevantActSections({ causeType, stateLabel }: MatchContext): ActReferenceMatch[] {
  if (causeType !== 'unpaid_loan' || !stateLabel) return [];
  const normalizedTarget = normalizeStateLabel(stateLabel);

  const matches: ActReferenceMatch[] = [];
  for (const act of acts) {
    const sectionNo = MONEY_LENDING_SECTION_BY_ACT_ID[act.id];
    if (!sectionNo) continue;
    if (act.jurisdiction.type !== 'state' || normalizeStateLabel(act.jurisdiction.state) !== normalizedTarget) continue;
    const section = findSection(act, sectionNo);
    if (section) matches.push({ act, section });
  }
  return matches;
}

function findAct(id: string): Act | undefined {
  return acts.find((a) => a.id === id);
}

function lookup(actId: string, sectionNo: string): ActReferenceMatch[] {
  const act = findAct(actId);
  const section = act && findSection(act, sectionNo);
  return act && section ? [{ act, section }] : [];
}

// Unlike the money-lending map above, these case types don't need a "did the user pick the right
// cause of action" check — the wizard's whole purpose IS the section being cited (an SA is
// nothing but a Section 17 application; an OA is nothing but a Section 19 application), so the
// citation is fixed to the case type rather than derived from a user selection.
const FIXED_CASE_TYPE_CITATIONS: Record<string, Array<{ actId: string; sectionNo: string }>> = {
  'ct-drt-oa': [{ actId: 'act-rddbfi-1993', sectionNo: '19' }],
  'ct-drt-sa': [
    { actId: 'act-sarfaesi-2002', sectionNo: '13' },
    { actId: 'act-sarfaesi-2002', sectionNo: '17' },
  ],
  // "Appeal against Recovery Officer's order" (mockData.ts) is explicitly Section 30 in its own
  // governingLaw field — a Recovery Officer's order is a distinct, narrower thing from the DRT's
  // own orders, so this is Section 30 specifically, not the general Section 20 below.
  'ct-drt-appeal-ro': [{ actId: 'act-rddbfi-1993', sectionNo: '30' }],
  // "Appeal to DRAT against DRT order" — governingLaw is explicitly "RDDBFI Act, 1993, Section
  // 20" in mockData.ts. (The Chamber Appeal against a Registrar's order is a different case type,
  // governed by DRT (Procedure) Rules, 1993, Rule 5(5) — a subordinate procedural rule, not an
  // Act, and not curated here — so it's deliberately left without a citation.)
  'ct-drat-appeal': [{ actId: 'act-rddbfi-1993', sectionNo: '20' }],
  // Execution Application (Consumer Commission) — governingLaw is explicitly "Consumer Protection
  // Act, 2019, Sections 71–72" in mockData.ts, and this is the only case type using this wizard.
  'ct-cc-execution': [
    { actId: 'act-cpa-2019', sectionNo: '71' },
    { actId: 'act-cpa-2019', sectionNo: '72' },
  ],
  // Section 9 IBC — Operational Creditor CIRP Application: the whole filing is the demand notice
  // (Section 8) followed by the application itself (Section 9), so both are always relevant.
  'ct-nclt-s9': [
    { actId: 'act-ibc-2016', sectionNo: '8' },
    { actId: 'act-ibc-2016', sectionNo: '9' },
  ],
  // "Appeal to NCLAT — insolvency matters" — governingLaw is explicitly "Insolvency and Bankruptcy
  // Code, 2016, Section 61" in mockData.ts. (The company-law NCLAT appeal is a different case
  // type, governed by the Companies Act, 2013, Section 421 — not curated here.)
  'ct-nclat-appeal-ibc': [{ actId: 'act-ibc-2016', sectionNo: '61' }],
  // Mediation Application — the entire filing is a Section 12A application, and Section 2's
  // "commercial dispute" definition is what makes the dispute eligible for it in the first place.
  'ct-mediation-application': [
    { actId: 'act-commercial-courts-2015', sectionNo: '2' },
    { actId: 'act-commercial-courts-2015', sectionNo: '12A' },
  ],
  // NI Act Complaint — Section 138 is the substantive offence, Section 142 the cognizance/
  // limitation provision governing the complaint itself; both are always relevant.
  'ct-ni-act-complaint': [
    { actId: 'act-ni-1881', sectionNo: '138' },
    { actId: 'act-ni-1881', sectionNo: '142' },
  ],
};

/** Returns the fixed Act-section citation for case types where the filing itself IS the
 * application under that section, if any is curated for the given case type. */
export function findFixedCaseTypeCitation(caseTypeId?: string | null): ActReferenceMatch[] {
  if (!caseTypeId) return [];
  const entries = FIXED_CASE_TYPE_CITATIONS[caseTypeId];
  if (!entries) return [];
  return entries.flatMap(({ actId, sectionNo }) => lookup(actId, sectionNo));
}

// Which Consumer Protection Act, 2019 jurisdiction section applies depends only on which
// Commission tier the claim value already resolved to (computed by the wizard itself from
// `caseType.jurisdictionRule.tiers`) — a direct lookup, not a guess.
const CONSUMER_JURISDICTION_SECTION_BY_TIER: Record<string, string> = {
  'District Commission': '34',
  'State Commission': '47',
  'National Commission': '58',
};

/** Returns the Consumer Protection Act, 2019 jurisdiction-section citation matching the
 * Commission tier the wizard has already resolved to, if any. */
export function findConsumerJurisdictionCitation(forumLabel?: string): ActReferenceMatch[] {
  if (!forumLabel) return [];
  const sectionNo = CONSUMER_JURISDICTION_SECTION_BY_TIER[forumLabel];
  return sectionNo ? lookup('act-cpa-2019', sectionNo) : [];
}

// Money Recovery Suit wizard only: once the wizard itself has determined (from the user's own
// "is this a commercial dispute" answer plus the claimed amount) that a suit qualifies as a
// commercial dispute under the Commercial Courts Act, 2015, these are the sections that actually
// govern it — jurisdiction, valuation, and the mandatory pre-institution mediation step. Fixed to
// that determination rather than derived here, since the ₹3,00,000-plus-district-notification
// threshold logic belongs with the wizard's own state, not duplicated in this matcher.
const COMMERCIAL_COURTS_ACT_SECTIONS = ['2', '3', '6', '12', '12A'];

/** Returns the curated Commercial Courts Act, 2015 citations when the caller has already
 * determined the suit qualifies as a commercial dispute of Specified Value; otherwise none. */
export function findCommercialCourtsActCitations(qualifies: boolean): ActReferenceMatch[] {
  if (!qualifies) return [];
  return COMMERCIAL_COURTS_ACT_SECTIONS.flatMap((sectionNo) => lookup('act-commercial-courts-2015', sectionNo));
}

// Bail Application wizard only: which BNSS section actually governs depends on which of the two
// applications the user is making — regular bail (Section 480, plus Section 483 if filed before
// the High Court/Court of Session rather than a Magistrate) or anticipatory bail (Section 482,
// which only the High Court/Court of Session can grant in the first place).
const BAIL_SECTIONS_BY_TYPE: Record<'regular' | 'regular_sessions' | 'anticipatory', string[]> = {
  regular: ['480'],
  regular_sessions: ['480', '483'],
  anticipatory: ['482'],
};

/** Returns the curated BNSS bail-provision citations matching which bail application (and, for
 * regular bail, which court level) the wizard has resolved to. */
export function findBailCitations(bailType: 'regular' | 'regular_sessions' | 'anticipatory' | null): ActReferenceMatch[] {
  if (!bailType) return [];
  return BAIL_SECTIONS_BY_TYPE[bailType].flatMap((sectionNo) => lookup('act-bnss-2023', sectionNo));
}

/** Formats matched Act sections as citation paragraphs for a "Statutory provisions relied upon"
 * draft section — one paragraph per match, naming the section, Act, and heading the way a real
 * pleading would cite it. The India Code source URL (act.sourceUrl) is deliberately left out of
 * this — it's for verifying the text was sourced correctly while drafting, not something a filed
 * document itself should contain. */
export function buildCitationParagraphs(matches: ActReferenceMatch[]): string[] {
  return matches.map(({ act, section }) => `Section ${section.sectionNo}, ${act.shortTitle} — ${section.heading}.`);
}

export interface CaseLawCitation {
  caseTitle: string;
  citation: string;
  court: string;
  year: number;
  sourceUrl: string;
  /** Why this judgment is being cited for this filing — kept short, printed alongside it. */
  note: string;
}

// Same "fixed to the case type" reasoning as FIXED_CASE_TYPE_CITATIONS above, applied to case
// law: these are the single most-cited landmark judgments squarely on point for what the filing
// itself is (not dependent on any user selection). Each citation was independently verified
// (case title + reported citation confirmed against indiankanoon.org) before being added here —
// never add an entry here without that verification, for the same reason MONEY_LENDING_SECTION_
// BY_ACT_ID never falls back to fuzzy matching: a wrong-but-plausible case citation in a real
// filing is worse than none.
const FIXED_CASE_TYPE_CASE_LAW: Record<string, CaseLawCitation[]> = {
  'ct-drt-oa': [
    {
      caseTitle: 'Allahabad Bank v. Canara Bank',
      citation: '(2000) 4 SCC 406',
      court: 'Supreme Court of India',
      year: 2000,
      sourceUrl: 'https://indiankanoon.org/doc/677551/',
      note: 'Holds that the RDDBFI Act, 1993 gives the Tribunal exclusive jurisdiction over recovery of debts due to banks and financial institutions, overriding other fora.',
    },
  ],
  'ct-drt-sa': [
    {
      caseTitle: 'Mardia Chemicals Ltd. v. Union of India',
      citation: '(2004) 4 SCC 311',
      court: 'Supreme Court of India',
      year: 2004,
      sourceUrl: 'https://indiankanoon.org/doc/1059476/',
      note: 'Upholds the constitutional validity of the SARFAESI Act, 2002 while striking down the requirement that a borrower deposit 75% of the claimed dues before a Section 17 application can be entertained.',
    },
  ],
};

/** Returns the fixed landmark-judgment citation for case types where one is curated, if any. */
export function findFixedCaseTypeCaseLaw(caseTypeId?: string | null): CaseLawCitation[] {
  if (!caseTypeId) return [];
  return FIXED_CASE_TYPE_CASE_LAW[caseTypeId] ?? [];
}

/** Formats matched case law as citation paragraphs for a "Case law relied upon" draft section.
 * Same reasoning as buildCitationParagraphs above — the IndianKanoon source URL stays out of the
 * drafted text itself. */
export function buildCaseLawParagraphs(citations: CaseLawCitation[]): string[] {
  return citations.map((c) => `${c.caseTitle}, ${c.citation} (${c.court}, ${c.year}) — ${c.note}`);
}
