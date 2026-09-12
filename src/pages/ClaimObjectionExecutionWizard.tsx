import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { caseTypes } from '../data/mockData';
import { districtCourtStates, districtCourtDistrictsByState } from '../data/districtCourtLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-claim-objection-execution')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  executionCaseNumber: string;
  decreeHolderName: string;
  decreeHolderAddress: string;
  judgmentDebtorName: string;
  judgmentDebtorAddress: string;
  claimantName: string;
  claimantAge: string;
  claimantAddress: string;
  propertyDescription: string;
  basisOfClaim: string;
  factsNarrative: string;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  filingDate: string;
  verificationPlace: string;
  documentEntries: DocEntry[];
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'State',
  'District court',
  'The execution case',
  'Parties',
  'The property & your claim',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function ClaimObjectionExecutionWizard({
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
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [districtId, setDistrictId] = useState(saved?.districtId ?? '');
  const [executionCaseNumber, setExecutionCaseNumber] = useState(saved?.executionCaseNumber ?? '');
  const [decreeHolderName, setDecreeHolderName] = useState(saved?.decreeHolderName ?? '');
  const [decreeHolderAddress, setDecreeHolderAddress] = useState(saved?.decreeHolderAddress ?? '');
  const [judgmentDebtorName, setJudgmentDebtorName] = useState(saved?.judgmentDebtorName ?? '');
  const [judgmentDebtorAddress, setJudgmentDebtorAddress] = useState(saved?.judgmentDebtorAddress ?? '');
  const [claimantName, setClaimantName] = useState(saved?.claimantName ?? '');
  const [claimantAge, setClaimantAge] = useState(saved?.claimantAge ?? '');
  const [claimantAddress, setClaimantAddress] = useState(saved?.claimantAddress ?? '');
  const [propertyDescription, setPropertyDescription] = useState(saved?.propertyDescription ?? '');
  const [basisOfClaim, setBasisOfClaim] = useState(saved?.basisOfClaim ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
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

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      districtId,
      executionCaseNumber,
      decreeHolderName,
      decreeHolderAddress,
      judgmentDebtorName,
      judgmentDebtorAddress,
      claimantName,
      claimantAge,
      claimantAddress,
      propertyDescription,
      basisOfClaim,
      factsNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-claim-objection-execution',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${claimantName || 'Claimant'} — Claim/Objection Petition in Execution`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-claim-objection-execution');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [claimantName || '[Claimant]', '(CLAIMANT/OBJECTOR)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'The execution proceeding and the attachment',
      paragraphs: [
        toThatClause(
          `in ${
            executionCaseNumber ? `Execution Petition No. ${executionCaseNumber}` : '[Execution Petition No.]'
          }, the Respondent No. 1 (Decree-Holder) has caused to be attached the following property: ${
            propertyDescription.trim() || '[describe the attached property]'
          }, purporting to treat the same as belonging to the Respondent No. 2 (Judgment-Debtor); the Claimant/Objector is not a party to the said suit or decree`
        ),
      ],
      incomplete: !executionCaseNumber.trim() || !propertyDescription.trim(),
    },
    {
      heading: "The Claimant/Objector's right, title and interest",
      paragraphs: [toThatClause(basisOfClaim.trim() || '[Describe your ownership/possession of, or interest in, the attached property — e.g. a registered sale deed, lease, or long, open possession]')],
      incomplete: !basisOfClaim.trim(),
      role: 'facts',
    },
    {
      heading: 'Facts',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe how you came to learn of the attachment, and why the property was wrongly attached as if it belonged to the Judgment-Debtor]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds — property not liable to attachment',
      paragraphs: [
        toThatClause(
          `the property described above is not liable to attachment in execution of the decree against the Judgment-Debtor, since the Claimant/Objector, and not the Judgment-Debtor, is the true owner/lawful possessor thereof, within the meaning of Order XXI, Rule 58 of the Code of Civil Procedure, 1908; this claim is preferred before the said property has been sold, and without any unnecessary or designed delay`
        ),
      ],
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to release the aforesaid property from attachment made in ${
          executionCaseNumber ? `Execution Petition No. ${executionCaseNumber}` : '[Execution Petition No.]'
        }, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(claimantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: claimantName,
    respondentName: decreeHolderName,
    respondentEntries: [decreeHolderName || '[Decree-Holder]', judgmentDebtorName || '[Judgment-Debtor]'],
    applicantLabel: 'CLAIMANT/OBJECTOR',
    respondentLabel: 'RESPONDENT',
    parentCaseLabel: 'EXECUTION PETITION',
    parentCaseNumber: executionCaseNumber,
    benchCity: selectedDistrict?.label,
  };
  const causeTitleHtml = buildCauseTitleHtml(causeTitleInfo);
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'INDEX' });
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'AFFIDAVIT' });

  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...filedByBlock,
  ];

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${claimantName || '[Claimant]'} aged about ${claimantAge || '[age]'}, R/o ${
          claimantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Claimant/Objector in the present petition, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying petition has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">Which state is the executing court in?</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label="State"
              helpText="This petition is filed before the very court that is executing the decree and has attached your property."
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
                helpText={`Districts of ${selectedState.label}.`}
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
            <h3 className="step-heading">The execution case</h3>
            <label className="form-field">
              <span>Execution Petition number</span>
              <input type="text" value={executionCaseNumber} onChange={(e) => setExecutionCaseNumber(e.target.value)} placeholder="e.g. EP No. 12/2026" />
            </label>
            <p className="step-help" style={{ marginTop: 'var(--space-3)' }}>
              You are not a party to the underlying suit — you're a third party whose property has been caught up in
              someone else's execution proceeding.
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Parties</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Claimant/Objector (you)' : 'Your name'}</span>
                <input type="text" value={claimantName} onChange={(e) => setClaimantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Claimant's age</span>
                <input type="text" value={claimantAge} onChange={(e) => setClaimantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Claimant's address</span>
                <input type="text" value={claimantAddress} onChange={(e) => setClaimantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Decree-Holder (Respondent No. 1)</span>
                <input type="text" value={decreeHolderName} onChange={(e) => setDecreeHolderName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Decree-Holder's address</span>
                <input type="text" value={decreeHolderAddress} onChange={(e) => setDecreeHolderAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Judgment-Debtor (Respondent No. 2)</span>
                <input type="text" value={judgmentDebtorName} onChange={(e) => setJudgmentDebtorName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Judgment-Debtor's address</span>
                <input type="text" value={judgmentDebtorAddress} onChange={(e) => setJudgmentDebtorAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">The property and your claim</h3>
            <label className="form-field">
              <span>Describe the attached property</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={propertyDescription}
                onChange={(e) => setPropertyDescription(e.target.value)}
                placeholder="e.g. residential plot bearing Survey No. ..., or household goods/vehicle etc., with enough detail to identify it precisely"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>What is your right, title, or interest in this property?</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={basisOfClaim}
                onChange={(e) => setBasisOfClaim(e.target.value)}
                placeholder="e.g. a registered sale deed dated ..., a lease, or long, open, and exclusive possession — describe how you own or lawfully hold this property"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts — how did you learn of the attachment, and why was it wrongly attached?</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the sequence of events — how the property came to be attached in someone else's case, and why it does not in fact belong to the Judgment-Debtor"
              />
            </label>
            <p className="step-help">
              File this as soon as possible — under Order XXI, Rule 58, a claim cannot be entertained once the
              property has already been sold, or if the Court finds it was designedly or unnecessarily delayed.
            </p>
            {user ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? 'Saving…' : caseId ? 'Update saved draft' : 'Save this case'}
                </button>
                {saveState === 'saved' && <p className="step-help">Saved to My Cases.</p>}
                {saveState === 'error' && <p className="step-help">Couldn't save — check your connection and try again.</p>}
                {paywall && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <PaywallBlock onChoosePlan={onOpenPricing} />
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
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              {mode === 'advocate' && (
                <>
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
                </>
              )}
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
            <p className="step-help">
              Add each document you're annexing — typically proof of your title/possession (sale deed, lease,
              property tax receipts, utility bills), a copy of the attachment order/panchnama, and the
              vakalatnama — in the order it will be paginated.
            </p>
            {documentEntries.map((d, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="form-grid">
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
                </div>
                <button type="button" className="para-btn" onClick={() => removeDocumentEntry(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addDocumentEntry}>
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
                    <PaywallBlock onChoosePlan={onOpenPricing} />
                  </div>
                )}
              </div>
            ) : (
              <p className="step-help" style={{ marginBottom: 'var(--space-4)' }}>
                Log in to save this draft and come back to it later.
              </p>
            )}
            <p className="step-help">A filed petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Claim/Objection Petition in Execution — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Claim/Objection Petition in Execution — ${claimantName || '[Claimant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Claim/Objection Petition in Execution — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="districtCourt" contextLabel={selectedDistrict?.label} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Do you want to match your draft with a particular style?
              </p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, or to follow a sample application's format, go to the next
                step and upload it there — that's a paid, on-demand feature, not included by default.
              </p>
            </div>
          </div>
        )}

        {step === 8 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
