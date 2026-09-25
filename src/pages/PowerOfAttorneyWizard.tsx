import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildAgreementHtml, buildAgreementClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { caseTypes, clauses, powerOfAttorneyTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['POA type', 'Principal & Attorney', 'Powers granted', 'Additional clauses', 'Execution details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-power-of-attorney')!;
const poaClauses = clauses.filter((c) => c.caseTypeId === 'ct-power-of-attorney');
const clauseByCode = (code: string) => poaClauses.find((c) => c.code === code)!;

interface PoaTypeConfig {
  documentTitle: string;
  recital: string;
  powersLabel: string;
  powersPlaceholder: string;
  caveat: string;
}

// The recital, the framing of the powers field, and the caveat genuinely differ between a General
// and a Special Power of Attorney — kept inline here rather than as mockData clauses, matching the
// pattern used by ContractAgreementWizard and PropertyDeedWizard for their own per-type configs.
const POA_TYPE_CONFIGS: Record<string, PoaTypeConfig> = {
  general_poa: {
    documentTitle: 'GENERAL POWER OF ATTORNEY',
    recital:
      "The Principal desires to appoint the Attorney to act for and on behalf of the Principal generally, in respect of the matters stated in this Power of Attorney, during the Principal's absence or inability to act personally.",
    powersLabel: 'Powers granted',
    powersPlaceholder:
      "e.g. to manage, let out, and collect rent from the Principal's properties; to operate bank accounts; to represent the Principal before government authorities; to sign and execute documents on the Principal's behalf",
    caveat:
      "A General Power of Attorney still only carries the powers actually listed in it — a court or authority relying on this document won't infer any power beyond what's stated, however broad the document's title. List each power clearly. Registration is compulsory in some states when it relates to transferring immovable property — see the caveat under Special Power of Attorney; otherwise, notarisation is the usual practice.",
  },
  special_poa: {
    documentTitle: 'SPECIAL POWER OF ATTORNEY',
    recital:
      'The Principal desires to appoint the Attorney to act for and on behalf of the Principal for the specific purpose stated in this Power of Attorney, and for no other purpose.',
    powersLabel: 'Specific act(s) authorised',
    powersPlaceholder:
      "e.g. to sell the property situated at [address] on behalf of the Principal, and to sign and register the sale deed and receive the sale consideration on the Principal's behalf",
    caveat:
      "A Special Power of Attorney authorises only the specific act(s) stated — describe the act precisely, since the Attorney has no authority beyond it. If this Power of Attorney relates to selling, gifting, leasing, or otherwise transferring immovable property, several states (including Gujarat, Kerala, Maharashtra, Madhya Pradesh, Odisha, Rajasthan, Tamil Nadu, and Uttar Pradesh) require it to be registered — confirm the requirement for the state of execution.",
  },
};

interface SavedContent {
  poaType: string | null;
  principalName: string;
  principalAddress: string;
  attorneyName: string;
  attorneyAddress: string;
  powersGranted: string;
  additionalClauses: string;
  executionDate: string;
  executionPlace: string;
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function PowerOfAttorneyWizard({
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
  const [poaType, setPoaType] = useState<string | null>(saved?.poaType ?? null);
  const [principalName, setPrincipalName] = useState(saved?.principalName ?? '');
  const [principalAddress, setPrincipalAddress] = useState(saved?.principalAddress ?? '');
  const [attorneyName, setAttorneyName] = useState(saved?.attorneyName ?? '');
  const [attorneyAddress, setAttorneyAddress] = useState(saved?.attorneyAddress ?? '');
  const [powersGranted, setPowersGranted] = useState(saved?.powersGranted ?? '');
  const [additionalClauses, setAdditionalClauses] = useState(saved?.additionalClauses ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [executionPlace, setExecutionPlace] = useState(saved?.executionPlace ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const config = poaType ? POA_TYPE_CONFIGS[poaType] : undefined;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      poaType,
      principalName,
      principalAddress,
      attorneyName,
      attorneyAddress,
      powersGranted,
      additionalClauses,
      executionDate,
      executionPlace,
      [WIZARD_CASE_TYPE_KEY]: 'ct-power-of-attorney',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${config?.documentTitle ?? 'Power of Attorney'} — ${principalName || 'Principal'} & ${
              attorneyName || 'Attorney'
            }`,
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
          heading: config.powersLabel,
          paragraphs: [powersGranted || `[${config.powersLabel}]`],
          incomplete: !powersGranted,
        },
        ...(additionalClauses.trim()
          ? [{ heading: 'Additional terms', paragraphs: splitIntoParagraphs(additionalClauses) }]
          : []),
        {
          heading: 'Ratification',
          paragraphs: [
            'The Principal hereby agrees to ratify and confirm all acts done and things performed by the Attorney in exercise of the powers granted under this Power of Attorney.',
          ],
        },
        { heading: 'Governing law', paragraphs: [clauseByCode('POA-01').bodyTemplate] },
        ...buildAgreementClosing([
          { role: 'Principal', name: principalName },
          { role: 'Attorney', name: attorneyName },
        ]),
      ]
    : [];

  const poaHtml = config
    ? buildAgreementHtml({
        title: config.documentTitle,
        date: executionDate,
        place: executionPlace,
        partyARole: 'Principal',
        partyAName: principalName,
        partyAAddress: principalAddress,
        partyBRole: 'Attorney',
        partyBName: attorneyName,
        partyBAddress: attorneyAddress,
        recitals: [config.recital],
      })
    : '';

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
            <h3 className="step-heading">What kind of Power of Attorney is this?</h3>
            <div className="grounds-grid">
              {powerOfAttorneyTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={poaType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setPoaType(opt.id)}
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
            <h3 className="step-heading">Principal &amp; Attorney</h3>
            {config ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>Principal name (you, the person granting the power)</span>
                  <input type="text" value={principalName} onChange={(e) => setPrincipalName(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Principal address</span>
                  <input type="text" value={principalAddress} onChange={(e) => setPrincipalAddress(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Attorney name (the person you're appointing)</span>
                  <input type="text" value={attorneyName} onChange={(e) => setAttorneyName(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Attorney address</span>
                  <input type="text" value={attorneyAddress} onChange={(e) => setAttorneyAddress(e.target.value)} />
                </label>
              </div>
            ) : (
              <p className="step-help">Go back and pick a Power of Attorney type first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Powers granted</h3>
            {config ? (
              <label className="form-field" style={{ display: 'block' }}>
                <span>{config.powersLabel}</span>
                <textarea
                  className="facts-textarea"
                  rows={6}
                  value={powersGranted}
                  onChange={(e) => setPowersGranted(e.target.value)}
                  placeholder={config.powersPlaceholder}
                />
              </label>
            ) : (
              <p className="step-help">Go back and pick a Power of Attorney type first.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Additional clauses</h3>
            <p className="step-help">
              Optional — any terms specific to this Power of Attorney, beyond what's already covered. Separate each
              clause with a blank line.
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={additionalClauses}
              onChange={(e) => setAdditionalClauses(e.target.value)}
              placeholder="e.g. A duration or expiry date, or a condition on which this Power of Attorney stands revoked"
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
                    <PaywallBlock onChoosePlan={onOpenPricing} />
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
                  subtitle={`${principalName || '[Principal]'} & ${attorneyName || '[Attorney]'}`}
                  causeTitleHtml={poaHtml}
                  sections={draftSections}
                />
                <FilingGuidance forum="subRegistrarRegistration" />
              </>
            ) : (
              <p className="step-help">Go back and pick a Power of Attorney type first.</p>
            )}
          </div>
        )}
      </WizardShell>
    </div>
  );
}
