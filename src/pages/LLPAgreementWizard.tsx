import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildMultiPartyAgreementHtml, buildAgreementClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { caseTypes, clauses, llpAgreementTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['Agreement type', 'LLP & partners', 'Capital & profit sharing', 'Management & clauses', 'Execution details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-llp-agreement')!;
const llpClauses = clauses.filter((c) => c.caseTypeId === 'ct-llp-agreement');
const clauseByCode = (code: string) => llpClauses.find((c) => c.code === code)!;

interface Partner {
  name: string;
  address: string;
  capitalContribution: string;
  profitShare: string;
}

const emptyPartner = (): Partner => ({ name: '', address: '', capitalContribution: '', profitShare: '' });

interface SavedContent {
  agreementType: string | null;
  llpName: string;
  llpin: string;
  registeredOffice: string;
  originalAgreementDate: string;
  partners: Partner[];
  managementClauses: string;
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

export function LLPAgreementWizard({
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
  const [agreementType, setAgreementType] = useState<string | null>(saved?.agreementType ?? null);
  const [llpName, setLlpName] = useState(saved?.llpName ?? '');
  const [llpin, setLlpin] = useState(saved?.llpin ?? '');
  const [registeredOffice, setRegisteredOffice] = useState(saved?.registeredOffice ?? '');
  const [originalAgreementDate, setOriginalAgreementDate] = useState(saved?.originalAgreementDate ?? '');
  const [partners, setPartners] = useState<Partner[]>(saved?.partners ?? [emptyPartner(), emptyPartner()]);
  const [managementClauses, setManagementClauses] = useState(saved?.managementClauses ?? '');
  const [additionalClauses, setAdditionalClauses] = useState(saved?.additionalClauses ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [executionPlace, setExecutionPlace] = useState(saved?.executionPlace ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const updatePartner = (i: number, field: keyof Partner, value: string) => {
    setPartners((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };
  const addPartner = () => setPartners((prev) => [...prev, emptyPartner()]);
  const removePartner = (i: number) => setPartners((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      agreementType,
      llpName,
      llpin,
      registeredOffice,
      originalAgreementDate,
      partners,
      managementClauses,
      additionalClauses,
      executionDate,
      executionPlace,
      [WIZARD_CASE_TYPE_KEY]: 'ct-llp-agreement',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `LLP Agreement — ${llpName || 'LLP'}`,
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

  const isSupplementary = agreementType === 'supplementary_llp_agreement';
  const documentTitle = isSupplementary ? 'SUPPLEMENTARY LLP AGREEMENT' : 'LLP AGREEMENT';
  const recital = isSupplementary
    ? `The Partners entered into an LLP Agreement dated ${
        originalAgreementDate || '[Date of original Agreement]'
      } governing the Limited Liability Partnership named "${
        llpName || '[LLP Name]'
      }" (LLPIN: ${llpin || '[LLPIN]'}), and are now desirous of amending/supplementing that Agreement on the terms recorded in this Supplementary Agreement.`
    : `The Partners have caused the incorporation of a Limited Liability Partnership under the name "${
        llpName || '[LLP Name]'
      }" (LLPIN: ${
        llpin || '[LLPIN]'
      }), with its registered office at ${registeredOffice || '[Registered Office]'}, under the Limited Liability Partnership Act, 2008, and are desirous of recording the terms governing their mutual rights and duties in this Agreement.`;

  const agreementHtml = buildMultiPartyAgreementHtml({
    title: documentTitle,
    date: executionDate,
    place: executionPlace,
    parties: partners.map((p) => ({ name: p.name, address: p.address })),
    recitals: [recital],
  });

  const capitalParagraphs = partners.map(
    (p, i) =>
      `Partner No. ${i + 1} (${p.name || '[Name]'}) shall contribute ${
        p.capitalContribution || '[capital contribution]'
      } towards the capital of the LLP, and shall be entitled to ${p.profitShare || '[profit share]'} of the profits and losses of the LLP.`
  );

  const draftSections: DraftSection[] = [
    {
      heading: 'Capital contribution and profit sharing',
      paragraphs: capitalParagraphs,
      incomplete: partners.some((p) => !p.capitalContribution || !p.profitShare),
    },
    ...(managementClauses.trim() ? [{ heading: 'Management and decision-making', paragraphs: splitIntoParagraphs(managementClauses) }] : []),
    ...(additionalClauses.trim() ? [{ heading: 'Additional terms', paragraphs: splitIntoParagraphs(additionalClauses) }] : []),
    { heading: 'Governing law and dispute resolution', paragraphs: [fillJurisdiction(clauseByCode('LLP-01').bodyTemplate, executionPlace)] },
    ...buildAgreementClosing(partners.map((p, i) => ({ role: `Partner No. ${i + 1}`, name: p.name }))),
  ];

  function fillJurisdiction(template: string, place: string) {
    return template.replace('{{jurisdiction_place}}', place || '[Jurisdiction Place]');
  }

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
            <h3 className="step-heading">Is this a new LLP Agreement, or an amendment to an existing one?</h3>
            <div className="grounds-grid">
              {llpAgreementTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={agreementType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setAgreementType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="deadline-card status-warn" style={{ maxWidth: 620, marginTop: 'var(--space-5)' }}>
              <p className="deadline-label">Worth knowing before you execute this</p>
              <p className="deadline-body">
                This Agreement — original or supplementary — must be filed with the Registrar in Form 3 within 30
                days of the date of execution (Limited Liability Partnership Act, 2008, section 23(2), read with
                rule 21 of the LLP Rules, 2009). Each new supplementary agreement restarts this 30-day window.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">LLP &amp; partners</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>LLP name</span>
                <input type="text" value={llpName} onChange={(e) => setLlpName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>LLPIN</span>
                <input type="text" value={llpin} onChange={(e) => setLlpin(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Registered office</span>
                <input type="text" value={registeredOffice} onChange={(e) => setRegisteredOffice(e.target.value)} />
              </label>
              {isSupplementary && (
                <label className="form-field">
                  <span>Date of original Agreement</span>
                  <input type="date" value={originalAgreementDate} onChange={(e) => setOriginalAgreementDate(e.target.value)} />
                </label>
              )}
            </div>

            <h3 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
              Partners
            </h3>
            {partners.map((p, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: 'var(--space-4)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    <span>Partner {i + 1} name</span>
                    <input type="text" value={p.name} onChange={(e) => updatePartner(i, 'name', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Partner {i + 1} address</span>
                    <input type="text" value={p.address} onChange={(e) => updatePartner(i, 'address', e.target.value)} />
                  </label>
                </div>
                {partners.length > 2 && (
                  <button className="step-nav-btn" style={{ marginTop: 'var(--space-3)' }} onClick={() => removePartner(i)}>
                    Remove partner {i + 1}
                  </button>
                )}
              </div>
            ))}
            <button className="step-nav-btn" onClick={addPartner}>
              + Add another partner
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Capital &amp; profit sharing</h3>
            <p className="step-help">Each partner's contribution and share of profits/losses — the LLP Act's default 1:1 rule under the First Schedule only applies if this Agreement leaves it unaddressed.</p>
            {partners.map((p, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: 'var(--space-4)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    <span>{p.name || `Partner ${i + 1}`} — capital contribution</span>
                    <input
                      type="text"
                      value={p.capitalContribution}
                      onChange={(e) => updatePartner(i, 'capitalContribution', e.target.value)}
                      placeholder="e.g. ₹5,00,000"
                    />
                  </label>
                  <label className="form-field">
                    <span>{p.name || `Partner ${i + 1}`} — profit/loss share</span>
                    <input
                      type="text"
                      value={p.profitShare}
                      onChange={(e) => updatePartner(i, 'profitShare', e.target.value)}
                      placeholder="e.g. 50%"
                    />
                  </label>
                </div>
              </div>
            ))}
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
            <h3 className="step-heading">Management &amp; additional clauses</h3>
            <label className="form-field" style={{ display: 'block' }}>
              <span>Management and decision-making (optional)</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={managementClauses}
                onChange={(e) => setManagementClauses(e.target.value)}
                placeholder="e.g. who the designated partners are, how decisions are made, quorum for partner meetings"
              />
            </label>
            <label className="form-field" style={{ display: 'block', marginTop: 'var(--space-4)' }}>
              <span>Additional terms (optional)</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={additionalClauses}
                onChange={(e) => setAdditionalClauses(e.target.value)}
                placeholder="e.g. admission/retirement of partners, non-compete, indemnity"
              />
            </label>
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
            <DraftDocument
              title={documentTitle}
              subtitle={llpName || '[LLP Name]'}
              causeTitleHtml={agreementHtml}
              sections={draftSections}
            />
            <FilingGuidance forum="llpAgreementFiling" />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
