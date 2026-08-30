import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildAgreementHtml, buildAgreementClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, contractTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

const STEPS = ['Contract type', 'Parties', 'Key terms', 'Additional clauses', 'Execution details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-contract-agreement')!;
const caClauses = clauses.filter((c) => c.caseTypeId === 'ct-contract-agreement');
const clauseByCode = (code: string) => caClauses.find((c) => c.code === code)!;

interface ContractTypeConfig {
  documentTitle: string;
  partyARole: string;
  partyBRole: string;
  recitals: () => string[];
  considerationLabel: string;
  considerationPlaceholder: string;
  caveat?: string;
}

// Recitals, role labels, and the consideration field's framing genuinely differ per contract type
// — kept inline here rather than as mockData clauses, since (unlike a litigation clause) there's
// no single shared bodyTemplate that reads naturally across all four types.
const CONTRACT_TYPE_CONFIGS: Record<string, ContractTypeConfig> = {
  rent_lease: {
    documentTitle: 'RENT AGREEMENT',
    partyARole: 'Landlord',
    partyBRole: 'Tenant',
    recitals: () => [
      'The Landlord is the lawful owner of the premises described in this Agreement (the "Premises") and is desirous of letting out the Premises on rent.',
      'The Tenant has approached the Landlord to take the Premises on rent, and the Landlord has agreed to let out the Premises to the Tenant on the terms and conditions contained herein.',
    ],
    considerationLabel: 'Rent amount and due date',
    considerationPlaceholder: 'e.g. ₹15,000 per month, payable in advance on or before the 5th of each month',
    caveat:
      'Stamp duty and registration requirements for rent/lease agreements vary by state and by the length of the term (leases of 12 months or more generally require registration under the Registration Act, 1908) — confirm the applicable stamp duty and registration requirement for the state before executing.',
  },
  loan_promissory_note: {
    documentTitle: 'LOAN AGREEMENT',
    partyARole: 'Lender',
    partyBRole: 'Borrower',
    recitals: () => [
      'The Borrower has requested the Lender to advance a loan for the purpose stated herein, and the Lender has agreed to advance the same on the terms and conditions contained herein.',
    ],
    considerationLabel: 'Principal amount and interest rate',
    considerationPlaceholder: 'e.g. ₹5,00,000 at 10% per annum simple interest',
    caveat:
      'Stamp duty on loan agreements/promissory notes varies by state. Separately, loans of ₹20,000 or more are generally required to be advanced and repaid other than in cash, under Sections 269SS/269T of the Income Tax Act, 1961, to avoid penalty.',
  },
  employment: {
    documentTitle: 'EMPLOYMENT AGREEMENT',
    partyARole: 'Employer',
    partyBRole: 'Employee',
    recitals: () => [
      'The Employer wishes to employ the Employee, and the Employee has agreed to serve the Employer, on the terms and conditions contained herein.',
    ],
    considerationLabel: 'Designation and compensation',
    considerationPlaceholder: 'e.g. Software Engineer, at a monthly gross salary of ₹80,000',
    caveat:
      'Additional terms may be required under the applicable state Shops and Establishments Act and other labour laws, which vary by state and are not covered here.',
  },
  general: {
    documentTitle: 'AGREEMENT',
    partyARole: 'First Party',
    partyBRole: 'Second Party',
    recitals: () => ['[Describe the background and purpose of this Agreement]'],
    considerationLabel: 'Key terms',
    considerationPlaceholder: 'Describe the core obligation each party is undertaking',
  },
};

interface SavedContent {
  contractType: string | null;
  partyAName: string;
  partyAAddress: string;
  partyBName: string;
  partyBAddress: string;
  consideration: string;
  startDate: string;
  termDescription: string;
  terminationTerms: string;
  jurisdictionPlace: string;
  additionalClauses: string;
  executionDate: string;
  executionPlace: string;
}

