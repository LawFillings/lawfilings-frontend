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
  'act-maharashtra-money-lending-2014': '13',
  'act-bengal-money-lenders-1940': '13',
  'act-madhya-pradesh-money-lenders-1934': '11-H',
  'act-karnataka-money-lenders-1961': '11',
  // Tamil Nadu's Act has no standalone "bar on decree/suit without licence" provision like the
  // other states above (confirmed against its own arrangement of sections) — section 3 (the
  // licensing requirement itself) is the closest fit to what this map is for.
  'act-tamil-nadu-money-lenders-1957': '3',
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
  // Civil Appeal (First Appeal) — Section 96 CPC is the right of appeal itself; Order XLI Rule 1
  // is the memorandum-of-appeal form every First Appeal is actually filed as.
  'ct-civil-appeal-first': [
    { actId: 'act-cpc-1908', sectionNo: '96' },
    { actId: 'act-cpc-1908', sectionNo: 'Order XLI, Rule 1' },
  ],
  // Mutual Consent Divorce — the entire filing is a Section 13B petition.
  'ct-divorce-mutual-consent': [{ actId: 'act-hindu-marriage-1955', sectionNo: '13B' }],
  // Contested Divorce — Section 13 is the whole grounds-based petition; the wizard's own selected
  // grounds narrow which sub-clause(s) actually apply, but the section itself is always relevant.
  'ct-divorce-contested': [{ actId: 'act-hindu-marriage-1955', sectionNo: '13' }],
  // Temporary Injunction Application — Rule 1 (property/dispossession grounds) and Rule 2 (breach
  // of contract/injury grounds) cover the two distinct fact patterns the wizard's Grounds step lets
  // the applicant choose between; both are cited since either may be the one actually pleaded.
  'ct-injunction-temporary': [
    { actId: 'act-cpc-1908', sectionNo: 'Order XXXIX, Rule 1' },
    { actId: 'act-cpc-1908', sectionNo: 'Order XXXIX, Rule 2' },
  ],
  // Suit for Permanent Injunction — Section 38 is the whole substantive relief; Section 36/37
  // supply the "preventive relief"/"perpetual vs. temporary" framing the plaint's Jurisdiction
  // paragraph draws on to distinguish this suit from an Order XXXIX interim application.
  'ct-suit-permanent-injunction': [
    { actId: 'act-specific-relief-1963', sectionNo: '37' },
    { actId: 'act-specific-relief-1963', sectionNo: '38' },
  ],
  // Suit for Declaration — the entire filing is a Section 34 declaration suit.
  'ct-suit-declaration': [{ actId: 'act-specific-relief-1963', sectionNo: '34' }],
  // Suit for Specific Performance — Section 10 is the substantive right to the remedy; Section 16
  // is the "readiness and willingness" averment every specific-performance plaint must plead.
  'ct-suit-specific-performance': [
    { actId: 'act-specific-relief-1963', sectionNo: '10' },
    { actId: 'act-specific-relief-1963', sectionNo: '16' },
  ],
  // Suit for Partition — Section 6 is the coparcenary-right basis for who may seek partition;
  // Order XX Rule 18 CPC is the decree mechanism (preliminary decree, then final decree) every
  // partition suit over ordinary immovable property actually proceeds through.
  'ct-suit-partition': [
    { actId: 'act-hindu-succession-1956', sectionNo: '6' },
    { actId: 'act-cpc-1908', sectionNo: 'Order XX, Rule 18' },
  ],
  // Execution Petition (Civil Decree) — Order XXI Rule 10 is the right to apply for execution;
  // Rule 11 is the form/contents (including the mode-of-execution choice) every application is
  // filed under.
  'ct-dc-execution': [
    { actId: 'act-cpc-1908', sectionNo: 'Order XXI, Rule 10' },
    { actId: 'act-cpc-1908', sectionNo: 'Order XXI, Rule 11' },
  ],
  // Restitution of Conjugal Rights — the entire filing is a Section 9 petition.
  'ct-restitution-conjugal-rights': [{ actId: 'act-hindu-marriage-1955', sectionNo: '9' }],
  // Judicial Separation — Section 10 is the whole petition; it expressly incorporates Section 13's
  // grounds by cross-reference, so both are cited (the wizard's own selected grounds narrow which
  // sub-clause of Section 13 actually applies, same as Contested Divorce).
  'ct-judicial-separation': [
    { actId: 'act-hindu-marriage-1955', sectionNo: '10' },
    { actId: 'act-hindu-marriage-1955', sectionNo: '13' },
  ],
  // Maintenance Application — the entire filing is a Section 144 application.
  'ct-maintenance-application': [{ actId: 'act-bnss-2023', sectionNo: '144' }],
  // Guardianship/Custody Petition — Section 7 is the power to make the order sought; Section 8
  // establishes the Petitioner's standing to apply; Section 17 is the welfare-of-the-minor test the
  // Court must apply; Section 19 is cited because it is the provision that can defeat the petition
  // outright (a living, fit parent) and so is always worth pleading around.
  'ct-guardianship-custody-petition': [
    { actId: 'act-guardians-and-wards-1890', sectionNo: '7' },
    { actId: 'act-guardians-and-wards-1890', sectionNo: '8' },
    { actId: 'act-guardians-and-wards-1890', sectionNo: '17' },
    { actId: 'act-guardians-and-wards-1890', sectionNo: '19' },
  ],
  // Private Criminal Complaint — Section 210 is the cognizance power being invoked, Section 223 is
  // the examination-on-oath every private complaint must go through, and Section 227 is the
  // issue-of-process order actually being sought.
  'ct-private-criminal-complaint': [
    { actId: 'act-bnss-2023', sectionNo: '210' },
    { actId: 'act-bnss-2023', sectionNo: '223' },
    { actId: 'act-bnss-2023', sectionNo: '227' },
  ],
  // Quashing Petition — the entire filing is a Section 528 petition invoking the High Court's
  // inherent powers.
  'ct-quashing-petition': [{ actId: 'act-bnss-2023', sectionNo: '528' }],
};

