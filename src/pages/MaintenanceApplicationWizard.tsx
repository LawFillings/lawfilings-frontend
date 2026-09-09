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
import { caseTypes } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-maintenance-application')!;

type ClaimantCategory = 'wife' | 'minor_child' | 'major_disabled_child' | 'parent' | null;

const CLAIMANT_OPTIONS: { id: ClaimantCategory; label: string }[] = [
  { id: 'wife', label: 'Wife, unable to maintain herself' },
  { id: 'minor_child', label: 'Minor child (legitimate or illegitimate), unable to maintain itself' },
  {
    id: 'major_disabled_child',
    label: 'Major child (not a married daughter), unable to maintain itself due to physical or mental abnormality/injury',
  },
  { id: 'parent', label: 'Father or mother, unable to maintain himself/herself' },
];

function relationshipClause(category: ClaimantCategory, respondentLabel: string): string {
  switch (category) {
    case 'wife':
      return `his wife, the Petitioner herein, who is unable to maintain herself`;
    case 'minor_child':
      return `his child, the Petitioner herein, who is unable to maintain itself`;
    case 'major_disabled_child':
      return `his child, the Petitioner herein, who has attained majority and, by reason of physical/mental abnormality or injury, is unable to maintain itself`;
    case 'parent':
      return `his father/mother, the Petitioner herein, who is unable to maintain himself/herself`;
    default:
      return `${respondentLabel} who is unable to maintain himself/herself`;
  }
}

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  respondentName: string;
  respondentAddress: string;
  respondentRelation: string;
  claimantCategory: ClaimantCategory;
  meansNarrative: string;
  factsNarrative: string;
  interimMaintenance: boolean;
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
  'Parties & relationship',
  'Facts',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function MaintenanceApplicationWizard({
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
  const [petitionerName, setPetitionerName] = useState(saved?.petitionerName ?? '');
  const [petitionerAge, setPetitionerAge] = useState(saved?.petitionerAge ?? '');
  const [petitionerAddress, setPetitionerAddress] = useState(saved?.petitionerAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [respondentRelation, setRespondentRelation] = useState(saved?.respondentRelation ?? '');
  const [claimantCategory, setClaimantCategory] = useState<ClaimantCategory>(saved?.claimantCategory ?? null);
  const [meansNarrative, setMeansNarrative] = useState(saved?.meansNarrative ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [interimMaintenance, setInterimMaintenance] = useState(saved?.interimMaintenance ?? false);
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
      petitionerName,
      petitionerAge,
      petitionerAddress,
      respondentName,
      respondentAddress,
      respondentRelation,
      claimantCategory,
      meansNarrative,
      factsNarrative,
      interimMaintenance,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-maintenance-application',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} vs. ${respondentName || 'Respondent'} — Maintenance Application`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-maintenance-application');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-maintenance-application');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [petitionerName || '[Petitioner]', '(PETITIONER)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const relationClause = relationshipClause(claimantCategory, respondentRelation || '[relationship]');

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the parties',
      paragraphs: [
        toThatClause(
          `the Respondent ${
            respondentName || '[Respondent]'
          } is the ${respondentRelation || '[relationship, e.g. husband/father/son]'} of the Petitioner ${
            petitionerName || '[Petitioner]'
          } and, having sufficient means, has neglected and refused to maintain ${relationClause}.`
        ),
      ],
      incomplete: !claimantCategory || !respondentRelation,
    },
    {
      heading: "Means of the parties",
      paragraphs: [
        toThatClause(
          meansNarrative.trim() ||
            '[State the Respondent\'s income/sources of means, and the Petitioner\'s own lack of sufficient independent income]'
        ),
      ],
      incomplete: !meansNarrative.trim(),
    },
    {
      heading: 'Facts constituting neglect or refusal to maintain',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the neglect or refusal to maintain, and any prior demand made on the Respondent]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to direct the Respondent to pay a monthly allowance for the maintenance of the Petitioner at such rate as this Hon'ble Court may deem fit,${
          interimMaintenance
            ? ' order the Respondent to pay a monthly allowance for interim maintenance and the expenses of this proceeding during its pendency,'
            : ''
        } and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'family_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    respondentName,
    caseNumberLine: `M.C. No. _____ of ${new Date().getFullYear()}`,
    benchCity: filingPlace || undefined,
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
        `${petitionerName || '[Petitioner]'} aged about ${petitionerAge || '[age]'}, R/o ${
          petitionerAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Petitioner in the present case, and I am well conversant with the facts and circumstances of the case.',
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
            <h3 className="step-heading">Parties and relationship</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Petitioner' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Petitioner in this case)</span>
                  )}
                </span>
                <input type="text" value={petitionerName} onChange={(e) => setPetitionerName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner's age</span>
                <input type="text" value={petitionerAge} onChange={(e) => setPetitionerAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner's address</span>
                <input type="text" value={petitionerAddress} onChange={(e) => setPetitionerAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's relationship to Petitioner (e.g. husband, father, son)</span>
                <input type="text" value={respondentRelation} onChange={(e) => setRespondentRelation(e.target.value)} />
              </label>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p className="step-help">Which of these best describes the Petitioner's claim?</p>
              {CLAIMANT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input
                    type="radio"
                    name="claimantCategory"
                    checked={claimantCategory === opt.id}
                    onChange={() => setClaimantCategory(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Means of the parties and facts</h3>
            <p className="step-help">
              Section 144 requires the Respondent to have "sufficient means" and to have neglected or refused to
              maintain the Petitioner — describe both.
            </p>
            <label className="form-field">
              <span>Means of the parties</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={meansNarrative}
                onChange={(e) => setMeansNarrative(e.target.value)}
                placeholder="Describe the Respondent's income/sources of means, and the Petitioner's own lack of sufficient independent income"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts constituting neglect or refusal to maintain</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the neglect or refusal to maintain, and any prior demand made on the Respondent"
              />
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}
            >
              <input type="checkbox" checked={interimMaintenance} onChange={(e) => setInterimMaintenance(e.target.checked)} />
              <span>Also request interim maintenance and expenses of proceeding during the pendency of this application</span>
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

        {step === 2 && (
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">
              Add each document you're annexing, in the order it will be paginated — including your Affidavit of
              Disclosure of Assets and Liabilities (see the case-law note in Preview).
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

        {step === 4 && (
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
            <DraftDocument title="Maintenance Application — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title="Maintenance Application"
              subtitle={`Application under Section 144, Bharatiya Nagarik Suraksha Sanhita, 2023 — ${petitionerName || '[Petitioner]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Maintenance Application — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="familyCourt" contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Affidavit of Disclosure of Assets and Liabilities
              </p>
              <p className="deadline-body">
                The Supreme Court's guidelines in <em>Rajnesh v. Neha</em>, (2021) 2 SCC 324, require every applicant
                (and, once served, the respondent) in a maintenance proceeding to file a separate Affidavit of
                Disclosure of Assets and Liabilities in the prescribed format — annex it as one of your documents
                above; it isn't drafted automatically here.
              </p>
            </div>

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

        {step === 5 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
