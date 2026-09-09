import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { DeadlineCalculator } from '../components/DeadlineCalculator';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-slp-civil')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  respondentEntries: string[];
  impugnedForum: string;
  impugnedCaseNumber: string;
  orderDate: string;
  questionsOfLaw: string;
  factsNarrative: string;
  grounds: string;
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
  'Court & parties',
  'Impugned judgment & deadline',
  'Grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function SlpCivilWizard({
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
  const [respondentEntries, setRespondentEntries] = useState<string[]>(saved?.respondentEntries ?? ['']);
  const addRespondent = () => setRespondentEntries((r) => [...r, '']);
  const removeRespondent = (i: number) => setRespondentEntries((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  const updateRespondent = (i: number, value: string) => setRespondentEntries((r) => r.map((entry, idx) => (idx === i ? value : entry)));
  const [impugnedForum, setImpugnedForum] = useState(saved?.impugnedForum ?? '');
  const [impugnedCaseNumber, setImpugnedCaseNumber] = useState(saved?.impugnedCaseNumber ?? '');
  const [orderDate, setOrderDate] = useState(saved?.orderDate ?? '');
  const [questionsOfLaw, setQuestionsOfLaw] = useState(saved?.questionsOfLaw ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [grounds, setGrounds] = useState(saved?.grounds ?? '');
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

  const filledRespondents = respondentEntries.filter((r) => r.trim().length > 0);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      petitionerName,
      petitionerAge,
      petitionerAddress,
      respondentEntries,
      impugnedForum,
      impugnedCaseNumber,
      orderDate,
      questionsOfLaw,
      factsNarrative,
      grounds,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-slp-civil',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} vs. ${filledRespondents[0] || 'Respondent'} — SLP (Civil)`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-slp-civil');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-slp-civil');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [petitionerName || '[Petitioner]', '(PETITIONER)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the impugned judgment/order',
      paragraphs: [
        toThatClause(
          `the present petition is directed against the judgment/order dated ${orderDate || '[date]'}, passed by ${
            impugnedForum || '[the High Court/Tribunal]'
          } in ${impugnedCaseNumber || '[case number]'}, whereby the Petitioner's case was decided against the Petitioner.`
        ),
      ],
      incomplete: !orderDate || !impugnedForum,
    },
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the background facts and the proceedings before the courts/tribunal below leading up to the impugned judgment/order]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Questions of law',
      paragraphs: [
        toThatClause(
          questionsOfLaw.trim() ||
            "[State the substantial question(s) of law of general public importance, or the exceptional circumstances/grave injustice, that justify this Hon'ble Court's exercise of its discretionary jurisdiction under Article 136]"
        ),
      ],
      incomplete: !questionsOfLaw.trim(),
    },
    {
      heading: 'Grounds',
      paragraphs: [
        toThatClause(
          grounds.trim() ||
            '[Set out the grounds on which the impugned judgment/order is challenged, each as a separate ground]'
        ),
      ],
      incomplete: !grounds.trim(),
      role: 'grounds',
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to grant special leave to appeal under Article 136 of the Constitution of India against the judgment/order dated ${
          orderDate || '[date]'
        } passed by ${
          impugnedForum || '[the High Court/Tribunal]'
        } in ${impugnedCaseNumber || '[case number]'}, and to pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'supreme_court',
    applicationTitle: 'Special Leave Petition (Civil)',
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    applicantLabel: 'PETITIONER',
    respondentName: filledRespondents[0] || '',
    respondentEntries: filledRespondents.length > 1 ? filledRespondents : undefined,
    respondentLabel: 'RESPONDENT',
    caseNumberLine: `S.L.P. (C) No. _____ of ${new Date().getFullYear()}`,
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
            <h3 className="step-heading">Court and parties</h3>
            <p className="step-help">
              Special leave is discretionary — the Supreme Court grants it sparingly, only where exceptional
              circumstances or grave injustice are shown, not as a routine further appeal.
            </p>
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
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <span className="field-label">Respondent(s)</span>
              {respondentEntries.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    value={r}
                    placeholder={`Respondent No. ${i + 1}`}
                    onChange={(e) => updateRespondent(i, e.target.value)}
                  />
                  <button type="button" className="para-btn" onClick={() => removeRespondent(i)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="para-btn" onClick={addRespondent}>
                + Add respondent
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Impugned judgment and deadline</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>High Court / Tribunal that passed the impugned judgment</span>
                <input type="text" value={impugnedForum} onChange={(e) => setImpugnedForum(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Case number of the impugned judgment</span>
                <input type="text" value={impugnedCaseNumber} onChange={(e) => setImpugnedCaseNumber(e.target.value)} />
              </label>
            </div>
            <DeadlineCalculator caseType={caseType} mode={mode} value={orderDate} onChange={setOrderDate} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Grounds</h3>
            <label className="form-field">
              <span>Questions of law / exceptional circumstances justifying special leave</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={questionsOfLaw}
                onChange={(e) => setQuestionsOfLaw(e.target.value)}
                placeholder="What substantial question of law, or what grave injustice, makes this an exceptional case for the Supreme Court's discretionary intervention?"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the background facts and the proceedings below leading up to the impugned judgment/order"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Grounds</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={grounds}
                onChange={(e) => setGrounds(e.target.value)}
                placeholder="Set out the grounds on which the impugned judgment/order is challenged"
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
                    <span>Advocate-on-Record name</span>
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
            {mode === 'advocate' && (
              <p className="step-help" style={{ marginTop: 'var(--space-3)' }}>
                Only an Advocate-on-Record (AOR) may file and sign a petition before the Supreme Court — an ordinary
                advocate cannot act as counsel of record here, though they may argue if briefed by the AOR.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">
              Add each document you're annexing, in the order it will be paginated — including a certified copy of
              the impugned judgment/order, and the list of dates required by the Supreme Court Rules.
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
            <p className="step-help">A filed petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="SLP (Civil) — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Special Leave Petition (Civil)"
              subtitle={`Petition under Article 136 of the Constitution of India — ${
                petitionerName || '[Petitioner]'
              } vs. ${filledRespondents[0] || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="SLP (Civil) — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="supremeCourt" contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Do you want to match your draft with a particular style?
              </p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, or to follow a sample petition's format, go to the next
                step and upload it there — that's a paid, on-demand feature, not included by default.
              </p>
            </div>
          </div>
        )}

        {step === 6 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
