import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { buildCompanyDocumentHeaderHtml, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { caseTypes, moaAoaTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const MOA_STEPS = ['Document type', 'Company basics', 'Objects & liability', 'Share capital', 'Subscribers', 'Preview'];
const AOA_STEPS = ['Document type', 'Company basics', 'Regulations approach', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-moa-aoa')!;

interface Subscriber {
  name: string;
  address: string;
  occupation: string;
  sharesSubscribed: string;
}

const emptySubscriber = (): Subscriber => ({ name: '', address: '', occupation: '', sharesSubscribed: '' });

interface SavedContent {
  docType: string | null;
  companyName: string;
  companyType: string;
  registeredOfficeState: string;
  mainObjects: string;
  ancillaryObjects: string;
  liabilityType: string;
  guaranteeAmount: string;
  shareCapitalAmount: string;
  numberOfShares: string;
  faceValuePerShare: string;
  subscribers: Subscriber[];
  regulationsApproach: string;
  modifications: string;
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function MoaAoaWizard({
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
  const [docType, setDocType] = useState<string | null>(saved?.docType ?? null);
  const [companyName, setCompanyName] = useState(saved?.companyName ?? '');
  const [companyType, setCompanyType] = useState(saved?.companyType ?? 'private_limited');
  const [registeredOfficeState, setRegisteredOfficeState] = useState(saved?.registeredOfficeState ?? '');
  const [mainObjects, setMainObjects] = useState(saved?.mainObjects ?? '');
  const [ancillaryObjects, setAncillaryObjects] = useState(saved?.ancillaryObjects ?? '');
  const [liabilityType, setLiabilityType] = useState(saved?.liabilityType ?? 'limited_by_shares');
  const [guaranteeAmount, setGuaranteeAmount] = useState(saved?.guaranteeAmount ?? '');
  const [shareCapitalAmount, setShareCapitalAmount] = useState(saved?.shareCapitalAmount ?? '');
  const [numberOfShares, setNumberOfShares] = useState(saved?.numberOfShares ?? '');
  const [faceValuePerShare, setFaceValuePerShare] = useState(saved?.faceValuePerShare ?? '');
  const [subscribers, setSubscribers] = useState<Subscriber[]>(saved?.subscribers ?? [emptySubscriber(), emptySubscriber()]);
  const [regulationsApproach, setRegulationsApproach] = useState(saved?.regulationsApproach ?? 'table_f_wholesale');
  const [modifications, setModifications] = useState(saved?.modifications ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const STEPS = docType === 'aoa' ? AOA_STEPS : MOA_STEPS;

  const updateSubscriber = (i: number, field: keyof Subscriber, value: string) => {
    setSubscribers((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };
  const addSubscriber = () => setSubscribers((prev) => [...prev, emptySubscriber()]);
  const removeSubscriber = (i: number) => setSubscribers((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      docType,
      companyName,
      companyType,
      registeredOfficeState,
      mainObjects,
      ancillaryObjects,
      liabilityType,
      guaranteeAmount,
      shareCapitalAmount,
      numberOfShares,
      faceValuePerShare,
      subscribers,
      regulationsApproach,
      modifications,
      [WIZARD_CASE_TYPE_KEY]: 'ct-moa-aoa',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${docType === 'aoa' ? 'Articles' : 'Memorandum'} of Association — ${companyName || 'Company'}`,
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

  const documentTitle = docType === 'aoa' ? 'ARTICLES OF ASSOCIATION' : 'MEMORANDUM OF ASSOCIATION';
  const headerHtml = buildCompanyDocumentHeaderHtml(documentTitle, companyName);

  const liabilityParagraph =
    liabilityType === 'limited_by_shares'
      ? `The liability of the members is limited to the amount unpaid, if any, on the shares held by them.`
      : liabilityType === 'limited_by_guarantee'
        ? `The liability of the members is limited. Every member undertakes to contribute to the assets of the Company, in the event of its being wound up while he/she is a member or within one year after he/she ceases to be a member, for payment of the debts and liabilities of the Company, and of the costs, charges, and expenses of winding up, such amount as may be required, not exceeding ${
            guaranteeAmount || '[Guarantee Amount]'
          }.`
        : `The liability of the members is unlimited.`;

  const moaSections: DraftSection[] = [
    {
      heading: 'I. Name Clause',
      paragraphs: [
        `The name of the Company is ${companyName || '[Company Name]'}${
          companyType === 'private_limited' ? ' Private Limited' : companyType === 'opc' ? ' (OPC) Private Limited' : ' Limited'
        }.`,
      ],
      incomplete: !companyName,
    },
    {
      heading: 'II. Registered Office Clause',
      paragraphs: [`The registered office of the Company will be situated in the State of ${registeredOfficeState || '[State]'}.`],
      incomplete: !registeredOfficeState,
    },
    {
      heading: 'III. Objects Clause',
      paragraphs: [
        ...(mainObjects ? splitIntoParagraphs(mainObjects) : ['[The objects for which the Company is proposed to be incorporated]']),
        ...(ancillaryObjects.trim() ? splitIntoParagraphs(ancillaryObjects) : []),
      ],
      incomplete: !mainObjects,
    },
    { heading: 'IV. Liability Clause', paragraphs: [liabilityParagraph] },
    ...(liabilityType === 'limited_by_shares'
      ? [
          {
            heading: 'V. Capital Clause',
            paragraphs: [
              `The share capital of the Company is ${shareCapitalAmount || '[Amount]'}, divided into ${
                numberOfShares || '[Number]'
              } shares of ${faceValuePerShare || '[Face Value]'} each.`,
            ],
            incomplete: !shareCapitalAmount || !numberOfShares,
          },
        ]
      : []),
    {
      heading: 'VI. Subscription Clause',
      paragraphs: [
        'We, the several persons whose names and addresses are subscribed below, are desirous of being formed into a Company in pursuance of this Memorandum of Association, and we respectively agree to take the number of shares in the capital of the Company set opposite our respective names.',
      ],
    },
    ...subscribers.map((s, i) => ({
      unnumbered: true as const,
      paragraphs: [
        `${i + 1}. ${s.name || '[Subscriber Name]'}, ${s.address || '[Address]'}, ${s.occupation || '[Occupation]'} — shares subscribed: ${
          s.sharesSubscribed || '[Number]'
        }`,
      ],
    })),
  ];

  const regulationsParagraph =
    regulationsApproach === 'table_f_wholesale'
      ? 'The regulations contained in Table F of Schedule I to the Companies Act, 2013 shall constitute the Articles of Association of the Company, without modification.'
      : 'The Articles of Association of the Company shall comprise the regulations contained in Table F of Schedule I to the Companies Act, 2013, as modified by the following provisions:';

  const aoaSections: DraftSection[] = [
    {
      heading: 'Regulations',
      paragraphs:
        regulationsApproach === 'table_f_wholesale'
          ? [regulationsParagraph]
          : [regulationsParagraph, ...(modifications ? splitIntoParagraphs(modifications) : ['[Modifications to Table F]'])],
      incomplete: regulationsApproach === 'table_f_modified' && !modifications,
    },
  ];

  const draftSections = docType === 'aoa' ? aoaSections : moaSections;

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
            <h3 className="step-heading">Which document do you need?</h3>
            <div className="grounds-grid">
              {moaAoaTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={docType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => {
                    setDocType(opt.id);
                    setStep(0);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="deadline-card status-warn" style={{ maxWidth: 620, marginTop: 'var(--space-5)' }}>
              <p className="deadline-label">Worth knowing before you rely on this</p>
              <p className="deadline-body">
                At incorporation, the MOA and AOA are ordinarily prepared and filed together as part of the SPICe+
                bundle on the MCA21 portal — this wizard drafts either document individually; it doesn't file them.
                Most companies adopt Table F of Schedule I wholesale or with light modification for their Articles,
                rather than drafting bespoke articles from scratch — a fully custom Articles of Association is a
                substantial drafting exercise beyond this wizard's scope.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Company basics</h3>
            {docType ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>Proposed company name</span>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Company type</span>
                  <select value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
                    <option value="private_limited">Private Limited</option>
                    <option value="public_limited">Public Limited</option>
                    <option value="opc">One Person Company (OPC)</option>
                    <option value="section8">Section 8 (not-for-profit)</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>State of registered office</span>
                  <input type="text" value={registeredOfficeState} onChange={(e) => setRegisteredOfficeState(e.target.value)} />
                </label>
              </div>
            ) : (
              <p className="step-help">Go back and pick a document type first.</p>
            )}
          </div>
        )}

        {step === 2 && docType !== 'aoa' && (
          <div>
            <h3 className="step-heading">Objects &amp; liability</h3>
            <label className="form-field" style={{ display: 'block' }}>
              <span>Main objects</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={mainObjects}
                onChange={(e) => setMainObjects(e.target.value)}
                placeholder="The objects for which the Company is proposed to be incorporated"
              />
            </label>
            <label className="form-field" style={{ display: 'block', marginTop: 'var(--space-4)' }}>
              <span>Matters necessary in furtherance of the objects (optional)</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={ancillaryObjects}
                onChange={(e) => setAncillaryObjects(e.target.value)}
              />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>Liability of members</span>
                <select value={liabilityType} onChange={(e) => setLiabilityType(e.target.value)}>
                  <option value="limited_by_shares">Limited by shares</option>
                  <option value="limited_by_guarantee">Limited by guarantee</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </label>
              {liabilityType === 'limited_by_guarantee' && (
                <label className="form-field">
                  <span>Guarantee amount</span>
                  <input type="text" value={guaranteeAmount} onChange={(e) => setGuaranteeAmount(e.target.value)} placeholder="e.g. ₹1,00,000" />
                </label>
              )}
            </div>
          </div>
        )}

        {step === 2 && docType === 'aoa' && (
          <div>
            <h3 className="step-heading">Regulations approach</h3>
            <div className="grounds-grid">
              <button
                className={regulationsApproach === 'table_f_wholesale' ? 'ground-card active' : 'ground-card'}
                onClick={() => setRegulationsApproach('table_f_wholesale')}
              >
                Adopt Table F wholesale
              </button>
              <button
                className={regulationsApproach === 'table_f_modified' ? 'ground-card active' : 'ground-card'}
                onClick={() => setRegulationsApproach('table_f_modified')}
              >
                Adopt Table F, with modifications
              </button>
            </div>
            {regulationsApproach === 'table_f_modified' && (
              <label className="form-field" style={{ display: 'block', marginTop: 'var(--space-4)' }}>
                <span>Modifications to Table F</span>
                <textarea
                  className="facts-textarea"
                  rows={6}
                  value={modifications}
                  onChange={(e) => setModifications(e.target.value)}
                  placeholder="e.g. quorum for board meetings, restrictions on share transfer, additional director powers"
                />
              </label>
            )}
          </div>
        )}

        {step === 3 && docType !== 'aoa' && (
          <div>
            <h3 className="step-heading">Share capital</h3>
            {liabilityType === 'limited_by_shares' ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>Authorised share capital</span>
                  <input type="text" value={shareCapitalAmount} onChange={(e) => setShareCapitalAmount(e.target.value)} placeholder="e.g. ₹10,00,000" />
                </label>
                <label className="form-field">
                  <span>Number of shares</span>
                  <input type="text" value={numberOfShares} onChange={(e) => setNumberOfShares(e.target.value)} placeholder="e.g. 1,00,000" />
                </label>
                <label className="form-field">
                  <span>Face value per share</span>
                  <input type="text" value={faceValuePerShare} onChange={(e) => setFaceValuePerShare(e.target.value)} placeholder="e.g. ₹10" />
                </label>
              </div>
            ) : (
              <p className="step-help">Not applicable — this company's liability isn't limited by shares.</p>
            )}
          </div>
        )}

        {step === 3 && docType === 'aoa' && (
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
            <DraftDocument title={documentTitle} subtitle={companyName || '[Company Name]'} causeTitleHtml={headerHtml} sections={draftSections} />
          </div>
        )}

        {step === 4 && docType !== 'aoa' && (
          <div>
            <h3 className="step-heading">Subscribers</h3>
            <p className="step-help">
              The persons subscribing their names to the Memorandum, agreeing to take the shares set against their
              names.
            </p>
            {subscribers.map((s, i) => (
              <div
                key={i}
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    <span>Subscriber {i + 1} name</span>
                    <input type="text" value={s.name} onChange={(e) => updateSubscriber(i, 'name', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Address</span>
                    <input type="text" value={s.address} onChange={(e) => updateSubscriber(i, 'address', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Occupation</span>
                    <input type="text" value={s.occupation} onChange={(e) => updateSubscriber(i, 'occupation', e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Shares subscribed</span>
                    <input type="text" value={s.sharesSubscribed} onChange={(e) => updateSubscriber(i, 'sharesSubscribed', e.target.value)} />
                  </label>
                </div>
                {subscribers.length > 1 && (
                  <button className="step-nav-btn" style={{ marginTop: 'var(--space-3)' }} onClick={() => removeSubscriber(i)}>
                    Remove subscriber {i + 1}
                  </button>
                )}
              </div>
            ))}
            <button className="step-nav-btn" onClick={addSubscriber}>
              + Add another subscriber
            </button>
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

        {step === 5 && docType !== 'aoa' && (
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
            <DraftDocument title={documentTitle} subtitle={companyName || '[Company Name]'} causeTitleHtml={headerHtml} sections={draftSections} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
