import { useState } from 'react';
import { useLanguage } from '../lib/language';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { ActReferencePanel } from '../components/ActReferencePanel';
import { findRelevantActSections, findCommercialCourtsActCitations, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import { buildCauseTitleHtml, buildFiledByBlock, buildDocumentListParagraphs, toThatClause } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, moneyRecoveryCauseOptions } from '../data/mockData';
import {
  districtCourtStates,
  districtCourtDistrictsByState,
  districtCourtPecuniaryLimits,
  DISTRICT_COURT_FORUM_ID,
  MONEY_RECOVERY_CASE_TYPE_ID,
} from '../data/districtCourtLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';
import '../components/DeadlineCalculator.css';

const caseType = caseTypes.find((ct) => ct.id === 'ct-dc-money-recovery')!;
const mrsClauses = clauses.filter((c) => c.caseTypeId === 'ct-dc-money-recovery');
const clauseByCode = (code: string) => mrsClauses.find((c) => c.code === code)!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  plaintiffName: string;
  defendantName: string;
  defendantAddress: string;
  causeType: string | null;
  factsNarrative: string;
  claimAmount: string;
  isCommercialDispute: 'yes' | 'no' | null;
  mediationStatus: 'urgent_relief' | 'completed' | 'not_yet' | null;
  plaintiffAge: string;
  plaintiffAddress: string;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  filingDate: string;
  verificationPlace: string;
  documentEntries: DocEntry[];
}

