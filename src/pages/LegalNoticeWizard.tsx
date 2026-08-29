import { useRef, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildNoticeLetterHtml } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, legalNoticeTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { extractLegalNoticeSourceFromText } from '../lib/documentExtractionClient';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

const STEPS = ['Notice type', 'Parties', 'Facts & demand', 'Filing details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-legal-notice')!;
const lnClauses = clauses.filter((c) => c.caseTypeId === 'ct-legal-notice');
const clauseByCode = (code: string) => lnClauses.find((c) => c.code === code)!;

// Only cheque-dishonour and government-party notices have a legally fixed period — everything
// else is a matter of convention/professional judgment, not statute, so `statutoryNote` is
// omitted for those and the sender's own chosen period is used as-is.
const NOTICE_TYPE_RULES: Record<string, { defaultPeriod: string; statutoryNote?: string }> = {
  unpaid_debt: { defaultPeriod: '15 days' },
  breach_of_contract: { defaultPeriod: '15 days' },
  dishonoured_cheque: {
    defaultPeriod: '15 days',
    statutoryNote:
      "Under Section 138 of the Negotiable Instruments Act, 1881, this notice must be sent in writing within 30 days of receiving information from the bank that the cheque was returned unpaid, demanding payment within 15 days of the recipient's receipt of this notice. A complaint may only be filed if payment is not made within that 15-day period, and must then be filed within one month of the date the cause of action arises.",
  },
  government_party: {
    defaultPeriod: '2 months',
    statutoryNote:
      'Under Section 80 of the Code of Civil Procedure, 1908, no suit can be instituted against the Government, or against a public officer in respect of an act done in their official capacity, until two months have expired after this notice — stating the cause of action, the name/description/place of residence of the person giving notice, and the relief claimed — has been delivered to the appropriate authority.',
  },
  eviction: { defaultPeriod: '30 days' },
  other: { defaultPeriod: '15 days' },
};

interface Props {
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function LegalNoticeWizard({ onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [noticeType, setNoticeType] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [subject, setSubject] = useState('');
  const [factsNarrative, setFactsNarrative] = useState('');
  const [demandAction, setDemandAction] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [date, setDate] = useState('');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);
  const [sourceExtractState, setSourceExtractState] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
  const [sourceExtractError, setSourceExtractError] = useState<string | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);

  const handleSourceFileSelected = async (file: File) => {
    if (!token) return;
    setSourceExtractState('extracting');
    setSourceExtractError(null);
    try {
      const text = await extractTextFromPdf(file);
      const extracted = await extractLegalNoticeSourceFromText(text, token);
      if (extracted.recipientName && !recipientName) setRecipientName(extracted.recipientName);
      if (extracted.recipientAddress && !recipientAddress) setRecipientAddress(extracted.recipientAddress);
      if (extracted.subject && !subject) setSubject(extracted.subject);
      if (extracted.factsNarrative && !factsNarrative) setFactsNarrative(extracted.factsNarrative);
      if (extracted.demandAction && !demandAction) setDemandAction(extracted.demandAction);
      setSourceExtractState('done');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setSourceExtractError(
          "This looks like a scanned document — text extraction only works with text-based PDFs for now. Try running it through a free online OCR/text-conversion tool and re-uploading the result, or fill in the details below manually."
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setSourceExtractError('This feature needs an active plan — see Pricing, or fill in the details below manually.');
      } else if (err instanceof ApiError) {
        setSourceExtractError(err.message);
      } else {
        setSourceExtractError("Couldn't read that file — please make sure it's a PDF and try again.");
      }
      setSourceExtractState('error');
    }
  };