// Suit for Possession/Eviction forks on the wizard's own "basis" step between a title-based suit
// (Specific Relief Act ss.5/6), a tenant holding over after lease termination (Transfer of
// Property Act ss.106/111), or both — a single static FIXED_CASE_TYPE_CITATIONS entry can't
// represent that fork, so this is a dedicated function like findAncillaryReliefCitations above.
export function findPossessionCitations(params: {
  basedOnTitle: boolean;
  basedOnPriorPossession: boolean;
  tenantHoldingOver: boolean;
}): ActReferenceMatch[] {
  const entries: Array<{ actId: string; sectionNo: string }> = [];
  if (params.basedOnTitle) entries.push({ actId: 'act-specific-relief-1963', sectionNo: '5' });
  if (params.basedOnPriorPossession) entries.push({ actId: 'act-specific-relief-1963', sectionNo: '6' });
  if (params.tenantHoldingOver) {
    entries.push({ actId: 'act-transfer-of-property-1882', sectionNo: '106' });
    entries.push({ actId: 'act-transfer-of-property-1882', sectionNo: '111' });
  }
  return entries.flatMap(({ actId, sectionNo }) => lookup(actId, sectionNo));
}

/** Domestic Violence Act Application wizard: sections 3 (definition of domestic violence) and 12
 * (application to Magistrate) are always cited — the entire filing is a Section 12 application —
 * and each further section is added only when the corresponding relief is actually sought, since
 * sections 18-22 each stand on their own as the source of that specific relief. */
