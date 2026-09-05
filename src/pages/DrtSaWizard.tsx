import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DebtThresholdSelector } from '../components/DebtThresholdSelector';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  forumDisplayName,
  withPeriod,
  splitIntoParagraphs,
  escapeHtml,
  buildDocumentListParagraphs,
  type CauseTitleInfo,
} from '../lib/legalDocumentFormat';
import {
  findFixedCaseTypeCitation,
  buildCitationParagraphs,
  findFixedCaseTypeCaseLaw,
  buildCaseLawParagraphs,
} from '../lib/actReferenceMatcher';
import { caseTypes } from '../data/mockData';
import { drtBenchLocations } from '../data/forumLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

// Real filed SA bundle we were shown as reference is a 3-document bundle — the Application
// itself (particulars of the applicant and every respondent, jurisdiction, limitation, facts,
// lettered grounds, lettered relief/interim prayers, fee particulars, then a Filed-by/Verification
// close addressed "To: The Registrar…"), a supporting Affidavit, and a List of Documents. The
// sample's own "Details of Index" clause just says an Index is "enclosed" without a distinctly
// formatted page — this platform adds one anyway (as Part I, ahead of the Application) to match
// the Index-first/Affidavit-last default used across every other court-filed wizard here.
const STEPS = [
  'Debt amount',
  'DRT bench',
  'Property & action',
  'Particulars of Applicant',
  'Particulars of Respondents',
  'Facts & grounds',
  'Relief & interim order',
  'Filing details',
  'Documents',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-drt-sa')!;

// The action being challenged often spans more than one SARFAESI step in sequence (e.g. a 13(4)
// possession action followed by 14 District Magistrate assistance to execute it) — the challenge
// needs to name every section actually invoked, not force a pick of just one.
const SARFAESI_SECTION_OPTIONS = [
  { value: '13(2)', label: 'Section 13(2) — demand notice' },
  { value: '13(4)', label: 'Section 13(4) — possession/sale action' },
  { value: '14', label: 'Section 14 — District Magistrate assistance' },
];

/** "13(4)" / "13(2) and 14" / "13(2), 13(4) and 14" — canonical order, not selection order. */
function joinSections(sections: string[]): string {
  const ordered = SARFAESI_SECTION_OPTIONS.map((o) => o.value).filter((v) => sections.includes(v));
  const list = ordered.length > 0 ? ordered : ['13(4)'];
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

interface RespondentEntry {
  name: string;
  type: 'individual' | 'institution';
  throughSignatory: string;
  address: string;
  serviceAddress: string;
}
function emptyRespondent(): RespondentEntry {
  return { name: '', type: 'institution', throughSignatory: '', address: '', serviceAddress: '' };
}

interface DocEntry {
  particulars: string;
  pageNo: string;
}

/** (I), (II), (III)… — the real sample's sub-particulars/facts numbering, distinct from the
 *  lettered A/B/C grounds and the a)/b)/c) relief/interim prayers used elsewhere in the same doc. */
function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = num;
  let result = '';
  for (const [value, symbol] of map) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

function buildSaDocumentsTableHtml(entries: DocEntry[]): string {
  const rows = entries.length > 0 ? entries : [{ particulars: '', pageNo: '' }];
  const bodyRows = rows
    .map((e, i) => {
      const letter = String.fromCharCode(65 + i);
      return (
        `<tr><td>${i + 1}</td>` +
        `<td>Annexure-${letter}: ${escapeHtml(e.particulars || '[Particulars]')}</td>` +
        `<td>${escapeHtml(e.pageNo || '[Pages]')}</td></tr>`
      );
    })
    .join('');
  return (
    `<table><tr><th>Sl.no.</th><th>Particulars of documents</th><th>Pages</th></tr>${bodyRows}</table>`
  );
}

interface SavedContent {
  benchId: string;
  propertyAddress: string;
  loanAmount: string;
  securityDescription: string;
  sarfaesiSections: string[];
  noticeDate: string;
  applicantName: string;
  applicantRelation: 'S/o' | 'W/o' | 'D/o';
  applicantRelativeName: string;
  applicantAge: string;
  applicantAddress: string;
  applicantServiceAddress: string;
  respondents: RespondentEntry[];
  factsNarrative: string;
  groundsText: string;
  reliefText: string;
  interimText: string;
  matterPendingText: string;
  feePaymentMode: 'online' | 'draft';
  draftBankName: string;
  draftNumber: string;
  draftDate: string;
  draftAmount: string;
  advocateName: string;
  advocateEnrollment: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  verificationPlace: string;
  registrarAddressText: string;
  documentEntries: DocEntry[];
}

export function DrtSaWizard({
  onBack,
  onOpenPricing,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [benchId, setBenchId] = useState(saved?.benchId ?? '');

  // --- Property & SARFAESI action ---
  const [propertyAddress, setPropertyAddress] = useState(saved?.propertyAddress ?? '');
  const [loanAmount, setLoanAmount] = useState(saved?.loanAmount ?? '');
  const [securityDescription, setSecurityDescription] = useState(saved?.securityDescription ?? '');
  const [sarfaesiSections, setSarfaesiSections] = useState<string[]>(saved?.sarfaesiSections ?? ['13(4)']);
  const toggleSarfaesiSection = (value: string) =>
    setSarfaesiSections((s) => (s.includes(value) ? s.filter((v) => v !== value) : [...s, value]));
  const [noticeDate, setNoticeDate] = useState(saved?.noticeDate ?? '');

  // --- Particulars of Applicant ---
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantRelation, setApplicantRelation] = useState<'S/o' | 'W/o' | 'D/o'>(saved?.applicantRelation ?? 'S/o');
  const [applicantRelativeName, setApplicantRelativeName] = useState(saved?.applicantRelativeName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [applicantServiceAddress, setApplicantServiceAddress] = useState(saved?.applicantServiceAddress ?? '');

  // --- Particulars of Respondents (heterogeneous — bank/FI, companies, individuals) ---
  const [respondents, setRespondents] = useState<RespondentEntry[]>(saved?.respondents ?? [emptyRespondent()]);
  const addRespondent = () => setRespondents((r) => [...r, emptyRespondent()]);
  const removeRespondent = (i: number) => setRespondents((r) => r.filter((_, idx) => idx !== i));
  const updateRespondent = (i: number, patch: Partial<RespondentEntry>) =>
    setRespondents((r) => r.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  // --- Facts & Grounds — one point per blank-line-separated paragraph, auto (I)/(II)… and A/B/C… ---
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [groundsText, setGroundsText] = useState(saved?.groundsText ?? '');

  // --- Relief & Interim — one prayer per blank-line-separated paragraph, auto a)/b)/c)… ---
  const [reliefText, setReliefText] = useState(saved?.reliefText ?? '');
  const [interimText, setInterimText] = useState(saved?.interimText ?? '');

  // --- Filing details ---
  const [matterPendingText, setMatterPendingText] = useState(saved?.matterPendingText ?? '');
  const [feePaymentMode, setFeePaymentMode] = useState<'online' | 'draft'>(saved?.feePaymentMode ?? 'online');
  const [draftBankName, setDraftBankName] = useState(saved?.draftBankName ?? '');
  const [draftNumber, setDraftNumber] = useState(saved?.draftNumber ?? '');
  const [draftDate, setDraftDate] = useState(saved?.draftDate ?? '');
  const [draftAmount, setDraftAmount] = useState(saved?.draftAmount ?? '');
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [advocateEnrollment, setAdvocateEnrollment] = useState(saved?.advocateEnrollment ?? '');
  const [advocatePhone, setAdvocatePhone] = useState(saved?.advocatePhone ?? '');
  const [advocateEmail, setAdvocateEmail] = useState(saved?.advocateEmail ?? '');
  const [filingPlace, setFilingPlace] = useState(saved?.filingPlace ?? '');
  const [verificationPlace, setVerificationPlace] = useState(saved?.verificationPlace ?? '');
  const [registrarAddressText, setRegistrarAddressText] = useState(saved?.registrarAddressText ?? '');

  // --- Documents (Annexure A, B, C…) ---
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>(saved?.documentEntries ?? []);
  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const selectedBench = drtBenchLocations.find((b) => b.id === benchId);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      benchId, propertyAddress, loanAmount, securityDescription, sarfaesiSections, noticeDate,
      applicantName, applicantRelation, applicantRelativeName, applicantAge, applicantAddress, applicantServiceAddress,
      respondents, factsNarrative, groundsText, reliefText, interimText,
      matterPendingText, feePaymentMode, draftBankName, draftNumber, draftDate, draftAmount,
      advocateName, advocateEnrollment, advocatePhone, advocateEmail, filingPlace, verificationPlace,
      registrarAddressText, documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-drt-sa',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `DRT Securitisation Application${propertyAddress ? ` — ${propertyAddress}` : ''}`,
            ownerRole: user.role === 'advocate' ? 'advocate' : 'justice_seeker',
          },
          token
        );
        setCaseId(created.id);
        const draft = await casesClient.createDraft(created.id, created.title, content, token);
        setDraftId(draft.id);
      }
      setSaveState('saved');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(true);
        setSaveState('idle');
      } else {
        setSaveState('error');
      }
    }
  };

  const citationMatches = findFixedCaseTypeCitation('ct-drt-sa');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-drt-sa');

  const respondentLabel = respondents.length > 1 ? 'Respondents' : 'Respondent';

  const baseCauseTitle: Omit<CauseTitleInfo, 'bodyHeading'> = {
    forumType: caseType.forumType,
    applicationTitle: 'Securitisation Application',
    applicantName,
    respondentName: respondents[0]?.name ?? '',
    filingCategory: caseType.filingCategory,
    applicantLabel: 'Applicant',
    respondentLabel,
    benchNumber: selectedBench?.benchNumber,
    benchCity: selectedBench?.city,
    caseNumberLine: `S.A. No. _____/${new Date().getFullYear()}`,
  };

  const longApplicationTitle =
    `Application under Sec.17(1) of the Securitisation and Reconstruction of Financial Assets and Enforcement of the Security Interest Act, 2002 read with the Security Interest Enforcement Rules, 2002 thereby challenging the validity of the action, being taken of by the Respondent No.1 bank under ${sarfaesiSections.length > 1 ? 'Sections' : 'Section'} ${joinSections(sarfaesiSections)} of the SARFAESI Act, 2002 against property bearing ${propertyAddress || '[Property Address]'}`.toUpperCase();

  const applicantRelationLine = applicantRelativeName ? `${applicantRelation} ${applicantRelativeName}` : '';

  const respondentDetailSections: DraftSection[] = respondents.flatMap((r, i) => {
    const nameLine =
      r.type === 'institution' && r.throughSignatory
        ? `${withPeriod(r.name || '[Respondent]')} through its authorised signatory ${r.throughSignatory}`
        : withPeriod(r.name || '[Respondent]');
    return [
      {
        heading: `Particulars of the Respondent No.${i + 1}:`,
        unnumbered: true,
        paragraphs: [
          `(I) Name of the Respondent: ${nameLine}`,
          `(II) Address of the Respondent: ${r.address || '[Address]'}`,
          `(III) Address for service of all notices: ${r.serviceAddress || r.address || '[Address]'}`,
        ],
      },
    ];
  });

  const factsRoman = splitIntoParagraphs(factsNarrative).map((p, i) => `(${toRoman(i + 1)}) ${p}`);
  const groundsLettered = splitIntoParagraphs(groundsText).map((p, i) => `${String.fromCharCode(65 + i)}. ${p}`);
  const reliefLettered = splitIntoParagraphs(reliefText).map((p, i) => `${String.fromCharCode(97 + i)}) ${p}`);
  const interimLettered = splitIntoParagraphs(interimText).map((p, i) => `${String.fromCharCode(97 + i)}) ${p}`);

  const matterPendingParagraph = matterPendingText.trim()
    ? `The Applicant declares that the Applicant has filed ${matterPendingText.trim()}. Except this, the Applicant has not challenged the action of the Respondent bank u/s ${joinSections(sarfaesiSections)} of the SARFAESI Act, 2002 and the rules framed there under against the alleged secured asset before any other court or tribunal in the present matter, and hence declares that the matter is not pending with any other court of law or any other authority or any other Tribunal.`
    : `The Applicant declares that the Applicant has not challenged the action of the Respondent bank u/s ${joinSections(sarfaesiSections)} of the SARFAESI Act, 2002 and the rules framed there under against the alleged secured asset before any other court or tribunal, and hence declares that the matter is not pending with any other court of law or any other authority or any other Tribunal.`;

  // --- Part I: the Securitisation Application itself ---
  const saApplicationSections: DraftSection[] = [
    {
      heading: '1. Particulars of the Applicant',
      unnumbered: true,
      paragraphs: [
        `(I) Name of the Applicant: ${withPeriod(applicantName || '[Applicant]')}${applicantRelationLine ? ` ${applicantRelationLine}` : ''}`,
        `(II) Address of the Applicant: ${applicantAddress || '[Address]'}`,
        `(III) Address for service of all notices: ${applicantServiceAddress || applicantAddress || '[Address]'}`,
      ],
    },
    { heading: '2. Particulars of the Respondents:', unnumbered: true, paragraphs: [] },
    ...respondentDetailSections,
    {
      heading: '3. Jurisdiction of the Tribunal',
      unnumbered: true,
      paragraphs: [
        `The Applicant declares that the subject matter of the instant Application falls within the jurisdiction of this Hon'ble Tribunal as the property in question i.e. ${propertyAddress || '[Property Address]'} falls within the territorial jurisdiction of this Hon'ble Tribunal, hence this Hon'ble Tribunal has the jurisdiction to entertain and adjudicate the present Securitisation Application.`,
      ],
      incomplete: !propertyAddress,
    },
    {
      heading: '4. Limitation',
      unnumbered: true,
      paragraphs: [
        `The Applicant declares that the present Securitisation Application is being filed against the measure taken by the Respondent bank/F.I. under Rule 8(1) read with ${sarfaesiSections.length > 1 ? 'Sections' : 'Section'} ${joinSections(sarfaesiSections)} of the SARFAESI Act, against the property of the Applicant i.e. ${propertyAddress || '[Property Address]'}. The present Application is being filed within the statutory period of 45 days to be computed from ${noticeDate || '[date]'}. Hence the present Securitisation Application is well within the period of limitation.`,
      ],
      incomplete: !noticeDate,
    },
    {
      heading: '5. Facts of the Case:',
      unnumbered: true,
      paragraphs: factsRoman.length > 0 ? factsRoman : ['[Facts of the case not yet entered.]'],
      incomplete: !factsNarrative.trim(),
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', unnumbered: true, paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', unnumbered: true, paragraphs: buildCaseLawParagraphs(caseLawMatches) }]
      : []),
    {
      heading: 'Grounds',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: groundsLettered.length > 0 ? groundsLettered : ['[Grounds of challenge not yet entered.]'],
      incomplete: !groundsText.trim(),
    },
    {
      heading: '6. Relief Sought:',
      unnumbered: true,
      paragraphs: [
        `It is, therefore, most respectfully prayed that in the interest of justice, equity and fair play and for the reasons mentioned in the present Securitisation Application, this Hon'ble Tribunal may most graciously be pleased to:-`,
        ...(reliefLettered.length > 0 ? reliefLettered : ['[Relief sought not yet entered.]']),
      ],
      incomplete: !reliefText.trim(),
    },
    {
      heading: '(7) Interim Order, If Prayed For:',
      unnumbered: true,
      paragraphs: [
        `That pending the final decision on the present Application, this Hon'ble Tribunal may be pleased to:`,
        ...(interimLettered.length > 0 ? interimLettered : ['[Interim relief not yet entered.]']),
      ],
    },
    {
      heading: '(8) Matter Not Pending With Any Other Court',
      unnumbered: true,
      paragraphs: [matterPendingParagraph],
    },
    {
      heading: '(9) Particulars of Bank Draft/Postal Order in Respect of the Application Fee:',
      unnumbered: true,
      paragraphs:
        feePaymentMode === 'online'
          ? ['Amount of Demand Draft: Paid online.']
          : [
              `i) Name of the bank on which drawn: ${withPeriod(draftBankName || '[Bank name]')}`,
              `ii) Demand Draft No. with date: ${draftNumber || '[DD number]'} dated ${draftDate || '[date]'}.`,
              `iii) Amount of Demand Draft: ${draftAmount || '[amount]'}.`,
            ],
    },
    {
      heading: '(10) Details of Index:',
      unnumbered: true,
      paragraphs: [`An Index in duplicate containing the details of the documents relied upon by the Applicant is enclosed.`],
    },
    {
      heading: '(11) List of Enclosures:',
      unnumbered: true,
      paragraphs: [`Refer Index/List of Documents enclosed.`],
    },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: ['Securitisation Applicant', applicantName || '[Applicant]', applicantRelationLine || '[Relation]'],
    },
    { unnumbered: true, align: 'center', paragraphs: ['through'] },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: [
        advocateName || '[Name of Advocate]',
        'Advocate',
        `Enrl. No. ${advocateEnrollment || '[Enrollment No.]'}`,
        `Mob ${advocatePhone || '[Mobile]'} Email ${advocateEmail || '[Email]'}`,
      ],
    },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of para 1 to 11 of my above Securitisation Application are true and correct and no part of the same is false and nothing material has been concealed therefrom.`,
      ],
    },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: ['Securitisation Applicant', applicantName || '[Applicant]', applicantRelationLine || '[Relation]'],
    },
    { unnumbered: true, align: 'center', paragraphs: ['through'] },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: [
        advocateName || '[Name of Advocate]',
        'Advocate',
        `Enrl. No. ${advocateEnrollment || '[Enrollment No.]'}`,
        `Mob ${advocatePhone || '[Mobile]'} Email ${advocateEmail || '[Email]'}`,
      ],
    },
    {
      unnumbered: true,
      align: 'left',
      paragraphs: [
        'To:',
        'The Registrar,',
        ...(registrarAddressText.trim()
          ? registrarAddressText.split('\n').map((l) => l.trim()).filter(Boolean)
          : [
              `${forumDisplayName(caseType.forumType).replace(/^THE\s+/, '')}${selectedBench?.benchNumber ? `-${selectedBench.benchNumber}` : ''},`,
            ]),
      ],
    },
  ];
  const saApplicationCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: longApplicationTitle });

  // --- Part II: Affidavit ---
  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(applicantName || '[Applicant]')} ${applicantRelationLine}, aged about ${applicantAge || '[age]'}, R/o ${applicantAddress || '[Address]'}, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Securitisation Applicant in the present case, as such I am well conversant with the facts of the present case and competent to swear this Affidavit.`,
        `2. That the accompanying Application/S.A. against the action being taken by the Respondent No.1 has been prepared at my instructions, the contents of which have been explained to me in the vernacular language which I understand and the same may be read as part and parcel of this Affidavit as the same has not been repeated herein for the sake of brevity. I have gone through the same and it is true and correct.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent'] },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of my above Affidavit are true and correct and no part of the same is false and nothing material has been concealed therefrom.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent'] },
  ];
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'AFFIDAVIT' });

  // Shared "filed by" closing — Securitisation Applicant through Advocate — reused on the Index
  // and List of Documents parts, matching the same block already used to close the Application.
  const applicantThroughAdvocateBlock: DraftSection[] = [
    {
      unnumbered: true,
      align: 'right',
      paragraphs: ['Securitisation Applicant', applicantName || '[Applicant]', applicantRelationLine || '[Relation]'],
    },
    { unnumbered: true, align: 'center', paragraphs: ['Through'] },
    {
      unnumbered: true,
      align: 'right',
      paragraphs: [
        advocateName || '[Name of Advocate]',
        'Advocate',
        `Enrl. No. ${advocateEnrollment || '[Enrollment No.]'}`,
        `Mob ${advocatePhone || '[Mobile]'} Email ${advocateEmail || '[Email]'}`,
      ],
    },
  ];

  // --- Part I: Index ---
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'INDEX' });
  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...applicantThroughAdvocateBlock,
  ];

  // --- Part IV: List of Documents ---
  const documentsCauseTitleHtml =
    buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'List of documents' }) + buildSaDocumentsTableHtml(documentEntries);
  const documentsSections: DraftSection[] = applicantThroughAdvocateBlock;

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        ← Back to all filings
      </button>
      <WizardShell
        title={caseType.name}
        governingLaw={caseType.governingLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Pecuniary jurisdiction' : 'Does this qualify for DRT?'}</h3>
            {caseType.jurisdictionRule && (
              <DebtThresholdSelector
                thresholdAmount={caseType.jurisdictionRule.minAmount ?? 0}
                thresholdLabel="₹20 lakh"
                mode={mode}
              />
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'DRT bench' : 'Which DRT should this go to?'}</h3>
            <LocationSelector
              mode={mode}
              locations={drtBenchLocations}
              value={benchId}
              onSelect={setBenchId}
              label={mode === 'advocate' ? 'DRT bench' : 'Which city’s DRT should this go to?'}
              helpText="Cities with more than one DRT list each bench separately — pick the specific one; territorial jurisdiction under Section 17 follows where the secured property is located."
              verifyNote="Bench count per city verified against a DRT case-management tool — confirm the correct bench at"
              verifyUrl="https://drt.gov.in"
              searchPlaceholder="Type a city…"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Property & SARFAESI action</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Property address (the secured asset)</span>
                <input type="text" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Loan amount</span>
                <input type="text" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Security description</span>
                <input type="text" value={securityDescription} onChange={(e) => setSecurityDescription(e.target.value)} />
              </label>
              <label className="form-field">
                <span>SARFAESI section(s) under challenge</span>
                <p className="step-help" style={{ margin: '0 0 var(--space-2)' }}>
                  Select every section actually invoked — e.g. a 13(4) possession action followed by Section 14 District Magistrate
                  assistance is one challenge naming both.
                </p>
                {SARFAESI_SECTION_OPTIONS.map((opt) => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <input
                      type="checkbox"
                      checked={sarfaesiSections.includes(opt.value)}
                      onChange={() => toggleSarfaesiSection(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </label>
              <label className="form-field">
                <span>Rule 8(1)/13(2) notice date</span>
                <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">1. Particulars of Applicant</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Name of Applicant</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Relation</span>
                <select value={applicantRelation} onChange={(e) => setApplicantRelation(e.target.value as 'S/o' | 'W/o' | 'D/o')}>
                  <option value="S/o">S/o</option>
                  <option value="W/o">W/o</option>
                  <option value="D/o">D/o</option>
                </select>
              </label>
              <label className="form-field">
                <span>Father's/Husband's name</span>
                <input type="text" value={applicantRelativeName} onChange={(e) => setApplicantRelativeName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address of the Applicant</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address for service of all notices (if different)</span>
                <input type="text" value={applicantServiceAddress} onChange={(e) => setApplicantServiceAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">2. Particulars of Respondents</h3>
            <p className="step-help">
              The Respondent Bank/FI is usually Respondent No. 1 — add any co-borrowers, guarantors, subsequent property owners, or
              builders as further respondents in the order they should appear.
            </p>
            {respondents.map((r, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-5)' }}>
                <h4>Respondent No. {i + 1}</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Name</span>
                    <input type="text" value={r.name} onChange={(e) => updateRespondent(i, { name: e.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Is this respondent an individual or an institution/company?</span>
                    <select value={r.type} onChange={(e) => updateRespondent(i, { type: e.target.value as 'individual' | 'institution' })}>
                      <option value="institution">Institution/Company</option>
                      <option value="individual">Individual</option>
                    </select>
                  </label>
                  {r.type === 'institution' && (
                    <label className="form-field">
                      <span>Through authorised signatory (if any)</span>
                      <input type="text" value={r.throughSignatory} onChange={(e) => updateRespondent(i, { throughSignatory: e.target.value })} />
                    </label>
                  )}
                  <label className="form-field">
                    <span>Address</span>
                    <input type="text" value={r.address} onChange={(e) => updateRespondent(i, { address: e.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Address for service (if different)</span>
                    <input type="text" value={r.serviceAddress} onChange={(e) => updateRespondent(i, { serviceAddress: e.target.value })} />
                  </label>
                </div>
                {respondents.length > 1 && (
                  <button type="button" className="para-btn" onClick={() => removeRespondent(i)}>
                    Remove Respondent No. {i + 1}
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addRespondent}>
              + Add another respondent
            </button>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">5. Facts of the Case & Grounds</h3>
            <label className="form-field">
              <span>Facts of the case</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Separate each fact with a blank line — each becomes its own (I), (II), (III)… point"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Grounds of challenge</span>
              <textarea
                className="facts-textarea"
                rows={8}
                value={groundsText}
                onChange={(e) => setGroundsText(e.target.value)}
                placeholder="Separate each ground with a blank line — each becomes its own lettered ground (A., B., C.…)"
              />
            </label>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">6. Relief Sought & Interim Order</h3>
            <label className="form-field">
              <span>Relief sought</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={reliefText}
                onChange={(e) => setReliefText(e.target.value)}
                placeholder="Separate each prayer with a blank line — each becomes its own a), b), c)…"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Interim order sought</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={interimText}
                onChange={(e) => setInterimText(e.target.value)}
                placeholder="Separate each interim prayer with a blank line — each becomes its own a), b), c)…"
              />
            </label>
          </div>
        )}

        {step === 7 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Any related proceedings pending elsewhere? (leave blank if none)</span>
                <input
                  type="text"
                  value={matterPendingText}
                  onChange={(e) => setMatterPendingText(e.target.value)}
                  placeholder="e.g. a civil suit in Dwarka court against [name]"
                />
              </label>
              <label className="form-field">
                <span>Application fee</span>
                <select value={feePaymentMode} onChange={(e) => setFeePaymentMode(e.target.value as 'online' | 'draft')}>
                  <option value="online">Paid online</option>
                  <option value="draft">Bank draft/postal order</option>
                </select>
              </label>
              {feePaymentMode === 'draft' && (
                <>
                  <label className="form-field">
                    <span>Name of the bank on which drawn</span>
                    <input type="text" value={draftBankName} onChange={(e) => setDraftBankName(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Demand Draft No.</span>
                    <input type="text" value={draftNumber} onChange={(e) => setDraftNumber(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Date</span>
                    <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Amount</span>
                    <input type="text" value={draftAmount} onChange={(e) => setDraftAmount(e.target.value)} placeholder="₹" />
                  </label>
                </>
              )}
              <label className="form-field">
                <span>Advocate name</span>
                <input type="text" value={advocateName} onChange={(e) => setAdvocateName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Advocate enrolment number</span>
                <input type="text" value={advocateEnrollment} onChange={(e) => setAdvocateEnrollment(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Advocate mobile</span>
                <input type="text" value={advocatePhone} onChange={(e) => setAdvocatePhone(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Advocate email</span>
                <input type="text" value={advocateEmail} onChange={(e) => setAdvocateEmail(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of filing</span>
                <input type="text" value={filingPlace} onChange={(e) => setFilingPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of verification</span>
                <input type="text" value={verificationPlace} onChange={(e) => setVerificationPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Registrar's address (for the "To:" line — optional, one line each)</span>
                <textarea
                  className="facts-textarea"
                  rows={3}
                  value={registrarAddressText}
                  onChange={(e) => setRegistrarAddressText(e.target.value)}
                  placeholder={'Debts Recovery Tribunal-II,\n1st Floor, Jeevan Tara Building, Parliament Street,\nNew Delhi – 110001'}
                />
              </label>
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h3 className="step-heading">Documents (Index & List of Documents)</h3>
            <p className="step-help">
              Add each document you're annexing, in order — these populate both the Index and the lettered
              Annexure-A, Annexure-B… List of Documents.
            </p>
            {documentEntries.map((d, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                <h4>Annexure-{String.fromCharCode(65 + i)}</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Particulars</span>
                    <input type="text" value={d.particulars} onChange={(e) => updateDocumentEntry(i, { particulars: e.target.value })} />
                  </label>
                  <label className="form-field">
                    <span>Pages</span>
                    <input type="text" value={d.pageNo} onChange={(e) => updateDocumentEntry(i, { pageNo: e.target.value })} placeholder="e.g. 21-27" />
                  </label>
                </div>
                <button type="button" className="para-btn" onClick={() => removeDocumentEntry(i)}>
                  Remove Annexure-{String.fromCharCode(65 + i)}
                </button>
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addDocumentEntry}>
              + Add document
            </button>
          </div>
        )}

        {step === 9 && (
          <div>
            <h3 className="step-heading">Preview</h3>
            {user ? (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving…' : caseId ? 'Update saved draft' : 'Save draft'}
                </button>
                {saveState === 'saved' && <p className="step-help">Saved to My Cases.</p>}
                {saveState === 'error' && <p className="step-help">Couldn't save — check your connection and try again.</p>}
                {paywall && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <PaywallBlock
                      onChoosePlan={onOpenPricing}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="step-help" style={{ marginBottom: 'var(--space-4)' }}>
                Log in to save this draft and come back to it later.
              </p>
            )}
            <p className="step-help">A filed SA is a bundle of separate documents — each below downloads as its own PDF.</p>

            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />

            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Securitisation Application</h4>
            <DraftDocument title={`${caseType.name} — Application`} causeTitleHtml={saApplicationCauseTitleHtml} sections={saApplicationSections} />

            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <h4 style={{ marginTop: 'var(--space-6)' }}>Part IV — List of Documents</h4>
            <DraftDocument title={`${caseType.name} — List of Documents`} causeTitleHtml={documentsCauseTitleHtml} sections={documentsSections} />

            <FilingGuidance forum="drt" contextLabel={selectedBench?.label} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}
