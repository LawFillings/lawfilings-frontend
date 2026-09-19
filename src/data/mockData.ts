import type { CaseType, ClauseDef, Forum, AppealGroup } from '../types';

export const forums: Forum[] = [
  { id: 'f-cc', name: 'Consumer Commission', forumType: 'consumer_commission', advocateMandatory: false },
  { id: 'f-drt', name: 'DRT', forumType: 'DRT', advocateMandatory: false },
  { id: 'f-drat', name: 'DRAT', forumType: 'DRAT', advocateMandatory: false },
  { id: 'f-nclt', name: 'NCLT', forumType: 'NCLT', advocateMandatory: false },
  // Covers civil, criminal, and family matters — all heard by the same subordinate judiciary at
  // the district level (a District Judge, Sessions Judge, and Family Court judge are typically
  // the same cadre, often the same court complex), unlike DRT/NCLT/Consumer Commission, which are
  // genuinely separate tribunals. Home.tsx groups this forum's case types under a Civil/Criminal/
  // Family top-category tier (each item's `topCategory`) before its usual subcategory tabs. Many
  // of these resolve their own real forum internally as Magistrate/Sessions/Family/High Court,
  // independent of this catalog-level forumType, same as f-misc's own items.
  { id: 'f-dc', name: 'District Court', forumType: 'district_court', advocateMandatory: false },
  { id: 'f-hc', name: 'High Court', forumType: 'high_court', advocateMandatory: false },
  { id: 'f-sc', name: 'Supreme Court', forumType: 'supreme_court', advocateMandatory: true },
  // Tax Matters — a fourth pillar alongside DRT/DRAT and NCLT/NCLAT above, covering Income Tax,
  // GST, and Customs/Excise/Service Tax. Unlike DRT/DRAT (kept as separate tabs), each of these
  // three tax regimes has its own two-tier appellate structure (a first appeal to a departmental
  // appellate authority, then a second appeal to a dedicated Tribunal) that's specific to that one
  // regime — so rather than six-plus separate tabs, they're grouped under this single forum, with
  // Home.tsx rendering Income Tax/GST/Customs & Excise as a top-category tier (each item's
  // `topCategory`), mirroring the pattern already used for district_court's Civil/Criminal/Family
  // split above.
  { id: 'f-tax', name: 'Taxation Tribunals', forumType: 'tax_matters', advocateMandatory: false },
  // Umbrella tab for filings that don't belong under any single court/tribunal — pre-litigation
  // letters, private deeds, criminal-court applications and complaints. Each wizard resolves its
  // own actual forum/court internally (from user choices), independent of this shared forumType,
  // which exists purely to group these on Home.
  { id: 'f-misc', name: 'Misc. Drafts', forumType: 'misc_drafts', advocateMandatory: false },
];