interface Props {
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function ContractAgreementWizard({
  onBack,
  onOpenCheckout,
  onOpenPricing,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [contractType, setContractType] = useState<string | null>(saved?.contractType ?? null);
  const [partyAName, setPartyAName] = useState(saved?.partyAName ?? '');
  const [partyAAddress, setPartyAAddress] = useState(saved?.partyAAddress ?? '');
  const [partyBName, setPartyBName] = useState(saved?.partyBName ?? '');
  const [partyBAddress, setPartyBAddress] = useState(saved?.partyBAddress ?? '');
  const [consideration, setConsideration] = useState(saved?.consideration ?? '');
  const [startDate, setStartDate] = useState(saved?.startDate ?? '');
  const [termDescription, setTermDescription] = useState(saved?.termDescription ?? '');
  const [terminationTerms, setTerminationTerms] = useState(saved?.terminationTerms ?? '');
  const [jurisdictionPlace, setJurisdictionPlace] = useState(saved?.jurisdictionPlace ?? '');
  const [additionalClauses, setAdditionalClauses] = useState(saved?.additionalClauses ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [executionPlace, setExecutionPlace] = useState(saved?.executionPlace ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const config = contractType ? CONTRACT_TYPE_CONFIGS[contractType] : undefined;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      contractType,
      partyAName,
      partyAAddress,
      partyBName,
      partyBAddress,
      consideration,
      startDate,
      termDescription,
      terminationTerms,
      jurisdictionPlace,
      additionalClauses,
      executionDate,
      executionPlace,
      [WIZARD_CASE_TYPE_KEY]: 'ct-contract-agreement',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${config?.documentTitle ?? 'Agreement'} — ${partyAName || 'Party A'} & ${partyBName || 'Party B'}`,
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

  const draftSections: DraftSection[] = config
    ? [
        {
          heading: config.considerationLabel,
          paragraphs: [consideration || `[${config.considerationLabel}]`],
          incomplete: !consideration,
        },
        {
          heading: 'Term',
          paragraphs: [fillTemplate(clauseByCode('CA-01').bodyTemplate, { start_date: startDate, term_description: termDescription })],
          incomplete: !startDate || !termDescription,
        },
        ...(additionalClauses.trim()
          ? [{ heading: 'Additional terms', paragraphs: splitIntoParagraphs(additionalClauses) }]
          : []),
        {
          heading: 'Termination',
          paragraphs: [fillTemplate(clauseByCode('CA-02').bodyTemplate, { termination_terms: terminationTerms })],
          incomplete: !terminationTerms,
        },
        {
          heading: 'Governing law and dispute resolution',
          paragraphs: [fillTemplate(clauseByCode('CA-03').bodyTemplate, { jurisdiction_place: jurisdictionPlace })],
          incomplete: !jurisdictionPlace,
        },
        ...buildAgreementClosing([
          { role: config.partyARole, name: partyAName },
          { role: config.partyBRole, name: partyBName },
        ]),
      ]
    : [];

  const agreementHtml = config
    ? buildAgreementHtml({
        title: config.documentTitle,
        date: executionDate,
        place: executionPlace,
        partyARole: config.partyARole,
        partyAName,
        partyAAddress,
        partyBRole: config.partyBRole,
        partyBName,
        partyBAddress,
        recitals: config.recitals(),
      })
    : '';

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
            <h3 className="step-heading">What kind of agreement is this?</h3>
            <div className="grounds-grid">
              {contractTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={contractType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setContractType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {config?.caveat && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Worth knowing before you execute this</p>
                <p className="deadline-body">{config.caveat}</p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Parties</h3>
            {config ? (
              <>
                <div className="form-grid">
                  <label className="form-field">
                    <span>{config.partyARole} name</span>
                    <input type="text" value={partyAName} onChange={(e) => setPartyAName(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>{config.partyARole} address</span>
                    <input type="text" value={partyAAddress} onChange={(e) => setPartyAAddress(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>{config.partyBRole} name</span>
                    <input type="text" value={partyBName} onChange={(e) => setPartyBName(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>{config.partyBRole} address</span>
                    <input type="text" value={partyBAddress} onChange={(e) => setPartyBAddress(e.target.value)} />
                  </label>
                </div>
              </>
            ) : (
              <p className="step-help">Go back and pick a contract type first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Key terms</h3>
            {config ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>{config.considerationLabel}</span>
                  <input
                    type="text"
                    value={consideration}
                    onChange={(e) => setConsideration(e.target.value)}
                    placeholder={config.considerationPlaceholder}
                  />
                </label>
                <label className="form-field">
                  <span>Start date</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Term / duration</span>
                  <input
                    type="text"
                    value={termDescription}
                    onChange={(e) => setTermDescription(e.target.value)}
                    placeholder="e.g. for a period of 11 months"
                  />
                </label>
                <label className="form-field">
                  <span>Termination terms</span>
                  <input
                    type="text"
                    value={terminationTerms}
                    onChange={(e) => setTerminationTerms(e.target.value)}
                    placeholder="e.g. by either Party giving 30 days' written notice to the other"
                  />
                </label>
                <label className="form-field">
                  <span>Jurisdiction (place)</span>
                  <input
                    type="text"
                    value={jurisdictionPlace}
                    onChange={(e) => setJurisdictionPlace(e.target.value)}
                    placeholder="e.g. Pune"
                  />
                </label>
              </div>
            ) : (
              <p className="step-help">Go back and pick a contract type first.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Additional clauses</h3>
            <p className="step-help">
              Optional — any terms specific to this agreement, beyond what's already covered. Separate each clause
              with a blank line.
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={additionalClauses}
              onChange={(e) => setAdditionalClauses(e.target.value)}
              placeholder="e.g. Confidentiality, non-compete, indemnity, or any other terms specific to this agreement"
            />
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

        {step === 4 && (
          <div>
            <h3 className="step-heading">Execution details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Date of execution</span>
                <input type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of execution</span>
                <input type="text" value={executionPlace} onChange={(e) => setExecutionPlace(e.target.value)} />
              </label>
            </div>
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
            {config ? (
              <>
                <DraftDocument
                  title={config.documentTitle}
                  subtitle={`${partyAName || `[${config.partyARole}]`} & ${partyBName || `[${config.partyBRole}]`}`}
                  causeTitleHtml={agreementHtml}
                  sections={draftSections}
                />
                <FilingGuidance forum="notFiledAgreement" />
              </>
            ) : (
              <p className="step-help">Go back and pick a contract type first.</p>
            )}
          </div>
        )}
      </WizardShell>
    </div>
  );
}