export function findDomesticViolenceCitations(params: {
  protectionOrder: boolean;
  residenceOrder: boolean;
  monetaryRelief: boolean;
  custodyOrder: boolean;
  compensationOrder: boolean;
}): ActReferenceMatch[] {
  const entries: Array<{ actId: string; sectionNo: string }> = [
    { actId: 'act-pwdva-2005', sectionNo: '3' },
    { actId: 'act-pwdva-2005', sectionNo: '12' },
  ];
  if (params.protectionOrder) entries.push({ actId: 'act-pwdva-2005', sectionNo: '18' });
  if (params.residenceOrder) entries.push({ actId: 'act-pwdva-2005', sectionNo: '19' });
  if (params.monetaryRelief) entries.push({ actId: 'act-pwdva-2005', sectionNo: '20' });
  if (params.custodyOrder) entries.push({ actId: 'act-pwdva-2005', sectionNo: '21' });
  if (params.compensationOrder) entries.push({ actId: 'act-pwdva-2005', sectionNo: '22' });
  return entries.flatMap(({ actId, sectionNo }) => lookup(actId, sectionNo));
}

/** Returns the fixed Act-section citation for case types where the filing itself IS the
 * application under that section, if any is curated for the given case type. */
export function findFixedCaseTypeCitation(caseTypeId?: string | null): ActReferenceMatch[] {
  if (!caseTypeId) return [];
  const entries = FIXED_CASE_TYPE_CITATIONS[caseTypeId];
  if (!entries) return [];
  return entries.flatMap(({ actId, sectionNo }) => lookup(actId, sectionNo));
}

/** Divorce wizards (Mutual Consent and Contested) share the same three Hindu Marriage Act, 1955
 *  ancillary-relief provisions — maintenance pendente lite (s.24), permanent alimony (s.25), and
 *  custody of children (s.26) — cited only for whichever the petitioner actually checked, since
 *  an uncited section stated as relied-upon would be a wrong-but-plausible citation. */
