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

const caseType = caseTypes.find((ct) => ct.id === 'ct-application-injunction-disobedience')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  connectedSuitNumber: string;
  injunctionOrderDetails: string;
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  respondentName: string;
  respondentAddress: string;
  breachNarrative: string;
  seekAttachment: boolean;
  seekDetention: boolean;
  propertyDescription: string;
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
  'The injunction',
  'The breach',
  'Relief sought',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function InjunctionDisobedienceApplicationWizard({
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
  const [connectedSuitNumber, setConnectedSuitNumber] = useState(saved?.connectedSuitNumber ?? '');
  const [injunctionOrderDetails, setInjunctionOrderDetails] = useState(saved?.injunctionOrderDetails ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [breachNarrative, setBreachNarrative] = useState(saved?.breachNarrative ?? '');
  const [seekAttachment, setSeekAttachment] = useState(saved?.seekAttachment ?? true);
  const [seekDetention, setSeekDetention] = useState(saved?.seekDetention ?? false);
  const [propertyDescription, setPropertyDescription] = useState(saved?.propertyDescription ?? '');
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
      connectedSuitNumber,
      injunctionOrderDetails,
      applicantName,
      applicantAge,
      applicantAddress,
      respondentName,
      respondentAddress,
      breachNarrative,
      seekAttachment,
      seekDetention,
      propertyDescription,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-application-injunction-disobedience',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${respondentName || 'Respondent'} — Disobedience of Injunction`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-application-injunction-disobedience');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-application-injunction-disobedience');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const prayerClauses = [
    seekAttachment && `order attachment of ${propertyDescription.trim() || "[describe the Respondent's property]"}`,
    seekDetention && "order the Respondent's detention in civil prison for a term not exceeding three months",
  ].filter((c): c is string => Boolean(c));

  const draftSections: DraftSection[] = [
    {
      heading: 'The injunction and its breach',
      paragraphs: [
        toThatClause(
          `in ${
            connectedSuitNumber ? `Suit No. ${connectedSuitNumber}` : '[Suit No.]'
          }, an injunction/order was granted under Order XXXIX, Rule 1 or Rule 2 of the Code of Civil Procedure, 1908, in the following terms: ${
            injunctionOrderDetails.trim() || '[state the date and exact terms of the injunction/order]'
          }; the Respondent has disobeyed the said injunction, or breached a term on which it was granted`
        ),
      ],
      incomplete: !connectedSuitNumber.trim() || !injunctionOrderDetails.trim(),
    },
    {
      heading: 'Facts constituting the disobedience/breach',
      paragraphs: [toThatClause(breachNarrative.trim() || '[Describe specifically what the Respondent did, and when, that amounts to disobedience of the injunction or breach of its terms]')],
      incomplete: !breachNarrative.trim(),
      role: 'facts',
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to ${
          prayerClauses.length > 0 ? prayerClauses.join('; and ') : '[select at least one relief — attachment and/or detention]'
        }, for the Respondent's disobedience of/breach of the injunction dated ${
          injunctionOrderDetails.trim() ? '[as stated above]' : '[date]'
        }, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
      incomplete: prayerClauses.length === 0,
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
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    parentCaseLabel: 'SUIT',
    parentCaseNumber: connectedSuitNumber,
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
              helpText="This application is filed in the same court where your suit is pending and the injunction was granted."
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
            <h3 className="step-heading">The injunction</h3>
            <label className="form-field">
              <span>Suit number</span>
              <input type="text" value={connectedSuitNumber} onChange={(e) => setConnectedSuitNumber(e.target.value)} placeholder="e.g. CS No. 45/2026" />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Date and exact terms of the injunction/order</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={injunctionOrderDetails}
                onChange={(e) => setInjunctionOrderDetails(e.target.value)}
                placeholder="e.g. order dated 10.01.2026 restraining the Respondent from alienating or creating third-party interest in the suit property"
              />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant' : 'Your name'}</span>
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
                <span>{mode === 'advocate' ? 'Respondent' : 'Other party'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">The breach</h3>
            <label className="form-field">
              <span>What did the Respondent do, and when, that disobeyed or breached the injunction?</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={breachNarrative}
                onChange={(e) => setBreachNarrative(e.target.value)}
                placeholder="Be specific — describe the act, the date, and how it conflicts with the injunction's terms"
              />
            </label>
            <p className="step-help">
              A person can be held liable for disobedience even if the injunction is later set aside — the breach,
              once committed, isn't erased retrospectively (<em>Samee Khan v. Bindu Khan</em>, AIR 1998 SC 2765).
            </p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Relief sought</h3>
            <p className="step-help">
              Attachment and detention are independent remedies — you can seek either, or both together; one is not
              a precondition for the other.
            </p>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={seekAttachment} onChange={(e) => setSeekAttachment(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  Attachment of the Respondent's property
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={seekDetention} onChange={(e) => setSeekDetention(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  Detention of the Respondent in civil prison (up to 3 months)
                </span>
              </label>
            </div>
            {seekAttachment && (
              <label className="form-field">
                <span>Describe the property to be attached</span>
                <textarea className="facts-textarea" rows={2} value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} />
              </label>
            )}
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
              Add each document you're annexing — typically a copy of the injunction order and evidence of the
              breach — in the order it will be paginated.
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
            <DraftDocument title="Application for Disobedience of Injunction — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Application for Disobedience of Injunction — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Application for Disobedience of Injunction — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

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
