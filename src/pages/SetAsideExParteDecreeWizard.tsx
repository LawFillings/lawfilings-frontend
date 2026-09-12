import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { DeadlineCalculator } from '../components/DeadlineCalculator';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  toThatClause,
} from '../lib/legalDocumentFormat';
import {
  findFixedCaseTypeCitation,
  buildCitationParagraphs,
  findFixedCaseTypeCaseLaw,
  buildCaseLawParagraphs,
} from '../lib/actReferenceMatcher';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-application-set-aside-exparte-decree')!;

type GroundType = 'not_served' | 'sufficient_cause';

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  parentCaseNumber: string;
  decreeDate: string;
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  respondentName: string;
  respondentAddress: string;
  groundType: GroundType;
  notServedDetails: string;
  knowledgeDate: string;
  sufficientCauseDetails: string;
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
  'The suit & decree',
  'Parties',
  'Grounds & deadline',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function SetAsideExParteDecreeWizard({
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
  const [parentCaseNumber, setParentCaseNumber] = useState(saved?.parentCaseNumber ?? '');
  const [decreeDate, setDecreeDate] = useState(saved?.decreeDate ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [groundType, setGroundType] = useState<GroundType>(saved?.groundType ?? 'not_served');
  const [notServedDetails, setNotServedDetails] = useState(saved?.notServedDetails ?? '');
  const [knowledgeDate, setKnowledgeDate] = useState(saved?.knowledgeDate ?? '');
  const [sufficientCauseDetails, setSufficientCauseDetails] = useState(saved?.sufficientCauseDetails ?? '');
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
      parentCaseNumber,
      decreeDate,
      applicantName,
      applicantAge,
      applicantAddress,
      respondentName,
      respondentAddress,
      groundType,
      notServedDetails,
      knowledgeDate,
      sufficientCauseDetails,
      factsNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-application-set-aside-exparte-decree',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${respondentName || 'Respondent'} — Set Aside Ex-Parte Decree`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-application-set-aside-exparte-decree');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-application-set-aside-exparte-decree');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT/DEFENDANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const groundsParagraph =
    groundType === 'not_served'
      ? toThatClause(
          `the summons of the aforesaid suit was never duly served upon the Applicant, and the Applicant accordingly had no notice whatsoever of the date fixed for hearing; ${
            notServedDetails.trim() || '[describe how/why service was defective or never effected — e.g. wrong address, no report of service on record, substituted service without due diligence]'
          }, and the Applicant came to know of the ex-parte decree only on ${
            knowledgeDate ? new Date(knowledgeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date of knowledge]'
          }`
        )
      : toThatClause(
          `the Applicant was prevented by sufficient cause from appearing when the suit was called on for hearing, in that ${
            sufficientCauseDetails.trim() || '[describe the specific, genuine reason the Applicant could not appear]'
          }; the Applicant honestly and sincerely intended to remain present and did his/her best to do so, and the non-appearance was neither wilful nor the result of any negligence or want of bona fides on the Applicant's part`
        );

  const draftSections: DraftSection[] = [
    {
      heading: 'The suit and the ex-parte decree',
      paragraphs: [
        toThatClause(
          `the Respondent had instituted ${
            parentCaseNumber ? `Suit No. ${parentCaseNumber}` : '[Suit No.]'
          } against the Applicant before this Hon'ble Court, which suit came to be decreed ex-parte against the Applicant on ${
            decreeDate ? new Date(decreeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date of decree]'
          }, without the Applicant being heard`
        ),
      ],
      incomplete: !parentCaseNumber.trim() || !decreeDate,
    },
    {
      heading: 'Brief facts',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Briefly describe the background of the suit and how the matter came to be decided ex-parte]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: groundType === 'not_served' ? 'Grounds — summons not duly served' : 'Grounds — sufficient cause for non-appearance',
      paragraphs: [groundsParagraph],
      incomplete: groundType === 'not_served' ? !notServedDetails.trim() : !sufficientCauseDetails.trim(),
      role: 'grounds',
    },
    {
      heading: 'Limitation',
      paragraphs: [
        toThatClause(
          `this application is filed within thirty days as prescribed under Article 123 of the Limitation Act, 1963, running from ${
            groundType === 'not_served'
              ? "the Applicant's knowledge of the decree, since summons was not duly served"
              : 'the date of the decree'
          }, and is therefore within limitation`
        ),
      ],
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to set aside the ex-parte decree dated ${
          decreeDate ? new Date(decreeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date]'
        } passed in ${
          parentCaseNumber ? `Suit No. ${parentCaseNumber}` : '[Suit No.]'
        }, restore the said suit to its original number, and appoint a day for proceeding with the suit on merits, upon such terms as to costs or otherwise as this Hon'ble Court deems fit, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(applicantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName,
    applicantLabel: 'APPLICANT/DEFENDANT',
    respondentLabel: 'RESPONDENT/PLAINTIFF',
    parentCaseLabel: 'SUIT',
    parentCaseNumber,
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
        `${applicantName || '[Applicant]'} aged about ${applicantAge || '[age]'}, R/o ${
          applicantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Applicant in the present application, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying application has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
              helpText="This application is filed in the same court that passed the ex-parte decree."
              verifyNote="State list is stable and complete. District-level detail for the chosen state is shown next —"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which district court passed the decree?</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label="District"
                helpText={`Districts of ${selectedState.label}. This application must go before the very court that passed the ex-parte decree.`}
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
            <h3 className="step-heading">The suit and the ex-parte decree</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Original suit number</span>
                <input
                  type="text"
                  value={parentCaseNumber}
                  onChange={(e) => setParentCaseNumber(e.target.value)}
                  placeholder="e.g. CS No. 123/2025"
                />
              </label>
              <label className="form-field">
                <span>Date of the ex-parte decree</span>
                <input type="date" value={decreeDate} onChange={(e) => setDecreeDate(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Brief facts — what was the suit about, and how did it come to be decided ex-parte?</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the suit and the circumstances that led to the decree being passed without you being heard"
              />
            </label>
            <p className="step-help">
              This application must be filed before the very court that passed the decree — not an appellate court.
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Parties</h3>
            <p className="step-help">
              You were the Defendant in the original suit; in this application, you are the Applicant. The original
              Plaintiff is the Respondent here.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Applicant (original Defendant)' : 'Your name'}
                </span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Respondent (original Plaintiff)' : 'Other party'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Grounds and filing deadline</h3>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="ground-type"
                    checked={groundType === 'not_served'}
                    onChange={() => setGroundType('not_served')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  Summons was never duly served on me
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="ground-type"
                    checked={groundType === 'sufficient_cause'}
                    onChange={() => setGroundType('sufficient_cause')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  Summons was served, but I had a genuine, sufficient reason for not appearing
                </span>
              </label>
            </div>

            {groundType === 'not_served' ? (
              <>
                <label className="form-field">
                  <span>How/why was service defective, or never effected?</span>
                  <textarea
                    className="facts-textarea"
                    rows={4}
                    value={notServedDetails}
                    onChange={(e) => setNotServedDetails(e.target.value)}
                    placeholder="e.g. summons was sent to a wrong/old address, no valid report of service exists on the court record, or substituted service was ordered without genuine due diligence to trace me"
                  />
                </label>
                <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 320 }}>
                  <span>Date you came to know of the decree</span>
                  <input type="date" value={knowledgeDate} onChange={(e) => setKnowledgeDate(e.target.value)} />
                </label>
                <p className="step-help">
                  Where summons was not duly served, your 30-day limitation period under Article 123 of the
                  Limitation Act, 1963 runs from this date of knowledge, not from the date of the decree.
                </p>
              </>
            ) : (
              <>
                <label className="form-field">
                  <span>What genuine, sufficient reason prevented you from appearing?</span>
                  <textarea
                    className="facts-textarea"
                    rows={4}
                    value={sufficientCauseDetails}
                    onChange={(e) => setSufficientCauseDetails(e.target.value)}
                    placeholder="e.g. sudden hospitalisation on the date of hearing, a genuine miscommunication with your advocate, or a bona fide mistake about the hearing date — describe what happened and why it wasn't your fault"
                  />
                </label>
                <p className="step-help">
                  Courts test this by whether you honestly and sincerely intended to appear and did your best to do
                  so — mere carelessness or an unexplained gap won't qualify (
                  <em>Parimal v. Veena @ Bharti</em>, (2011) 3 SCC 545). Your 30-day period runs from the date of the
                  decree itself.
                </p>
              </>
            )}

            <div style={{ marginTop: 'var(--space-5)' }}>
              <p className="field-label">Deadline to file this application</p>
              <DeadlineCalculator
                caseType={caseType}
                mode={mode}
                value={groundType === 'not_served' ? knowledgeDate : decreeDate}
                onChange={groundType === 'not_served' ? setKnowledgeDate : setDecreeDate}
              />
            </div>

            {user ? (
              <div style={{ marginTop: 'var(--space-5)' }}>
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
              <p className="step-help" style={{ marginTop: 'var(--space-5)' }}>
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
              Add each document you're annexing — typically a certified copy of the ex-parte decree/judgment, the
              vakalatnama, and any proof supporting your ground (e.g. a medical certificate, or a report showing
              defective service) — in the order it will be paginated.
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
            <p className="step-help">A filed application is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Application to Set Aside Ex-Parte Decree — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Application to Set Aside Ex-Parte Decree — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Application to Set Aside Ex-Parte Decree — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

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
