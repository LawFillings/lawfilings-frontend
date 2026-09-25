import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildAgreementHtml, buildAgreementClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, propertyDeedTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['Deed type', 'Parties', 'Property schedule', 'Key terms', 'Additional clauses', 'Execution details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-property-deed')!;
const pdClauses = clauses.filter((c) => c.caseTypeId === 'ct-property-deed');
const clauseByCode = (code: string) => pdClauses.find((c) => c.code === code)!;

interface DeedTypeConfig {
  documentTitle: string;
  partyARole: string;
  partyBRole: string;
  recitals: () => string[];
  considerationLabel: string;
  considerationPlaceholder: string;
  covenants: string[];
  caveat: string;
}

// Recitals, role labels, covenants, and the consideration field's framing genuinely differ per
// deed type — kept inline here rather than as mockData clauses, since (unlike a litigation clause)
// there's no single shared bodyTemplate that reads naturally across all four types.
const DEED_TYPE_CONFIGS: Record<string, DeedTypeConfig> = {
  sale_deed: {
    documentTitle: 'SALE DEED',
    partyARole: 'Vendor',
    partyBRole: 'Vendee',
    recitals: () => [
      'The Vendor is the absolute and lawful owner, in physical possession, of the Property described in the Schedule hereunder (the "Property"), free from all encumbrances, charges, and claims whatsoever.',
      'The Vendor has agreed to sell, and the Vendee has agreed to purchase, the Property for the consideration and on the terms and conditions contained in this Deed, and the Vendor has delivered, and the Vendee has taken, vacant physical possession of the Property simultaneously with the execution of this Deed.',
    ],
    considerationLabel: 'Sale consideration',
    considerationPlaceholder: 'e.g. ₹75,00,000 (Rupees Seventy-Five Lakh only), paid in full before execution',
    covenants: [
      'The Vendor covenants that the Vendor has good and marketable title to the Property, that the Property is free from all encumbrances, charges, liens, and claims of any kind, and that the Vendor shall indemnify the Vendee against any loss arising from any defect in title or any undisclosed encumbrance.',
    ],
    caveat:
      'Registration is compulsory for a sale of tangible immovable property of value ₹100 or more (Transfer of Property Act, 1882, Section 54; Registration Act, 1908, Section 17) — in practice, every sale deed. Stamp duty — state-specific, generally ad valorem on the market value or the stated consideration, whichever is higher — is payable before execution.',
  },
  gift_deed: {
    documentTitle: 'GIFT DEED',
    partyARole: 'Donor',
    partyBRole: 'Donee',
    recitals: () => [
      'The Donor is the absolute and lawful owner, in physical possession, of the Property described in the Schedule hereunder (the "Property"), free from all encumbrances, charges, and claims whatsoever.',
      'The Donor, out of natural love and affection and without any consideration whatsoever, is desirous of making a gift of the Property to the Donee, and the Donee has accepted this gift.',
    ],
    considerationLabel: 'Relationship / reason for the gift',
    considerationPlaceholder: "e.g. natural love and affection, being the Donee's father",
    covenants: [
      'This gift is made voluntarily, out of natural love and affection, and without any consideration whatsoever. The Donee accepts the gift of the Property with all its existing rights, easements, and liabilities. This gift is irrevocable, save as provided under Section 126 of the Transfer of Property Act, 1882.',
    ],
    caveat:
      "A gift of immovable property must be made by a registered instrument, signed by the Donor and attested by at least two witnesses, and the Donee must accept it during the Donor's lifetime (Transfer of Property Act, 1882, Sections 122 & 123) — an unregistered gift deed conveys nothing. A gift cannot be made revocable at the Donor's mere will (Section 126); it can only be conditioned on a specific future event outside the Donor's own control.",
  },
  lease_deed: {
    documentTitle: 'LEASE DEED',
    partyARole: 'Lessor',
    partyBRole: 'Lessee',
    recitals: () => [
      'The Lessor is the absolute and lawful owner of the Property described in the Schedule hereunder (the "Property") and is desirous of leasing the Property to the Lessee.',
      'The Lessee has agreed to take the Property on lease from the Lessor on the terms and conditions contained in this Deed.',
    ],
    considerationLabel: 'Rent and security deposit',
    considerationPlaceholder: 'e.g. ₹40,000 per month, plus an interest-free refundable security deposit of ₹4,00,000',
    covenants: [
      "The Lessee shall use the Property only for the purpose stated in this Deed, shall not sub-let, assign, or part with possession of the Property without the Lessor's prior written consent, and shall hand back vacant possession of the Property to the Lessor on the expiry or earlier termination of this lease, in the condition in which it was received, fair wear and tear excepted.",
    ],
    caveat:
      "A lease from year to year, for a term exceeding one year, or reserving a yearly rent can only be made by a registered instrument (Transfer of Property Act, 1882, Section 107) — this is what distinguishes a Lease Deed from a short-term (typically 11-month) private rent/leave-and-licence agreement, which doesn't need registration; use Contract Agreement for that instead. Stamp duty on a registrable lease is usually calculated on the average annual rent plus any premium, and varies by state.",
  },
  mortgage_deed: {
    documentTitle: 'MORTGAGE DEED',
    partyARole: 'Mortgagor',
    partyBRole: 'Mortgagee',
    recitals: () => [
      'The Mortgagor is the absolute and lawful owner of the Property described in the Schedule hereunder (the "Property").',
      'The Mortgagor has requested the Mortgagee to advance the loan stated herein, and the Mortgagee has agreed to do so on the security of the Property, on the terms and conditions contained in this Deed.',
    ],
    considerationLabel: 'Loan amount secured and interest rate',
    considerationPlaceholder: 'e.g. ₹20,00,000 at 11% per annum, repayable over 60 months',
    covenants: [
      "This is a Simple Mortgage: the Mortgagor shall remain in possession of the Property, without any personal liability to repay other than as stated herein, and the Mortgagee's remedy on default shall be to apply to a competent court for a decree for sale of the Property and recovery of the mortgage-money from the sale proceeds.",
    ],
    caveat:
      "This wizard drafts a Simple Mortgage. The Transfer of Property Act, 1882, Section 58 also recognises five other types — mortgage by conditional sale, usufructuary mortgage, English mortgage, mortgage by deposit of title-deeds, and anomalous mortgage — each with different possession and remedy consequences; confirm a Simple Mortgage is what you intend before proceeding. Registration is compulsory once the secured amount reaches ₹100 (i.e., in practice, always), except a mortgage by deposit of title-deeds, which needs no deed at all.",
  },
};

