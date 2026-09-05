import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { ActReferencePanel } from '../components/ActReferencePanel';
import { findRelevantActSections, findCommercialCourtsActCitations, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildCauseTitleHtml, buildFiledByBlock, buildDocumentListParagraphs, withPeriod, toThatClause } from '../lib/legalDocumentFormat';
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

const STEPS = [
  'State',
  'District court',
  'Pecuniary jurisdiction',
  'Parties & claim',
  'Valuation & relief',
  'Filing details',
  'Documents',
  'Preview',
];

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
// without that split would be a guess dressed up as sourced fact.
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
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
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
        `${withPeriod(plaintiffName || '[Plaintiff]')} aged about ${plaintiffAge || '[age]'}, R/o ${
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
        ← Back to all filings
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
            <h3 className="step-heading">Which state is the suit in?</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label="State"
              helpText="Pecuniary jurisdiction and the district list depend on the state you pick."
              verifyNote="State list is stable and complete. District-level detail for the chosen state is shown next —"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which district court?</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label="District"
                helpText={`Districts of ${selectedState.label}. Territorial jurisdiction follows where the defendant resides/carries on business, or where the cause of action arose.`}
                verifyNote="District list sourced from current public records — district boundaries are occasionally revised by state notification; confirm the correct court at"
                verifyUrl="https://ecourts.gov.in"
                searchPlaceholder="Type a district…"
              />
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Pecuniary jurisdiction</h3>
            {pecuniaryLimit ? (
              <div className="deadline-card status-warn" style={{ maxWidth: 480 }}>
                <p className="deadline-label">Sourced from statute — confirm before filing</p>
                <p className="deadline-body">
                  {pecuniaryLimit.minAmount != null
                    ? `${selectedState?.label}: District Court money recovery suits generally start above ₹${pecuniaryLimit.minAmount.toLocaleString('en-IN')}. `
                    : `${selectedState?.label}: `}
                  {pecuniaryLimit.note}
                </p>
              </div>
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Parties and cause of action' : 'Who is this against, and why?'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Plaintiff' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Plaintiff in this case)</span>
                  )}
                </span>
                <input type="text" value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Defendant</span>
                <input type="text" value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Defendant address</span>
                <input type="text" value={defendantAddress} onChange={(e) => setDefendantAddress(e.target.value)} />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              What kind of debt is this?
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
                  Does this debt arise from a commercial or trade relationship?
                </h3>
                <p className="step-help">
                  E.g. a loan from a bank/NBFC/financier, or an unpaid trade invoice between businesses — rather than a
                  personal transaction between individuals. {selectedState?.label} suits above ₹3,00,000 arising from a
                  commercial relationship are increasingly filed as Commercial Suits under the Commercial Courts Act,
                  2015, not as ordinary civil suits.
                </p>
                <div className="grounds-grid">
                  <button
                    className={isCommercialDispute === 'yes' ? 'ground-card active' : 'ground-card'}
                    onClick={() => setIsCommercialDispute('yes')}
                  >
                    Yes — commercial/trade relationship
                  </button>
                  <button
                    className={isCommercialDispute === 'no' ? 'ground-card active' : 'ground-card'}
                    onClick={() => setIsCommercialDispute('no')}
                  >
                    No — personal transaction
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
              placeholder="Describe what happened — when the debt arose, what was agreed, and why it's unpaid"
            />
            {user ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving…' : caseId ? 'Update saved draft' : 'Save this case'}
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
              <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
                Log in to save this case and update its status later — drafting still works without an account.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Valuation and relief</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Amount claimed</span>
                <input type="text" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} placeholder="₹" />
              </label>
            </div>

            {showCommercialDisputeQuestion && isCommercialDispute === 'yes' && (
              meetsSpecifiedValueFloor ? (
                <>
                  <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-4)' }}>
                    <p className="deadline-label">This may need to be filed as a Commercial Suit</p>
                    <p className="deadline-body">
                      At ₹3,00,000 or more and arising from a commercial relationship, this meets the Commercial Courts
                      Act, 2015's statutory floor for a "commercial dispute." {COMMERCIAL_COURT_NOTES[stateId]}
                    </p>
                  </div>
                  <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
                    Pre-institution mediation (Section 12A)
                  </h3>
                  <p className="step-help">
                    A Commercial Suit not seeking urgent interim relief cannot be filed until pre-institution mediation
                    under Section 12A of the Commercial Courts Act, 2015 has been attempted.
                  </p>
                  <div className="grounds-grid">
                    <button
                      className={mediationStatus === 'urgent_relief' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('urgent_relief')}
                    >
                      Urgent interim relief sought — mediation not required
                    </button>
                    <button
                      className={mediationStatus === 'completed' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('completed')}
                    >
                      Mediation completed / certificate obtained
                    </button>
                    <button
                      className={mediationStatus === 'not_yet' ? 'ground-card active' : 'ground-card'}
                      onClick={() => setMediationStatus('not_yet')}
                    >
                      Not yet completed
                    </button>
                  </div>
                  {mediationStatus === 'not_yet' && (
                    <p className="step-help" style={{ color: 'var(--status-warn-text, #b45309)' }}>
                      This suit cannot be validly instituted yet — complete pre-institution mediation first, unless
                      urgent interim relief is genuinely being sought.
                    </p>
                  )}
                </>
              ) : (
                <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
                  Below ₹3,00,000, this doesn't meet the Commercial Courts Act's Specified Value floor — proceeding as
                  an ordinary civil suit.
                </p>
              )
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Your age</span>
                <input type="text" value={plaintiffAge} onChange={(e) => setPlaintiffAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Your address</span>
                <input type="text" value={plaintiffAddress} onChange={(e) => setPlaintiffAddress(e.target.value)} />
              </label>
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
              <label className="form-field">
                <span>Place of verification</span>
                <input type="text" value={verificationPlace} onChange={(e) => setVerificationPlace(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">Add each document you're annexing, in the order it will be paginated.</p>
            {documentEntries.map((d, i) => (
              <div key={i} className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-field">
                  <span>Particulars</span>
                  <input
                    type="text"
                    value={d.particulars}
                    onChange={(e) => updateDocumentEntry(i, { particulars: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Page No.</span>
                  <input type="text" value={d.pageNo} onChange={(e) => updateDocumentEntry(i, { pageNo: e.target.value })} />
                </label>
                <button className="para-btn" onClick={() => removeDocumentEntry(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button className="para-btn" onClick={addDocumentEntry}>
              + Add document
            </button>
          </div>
        )}

        {step === 7 && (
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
            <p className="step-help">A filed suit is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument
              title={`${effectiveApplicationTitle} — Index`}
              causeTitleHtml={indexCauseTitleHtml}
              sections={indexSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {effectiveApplicationTitle}</h4>
            <DraftDocument
              title={
                selectedDistrict
                  ? `Before the ${qualifiesForCommercialCourt ? 'Commercial Court' : 'District Court'}, ${selectedDistrict.label}`
                  : caseType.name
              }
              subtitle={`${effectiveApplicationTitle} — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
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
