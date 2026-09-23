import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
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
import { caseTypes, courtLevelOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { DocumentAutofill } from '../components/DocumentAutofill';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-application-compounding-offence')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  courtLevel: string | null;
  benchCity: string;
  stateName: string;
  parentCaseNumber: string;
  bnsSection: string;
  needsCourtPermission: boolean | null;
  alreadyCommittedOrAppealPending: boolean;
  applicantName: string;
  complainantName: string;
  settlementNarrative: string;
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
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'Court',
  'The offence',
  'Parties & settlement',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function CompoundingOffenceApplicationWizard({
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
  const [courtLevel, setCourtLevel] = useState<string | null>(saved?.courtLevel ?? null);
  const [benchCity, setBenchCity] = useState(saved?.benchCity ?? '');
  const [stateName, setStateName] = useState(saved?.stateName ?? '');
  const [parentCaseNumber, setParentCaseNumber] = useState(saved?.parentCaseNumber ?? '');
  const [bnsSection, setBnsSection] = useState(saved?.bnsSection ?? '');
  const [needsCourtPermission, setNeedsCourtPermission] = useState<boolean | null>(saved?.needsCourtPermission ?? null);
  const [alreadyCommittedOrAppealPending, setAlreadyCommittedOrAppealPending] = useState(
    saved?.alreadyCommittedOrAppealPending ?? false
  );
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [complainantName, setComplainantName] = useState(saved?.complainantName ?? '');
  const [settlementNarrative, setSettlementNarrative] = useState(saved?.settlementNarrative ?? '');
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

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      courtLevel,
      benchCity,
      stateName,
      parentCaseNumber,
      bnsSection,
      needsCourtPermission,
      alreadyCommittedOrAppealPending,
      applicantName,
      complainantName,
      settlementNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-application-compounding-offence',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} — Compounding of Offence`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-application-compounding-offence');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-application-compounding-offence');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT/ACCUSED)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const needsPermission = needsCourtPermission || alreadyCommittedOrAppealPending;

  const draftSections: DraftSection[] = [
    {
      heading: 'The case and the offence',
      paragraphs: [
        toThatClause(
          `the Applicant stands accused of an offence under Section ${bnsSection || '[BNS section]'} of the Bharatiya Nyaya Sanhita, 2023, in ${
            parentCaseNumber || '[Case No.]'
          }, which is compoundable under Section 359 of the Bharatiya Nagarik Suraksha Sanhita, 2023`
        ),
      ],
      incomplete: !parentCaseNumber.trim() || !bnsSection.trim(),
    },
    {
      heading: 'Settlement between the parties',
      paragraphs: [
        toThatClause(
          settlementNarrative.trim() ||
            `[Explain that ${complainantName || 'the complainant/victim'} and the Applicant have amicably settled the matter and that ${
              complainantName || 'the complainant/victim'
            } is willing to compound the offence]`
        ),
      ],
      incomplete: !settlementNarrative.trim(),
      role: 'facts',
    },
    {
      heading: "Court's permission",
      paragraphs: [
        toThatClause(
          needsPermission
            ? 'this offence may only be compounded with the leave of this Hon’ble Court, which is accordingly sought'
            : 'this offence is one that may be compounded by the parties without the leave of the Court'
        ),
      ],
      incomplete: needsCourtPermission === null,
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
          needsPermission ? 'grant leave to compound, and record the compounding of,' : 'record the compounding of'
        } the offence under Section ${bnsSection || '[BNS section]'} of the Bharatiya Nyaya Sanhita, 2023 in ${
          parentCaseNumber || '[Case No.]'
        }, and acquit the Applicant accordingly under Section 359 of the Bharatiya Nagarik Suraksha Sanhita, 2023.`,
      ],
    },
    ...buildVerificationSection(applicantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: courtLevel ?? 'magistrate_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName: complainantName,
    applicantLabel: 'APPLICANT/ACCUSED',
    respondentLabel: 'RESPONDENT/COMPLAINANT',
    parentCaseLabel: 'CASE NO.',
    parentCaseNumber,
    benchCity: benchCity || undefined,
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
      paragraphs: [`I, ${applicantName || '[Applicant]'}, the deponent above named, do hereby solemnly affirm and declare as under:`],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Applicant in the present application, and I am well conversant with the facts and circumstances of the case.',
        `2. That the matter has been amicably settled with ${complainantName || 'the complainant/victim'}, who is willing to compound the offence.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent'] },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of my above Affidavit are true and correct and nothing material has been concealed therefrom.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent'] },
  ];

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        Back to all filings
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
            <h3 className="step-heading">Which court?</h3>
            <div className="grounds-grid">
              {courtLevelOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={courtLevel === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setCourtLevel(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>City</span>
                <input type="text" value={benchCity} onChange={(e) => setBenchCity(e.target.value)} />
              </label>
              <label className="form-field">
                <span>State</span>
                <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g. Maharashtra" />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">The case and the offence</h3>
            <DocumentAutofill
              documentLabel={'chargesheet, FIR or court order in the case'}
              fields={[
                { key: 'parentCaseNumber', label: 'Case number', value: parentCaseNumber, set: setParentCaseNumber },
                { key: 'bnsSection', label: 'Section of the Bharatiya Nyaya Sanhita (or IPC) under which the offence is charged', value: bnsSection, set: setBnsSection },
                { key: 'applicantName', label: 'The accused person seeking compounding', value: applicantName, set: setApplicantName },
                { key: 'complainantName', label: 'The complainant / victim', value: complainantName, set: setComplainantName },
              ]}
            />
            <div className="form-grid">
              <label className="form-field">
                <span>Case No.</span>
                <input type="text" value={parentCaseNumber} onChange={(e) => setParentCaseNumber(e.target.value)} placeholder="e.g. CC No. 45/2026" />
              </label>
              <label className="form-field">
                <span>Section of the Bharatiya Nyaya Sanhita, 2023</span>
                <input type="text" value={bnsSection} onChange={(e) => setBnsSection(e.target.value)} placeholder="e.g. 115(2)" />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Does compounding this offence need the Court's permission?
            </h3>
            <div className="grounds-grid">
              <button
                className={needsCourtPermission === true ? 'ground-card active' : 'ground-card'}
                onClick={() => setNeedsCourtPermission(true)}
              >
                Yes — it's compoundable only with the Court's permission
              </button>
              <button
                className={needsCourtPermission === false ? 'ground-card active' : 'ground-card'}
                onClick={() => setNeedsCourtPermission(false)}
              >
                No — it's compoundable without permission
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <input
                type="checkbox"
                checked={alreadyCommittedOrAppealPending}
                onChange={(e) => setAlreadyCommittedOrAppealPending(e.target.checked)}
              />
              <span>The accused has already been committed for trial, or convicted with an appeal pending</span>
            </label>
            {alreadyCommittedOrAppealPending && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-4)' }}>
                <p className="deadline-label">Worth confirming before filing</p>
                <p className="deadline-body">
                  Once a case has been committed for trial, or a conviction is under appeal, Section 359(5) requires
                  the leave of the committing Court or the Appellate Court before this offence can be compounded —
                  even if it would otherwise not need permission.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Parties and the settlement</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant (Accused)' : 'Your name'}</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Complainant/Victim</span>
                <input type="text" value={complainantName} onChange={(e) => setComplainantName(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>How the matter was settled</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={settlementNarrative}
                onChange={(e) => setSettlementNarrative(e.target.value)}
                placeholder="Describe the terms of settlement and confirm the complainant/victim's willingness to compound"
              />
            </label>
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

        {step === 3 && (
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

        {step === 4 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">Add each document you're annexing — typically a joint compromise/settlement deed signed by both parties.</p>
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

        {step === 5 && (
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
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title={benchCity ? `Before the ${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : caseType.name}
              subtitle={`${caseType.name} — ${applicantName || '[Applicant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance
              forum="criminalCourt"
              contextLabel={benchCity ? `${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : undefined}
            />
          </div>
        )}

        {step === 6 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