interface SavedContent {
  deedType: string | null;
  partyAName: string;
  partyAAddress: string;
  partyBName: string;
  partyBAddress: string;
  propertyAddress: string;
  surveyOrPlotNumber: string;
  propertyArea: string;
  boundaryNorth: string;
  boundarySouth: string;
  boundaryEast: string;
  boundaryWest: string;
  consideration: string;
  jurisdictionPlace: string;
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

export function PropertyDeedWizard({
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
  const [deedType, setDeedType] = useState<string | null>(saved?.deedType ?? null);
  const [partyAName, setPartyAName] = useState(saved?.partyAName ?? '');
  const [partyAAddress, setPartyAAddress] = useState(saved?.partyAAddress ?? '');
  const [partyBName, setPartyBName] = useState(saved?.partyBName ?? '');
  const [partyBAddress, setPartyBAddress] = useState(saved?.partyBAddress ?? '');
  const [propertyAddress, setPropertyAddress] = useState(saved?.propertyAddress ?? '');
  const [surveyOrPlotNumber, setSurveyOrPlotNumber] = useState(saved?.surveyOrPlotNumber ?? '');
  const [propertyArea, setPropertyArea] = useState(saved?.propertyArea ?? '');
  const [boundaryNorth, setBoundaryNorth] = useState(saved?.boundaryNorth ?? '');
  const [boundarySouth, setBoundarySouth] = useState(saved?.boundarySouth ?? '');
  const [boundaryEast, setBoundaryEast] = useState(saved?.boundaryEast ?? '');
  const [boundaryWest, setBoundaryWest] = useState(saved?.boundaryWest ?? '');
  const [consideration, setConsideration] = useState(saved?.consideration ?? '');
  const [jurisdictionPlace, setJurisdictionPlace] = useState(saved?.jurisdictionPlace ?? '');
  const [additionalClauses, setAdditionalClauses] = useState(saved?.additionalClauses ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [executionPlace, setExecutionPlace] = useState(saved?.executionPlace ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const config = deedType ? DEED_TYPE_CONFIGS[deedType] : undefined;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      deedType,
      partyAName,
      partyAAddress,
      partyBName,
      partyBAddress,
      propertyAddress,
      surveyOrPlotNumber,
      propertyArea,
      boundaryNorth,
      boundarySouth,
      boundaryEast,
      boundaryWest,
      consideration,
      jurisdictionPlace,
      additionalClauses,
      executionDate,
      executionPlace,
      [WIZARD_CASE_TYPE_KEY]: 'ct-property-deed',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${config?.documentTitle ?? 'Deed'} — ${partyAName || 'Party A'} & ${partyBName || 'Party B'}`,
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

  const scheduleText = [
    propertyAddress && `Situated at: ${propertyAddress}`,
    surveyOrPlotNumber && `Survey/Plot No.: ${surveyOrPlotNumber}`,
    propertyArea && `Area: ${propertyArea}`,
    (boundaryNorth || boundarySouth || boundaryEast || boundaryWest) &&
      `Bounded on the North by ${boundaryNorth || '[North boundary]'}, on the South by ${
        boundarySouth || '[South boundary]'
      }, on the East by ${boundaryEast || '[East boundary]'}, and on the West by ${boundaryWest || '[West boundary]'}.`,
  ].filter(Boolean) as string[];

  const draftSections: DraftSection[] = config
    ? [
        {
          heading: 'Schedule of Property',
          paragraphs: scheduleText.length > 0 ? scheduleText : ['[Property description, survey/plot number, area, and boundaries]'],
          incomplete: scheduleText.length === 0,
        },
        {
          heading: config.considerationLabel,
          paragraphs: [consideration || `[${config.considerationLabel}]`],
          incomplete: !consideration,
        },
        { heading: 'Covenants', paragraphs: config.covenants },
        ...(additionalClauses.trim()
          ? [{ heading: 'Additional terms', paragraphs: splitIntoParagraphs(additionalClauses) }]
          : []),
        {
          heading: 'Governing law and dispute resolution',
          paragraphs: [fillTemplate(clauseByCode('PD-01').bodyTemplate, { jurisdiction_place: jurisdictionPlace })],
          incomplete: !jurisdictionPlace,
        },
        ...buildAgreementClosing([
          { role: config.partyARole, name: partyAName },
          { role: config.partyBRole, name: partyBName },
        ]),
      ]
    : [];

  const deedHtml = config
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
            <h3 className="step-heading">What kind of deed is this?</h3>
            <div className="grounds-grid">
              {propertyDeedTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={deedType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setDeedType(opt.id)}
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
            ) : (
              <p className="step-help">Go back and pick a deed type first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Property schedule</h3>
            <p className="step-help">The description of the property being conveyed — this becomes the Deed's Schedule.</p>
            <div className="form-grid">
              <label className="form-field">
                <span>Property address</span>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="Full postal address of the property"
                />
              </label>
              <label className="form-field">
                <span>Survey/Plot/Flat No.</span>
                <input type="text" value={surveyOrPlotNumber} onChange={(e) => setSurveyOrPlotNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Area</span>
                <input
                  type="text"
                  value={propertyArea}
                  onChange={(e) => setPropertyArea(e.target.value)}
                  placeholder="e.g. 2,400 sq. ft."
                />
              </label>
              <label className="form-field">
                <span>Boundary — North</span>
                <input type="text" value={boundaryNorth} onChange={(e) => setBoundaryNorth(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Boundary — South</span>
                <input type="text" value={boundarySouth} onChange={(e) => setBoundarySouth(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Boundary — East</span>
                <input type="text" value={boundaryEast} onChange={(e) => setBoundaryEast(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Boundary — West</span>
                <input type="text" value={boundaryWest} onChange={(e) => setBoundaryWest(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
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
              <p className="step-help">Go back and pick a deed type first.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Additional clauses</h3>
            <p className="step-help">
              Optional — any terms specific to this deed, beyond what's already covered. Separate each clause with a
              blank line.
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={additionalClauses}
              onChange={(e) => setAdditionalClauses(e.target.value)}
              placeholder="e.g. Any special condition, easement, or right specific to this property"
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

        {step === 5 && (
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

        {step === 6 && (
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
                  subtitle={`${partyAName || `[${config.partyARole}]`} & ${partyBName || `[${config.partyBRole}]`}`}
                  causeTitleHtml={deedHtml}
                  sections={draftSections}
                />
                <FilingGuidance forum="subRegistrarRegistration" />
              </>
            ) : (
              <p className="step-help">Go back and pick a deed type first.</p>
            )}
          </div>
        )}
      </WizardShell>
    </div>
  );
}
