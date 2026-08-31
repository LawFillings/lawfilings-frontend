import { useRef, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { AppealRouteSelector } from '../components/AppealRouteSelector';
import { DeadlineCalculator } from '../components/DeadlineCalculator';
import { DepositCalculator } from '../components/DepositCalculator';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance, forumTypeToFilingForum } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  withPeriod,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { caseTypes, clauses } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { extractAppealOrderFromText } from '../lib/documentExtractionClient';
import type { CheckoutIntent } from './CheckoutScreen';
import type { AppealGroup, UserRole } from '../types';

interface Props {
  group: AppealGroup;
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

interface DocEntry {
  particulars: string;
  pageNo: string;
}

export function AppealWizard({ group, onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [orderDate, setOrderDate] = useState('');
  const [groundsText, setGroundsText] = useState('');
  const [appellantName, setAppellantName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [appellantAge, setAppellantAge] = useState('');
  const [appellantAddress, setAppellantAddress] = useState('');
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
  const [orderExtractState, setOrderExtractState] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
  const [orderExtractError, setOrderExtractError] = useState<string | null>(null);
  const orderFileInputRef = useRef<HTMLInputElement>(null);

  const handleOrderFileSelected = async (file: File) => {
    if (!token) return;
    setOrderExtractState('extracting');
    setOrderExtractError(null);
    try {
      const text = await extractTextFromPdf(file);
      const extracted = await extractAppealOrderFromText(text, token);
      if (extracted.orderDate && !orderDate) setOrderDate(extracted.orderDate);
      if (extracted.appellantName && !appellantName) setAppellantName(extracted.appellantName);
      if (extracted.respondentName && !respondentName) setRespondentName(extracted.respondentName);
      if (extracted.appellantAge && !appellantAge) setAppellantAge(extracted.appellantAge);
      if (extracted.appellantAddress && !appellantAddress) setAppellantAddress(extracted.appellantAddress);
      setOrderExtractState('done');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setOrderExtractError(
          "This looks like a scanned document — text extraction only works with text-based PDFs for now. Try running it through a free online OCR/text-conversion tool and re-uploading the result, or fill in the details below manually."
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setOrderExtractError('This feature needs an active plan — see Pricing, or fill in the details below manually.');
      } else if (err instanceof ApiError) {
        setOrderExtractError(err.message);
      } else {
        setOrderExtractError("Couldn't read that file — please make sure it's a PDF and try again.");
      }
      setOrderExtractState('error');
    }
  };

  const resolvedCaseType = resolvedId ? caseTypes.find((ct) => ct.id === resolvedId) ?? null : null;

  if (!resolvedCaseType) {
    return (
      <div>
        <button className="back-link" onClick={onBack}>
          ← Back to all filings
        </button>
        <div className="wizard">
          <header className="wizard-header">
            <div>
              <p className="wizard-eyebrow">Appeal</p>
              <h1 className="wizard-title">Which route applies to you?</h1>
            </div>
            <div className="mode-toggle" role="group" aria-label="Choose who you are">
              <button className={mode === 'advocate' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('advocate')}>
                I'm an advocate
              </button>
              <button className={mode === 'justice_seeker' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('justice_seeker')}>
                I'm filing for myself
              </button>
            </div>
          </header>
          <div className="step-content" style={{ maxWidth: 640 }}>
            <AppealRouteSelector group={group} onSelect={setResolvedId} />
          </div>
        </div>
      </div>
    );
  }

  const hasDeposit = !!resolvedCaseType.deposit;
  // Every appeal filed through this wizard goes to a tribunal (DRT, DRAT, or NCLAT) — all bundle
  // with an Index page first and an Affidavit page last, matching the OA/SA convention.
  const STEPS = ['Deadline', ...(hasDeposit ? ['Deposit'] : []), 'Grounds', 'Filing details', 'Documents', 'Preview'];
  const depositStepIndex = hasDeposit ? 1 : -1;
  const groundsStepIndex = hasDeposit ? 2 : 1;
  const filingDetailsStepIndex = groundsStepIndex + 1;
  const documentsStepIndex = filingDetailsStepIndex + 1;
  const previewStepIndex = STEPS.length - 1;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = { caseTypeId: resolvedCaseType.id, orderDate, groundsText, appellantName, respondentName };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${appellantName || 'Appellant'} — ${resolvedCaseType.name}`,
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

  const appealClauses = clauses.filter((c) => c.caseTypeId === resolvedCaseType.id);
  const groundsClause = appealClauses.find((c) => c.category === 'grounds');
  const prayerClause = appealClauses.find((c) => c.category === 'prayer');
  const citationMatches = findFixedCaseTypeCitation(resolvedCaseType.id);

  const draftSections: DraftSection[] = [
    {
      heading: 'Grounds of appeal',
      paragraphs: [
        toThatClause(
          groundsClause
            ? fillTemplate(groundsClause.bodyTemplate, { order_date: orderDate, grounds_of_appeal: groundsText })
            : groundsText || '[grounds not yet entered]'
        ),
      ],
      incomplete: !groundsText,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    ...(prayerClause
      ? [{ heading: 'Prayer', paragraphs: [fillTemplate(prayerClause.bodyTemplate, { order_date: orderDate })] }]
      : []),
    ...buildVerificationSection(appellantName),
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: resolvedCaseType.forumType,
    applicationTitle: resolvedCaseType.name,
    governingLaw: resolvedCaseType.governingLaw,
    applicantName: appellantName,
    respondentName,
    filingCategory: resolvedCaseType.filingCategory,
  });

  // --- Part I: Index, and Part III: Affidavit — DRT/DRAT appeals only. ---
  const filedByBlock = buildFiledByBlock({
    applicantLines: [appellantName || '[Appellant]', '(APPELLANT)'],
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
    forumType: resolvedCaseType.forumType,
    applicationTitle: resolvedCaseType.name,
    applicantName: appellantName,
    respondentName,
    filingCategory: resolvedCaseType.filingCategory,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(appellantName || '[Appellant]')} aged about ${appellantAge || '[age]'}, R/o ${appellantAddress || '[Address]'}, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Appellant in the present case, as such I am well conversant with the facts of the present case and competent to swear this Affidavit.`,
        `2. That the accompanying ${resolvedCaseType.name} has been prepared at my instructions, the contents of which have been explained to me in the vernacular language which I understand and the same may be read as part and parcel of this Affidavit as the same has not been repeated herein for the sake of brevity. I have gone through the same and it is true and correct.`,
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
    forumType: resolvedCaseType.forumType,
    applicationTitle: resolvedCaseType.name,
    applicantName: appellantName,
    respondentName,
    filingCategory: resolvedCaseType.filingCategory,
    bodyHeading: 'AFFIDAVIT',
  });

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        ← Back to all filings
      </button>
      <WizardShell
        title={resolvedCaseType.name}
        governingLaw={resolvedCaseType.governingLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">When was the order passed?</h3>
            <p className="step-help">
              {resolvedCaseType.condonableExtensionDays !== undefined
                ? `Standard period is ${resolvedCaseType.limitationDays} days, extendable by up to ${resolvedCaseType.condonableExtensionDays} more.`
                : `Standard period is ${resolvedCaseType.limitationDays} days. This can be extended on sufficient cause shown, with no fixed outer limit — but don't treat that as a safety net.`}
            </p>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <input
                ref={orderFileInputRef}
                type="file"
                accept="application/pdf"
                className="file-input-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleOrderFileSelected(file);
                }}
              />
              <button
                type="button"
                className="para-btn"
                onClick={() => orderFileInputRef.current?.click()}
                disabled={orderExtractState === 'extracting'}
              >
                {orderExtractState === 'extracting' ? 'Reading order…' : 'Fill from the order appealed against (PDF)'}
              </button>
              <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                Only text-based PDFs are supported for now, not scanned copies. This fills in the order date
                below and the Appellant/Respondent names on the Grounds step — review everything before
                continuing.
              </p>
              {orderExtractState === 'done' && (
                <p className="step-help" style={{ color: 'var(--status-safe-text)', margin: 'var(--space-1) 0 0' }}>
                  Filled in from the order — please check these before continuing.
                </p>
              )}
              {orderExtractState === 'error' && orderExtractError && (
                <p className="step-help" style={{ color: 'var(--status-danger-text)', margin: 'var(--space-1) 0 0' }}>
                  {orderExtractError}
                </p>
              )}
            </div>
            <label className="field-label" htmlFor="order-date">
              Date of order
            </label>
            <input
              id="order-date"
              type="date"
              className="date-input"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            {orderDate && <DeadlineCalculator caseType={resolvedCaseType} mode={mode} />}
          </div>
        )}

        {hasDeposit && step === depositStepIndex && (
          <div>
            <h3 className="step-heading">Deposit calculator</h3>
            <p className="step-help">
              This appeal can't be entertained without the required pre-deposit — worth confirming the amount before you file, not after.
            </p>
            {resolvedCaseType.deposit && <DepositCalculator deposit={resolvedCaseType.deposit} mode={mode} />}
          </div>
        )}

        {step === groundsStepIndex && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Grounds of appeal' : 'What was wrong with the order?'}</h3>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
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
                <span>{mode === 'advocate' ? 'Respondent' : 'Other party'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
            </div>
            <textarea
              className="facts-textarea"
              rows={5}
              value={groundsText}
              onChange={(e) => setGroundsText(e.target.value)}
              placeholder="Explain what the order got wrong — in the facts, the law, or the process followed"
            />
          </div>
        )}

        {step === filingDetailsStepIndex && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Appellant's age</span>
                <input type="text" value={appellantAge} onChange={(e) => setAppellantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Appellant's address</span>
                <input type="text" value={appellantAddress} onChange={(e) => setAppellantAddress(e.target.value)} />
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

        {step === documentsStepIndex && (
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

        {step === previewStepIndex && (
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
            <p className="step-help">A filed {resolvedCaseType.name} is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${resolvedCaseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {resolvedCaseType.name}</h4>
            <DraftDocument
              title={resolvedCaseType.name}
              subtitle={`${resolvedCaseType.governingLaw} — ${appellantName || '[Appellant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${resolvedCaseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum={forumTypeToFilingForum(resolvedCaseType.forumType)} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
