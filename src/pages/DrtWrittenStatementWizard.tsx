import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DeadlineCalculator } from '../components/DeadlineCalculator';
import { LocationSelector } from '../components/LocationSelector';
import { ParaWiseReply } from '../components/ParaWiseReply';
import { PrecedentPanel } from '../components/PrecedentPanel';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  withPeriod,
} from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, paraWiseAllegations, groundsOfDefenceOptions } from '../data/mockData';
import { drtBenchLocations } from '../data/forumLocations';
import { DRT_WS_CASE_TYPE_ID } from '../data/backendCaseTypeIds';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import type { CheckoutIntent } from './CheckoutScreen';
import type { ParaResponse, UserRole } from '../types';

// Bundled with an Index page first and an Affidavit page last, matching the convention
// established for OA/SA — the Written Statement itself (Part II) is filed by the Defendant, so
// that's who signs and swears the Index/Affidavit too, not the Applicant bank.
const STEPS = [
  'What you received',
  'DRT bench',
  'Deadline',
  'Para-wise reply',
  'Grounds of defence',
  'Filing details',
  'Documents',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-drt-ws')!;
const wsClauses = clauses.filter((c) => c.caseTypeId === 'ct-drt-ws');

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface Props {
  onBack: () => void;
  onOpenCaseLawSearch?: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function DrtWrittenStatementWizard({ onBack, onOpenCaseLawSearch, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [benchId, setBenchId] = useState('');
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>([]);
  const [paraResponses, setParaResponses] = useState<Record<number, ParaResponse>>({});

  const [bankName, setBankName] = useState('');
  const [oaNumber, setOaNumber] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [defendantAge, setDefendantAge] = useState('');
  const [defendantAddress, setDefendantAddress] = useState('');
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

  const selectedBench = drtBenchLocations.find((b) => b.id === benchId);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = { benchId, bankName, oaNumber, defendantName, daysSince, selectedGrounds, paraResponses };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${bankName || 'Applicant'} vs. ${defendantName || 'Defendant'} — DRT Written Statement`,
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

  const toggleGround = (id: string) => {
    setSelectedGrounds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  };

  const outerLimit = (caseType.limitationDays ?? 0) + (caseType.condonableExtensionDays ?? 0);
  const windowClosed = daysSince !== null && daysSince > outerLimit;

  const clauseByCode = (code: string) => wsClauses.find((c) => c.code === code)!;

  const groundsText = selectedGrounds
    .map((id) => groundsOfDefenceOptions.find((g) => g.id === id)?.label)
    .filter(Boolean)
    .join('; ');

  const draftSections: DraftSection[] = [
    {
      heading: 'Para-wise reply',
      paragraphs: paraWiseAllegations.map((a) => {
        const r = paraResponses[a.id];
        const verb = r === 'Admit' ? 'admits' : r === 'Deny' ? 'denies' : r === 'No knowledge' ? 'has no knowledge of' : '[not yet answered]';
        return `In reply to the averment that ${a.text.toLowerCase()}, the Defendant ${verb} the same.`;
      }),
    },
    {
      heading: 'Grounds of defence',
      paragraphs: [
        fillTemplate(clauseByCode('WS-03').bodyTemplate, {
          grounds_of_defence: groundsText || undefined,
        }),
      ],
      incomplete: selectedGrounds.length === 0,
    },
    {
      heading: 'Verification',
      unnumbered: true,
      paragraphs: [fillTemplate(clauseByCode('WS-05').bodyTemplate, { defendant_name: defendantName })],
      incomplete: !defendantName,
    },
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: bankName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: 'O.A.',
    parentCaseNumber: oaNumber,
  });

  // --- Part I: Index, and Part III: Affidavit — the Written Statement (Part II) is filed by the
  // Defendant, so the Defendant signs and swears these too, not the Applicant bank. ---
  const filedByBlock = buildFiledByBlock({
    applicantLines: [defendantName || '[Defendant]', '(RESPONDENT)'],
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
    applicantName: bankName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: 'O.A.',
    parentCaseNumber: oaNumber,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(defendantName || '[Defendant]')} aged about ${defendantAge || '[age]'}, R/o ${defendantAddress || '[Address]'}, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Respondent in the present case, as such I am well conversant with the facts of the present case and competent to swear this Affidavit.`,
        `2. That the accompanying Written Statement has been prepared at my instructions, the contents of which have been explained to me in the vernacular language which I understand and the same may be read as part and parcel of this Affidavit as the same has not been repeated herein for the sake of brevity. I have gone through the same and it is true and correct.`,
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
    applicantName: bankName,
    respondentName: defendantName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: 'O.A.',
    parentCaseNumber: oaNumber,
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
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Original Application details' : 'What has been filed against you?'}
            </h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Enter the OA number, bank/FI name, and claimed amount.'
                : 'Tell us about the bank’s case against you — this helps us reference it correctly in your reply.'}
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant (Bank/FI)' : 'Which bank filed this?'}</span>
                <input type="text" placeholder="e.g. XYZ Bank Ltd." value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>OA number</span>
                <input type="text" placeholder="e.g. OA 145/2026" value={oaNumber} onChange={(e) => setOaNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Defendant name' : 'Your full name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Defendant in this case)</span>
                  )}
                </span>
                <input type="text" placeholder="Full name" value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'DRT bench' : 'Which DRT is hearing this?'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Confirm the bench this OA was actually filed in — your written statement is filed at the same bench.'
                : 'This is the same DRT city shown on the notice you received.'}
            </p>
            <LocationSelector
              mode={mode}
              locations={drtBenchLocations}
              value={benchId}
              onSelect={setBenchId}
              label={mode === 'advocate' ? 'DRT bench' : 'Which DRT is hearing this?'}
              helpText={
                mode === 'advocate'
                  ? 'Confirm the bench this OA was actually filed in — your written statement is filed at the same bench.'
                  : 'This is the same DRT city shown on the notice you received.'
              }
              verifyNote="Bench list compiled from public legal-reference sources, not yet cross-checked against the official DRT portal — confirm the correct bench at"
              verifyUrl="https://drt.gov.in"
              searchPlaceholder="Type a city…"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">When were you served?</h3>
            <p className="step-help">
              Your deadline is calculated from this date — the standard period is{' '}
              {caseType.limitationDays} days, extendable by at most {caseType.condonableExtensionDays} more only
              in exceptional circumstances.
            </p>
            <DeadlineCalculator caseType={caseType} mode={mode} onDaysSinceChange={setDaysSince} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Para-wise reply' : 'Respond to each claim in the bank’s application'}
            </h3>
            <ParaWiseReply allegations={paraWiseAllegations} value={paraResponses} onChange={setParaResponses} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Grounds of defence' : 'What’s your defence?'}
            </h3>
            <p className="step-help">Select any that apply.</p>
            <div className="grounds-grid">
              {groundsOfDefenceOptions.map((g) => (
                <button
                  key={g.id}
                  className={selectedGrounds.includes(g.id) ? 'ground-card active' : 'ground-card'}
                  onClick={() => toggleGround(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <PrecedentPanel caseTypeId={DRT_WS_CASE_TYPE_ID} onOpenCaseLawSearch={onOpenCaseLawSearch} />
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Your age</span>
                <input type="text" value={defendantAge} onChange={(e) => setDefendantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Your address</span>
                <input type="text" value={defendantAddress} onChange={(e) => setDefendantAddress(e.target.value)} />
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
              <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Particulars</span>
                    <input type="text" value={d.particulars} onChange={(e) => updateDocumentEntry(i, { particulars: e.target.value })} />
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
            {windowClosed ? (
              <div className="deadline-card status-danger">
                <p className="deadline-label">Filing window has likely closed</p>
                <p className="deadline-body">
                  Based on the date you entered, the standard filing window has passed. Rather than a routine
                  draft, this needs urgent advice on what remains open.
                </p>
              </div>
            ) : (
              <>
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
                <p className="step-help">A filed Written Statement is a bundle of separate documents — each below downloads as its own PDF.</p>
                <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
                <DraftDocument title="Written Statement — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
                <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Written Statement</h4>
                <DraftDocument
                  title={selectedBench ? `Before the ${selectedBench.label}` : 'Before the Debts Recovery Tribunal'}
                  subtitle={`Written Statement of the Defendant in OA No. ${oaNumber || '[OA number]'} — ${bankName || '[Applicant]'} vs. ${defendantName || '[Defendant]'}`}
                  causeTitleHtml={causeTitleHtml}
                  sections={draftSections}
                />
                <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
                <DraftDocument title="Written Statement — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

                <FilingGuidance forum="drt" contextLabel={selectedBench?.label} />
              </>
            )}
          </div>
        )}
      </WizardShell>
    </div>
  );
}