// Commercial Courts Act, 2015 branch — only offered for states where an actual Commercial Court
// constitution notification has been sourced (not just the statutory ₹3,00,000 floor, which alone
// isn't enough to say where/how a qualifying suit gets filed). Deliberately excludes Himachal
// Pradesh: its High Court has ordinary original civil jurisdiction like Delhi's, but unlike Delhi
// no sourced notification could be found splitting District-Commercial-Court-level disputes from
// ones that go straight to the High Court's own Commercial Division — offering the branch there
// without that split would be a guess dressed up as sourced fact. Same reason for also excluding
// Karnataka, Tamil Nadu, Gujarat, and Madhya Pradesh — a general framework was confirmed (state
// government may notify Commercial Courts under section 3B) but no state-specific constitution
// notification could be located this pass; worth a dedicated follow-up search rather than a guess.
const COMMERCIAL_COURT_NOTES: Record<string, string> = {
  punjab:
    "Punjab's Commercial Courts are constituted district by district, and thresholds vary — Ludhiana's notification (S.O.58/C.A.4/2016/Ss.3/&3A/2019, dated 14 June 2019) sets its Commercial Court at above ₹50,00,000, well above the statutory ₹3,00,000 floor. Confirm the notified threshold for the specific district before assuming this qualifies.",
  haryana:
    "Haryana designated a single, statewide Special Commercial Court at Gurugram (Notification No. S.O.70/C.A.4/2016/S.3/2017, dated 27 October 2017), at the statutory ₹3,00,000 floor — so a qualifying Haryana commercial suit is filed at Gurugram, not necessarily the local district court. Confirm this is still the operative arrangement before filing.",
  rajasthan:
    "Rajasthan's Commercial Courts are organised by division rather than one per district: Jaipur (notified 13 October 2017), with Bikaner, Alwar, and Bhilwara added later (2021), each covering a cluster of surrounding districts, at the statutory ₹3,00,000 floor. Confirm which Commercial Court's territorial cluster covers the district before filing.",
  up:
    'Uttar Pradesh has constituted Commercial Courts in 13 districts, each also covering neighbouring districts, at the statutory ₹3,00,000 floor — the specific district-to-court mapping isn\'t sourced here yet. Confirm which of the 13 covers the filing district before proceeding.',
  delhi:
    'In Delhi, a commercial dispute valued between ₹3,00,000 and ₹2,00,00,000 goes to a District-level Commercial Court; above ₹2,00,00,000 it goes to the Delhi High Court\'s own Commercial Division instead, not a District Court. Confirm which applies given the claim amount before filing.',
  jk:
    "Jammu & Kashmir's exclusion from this Act was removed with effect from 31 October 2019 (Act 34 of 2019) — it now applies here too. The Additional District Judge (Bank Cases) courts at Jammu and Srinagar are the designated Commercial Courts for those two districts; the principal district court is the designated Commercial Court in the remaining 18 districts — all at the statutory ₹3,00,000 floor.",
  maharashtra:
    "Maharashtra's Commercial Courts are concentrated in Mumbai: 16 Dedicated Commercial Courts (11 at the Bombay City Civil and Sessions Court, 5 at the City Civil and Sessions Court, Dindoshi), notified 13 September 2019, at the statutory ₹3,00,000 floor. The district-by-district notification for Commercial Courts outside Mumbai wasn't sourced this pass — confirm the designated court for a filing district outside Mumbai before assuming this qualifies.",
  'west-bengal':
    "West Bengal has designated Commercial Courts at Alipore (South 24 Parganas), Rajarhat (North 24 Parganas), Asansol (Paschim Bardhaman), and Siliguri, at the statutory ₹3,00,000 floor — qualifying disputes within Kolkata's own original civil jurisdiction instead go to the Calcutta High Court's Commercial Division, not a District Commercial Court. The specific notification number/date for the four district-level courts wasn't sourced this pass — confirm before filing.",
};

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  onOpenLawLibrary?: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function MoneyRecoverySuitWizard({
  onBack,
  onOpenPricing,
  onOpenLawLibrary,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const mrw = t.moneyRecoverySuitWizard;
  const STEPS = mrw.steps;
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [districtId, setDistrictId] = useState(saved?.districtId ?? '');
  const [plaintiffName, setPlaintiffName] = useState(saved?.plaintiffName ?? '');
  const [defendantName, setDefendantName] = useState(saved?.defendantName ?? '');
  const [defendantAddress, setDefendantAddress] = useState(saved?.defendantAddress ?? '');
  const [causeType, setCauseType] = useState<string | null>(saved?.causeType ?? null);
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [claimAmount, setClaimAmount] = useState(saved?.claimAmount ?? '');
  const [isCommercialDispute, setIsCommercialDispute] = useState<'yes' | 'no' | null>(saved?.isCommercialDispute ?? null);
  const [mediationStatus, setMediationStatus] = useState<'urgent_relief' | 'completed' | 'not_yet' | null>(
    saved?.mediationStatus ?? null
  );
  const [plaintiffAge, setPlaintiffAge] = useState(saved?.plaintiffAge ?? '');
  const [plaintiffAddress, setPlaintiffAddress] = useState(saved?.plaintiffAddress ?? '');
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [advocateAddress, setAdvocateAddress] = useState(saved?.advocateAddress ?? '');
  const [advocatePhone, setAdvocatePhone] = useState(saved?.advocatePhone ?? '');
  const [advocateEmail, setAdvocateEmail] = useState(saved?.advocateEmail ?? '');
  const [filingPlace, setFilingPlace] = useState(saved?.filingPlace ?? '');
  const [filingDate, setFilingDate] = useState(saved?.filingDate ?? '');
  const [verificationPlace, setVerificationPlace] = useState(saved?.verificationPlace ?? '');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>(saved?.documentEntries ?? []);
  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);
  const [judgeStyleProfile, setJudgeStyleProfile] = useState<JudgeStyleProfile | null>(null);

  const selectedState = districtCourtStates.find((s) => s.id === stateId);
  const districts = stateId ? districtCourtDistrictsByState[stateId] ?? [] : [];
  const selectedDistrict = districts.find((d) => d.id === districtId);
  const pecuniaryLimit = stateId ? districtCourtPecuniaryLimits[stateId] : undefined;

  // Gated to states with a sourced entry in COMMERCIAL_COURT_NOTES above — extending this to a
  // state without a verified Commercial Court notification would risk a wrong-but-plausible
  // court/procedure on a real filing, which is worse than not offering it.
  const showCommercialDisputeQuestion = stateId in COMMERCIAL_COURT_NOTES;
  const claimAmountNumeric = Number(claimAmount.replace(/[^0-9.]/g, ''));
  const meetsSpecifiedValueFloor = claimAmount.trim() !== '' && !Number.isNaN(claimAmountNumeric) && claimAmountNumeric >= 300000;
  const qualifiesForCommercialCourt = showCommercialDisputeQuestion && isCommercialDispute === 'yes' && meetsSpecifiedValueFloor;
  const effectiveApplicationTitle = qualifiesForCommercialCourt ? 'Commercial Suit' : caseType.name;
  const effectiveGoverningLaw = qualifiesForCommercialCourt
    ? 'Code of Civil Procedure, 1908 read with the Commercial Courts Act, 2015'
    : caseType.governingLaw;
  const effectiveForumType = qualifiesForCommercialCourt ? 'commercial_court' : caseType.forumType;

  // Re-invocable: the first click creates the case + draft; every click after that updates the
  // same draft with the latest field values, so edits made after an earlier save (e.g. filling in
  // valuation, or revising the facts narrative from Preview) aren't silently lost.
  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      districtId,
      plaintiffName,
      defendantName,
      defendantAddress,
      causeType,
      factsNarrative,
      claimAmount,
      isCommercialDispute,
      mediationStatus,
      plaintiffAge,
      plaintiffAddress,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-dc-money-recovery',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            forumId: DISTRICT_COURT_FORUM_ID,
            caseTypeId: MONEY_RECOVERY_CASE_TYPE_ID,
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Money Recovery Suit`,
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

  const citationMatches = [
    ...findRelevantActSections({ causeType, stateLabel: selectedState?.label }),
    ...findCommercialCourtsActCitations(qualifiesForCommercialCourt),
  ];

  const jurisdictionParagraph = qualifiesForCommercialCourt
    ? `This Hon'ble Commercial Court has jurisdiction to try this suit under Section 6 of the Commercial Courts Act, 2015, the dispute being a "commercial dispute" of Specified Value under Sections 2(1)(c) and 12 of that Act, and the cause of action having arisen within the territorial limits of this Court.`
    : clauseByCode('MRS-01').bodyTemplate;

  const draftSections: DraftSection[] = [
    {
      heading: 'Jurisdiction',
      paragraphs: [toThatClause(jurisdictionParagraph)],
    },
    {
      heading: 'Cause of action',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('MRS-02').bodyTemplate, { facts_narrative: factsNarrative }))],
      incomplete: !factsNarrative,
      role: 'facts' as const,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Valuation',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('MRS-03').bodyTemplate, { claim_amount: claimAmount }))],
      incomplete: !claimAmount,
    },
    ...(qualifiesForCommercialCourt
      ? [
          {
            heading: 'Pre-institution mediation',
            paragraphs: [
              toThatClause(
                mediationStatus === 'urgent_relief'
                  ? "This suit contemplates urgent interim relief; pre-institution mediation under Section 12A of the Commercial Courts Act, 2015 is therefore not required before institution."
                  : mediationStatus === 'completed'
                    ? 'The Plaintiff has exhausted the remedy of pre-institution mediation under Section 12A of the Commercial Courts Act, 2015, and annexes the certificate of non-settlement herewith.'
                    : 'Pre-institution mediation under Section 12A of the Commercial Courts Act, 2015 has not yet been completed — this suit cannot be validly instituted until it is, unless urgent interim relief is genuinely being sought.'
              ),
            ],
            incomplete: mediationStatus === null || mediationStatus === 'not_yet',
          },
        ]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [fillTemplate(clauseByCode('MRS-04').bodyTemplate, { claim_amount: claimAmount })],
      incomplete: !claimAmount,
    },
    {
      heading: 'Verification',
      unnumbered: true,
      paragraphs: [fillTemplate(clauseByCode('MRS-05').bodyTemplate, { plaintiff_name: plaintiffName })],
      incomplete: !plaintiffName,
    },
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: effectiveForumType,
    applicationTitle: effectiveApplicationTitle,
    governingLaw: effectiveGoverningLaw,
    applicantName: plaintiffName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
  });

  // --- Part I: Index, and Part III: Affidavit — bundled with every Money Recovery Suit. ---
  const filedByBlock = buildFiledByBlock({
    applicantLines: [plaintiffName || '[Plaintiff]', '(PLAINTIFF)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });
  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...filedByBlock,
  ];
  const indexCauseTitleHtml = buildCauseTitleHtml({
    forumType: effectiveForumType,
    applicationTitle: effectiveApplicationTitle,
    applicantName: plaintiffName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${plaintiffName || '[Plaintiff]'} aged about ${plaintiffAge || '[age]'}, R/o ${
          plaintiffAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Plaintiff in the present case, and I am well conversant with the facts and circumstances of the case.',
        `2. That the accompanying ${effectiveApplicationTitle} has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.`,
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
  const affidavitCauseTitleHtml = buildCauseTitleHtml({
    forumType: effectiveForumType,
    applicationTitle: effectiveApplicationTitle,
    applicantName: plaintiffName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
    bodyHeading: 'AFFIDAVIT',
  });

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        {t.common.backToAllFilings}
      </button>
      <WizardShell
        title={caseType.name}
        governingLaw={effectiveGoverningLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">{mrw.step0.heading}</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label={mrw.step0.label}
              helpText={mrw.step0.helpText}
              verifyNote={mrw.step0.verifyNote}
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder={mrw.step0.searchPlaceholder}
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mrw.step1.heading}</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label={mrw.step1.label}
                helpText={mrw.step1.helpText(selectedState.label)}
                verifyNote={mrw.step1.verifyNote}
                verifyUrl="https://ecourts.gov.in"
                searchPlaceholder={mrw.step1.searchPlaceholder}
              />
            ) : (
              <p className="step-help">{mrw.step1.goBackPickState}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mrw.step2.heading}</h3>
            {pecuniaryLimit ? (
              <div className="deadline-card status-warn" style={{ maxWidth: 480 }}>
                <p className="deadline-label">{mrw.step2.sourcedLabel}</p>
                <p className="deadline-body">
                  {pecuniaryLimit.minAmount != null
                    ? mrw.step2.minAmountPrefix(selectedState?.label ?? '', pecuniaryLimit.minAmount.toLocaleString('en-IN'))
                    : mrw.step2.statePrefix(selectedState?.label ?? '')}
                  {pecuniaryLimit.note}
                </p>
              </div>
            ) : (
              <p className="step-help">{mrw.step2.goBackPickState}</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? mrw.step3.headingAdvocate : mrw.step3.headingJusticeSeeker}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? mrw.step3.plaintiffLabel : mrw.step3.yourNameLabel}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{mrw.step3.plaintiffNote}</span>
                  )}
                </span>
                <input type="text" value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step3.defendantLabel}</span>
                <input type="text" value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step3.defendantAddressLabel}</span>
                <input type="text" value={defendantAddress} onChange={(e) => setDefendantAddress(e.target.value)} />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              {mrw.step3.debtKindHeading}
            </h3>
            <div className="grounds-grid">
              {moneyRecoveryCauseOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={causeType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setCauseType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <ActReferencePanel causeType={causeType} stateLabel={selectedState?.label} onOpenLawLibrary={onOpenLawLibrary} />
            {showCommercialDisputeQuestion && (
              <>
                <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
                  {mrw.step3.commercialQuestionHeading}
                </h3>
                <p className="step-help">{mrw.step3.commercialHelpText(selectedState?.label ?? '')}</p>
                <div className="grounds-grid">
                  <button
                    className={isCommercialDispute === 'yes' ? 'ground-card active' : 'ground-card'}
                    onClick={() => setIsCommercialDispute('yes')}
                  >
                    {mrw.step3.commercialYes}
                  </button>
                  <button
                    className={isCommercialDispute === 'no' ? 'ground-card active' : 'ground-card'}
                    onClick={() => setIsCommercialDispute('no')}
                  >
                    {mrw.step3.commercialNo}
                  </button>
                </div>
              </>
            )}
            <textarea
              className="facts-textarea"
              rows={5}
              style={{ marginTop: 'var(--space-4)' }}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder={mrw.step3.factsPlaceholder}
            />
            {user ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? t.wizardShared.savingEllipsis : caseId ? t.wizardShared.updateSavedDraft : mrw.step3.saveThisCase}
                </button>
                {saveState === 'saved' && <p className="step-help">{t.wizardShared.savedToMyCases}</p>}
                {saveState === 'error' && <p className="step-help">{t.wizardShared.saveError}</p>}
                {paywall && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <PaywallBlock
                      onChoosePlan={onOpenPricing}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
                {mrw.step3.loginToSaveCase}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">{mrw.step4.heading}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mrw.step4.amountClaimedLabel}</span>
                <input type="text" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} placeholder="₹" />
              </label>
            </div>

            {showCommercialDisputeQuestion && isCommercialDispute === 'yes' && (
              meetsSpecifiedValueFloor ? (
                <>
                  <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-4)' }}>
                    <p className="deadline-label">{mrw.step4.commercialSuitWarningLabel}</p>
                    <p className="deadline-body">{mrw.step4.commercialSuitWarningBody(COMMERCIAL_COURT_NOTES[stateId])}</p>
                  </div>
                  <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
                    {mrw.step4.mediationHeading}
                  </h3>
                  <p className="step-help">{mrw.step4.mediationHelpText}</p>
                  <div className="grounds-grid">
                    <button
                      className={mediationStatus === 'urgent_relief' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('urgent_relief')}
                    >
                      {mrw.step4.mediationUrgent}
                    </button>
                    <button
                      className={mediationStatus === 'completed' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('completed')}
                    >
                      {mrw.step4.mediationCompleted}
                    </button>
                    <button
                      className={mediationStatus === 'not_yet' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('not_yet')}
                    >
                      {mrw.step4.mediationNotYet}
                    </button>
                  </div>
                  {mediationStatus === 'not_yet' && (
                    <p className="step-help" style={{ color: 'var(--status-warn-text, #b45309)' }}>
                      {mrw.step4.mediationNotYetWarning}
                    </p>
                  )}
                </>
              ) : (
                <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
                  {mrw.step4.belowFloorNote}
                </p>
              )
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">{mrw.step5.heading}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mrw.step5.yourAge}</span>
                <input type="text" value={plaintiffAge} onChange={(e) => setPlaintiffAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.yourAddress}</span>
                <input type="text" value={plaintiffAddress} onChange={(e) => setPlaintiffAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.advocateName}</span>
                <input type="text" value={advocateName} onChange={(e) => setAdvocateName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.advocateAddress}</span>
                <input type="text" value={advocateAddress} onChange={(e) => setAdvocateAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.advocatePhone}</span>
                <input type="text" value={advocatePhone} onChange={(e) => setAdvocatePhone(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.advocateEmail}</span>
                <input type="text" value={advocateEmail} onChange={(e) => setAdvocateEmail(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.placeOfFiling}</span>
                <input type="text" value={filingPlace} onChange={(e) => setFilingPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.dateOfFiling}</span>
                <input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mrw.step5.placeOfVerification}</span>
                <input type="text" value={verificationPlace} onChange={(e) => setVerificationPlace(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">{mrw.step6.heading}</h3>
            <p className="step-help">{mrw.step6.helpText}</p>
            {documentEntries.map((d, i) => (
              <div key={i} className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-field">
                  <span>{mrw.step6.particulars}</span>
                  <input
                    type="text"
                    value={d.particulars}
                    onChange={(e) => updateDocumentEntry(i, { particulars: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>{mrw.step6.pageNo}</span>
                  <input type="text" value={d.pageNo} onChange={(e) => updateDocumentEntry(i, { pageNo: e.target.value })} />
                </label>
                <button className="para-btn" onClick={() => removeDocumentEntry(i)}>
                  {mrw.step6.remove}
                </button>
              </div>
            ))}
            <button className="para-btn" onClick={addDocumentEntry}>
              {mrw.step6.addDocument}
            </button>
          </div>
        )}

        {step === 7 && (
          <JudgeStyleStep
            profile={judgeStyleProfile}
            onProfileReady={setJudgeStyleProfile}
            onOpenPricing={onOpenPricing}
          />
        )}

        {step === 8 && (
          <div>
            <h3 className="step-heading">{mrw.step8.heading}</h3>
            {user ? (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? t.wizardShared.savingEllipsis : caseId ? t.wizardShared.updateSavedDraft : mrw.step8.saveDraft}
                </button>
                {saveState === 'saved' && <p className="step-help">{t.wizardShared.savedToMyCases}</p>}
                {saveState === 'error' && <p className="step-help">{t.wizardShared.saveError}</p>}
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
                {mrw.step8.loginToSaveDraft}
              </p>
            )}
            <p className="step-help">{mrw.step8.bundleNote}</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>{mrw.step8.partIIndex}</h4>
            <DraftDocument
              title={`${effectiveApplicationTitle} — Index`}
              causeTitleHtml={indexCauseTitleHtml}
              sections={indexSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>{mrw.step8.partII(effectiveApplicationTitle)}</h4>
            <DraftDocument
              title={
                selectedDistrict
                  ? `Before the ${qualifiesForCommercialCourt ? 'Commercial Court' : 'District Court'}, ${selectedDistrict.label}`
                  : caseType.name
              }
              subtitle={`${effectiveApplicationTitle} — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>{mrw.step8.partIIIAffidavit}</h4>
            <DraftDocument
              title={`${effectiveApplicationTitle} — Affidavit`}
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance
              forum={qualifiesForCommercialCourt ? 'commercialCourt' : 'districtCourt'}
              contextLabel={selectedDistrict?.label}
            />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
