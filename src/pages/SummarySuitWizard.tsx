import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { EligibilityGates } from '../components/EligibilityGates';
import { ActReferencePanel } from '../components/ActReferencePanel';
import { findRelevantActSections, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildCauseTitleHtml, buildFiledByBlock, buildDocumentListParagraphs, withPeriod } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, moneyRecoveryCauseOptions } from '../data/mockData';
import {
  districtCourtStates,
  districtCourtDistrictsByState,
  districtCourtPecuniaryLimits,
  DISTRICT_COURT_FORUM_ID,
  SUMMARY_SUIT_CASE_TYPE_ID,
} from '../data/districtCourtLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';
import '../components/DeadlineCalculator.css';

const STEPS = [
  'Eligibility',
  'State',
  'District court',
  'Pecuniary jurisdiction',
  'Parties & claim',
  'Valuation & relief',
  'Filing details',
  'Documents',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-dc-summary-suit')!;
const ssClauses = clauses.filter((c) => c.caseTypeId === 'ct-dc-summary-suit');
const clauseByCode = (code: string) => ssClauses.find((c) => c.code === code)!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface Props {
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function SummarySuitWizard({ onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [gatesCleared, setGatesCleared] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [step, setStep] = useState(0);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [defendantAddress, setDefendantAddress] = useState('');
  const [causeType, setCauseType] = useState<string | null>(null);
  const [factsNarrative, setFactsNarrative] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [plaintiffAge, setPlaintiffAge] = useState('');
  const [plaintiffAddress, setPlaintiffAddress] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [advocateAddress, setAdvocateAddress] = useState('');
  const [advocatePhone, setAdvocatePhone] = useState('');
  const [advocateEmail, setAdvocateEmail] = useState('');
  const [filingPlace, setFilingPlace] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [verificationPlace, setVerificationPlace] = useState('');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>([]);
  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));
  const [caseId, setCaseId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const selectedState = districtCourtStates.find((s) => s.id === stateId);
  const districts = stateId ? districtCourtDistrictsByState[stateId] ?? [] : [];
  const selectedDistrict = districts.find((d) => d.id === districtId);
  const pecuniaryLimit = stateId ? districtCourtPecuniaryLimits[stateId] : undefined;

  // Re-invocable: the first click creates the case + draft; every click after that updates the
  // same draft with the latest field values, so edits made after an earlier save aren't lost.
  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = { stateId, districtId, plaintiffName, defendantName, defendantAddress, causeType, factsNarrative, claimAmount };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            forumId: DISTRICT_COURT_FORUM_ID,
            caseTypeId: SUMMARY_SUIT_CASE_TYPE_ID,
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Summary Suit`,
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

  const citationMatches = findRelevantActSections({ causeType, stateLabel: selectedState?.label });

  const draftSections: DraftSection[] = [
    {
      heading: 'Jurisdiction and summary procedure',
      paragraphs: [clauseByCode('SS-01').bodyTemplate],
    },
    {
      heading: 'Nature of the written contract or instrument',
      paragraphs: [fillTemplate(clauseByCode('SS-02').bodyTemplate, { facts_narrative: factsNarrative })],
      incomplete: !factsNarrative,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    {
      heading: 'Valuation',
      paragraphs: [fillTemplate(clauseByCode('SS-03').bodyTemplate, { claim_amount: claimAmount })],
      incomplete: !claimAmount,
    },
    {
      heading: 'Prayer',
      paragraphs: [fillTemplate(clauseByCode('SS-04').bodyTemplate, { claim_amount: claimAmount })],
      incomplete: !claimAmount,
    },
    {
      heading: 'Verification',
      unnumbered: true,
      paragraphs: [fillTemplate(clauseByCode('SS-05').bodyTemplate, { plaintiff_name: plaintiffName })],
      incomplete: !plaintiffName,
    },
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: plaintiffName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
  });

  // --- Part I: Index, and Part III: Affidavit — bundled with every Summary Suit. ---
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
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
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
        `2. That the accompanying ${caseType.name} has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.`,
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
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
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
        governingLaw={caseType.governingLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={(i) => {
          if (i > 0 && !gatesCleared) return;
          setStep(i);
        }}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Statutory eligibility' : 'Before we start — one quick check'}
            </h3>
            <p className="step-help">
              Order XXXVII's faster procedure only applies to a narrow class of claims — this check decides
              whether it's the right form.
            </p>
            <EligibilityGates
              gates={caseType.eligibilityGates ?? []}
              onAllClear={() => {
                setGatesCleared(true);
                setStep(1);
              }}
              onBlocked={setBlocked}
            />
          </div>
        )}

        {step === 1 && (
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

        {step === 2 && (
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Pecuniary jurisdiction</h3>
            {pecuniaryLimit ? (
              <div className="deadline-card status-warn" style={{ maxWidth: 480 }}>
                <p className="deadline-label">Unverified placeholder figure</p>
                <p className="deadline-body">
                  {selectedState?.label}: minimum claim value shown as ₹{pecuniaryLimit.minAmount?.toLocaleString('en-IN')}.{' '}
                  {pecuniaryLimit.note}
                </p>
              </div>
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Parties and instrument' : 'Who is this against, and why?'}</h3>
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
            <ActReferencePanel causeType={causeType} stateLabel={selectedState?.label} />
            <textarea
              className="facts-textarea"
              rows={5}
              style={{ marginTop: 'var(--space-4)' }}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe the written contract, cheque, or promissory note, and the amount due"
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

        {step === 5 && (
          <div>
            <h3 className="step-heading">Valuation and relief</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Amount claimed</span>
                <input type="text" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} placeholder="₹" />
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
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

        {step === 7 && (
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

        {step === 8 && (
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
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {caseType.name}</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Summary Suit (Order XXXVII) — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="districtCourt" contextLabel={selectedDistrict?.label} />
          </div>
        )}
      </WizardShell>

      {blocked && step === 0 && (
        <p className="back-link" style={{ marginTop: 0 }}>
          This isn't the right form for this claim — see the guidance above. Use the general Money Recovery
          Suit instead.
        </p>
      )}
    </div>
  );
}
