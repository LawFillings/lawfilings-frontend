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
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-application-exemption-personal-appearance')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  courtLevel: string | null;
  benchCity: string;
  stateName: string;
  parentCaseNumber: string;
  applicantName: string;
  respondentName: string;
  representedByAdvocateOnRecord: boolean;
  reasonNarrative: string;
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
  'The case',
  'Reason & representation',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function ExemptionPersonalAppearanceApplicationWizard({
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
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [representedByAdvocateOnRecord, setRepresentedByAdvocateOnRecord] = useState(
    saved?.representedByAdvocateOnRecord ?? false
  );
  const [reasonNarrative, setReasonNarrative] = useState(saved?.reasonNarrative ?? '');
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
      applicantName,
      respondentName,
      representedByAdvocateOnRecord,
      reasonNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-application-exemption-personal-appearance',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} — Exemption from Personal Appearance`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-application-exemption-personal-appearance');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-application-exemption-personal-appearance');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT/ACCUSED)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'The case',
      paragraphs: [
        toThatClause(`the Applicant is the accused in ${parentCaseNumber || '[Case No.]'}, pending before this Hon'ble Court`),
      ],
      incomplete: !parentCaseNumber.trim(),
    },
    {
      heading: 'Reason personal attendance is not necessary',
      paragraphs: [
        toThatClause(
          reasonNarrative.trim() ||
            "[Explain why the Applicant's personal attendance is not necessary in the interests of justice at this stage]"
        ),
      ],
      incomplete: !reasonNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Representation',
      paragraphs: [
        toThatClause(
          representedByAdvocateOnRecord
            ? 'the Applicant is represented by an advocate on record, who shall continue to appear on the Applicant’s behalf at every hearing'
            : '[Confirm the Applicant is represented by an advocate — exemption under Section 355(1) is only available where the accused is so represented]'
        ),
      ],
      incomplete: !representedByAdvocateOnRecord,
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to dispense with the personal attendance of the Applicant under Section 355 of the Bharatiya Nagarik Suraksha Sanhita, 2023, and permit the Applicant to be represented through counsel, and to pass any other order(s) as this Hon'ble Court may deem fit and proper.`,
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
    respondentName,
    applicantLabel: 'APPLICANT/ACCUSED',
    respondentLabel: 'RESPONDENT/STATE',
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
        '2. That the accompanying application has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">The case and the parties</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Case No.</span>
                <input type="text" value={parentCaseNumber} onChange={(e) => setParentCaseNumber(e.target.value)} placeholder="e.g. CC No. 45/2026" />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant (Accused)' : 'Your name'}</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent (State/Complainant)</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Reason and representation</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <input
                type="checkbox"
                checked={representedByAdvocateOnRecord}
                onChange={(e) => setRepresentedByAdvocateOnRecord(e.target.checked)}
              />
              <span>The Applicant is represented by an advocate on record in this case</span>
            </label>
            {!representedByAdvocateOnRecord && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginBottom: 'var(--space-4)' }}>
                <p className="deadline-label">Worth confirming before filing</p>
                <p className="deadline-body">
                  Section 355(1) only lets the Court dispense with attendance where the accused is represented by an
                  advocate. Without representation, Section 355(2) instead lets the Court adjourn the hearing or
                  order the case tried separately — a different, narrower remedy from what this wizard drafts.
                </p>
              </div>
            )}
            <label className="form-field">
              <span>Why personal attendance isn't necessary</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={reasonNarrative}
                onChange={(e) => setReasonNarrative(e.target.value)}
                placeholder="e.g. distance from the applicant's residence, health, age, or the stage of proceedings involving only formal/procedural hearings"
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
            <p className="step-help">Add each document you're annexing — e.g. medical certificate, travel proof, or other supporting evidence.</p>
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