  const rule = noticeType ? NOTICE_TYPE_RULES[noticeType] : undefined;
  const effectivePeriod = noticePeriod.trim() || rule?.defaultPeriod || '15 days';

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = {
      noticeType,
      senderName,
      senderAddress,
      senderPhone,
      senderEmail,
      clientName,
      clientAddress,
      recipientName,
      recipientAddress,
      subject,
      factsNarrative,
      demandAction,
      noticePeriod,
      date,
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `Legal Notice — ${senderName || 'Sender'} to ${recipientName || 'Recipient'}`,
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

  const draftSections: DraftSection[] = [
    {
      heading: 'Facts',
      paragraphs: [fillTemplate(clauseByCode('LN-01').bodyTemplate, { facts_narrative: factsNarrative })],
      incomplete: !factsNarrative,
    },
    {
      heading: 'Demand',
      paragraphs: [
        fillTemplate(clauseByCode('LN-02').bodyTemplate, { demand_action: demandAction, notice_period: effectivePeriod }),
      ],
      incomplete: !demandAction,
    },
    ...(rule?.statutoryNote
      ? [{ heading: 'Statutory notice period', paragraphs: [rule.statutoryNote] }]
      : []),
    {
      heading: 'Consequence of non-compliance',
      paragraphs: [clauseByCode('LN-03').bodyTemplate],
    },
    {
      unnumbered: true,
      align: 'right' as const,
      paragraphs: [
        'Yours faithfully,',
        senderName || '[Sender Name]',
        mode === 'advocate' ? 'Advocate' : '',
        `Place: ${''}`,
      ].filter(Boolean),
    },
  ];

  const noticeLetterHtml = buildNoticeLetterHtml({
    senderName,
    senderAddress,
    senderPhone,
    senderEmail,
    date,
    recipientName,
    recipientAddress,
    subject,
    clientName: mode === 'advocate' ? clientName : undefined,
    clientAddress: mode === 'advocate' ? clientAddress : undefined,
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
            <h3 className="step-heading">What is this notice about?</h3>
            <p className="step-help">
              A few notice types have a legally fixed notice period (cheque dishonour, a Government party) — the
              rest are a matter of convention, and you can set your own period in Filing details.
            </p>
            <div className="grounds-grid">
              {legalNoticeTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={noticeType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setNoticeType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Sender and recipient' : 'Who is this to, and from?'}</h3>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <input
                ref={sourceFileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleSourceFileSelected(file);
                }}
              />
              <button
                type="button"
                className="para-btn"
                onClick={() => sourceFileInputRef.current?.click()}
                disabled={sourceExtractState === 'extracting'}
              >
                {sourceExtractState === 'extracting' ? 'Reading document…' : 'Fill from a document (PDF)'}
              </button>
              <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                Upload the underlying agreement, or a notice you already received — only text-based PDFs are
                supported for now, not scanned copies. This fills in blank fields below and on the next step;
                review everything before continuing.
              </p>
              {sourceExtractState === 'done' && (
                <p className="step-help" style={{ color: 'var(--status-safe-text)', margin: 'var(--space-1) 0 0' }}>
                  Filled in from the document — please check these before continuing.
                </p>
              )}
              {sourceExtractState === 'error' && sourceExtractError && (
                <p className="step-help" style={{ color: 'var(--status-danger-text)', margin: 'var(--space-1) 0 0' }}>
                  {sourceExtractError}
                </p>
              )}
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Advocate name' : 'Your name'}</span>
                <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Advocate address' : 'Your address'}</span>
                <input type="text" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input type="text" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input type="text" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
              </label>
            </div>
            {mode === 'advocate' && (
              <>
                <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
                  Client (the notice is sent "on behalf of" this person)
                </h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Client name</span>
                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Client address</span>
                    <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                  </label>
                </div>
              </>
            )}
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Recipient
            </h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Recipient name</span>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Recipient address</span>
                <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Subject line</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Legal Notice for Recovery of Outstanding Dues"
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Facts and demand</h3>
            <textarea
              className="facts-textarea"
              rows={5}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe what happened — when the debt/breach arose and why it remains unresolved"
            />
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 480 }}>
              <span>What are you demanding?</span>
              <input
                type="text"
                value={demandAction}
                onChange={(e) => setDemandAction(e.target.value)}
                placeholder="e.g. pay the outstanding sum of ₹______ together with interest"
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
                    <PaywallBlock
                      onChoosePlan={onOpenPricing}
                    />
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
              <label className="form-field">
                <span>Notice period</span>
                <input
                  type="text"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  placeholder={rule?.defaultPeriod ?? '15 days'}
                />
                {rule?.statutoryNote && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>
                    This notice type has a legally fixed period ({rule.defaultPeriod}) — leave blank to use it.
                  </span>
                )}
              </label>
              <label className="form-field">
                <span>Date of notice</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
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
            <DraftDocument
              title="Legal Notice"
              subtitle={`${senderName || '[Sender]'} to ${recipientName || '[Recipient]'}`}
              causeTitleHtml={noticeLetterHtml}
              sections={draftSections}
            />

            <FilingGuidance forum="notFiledNotice" />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