export function findAncillaryReliefCitations(params: {
  maintenancePendenteLite: boolean;
  permanentAlimony: boolean;
  custody: boolean;
}): ActReferenceMatch[] {
  const sections: string[] = [];
  if (params.maintenancePendenteLite) sections.push('24');
  if (params.permanentAlimony) sections.push('25');
  if (params.custody) sections.push('26');
  return sections.flatMap((sectionNo) => lookup('act-hindu-marriage-1955', sectionNo));
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
 * draft section — one paragraph per match, phrased as a numbered pleading averment ("That the
 * provisions of Section ... are applicable...") per the standard convention for applications
 * before Indian courts/tribunals, quoting the section's own heading rather than paraphrasing it.
 * The India Code source URL (act.sourceUrl) is deliberately left out of this — it's for verifying
 * the text was sourced correctly while drafting, not something a filed document itself should
 * contain. */
export function buildCitationParagraphs(matches: ActReferenceMatch[]): string[] {
  return matches.map(({ act, section }) => {
    const heading = section.heading.replace(/\.$/, '');
    // A sectionNo like "Order XLI, Rule 1" already reads as a complete reference on its own —
    // prefixing it with "Section" (as every plain numeric sectionNo needs) would read as "Section
    // Order XLI, Rule 1", which isn't how anyone actually cites a CPC Order/Rule.
    const reference = /^order\b/i.test(section.sectionNo) ? section.sectionNo : `Section ${section.sectionNo}`;
    return `That the provisions of ${reference} of ${act.shortTitle}, which deal with "${heading}", are applicable to the present case.`;
  });
}

export interface CaseLawCitation {
  caseTitle: string;
  citation: string;
  court: string;
  year: number;
  sourceUrl: string;
  /** The holding itself, phrased to slot directly after "...held that " — lowercase unless it
   * opens with a proper noun, no leading "Holds"/"Upholds" verb of its own. Used to build the
   * "That the Hon'ble [Court] in [Case], [Citation], has held that [note]." pleading sentence that
   * buildCaseLawParagraphs produces, matching the standard "That..." averment convention used
   * throughout Indian pleadings (and this platform's other citation paragraphs). */
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
      note: 'the RDDBFI Act, 1993 gives the Tribunal exclusive jurisdiction over recovery of debts due to banks and financial institutions, overriding other fora.',
    },
  ],
  'ct-drt-sa': [
    {
      caseTitle: 'Mardia Chemicals Ltd. v. Union of India',
      citation: '(2004) 4 SCC 311',
      court: 'Supreme Court of India',
      year: 2004,
      sourceUrl: 'https://indiankanoon.org/doc/1059476/',
      note: 'the SARFAESI Act, 2002 is constitutionally valid, save for the requirement that a borrower deposit 75% of the claimed dues before a Section 17 application can be entertained, which was struck down.',
    },
  ],
  // Only relevant when the petitioners request waiver of Section 13B(2)'s six-month cooling-off
  // period — the curator's note on that section already cites this case.
  'ct-divorce-mutual-consent': [
    {
      caseTitle: 'Amardeep Singh v. Harveen Kaur',
      citation: '(2017) 8 SCC 746',
      court: 'Supreme Court of India',
      year: 2017,
      sourceUrl: 'https://indiankanoon.org/doc/79830357/',
      note: 'the six-month minimum waiting period under section 13B(2) of the Hindu Marriage Act, 1955 is directory, not mandatory, and may be waived by the court in appropriate cases — e.g. where the parties have already been separated a long time and mediation/settlement efforts have genuinely failed.',
    },
  ],
  // Temporary Injunction and Permanent Injunction — the three-pronged test (prima facie case,
  // balance of convenience, irreparable injury) governing every injunction, temporary or
  // perpetual, comes from case law, not the bare text of Order XXXIX or Section 38 itself.
  'ct-injunction-temporary': [
    {
      caseTitle: 'Dalpat Kumar v. Prahlad Singh',
      citation: '(1992) 1 SCC 719',
      court: 'Supreme Court of India',
      year: 1992,
      sourceUrl: 'https://indiankanoon.org/doc/49480/',
      note: 'the grant of a temporary injunction is governed by three settled principles — a prima facie case, the balance of convenience in favour of the applicant, and irreparable injury that cannot adequately be compensated in damages — all three of which must be established, not merely one.',
    },
  ],
  'ct-suit-permanent-injunction': [
    {
      caseTitle: 'Dalpat Kumar v. Prahlad Singh',
      citation: '(1992) 1 SCC 719',
      court: 'Supreme Court of India',
      year: 1992,
      sourceUrl: 'https://indiankanoon.org/doc/49480/',
      note: "a court granting injunctive relief must weigh the substantial mischief or injury likely to be caused to the plaintiff if the injunction is refused against that likely to be caused to the defendant if it is granted, guided by the prima facie case, balance of convenience, and irreparable injury test.",
    },
  ],
  // Suit for Partition — the daughter's coparcenary right under section 6 of the Hindu Succession
  // Act, 1956 is by birth and applies regardless of whether her father was alive on the date the
  // 2005 Amendment came into force, settling a conflict between earlier Supreme Court benches.
  'ct-suit-partition': [
    {
      caseTitle: 'Vineeta Sharma v. Rakesh Sharma',
      citation: '(2020) 9 SCC 1',
      court: 'Supreme Court of India',
      year: 2020,
      sourceUrl: 'https://indiankanoon.org/doc/67965481/',
      note: 'a daughter becomes a coparcener by birth in the same manner as a son under section 6 of the Hindu Succession Act, 1956, and this right is unaffected by whether her father was alive on 9 September 2005, the date the Hindu Succession (Amendment) Act, 2005 came into force.',
    },
  ],
  // Maintenance Application — the Supreme Court's binding guidelines on how maintenance claims
  // and interim maintenance must be pleaded and proved, including the mandatory Affidavit of
  // Disclosure of Assets and Liabilities every applicant and respondent must now file.
  'ct-maintenance-application': [
    {
      caseTitle: 'Rajnesh v. Neha',
      citation: '(2021) 2 SCC 324',
      court: 'Supreme Court of India',
      year: 2020,
      sourceUrl: 'https://indiankanoon.org/doc/117541087/',
      note: 'every applicant and respondent in a maintenance proceeding must file an Affidavit of Disclosure of Assets and Liabilities in the prescribed format, and laid down comprehensive guidelines governing the payment of interim and permanent maintenance across all maintenance laws.',
    },
  ],
  // Domestic Violence Act Application — the words "adult male" in section 2(q)'s definition of
  // "respondent" were struck down as unconstitutional, so a complaint may be filed against a
  // female relative, or one who is not yet an adult, not only against an adult male.
  'ct-domestic-violence-application': [
    {
      caseTitle: 'Hiral P. Harsora v. Kusum Narottamdas Harsora',
      citation: '(2016) 10 SCC 165',
      court: 'Supreme Court of India',
      year: 2016,
      sourceUrl: 'https://indiankanoon.org/doc/114237665/',
      note: 'the words "adult male" in section 2(q) of the Protection of Women from Domestic Violence Act, 2005, which defines "respondent", are unconstitutional and struck down — an application under this Act may therefore be filed against a female relative, or a relative who has not yet attained majority, in a domestic relationship with the aggrieved person, and is not confined to an adult male.',
    },
  ],
  // Guardianship/Custody Petition — the welfare of the minor is the paramount and overriding
  // consideration in every custody/guardianship decision, even displacing a parent's otherwise
  // preferential legal right under section 19 of the Act.
  'ct-guardianship-custody-petition': [
    {
      caseTitle: 'Gaurav Nagpal v. Sumedha Nagpal',
      citation: '(2009) 1 SCC 42',
      court: 'Supreme Court of India',
      year: 2008,
      sourceUrl: 'https://indiankanoon.org/doc/929793/',
      note: "the welfare of the minor is the paramount consideration in a custody or guardianship matter, and this overrides any statutory preferential right — including a natural parent's — where the facts so require.",
    },
  ],
  // Private Criminal Complaint — issuing process is a serious matter; the Magistrate must apply
  // their mind to the complaint and evidence to find sufficient grounds, and cannot act mechanically
  // — a caution the complaint itself should be drafted to withstand.
  'ct-private-criminal-complaint': [
    {
      caseTitle: 'Pepsi Foods Ltd. v. Special Judicial Magistrate',
      citation: '(1998) 5 SCC 749',
      court: 'Supreme Court of India',
      year: 1997,
      sourceUrl: 'https://indiankanoon.org/doc/574884/',
      note: 'summoning an accused in a criminal case is a serious matter, and the Magistrate must apply their mind to the facts and the evidence on record to find sufficient ground for proceeding before issuing process — not act mechanically or as a matter of course.',
    },
  ],
  // Quashing Petition — the seven-category test governing when the inherent power to quash may be
  // exercised; the entire petition should be drafted to bring the facts within one or more of
  // these categories.
  'ct-quashing-petition': [
    {
      caseTitle: 'State of Haryana v. Bhajan Lal',
      citation: '1992 Supp (1) SCC 335',
      court: 'Supreme Court of India',
      year: 1990,
      sourceUrl: 'https://indiankanoon.org/doc/1033637/',
      note: 'the inherent power to quash an FIR or criminal proceeding may be exercised, illustratively and not exhaustively, where the allegations, even if taken at face value, do not disclose the commission of any offence; where they do not disclose a cognizable offence justifying investigation; where they are so absurd or inherently improbable that no prudent person could ever reach a just conclusion of guilt; or where the proceeding is manifestly attended with mala fides or has been instituted with an ulterior motive for wreaking vengeance, and is such power to be exercised sparingly and with great caution.',
    },
  ],
};