export const caseTypes: CaseType[] = [
  {
    id: 'ct-cc-complaint',
    forumType: 'consumer_commission',
    name: 'Consumer Complaint',
    governingLaw: 'Consumer Protection Act, 2019, Section 35',
    plainLanguageSummary:
      'Use this if a company sold you something faulty, or a service fell short of what was promised, and they won’t fix it.',
    applicantEligibility: 'any_consumer',
    filingCategory: 'original',
    jurisdictionRule: {
      ruleType: 'pecuniary_tier',
      tiers: [
        { forumLabel: 'District Commission', max: 5000000 },
        { forumLabel: 'State Commission', min: 5000000, max: 20000000 },
        { forumLabel: 'National Commission', min: 20000000 },
      ],
      note: 'Based on value of consideration paid, per the Consumer Protection Act 2019 as amended, upheld by the Supreme Court in 2025.',
    },
  },
  {
    id: 'ct-drt-sa',
    forumType: 'DRT',
    name: 'Securitisation Application (SA)',
    governingLaw: 'SARFAESI Act, 2002, Section 17',
    plainLanguageSummary:
      'Use this if a bank has sent you a possession notice or is trying to seize property you put up as security, and you believe the process was not followed correctly.',
    applicantEligibility: 'borrower_only',
    filingCategory: 'original',
    jurisdictionRule: {
      ruleType: 'debt_threshold',
      minAmount: 2000000,
      note: 'Raised from ₹10 lakh to ₹20 lakh by a 2018 notification under the RDDBFI Act; a 2023 Delhi HC ruling held this also applies to Section 17 SARFAESI applications. No maximum.',
    },
  },
  {
    id: 'ct-drt-ws',
    forumType: 'DRT',
    name: 'Written Statement — reply to Original Application',
    governingLaw: 'The Recovery of Debts and Bankruptcy Act, 1993, Section 19(5)',
    plainLanguageSummary:
      'Use this if a bank has filed a recovery case against you at the DRT and you need to respond within the deadline, or the tribunal may decide the case without hearing your side.',
    applicantEligibility: 'borrower_or_guarantor',
    filingCategory: 'reply',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    condonableExtensionDays: 15,
  },
  {
    id: 'ct-drt-review',
    forumType: 'DRT',
    name: 'Review Application',
    governingLaw: 'DRT (Procedure) Rules, 1993, Rule 5A',
    plainLanguageSummary:
      'Use this if the Tribunal made a clear, obvious mistake on the face of its order — not a full re-argument of the case.',
    applicantEligibility: 'aggrieved_party',
    filingCategory: 'interlocutory',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    condonableExtensionDays: 0,
    parentRequired: true,
  },
  {
    id: 'ct-drat-appeal',
    forumType: 'DRAT',
    name: 'Appeal to DRAT against DRT order',
    governingLaw: 'The Recovery of Debts and Bankruptcy Act, 1993, Section 20',
    plainLanguageSummary: 'Use this to challenge a final or substantive order passed by the DRT.',
    applicantEligibility: 'any_aggrieved_party',
    filingCategory: 'appeal',
    limitationDays: 30,
    deposit: {
      pct: 50,
      reducibleToPct: 25,
      reductionAt: 'DRAT discretion, reasons recorded in writing',
      basis: 'debt amount due as determined by DRT',
      provision: 'Section 21',
      note: 'Confirmed against the official RDDBFI Act text on India Code (as on 15 May 2026) — the limitation period was changed from 45 to 30 days by the 2016 amendment (Act 44 of 2016, s. 34).',
    },
  },
  {
    id: 'ct-nclt-s9',
    forumType: 'NCLT',
    name: 'Section 9 IBC — Operational Creditor CIRP Application',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016, Section 9',
    plainLanguageSummary:
      'Use this if a company owes you money for goods or services, hasn’t paid despite a formal demand, and you want to initiate insolvency proceedings.',
    applicantEligibility: 'any_operational_creditor',
    filingCategory: 'original',
    jurisdictionRule: {
      ruleType: 'subject_matter_and_bench',
      note: 'No pecuniary tier — jurisdiction is by subject matter (insolvency of a company/LLP) and bench is fixed by the corporate debtor’s registered office.',
    },
    eligibilityGates: [
      {
        id: 'debtor_type',
        kind: 'yes_no',
        question: 'Is the party that owes you money a company or LLP?',
        helpText: 'Section 9 (IBC) only applies to corporate debtors — not individuals or partnerships.',
        blockOnAnswer: 'no',
        blockMessage:
          'IBC only applies to corporate debtors. If the debtor is an individual or a firm, this isn’t the right route — a civil recovery suit or, if the amount qualifies, a DRT filing may apply instead.',
      },
      {
        id: 'debt_amount',
        kind: 'number',
        question: 'What is the total unpaid amount?',
        helpText: 'The minimum default threshold for a Section 9 application is ₹1 crore.',
        blockBelow: 10000000,
        blockBelowMessage:
          'Below ₹1 crore, this application cannot be filed under Section 9 at all — this isn’t a case-by-case judgment call, it’s a fixed statutory threshold.',
      },
      {
        id: 'demand_notice',
        kind: 'yes_no',
        question: 'Have you already sent a Section 8 demand notice and waited 10 days?',
        helpText: 'A Section 9 application cannot be filed until this notice period has run.',
        blockOnAnswer: 'no',
        blockMessage:
          'You need to send a Section 8 demand notice (Form 3 or 4) and wait 10 days before this application can be filed. That notice is a separate, earlier document — not something to skip.',
      },
      {
        id: 'dispute_received',
        kind: 'yes_no',
        question: 'Did the company reply disputing the debt, or is there any earlier communication where they disputed it?',
        helpText: 'This is the single most litigated issue in Section 9 cases — whether a genuine dispute existed before your demand notice.',
        warnOnAnswer: 'yes',
        warnMessage:
          'Whether a dispute is genuine or an afterthought is the most litigated question in Section 9 cases, and it usually decides whether the application is admitted at all. This case needs careful handling — strongly consider involving an advocate.',
      },
    ],
  },
  {
    id: 'ct-nclt-reply9',
    forumType: 'NCLT',
    name: 'Reply by Corporate Debtor to Section 7/9/10 application',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016',
    plainLanguageSummary:
      'Use this if your company has been served with an insolvency application and needs to respond by the date the Tribunal set.',
    applicantEligibility: 'corporate_debtor_only',
    filingCategory: 'reply',
    deadlineSource: 'tribunal_assigned',
  },
  {
    id: 'ct-drt-appeal-ro',
    forumType: 'DRT',
    name: 'Appeal against Recovery Officer’s order',
    governingLaw: 'The Recovery of Debts and Bankruptcy Act, 1993, Section 30',
    plainLanguageSummary:
      'Use this if you disagree with a specific order the Recovery Officer passed while executing a recovery certificate.',
    applicantEligibility: 'borrower_or_affected_party',
    filingCategory: 'appeal',
    limitationDays: 30,
    deposit: {
      pct: 50,
      basis: 'debt amount due as determined by the Tribunal',
      provision: 'Section 30A',
    },
  },
  {
    id: 'ct-drt-appeal-chamber',
    forumType: 'DRT',
    name: 'Chamber Appeal against Registrar’s order',
    governingLaw: 'DRT (Procedure) Rules, 1993, Rule 5(5)',
    plainLanguageSummary:
      'Use this if you disagree with a procedural or administrative order passed by the Registrar. The Presiding Officer’s decision on this is final.',
    applicantEligibility: 'any_party_to_proceeding',
    filingCategory: 'appeal',
    limitationDays: 15,
  },
  {
    id: 'ct-nclat-appeal-ibc',
    forumType: 'NCLAT',
    name: 'Appeal to NCLAT — insolvency matters',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016, Section 61',
    plainLanguageSummary:
      'Use this to challenge an NCLT order in an insolvency case. This deadline is strictly enforced.',
    applicantEligibility: 'any_aggrieved_party',
    filingCategory: 'appeal',
    limitationDays: 30,
    condonableExtensionDays: 15,
  },
  {
    id: 'ct-nclat-appeal-companies',
    forumType: 'NCLAT',
    name: 'Appeal to NCLAT — company law matters',
    governingLaw: 'Companies Act, 2013, Section 421',
    plainLanguageSummary:
      'Use this to challenge an NCLT order in a company law matter — not an insolvency case.',
    applicantEligibility: 'any_aggrieved_party',
    filingCategory: 'appeal',
    limitationDays: 45,
    condonableExtensionDays: 45,
  },
  {
    id: 'ct-cc-execution',
    forumType: 'consumer_commission',
    name: 'Execution Application',
    governingLaw: 'Consumer Protection Act, 2019, Sections 71–72',
    plainLanguageSummary:
      'Use this if the opposite party hasn’t complied with a final order — non-compliance is punishable, and this asks the Commission to enforce it.',
    applicantEligibility: 'complainant_or_person_in_whose_favour_order_passed',
    filingCategory: 'execution',
  },
  {
    id: 'ct-drt-ia-general',
    forumType: 'DRT',
    name: 'Interlocutory Application (IA) — general',
    governingLaw: 'DRT (Procedure) Rules, 1993',
    plainLanguageSummary: 'Use this to ask the Tribunal for interim relief while your case is pending.',
    applicantEligibility: 'any_party_to_pending_case',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-drt-ma-general',
    forumType: 'DRT',
    name: 'Miscellaneous Application (MA) — general',
    governingLaw: 'DRT e-filing categories',
    plainLanguageSummary: 'Use this for anything connected to your case that isn’t an OA, SA, or IA — for example, claiming costs separately or seeking directions.',
    applicantEligibility: 'any_party',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-nclt-ia-general',
    forumType: 'NCLT',
    name: 'Interlocutory Application (IA) — general',
    governingLaw: 'NCLT Rules, 2016',
    plainLanguageSummary: 'Use this to ask the Tribunal for interim relief while your case is pending.',
    applicantEligibility: 'any_party_to_pending_case',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-nclt-12a',
    forumType: 'NCLT',
    name: 'Section 12A — Withdrawal of admitted CIRP application',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016, Section 12A',
    plainLanguageSummary: 'Use this if the parties have settled after admission — needs 90% Committee of Creditors approval.',
    applicantEligibility: 'applicant_of_admitted_case',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-nclt-restoration',
    forumType: 'NCLT',
    name: 'Restoration Application',
    governingLaw: 'NCLT Rules, 2016',
    plainLanguageSummary: 'Use this if your case was dismissed for a procedural reason and you want the Tribunal to revive it.',
    applicantEligibility: 'any_party',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-cc-written-version',
    forumType: 'consumer_commission',
    name: 'Written Version — reply to Consumer Complaint',
    governingLaw: 'Consumer Protection Act, 2019, Section 38(2)(a) and 38(3)',
    plainLanguageSummary: 'Use this if a consumer complaint has been filed against you and you need to respond within the deadline.',
    applicantEligibility: 'opposite_party',
    filingCategory: 'reply',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    condonableExtensionDays: 15,
    parentRequired: true,
  },
  {
    id: 'ct-cc-revision-district',
    forumType: 'consumer_commission',
    name: 'Revision Petition (State over District)',
    governingLaw: 'Consumer Protection Act, 2019, Section 40',
    plainLanguageSummary: 'A narrower remedy than an appeal — use this only if the District Commission exceeded or failed to exercise its jurisdiction, not simply because you disagree with the outcome.',
    applicantEligibility: 'any_aggrieved_party',
    filingCategory: 'interlocutory',
  },
  {
    id: 'ct-cc-ia-general',
    forumType: 'consumer_commission',
    name: 'Interlocutory Application (IA) — general',
    governingLaw: 'Consumer Protection Act, 2019 / Regulations',
    plainLanguageSummary: 'Use this to ask the Commission for interim relief or a procedural order while your case is pending.',
    applicantEligibility: 'any_party_to_pending_case',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-drt-oa',
    forumType: 'DRT',
    name: 'Original Application (OA) for debt recovery',
    governingLaw: 'The Recovery of Debts and Bankruptcy Act, 1993, Section 19',
    plainLanguageSummary: 'Filed by a bank or financial institution to recover an unpaid debt of ₹20 lakh or more from a borrower or guarantor.',
    applicantEligibility: 'bank_or_financial_institution_only',
    filingCategory: 'original',
    jurisdictionRule: {
      ruleType: 'debt_threshold',
      minAmount: 2000000,
      note: 'Same ₹20 lakh threshold as the SA route — raised from ₹10 lakh by a 2018 notification under the RDDBFI Act.',
    },
  },
  {
    id: 'ct-dc-money-recovery',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Money Recovery Suit',
    governingLaw: 'Code of Civil Procedure, 1908',
    plainLanguageSummary:
      'Use this if someone owes you money — an unpaid loan, an unpaid invoice, or a bounced cheque — and you want to sue them for it in a District Court.',
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-dc-summary-suit',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Summary Suit (Order XXXVII)',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXVII',
    plainLanguageSummary:
      'Use this if you’re owed money under a written contract, a cheque, or a promissory note — a faster procedure where the other side must get the court’s permission to contest.',
    applicantEligibility: 'plaintiff_with_written_contract_or_negotiable_instrument',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
    eligibilityGates: [
      {
        id: 'gate-written-instrument',
        question: 'Is your claim based on a written contract, a bill of exchange, hundi, or promissory note for a fixed sum?',
        kind: 'yes_no',
        blockOnAnswer: 'no',
        blockMessage:
          'Order XXXVII’s summary procedure only applies to claims based on a written contract or negotiable instrument for a fixed sum. Go back and use the general Money Recovery Suit instead.',
      },
    ],
  },
  {
    id: 'ct-legal-notice',
    forumType: 'misc_drafts',
    name: 'Legal Notice',
    governingLaw: 'General pre-litigation notice practice',
    plainLanguageSummary:
      'Send a formal notice demanding payment or action before filing a case — often a required or strongly advisable first step, and sometimes a legal precondition, before suing.',
    applicantEligibility: 'any_claimant',
    filingCategory: 'original',
  },
  {
    id: 'ct-contract-agreement',
    forumType: 'misc_drafts',
    name: 'Contract Agreement',
    governingLaw: 'Indian Contract Act, 1872',
    plainLanguageSummary:
      'Draft a private agreement between two parties — a rent/lease, a loan, an employment contract, or a general-purpose agreement. Not filed with any court; stamp duty and registration requirements vary by state and are not covered here.',
    applicantEligibility: 'any_party',
    filingCategory: 'original',
  },
  {
    id: 'ct-bail-application',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Bail Application',
    governingLaw: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    plainLanguageSummary:
      'Apply for bail in a criminal case — either regular bail after arrest, or anticipatory bail in advance of an expected arrest.',
    applicantEligibility: 'accused_or_apprehending_arrest',
    filingCategory: 'original',
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-mediation-application',
    forumType: 'misc_drafts',
    name: 'Pre-Institution Mediation Application',
    governingLaw: 'Commercial Courts Act, 2015, Section 12A',
    plainLanguageSummary:
      'Apply for mandatory pre-institution mediation before filing a commercial court suit — required for a commercial dispute unless you need urgent interim relief.',
    applicantEligibility: 'any_claimant',
    filingCategory: 'original',
  },
  {
    id: 'ct-ni-act-complaint',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Cheque Dishonour Complaint (Sections 138 & 142, NI Act)',
    governingLaw: 'Negotiable Instruments Act, 1881, Sections 138 & 142',
    plainLanguageSummary:
      "File a criminal complaint before the Magistrate after a cheque is dishonoured and the drawer fails to pay within 15 days of your notice.",
    applicantEligibility: 'payee_or_holder_in_due_course',
    filingCategory: 'original',
    subcategory: 'trial-stage-applications',
  },
  {
    id: 'ct-civil-appeal-first',
    forumType: 'high_court',
    name: 'Civil Appeal (First Appeal from a District Court decree)',
    governingLaw: 'Code of Civil Procedure, 1908, Section 96 and Order XLI',
    plainLanguageSummary:
      'Challenge a District Court\'s decree or judgment before the High Court — the standard route once a civil suit has been decided against you and there\'s no separate appellate forum (like a Tribunal) for that type of case.',
    applicantEligibility: 'party_aggrieved_by_district_court_decree',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    parentRequired: true,
    subcategory: 'hc-appeals',
  },
  {
    id: 'ct-injunction-temporary',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Temporary Injunction Application (Order XXXIX Rules 1 & 2, CPC)',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXIX, Rules 1 & 2',
    plainLanguageSummary:
      "File this within a pending civil suit to ask the Court to restrain the other side — from selling or damaging disputed property, or from repeating a breach — until the suit is decided.",
    applicantEligibility: 'plaintiff_or_defendant_in_pending_suit',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-dc-written-statement',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Written Statement — reply to a Civil Suit',
    governingLaw: 'Code of Civil Procedure, 1908, Order VIII, Rule 1',
    plainLanguageSummary:
      "Use this if a civil suit has been filed against you and you need to respond within the deadline — ordinarily 30 days from service, extendable by the Court up to 90 days for reasons recorded in writing (a stricter 120-day cap with no further extension applies if the suit is a commercial dispute).",
    applicantEligibility: 'defendant_in_pending_suit',
    filingCategory: 'reply',
    subcategory: 'responding-suit-management',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    condonableExtensionDays: 60,
    parentRequired: true,
  },
  {
    id: 'ct-suit-permanent-injunction',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Permanent Injunction',
    governingLaw: 'Specific Relief Act, 1963, Sections 36–38',
    plainLanguageSummary:
      "File this to permanently stop someone from doing something — encroaching on your property, repeating a breach, or interfering with a right of yours — where a one-time court order at the end of the case is what you need, not just an interim order while it's pending.",
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'injunctions-interim-relief',
  },
  {
    id: 'ct-suit-mandatory-injunction',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Mandatory Injunction',
    governingLaw: 'Specific Relief Act, 1963, Section 39',
    plainLanguageSummary:
      "File this to make someone actually do something they were obligated to do — restore a right of way they blocked, remove an encroaching structure, or reconnect a water/electricity connection they wrongfully cut off — rather than simply stop them from continuing an act.",
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'injunctions-interim-relief',
  },
  {
    id: 'ct-application-set-aside-exparte-decree',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application to Set Aside Ex-Parte Decree',
    governingLaw: 'Code of Civil Procedure, 1908, Order IX, Rule 13',
    plainLanguageSummary:
      "File this if a court decided a case against you without hearing you, because you missed the hearing date — you can ask for the decree to be set aside and the case reopened if you show either that you were never properly served with the summons, or that you had a genuine, sufficient reason for not appearing.",
    applicantEligibility: 'defendant_against_whom_exparte_decree_passed',
    filingCategory: 'interlocutory',
    subcategory: 'responding-suit-management',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    parentRequired: true,
  },
  {
    id: 'ct-application-condonation-of-delay',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Condonation of Delay',
    governingLaw: 'Limitation Act, 1963, Section 5',
    plainLanguageSummary:
      "File this alongside an appeal or application you're filing after its normal deadline has passed — it asks the Court to excuse the delay and accept the accompanying filing anyway, provided you can show a genuine, sufficient reason you couldn't file on time.",
    applicantEligibility: 'any_appellant_or_applicant',
    filingCategory: 'interlocutory',
    subcategory: 'responding-suit-management',
    parentRequired: true,
  },
  {
    id: 'ct-claim-objection-execution',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Claim/Objection Petition in Execution',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXI, Rule 58',
    plainLanguageSummary:
      "File this if property belonging to you has been wrongly attached in someone else's execution case — you were never a party to that suit, but the decree-holder is trying to sell your property to recover what the judgment-debtor owes them. This asks the executing court to release your property from attachment.",
    applicantEligibility: 'third_party_claimant_or_objector',
    filingCategory: 'interlocutory',
    subcategory: 'execution-enforcement',
    parentRequired: true,
  },
  {
    id: 'ct-interpleader-suit',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Interpleader Suit',
    governingLaw: 'Code of Civil Procedure, 1908, Section 88 and Order XXXV',
    plainLanguageSummary:
      "File this if you're holding money or property that two or more other people are each separately claiming from you, and you have no personal stake in it yourself — instead of picking a side or risking being sued twice over, this asks the Court to decide who is actually entitled to it, so you can safely hand it over to whoever the Court names.",
    applicantEligibility: 'stakeholder_with_no_personal_interest',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-mact-claim-petition',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Motor Accident Claims Petition',
    governingLaw: 'Motor Vehicles Act, 1988, Section 166',
    plainLanguageSummary:
      'File this to claim compensation for death or injury caused by a road accident involving a motor vehicle, from the vehicle\'s driver, owner, and insurer — before the Motor Accident Claims Tribunal, which is usually the District Judge of that district sitting in that separate capacity.',
    applicantEligibility: 'accident_victim_or_legal_representative',
    filingCategory: 'original',
    subcategory: 'special-estate-proceedings',
    deadlineSource: 'statutory_fixed',
    limitationDays: 180,
    condonableExtensionDays: 0,
  },
  {
    id: 'ct-land-acquisition-reference',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Land Acquisition Reference',
    governingLaw: 'Land Acquisition Act, 1894, Section 18',
    plainLanguageSummary:
      "File this if you disagree with the Collector's award for your acquired land — whether it's the compensation amount, how the land was measured, who it's payable to, or how it's split among interested parties. This is a written application to the Collector asking that the matter be referred to the District Court, which independently decides the correct answer.",
    applicantEligibility: 'person_interested_in_acquired_land',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-suit-redemption-mortgage',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Redemption of Mortgage',
    governingLaw: 'Transfer of Property Act, 1882, Section 60',
    plainLanguageSummary:
      "File this if you mortgaged your property to secure a loan, and you've paid off (or are ready and willing to pay off) the mortgage debt, but the mortgagee won't return your property, your title documents, or give you a clear release — this asks the Court to let you redeem the mortgage: pay what's genuinely due, and get everything back free of the mortgage.",
    applicantEligibility: 'mortgagor_or_person_interested_in_redeeming',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-attachment-before-judgment',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Attachment Before Judgment',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXVIII, Rule 5',
    plainLanguageSummary:
      "File this alongside a civil suit you've already filed, if you have specific, credible reason to believe the defendant is about to sell, transfer, or move their property out of the Court's reach in order to defeat the decree you're likely to win — this asks the Court to attach that property now, before judgment, so it stays available to satisfy the decree later.",
    applicantEligibility: 'plaintiff_in_pending_suit',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-suit-cancellation-of-document',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Cancellation of Document',
    governingLaw: 'Specific Relief Act, 1963, Section 31',
    plainLanguageSummary:
      'File this if a document — a sale deed, gift deed, power of attorney, or similar — affecting you or your property is void or voidable (say, obtained by fraud, forgery, or undue influence), and leaving it outstanding threatens you with serious injury. This asks the Court to adjudge the document void or voidable and order it delivered up and cancelled.',
    applicantEligibility: 'person_against_whom_instrument_is_void_or_voidable',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-application-possession-resistance',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Possession — Resistance or Dispossession',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXI, Rules 97–101',
    plainLanguageSummary:
      "File this during execution of a decree for possession of immovable property if you're either (a) the decree-holder or auction-purchaser being resisted or obstructed from actually taking possession, or (b) someone who was never the judgment-debtor but was thrown out of the property after the decree-holder or purchaser took possession. This asks the executing court to decide the dispute itself — including any title claim raised — and put you into possession.",
    applicantEligibility: 'decree_holder_purchaser_or_dispossessed_third_party',
    filingCategory: 'execution',
    subcategory: 'execution-enforcement',
    parentRequired: true,
  },
  {
    id: 'ct-suit-foreclosure-mortgage',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Foreclosure or Sale of Mortgaged Property',
    governingLaw: 'Transfer of Property Act, 1882, Section 67',
    plainLanguageSummary:
      "File this if a mortgagor has failed to repay a mortgage debt after it fell due — this asks the Court to either sell the mortgaged property to recover what's owed, or (only if the mortgage is a conditional-sale or foreclosure-entitled anomalous mortgage) permanently debar the mortgagor's right to redeem it. Which relief you're entitled to depends on the type of mortgage — this wizard asks you first.",
    applicantEligibility: 'mortgagee',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-application-restoration-suit-default',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Restoration of Suit Dismissed for Default',
    governingLaw: 'Code of Civil Procedure, 1908, Order IX, Rule 9',
    plainLanguageSummary:
      "File this if your own civil suit was dismissed because you (the plaintiff) failed to appear when it was called for hearing, even though the defendant was present — this asks the Court to set aside that dismissal and restore your suit, if you can show a genuine, sufficient reason for your absence. You cannot file a fresh suit on the same claim instead — this is the only way back in.",
    applicantEligibility: 'plaintiff_whose_suit_dismissed_for_default',
    filingCategory: 'interlocutory',
    subcategory: 'responding-suit-management',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    parentRequired: true,
  },
  {
    id: 'ct-application-injunction-disobedience',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Attachment/Detention for Disobedience of Injunction',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXIX, Rule 2A',
    plainLanguageSummary:
      "File this if the other side has disobeyed or breached a temporary injunction (or another order) already granted in your favour in a pending suit — this asks the Court to attach the disobedient party's property, or detain them in civil prison for up to three months, or both, to compel compliance and punish the breach.",
    applicantEligibility: 'party_in_whose_favour_injunction_granted',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-application-appointment-receiver',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Appointment of Receiver',
    governingLaw: 'Code of Civil Procedure, 1908, Order XL, Rule 1',
    plainLanguageSummary:
      "File this within a pending civil suit if property in dispute is in real, immediate danger of being wasted, damaged, or mismanaged, and no other remedy will protect it — this asks the Court to appoint a neutral receiver to take over its possession, management, and collection of rents/profits until the suit is decided. Courts treat this as one of the harshest interim remedies, granted only in genuinely exceptional circumstances.",
    applicantEligibility: 'party_to_pending_suit',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-suit-easementary-rights',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Easementary Rights',
    governingLaw: 'Indian Easements Act, 1882, Sections 33 & 35',
    plainLanguageSummary:
      "File this if a neighbouring landowner is obstructing (or has threatened to obstruct) a right you genuinely hold over their land for the benefit of your own — a right of way, light, air, drainage, or similar — whether that right was granted to you, arises because your land was carved out of theirs, or has been openly and continuously exercised for 20+ years. This asks the Court to declare the easement and either award compensation for the disturbance, injunct it, or both.",
    applicantEligibility: 'owner_or_occupier_of_land_with_an_easement_over_neighbouring_land',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-suit-partnership-dissolution-accounts',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Dissolution of Partnership and Rendition of Accounts',
    governingLaw: 'The Indian Partnership Act, 1932, Section 44',
    plainLanguageSummary:
      "File this if you're a partner in a firm and want the Court to dissolve it — because a partner is incapacitated, is harming the business, is in persistent breach of the partnership agreement, has transferred away their share, the business can only run at a loss, or any other ground that makes dissolution just and equitable — and to have the firm's accounts settled and its assets and liabilities wound up between the partners.",
    applicantEligibility: 'partner_in_a_firm',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-suit-declaration',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Declaration',
    governingLaw: 'Specific Relief Act, 1963, Section 34',
    plainLanguageSummary:
      "File this to ask the Court to formally declare your legal title, status, or right where someone is denying it — for example, a declaration that you are the rightful owner of a property. If you can also ask for further relief (like possession), you generally must ask for it in the same suit.",
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-dc-ia-general',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Interlocutory Application (IA) — general',
    governingLaw: 'Code of Civil Procedure, 1908',
    plainLanguageSummary:
      'Use this to ask the Court for any interim order or direction — other than a temporary injunction, which has its own dedicated wizard — while your civil suit is pending.',
    applicantEligibility: 'any_party_to_pending_suit',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-suit-specific-performance',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Specific Performance of Contract',
    governingLaw: 'Specific Relief Act, 1963, Sections 10, 14 & 16',
    plainLanguageSummary:
      "File this if the other side to a contract — typically a sale agreement — is refusing to complete their part of the deal, and you want the Court to order them to actually carry it out, not just pay you damages for breaking it.",
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-suit-partition',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Partition',
    governingLaw: 'Hindu Succession Act, 1956, Section 6, read with the Code of Civil Procedure, 1908, Order XX Rule 18',
    plainLanguageSummary:
      "File this to divide jointly-owned family property and get your own separate share — typically ancestral/coparcenary property where the other co-owners won't agree to divide it amicably.",
    applicantEligibility: 'any_coparcener_or_co-owner',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-suit-possession',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Possession / Eviction',
    governingLaw: 'Specific Relief Act, 1963, Sections 5 & 6, and Transfer of Property Act, 1882, Sections 106 & 111',
    plainLanguageSummary:
      'File this to recover possession of your property — from a tenant holding over after their lease ended, or from someone occupying it without any right to. If the property is covered by a state Rent Control Act, its own eviction grounds and procedure apply instead of, or in addition to, general civil law.',
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-dc-execution',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Execution Petition (Civil Decree)',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXI',
    plainLanguageSummary:
      "Use this if the other side hasn't complied with a civil court decree already passed in your favour — this asks the Court to enforce it, by attachment and sale of property, delivery of possession, arrest and detention, or whichever mode fits the decree.",
    applicantEligibility: 'decree_holder',
    filingCategory: 'execution',
    subcategory: 'execution-enforcement',
  },
  {
    id: 'ct-divorce-mutual-consent',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Mutual Consent Divorce Petition (Hindu Marriage Act, S.13B)',
    governingLaw: 'The Hindu Marriage Act, 1955, Section 13B',
    plainLanguageSummary:
      "File this jointly with your spouse when you both agree to end the marriage — you've been living separately for a year or more and have agreed on terms for maintenance, custody, and property.",
    applicantEligibility: 'married_hindu_couple_both_consent',
    filingCategory: 'original',
    subcategory: 'divorce-marital-status',
  },
  {
    id: 'ct-divorce-contested',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Contested Divorce Petition (Hindu Marriage Act, S.13)',
    governingLaw: 'The Hindu Marriage Act, 1955, Section 13',
    plainLanguageSummary:
      "File this if your spouse won't agree to a divorce — you'll need to prove one of the legal grounds (cruelty, desertion, adultery, etc.).",
    applicantEligibility: 'married_hindu_spouse',
    filingCategory: 'original',
    subcategory: 'divorce-marital-status',
  },
  {
    id: 'ct-restitution-conjugal-rights',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Restitution of Conjugal Rights (Hindu Marriage Act, S.9)',
    governingLaw: 'The Hindu Marriage Act, 1955, Section 9',
    plainLanguageSummary:
      "File this if your spouse has withdrawn from your company without a reasonable excuse, and you want the Court to direct them to resume living together with you.",
    applicantEligibility: 'married_hindu_spouse',
    filingCategory: 'original',
    subcategory: 'divorce-marital-status',
  },
  {
    id: 'ct-judicial-separation',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Judicial Separation (Hindu Marriage Act, S.10)',
    governingLaw: 'The Hindu Marriage Act, 1955, Section 10',
    plainLanguageSummary:
      "File this if you want to live separately from your spouse without ending the marriage — on the same grounds as a divorce (cruelty, desertion, etc.), but without dissolving the marriage itself.",
    applicantEligibility: 'married_hindu_spouse',
    filingCategory: 'original',
    subcategory: 'divorce-marital-status',
  },
  {
    id: 'ct-maintenance-application',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Maintenance Application (BNSS, S.144)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 144',
    plainLanguageSummary:
      "File this if you're a wife, child, or parent unable to maintain yourself, and a person who is legally bound to maintain you — with sufficient means — has neglected or refused to do so.",
    applicantEligibility: 'wife_child_or_parent_seeking_maintenance',
    filingCategory: 'original',
    subcategory: 'maintenance-protection',
  },
  {
    id: 'ct-domestic-violence-application',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Domestic Violence Act Application (PWDVA, S.12)',
    governingLaw: 'The Protection of Women from Domestic Violence Act, 2005, Section 12',
    plainLanguageSummary:
      "File this if you've faced physical, sexual, verbal, emotional, or economic abuse from someone you live or lived with, and want protection, residence, monetary, custody, or compensation orders against them.",
    applicantEligibility: 'woman_in_domestic_relationship_facing_abuse',
    filingCategory: 'original',
    subcategory: 'maintenance-protection',
  },
  {
    id: 'ct-guardianship-custody-petition',
    forumType: 'district_court',
    topCategory: 'family',
    name: 'Guardianship/Custody Petition (Guardians and Wards Act, S.7)',
    governingLaw: 'The Guardians and Wards Act, 1890, Section 7',
    plainLanguageSummary:
      "File this to be appointed or declared the guardian of a minor's person, property, or both — including for custody of a child — with the Court deciding based on what serves the minor's welfare.",
    applicantEligibility: 'relative_or_friend_seeking_guardianship_of_a_minor',
    filingCategory: 'original',
    subcategory: 'guardianship-custody',
  },
  {
    id: 'ct-private-criminal-complaint',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Private Criminal Complaint (BNSS, S.223)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 223',
    plainLanguageSummary:
      "File this to directly ask a Magistrate to take cognizance of an offence and summon the accused — without going through the police — when you have personal knowledge of the offence.",
    applicantEligibility: 'person_with_knowledge_of_an_offence',
    filingCategory: 'original',
    subcategory: 'trial-stage-applications',
  },
  {
    id: 'ct-quashing-petition',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Quashing Petition (BNSS, S.528)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 528',
    plainLanguageSummary:
      "File this before the High Court to quash an FIR, criminal complaint, or proceeding against you — because it discloses no offence, is an abuse of process, or the dispute is genuinely civil in nature.",
    applicantEligibility: 'accused_or_person_facing_criminal_proceedings',
    filingCategory: 'original',
    subcategory: 'appeals-revisions',
  },
  {
    id: 'ct-criminal-revision-petition',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Criminal Revision Petition (BNSS, S.438)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 438',
    plainLanguageSummary:
      "File this before the Sessions Court or High Court to have an inferior criminal court's finding, sentence, or order examined for correctness, legality, or propriety — narrower than an appeal, and not a routine rehearing of the facts.",
    applicantEligibility: 'aggrieved_party_challenging_a_criminal_courts_order',
    filingCategory: 'original',
    subcategory: 'appeals-revisions',
  },
  {
    id: 'ct-criminal-appeal',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Criminal Appeal Against Conviction (BNSS, S.415)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 415',
    plainLanguageSummary:
      "File this to appeal a criminal conviction — to the Court of Session, the High Court, or the Supreme Court, depending on which court convicted you and the sentence passed.",
    applicantEligibility: 'person_convicted_in_a_criminal_trial',
    filingCategory: 'appeal',
    subcategory: 'appeals-revisions',
  },
  {
    id: 'ct-application-fir-direction',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Direction to Register FIR/Investigate (BNSS, S.175(3))',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 175(3)',
    plainLanguageSummary:
      "File this before a Magistrate if the police have refused to register your FIR or investigate a cognizable offence — but only after you've first complained in writing to the Superintendent of Police and been refused or ignored. The Magistrate can then direct the police to investigate, but must first hear the police officer's own side and requires your application to be supported by an affidavit.",
    applicantEligibility: 'person_whose_fir_registration_was_refused_by_police',
    filingCategory: 'original',
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-application-default-bail',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Default Bail (BNSS, S.187(3))',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 187(3)',
    plainLanguageSummary:
      "File this if you're in custody and the police haven't filed a chargesheet within the statutory limit — 60 days for offences punishable with less than 10 years, 90 days for offences punishable with death, life imprisonment, or 10 years or more. This is a bail entitlement as of right, regardless of the case's merits — but it lapses the moment a chargesheet is actually filed.",
    applicantEligibility: 'accused_in_custody_pending_investigation',
    filingCategory: 'original',
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-protest-petition',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Protest Petition',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 193',
    plainLanguageSummary:
      "File this if the police have submitted a closure report — saying no case is made out — in a matter you reported, and you disagree. The Magistrate cannot accept the closure report and drop the case without first giving you, as the informant, notice and a genuine opportunity to be heard.",
    applicantEligibility: 'informant_or_complainant_aggrieved_by_a_police_closure_report',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-application-seized-property',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Release of Seized Property',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Sections 497 & 503',
    plainLanguageSummary:
      "File this to get back property the police seized during an investigation — a vehicle, documents, or other items — once it's no longer needed for the investigation or trial. Use this before the Magistrate if the police haven't yet produced the property before any Court; the trial court itself decides once it has been produced there.",
    applicantEligibility: 'person_entitled_to_possession_of_seized_property',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-application-cancellation-bail',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Cancellation of Bail',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 483(3)',
    plainLanguageSummary:
      "File this before the Court of Session or High Court if someone already out on bail in a criminal case has violated their bail conditions, tampered with evidence or witnesses, or if new circumstances now make their continued release unsafe — this asks the Court to cancel the bail and take them back into custody.",
    applicantEligibility: 'complainant_or_prosecution_seeking_cancellation_of_bail',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'pre-trial-investigation',
  },
  {
    id: 'ct-discharge-application',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Discharge Application',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Sections 250 & 262',
    plainLanguageSummary:
      "File this within a pending criminal case if you're the accused and the material on record doesn't even make out a prima facie case against you — this asks the Court to discharge you before charges are formally framed, without a full trial. File within 60 days of receiving the case documents (a warrant-case on a police report) or of your commitment to the Sessions Court, as applicable.",
    applicantEligibility: 'accused_in_a_pending_criminal_case',
    filingCategory: 'interlocutory',
    parentRequired: true,
    deadlineSource: 'statutory_fixed',
    limitationDays: 60,
    subcategory: 'trial-stage-applications',
  },
  {
    id: 'ct-application-exemption-personal-appearance',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Exemption from Personal Appearance',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 355',
    plainLanguageSummary:
      "File this within a pending inquiry or trial if you're the accused and want the Court to excuse your personal attendance at a hearing — you must be represented by an advocate, and the Court can still direct you to appear in person at any later stage if it decides your presence has become necessary.",
    applicantEligibility: 'accused_in_a_pending_inquiry_or_trial',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'trial-stage-applications',
  },
  {
    id: 'ct-application-compounding-offence',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Compounding of Offence',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 359',
    plainLanguageSummary:
      "File this jointly with the complainant or victim if the offence you're accused of is one the law allows to be compounded — some offences can be settled directly between the parties, others need the Court's permission first. Compounding has the same effect as an acquittal.",
    applicantEligibility: 'accused_or_complainant_in_a_compoundable_offence',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'trial-stage-applications',
  },
  {
    id: 'ct-application-suspension-sentence',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Application for Suspension of Sentence Pending Appeal',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 430',
    plainLanguageSummary:
      "File this alongside — or soon after — a Criminal Appeal against your conviction, asking the Appellate Court to suspend your sentence and release you on bail while the appeal is pending, rather than serving the sentence before the appeal is even decided.",
    applicantEligibility: 'convicted_person_who_has_filed_or_intends_to_file_an_appeal',
    filingCategory: 'interlocutory',
    parentRequired: true,
    subcategory: 'appeals-revisions',
  },
  {
    id: 'ct-victim-compensation-application',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Victim Compensation Application',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Section 396',
    plainLanguageSummary:
      "File this if you're a victim of crime — or your dependents, if you didn't survive it — and need financial support for rehabilitation, whether or not a trial ever happens. Apply directly to the District or State Legal Services Authority if the offender was never traced or identified; where a trial did take place, the trial court can itself recommend compensation instead.",
    applicantEligibility: 'victim_of_crime_or_their_dependents',
    filingCategory: 'original',
    subcategory: 'victim-remedies',
  },
  {
    id: 'ct-criminal-transfer-petition',
    forumType: 'district_court',
    topCategory: 'criminal',
    name: 'Transfer Petition (Criminal Case)',
    governingLaw: 'The Bharatiya Nagarik Suraksha Sanhita, 2023, Sections 446 & 447',
    plainLanguageSummary:
      "File this to move a pending criminal case or appeal out of the court currently handling it — to the High Court, from one subordinate criminal court to another (or to itself), if a fair trial isn't possible there or it's otherwise expedient for justice; or to the Supreme Court, from one High Court's jurisdiction to another's, for the same reasons.",
    applicantEligibility: 'party_to_a_pending_criminal_case_or_appeal',
    filingCategory: 'original',
    parentRequired: true,
    subcategory: 'transfer-general-applications',
  },
  {
    id: 'ct-arbitration-s9-interim-relief',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Arbitration Interim Relief Application (S.9)',
    governingLaw: 'The Arbitration and Conciliation Act, 1996, Section 9',
    plainLanguageSummary:
      "File this before or during arbitral proceedings — or after the award but before enforcement — to ask the Court for interim protection, such as securing the amount in dispute, preserving property, or an interim injunction.",
    applicantEligibility: 'party_to_an_arbitration_agreement',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-arbitration-s11-appointment',
    forumType: 'misc_drafts',
    name: 'Application for Appointment of Arbitrator (S.11)',
    governingLaw: 'The Arbitration and Conciliation Act, 1996, Section 11',
    plainLanguageSummary:
      "File this before the High Court when the other party has failed to appoint an arbitrator, or the appointed arbitrators can't agree on a presiding arbitrator, within the time the Act allows.",
    applicantEligibility: 'party_to_an_arbitration_agreement',
    filingCategory: 'original',
  },
  {
    id: 'ct-arbitration-s34-setting-aside',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application to Set Aside Arbitral Award (S.34)',
    governingLaw: 'The Arbitration and Conciliation Act, 1996, Section 34',
    plainLanguageSummary:
      "File this within three months of receiving an arbitral award to have it set aside — because of incapacity, an invalid arbitration agreement, want of proper notice, an award beyond the scope of reference, or conflict with the public policy of India.",
    applicantEligibility: 'party_aggrieved_by_an_arbitral_award',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-succession-certificate',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Succession Certificate Petition',
    governingLaw: 'The Indian Succession Act, 1925, Section 372',
    plainLanguageSummary:
      "File this to establish your right to collect debts and securities (bank balances, shares, insurance proceeds, and the like) owed to someone who has died — this doesn't cover immovable property or a will's other assets, only debts and securities.",
    applicantEligibility: 'legal_heir_or_claimant_of_a_deceased_persons_debts_and_securities',
    filingCategory: 'original',
    subcategory: 'special-estate-proceedings',
  },
  {
    id: 'ct-probate',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Probate Petition',
    governingLaw: 'The Indian Succession Act, 1925, Section 276',
    plainLanguageSummary:
      "File this if you're the executor named in a will and need the Court to certify the will's genuineness and confirm your authority to administer the estate.",
    applicantEligibility: 'executor_named_in_the_will',
    filingCategory: 'original',
    subcategory: 'special-estate-proceedings',
  },
  {
    id: 'ct-letters-of-administration',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Letters of Administration Petition',
    governingLaw: 'The Indian Succession Act, 1925, Section 278',
    plainLanguageSummary:
      "File this to be authorised to administer the estate of someone who died without a will (or without a surviving executor) — the Court appoints you as administrator so you can collect and distribute the assets.",
    applicantEligibility: 'legal_heir_entitled_to_administer_an_intestate_estate',
    filingCategory: 'original',
    subcategory: 'special-estate-proceedings',
  },
  {
    id: 'ct-rent-control-eviction',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Rent Control Eviction Petition',
    governingLaw: 'State Rent Control Act',
    plainLanguageSummary:
      "File this to evict a tenant under your state's Rent Control Act — for arrears of rent, bona fide personal requirement, unlawful subletting, or another ground your state's Act recognises. Not for a plain civil suit for possession where no Rent Control Act applies — use Suit for Possession/Eviction instead.",
    applicantEligibility: 'landlord_under_a_state_rent_control_act',
    filingCategory: 'original',
    subcategory: 'property-mortgage-land',
  },
  {
    id: 'ct-application-rejection-plaint',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application for Rejection of Plaint',
    governingLaw: 'Code of Civil Procedure, 1908, Order VII, Rule 11',
    plainLanguageSummary:
      "File this if a civil suit has been filed against you that should never proceed to trial at all — because it discloses no cause of action, is undervalued or insufficiently stamped and the plaintiff hasn't fixed that despite being asked to, or is barred by law on the face of the plaint itself. This asks the Court to reject the plaint at the threshold, without a full trial.",
    applicantEligibility: 'defendant_in_a_pending_suit',
    filingCategory: 'interlocutory',
    subcategory: 'responding-suit-management',
    parentRequired: true,
  },
  {
    id: 'ct-application-vacate-injunction',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application to Vacate/Discharge an Injunction',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXIX, Rule 4',
    plainLanguageSummary:
      "File this within a pending civil suit if a temporary injunction has already been granted against you and you believe it should be discharged, varied, or set aside — because it was obtained on a false or misleading statement without notice to you, or because circumstances have genuinely changed since it was granted.",
    applicantEligibility: 'party_against_whom_an_injunction_has_been_granted',
    filingCategory: 'interlocutory',
    subcategory: 'injunctions-interim-relief',
    parentRequired: true,
  },
  {
    id: 'ct-caveat-petition',
    forumType: 'misc_drafts',
    name: 'Caveat Petition',
    governingLaw: 'Code of Civil Procedure, 1908, Section 148A',
    plainLanguageSummary:
      "File this if you expect someone to apply to a Court for an order — such as an injunction — against your interest, and want to make sure the Court hears you before passing any order. A caveat lasts 90 days and must be lodged afresh if the anticipated application still hasn't been made by then.",
    applicantEligibility: 'person_apprehending_an_application_against_their_interest',
    filingCategory: 'original',
  },
  {
    id: 'ct-suit-rectification-instrument',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Rectification of Instrument',
    governingLaw: 'Specific Relief Act, 1963, Section 26',
    plainLanguageSummary:
      "File this if a written contract or document — through fraud or a genuine mutual mistake — doesn't actually record what both parties truly agreed, and you want the Court to correct it to reflect the real agreement, rather than void it outright. Different from asking the Court to cancel a document altogether — use Suit for Cancellation of Document for that.",
    applicantEligibility: 'party_to_a_written_instrument_seeking_correction',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-suit-recovery-movable-property',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Suit for Recovery of Specific Movable Property',
    governingLaw: 'Specific Relief Act, 1963, Sections 7 & 8',
    plainLanguageSummary:
      "File this to recover a specific item of movable property — a vehicle, machinery, jewellery, or documents — that someone else is wrongfully holding, where you want the actual item back rather than just its money value. Available against an agent or trustee holding it for you, or anyone else in wrongful possession, where compensation in money wouldn't be an adequate substitute.",
    applicantEligibility: 'person_entitled_to_possession_of_specific_movable_property',
    filingCategory: 'original',
    subcategory: 'money-contract-commercial',
  },
  {
    id: 'ct-application-set-aside-execution-sale',
    forumType: 'district_court',
    topCategory: 'civil',
    name: 'Application to Set Aside Execution Sale',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXI, Rule 90',
    plainLanguageSummary:
      "File this within 60 days of an execution sale of immovable property if the sale itself was conducted with a material irregularity or fraud that caused you substantial injury — this asks the Court to set the sale aside. This deadline cannot be extended for any reason, so act immediately.",
    applicantEligibility: 'party_affected_by_an_execution_sale',
    filingCategory: 'execution',
    subcategory: 'execution-enforcement',
    parentRequired: true,
    deadlineSource: 'statutory_fixed',
    limitationDays: 60,
    condonableExtensionDays: 0,
  },
  {
    id: 'ct-application-substitution-legal-representatives',
    forumType: 'misc_drafts',
    name: 'Application for Substitution of Legal Representatives',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXII, Rules 3 & 4',
    plainLanguageSummary:
      "File this within a pending civil suit if a party to the suit — plaintiff or defendant — has died, to bring their legal heir(s) on record so the case can continue. Missing the 90-day deadline causes the suit to abate against the deceased party, after which a separate application is needed just to undo that.",
    applicantEligibility: 'party_or_legal_heir_in_a_pending_suit_where_a_party_has_died',
    filingCategory: 'interlocutory',
    parentRequired: true,
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
  },
  {
    id: 'ct-dc-ma-general',
    forumType: 'misc_drafts',
    name: 'Miscellaneous Application (MA) — general',
    governingLaw: 'Code of Civil Procedure, 1908, Section 151',
    plainLanguageSummary:
      "Use this for anything connected to your pending civil suit that doesn't fit a more specific wizard — such as seeking a correction, permission, or direction the Court has inherent power to grant to serve the ends of justice or prevent abuse of its process.",
    applicantEligibility: 'any_party_to_a_pending_suit',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-writ-petition-226',
    forumType: 'high_court',
    name: 'Writ Petition (Article 226)',
    governingLaw: 'The Constitution of India, Article 226',
    plainLanguageSummary:
      "File this before the High Court to challenge government/authority action (or inaction) that violates your fundamental or legal rights — as a writ of mandamus, certiorari, prohibition, quo warranto, or habeas corpus, whichever fits your grievance.",
    applicantEligibility: 'person_aggrieved_by_state_or_authority_action',
    filingCategory: 'original',
    subcategory: 'writs-supervisory',
  },
  {
    id: 'ct-writ-petition-227',
    forumType: 'high_court',
    name: 'Writ Petition (Article 227)',
    governingLaw: 'The Constitution of India, Article 227',
    plainLanguageSummary:
      "File this before the High Court to invoke its supervisory jurisdiction over any court or tribunal within its territory — where that court/tribunal has exceeded its jurisdiction, refused to exercise jurisdiction it has, or its order suffers from a patent error of law or perversity — but the case doesn't fit a statutory appeal or revision.",
    applicantEligibility: 'party_aggrieved_by_subordinate_court_or_tribunal_order',
    filingCategory: 'original',
    subcategory: 'writs-supervisory',
  },
  {
    id: 'ct-habeas-corpus-hc',
    forumType: 'high_court',
    name: 'Habeas Corpus Petition',
    governingLaw: 'The Constitution of India, Article 226',
    plainLanguageSummary:
      "File this before the High Court to produce a person held in illegal or unlawful custody or detention, and secure their release — whether the detention is by the police, a private person, or under a preventive-detention order.",
    applicantEligibility: 'detenu_or_any_person_on_their_behalf',
    filingCategory: 'original',
    subcategory: 'writs-supervisory',
  },
  {
    id: 'ct-second-appeal',
    forumType: 'high_court',
    name: 'Second Appeal (CPC, S.100)',
    governingLaw: 'Code of Civil Procedure, 1908, Section 100',
    plainLanguageSummary:
      "File this before the High Court to challenge a first-appellate decree — available only on a substantial question of law framed by the High Court itself, not to reargue facts already concurrently found by the trial court and the first appellate court.",
    applicantEligibility: 'party_aggrieved_by_first_appellate_decree',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    subcategory: 'hc-appeals',
  },
  {
    id: 'ct-letters-patent-appeal',
    forumType: 'high_court',
    name: 'Letters Patent Appeal (Intra-Court Appeal)',
    governingLaw: "Letters Patent of the High Court, Clause 15 (or the corresponding provision in that High Court's own founding statute)",
    plainLanguageSummary:
      "File this before a Division Bench of the same High Court to appeal a judgment of a Single Judge exercising original (not appellate) jurisdiction — available only in High Courts whose Letters Patent, or an equivalent statute, confers this intra-court right, and only where the order appealed from qualifies as a 'judgment' within its meaning.",
    applicantEligibility: 'party_aggrieved_by_single_judge_judgment',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    subcategory: 'hc-appeals',
  },
  {
    id: 'ct-contempt-petition-hc',
    forumType: 'high_court',
    name: 'Contempt Petition (High Court)',
    governingLaw: 'The Contempt of Courts Act, 1971, Sections 2, 12 & 15',
    plainLanguageSummary:
      "File this before the High Court against a person who has wilfully disobeyed its judgment, decree, direction, or order (civil contempt), or committed criminal contempt by scandalising the Court or interfering with the administration of justice — must ordinarily be filed within one year of the act complained of.",
    applicantEligibility: 'person_aggrieved_by_disobedience_of_a_court_order_or_by_criminal_contempt',
    filingCategory: 'original',
    deadlineSource: 'statutory_fixed',
    limitationDays: 365,
    subcategory: 'hc-special-proceedings',
  },
  {
    id: 'ct-election-petition',
    forumType: 'high_court',
    name: 'Election Petition',
    governingLaw: 'The Representation of the People Act, 1951, Sections 80 & 81',
    plainLanguageSummary:
      "File this before the High Court to challenge the result of an election to Parliament or a State Legislature — on grounds such as a corrupt practice, improper acceptance/rejection of a nomination, or improper reception, refusal, or rejection of votes — within 45 days of the result.",
    applicantEligibility: 'candidate_or_elector',
    filingCategory: 'original',
    deadlineSource: 'statutory_fixed',
    limitationDays: 45,
    subcategory: 'hc-special-proceedings',
  },
  {
    id: 'ct-slp-civil',
    forumType: 'supreme_court',
    name: 'Special Leave Petition (Civil, Article 136)',
    governingLaw: 'The Constitution of India, Article 136',
    plainLanguageSummary:
      "File this before the Supreme Court to seek discretionary leave to appeal against any civil judgment, decree, or order of a High Court or tribunal — normally within 90 days of that judgment or order.",
    applicantEligibility: 'party_aggrieved_by_a_high_court_or_tribunal_judgment',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    subcategory: 'sc-slp',
  },
  {
    id: 'ct-slp-criminal',
    forumType: 'supreme_court',
    name: 'Special Leave Petition (Criminal, Article 136)',
    governingLaw: 'The Constitution of India, Article 136',
    plainLanguageSummary:
      "File this before the Supreme Court to seek discretionary leave to appeal against any criminal judgment, order, or sentence of a High Court or tribunal — normally within 90 days of that judgment or order, or 60 days where the High Court has refused a certificate of fitness to appeal.",
    applicantEligibility: 'party_aggrieved_by_a_high_court_or_tribunal_criminal_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    subcategory: 'sc-slp',
  },
  {
    id: 'ct-writ-petition-32',
    forumType: 'supreme_court',
    name: 'Writ Petition (Article 32)',
    governingLaw: 'The Constitution of India, Article 32',
    plainLanguageSummary:
      "File this directly before the Supreme Court to enforce a fundamental right guaranteed by Part III of the Constitution — as a writ of mandamus, certiorari, prohibition, quo warranto, or habeas corpus, whichever fits your grievance.",
    applicantEligibility: 'person_whose_fundamental_right_has_been_violated',
    filingCategory: 'original',
    subcategory: 'sc-writs',
  },
  {
    id: 'ct-review-petition-sc',
    forumType: 'supreme_court',
    name: 'Review Petition',
    governingLaw: 'The Constitution of India, Article 137; Supreme Court Rules, 2013, Order XLVII',
    plainLanguageSummary:
      "File this before the same Bench that decided your case, within 30 days of the judgment or order, to have it reviewed — on the ground of discovery of new and important evidence, a mistake or error apparent on the face of the record, or any other sufficient reason. Ordinarily decided by circulation, without oral arguments.",
    applicantEligibility: 'party_aggrieved_by_a_supreme_court_judgment_or_order',
    filingCategory: 'original',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    subcategory: 'sc-post-judgment-remedies',
  },
  {
    id: 'ct-curative-petition-sc',
    forumType: 'supreme_court',
    name: 'Curative Petition',
    governingLaw: 'The Constitution of India, Article 142; Supreme Court Rules, 2013, Order XLVIII',
    plainLanguageSummary:
      "File this as the last resort after your review petition has been dismissed — to prevent abuse of the Court's process or cure a gross miscarriage of justice. Must be certified by a Senior Advocate, and is ordinarily circulated to the three senior-most Judges (and, if available, the Judges who passed the impugned judgment) before it is even listed for hearing.",
    applicantEligibility: 'party_whose_review_petition_has_been_dismissed',
    filingCategory: 'original',
    subcategory: 'sc-post-judgment-remedies',
  },
  {
    id: 'ct-transfer-petition-civil-sc',
    forumType: 'supreme_court',
    name: 'Transfer Petition (Civil)',
    governingLaw: 'Code of Civil Procedure, 1908, Section 25',
    plainLanguageSummary:
      "File this before the Supreme Court to move a pending civil suit, appeal, or other proceeding from a High Court or civil court in one State to a High Court or civil court in another State — commonly used in matrimonial disputes — where it's expedient for the ends of justice.",
    applicantEligibility: 'party_to_a_pending_civil_suit_appeal_or_proceeding',
    filingCategory: 'original',
    subcategory: 'sc-special-jurisdiction',
  },
  {
    id: 'ct-contempt-petition-sc',
    forumType: 'supreme_court',
    name: 'Contempt Petition (Supreme Court)',
    governingLaw: 'The Constitution of India, Article 129; The Contempt of Courts Act, 1971, Sections 2, 12 & 15',
    plainLanguageSummary:
      "File this before the Supreme Court against a person who has wilfully disobeyed its judgment, decree, direction, or order (civil contempt), or committed criminal contempt by scandalising the Court or interfering with the administration of justice — must ordinarily be filed within one year of the act complained of.",
    applicantEligibility: 'person_aggrieved_by_disobedience_of_a_supreme_court_order_or_by_criminal_contempt',
    filingCategory: 'original',
    deadlineSource: 'statutory_fixed',
    limitationDays: 365,
    subcategory: 'sc-special-jurisdiction',
  },
  {
    id: 'ct-cit-appeal',
    forumType: 'tax_matters',
    topCategory: 'income_tax',
    name: 'Appeal Against Assessment/Demand Order',
    governingLaw: 'The Income-tax Act, 2025, Sections 357 & 358',
    plainLanguageSummary:
      "File this before the Commissioner (Appeals) — or Joint Commissioner (Appeals) — to challenge an assessment, reassessment, or penalty order, or to dispute a demand raised against you, within 30 days of the notice of demand or the order being served on you.",
    applicantEligibility: 'assessee_aggrieved_by_an_assessment_reassessment_or_penalty_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 30,
    parentRequired: true,
  },
  {
    id: 'ct-cit-stay-application',
    forumType: 'tax_matters',
    topCategory: 'income_tax',
    name: 'Stay of Demand Application',
    governingLaw: 'The Income-tax Act, 2025, Section 411(12)',
    plainLanguageSummary:
      "File this with the Assessing Officer alongside — or soon after — your appeal to the Commissioner (Appeals), asking to be treated as not in default on the disputed demand, and recovery held back, until the appeal is decided.",
    applicantEligibility: 'assessee_who_has_filed_or_intends_to_file_a_cit_appeals_appeal',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-itat-appeal',
    forumType: 'tax_matters',
    topCategory: 'income_tax',
    name: 'Appeal Against CIT(Appeals) Order',
    governingLaw: 'The Income-tax Act, 2025, Section 362',
    plainLanguageSummary:
      "File this before the Income Tax Appellate Tribunal to challenge an order passed by the Commissioner (Appeals) or Joint Commissioner (Appeals) — within two months from the end of the month in which that order was communicated to you.",
    applicantEligibility: 'assessee_aggrieved_by_a_cit_appeals_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 60,
    parentRequired: true,
  },
  {
    id: 'ct-itat-stay-application',
    forumType: 'tax_matters',
    topCategory: 'income_tax',
    name: 'Stay Application (ITAT)',
    governingLaw: 'The Income-tax Act, 2025, Section 362(8)',
    plainLanguageSummary:
      "File this alongside — or soon after — your appeal to the Tribunal, asking it to stay recovery of the disputed demand while the appeal is pending. The Tribunal may grant a stay for up to 180 days at a time, subject to depositing part of the disputed amount or furnishing security, up to an overall cap of 365 days.",
    applicantEligibility: 'assessee_who_has_filed_or_intends_to_file_an_itat_appeal',
    filingCategory: 'interlocutory',
    parentRequired: true,
  },
  {
    id: 'ct-itat-rectification',
    forumType: 'tax_matters',
    topCategory: 'income_tax',
    name: 'Rectification Application (ITAT)',
    governingLaw: 'The Income-tax Act, 2025, Section 363',
    plainLanguageSummary:
      "File this to have the Tribunal correct a mistake apparent from the record in its own order — not to reargue the merits or reappreciate evidence — within six months from the end of the month the order was passed.",
    applicantEligibility: 'assessee_or_assessing_officer_pointing_out_a_mistake_in_an_itat_order',
    filingCategory: 'interlocutory',
    deadlineSource: 'statutory_fixed',
    limitationDays: 180,
    parentRequired: true,
  },
  {
    id: 'ct-gst-appeal-first',
    forumType: 'tax_matters',
    topCategory: 'gst',
    name: 'Appeal Against Adjudication Order',
    governingLaw: 'The Central Goods and Services Tax Act, 2017, Section 107',
    plainLanguageSummary:
      "File this before the Appellate Authority to challenge a demand, adjudication, or other order passed against you under the GST Act — within three months of the order being communicated (a further one month is condonable for sufficient cause). Requires paying the admitted amount in full, plus 10% of the disputed tax (capped at ₹20 crore), before the appeal can be filed.",
    applicantEligibility: 'person_aggrieved_by_a_gst_adjudication_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    condonableExtensionDays: 30,
    parentRequired: true,
  },
  {
    id: 'ct-gstat-appeal',
    forumType: 'tax_matters',
    topCategory: 'gst',
    name: 'Appeal Against Appellate Authority Order',
    governingLaw: 'The Central Goods and Services Tax Act, 2017, Section 112',
    plainLanguageSummary:
      "File this before the GST Appellate Tribunal to challenge an order passed by the Appellate Authority — within three months of the order being communicated (a further three months is condonable for sufficient cause). Requires paying the admitted amount in full, plus a further 10% of the disputed tax over and above what was already deposited for the first appeal, capped at ₹20 crore.",
    applicantEligibility: 'person_aggrieved_by_a_gst_appellate_authority_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    condonableExtensionDays: 90,
    parentRequired: true,
  },
  {
    id: 'ct-gstat-rectification',
    forumType: 'tax_matters',
    topCategory: 'gst',
    name: 'Rectification Application (GSTAT)',
    governingLaw: 'The Central Goods and Services Tax Act, 2017, Section 161',
    plainLanguageSummary:
      "File this to have an error apparent on the face of the record in a GST order corrected — including an order of the Appellate Authority or the Appellate Tribunal — within three months of the order being issued. A purely clerical or arithmetical slip can be corrected beyond that window; anything else cannot be rectified after six months.",
    applicantEligibility: 'affected_person_pointing_out_an_error_in_a_gst_order',
    filingCategory: 'interlocutory',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    parentRequired: true,
  },
  {
    id: 'ct-cestat-appeal',
    forumType: 'tax_matters',
    topCategory: 'customs_excise',
    name: 'Appeal to CESTAT',
    governingLaw: 'Customs Act, 1962, Section 129A / Central Excise Act, 1944, Section 35B / Finance Act, 1994, Section 86 (Service Tax)',
    plainLanguageSummary:
      "File this before CESTAT to challenge an order passed by a Commissioner (as adjudicating authority) or a Commissioner (Appeals) — in a Customs, Central Excise, or (legacy) Service Tax matter — within three months of the order being communicated or received. A pre-deposit (commonly 7.5%-10% of the duty/penalty in dispute) is required before the appeal will be entertained — confirm the exact rate and cap for your matter.",
    applicantEligibility: 'person_aggrieved_by_a_customs_excise_or_service_tax_order',
    filingCategory: 'appeal',
    deadlineSource: 'statutory_fixed',
    limitationDays: 90,
    parentRequired: true,
  },
  {
    id: 'ct-cestat-rectification',
    forumType: 'tax_matters',
    topCategory: 'customs_excise',
    name: 'Rectification of Mistake Application (CESTAT)',
    governingLaw: 'Customs Act, 1962, Section 129B(2) / Central Excise Act, 1944, Section 35C(2) / Finance Act, 1994, Section 83 read with Section 35C(2) (Service Tax)',
    plainLanguageSummary:
      "File this to have CESTAT correct a mistake apparent from the record in its own order — not to reargue the merits — within six months from the date of the order.",
    applicantEligibility: 'party_or_commissioner_pointing_out_a_mistake_in_a_cestat_order',
    filingCategory: 'interlocutory',
    deadlineSource: 'statutory_fixed',
    limitationDays: 180,
    parentRequired: true,
  },
];

