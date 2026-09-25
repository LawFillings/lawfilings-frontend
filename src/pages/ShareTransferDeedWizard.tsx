import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { buildShareTransferInstrumentHtml, buildShareTransferClosing } from '../lib/legalDocumentFormat';
import { caseTypes } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['Company & share details', 'Transferor & Transferee', 'Consideration & execution', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-share-transfer-deed')!;

interface SavedContent {
  companyName: string;
  cin: string;
  registeredOffice: string;
  classOfShares: string;
  nominalValue: string;
  paidUpValue: string;
  numberOfShares: string;
  distinctiveNumbers: string;
  certificateNo: string;
  folioNo: string;
  transferorName: string;
  transferorAddress: string;
  transfereeName: string;
  transfereeAddress: string;
  consideration: string;
  executionDate: string;
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function ShareTransferDeedWizard({
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
  const [companyName, setCompanyName] = useState(saved?.companyName ?? '');
  const [cin, setCin] = useState(saved?.cin ?? '');
  const [registeredOffice, setRegisteredOffice] = useState(saved?.registeredOffice ?? '');
  const [classOfShares, setClassOfShares] = useState(saved?.classOfShares ?? 'Equity');
  const [nominalValue, setNominalValue] = useState(saved?.nominalValue ?? '');
  const [paidUpValue, setPaidUpValue] = useState(saved?.paidUpValue ?? '');
  const [numberOfShares, setNumberOfShares] = useState(saved?.numberOfShares ?? '');
  const [distinctiveNumbers, setDistinctiveNumbers] = useState(saved?.distinctiveNumbers ?? '');
  const [certificateNo, setCertificateNo] = useState(saved?.certificateNo ?? '');
  const [folioNo, setFolioNo] = useState(saved?.folioNo ?? '');
  const [transferorName, setTransferorName] = useState(saved?.transferorName ?? '');
  const [transferorAddress, setTransferorAddress] = useState(saved?.transferorAddress ?? '');
  const [transfereeName, setTransfereeName] = useState(saved?.transfereeName ?? '');
  const [transfereeAddress, setTransfereeAddress] = useState(saved?.transfereeAddress ?? '');
  const [consideration, setConsideration] = useState(saved?.consideration ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      companyName,
      cin,
      registeredOffice,
      classOfShares,
      nominalValue,
      paidUpValue,
      numberOfShares,
      distinctiveNumbers,
      certificateNo,
      folioNo,
      transferorName,
      transferorAddress,
      transfereeName,
      transfereeAddress,
      consideration,
      executionDate,
      [WIZARD_CASE_TYPE_KEY]: 'ct-share-transfer-deed',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `Share Transfer Deed — ${transferorName || 'Transferor'} to ${transfereeName || 'Transferee'}`,
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

  const instrumentHtml = buildShareTransferInstrumentHtml({
    companyName,
    cin,
    registeredOffice,
    classOfShares,
    nominalValue,
    paidUpValue,
    numberOfShares,
    distinctiveNumbers,
    certificateNo,
    folioNo,
    transferorName,
    transferorAddress,
    transfereeName,
    transfereeAddress,
    consideration,
    date: executionDate,
  });

  const draftSections: DraftSection[] = buildShareTransferClosing(transferorName, transfereeName);

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
            <h3 className="step-heading">Company &amp; share details</h3>
            <div className="deadline-card status-warn" style={{ maxWidth: 620, marginBottom: 'var(--space-5)' }}>
              <p className="deadline-label">Worth knowing before you execute this</p>
              <p className="deadline-body">
                Form SH-4 is for physical share certificates only — dematerialised shares transfer through a
                depository participant and don't use this form; most private companies are now required to
                dematerialise their shares. Confirm your shares are still held in physical form before proceeding.
              </p>
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>Company name</span>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>CIN</span>
                <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="e.g. U12345MH2020PTC123456" />
              </label>
              <label className="form-field">
                <span>Registered office</span>
                <input type="text" value={registeredOffice} onChange={(e) => setRegisteredOffice(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Class of shares</span>
                <select value={classOfShares} onChange={(e) => setClassOfShares(e.target.value)}>
                  <option value="Equity">Equity</option>
                  <option value="Preference">Preference</option>
                </select>
              </label>
              <label className="form-field">
                <span>Nominal value per share</span>
                <input type="text" value={nominalValue} onChange={(e) => setNominalValue(e.target.value)} placeholder="e.g. ₹10" />
              </label>
              <label className="form-field">
                <span>Amount paid up per share</span>
                <input type="text" value={paidUpValue} onChange={(e) => setPaidUpValue(e.target.value)} placeholder="e.g. ₹10 (fully paid)" />
              </label>
              <label className="form-field">
                <span>Number of shares to be transferred</span>
                <input type="text" value={numberOfShares} onChange={(e) => setNumberOfShares(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Distinctive numbers of shares</span>
                <input type="text" value={distinctiveNumbers} onChange={(e) => setDistinctiveNumbers(e.target.value)} placeholder="e.g. 1001 to 1500" />
              </label>
              <label className="form-field">
                <span>Share certificate No.</span>
                <input type="text" value={certificateNo} onChange={(e) => setCertificateNo(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Transferor's ledger folio No.</span>
                <input type="text" value={folioNo} onChange={(e) => setFolioNo(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Transferor &amp; Transferee</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Transferor name</span>
                <input type="text" value={transferorName} onChange={(e) => setTransferorName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Transferor address</span>
                <input type="text" value={transferorAddress} onChange={(e) => setTransferorAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Transferee name</span>
                <input type="text" value={transfereeName} onChange={(e) => setTransfereeName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Transferee address</span>
                <input type="text" value={transfereeAddress} onChange={(e) => setTransfereeAddress(e.target.value)} />
              </label>
            </div>
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
            <h3 className="step-heading">Consideration &amp; execution</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Consideration</span>
                <input
                  type="text"
                  value={consideration}
                  onChange={(e) => setConsideration(e.target.value)}
                  placeholder="e.g. ₹15,000 (Rupees Fifteen Thousand only)"
                />
              </label>
              <label className="form-field">
                <span>Date of execution</span>
                <input type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
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
            <DraftDocument
              title="FORM SH-4"
              subtitle={`${transferorName || '[Transferor]'} to ${transfereeName || '[Transferee]'}`}
              causeTitleHtml={instrumentHtml}
              sections={draftSections}
            />
            <div className="deadline-card status-warn" style={{ maxWidth: 620, marginTop: 'var(--space-5)' }}>
              <p className="deadline-label">Filing this instrument</p>
              <p className="deadline-body">
                This instrument isn't filed with the Registrar of Companies — it's stamped and delivered to the
                company itself, within 60 days of execution (Companies Act, 2013, section 56(1)), along with the
                share certificate, for the company to register the transfer in its own records. Stamp duty is
                payable at 0.015% of the consideration, under Article 62 of the Indian Stamp Act, 1899, uniform
                across states since 1 July 2020 — confirm the current mode of payment (franking or e-stamping) for
                your state.
              </p>
            </div>
          </div>
        )}
      </WizardShell>
    </div>
  );
}
