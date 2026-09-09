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
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-criminal-appeal')!;

type AppellateForum = 'sessions_court' | 'high_court' | 'supreme_court';

const FORUM_OPTIONS: { id: AppellateForum; label: string; help: string }[] = [
  {
    id: 'sessions_court',
    label: 'Court of Session',
    help: 'Convicted by a Magistrate of the first or second class, or sentenced under section 364.',
  },
  {
    id: 'high_court',
    label: 'High Court',
    help: 'Convicted by a Sessions Judge or Additional Sessions Judge, or sentenced to imprisonment for more than seven years.',
  },
  {
    id: 'supreme_court',
    label: 'Supreme Court',
    help: "Convicted on a trial held by a High Court in its extraordinary original criminal jurisdiction — rare.",
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  appellateForum: AppellateForum | null;
  appellantName: string;
  appellantAge: string;
  appellantAddress: string;
  respondentName: string;
  respondentAddress: string;
  trialCourt: string;
  caseNumber: string;
  judgmentDate: string;
  convictionSections: string;
  sentenceAwarded: string;
  groundsOfAppeal: string;
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
  'Court & parties',
  'Impugned judgment & grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function CriminalAppealWizard({
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
  const [appellateForum, setAppellateForum] = useState<AppellateForum | null>(saved?.appellateForum ?? null);
  const [appellantName, setAppellantName] = useState(saved?.appellantName ?? '');
  const [appellantAge, setAppellantAge] = useState(saved?.appellantAge ?? '');
  const [appellantAddress, setAppellantAddress] = useState(saved?.appellantAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [trialCourt, setTrialCourt] = useState(saved?.trialCourt ?? '');
  const [caseNumber, setCaseNumber] = useState(saved?.caseNumber ?? '');
  const [judgmentDate, setJudgmentDate] = useState(saved?.judgmentDate ?? '');
  const [convictionSections, setConvictionSections] = useState(saved?.convictionSections ?? '');
  const [sentenceAwarded, setSentenceAwarded] = useState(saved?.sentenceAwarded ?? '');
  const [groundsOfAppeal, setGroundsOfAppeal] = useState(saved?.groundsOfAppeal ?? '');
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

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      appellateForum,
      appellantName,
      appellantAge,
      appellantAddress,
      respondentName,
      respondentAddress,
      trialCourt,
      caseNumber,
      judgmentDate,
      convictionSections,
      sentenceAwarded,
      groundsOfAppeal,
      factsNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-criminal-appeal',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${appellantName || 'Appellant'} vs. ${respondentName || 'Respondent'} — Criminal Appeal`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-criminal-appeal');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [appellantName || '[Appellant]', '(APPELLANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const appellateCourtNoun =
    appellateForum === 'supreme_court' ? 'Supreme Court' : appellateForum === 'high_court' ? 'High Court' : 'Court of Session';

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the impugned judgment',
      paragraphs: [
        toThatClause(
          `by judgment dated ${judgmentDate || '[date]'} in Case No. ${caseNumber || '[Case No.]'}, ${
            trialCourt || '[trial court]'
          } convicted the Appellant ${appellantName || '[Appellant]'} under ${
            convictionSections.trim() || '[cite the specific offence section(s)]'
          } and sentenced the Appellant to ${sentenceAwarded.trim() || '[state the sentence awarded]'}, which conviction and sentence are appealed against by this petition.`
        ),
      ],
      incomplete: !trialCourt || !caseNumber || !judgmentDate,
    },
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the background facts and the course of the trial leading up to the impugned judgment]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds of appeal',
      paragraphs: [
        toThatClause(
          groundsOfAppeal.trim() ||
            '[State each ground on which the conviction/sentence is challenged, e.g. the finding is against the weight of evidence, material witnesses were not examined, the sentence is excessive]'
        ),
      ],
      incomplete: !groundsOfAppeal.trim(),
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble ${appellateCourtNoun} may be pleased to call for the records of Case No. ${
          caseNumber || '[Case No.]'
        } from ${trialCourt || '[trial court]'}, set aside the judgment and order of conviction and sentence dated ${
          judgmentDate || '[date]'
        }, acquit the Appellant of the charge(s), or in the alternative reduce the sentence awarded, and pass any other order(s) as this Hon'ble ${appellateCourtNoun} may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(appellantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: appellateForum ?? 'sessions_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    filingCategory: caseType.filingCategory,
    applicantName: appellantName,
    respondentName,
    caseNumberLine: `Crl. Appeal No. _____ of ${new Date().getFullYear()}`,
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
        `${appellantName || '[Appellant]'} aged about ${appellantAge || '[age]'}, R/o ${
          appellantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Appellant in the present case, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying appeal has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">Court and parties</h3>
            <p className="step-help">
              Section 415 fixes which court you appeal to based on who convicted you and the sentence passed — pick
              the one that matches your case.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              {FORUM_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}
                >
                  <input
                    type="radio"
                    name="appellateForum"
                    checked={appellateForum === opt.id}
                    onChange={() => setAppellateForum(opt.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    <br />
                    <span style={{ color: 'var(--text-muted)' }}>{opt.help}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Appellant' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Appellant in this case)</span>
                  )}
                </span>
                <input type="text" value={appellantName} onChange={(e) => setAppellantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Appellant's age</span>
                <input type="text" value={appellantAge} onChange={(e) => setAppellantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Appellant's address</span>
                <input type="text" value={appellantAddress} onChange={(e) => setAppellantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent (usually "State of ___")</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Impugned judgment and grounds</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Trial court which passed the judgment</span>
                <input type="text" value={trialCourt} onChange={(e) => setTrialCourt(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Case No.</span>
                <input type="text" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of the judgment</span>
                <input type="date" value={judgmentDate} onChange={(e) => setJudgmentDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Section(s) of conviction</span>
                <input type="text" value={convictionSections} onChange={(e) => setConvictionSections(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Sentence awarded</span>
                <input type="text" value={sentenceAwarded} onChange={(e) => setSentenceAwarded(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Grounds of appeal</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={groundsOfAppeal}
                onChange={(e) => setGroundsOfAppeal(e.target.value)}
                placeholder="State each ground on which the conviction/sentence is challenged, e.g. the finding is against the weight of evidence, material witnesses were not examined, the sentence is excessive"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the background facts and the course of the trial leading up to the impugned judgment"
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
              Add each document you're annexing, in the order it will be paginated — including a certified copy of
              the impugned judgment (Section 423 requires one to accompany the appeal, unless the Court otherwise
              directs).
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
            <p className="step-help">A filed appeal is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Criminal Appeal — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition of Appeal</h4>
            <DraftDocument
              title="Criminal Appeal"
              subtitle={`Appeal under Section 415, Bharatiya Nagarik Suraksha Sanhita, 2023 — ${appellantName || '[Appellant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Criminal Appeal — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="criminalCourt" contextLabel={filingPlace || undefined} />

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