// Top-level groups within a single forum, one per genuinely distinct jurisdiction/regime grouped
// under that forum's tab for navigation (see the `forums` array's comments on 'f-dc' and 'f-tax').
// Home.tsx shows these as a tab tier above the subcategory tabs below, when a forum's visible
// case types all carry a `topCategory`. A single shared flat namespace across forums, same as
// `caseTypeSubcategories` below — Home.tsx filters it down to keys actually present in the
// current forum's case types.
export const topCategories: { key: string; label: string }[] = [
  { key: 'civil', label: 'Civil Matters' },
  { key: 'criminal', label: 'Criminal Matters' },
  { key: 'family', label: 'Family Matters' },
  { key: 'income_tax', label: 'Income Tax' },
  { key: 'gst', label: 'GST' },
  { key: 'customs_excise', label: 'Customs & Excise' },
];

// Subject-matter groupings for forums (or, within district_court, top-categories) whose case-type
// list has grown too long for one flat grid. Home.tsx renders cards under headed sections, in this
// order, when every visible case type carries a `subcategory` key found here.
export const caseTypeSubcategories: { key: string; label: string }[] = [
  { key: 'money-contract-commercial', label: 'Money, Contract & Commercial Suits' },
  { key: 'property-mortgage-land', label: 'Property, Mortgage & Land Suits' },
  { key: 'injunctions-interim-relief', label: 'Injunctions & Interim Relief' },
  { key: 'responding-suit-management', label: 'Responding & Suit Management' },
  { key: 'execution-enforcement', label: 'Execution & Enforcement' },
  { key: 'special-estate-proceedings', label: 'Special & Estate Proceedings' },
  { key: 'pre-trial-investigation', label: 'Pre-Trial & Investigation' },
  { key: 'trial-stage-applications', label: 'Trial Stage Applications' },
  { key: 'appeals-revisions', label: 'Appeals & Revisions' },
  { key: 'victim-remedies', label: 'Victim Remedies' },
  { key: 'transfer-general-applications', label: 'Transfer & General Applications' },
  { key: 'divorce-marital-status', label: 'Divorce & Marital Status' },
  { key: 'maintenance-protection', label: 'Maintenance & Protection' },
  { key: 'guardianship-custody', label: 'Guardianship & Custody' },
  { key: 'writs-supervisory', label: 'Writs & Supervisory Jurisdiction' },
  { key: 'hc-appeals', label: 'Appeals' },
  { key: 'hc-special-proceedings', label: 'Special Proceedings' },
  { key: 'sc-slp', label: 'Special Leave Petitions' },
  { key: 'sc-writs', label: 'Writs (Fundamental Rights)' },
  { key: 'sc-post-judgment-remedies', label: 'Post-Judgment Remedies' },
  { key: 'sc-special-jurisdiction', label: 'Special Jurisdiction' },
];

