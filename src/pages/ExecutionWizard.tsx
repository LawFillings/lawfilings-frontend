import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance, forumTypeToFilingForum } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  partyLabels,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import type { CheckoutIntent } from './CheckoutScreen';
import type { CaseType, UserRole } from '../types';

const STEPS = ['Order details', 'Non-compliance', 'Filing details', 'Documents (Index)', 'Preview'];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface Props {
  caseType: CaseType;
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function ExecutionWizard({ caseType, onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [orderDate, setOrderDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [reliefOrdered, setReliefOrdered] = useState('');
  const [nonComplianceDetails, setNonComplianceDetails] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [advocateAddress, setAdvocateAddress] = useState('');
  const [advocatePhone, setAdvocatePhone] = useState('');
  const [advocateEmail, setAdvocateEmail] = useState('');
  const [filingPlace, setFilingPlace] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = {
      orderDate,
      orderNumber,
      reliefOrdered,
      nonComplianceDetails,
      applicantName,
      respondentName,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      documentEntries,
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${respondentName || 'Respondent'} — ${caseType.name}`,
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

  const citationMatches = findFixedCaseTypeCitation(caseType.id);
  const labels = partyLabels(caseType.forumType, caseType.filingCategory);

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || `[${labels.applicant}]`, `(${labels.applicant})`],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'Background',
      paragraphs: [
        toThatClause(
          `This Hon'ble forum, by order dated ${orderDate || '[order date]'} in ${orderNumber || '[case number]'}, directed the Respondent to ${reliefOrdered || '[relief ordered — not yet entered]'}.`
        ),
      ],
      incomplete: !orderDate || !reliefOrdered,
    },
    {
      heading: 'Non-compliance',
      paragraphs: [
        toThatClause(
          nonComplianceDetails ||
            'Despite the above order, the Respondent has failed to comply, as detailed below. [not yet entered]'
        ),
      ],
      incomplete: !nonComplianceDetails,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        'It is therefore prayed that this Hon’ble forum may be pleased to enforce the above order and take such action against the Respondent as is provided for non-compliance under the applicable Act.',
      ],
    },
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: 'ORIGINAL CASE',
    parentCaseNumber: orderNumber,
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
        `I, ${applicantName || `[${labels.applicant}]`}, the deponent above named, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the ${labels.applicant.charAt(0)}${labels.applicant.slice(1).toLowerCase()} in the present case and am well conversant with the facts of the case, and am competent to swear this Affidavit.`,
        `2. That the accompanying ${caseType.name} has been prepared at my instructions, the contents of which have been explained to me and are true and correct to the best of my knowledge and belief. The same may be read as part and parcel of this Affidavit and is not repeated herein for the sake of brevity.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
    ...buildVerificationSection(applicantName, filingPlace),
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
            <h3 className="step-heading">{mode === 'advocate' ? 'Order details' : 'The order that wasn’t followed'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Enter the details of the order you are seeking to enforce.'
                : 'Tell us about the order the forum already passed in your favour.'}
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Applicant' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Applicant in this case)</span>
                  )}
                </span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Respondent' : 'Who was ordered to act?'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Case / order number</span>
                <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of order</span>
                <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Relief ordered' : 'What were they told to do?'}</span>
                <input type="text" value={reliefOrdered} onChange={(e) => setReliefOrdered(e.target.value)} placeholder="e.g. refund ₹15,000 within 30 days" />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Details of non-compliance' : 'What have they not done?'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Set out specifically how and when the order was not complied with.'
                : 'Explain what was supposed to happen and what actually happened instead.'}
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={nonComplianceDetails}
              onChange={(e) => setNonComplianceDetails(e.target.value)}
              placeholder="The order required payment within 30 days of the order dated... As of today, no payment has been received..."
            />
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
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">Add each document you're annexing, in the order it will be paginated.</p>
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
            <p className="step-help">A filed {caseType.name} is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {caseType.name}</h4>
            <DraftDocument
              title={caseType.name}
              subtitle={`${caseType.governingLaw} — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument
              title={`${caseType.name} — Affidavit`}
              subtitle={applicantName || '[Applicant]'}
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance forum={forumTypeToFilingForum(caseType.forumType)} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
