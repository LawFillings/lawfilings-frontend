import type { CaseType, ClauseDef, Forum, AppealGroup } from '../types';

export const forums: Forum[] = [
  { id: 'f-cc', name: 'Consumer Commission', forumType: 'consumer_commission', advocateMandatory: false },
  { id: 'f-drt', name: 'DRT', forumType: 'DRT', advocateMandatory: false },
  { id: 'f-drat', name: 'DRAT', forumType: 'DRAT', advocateMandatory: false },
  { id: 'f-nclt', name: 'NCLT', forumType: 'NCLT', advocateMandatory: false },
  { id: 'f-dc', name: 'District Court', forumType: 'district_court', advocateMandatory: false },
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
    name: 'Money Recovery Suit',
    governingLaw: 'Code of Civil Procedure, 1908',
    plainLanguageSummary:
      'Use this if someone owes you money — an unpaid loan, an unpaid invoice, or a bounced cheque — and you want to sue them for it in a District Court.',
    applicantEligibility: 'any_plaintiff',
    filingCategory: 'original',
  },
  {
    id: 'ct-dc-summary-suit',
    forumType: 'district_court',
    name: 'Summary Suit (Order XXXVII)',
    governingLaw: 'Code of Civil Procedure, 1908, Order XXXVII',
    plainLanguageSummary:
      'Use this if you’re owed money under a written contract, a cheque, or a promissory note — a faster procedure where the other side must get the court’s permission to contest.',
    applicantEligibility: 'plaintiff_with_written_contract_or_negotiable_instrument',
    filingCategory: 'original',
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
    forumType: 'misc_drafts',
    name: 'Bail Application',
    governingLaw: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    plainLanguageSummary:
      'Apply for bail in a criminal case — either regular bail after arrest, or anticipatory bail in advance of an expected arrest.',
    applicantEligibility: 'accused_or_apprehending_arrest',
    filingCategory: 'original',
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
    forumType: 'misc_drafts',
    name: 'Cheque Dishonour Complaint (Sections 138 & 142, NI Act)',
    governingLaw: 'Negotiable Instruments Act, 1881, Sections 138 & 142',
    plainLanguageSummary:
      "File a criminal complaint before the Magistrate after a cheque is dishonoured and the drawer fails to pay within 15 days of your notice.",
    applicantEligibility: 'payee_or_holder_in_due_course',
    filingCategory: 'original',
  },
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