export const appealGroups: AppealGroup[] = [
  {
    id: 'drt-appeal-group',
    forumType: 'DRT',
    question: 'Who passed the order you want to challenge?',
    options: [
      { label: 'Recovery Officer', helpText: 'An order made while executing a recovery certificate', caseTypeId: 'ct-drt-appeal-ro' },
      { label: 'Registrar', helpText: 'A procedural or administrative order', caseTypeId: 'ct-drt-appeal-chamber' },
      { label: 'Presiding Officer (the DRT itself)', helpText: 'A final or substantive order, e.g. the outcome of an OA or SA', caseTypeId: 'ct-drat-appeal' },
    ],
  },
  {
    id: 'nclat-appeal-group',
    forumType: 'NCLT',
    question: 'What kind of order are you appealing?',
    options: [
      { label: 'Insolvency matter', helpText: 'CIRP admission/rejection, resolution plan approval, liquidation, etc.', caseTypeId: 'ct-nclat-appeal-ibc' },
      { label: 'Company law matter', helpText: 'Oppression and mismanagement, scheme of arrangement, etc. — not insolvency', caseTypeId: 'ct-nclat-appeal-companies' },
    ],
  },
];

export const clauses: ClauseDef[] = [
  {
    code: 'WS-01',
    caseTypeId: 'ct-drt-ws',
    category: 'preliminary_objection',
    title: 'Preliminary objection as to limitation',
    bodyTemplate:
      'The present Original Application is barred by limitation, the alleged default having occurred on {{default_date}}, more than three years prior to the institution of these proceedings.',
    plainLanguageExplanation:
      'If the bank waited too long to file, this says so upfront — a limitation defence, if it applies, can end the case entirely.',
  },
  {
    code: 'WS-03',
    caseTypeId: 'ct-drt-ws',
    category: 'grounds',
    title: 'Grounds of defence',
    bodyTemplate: 'Without prejudice to the above, the Defendant further submits that {{grounds_of_defence}}.',
    plainLanguageExplanation: 'The substantive reasons the bank’s claim shouldn’t succeed, or shouldn’t succeed in full.',
  },
  {
    code: 'WS-05',
    caseTypeId: 'ct-drt-ws',
    category: 'verification',
    title: 'Verifying affidavit',
    bodyTemplate:
      'I, {{defendant_name}}, do hereby solemnly affirm that the facts stated in the foregoing written statement are true to my knowledge and belief, and no part of it is false and nothing material has been concealed therefrom.',
    plainLanguageExplanation: 'The sworn statement required by law confirming your reply is truthful.',
  },
  {
    code: 'CC-01',
    caseTypeId: 'ct-cc-complaint',
    category: 'jurisdiction',
    title: 'Jurisdiction of the Commission',
    bodyTemplate:
      'This Hon’ble Commission has jurisdiction to entertain this complaint under Section 34 of the Consumer Protection Act, 2019, the value of consideration paid falling within its pecuniary jurisdiction, and the Opposite Party carrying on business within the territorial limits of this Commission.',
    plainLanguageExplanation: 'Explains why this commission, and not another, is the right place to file.',
  },
  {
    code: 'CC-02',
    caseTypeId: 'ct-cc-complaint',
    category: 'facts',
    title: 'Statement of facts',
    bodyTemplate: '{{facts_narrative}}',
    plainLanguageExplanation: 'Your account of what happened, in your own words.',
  },
  {
    code: 'CC-03',
    caseTypeId: 'ct-cc-complaint',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Commission may be pleased to direct the Opposite Party to provide {{relief_sought}} to the Complainant, together with compensation for the deficiency in service and costs of these proceedings.',
    plainLanguageExplanation: 'What you’re asking the commission to order.',
  },
  {
    code: 'NCLT-01',
    caseTypeId: 'ct-nclt-s9',
    category: 'jurisdiction',
    title: 'Jurisdiction of Tribunal',
    bodyTemplate:
      'This Hon’ble Tribunal has jurisdiction to entertain this application under Section 60(1) of the Insolvency and Bankruptcy Code, 2016, the registered office of the Corporate Debtor being situated at {{debtor_registered_office}}.',
    plainLanguageExplanation: 'This tells the tribunal why you’re filing here, based on where the company’s registered office is.',
  },
  {
    code: 'NCLT-02',
    caseTypeId: 'ct-nclt-s9',
    category: 'facts',
    title: 'Default and demand notice',
    bodyTemplate:
      'The Corporate Debtor defaulted on payment of {{default_amount}} towards {{nature_of_debt}}. A demand notice under Section 8 of the Code was issued on {{notice_date}} and delivered on {{delivery_date}}. No payment or notice of dispute was received within the statutory period of ten days.',
    plainLanguageExplanation: 'Explains the money owed to you and confirms you followed the required steps.',
  },
  {
    code: 'NCLT-03',
    caseTypeId: 'ct-nclt-s9',
    category: 'affidavit',
    title: 'No-dispute affidavit',
    bodyTemplate:
      'I, {{applicant_name}}, do hereby solemnly affirm that no notice of dispute has been received from the Corporate Debtor in relation to the unpaid operational debt, nor does any dispute exist on record with any information utility.',
    plainLanguageExplanation: 'A sworn statement confirming the company hasn’t disputed what it owes you.',
  },
  {
    code: 'NCLT-04',
    caseTypeId: 'ct-nclt-s9',
    category: 'prayer',
    title: 'Prayer for initiation of CIRP',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Tribunal may be pleased to admit this application and initiate Corporate Insolvency Resolution Process against the Corporate Debtor under Section 9 of the Insolvency and Bankruptcy Code, 2016.',
    plainLanguageExplanation: 'This is what you’re asking the tribunal to actually do.',
  },
  {
    code: 'APP-RO-01',
    caseTypeId: 'ct-drt-appeal-ro',
    category: 'grounds',
    title: 'Grounds of appeal',
    bodyTemplate: 'The order of the Recovery Officer dated {{order_date}} is erroneous on the ground that {{grounds_of_appeal}}.',
    plainLanguageExplanation: 'Explain what the Recovery Officer got wrong — for example, in how an attachment or auction was conducted.',
  },
  {
    code: 'APP-RO-02',
    caseTypeId: 'ct-drt-appeal-ro',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate: 'It is prayed that this Hon’ble Tribunal may be pleased to set aside/modify the order of the Recovery Officer dated {{order_date}}.',
    plainLanguageExplanation: null,
  },
  {
    code: 'APP-REG-01',
    caseTypeId: 'ct-drt-appeal-chamber',
    category: 'grounds',
    title: 'Grounds of chamber appeal',
    bodyTemplate: 'The order of the Registrar dated {{order_date}} is liable to be set aside/modified on the ground that {{grounds_of_appeal}}.',
    plainLanguageExplanation: 'Explain what was wrong with the Registrar’s administrative or procedural order.',
  },
  {
    code: 'APP-DRAT-01',
    caseTypeId: 'ct-drat-appeal',
    category: 'grounds',
    title: 'Grounds of appeal',
    bodyTemplate: 'The order of the Debts Recovery Tribunal dated {{order_date}} is erroneous in law and on facts on the ground that {{grounds_of_appeal}}.',
    plainLanguageExplanation: 'Explain what the Tribunal got wrong in its final decision.',
  },
  {
    code: 'APP-DRAT-02',
    caseTypeId: 'ct-drat-appeal',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate: 'It is prayed that this Hon’ble Appellate Tribunal may be pleased to set aside/modify the order dated {{order_date}} and grant such other relief as deemed fit.',
    plainLanguageExplanation: null,
  },
  {
    code: 'NCLAT-IBC-01',
    caseTypeId: 'ct-nclat-appeal-ibc',
    category: 'grounds',
    title: 'Grounds of appeal',
    bodyTemplate: 'The order dated {{order_date}} passed by the Adjudicating Authority is erroneous on the ground that {{grounds_of_appeal}}.',
    plainLanguageExplanation: null,
  },
  {
    code: 'NCLAT-CO-01',
    caseTypeId: 'ct-nclat-appeal-companies',
    category: 'grounds',
    title: 'Grounds of appeal',
    bodyTemplate: 'The order dated {{order_date}} passed by the Tribunal under the Companies Act, 2013 is erroneous on the ground that {{grounds_of_appeal}}.',
    plainLanguageExplanation: null,
  },
  {
    code: 'DRT-01',
    caseTypeId: 'ct-drt-sa',
    category: 'jurisdiction',
    title: 'Jurisdiction of Tribunal',
    bodyTemplate:
      'This Hon’ble Tribunal has jurisdiction under Section 17 of the SARFAESI Act, 2002, to entertain this Application, the secured asset being situated at {{property_location}} and the outstanding debt exceeding the pecuniary threshold prescribed under the Recovery of Debts and Bankruptcy Act, 1993.',
    plainLanguageExplanation: 'Explains why this tribunal, and not a regular court, is the right place to challenge the bank’s action.',
  },
  {
    code: 'DRT-02',
    caseTypeId: 'ct-drt-sa',
    category: 'facts',
    title: 'Notice and enforcement action',
    bodyTemplate:
      'The Applicant availed a loan of {{loan_amount}} from the Respondent Bank against security of {{security_description}}. A notice under Section 13(2) of the SARFAESI Act dated {{notice_date}} was received, followed by {{enforcement_action}} on {{action_date}}.',
    plainLanguageExplanation: 'Lays out the loan, the notice you received, and what the bank has done so far.',
  },
  {
    code: 'DRT-03',
    caseTypeId: 'ct-drt-sa',
    category: 'grounds',
    title: 'Grounds of challenge',
    bodyTemplate: 'The aforesaid action is bad in law and liable to be set aside on the ground that {{grounds_of_challenge}}.',
    plainLanguageExplanation: 'Explain what the bank did wrong — improper notice, wrong valuation, or not considering your response.',
  },
  {
    code: 'DRT-04',
    caseTypeId: 'ct-drt-sa',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Tribunal may be pleased to set aside the impugned action dated {{action_date}} and restrain the Respondent Bank from taking further coercive action against the secured asset.',
    plainLanguageExplanation: 'This is what you’re asking the tribunal to order — typically to stop or reverse the bank’s action.',
  },
  {
    code: 'OA-01',
    caseTypeId: 'ct-drt-oa',
    category: 'jurisdiction',
    title: 'Jurisdiction of Tribunal',
    bodyTemplate:
      'This Hon’ble Tribunal has jurisdiction under Section 19 of the Recovery of Debts and Bankruptcy Act, 1993, the Defendant carrying on business / residing within the local limits of this Tribunal at {{defendant_address}}, and the amount due exceeding ₹20 lakh.',
    plainLanguageExplanation: null,
  },
  {
    code: 'OA-02',
    caseTypeId: 'ct-drt-oa',
    category: 'facts',
    title: 'Loan and default',
    bodyTemplate:
      'The Applicant Bank sanctioned a loan of {{loan_amount}} to the Defendant on {{sanction_date}}, secured by {{security_description}}. The Defendant defaulted in repayment, and the account was classified as a Non-Performing Asset on {{npa_date}} in accordance with RBI guidelines.',
    plainLanguageExplanation: null,
  },
  {
    code: 'OA-03',
    caseTypeId: 'ct-drt-oa',
    category: 'quantification',
    title: 'Amount due',
    bodyTemplate:
      'As on {{calculation_date}}, a sum of {{principal_amount}} towards principal and {{interest_amount}} towards interest, totalling {{total_amount}}, is due and payable by the Defendant to the Applicant.',
    plainLanguageExplanation: null,
  },
  {
    code: 'OA-04',
    caseTypeId: 'ct-drt-oa',
    category: 'prayer',
    title: 'Prayer for recovery certificate',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Tribunal may be pleased to pass an order/Recovery Certificate directing the Defendant to pay {{total_amount}} together with interest at {{interest_rate}} from the date of this application until realization, along with costs of these proceedings.',
    plainLanguageExplanation: null,
  },
  {
    code: 'MRS-01',
    caseTypeId: 'ct-dc-money-recovery',
    category: 'jurisdiction',
    title: 'Jurisdiction of the Court',
    bodyTemplate:
      'This Hon’ble Court has jurisdiction to entertain and try this suit under Section 15 read with Section 20 of the Code of Civil Procedure, 1908, the cause of action having arisen within the territorial limits of this Court and the value of the suit falling within its pecuniary jurisdiction.',
    plainLanguageExplanation: 'Explains why this particular District Court, and not another, is the right place to file.',
  },
  {
    code: 'MRS-02',
    caseTypeId: 'ct-dc-money-recovery',
    category: 'facts',
    title: 'Cause of action',
    bodyTemplate: '{{facts_narrative}}',
    plainLanguageExplanation: 'Your account of the debt and why it is owed, in your own words.',
  },
  {
    code: 'MRS-03',
    caseTypeId: 'ct-dc-money-recovery',
    category: 'valuation',
    title: 'Valuation of suit',
    bodyTemplate:
      'The suit is valued at ₹{{claim_amount}} for the purposes of court fee and jurisdiction, being the principal amount due together with interest claimed.',
    plainLanguageExplanation: 'States the suit’s value, which determines both the court fee payable and whether this court has pecuniary jurisdiction.',
  },
  {
    code: 'MRS-04',
    caseTypeId: 'ct-dc-money-recovery',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Court may be pleased to pass a decree in favour of the Plaintiff and against the Defendant for a sum of ₹{{claim_amount}}, together with interest and costs of the suit.',
    plainLanguageExplanation: 'What you are asking the Court to order.',
  },
  {
    code: 'MRS-05',
    caseTypeId: 'ct-dc-money-recovery',
    category: 'verification',
    title: 'Verification',
    bodyTemplate:
      'I, {{plaintiff_name}}, the Plaintiff above named, do hereby verify that the contents of the plaint are true and correct to my knowledge and belief, and that nothing material has been concealed therefrom.',
    plainLanguageExplanation: 'The sworn statement required by law confirming the plaint is truthful.',
  },
  {
    code: 'SS-01',
    caseTypeId: 'ct-dc-summary-suit',
    category: 'jurisdiction',
    title: 'Jurisdiction and summary procedure',
    bodyTemplate:
      'This suit is instituted under the summary procedure prescribed by Order XXXVII of the Code of Civil Procedure, 1908. This Hon’ble Court has jurisdiction under Section 15 read with Section 20 of the Code, the cause of action having arisen within its territorial and pecuniary limits.',
    plainLanguageExplanation: 'Explains both why this court is correct and why the faster Order XXXVII procedure applies.',
  },
  {
    code: 'SS-02',
    caseTypeId: 'ct-dc-summary-suit',
    category: 'facts',
    title: 'Nature of the written contract or instrument',
    bodyTemplate: '{{facts_narrative}}',
    plainLanguageExplanation: 'Describes the written contract, bill of exchange, hundi, or promissory note the claim is based on, and the amount due.',
  },
  {
    code: 'SS-03',
    caseTypeId: 'ct-dc-summary-suit',
    category: 'valuation',
    title: 'Valuation of suit',
    bodyTemplate:
      'The suit is valued at ₹{{claim_amount}} for the purposes of court fee and jurisdiction, being the amount due under the written contract or negotiable instrument together with interest claimed.',
    plainLanguageExplanation: 'States the suit’s value, which determines both the court fee payable and whether this court has pecuniary jurisdiction.',
  },
  {
    code: 'SS-04',
    caseTypeId: 'ct-dc-summary-suit',
    category: 'prayer',
    title: 'Prayer',
    bodyTemplate:
      'It is therefore prayed that this Hon’ble Court may be pleased to pass a decree in favour of the Plaintiff and against the Defendant for a sum of ₹{{claim_amount}}, together with interest and costs of the suit. The Defendant is liable to apply for leave to defend within ten days of service of summons, failing which the Plaintiff shall be entitled to a decree as prayed.',
    plainLanguageExplanation: 'What you are asking the Court to order, including the summary-suit rule that the defendant must seek permission to contest within 10 days.',
  },
  {
    code: 'SS-05',
    caseTypeId: 'ct-dc-summary-suit',
    category: 'verification',
    title: 'Verification',
    bodyTemplate:
      'I, {{plaintiff_name}}, the Plaintiff above named, do hereby verify that the contents of the plaint are true and correct to my knowledge and belief, and that nothing material has been concealed therefrom.',
    plainLanguageExplanation: 'The sworn statement required by law confirming the plaint is truthful.',
  },
  {
    code: 'LN-01',
    caseTypeId: 'ct-legal-notice',
    category: 'facts',
    title: 'Facts',
    bodyTemplate: '{{facts_narrative}}',
    plainLanguageExplanation: 'What happened, in your own words — when the debt/breach arose and why it remains unresolved.',
  },
  {
    code: 'LN-02',
    caseTypeId: 'ct-legal-notice',
    category: 'demand',
    title: 'Demand',
    bodyTemplate:
      'You are hereby called upon to {{demand_action}} within {{notice_period}} of the receipt of this notice.',
    plainLanguageExplanation: 'What you are demanding the recipient do, and by when.',
  },
  {
    code: 'LN-03',
    caseTypeId: 'ct-legal-notice',
    category: 'consequence',
    title: 'Consequence of non-compliance',
    bodyTemplate:
      'Please take notice that in the event of your failure to comply with the above demand within the stipulated period, my Client shall be constrained to initiate appropriate legal proceedings against you, both civil and/or criminal as advised, entirely at your risk as to costs and consequences, for which please take notice.',
    plainLanguageExplanation: 'The standard warning that a case will follow if the demand isn’t met — this is what actually makes it a "legal" notice rather than an ordinary letter.',
  },
  {
    code: 'CA-01',
    caseTypeId: 'ct-contract-agreement',
    category: 'term',
    title: 'Term',
    bodyTemplate: 'This Agreement shall commence on {{start_date}} and shall remain in force {{term_description}}.',
    plainLanguageExplanation: 'When the agreement starts and how long it runs for.',
  },
  {
    code: 'CA-02',
    caseTypeId: 'ct-contract-agreement',
    category: 'termination',
    title: 'Termination',
    bodyTemplate: 'This Agreement may be terminated {{termination_terms}}.',
    plainLanguageExplanation: 'How either party can end the agreement early, and any notice period required.',
  },
  {
    code: 'CA-03',
    caseTypeId: 'ct-contract-agreement',
    category: 'governing_law',
    title: 'Governing law and dispute resolution',
    bodyTemplate:
      'This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts at {{jurisdiction_place}}.',
    plainLanguageExplanation: 'States that Indian law applies and which courts would hear a dispute, if one arose.',
  },
  {
    code: 'BA-01',
    caseTypeId: 'ct-bail-application',
    category: 'case_details',
    title: 'Case details',
    bodyTemplate:
      'The present case arises out of FIR No. {{fir_number}}, registered at {{police_station}} Police Station under Sections {{bns_sections}} of the Bharatiya Nyaya Sanhita, 2023.',
    plainLanguageExplanation: 'The FIR number, police station, and the sections the accused has been booked under.',
  },
  {
    code: 'BA-03',
    caseTypeId: 'ct-bail-application',
    category: 'undertaking',
    title: 'Undertaking',
    bodyTemplate:
      'The Applicant undertakes that he/she shall make himself/herself available for interrogation/investigation as and when required, shall not directly or indirectly make any inducement, threat, or promise to any person acquainted with the facts of the case so as to dissuade such person from disclosing the facts to the Court or the police, shall not tamper with evidence, and shall not leave {{jurisdiction_area}} without the prior permission of this Hon\'ble Court.',
    plainLanguageExplanation: 'The standard conditions courts expect an applicant to accept — this mirrors what the BNSS itself allows a court to impose as bail conditions.',
  },
  {
    code: 'MA-01',
    caseTypeId: 'ct-mediation-application',
    category: 'facts',
    title: 'Nature of the dispute',
    bodyTemplate:
      'This is a commercial dispute concerning {{dispute_nature}}, entered into/sanctioned on {{transaction_date}} for a sum of Rs. {{transaction_amount}}.',
    plainLanguageExplanation: 'What kind of commercial transaction this is, and when it was entered into or sanctioned.',
  },
  {
    code: 'MA-02',
    caseTypeId: 'ct-mediation-application',
    category: 'facts',
    title: 'Default and breach',
    bodyTemplate: '{{default_description}}, occurring on or around {{default_date}}, which constitutes a breach of the opposite party\'s obligations to the applicant.',
    plainLanguageExplanation: 'What the opposite party failed to do, and roughly when.',
  },
  {
    code: 'MA-03',
    caseTypeId: 'ct-mediation-application',
    category: 'facts',
    title: 'Attempts at resolution',
    bodyTemplate:
      'Despite {{resolution_attempt}}, the dispute remains unresolved, necessitating this application for pre-institution mediation under Section 12A of the Commercial Courts Act, 2015.',
    plainLanguageExplanation: 'What was tried before filing this application — a demand, a notice, repeated requests, etc.',
  },
  {
    code: 'MA-04',
    caseTypeId: 'ct-mediation-application',
    category: 'quantification',
    title: 'Quantum of claim',
    bodyTemplate: 'The amount in dispute is Rs. {{claim_amount}}.',
    plainLanguageExplanation: 'The value of the commercial dispute.',
  },
  {
    code: 'MA-05',
    caseTypeId: 'ct-mediation-application',
    category: 'jurisdiction',
    title: 'Territorial jurisdiction',
    bodyTemplate:
      'The opposite party resides/carries on business at {{jurisdiction_place}}, and the cause of action wholly or partly arose at {{jurisdiction_place}}, within the jurisdiction of the Commercial Court at {{jurisdiction_place}}.',
    plainLanguageExplanation: 'Why this Authority/the Commercial Court at this place has jurisdiction over the dispute.',
  },
  {
    code: 'NC-01',
    caseTypeId: 'ct-ni-act-complaint',
    category: 'facts',
    title: 'Underlying debt or liability',
    bodyTemplate:
      'The accused owed the complainant a sum of Rs. {{debt_amount}} on account of {{debt_nature}}, and in discharge of this liability issued Cheque No. {{cheque_number}} dated {{cheque_date}} for Rs. {{cheque_amount}}, drawn on {{drawee_bank}}, {{drawee_branch}}, Account No. {{drawer_account}}, in favour of the complainant.',
    plainLanguageExplanation: 'What the money was owed for, and the details of the cheque issued to discharge it.',
  },
  {
    code: 'NC-02',
    caseTypeId: 'ct-ni-act-complaint',
    category: 'facts',
    title: 'Presentation and dishonour',
    bodyTemplate:
      'The complainant presented the said cheque for encashment on {{presentation_date}}, and the same was returned unpaid vide the bank\'s memo dated {{dishonour_date}} with the remarks "{{dishonour_reason}}".',
    plainLanguageExplanation: 'When the cheque was presented, and how/when it bounced.',
  },
  {
    code: 'NC-03',
    caseTypeId: 'ct-ni-act-complaint',
    category: 'facts',
    title: 'Notice and non-payment',
    bodyTemplate:
      'The complainant thereupon caused a legal notice dated {{notice_date}} to be served upon the accused under Section 138 of the Negotiable Instruments Act, 1881, calling upon the accused to pay the said sum within fifteen days of receipt. Despite {{notice_service_detail}}, the accused has failed and neglected to make payment of the said amount.',
    plainLanguageExplanation: 'When the statutory notice was sent, and confirmation that payment still was not made.',
  },
  {
    code: 'NC-04',
    caseTypeId: 'ct-ni-act-complaint',
    category: 'offence',
    title: 'Offence committed',
    bodyTemplate:
      'By the aforesaid acts, the accused has committed an offence punishable under Section 138 of the Negotiable Instruments Act, 1881, read with Section 318(4) of the Bharatiya Nyaya Sanhita, 2023 (cheating).',
    plainLanguageExplanation: 'The statutory offence this conduct amounts to.',
  },
];

