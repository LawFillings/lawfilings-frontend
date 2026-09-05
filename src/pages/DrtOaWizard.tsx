import { useRef, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DebtThresholdSelector } from '../components/DebtThresholdSelector';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  guessApplicantEntityLabel,
  anyOppositePartyIsInstitution,
  withPeriod,
  partyBlock,
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
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { extractOaLoanRecallFromText } from '../lib/documentExtractionClient';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = [
  'Debt amount',
  'DRT bench',
  'Particulars of Applicant',
  'Particulars of Defendants',
  'Jurisdiction & limitation',
  'Facts & cause of action',
  'Amount due',
  'Relief & interim order',
  'Filing details',
  'Documents',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-drt-oa')!;

interface DebtAssetEntry {
  particulars: string;
  amount: string;
}

interface DocumentEntry {
  particulars: string;
  pageNo: string;
}

interface DefendantEntry {
  name: string;
  type: 'individual' | 'institution';
  address: string;
  serviceAddress: string;
}

const emptyDefendant = (): DefendantEntry => ({ name: '', type: 'individual', address: '', serviceAddress: '' });

interface SavedContent {
  benchId: string;
  applicantBankName: string;
  applicantRegisteredOffice: string;
  applicantBranchOffice: string;
  applicantServiceAddress: string;
  defendants: DefendantEntry[];
  loanAgreementPlace: string;
  loanRecallNoticePlace: string;
  loanRecallNoticeDate: string;
  debtAssetEntries: DebtAssetEntry[];
  defaultDate1: string;
  loanAgreementNo1: string;
  loanAgreementDate1: string;
  defaultDate2: string;
  loanAgreementNo2: string;
  loanAgreementDate2: string;
  authorisedRepName: string;
  boardResolutionDate: string;
  factsNarrative: string;
  principalAmount: string;
  interestRate: string;
  interestAmount: string;
  totalAmount: string;
  calculationDate: string;
  loanAmount: string;
  sanctionDate: string;
  securityDescription: string;
  npaDate: string;
  propertyDetails: string;
  additionalReliefText: string;
  interimReliefText: string;
  draftBankName: string;
  draftNumber: string;
  draftDate: string;
  draftAmount: string;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  filingDate: string;
  authorisedRepFatherName: string;
  authorisedRepAge: string;
  verificationPlace: string;
  documentEntries: DocumentEntry[];
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function DrtOaWizard({
  onBack,
  onOpenPricing,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [acknowledgedGate, setAcknowledgedGate] = useState(false);
  const [step, setStep] = useState(0);
  const [benchId, setBenchId] = useState(saved?.benchId ?? '');

  // Particulars of Applicant
  const [applicantBankName, setApplicantBankName] = useState(saved?.applicantBankName ?? '');
  const [applicantRegisteredOffice, setApplicantRegisteredOffice] = useState(saved?.applicantRegisteredOffice ?? '');
  const [applicantBranchOffice, setApplicantBranchOffice] = useState(saved?.applicantBranchOffice ?? '');
  const [applicantServiceAddress, setApplicantServiceAddress] = useState(saved?.applicantServiceAddress ?? '');

  // Particulars of Defendants — a repeatable list, since an OA can name any number of
  // defendants/respondents (co-borrowers, guarantors, corporate defendants, etc.), not just two.
  const [defendants, setDefendants] = useState<DefendantEntry[]>(saved?.defendants ?? [emptyDefendant()]);

  // Jurisdiction & limitation
  const [loanAgreementPlace, setLoanAgreementPlace] = useState(saved?.loanAgreementPlace ?? '');
  const [loanRecallNoticePlace, setLoanRecallNoticePlace] = useState(saved?.loanRecallNoticePlace ?? '');
  const [loanRecallNoticeDate, setLoanRecallNoticeDate] = useState(saved?.loanRecallNoticeDate ?? '');
  const [debtAssetEntries, setDebtAssetEntries] = useState<DebtAssetEntry[]>(saved?.debtAssetEntries ?? []);
  const [defaultDate1, setDefaultDate1] = useState(saved?.defaultDate1 ?? '');
  const [loanAgreementNo1, setLoanAgreementNo1] = useState(saved?.loanAgreementNo1 ?? '');
  const [loanAgreementDate1, setLoanAgreementDate1] = useState(saved?.loanAgreementDate1 ?? '');
  const [defaultDate2, setDefaultDate2] = useState(saved?.defaultDate2 ?? '');
  const [loanAgreementNo2, setLoanAgreementNo2] = useState(saved?.loanAgreementNo2 ?? '');
  const [loanAgreementDate2, setLoanAgreementDate2] = useState(saved?.loanAgreementDate2 ?? '');

  // Facts & cause of action
  const [authorisedRepName, setAuthorisedRepName] = useState(saved?.authorisedRepName ?? '');
  const [boardResolutionDate, setBoardResolutionDate] = useState(saved?.boardResolutionDate ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');

  // Amount due
  const [principalAmount, setPrincipalAmount] = useState(saved?.principalAmount ?? '');
  const [interestRate, setInterestRate] = useState(saved?.interestRate ?? '');
  const [interestAmount, setInterestAmount] = useState(saved?.interestAmount ?? '');
  const [totalAmount, setTotalAmount] = useState(saved?.totalAmount ?? '');
  const [calculationDate, setCalculationDate] = useState(saved?.calculationDate ?? '');
  const [loanAmount, setLoanAmount] = useState(saved?.loanAmount ?? '');
  const [sanctionDate, setSanctionDate] = useState(saved?.sanctionDate ?? '');
  const [securityDescription, setSecurityDescription] = useState(saved?.securityDescription ?? '');
  const [npaDate, setNpaDate] = useState(saved?.npaDate ?? '');

  // Relief & interim order
  const [propertyDetails, setPropertyDetails] = useState(saved?.propertyDetails ?? '');
  const [additionalReliefText, setAdditionalReliefText] = useState(saved?.additionalReliefText ?? '');
  const [interimReliefText, setInterimReliefText] = useState(saved?.interimReliefText ?? '');

  // Filing details
  const [draftBankName, setDraftBankName] = useState(saved?.draftBankName ?? '');
  const [draftNumber, setDraftNumber] = useState(saved?.draftNumber ?? '');
  const [draftDate, setDraftDate] = useState(saved?.draftDate ?? '');
  const [draftAmount, setDraftAmount] = useState(saved?.draftAmount ?? '');
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [advocateAddress, setAdvocateAddress] = useState(saved?.advocateAddress ?? '');
  const [advocatePhone, setAdvocatePhone] = useState(saved?.advocatePhone ?? '');
  const [advocateEmail, setAdvocateEmail] = useState(saved?.advocateEmail ?? '');
  const [filingPlace, setFilingPlace] = useState(saved?.filingPlace ?? '');
  const [filingDate, setFilingDate] = useState(saved?.filingDate ?? '');
  const [authorisedRepFatherName, setAuthorisedRepFatherName] = useState(saved?.authorisedRepFatherName ?? '');
  const [authorisedRepAge, setAuthorisedRepAge] = useState(saved?.authorisedRepAge ?? '');
  const [verificationPlace, setVerificationPlace] = useState(saved?.verificationPlace ?? '');

  // Documents (Index / List of Documents)
  const [documentEntries, setDocumentEntries] = useState<DocumentEntry[]>(saved?.documentEntries ?? []);

  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);
  const [recallNoticeExtractState, setRecallNoticeExtractState] = useState<'idle' | 'extracting' | 'done' | 'error'>(
    'idle'
  );
  const [recallNoticeExtractError, setRecallNoticeExtractError] = useState<string | null>(null);
  const recallNoticeFileInputRef = useRef<HTMLInputElement>(null);

  const handleRecallNoticeFileSelected = async (file: File) => {
    if (!token) return;
    setRecallNoticeExtractState('extracting');
    setRecallNoticeExtractError(null);
    try {
      const text = await extractTextFromPdf(file);
      const extracted = await extractOaLoanRecallFromText(text, token);
      if (extracted.loanAgreementPlace && !loanAgreementPlace) setLoanAgreementPlace(extracted.loanAgreementPlace);
      if (extracted.loanAgreementNo1 && !loanAgreementNo1) setLoanAgreementNo1(extracted.loanAgreementNo1);
      if (extracted.loanAgreementDate1 && !loanAgreementDate1) setLoanAgreementDate1(extracted.loanAgreementDate1);
      if (extracted.defaultDate1 && !defaultDate1) setDefaultDate1(extracted.defaultDate1);
      if (extracted.loanRecallNoticePlace && !loanRecallNoticePlace) setLoanRecallNoticePlace(extracted.loanRecallNoticePlace);
      if (extracted.loanRecallNoticeDate && !loanRecallNoticeDate) setLoanRecallNoticeDate(extracted.loanRecallNoticeDate);
      if (extracted.principalAmount && !principalAmount) setPrincipalAmount(extracted.principalAmount);
      if (extracted.interestRate && !interestRate) setInterestRate(extracted.interestRate);
      if (extracted.interestAmount && !interestAmount) setInterestAmount(extracted.interestAmount);
      if (extracted.totalAmount && !totalAmount) setTotalAmount(extracted.totalAmount);
      if (extracted.calculationDate && !calculationDate) setCalculationDate(extracted.calculationDate);
      if (extracted.loanAmount && !loanAmount) setLoanAmount(extracted.loanAmount);
      if (extracted.sanctionDate && !sanctionDate) setSanctionDate(extracted.sanctionDate);
      if (extracted.securityDescription && !securityDescription) setSecurityDescription(extracted.securityDescription);
      if (extracted.npaDate && !npaDate) setNpaDate(extracted.npaDate);
      if (extracted.propertyDetails && !propertyDetails) setPropertyDetails(extracted.propertyDetails);
      if (extracted.factsNarrative && !factsNarrative) setFactsNarrative(extracted.factsNarrative);
      // The wizard always starts with one blank defendant row — only fill it in if the user
      // hasn't already named a defendant there, same "never overwrite" rule as every other field.
      if (extracted.defendantName && defendants.length === 1 && !defendants[0].name.trim()) {
        setDefendants([
          {
            ...defendants[0],
            name: extracted.defendantName,
            address: extracted.defendantAddress || defendants[0].address,
            type: extracted.defendantType === 'institution' ? 'institution' : 'individual',
          },
        ]);
      }
      setRecallNoticeExtractState('done');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setRecallNoticeExtractError(
          "This looks like a scanned document — text extraction only works with text-based PDFs for now. Try running it through a free online OCR/text-conversion tool and re-uploading the result, or fill in the details below manually."
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setRecallNoticeExtractError('This feature needs an active plan — see Pricing, or fill in the details below manually.');
      } else if (err instanceof ApiError) {
        setRecallNoticeExtractError(err.message);
      } else {
        setRecallNoticeExtractError("Couldn't read that file — please make sure it's a PDF and try again.");
      }
      setRecallNoticeExtractState('error');
    }
  };

  const selectedBench = drtBenchLocations.find((b) => b.id === benchId);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      benchId,
      applicantBankName,
      applicantRegisteredOffice,
      applicantBranchOffice,
      applicantServiceAddress,
      defendants,
      loanAgreementPlace,
      loanRecallNoticePlace,
      loanRecallNoticeDate,
      debtAssetEntries,
      defaultDate1,
      loanAgreementNo1,
      loanAgreementDate1,
      defaultDate2,
      loanAgreementNo2,
      loanAgreementDate2,
      authorisedRepName,
      boardResolutionDate,
      factsNarrative,
      principalAmount,
      interestRate,
      interestAmount,
      totalAmount,
      calculationDate,
      loanAmount,
      sanctionDate,
      securityDescription,
      npaDate,
      propertyDetails,
      additionalReliefText,
      interimReliefText,
      draftBankName,
      draftNumber,
      draftDate,
      draftAmount,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      authorisedRepFatherName,
      authorisedRepAge,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-drt-oa',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantBankName || 'Applicant'} vs. ${defendants[0]?.name || 'Defendant'} — DRT Original Application`,
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

  if (mode === 'justice_seeker' && !acknowledgedGate) {
    return (
      <div>
        <button className="back-link" onClick={onBack}>
          ← Back to all filings
        </button>
        <div className="wizard">
          <div className="step-content" style={{ maxWidth: 640 }}>
            <h3 className="step-heading">This isn't the right form for you</h3>
            <p className="step-help">
              An Original Application (OA) can only be filed by a bank or financial institution recovering a
              debt — you'd be the <strong>defendant</strong> in one of these, not the applicant.
            </p>
            <p className="step-help">
              If a bank has already filed an OA against you and you need to respond, use{' '}
              <strong>Written Statement — reply to Original Application</strong> instead. If a bank is trying
              to seize property you put up as security and you want to challenge that, use{' '}
              <strong>Securitisation Application (SA)</strong>.
            </p>
            <button className="para-btn" onClick={() => setAcknowledgedGate(true)}>
              I'm an advocate representing the bank — continue anyway
            </button>
            <button className="para-btn" style={{ marginLeft: 8 }} onClick={onBack}>
              Take me back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const citationMatches = findFixedCaseTypeCitation('ct-drt-oa');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-drt-oa');

  // This is a document-wide designation, not per-party: if every opposite party is an
  // individual, all are "Defendants" throughout the OA; if any one of them is an
  // institution/company, all opposite parties — individuals included — are "Respondents"
  // throughout, rather than mixing terms within the same filing.
  const oppositePartyLabel = anyOppositePartyIsInstitution(defendants) ? 'RESPONDENT' : 'DEFENDANT';
  const applicantEntityLabel = guessApplicantEntityLabel(applicantBankName);
  const namedDefendants = defendants.filter((d) => d.name.trim().length > 0);

  const baseCauseTitle: Omit<CauseTitleInfo, 'bodyHeading'> = {
    forumType: caseType.forumType,
    // Cause titles conventionally say just "ORIGINAL APPLICATION", not the platform's own
    // longer case-type label — that longer form stays in the wizard UI (page titles, PDF
    // filenames) where the extra context helps users find the right filing.
    applicationTitle: 'Original Application',
    governingLaw: caseType.governingLaw,
    applicantName: applicantBankName,
    respondentName: defendants[0]?.name ?? '',
    respondentEntries: defendants.map((d) => d.name),
    filingCategory: caseType.filingCategory,
    applicantLabel: applicantEntityLabel,
    respondentLabel: oppositePartyLabel,
    benchNumber: selectedBench?.benchNumber,
    benchCity: selectedBench?.city,
  };

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantBankName || '[Applicant]', '(APPLICANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  // --- Document 1: Index Page ---
  const indexSections: DraftSection[] = [
    {
      heading: 'Index',
      unnumbered: true,
      paragraphs: buildDocumentListParagraphs(documentEntries),
    },
    ...filedByBlock,
  ];
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'INDEX' });

  // --- Document 2: Memo of Parties --- Applicant, then VERSUS, then each Defendant/Respondent
  // in sequence, each with their full address — no "1ST PARTY"/"2ND PARTY" labelling, which was
  // never more than a placeholder for who's who. Rendered with the same name-left/label-right
  // partyBlock() used by the cause title above it (not a separate centered paragraph list), just
  // with the full address folded into the name side — so this reads as the cause title's own
  // party lines, expanded with address detail, rather than a differently-styled restatement.
  const applicantDetailText = `${withPeriod(applicantBankName || '[Applicant]')} Registered Office/Head Office: ${applicantRegisteredOffice || '[Address]'}.${applicantBranchOffice ? ` Branch Office: ${applicantBranchOffice}.` : ''}${applicantServiceAddress ? ` Address for service: ${applicantServiceAddress}.` : ''}`;
  const memoPartyDetailsHtml =
    partyBlock(applicantDetailText, applicantEntityLabel, '') +
    `<p style="text-align:center;">VERSUS</p>` +
    (namedDefendants.length > 0 ? namedDefendants : defendants)
      .map((d, i, arr) => {
        const detailText = `${withPeriod(d.name || '[Defendant]')} Address: ${d.address || '[Address]'}.${d.serviceAddress ? ` Address for service: ${d.serviceAddress}.` : ''}`;
        return partyBlock(detailText, oppositePartyLabel, arr.length > 1 ? `${i + 1}. ` : '');
      })
      .join('');
  const memoSections: DraftSection[] = [];
  const memoCauseTitleHtml =
    buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'MEMO OF PARTIES' }) + memoPartyDetailsHtml;

  // --- Document 3: Contents of OA (the main Application) --- Numbered heading-relative (2.1,
  // 2.2 … 3.1, 3.2 …), matching the real template, rather than one continuous count across the
  // whole document — so every sub-paragraph's number ties back to the heading it sits under.
  const debtAssetLines =
    debtAssetEntries.length > 0
      ? debtAssetEntries.map((e, i) => `${i + 1}. ${e.particulars || '[Particulars]'} — ${e.amount || '[Amount]'}`)
      : ['No debts/assets itemised.'];

  const defendantParticularLines = defendants.flatMap((d, i) => {
    const n = i + 1;
    const base = i * 3;
    return [
      `2.${base + 1} Name of the Defendant No. ${n}: ${d.name || `[Name of Defendant No. ${n}]`}.`,
      `2.${base + 2} Office/Residence Address of the Defendant No. ${n}: ${d.address || '[Address]'}.`,
      `2.${base + 3} Address for service of all notices: ${d.serviceAddress || d.address || '[Address]'}.`,
    ];
  });

  const factsParagraphs = factsNarrative
    ? factsNarrative
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    : ['[Facts of the case not yet entered.]'];
  const factsNumbered = factsParagraphs.map((p, i) => `5.${i + 3} ${p}`);
  const causeOfActionNumber = `5.${factsParagraphs.length + 3}`;

  const reliefItems = [
    `Direct that a Recovery Certificate be issued in favour of the Applicant against the Defendant for the sum of INR ${totalAmount || '[amount]'} due and outstanding including interest calculated up to ${calculationDate || '[date]'}, along with interest from the date of the recovery certificate/final order at ${interestRate || '[rate]'};`,
    `Direct the Defendant to pay the said sum to the Applicant;`,
    `Direct the recovery of the said sum through the attachment and sale of ${propertyDetails || '[property details]'};`,
    `Direct that the foregoing amounts be realised by way of attachment and sale of the immovable and movable assets of the Defendant;`,
    `Direct that the costs of this Original Application be awarded to the Applicant;`,
    `Permit the Applicant to amend/modify this Application and seek additional relief(s) against the Defendant if deemed necessary;`,
    additionalReliefText || `Pass or award any other order(s) that this Hon'ble Tribunal deems fit and proper in the interest of justice.`,
  ];

  const interimItems = [
    `That the Applicant has a good prima facie case and is likely to succeed in the matter. It is apprehended that the Defendant, with intent to defeat the final order passed by this Hon'ble Tribunal, will dispose of the secured asset(s) (${securityDescription || '[security description]'}), thereby jeopardising the interests of the Applicant. The balance of convenience lies in favour of the Applicant, who shall suffer irreparable loss and injury absent interim protection.`,
    `Pending the final decision on the Application, the Applicant prays that this Hon'ble Tribunal may graciously be pleased to restrain the Defendant, and his/her/its agents, employees, representatives and assigns, by means of an ex-parte ad interim order, from selling, alienating, disposing of, or creating any third-party interest or encumbrance on ${securityDescription || '[secured asset(s)]'}.`,
    ...(interimReliefText ? [interimReliefText] : []),
  ];

  const applicationSections: DraftSection[] = [
    {
      heading: '1. Particulars of Applicant',
      unnumbered: true,
      paragraphs: [
        `Name of Applicant: ${withPeriod(applicantBankName || '[Name of Applicant]')}`,
        `Address of Registered Office/Head Office: ${applicantRegisteredOffice || '[Address]'}.`,
        `Branch Office: ${applicantBranchOffice || '[Address]'}.`,
        `Address for service of all notices: ${applicantServiceAddress || applicantBranchOffice || '[Address]'}.`,
      ],
    },
    {
      heading: '2. Particulars of the Defendants',
      unnumbered: true,
      paragraphs: defendantParticularLines,
    },
    {
      heading: '3. Jurisdiction of the Tribunal',
      unnumbered: true,
      paragraphs: [
        `The Applicant states and declares that this Hon'ble Tribunal has the pecuniary and territorial jurisdiction to adjudicate the instant Original Application. The subject matter of recovery of the debts due to the Applicant fall within the jurisdiction of this Hon'ble Tribunal.`,
        `Territorial Jurisdiction`,
        `3.1 The Applicant is functioning as a bank/financial institution at its office located at ${applicantBranchOffice || '[address of Applicant]'}, which is within the jurisdiction of this Hon'ble Tribunal.`,
        `3.2 The Loan Agreement has been executed at ${loanAgreementPlace || '[Place of loan agreement execution]'} and thus the cause of action falls within the exclusive territorial jurisdiction of this Hon'ble Tribunal, hence as per Rule 6(d) of the Debt Recovery (Procedure) Rules, this Tribunal shall have the jurisdiction.`,
        `3.3 Further, the Loan Recall Notice dated ${loanRecallNoticeDate || '[date]'} has been issued from ${loanRecallNoticePlace || '[Name of Place]'}, and therefore the entire cause of action arose within the territorial jurisdiction of this Hon'ble Tribunal.`,
        `Pecuniary Jurisdiction`,
        `3.4 The amount due from the Defendant in the instant OA is over and above the pecuniary limit of INR 20,00,000/- (Rupees Twenty Lakh Only), and as such the Applicant declares that the subject matter of recovery of debts due falls within the pecuniary jurisdiction of this Hon'ble Tribunal.`,
        `Therefore, this Hon'ble Tribunal has jurisdiction to entertain and decide the present Original Application.`,
        `3A. Details of Debts and Assets: ${debtAssetLines.join(' ')}`,
      ],
      incomplete: !loanAgreementPlace || !loanRecallNoticePlace,
    },
    {
      heading: '4. Limitation',
      unnumbered: true,
      paragraphs: [
        `4.1 The Applicant declares that the present OA is within the limitation period prescribed under Section 24 of the Recovery of Debts and Bankruptcy Act, 1993.`,
        `4.2 The Defendant defaulted on ${defaultDate1 || '[date of default]'} in making payment vide Loan Agreement No. ${loanAgreementNo1 || '[agreement no.]'} dated ${loanAgreementDate1 || '[date]'}${
          defaultDate2
            ? `, and defaulted on ${defaultDate2} in making payment vide Loan Agreement No. ${loanAgreementNo2 || '[agreement no.]'} dated ${loanAgreementDate2 || '[date]'}`
            : ''
        }. The date of first default in terms of the Loan Agreement is within the prescribed period of limitation.`,
        `4.3 On this basis, no part of the claim of the Applicant is barred by the law of limitation. Hence, the present Original Application is within limitation.`,
      ],
      incomplete: !defaultDate1,
    },
    {
      heading: '5. Facts of the Case',
      unnumbered: true,
      paragraphs: [
        `5.1 The Applicant is a banking company/financial institution as defined under Sub-section (h) of Section 2 of the Recovery of Debts and Bankruptcy Act, 1993, and hence is competent to file the present OA.`,
        `5.2 ${authorisedRepName || '[Name and designation of authorised representative]'} is authorised as the Authorised Representative of the Applicant, vide Board Resolution/Power of Attorney dated ${boardResolutionDate || '[date]'} in his/her favour. The Authorised Representative is well conversant with the facts of the present case and hence the present OA is being filed, instituted, signed and verified by him/her on behalf of the Applicant.`,
        ...factsNumbered,
        `CAUSE OF ACTION`,
        `${causeOfActionNumber} The cause of action arose when the Defendant defaulted for the first time in the repayment of the monthly instalment on ${defaultDate1 || '[1st default date]'}${
          defaultDate2 ? `, and again on ${defaultDate2}` : ''
        }. The cause of action finally arose on ${loanRecallNoticeDate || '[date]'} when the Loan Recall Notice was sent to the Defendant, and continues to arise on a day-to-day basis.`,
      ],
      incomplete: !factsNarrative,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', unnumbered: true, paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', unnumbered: true, paragraphs: buildCaseLawParagraphs(caseLawMatches) }]
      : []),
    {
      heading: '6. Relief Sought',
      unnumbered: true,
      paragraphs: [
        `In light of the foregoing, it is most respectfully prayed that this Hon'ble Tribunal may graciously be pleased to allow this OA and pass an order to the following effect:`,
        ...reliefItems.map((item, i) => `6.${i + 1} ${item}`),
      ],
      incomplete: !totalAmount,
    },
    {
      heading: '7. Interim Order',
      unnumbered: true,
      paragraphs: interimItems.map((item, i) => `7.${i + 1} ${item}`),
    },
    {
      heading: '8. Matter Not Pending With Any Other Court, etc.',
      unnumbered: true,
      paragraphs: [
        `The Applicant further declares that the matter regarding which this OA has been made is not pending before any Court of Law or any other authority or any other Bench of this Hon'ble Tribunal, at the instance of the Applicant.`,
      ],
    },
    {
      heading: '9. Particulars of Bank Draft/Postal Order in Respect of the Application Fee',
      unnumbered: true,
      paragraphs: [
        `i) Name of the Bank on which drawn: ${withPeriod(draftBankName || '[Bank name]')}`,
        `ii) Demand Draft No.: ${draftNumber || '[DD number]'}.`,
        `iii) Dated: ${draftDate || '[date]'}.`,
        `iv) Amount: ${draftAmount || '[amount]'}.`,
      ],
    },
    {
      heading: '10. Details of Index',
      unnumbered: true,
      paragraphs: ['An Index in duplicate containing the details of the documents to be relied upon is enclosed.'],
    },
    {
      heading: '11. List of Enclosures',
      unnumbered: true,
      paragraphs: ['Refer Index/List of Documents enclosed.'],
    },
    ...filedByBlock,
    {
      heading: 'Verification',
      unnumbered: true,
      headingAlign: 'center',
      paragraphs: [
        `I, ${authorisedRepName || '[Name of Authorised Representative]'}, authorised representative of the Applicant having its Registered Office at ${applicantRegisteredOffice || '[Registered Office Address]'} and Branch Office at ${applicantBranchOffice || '[Branch Office Address]'}, do hereby solemnly affirm and verify that the contents of paragraph nos. 1 to 11 of the Original Application are true and correct to the best of my personal knowledge and belief, derived from the various official records of the Applicant, and that I have not suppressed any material facts.`,
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()}.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['APPLICANT'] },
  ];
  const applicationCauseTitleHtml = buildCauseTitleHtml(baseCauseTitle);

  // --- Document 4: Affidavit ---
  const affidavitSections: DraftSection[] = [
    {
      heading: 'Affidavit',
      unnumbered: true,
      paragraphs: [
        `I, ${authorisedRepName || '[Name of Authorised Representative]'}, S/o ${authorisedRepFatherName || "[Father's Name]"}, aged ${authorisedRepAge || '[Age]'} years, Authorised Representative of the Applicant having its Registered Office at ${applicantRegisteredOffice || '[Registered Office Address]'} and Branch Office at ${applicantBranchOffice || '[Branch Office Address]'}, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Authorised Representative duly authorised by the Applicant, and I am aware of the facts of the matter being the Authorised Representative of the Applicant, and in my said capacity I have perused the entire records relevant to the accompanying Original Application and am conversant with the facts of the case and am competent to depose thereto.`,
        `2. That this Hon'ble Tribunal has the jurisdiction to adjudicate the present Application, since the branch office of the Applicant where the loan account of the Defendant is currently maintained falls within the jurisdiction of this Hon'ble Tribunal.`,
        `3. That currently the loan account of the Defendant is maintained at the Applicant's branch office situated at ${applicantBranchOffice || '[Branch Office Address]'}.`,
      ],
    },
    {
      heading: 'Verification',
      unnumbered: true,
      headingAlign: 'center',
      paragraphs: [
        `I, ${authorisedRepName || '[Name of Authorised Representative]'}, authorised representative of the Applicant, do hereby solemnly affirm and verify that the contents of paragraph nos. 1 to 3 of this Affidavit are true and correct to the best of my personal knowledge and belief, derived from the various official records of the Applicant, and that I have not suppressed any material facts.`,
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()}.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
  ];
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'AFFIDAVIT' });

  // --- Document 6: Certificate under Section 2A of the Bankers' Books Evidence Act, 1891 ---
  // Authenticates computer-generated statements of account as evidence without needing the
  // original ledger books or a witness to prove them — this is what makes the bank's core
  // documentary evidence (the statement of account) admissible in the first place.
  const defendantNamesList =
    namedDefendants.length === 0
      ? '[Defendant]'
      : namedDefendants.length === 1
        ? namedDefendants[0].name
        : `${namedDefendants
            .slice(0, -1)
            .map((d) => d.name)
            .join(', ')} and ${namedDefendants[namedDefendants.length - 1].name}`;

  const bankersBooksCertificateSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `It is certified in respect of print out of Statements of Accounts of ${defendantNamesList}, as maintained in our computer system that-`,
        `a) Print out is the true copy of the data in respect of Account Statements contained in the computer;`,
        `b) There are proper safeguards adopted in the system to ensure that data is entered or any other operation is performed by authorized person;`,
        `c) There are proper safeguards to prevent and detect the unauthorized change of data;`,
        `d) There are proper safeguards available to retrieve data that is lost due to system failure or any other reasons;`,
        `e) There are proper provisions and manner in which data is transferred from the system to removable media like floppies, discs, tapes etc. other magnetic data storage devices;`,
        `f) There is proper mode of verification in order to ensure that data has been accurately transferred to such removable media;`,
        `g) There is proper mode of identification of such data storage devices;`,
        `h) There are arrangements for the storage and custody of such storage devices;`,
        `i) There are proper safeguards to prevent and detect any tampering with the system;`,
        `j) There is other factor which will vouch for the integrity and accuracy of the system.`,
        `It is further certified that to the best of knowledge and belief computer systems was properly operated at the material time and all relevant data was provided and the print out in question represents correctly and is appropriately derived from the relevant data.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['SYSTEM INCHARGE/PRINCIPAL OFFICER'] },
  ];
  const bankersBooksCertificateCauseTitleHtml = buildCauseTitleHtml({
    ...baseCauseTitle,
    bodyHeading: "CERTIFICATE UNDER SECTION 2A OF THE BANKERS' BOOKS EVIDENCE ACT, 1891",
  });

  // --- Document 7: Affidavit under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 ---
  // The current-law requirement (replacing the old Evidence Act's Section 65B) for any
  // electronic record — a digital loan agreement, an e-statement, a computer printout — to be
  // admissible as evidence at all; see Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal,
  // (2020) 7 SCC 1, on the mandatory nature of this certificate.
  const bsaAffidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `I, ${authorisedRepName || '[Name of Authorised Representative]'}, S/o ${authorisedRepFatherName || "[Father's Name]"}, aged ${authorisedRepAge || '[Age]'} years, Authorised Representative of the Applicant having its Registered Office at ${applicantRegisteredOffice || '[Registered Office Address]'} and Branch Office at ${applicantBranchOffice || '[Branch Office Address]'}, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am fully aware of the facts of the instant Original Application, and I am competent to swear the present Affidavit.`,
        `2. That the hard copies of the electronic record(s) enclosed with the present Application are true reproductions of the electronic record(s). I have reproduced hard copies of the documents filed along with the Application, and crave leave to refer to and rely upon the originals at the time of hearing, if necessary.`,
        `3. That the printouts of the document(s), statement(s), and KYC records annexed to this Application under Section 19 of the Recovery of Debts and Bankruptcy Act, 1993 were duly taken from a computer/device owned, maintained, managed and operated by the Applicant, and printed under my instructions using a printer that was similarly maintained, managed and operated.`,
        `4. That the necessary information was produced from the above-mentioned device(s) during the period over which such device(s) were regularly used to store or process information, and was at all material times under lawful control.`,
        `5. That throughout the material part of the said period, the said device(s) were operating properly, without any respect in which they were not operating properly affecting the contents of the electronic record.`,
        `6. That no part of this Affidavit is false, and nothing material has been concealed therefrom.`,
      ],
    },
    {
      heading: 'Verification',
      unnumbered: true,
      headingAlign: 'center',
      paragraphs: [
        `I, ${authorisedRepName || '[Name of Authorised Representative]'}, authorised representative of the Applicant, do hereby solemnly affirm and verify that the contents of paragraph nos. 1 to 6 of this Affidavit are true and correct to the best of my personal knowledge and belief, derived from the various official records of the Applicant, and that I have not suppressed any material facts.`,
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()}.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
  ];
  const bsaAffidavitCauseTitleHtml = buildCauseTitleHtml({
    ...baseCauseTitle,
    bodyHeading: 'AFFIDAVIT UNDER SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023',
  });

  // --- Document 5: List of Documents ---
  const listOfDocumentsSections: DraftSection[] = [
    { heading: 'List of Documents', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...filedByBlock,
  ];
  const listOfDocumentsCauseTitleHtml = buildCauseTitleHtml({ ...baseCauseTitle, bodyHeading: 'LIST OF DOCUMENTS' });

  const addDebtAssetRow = () => setDebtAssetEntries((rows) => [...rows, { particulars: '', amount: '' }]);
  const removeDebtAssetRow = (i: number) => setDebtAssetEntries((rows) => rows.filter((_, idx) => idx !== i));
  const updateDebtAssetRow = (i: number, field: keyof DebtAssetEntry, value: string) =>
    setDebtAssetEntries((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addDocumentRow = () => setDocumentEntries((rows) => [...rows, { particulars: '', pageNo: '' }]);
  const removeDocumentRow = (i: number) => setDocumentEntries((rows) => rows.filter((_, idx) => idx !== i));
  const updateDocumentRow = (i: number, field: keyof DocumentEntry, value: string) =>
    setDocumentEntries((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addDefendant = () => setDefendants((rows) => [...rows, emptyDefendant()]);
  const removeDefendant = (i: number) => setDefendants((rows) => rows.filter((_, idx) => idx !== i));
  const updateDefendant = (i: number, field: keyof DefendantEntry, value: string) =>
    setDefendants((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

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
        onModeChange={(m: UserRole) => {
          setMode(m);
          if (m === 'justice_seeker') setAcknowledgedGate(false);
        }}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">Pecuniary jurisdiction</h3>
            {caseType.jurisdictionRule && (
              <DebtThresholdSelector
                thresholdAmount={caseType.jurisdictionRule.minAmount ?? 0}
                thresholdLabel="₹20 lakh"
                mode="advocate"
              />
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">DRT bench</h3>
            <LocationSelector
              mode="advocate"
              locations={drtBenchLocations}
              value={benchId}
              onSelect={setBenchId}
              label="DRT bench"
              helpText="Cities with more than one DRT list each bench separately — pick the specific one; territorial jurisdiction under Section 19 follows the defendant's residence/business, the branch maintaining the account, or where the cause of action arose."
              verifyNote="Bench count per city verified against a DRT case-management tool — confirm the correct bench at"
              verifyUrl="https://drt.gov.in"
              searchPlaceholder="Type a city…"
            />
            {selectedBench?.benchNumber && (
              <p className="step-help" style={{ marginTop: 'var(--space-3)' }}>
                Cause title will read "BEFORE THE HON'BLE DEBTS RECOVERY TRIBUNAL-{selectedBench.benchNumber}".
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">1. Particulars of Applicant</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Name of Applicant</span>
                <input type="text" value={applicantBankName} onChange={(e) => setApplicantBankName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Registered Office / Head Office address</span>
                <input type="text" value={applicantRegisteredOffice} onChange={(e) => setApplicantRegisteredOffice(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Branch Office address</span>
                <input type="text" value={applicantBranchOffice} onChange={(e) => setApplicantBranchOffice(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address for service of notices (if different)</span>
                <input type="text" value={applicantServiceAddress} onChange={(e) => setApplicantServiceAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">2. Particulars of the Defendants</h3>
            <p className="step-help">
              If every opposite party is an individual, they're all called "Defendants" throughout the OA. If
              any one of them is an institution or company, all opposite parties — including any
              individuals — are called "Respondents" throughout instead, rather than mixing terms.
            </p>
            {defendants.map((d, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-5)' }}>
                <h3 className="step-heading">Defendant No. {i + 1}</h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Name</span>
                    <input type="text" value={d.name} onChange={(e) => updateDefendant(i, 'name', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Is this defendant an individual or an institution/company?</span>
                    <select value={d.type} onChange={(e) => updateDefendant(i, 'type', e.target.value)}>
                      <option value="individual">Individual</option>
                      <option value="institution">Institution/company</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Office/Residence address</span>
                    <input type="text" value={d.address} onChange={(e) => updateDefendant(i, 'address', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Address for service (if different)</span>
                    <input type="text" value={d.serviceAddress} onChange={(e) => updateDefendant(i, 'serviceAddress', e.target.value)} />
                  </label>
                </div>
                {defendants.length > 1 && (
                  <button type="button" className="para-btn" onClick={() => removeDefendant(i)}>
                    Remove Defendant No. {i + 1}
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addDefendant}>
              + Add another defendant
            </button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">3. Jurisdiction of the Tribunal</h3>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <input
                ref={recallNoticeFileInputRef}
                type="file"
                accept="application/pdf"
                className="file-input-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleRecallNoticeFileSelected(file);
                }}
              />
              <button
                type="button"
                className="para-btn"
                onClick={() => recallNoticeFileInputRef.current?.click()}
                disabled={recallNoticeExtractState === 'extracting'}
              >
                {recallNoticeExtractState === 'extracting' ? 'Reading notice…' : 'Fill from Loan Recall Notice (PDF)'}
              </button>
              <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                Only text-based PDFs are supported for now, not scanned copies. This fills in blank fields here and
                on the Facts and Amount due steps — review everything before continuing.
              </p>
              {recallNoticeExtractState === 'done' && (
                <p className="step-help" style={{ color: 'var(--status-safe-text)', margin: 'var(--space-1) 0 0' }}>
                  Filled in from the notice — please check these before continuing.
                </p>
              )}
              {recallNoticeExtractState === 'error' && recallNoticeExtractError && (
                <p className="step-help" style={{ color: 'var(--status-danger-text)', margin: 'var(--space-1) 0 0' }}>
                  {recallNoticeExtractError}
                </p>
              )}
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>Place of execution of the Loan Agreement</span>
                <input type="text" value={loanAgreementPlace} onChange={(e) => setLoanAgreementPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place the Loan Recall Notice was issued from</span>
                <input type="text" value={loanRecallNoticePlace} onChange={(e) => setLoanRecallNoticePlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of the Loan Recall Notice</span>
                <input type="date" value={loanRecallNoticeDate} onChange={(e) => setLoanRecallNoticeDate(e.target.value)} />
              </label>
            </div>

            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              3A. Details of debts and assets
            </h3>
            {debtAssetEntries.map((row, i) => (
              <div className="form-grid" key={i} style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-field">
                  <span>Particulars</span>
                  <input type="text" value={row.particulars} onChange={(e) => updateDebtAssetRow(i, 'particulars', e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Amount</span>
                  <input type="text" value={row.amount} onChange={(e) => updateDebtAssetRow(i, 'amount', e.target.value)} placeholder="₹" />
                </label>
                <button type="button" className="para-btn" onClick={() => removeDebtAssetRow(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addDebtAssetRow}>
              + Add debt/asset
            </button>

            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              4. Limitation
            </h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Loan Agreement No. (1st)</span>
                <input type="text" value={loanAgreementNo1} onChange={(e) => setLoanAgreementNo1(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Loan Agreement date (1st)</span>
                <input type="date" value={loanAgreementDate1} onChange={(e) => setLoanAgreementDate1(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of 1st default</span>
                <input type="date" value={defaultDate1} onChange={(e) => setDefaultDate1(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Loan Agreement No. (2nd, if any)</span>
                <input type="text" value={loanAgreementNo2} onChange={(e) => setLoanAgreementNo2(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Loan Agreement date (2nd, if any)</span>
                <input type="date" value={loanAgreementDate2} onChange={(e) => setLoanAgreementDate2(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of 2nd default (if any)</span>
                <input type="date" value={defaultDate2} onChange={(e) => setDefaultDate2(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">5. Facts of the case</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Name & designation of Authorised Representative</span>
                <input type="text" value={authorisedRepName} onChange={(e) => setAuthorisedRepName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of Board Resolution / Power of Attorney</span>
                <input type="date" value={boardResolutionDate} onChange={(e) => setBoardResolutionDate(e.target.value)} />
              </label>
            </div>
            <textarea
              className="facts-textarea"
              rows={6}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe the loan, its purpose, and how the default came about — separate paragraphs with a blank line"
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">Amount due</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Principal amount</span>
                <input type="text" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Interest rate</span>
                <input type="text" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g. 12% p.a." />
              </label>
              <label className="form-field">
                <span>Interest amount</span>
                <input type="text" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Total amount due</span>
                <input type="text" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Date of calculation</span>
                <input type="date" value={calculationDate} onChange={(e) => setCalculationDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Sanctioned amount</span>
                <input type="text" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Date of sanction</span>
                <input type="date" value={sanctionDate} onChange={(e) => setSanctionDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Security description</span>
                <input type="text" value={securityDescription} onChange={(e) => setSecurityDescription(e.target.value)} />
              </label>
              <label className="form-field">
                <span>NPA classification date</span>
                <input type="date" value={npaDate} onChange={(e) => setNpaDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h3 className="step-heading">6. Relief sought</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Property/asset to be attached and sold</span>
                <input type="text" value={propertyDetails} onChange={(e) => setPropertyDetails(e.target.value)} />
              </label>
            </div>
            <textarea
              className="facts-textarea"
              rows={3}
              value={additionalReliefText}
              onChange={(e) => setAdditionalReliefText(e.target.value)}
              placeholder="Any additional relief item beyond the standard prayer (optional)"
            />
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              7. Interim order
            </h3>
            <textarea
              className="facts-textarea"
              rows={3}
              value={interimReliefText}
              onChange={(e) => setInterimReliefText(e.target.value)}
              placeholder="Any additional interim relief beyond the standard injunction (optional)"
            />
          </div>
        )}

        {step === 8 && (
          <div>
            <h3 className="step-heading">9. Particulars of bank draft/postal order (application fee)</h3>
            <div className="form-grid">
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
            </div>

            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Filed by — Advocate details
            </h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Advocate name</span>
                <input type="text" value={advocateName} onChange={(e) => setAdvocateName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Advocate address</span>
                <input type="text" value={advocateAddress} onChange={(e) => setAdvocateAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Advocate phone</span>
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
                <span>Date of filing</span>
                <input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
              </label>
            </div>

            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Affidavit & verification details
            </h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Authorised Representative's father's name</span>
                <input type="text" value={authorisedRepFatherName} onChange={(e) => setAuthorisedRepFatherName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Authorised Representative's age</span>
                <input type="text" value={authorisedRepAge} onChange={(e) => setAuthorisedRepAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of verification</span>
                <input type="text" value={verificationPlace} onChange={(e) => setVerificationPlace(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 9 && (
          <div>
            <h3 className="step-heading">Documents (Index / List of Documents)</h3>
            <p className="step-help">
              Add each document you're annexing, in the order it will be paginated. These populate both the Index
              Page and the List of Documents — fill in page numbers once the final bundle is printed and paginated.
            </p>
            {documentEntries.map((row, i) => (
              <div className="form-grid" key={i} style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-field">
                  <span>Particulars (e.g. "Annexure A-1 — Board Resolution dated ...")</span>
                  <input type="text" value={row.particulars} onChange={(e) => updateDocumentRow(i, 'particulars', e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Page no.</span>
                  <input type="text" value={row.pageNo} onChange={(e) => updateDocumentRow(i, 'pageNo', e.target.value)} placeholder="e.g. 41-44" />
                </label>
                <button type="button" className="para-btn" onClick={() => removeDocumentRow(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addDocumentRow}>
              + Add document
            </button>
          </div>
        )}

        {step === 10 && (
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

            <p className="step-help" style={{ marginBottom: 'var(--space-4)' }}>
              A filed OA is a bundle of separate documents — each below downloads as its own PDF.
            </p>

            <h4 className="step-heading">Part I — Index Page</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part II — Memo of Parties
            </h4>
            <DraftDocument title={`${caseType.name} — Memo of Parties`} causeTitleHtml={memoCauseTitleHtml} sections={memoSections} />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part III — Contents of OA
            </h4>
            <DraftDocument
              title={selectedBench ? `Before the ${selectedBench.label}` : caseType.name}
              causeTitleHtml={applicationCauseTitleHtml}
              sections={applicationSections}
            />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part IV — Supporting Affidavit
            </h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part V — List of Documents
            </h4>
            <DraftDocument
              title={`${caseType.name} — List of Documents`}
              causeTitleHtml={listOfDocumentsCauseTitleHtml}
              sections={listOfDocumentsSections}
            />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part VI — Certificate under Section 2A, Bankers' Books Evidence Act, 1891
            </h4>
            <DraftDocument
              title={`${caseType.name} — Bankers' Books Evidence Certificate`}
              causeTitleHtml={bankersBooksCertificateCauseTitleHtml}
              sections={bankersBooksCertificateSections}
            />

            <h4 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Part VII — Affidavit under Section 63, Bharatiya Sakshya Adhiniyam, 2023
            </h4>
            <DraftDocument
              title={`${caseType.name} — Electronic Evidence Affidavit`}
              causeTitleHtml={bsaAffidavitCauseTitleHtml}
              sections={bsaAffidavitSections}
            />

            <FilingGuidance forum="drt" contextLabel={selectedBench?.label} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