/** Returns the fixed landmark-judgment citation for case types where one is curated, if any. */
export function findFixedCaseTypeCaseLaw(caseTypeId?: string | null): CaseLawCitation[] {
  if (!caseTypeId) return [];
  return FIXED_CASE_TYPE_CASE_LAW[caseTypeId] ?? [];
}

/** Formats matched case law as citation paragraphs for a "Case law relied upon" draft section, in
 * the standard "That the Hon'ble [Court] in [Case], [Citation], held that ..." pleading-averment
 * form — the same convention every other clause in a filed application follows — rather than a
 * bare reference-list entry. The IndianKanoon source URL stays out of the drafted text itself,
 * same reasoning as buildCitationParagraphs above. */
export function buildCaseLawParagraphs(citations: CaseLawCitation[]): string[] {
  return citations.map((c) => `That the Hon'ble ${c.court} in ${c.caseTitle}, ${c.citation}, has held that ${c.note}`);
}

// Bail Application wizard only: same "one case type, citations vary by bailType" split as
// BAIL_SECTIONS_BY_TYPE above, applied to case law instead of statute sections. Arnesh Kumar
// (arrest-necessity guidelines under Section 41/41A CrPC, now Section 35 BNSS) is relevant to
// both regular and anticipatory bail; the other three go specifically to the scope and duration
// of anticipatory bail under Section 438 CrPC (now Section 482 BNSS), so they're anticipatory-only.
// Each citation independently verified (case title + reported citation) against indiankanoon.org
// before being added — same discipline as FIXED_CASE_TYPE_CASE_LAW above.
const ARNESH_KUMAR: CaseLawCitation = {
  caseTitle: 'Arnesh Kumar v. State of Bihar',
  citation: '(2014) 8 SCC 273',
  court: 'Supreme Court of India',
  year: 2014,
  sourceUrl: 'https://indiankanoon.org/doc/2982624/',
  note: 'arrest must not be automatic or mechanical merely because an offence is registered; a police officer must be satisfied that arrest is necessary under Section 41 CrPC (now Section 35 BNSS), and record reasons before arresting.',
};