export const paraWiseAllegations = [
  { id: 1, text: 'A loan of the claimed amount was sanctioned to you' },
  { id: 2, text: 'You defaulted on repayment' },
  { id: 3, text: 'A demand notice was properly served on you' },
  { id: 4, text: 'The amount claimed, including interest, is accurate' },
];

export const groundsOfDefenceOptions = [
  { id: 'limitation', label: 'The bank filed too late (limitation)' },
  { id: 'quantification', label: 'The amount claimed is wrong' },
  { id: 'npa', label: 'My account was wrongly classified as NPA' },
  { id: 'notice', label: 'The notice had defects' },
  { id: 'other', label: 'Something else' },
];

export const disputeTypeOptions = [
  { id: 'goods', label: 'Defective goods' },
  { id: 'service', label: 'Deficient service' },
  { id: 'unfair_contract', label: 'Unfair contract term' },
  { id: 'other', label: 'Something else' },
];

export const reliefOptions = [
  { id: 'refund', label: 'Refund' },
  { id: 'replacement', label: 'Replacement' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'repair', label: 'Repair' },
];

export const moneyRecoveryCauseOptions = [
  { id: 'unpaid_loan', label: 'Unpaid loan' },
  { id: 'unpaid_invoice', label: 'Unpaid invoice / goods sold' },
  { id: 'dishonoured_cheque', label: 'Dishonoured cheque' },
  { id: 'unpaid_fees_salary', label: 'Unpaid fees or salary' },
  { id: 'other', label: 'Something else' },
];

// Each carries its own statutory notice-period rule where one is legally fixed (cheque dishonour,
// government parties) rather than left to the sender's discretion — see LegalNoticeWizard.tsx's
// NOTICE_TYPE_RULES, keyed by these same ids.
export const legalNoticeTypeOptions = [
  { id: 'unpaid_debt', label: 'Unpaid debt / invoice' },
  { id: 'breach_of_contract', label: 'Breach of contract' },
  { id: 'dishonoured_cheque', label: 'Dishonoured cheque (Section 138, Negotiable Instruments Act, 1881)' },
  { id: 'government_party', label: 'Against a Government department/officer (Section 80, CPC)' },
  { id: 'eviction', label: 'Eviction / tenancy dispute' },
  { id: 'other', label: 'Something else' },
];

// Drives ContractAgreementWizard.tsx's CONTRACT_TYPE_CONFIGS — role labels, the document title,
// and which key-terms fields are shown vary per type, so each id there must match one here.
export const contractTypeOptions = [
  { id: 'rent_lease', label: 'Rent / Lease Agreement' },
  { id: 'loan_promissory_note', label: 'Loan Agreement / Promissory Note' },
  { id: 'employment', label: 'Employment Agreement' },
  { id: 'general', label: 'General-purpose agreement' },
];

export const bailTypeOptions = [
  { id: 'regular', label: 'Regular bail — I am already arrested / in custody' },
  { id: 'anticipatory', label: 'Anticipatory bail — I fear arrest and have not yet been arrested' },
];