const BAIL_CASE_LAW_BY_TYPE: Record<'regular' | 'regular_sessions' | 'anticipatory', CaseLawCitation[]> = {
  regular: [ARNESH_KUMAR],
  regular_sessions: [ARNESH_KUMAR],
  anticipatory: [
    {
      caseTitle: 'Gurbaksh Singh Sibbia v. State of Punjab',
      citation: '(1980) 2 SCC 565',
      court: 'Supreme Court of India',
      year: 1980,
      sourceUrl: 'https://indiankanoon.org/doc/1308768/',
      note: 'Section 438 confers a wide discretion on the High Court and Court of Session to grant anticipatory bail, which courts may not narrow by reading in rigid conditions absent from the statute itself.',
    },
    {
      caseTitle: 'Siddharam Satlingappa Mhetre v. State of Maharashtra',
      citation: '(2011) 1 SCC 694',
      court: 'Supreme Court of India',
      year: 2011,
      sourceUrl: 'https://indiankanoon.org/doc/1108032/',
      note: 'anticipatory bail should not, as a rule, be limited to a fixed period, reaffirming the wide protective scope of Section 438.',
    },
    {
      caseTitle: 'Sushila Aggarwal v. State (NCT of Delhi)',
      citation: '(2020) 5 SCC 1',
      court: 'Supreme Court of India',
      year: 2020,
      sourceUrl: 'https://indiankanoon.org/doc/123660783/',
      note: 'anticipatory bail need not be time-bound and, absent special circumstances, may continue until the end of the trial.',
    },
    ARNESH_KUMAR,
  ],
};

/** Returns the curated case-law citations matching which bail application (regular or
 * anticipatory) the wizard has resolved to. */
export function findBailCaseLaw(bailType: 'regular' | 'regular_sessions' | 'anticipatory' | null): CaseLawCitation[] {
  if (!bailType) return [];
  return BAIL_CASE_LAW_BY_TYPE[bailType];
}