// Anticipatory bail can only go to the High Court or Court of Session (BNSS Section 482) — never
// a Magistrate — so BailApplicationWizard.tsx filters this list when bailType is 'anticipatory'.
export const courtLevelOptions = [
  { id: 'magistrate_court', label: 'Magistrate' },
  { id: 'sessions_court', label: 'Sessions Court' },
  { id: 'high_court', label: 'High Court' },
];

// Common, reusable grounds for bail — `label` is the short tickbox text, `sentence` is the full
// pleading sentence composed into the "Grounds for bail" section for each one selected.
// BailApplicationWizard.tsx also offers a free-text field for anything not covered here.
export const bailGroundsOptions = [
  {
    id: 'no_flight_risk',
    label: 'No flight risk',
    sentence: 'The Applicant has strong roots in the community and is not a flight risk.',
  },
  {
    id: 'cooperating',
    label: 'Cooperating with investigation',
    sentence: 'The Applicant has been cooperating, and undertakes to continue cooperating, with the investigation.',
  },
  {
    id: 'no_antecedents',
    label: 'No criminal antecedents',
    sentence: 'The Applicant has no previous criminal antecedents.',
  },
  {
    id: 'false_implication',
    label: 'False implication',
    sentence: 'The Applicant has been falsely implicated in the present case.',
  },
  {
    id: 'parity',
    label: 'Parity with co-accused',
    sentence: 'Bail has already been granted to similarly placed co-accused in this case, and the Applicant is entitled to parity.',
  },
  {
    id: 'investigation_complete',
    label: 'Investigation substantially complete',
    sentence: "The investigation is substantially complete and the Applicant's custody is no longer required for its purposes.",
  },
  {
    id: 'health',
    label: 'Health / age grounds',
    sentence: 'The Applicant is of advanced age / suffering from ill health, warranting humanitarian consideration.',
  },
  {
    id: 'sole_breadwinner',
    label: 'Sole breadwinner',
    sentence: "The Applicant is the sole breadwinner of the family, who would suffer great hardship on account of the Applicant's continued custody.",
  },
  {
    id: 'first_time_offender',
    label: 'First-time offender',
    sentence: 'The Applicant is a first-time offender with no history of involvement in any other criminal case.',
  },
  {
    id: 'nature_of_offence',
    label: 'Nature of accusation not grave',
    sentence: 'The offence alleged, even if taken at face value, is not of such a grave or heinous nature as to warrant continued incarceration pending trial.',
  },
];

// Not exhaustive — a curated shortlist matching the most common commercial-dispute categories
// from Section 2(1)(c), Commercial Courts Act, 2015, plus a free-text fallback.
export const mediationDisputeNatureOptions = [
  { id: 'loan_credit_facility', label: 'Loan / credit facility default' },
  { id: 'sale_of_goods', label: 'Sale of goods' },
  { id: 'services_agreement', label: 'Services agreement' },
  { id: 'construction_contract', label: 'Construction / infrastructure contract' },
  { id: 'partnership_jv', label: 'Partnership / joint venture dispute' },
  { id: 'franchising_distribution', label: 'Franchising / distribution agreement' },
  { id: 'other_commercial', label: 'Other commercial transaction' },
];

export const underlyingDebtNatureOptions = [
  { id: 'friendly_loan', label: 'Friendly / personal loan' },
  { id: 'business_loan', label: 'Business loan or credit facility' },
  { id: 'sale_of_goods', label: 'Sale of goods' },
  { id: 'services_rendered', label: 'Services rendered' },
  { id: 'rent_due', label: 'Rent due' },
  { id: 'other_debt', label: 'Other liability' },
];

// Only "insufficient funds" and "exceeds arrangement" are the grounds Section 138 itself
// contemplates — the others are common bank-memo wordings that still support a complaint, but are
// worth flagging since they can invite a defence that the cheque wasn't dishonoured for want of
// funds. NIActComplaintWizard.tsx surfaces a caveat for reasons other than the first two.
export const chequeDishonourReasonOptions = [
  { id: 'funds_insufficient', label: 'Funds insufficient' },
  { id: 'exceeds_arrangement', label: 'Exceeds arrangement' },
  { id: 'account_closed', label: 'Account closed' },
  { id: 'stop_payment', label: 'Payment stopped by drawer' },
  { id: 'signature_mismatch', label: "Signature doesn't match" },
  { id: 'other_reason', label: 'Other' },
];

// Hindu Marriage Act, 1955, Section 13(1) grounds (available to either spouse) plus the
// wife-only grounds in Section 13(2) — id/label/sentence shape matches bailGroundsOptions above.
// Section 13(1A)'s two grounds (no resumption after a judicial-separation/restitution decree) are
// a narrower, less common route and are deliberately left out of this first pass rather than
// added without a clear UI for "was there already a prior decree" — same discipline as leaving a
// feature out entirely rather than guessing at how to represent it.
export const divorceGroundsOptions = [
  {
    id: 'adultery',
    label: 'Adultery',
    sentence: 'The Respondent has, after the solemnization of the marriage, had voluntary sexual intercourse with a person other than the Petitioner.',
  },
  {
    id: 'cruelty',
    label: 'Cruelty',
    sentence: 'The Respondent has, after the solemnization of the marriage, treated the Petitioner with cruelty.',
  },
  {
    id: 'desertion',
    label: 'Desertion (2+ years)',
    sentence: 'The Respondent has deserted the Petitioner for a continuous period of not less than two years immediately preceding the presentation of this petition.',
  },
  {
    id: 'conversion',
    label: 'Conversion to another religion',
    sentence: 'The Respondent has ceased to be a Hindu by conversion to another religion.',
  },
  {
    id: 'unsound_mind',
    label: 'Unsound mind / mental disorder',
    sentence: 'The Respondent has been incurably of unsound mind, or has been suffering continuously or intermittently from a mental disorder of such a kind and to such an extent that the Petitioner cannot reasonably be expected to live with the Respondent.',
  },
  {
    id: 'leprosy',
    label: 'Virulent and incurable leprosy',
    sentence: 'The Respondent has been suffering from a virulent and incurable form of leprosy.',
  },
  {
    id: 'venereal_disease',
    label: 'Communicable venereal disease',
    sentence: 'The Respondent has been suffering from venereal disease in a communicable form.',
  },
  {
    id: 'renunciation',
    label: 'Renounced the world',
    sentence: 'The Respondent has renounced the world by entering a religious order.',
  },
  {
    id: 'presumed_dead',
    label: 'Not heard of for 7+ years',
    sentence: 'The Respondent has not been heard of as being alive for a period of seven years or more by those persons who would naturally have heard of it, had the Respondent been alive.',
  },
  {
    id: 'wife_bigamy',
    label: 'Wife only: husband’s prior marriage subsisting',
    sentence: 'The husband had married again before the commencement of this Act, or another wife of the husband married before such commencement was alive at the time of the solemnization of the marriage of the Petitioner.',
  },
  {
    id: 'wife_rape_sodomy',
    label: 'Wife only: rape, sodomy or bestiality',
    sentence: 'The husband has, since the solemnization of the marriage, been guilty of rape, sodomy or bestiality.',
  },
  {
    id: 'wife_no_cohabitation_after_maintenance',
    label: 'Wife only: no cohabitation after a maintenance order',
    sentence: 'A decree or order awarding maintenance to the Petitioner has been passed against the husband, and cohabitation between the parties has not been resumed for one year or upwards since that decree or order.',
  },
  {
    id: 'wife_repudiation_of_child_marriage',
    label: 'Wife only: repudiation of a marriage solemnized before age 15',
    sentence: 'The marriage of the Petitioner was solemnized before the Petitioner attained the age of fifteen years, and the Petitioner has repudiated the marriage after attaining that age but before attaining the age of eighteen years.',
  },
];
