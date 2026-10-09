import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildAgreementHtml, buildAgreementClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, rentAgreementTypeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { formatDateOnly } from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = [
  'Agreement type',
  'Parties',
  'Premises',
  'Rent & deposit',
  'Term & termination',
  'Additional clauses',
  'Execution details',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-rent-agreement')!;
const raClauses = clauses.filter((c) => c.caseTypeId === 'ct-rent-agreement');
const clauseByCode = (code: string) => raClauses.find((c) => c.code === code)!;

interface RentTypeConfig {
  documentTitle: string;
  partyARole: string;
  partyBRole: string;
  /** "Rent" or "Licence Fee" — the heading and the word used through the payment clauses. */
  payNoun: string;
  isLicence: boolean;
  isCommercial: boolean;
  recitals: () => string[];
  purposePlaceholder: string;
  governingClauseCode: 'RA-01' | 'RA-02';
  caveat: string;
}

// Roles, recitals, a few clauses and the legal caveat genuinely differ per type — kept inline here,
// like ContractAgreementWizard/PropertyDeedWizard, rather than as mockData clauses.
const RENT_TYPE_CONFIGS: Record<string, RentTypeConfig> = {
  residential_rent: {
    documentTitle: 'RENT AGREEMENT',
    partyARole: 'Landlord',
    partyBRole: 'Tenant',
    payNoun: 'Rent',
    isLicence: false,
    isCommercial: false,
    recitals: () => [
      'The Landlord is the lawful owner of the premises described in this Agreement (the "Premises") and is desirous of letting out the Premises on rent for residential use.',
      'The Tenant has approached the Landlord to take the Premises on rent, and the Landlord has agreed to let out the Premises to the Tenant on the terms and conditions contained herein.',
    ],
    purposePlaceholder: 'e.g. residential use by the Tenant and the Tenant’s family',
    governingClauseCode: 'RA-01',
    caveat:
      'A lease from year to year, for a term exceeding one year, or reserving a yearly rent must be made by a registered instrument (Transfer of Property Act, 1882, Section 107; Registration Act, 1908, Section 17(1)(d)); other leases can be made without registration. That is why a residential rent agreement is commonly made for 11 months and signed on stamp paper rather than registered. Keep any renewal to a fresh written agreement — a clause that renews automatically can take the total term past one year and make registration compulsory. State law can add requirements: in Maharashtra, for example, every rent or leave-and-licence agreement must be in writing and registered whatever its length (Maharashtra Rent Control Act, 1999, Section 55). Stamp duty is state-specific and is not calculated here — check the rate for your state before executing. Where your state has a rent control or tenancy Act, its rules on rent, deposit and eviction apply on top of this agreement.',
  },
  commercial_rent: {
    documentTitle: 'COMMERCIAL RENT AGREEMENT',
    partyARole: 'Landlord',
    partyBRole: 'Tenant',
    payNoun: 'Rent',
    isLicence: false,
    isCommercial: true,
    recitals: () => [
      'The Landlord is the lawful owner of the premises described in this Agreement (the "Premises") and is desirous of letting out the Premises on rent for commercial use.',
      'The Tenant has approached the Landlord to take the Premises on rent for the purpose stated herein, and the Landlord has agreed to let out the Premises to the Tenant on the terms and conditions contained herein.',
    ],
    purposePlaceholder: 'e.g. use as the office of the Tenant’s software business',
    governingClauseCode: 'RA-01',
    caveat:
      'A lease from year to year, for a term exceeding one year, or reserving a yearly rent must be made by a registered instrument (Transfer of Property Act, 1882, Section 107; Registration Act, 1908, Section 17(1)(d)). Commercial tenancies are often for longer terms than residential ones, so check whether yours needs registration — and keep any renewal to a fresh written agreement, since a clause that renews automatically can take the total term past one year. In Maharashtra every rent or leave-and-licence agreement must be registered whatever its length (Maharashtra Rent Control Act, 1999, Section 55). GST on the rent and tax deducted at source may apply depending on the parties — take advice on those, which this draft only mentions in general terms. Stamp duty is state-specific and is not calculated here.',
  },
  leave_licence: {
    documentTitle: 'LEAVE AND LICENCE AGREEMENT',
    partyARole: 'Licensor',
    partyBRole: 'Licensee',
    payNoun: 'Licence Fee',
    isLicence: true,
    isCommercial: false,
    recitals: () => [
      'The Licensor is the lawful owner of the premises described in this Agreement (the "Premises") and is desirous of permitting the Licensee to occupy and use the Premises on leave and licence.',
      'The Licensee has requested the Licensor to grant a licence to occupy and use the Premises, and the Licensor has agreed to do so on the terms and conditions contained herein.',
    ],
    purposePlaceholder: 'e.g. residential use by the Licensee and the Licensee’s family',
    governingClauseCode: 'RA-02',
    caveat:
      'A licence is only a right to do something on another’s immovable property that would otherwise be unlawful, and it does not amount to an easement or an interest in the property (Indian Easements Act, 1882, Section 52) — which is what separates a leave and licence from a lease. The Licensee therefore does not become a tenant. Where the premises are in Maharashtra, every leave-and-licence agreement must be in writing and registered, and the responsibility for registering it is the landlord’s (Maharashtra Rent Control Act, 1999, Section 55). Other states may have their own rules, and courts look at the substance of an arrangement, not just its label. Stamp duty is state-specific and is not calculated here.',
  },
};

interface SavedContent {
  agreementType: string | null;
  partyAName: string;
  partyAAddress: string;
  partyBName: string;
  partyBAddress: string;
  premisesAddress: string;
  premisesDescription: string;
  premisesArea: string;
  furnishing: string;
  parking: string;
  purposeOfUse: string;
  monthlyRent: string;
  rentDueDay: string;
  paymentMode: string;
  annualIncrease: string;
  securityDeposit: string;
  depositRefundDays: string;
  maintenanceTerms: string;
  utilitiesTerms: string;
  commencementDate: string;
  termMonths: string;
  lockInMonths: string;
  noticeDays: string;
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

export function RentAgreementWizard({
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
  const [partyAName, setPartyAName] = useState(saved?.partyAName ?? '');
  const [partyAAddress, setPartyAAddress] = useState(saved?.partyAAddress ?? '');
  const [partyBName, setPartyBName] = useState(saved?.partyBName ?? '');
  const [partyBAddress, setPartyBAddress] = useState(saved?.partyBAddress ?? '');
  const [premisesAddress, setPremisesAddress] = useState(saved?.premisesAddress ?? '');
  const [premisesDescription, setPremisesDescription] = useState(saved?.premisesDescription ?? '');
  const [premisesArea, setPremisesArea] = useState(saved?.premisesArea ?? '');
  const [furnishing, setFurnishing] = useState(saved?.furnishing ?? '');
  const [parking, setParking] = useState(saved?.parking ?? '');
  const [purposeOfUse, setPurposeOfUse] = useState(saved?.purposeOfUse ?? '');
  const [monthlyRent, setMonthlyRent] = useState(saved?.monthlyRent ?? '');
  const [rentDueDay, setRentDueDay] = useState(saved?.rentDueDay ?? '');
  const [paymentMode, setPaymentMode] = useState(saved?.paymentMode ?? '');
  const [annualIncrease, setAnnualIncrease] = useState(saved?.annualIncrease ?? '');
  const [securityDeposit, setSecurityDeposit] = useState(saved?.securityDeposit ?? '');
  const [depositRefundDays, setDepositRefundDays] = useState(saved?.depositRefundDays ?? '');
  const [maintenanceTerms, setMaintenanceTerms] = useState(saved?.maintenanceTerms ?? '');
  const [utilitiesTerms, setUtilitiesTerms] = useState(saved?.utilitiesTerms ?? '');
  const [commencementDate, setCommencementDate] = useState(saved?.commencementDate ?? '');
  const [termMonths, setTermMonths] = useState(saved?.termMonths ?? '11');
  const [lockInMonths, setLockInMonths] = useState(saved?.lockInMonths ?? '');
  const [noticeDays, setNoticeDays] = useState(saved?.noticeDays ?? '');
  const [jurisdictionPlace, setJurisdictionPlace] = useState(saved?.jurisdictionPlace ?? '');
  const [additionalClauses, setAdditionalClauses] = useState(saved?.additionalClauses ?? '');
  const [executionDate, setExecutionDate] = useState(saved?.executionDate ?? '');
  const [executionPlace, setExecutionPlace] = useState(saved?.executionPlace ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const config = agreementType ? RENT_TYPE_CONFIGS[agreementType] : undefined;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      agreementType,
      partyAName,
      partyAAddress,
      partyBName,
      partyBAddress,
      premisesAddress,
      premisesDescription,
      premisesArea,
      furnishing,
      parking,
      purposeOfUse,
      monthlyRent,
      rentDueDay,
      paymentMode,
      annualIncrease,
      securityDeposit,
      depositRefundDays,
      maintenanceTerms,
      utilitiesTerms,
      commencementDate,
      termMonths,
      lockInMonths,
      noticeDays,
      jurisdictionPlace,
      additionalClauses,
      executionDate,
      executionPlace,
      [WIZARD_CASE_TYPE_KEY]: 'ct-rent-agreement',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${config?.documentTitle ?? 'Rent Agreement'} — ${partyAName || 'Party A'} & ${partyBName || 'Party B'}`,
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

  // ---------------------------------------------------------------- the drafted agreement
  const A = config?.partyARole ?? 'Landlord';
  const B = config?.partyBRole ?? 'Tenant';
  const pay = config?.payNoun ?? 'Rent';
  const payLower = pay.toLowerCase();
  const fmtDate = (d: string) => (d ? formatDateOnly(d) : '');
  // The user's own phrases are dropped into sentences — end each with a full stop if it has none.
  const endSentence = (text: string) => {
    const t = text.trim();
    return /[.!?]$/.test(t) ? t : `${t}.`;
  };

  const premisesLines = [
    premisesDescription && `Description: ${premisesDescription}`,
    premisesAddress && `Situated at: ${premisesAddress}`,
    premisesArea && `Area: ${premisesArea}`,
    furnishing && `Fixtures and fittings provided: ${furnishing}`,
    parking && `Parking: ${parking}`,
  ].filter(Boolean) as string[];

  const termText = termMonths
    ? `for a period of ${termMonths} month${termMonths === '1' ? '' : 's'}`
    : 'for a period of [number of] months';

  const lockInNone = lockInMonths.trim() === '0';
  const lockInText = lockInNone
    ? `There is no lock-in period under this Agreement. Either Party may terminate this Agreement by giving the other ${
        noticeDays || '[number of]'
      } days’ prior written notice.`
    : `Neither Party shall terminate this Agreement during the first ${
        lockInMonths || '[number of]'
      } months from the commencement date (the "Lock-in Period"), except for the other Party’s breach as provided in this Agreement. After the Lock-in Period, either Party may terminate this Agreement by giving the other ${
        noticeDays || '[number of]'
      } days’ prior written notice. If the ${B} vacates the Premises during the Lock-in Period other than for the ${A}’s breach, the ${B} shall pay the ${payLower} for the unexpired part of the Lock-in Period.`;

  const draftSections: DraftSection[] = config
    ? [
        {
          heading: config.isLicence ? 'Grant of licence and the Premises' : 'Letting and the Premises',
          paragraphs: [
            config.isLicence
              ? `The ${A} hereby grants to the ${B} a licence to occupy and use, for the term of this Agreement, the premises described below (the "Premises"), only for the following purpose: ${endSentence(
                  purposeOfUse || '[purpose of use]'
                )}`
              : `The ${A} hereby lets out to the ${B}, and the ${B} hereby takes on rent, for the term of this Agreement, the premises described below (the "Premises"), to be used only for the following purpose: ${endSentence(
                  purposeOfUse || '[purpose of use]'
                )}`,
            ...(premisesLines.length > 0
              ? premisesLines
              : ['[Description of the Premises — address, flat/shop number, floor, area, and fixtures and fittings]']),
          ],
          incomplete: premisesLines.length === 0 || !purposeOfUse,
        },
        ...(config.isLicence
          ? [
              {
                heading: 'Nature of the arrangement',
                paragraphs: [
                  `This Agreement creates only a licence to occupy and use the Premises. It does not create any lease or tenancy, or any interest in the Premises, in favour of the ${B}, and the ${A} retains legal possession of the Premises throughout. The ${B} shall not claim any right, title or interest in the Premises on the strength of this Agreement or of the ${B}’s occupation.`,
                ],
              },
            ]
          : []),
        {
          heading: 'Term',
          paragraphs: [
            `This Agreement shall commence on ${fmtDate(commencementDate) || '[commencement date]'} and shall remain in force ${termText}, unless terminated earlier in accordance with this Agreement. Any extension or renewal shall be only by a fresh written agreement between the Parties, on terms to be agreed at that time.`,
          ],
          incomplete: !commencementDate || !termMonths,
        },
        {
          heading: pay,
          paragraphs: [
            `The ${B} shall pay to the ${A} a monthly ${payLower} of ${monthlyRent || '[amount]'}, payable in advance on or before the ${
              rentDueDay || '[day]'
            } day of each calendar month${paymentMode ? `, by ${paymentMode}` : ''}.`,
            annualIncrease
              ? `The ${payLower} shall be increased by ${annualIncrease} on each anniversary of the commencement date.`
              : `The ${payLower} shall remain fixed for the term of this Agreement.`,
            ...(config.isCommercial
              ? [
                  'The rent is exclusive of goods and services tax (GST), if applicable, which shall be payable by the Tenant in addition. The Tenant shall deduct tax at source from the rent wherever the law requires and shall furnish the Landlord with the corresponding certificate.',
                ]
              : []),
          ],
          incomplete: !monthlyRent || !rentDueDay,
        },
        {
          heading: 'Security deposit',
          paragraphs: [
            `The ${B} has paid / shall pay to the ${A} an interest-free, refundable security deposit of ${
              securityDeposit || '[amount]'
            } as security for the due performance of this Agreement. The ${A} shall refund the deposit within ${
              depositRefundDays || '[number of]'
            } days after the ${B} hands back vacant possession of the Premises, after deducting any unpaid ${payLower}, unpaid charges for utilities, and the cost of making good any damage beyond ordinary wear and tear. The ${B} shall not adjust the deposit against the ${payLower} without the ${A}’s written consent.`,
          ],
          incomplete: !securityDeposit || !depositRefundDays,
        },
        {
          heading: 'Maintenance, utilities and outgoings',
          paragraphs: [
            (utilitiesTerms && endSentence(utilitiesTerms)) ||
              `The ${B} shall pay, on actuals and directly to the concerned authority or provider, all charges for electricity, water, gas, telephone and internet consumed at the Premises during the term.`,
            (maintenanceTerms && endSentence(maintenanceTerms)) ||
              '[Society / maintenance charges — state who pays and the amount, if any]',
            `The ${A} shall bear property tax and any other statutory levy on the Premises.`,
          ],
          incomplete: !maintenanceTerms,
        },
        {
          heading: 'Use of the Premises',
          paragraphs: [
            `The ${B} shall use the Premises only for the purpose stated above, shall not use it for any unlawful or objectionable purpose, shall not cause nuisance or annoyance to neighbours, and shall comply with the rules of any society or association governing the building.`,
          ],
        },
        {
          heading: 'Repairs and upkeep',
          paragraphs: [
            `The ${B} shall keep the Premises in good and tenantable condition, fair wear and tear excepted, and shall bear the cost of day-to-day minor repairs. Structural and major repairs, other than those needed because of the ${B}’s act or negligence, shall be the ${A}’s responsibility.`,
          ],
        },
        {
          heading: config.isLicence ? 'No assignment or alteration' : 'No sub-letting or alteration',
          paragraphs: [
            config.isLicence
              ? `The ${B} shall not assign the licence, share or part with possession of the Premises, or make any structural alteration or addition to the Premises without the ${A}’s prior written consent.`
              : `The ${B} shall not sub-let, assign or part with possession of the Premises, or make any structural alteration or addition to the Premises, without the ${A}’s prior written consent.`,
          ],
        },
        {
          heading: 'Inspection',
          paragraphs: [
            `The ${A} or the ${A}’s authorised representative may inspect the Premises at reasonable times after giving the ${B} reasonable prior notice.`,
          ],
        },
        {
          heading: 'Lock-in period and termination',
          paragraphs: [lockInText],
          incomplete: !noticeDays || (!lockInNone && !lockInMonths),
        },
        {
          heading: 'Default',
          paragraphs: [
            `If the ${B} fails to pay any instalment of the ${payLower} when due, or commits any other material breach of this Agreement, and does not cure it within 15 days after written notice from the ${A}, the ${A} may terminate this Agreement by written notice and take back possession of the Premises, without prejudice to the ${A}’s other rights and remedies.`,
          ],
        },
        {
          heading: 'Handing back possession',
          paragraphs: [
            `On the expiry or earlier termination of this Agreement, the ${B} shall vacate the Premises and hand over peaceful, vacant possession of it to the ${A}, together with all fixtures and fittings, in the same condition as at the commencement date, fair wear and tear excepted. Until possession is handed over, the ${B} shall continue to pay the ${payLower} and other charges under this Agreement.`,
          ],
        },
        {
          heading: 'Identity documents and compliance with law',
          paragraphs: [
            `The ${B} shall furnish the ${A} with copies of the ${B}’s identity documents and shall cooperate in any police verification or tenant registration required under the law or local rules in force for the Premises. Each Party shall comply with all laws applicable to the Premises and to this Agreement.`,
          ],
        },
        ...(additionalClauses.trim()
          ? [{ heading: 'Additional terms', paragraphs: splitIntoParagraphs(additionalClauses) }]
          : []),
        {
          heading: 'Governing law and dispute resolution',
          paragraphs: [fillTemplate(clauseByCode(config.governingClauseCode).bodyTemplate, { jurisdiction_place: jurisdictionPlace })],
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
        date: fmtDate(executionDate),
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

  const saveBlock = (label: string) =>
    user ? (
      <div style={{ marginTop: 'var(--space-4)' }}>
        <button className="para-btn" onClick={handleSaveDraft} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : caseId ? 'Update saved draft' : label}
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
    );

  const pickTypeFirst = <p className="step-help">Go back and pick an agreement type first.</p>;

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
            <h3 className="step-heading">What kind of agreement is this?</h3>
            <div className="grounds-grid">
              {rentAgreementTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={agreementType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setAgreementType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {config?.caveat && (
              <div className="deadline-card status-warn" style={{ maxWidth: 620, marginTop: 'var(--space-5)' }}>
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
                  <input
                    type="text"
                    value={partyAName}
                    onChange={(e) => setPartyAName(e.target.value)}
                    placeholder="e.g. Mr. Rajesh Kumar, S/o Mr. Mohan Kumar"
                  />
                </label>
                <label className="form-field">
                  <span>{config.partyARole} address</span>
                  <input type="text" value={partyAAddress} onChange={(e) => setPartyAAddress(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>{config.partyBRole} name</span>
                  <input
                    type="text"
                    value={partyBName}
                    onChange={(e) => setPartyBName(e.target.value)}
                    placeholder="e.g. Ms. Anita Sharma, D/o Mr. Suresh Sharma"
                  />
                </label>
                <label className="form-field">
                  <span>{config.partyBRole} permanent address</span>
                  <input type="text" value={partyBAddress} onChange={(e) => setPartyBAddress(e.target.value)} />
                </label>
              </div>
            ) : (
              pickTypeFirst
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Premises</h3>
            {config ? (
              <>
                <p className="step-help">The property being let out — this becomes the agreement's description of the Premises.</p>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Description</span>
                    <input
                      type="text"
                      value={premisesDescription}
                      onChange={(e) => setPremisesDescription(e.target.value)}
                      placeholder="e.g. Flat No. 302, third floor, Sunrise Apartments"
                    />
                  </label>
                  <label className="form-field">
                    <span>Full address</span>
                    <input
                      type="text"
                      value={premisesAddress}
                      onChange={(e) => setPremisesAddress(e.target.value)}
                      placeholder="Full postal address of the premises"
                    />
                  </label>
                  <label className="form-field">
                    <span>Area</span>
                    <input
                      type="text"
                      value={premisesArea}
                      onChange={(e) => setPremisesArea(e.target.value)}
                      placeholder="e.g. 850 sq. ft. carpet area"
                    />
                  </label>
                  <label className="form-field">
                    <span>Fixtures and fittings provided (optional)</span>
                    <input
                      type="text"
                      value={furnishing}
                      onChange={(e) => setFurnishing(e.target.value)}
                      placeholder="e.g. 3 ceiling fans, 2 air conditioners, modular kitchen — leave blank if unfurnished"
                    />
                  </label>
                  <label className="form-field">
                    <span>Parking (optional)</span>
                    <input
                      type="text"
                      value={parking}
                      onChange={(e) => setParking(e.target.value)}
                      placeholder="e.g. one covered car-parking slot"
                    />
                  </label>
                  <label className="form-field">
                    <span>Purpose of use</span>
                    <input
                      type="text"
                      value={purposeOfUse}
                      onChange={(e) => setPurposeOfUse(e.target.value)}
                      placeholder={config.purposePlaceholder}
                    />
                  </label>
                </div>
              </>
            ) : (
              pickTypeFirst
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">{config?.isLicence ? 'Licence fee & deposit' : 'Rent & deposit'}</h3>
            {config ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>Monthly {payLower}</span>
                  <input
                    type="text"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    placeholder="e.g. ₹25,000 (Rupees Twenty-Five Thousand only)"
                  />
                </label>
                <label className="form-field">
                  <span>Due on or before which day of the month</span>
                  <input
                    type="text"
                    value={rentDueDay}
                    onChange={(e) => setRentDueDay(e.target.value)}
                    placeholder="e.g. 5th"
                  />
                </label>
                <label className="form-field">
                  <span>Mode of payment (optional)</span>
                  <input
                    type="text"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    placeholder="e.g. bank transfer to the Landlord's account"
                  />
                </label>
                <label className="form-field">
                  <span>Annual increase (optional)</span>
                  <input
                    type="text"
                    value={annualIncrease}
                    onChange={(e) => setAnnualIncrease(e.target.value)}
                    placeholder="e.g. 5% — leave blank for no increase"
                  />
                </label>
                <label className="form-field">
                  <span>Security deposit</span>
                  <input
                    type="text"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="e.g. ₹75,000 (three months' rent)"
                  />
                </label>
                <label className="form-field">
                  <span>Deposit refunded within how many days of handing back possession</span>
                  <input
                    type="text"
                    value={depositRefundDays}
                    onChange={(e) => setDepositRefundDays(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </label>
                <label className="form-field">
                  <span>Society / maintenance charges</span>
                  <input
                    type="text"
                    value={maintenanceTerms}
                    onChange={(e) => setMaintenanceTerms(e.target.value)}
                    placeholder="e.g. The Tenant shall pay the monthly society maintenance charges of ₹2,500 directly to the society"
                  />
                </label>
                <label className="form-field">
                  <span>Utilities (optional — a standard clause is used if blank)</span>
                  <input
                    type="text"
                    value={utilitiesTerms}
                    onChange={(e) => setUtilitiesTerms(e.target.value)}
                    placeholder="Only if you want different wording from the standard clause"
                  />
                </label>
              </div>
            ) : (
              pickTypeFirst
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Term & termination</h3>
            {config ? (
              <div className="form-grid">
                <label className="form-field">
                  <span>Commencement date</span>
                  <input type="date" value={commencementDate} onChange={(e) => setCommencementDate(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Term (months)</span>
                  <input
                    type="text"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    placeholder="11"
                  />
                </label>
                <label className="form-field">
                  <span>Lock-in period (months; 0 for none)</span>
                  <input
                    type="text"
                    value={lockInMonths}
                    onChange={(e) => setLockInMonths(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </label>
                <label className="form-field">
                  <span>Notice period for termination (days)</span>
                  <input
                    type="text"
                    value={noticeDays}
                    onChange={(e) => setNoticeDays(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </label>
                <label className="form-field">
                  <span>Jurisdiction (place)</span>
                  <input
                    type="text"
                    value={jurisdictionPlace}
                    onChange={(e) => setJurisdictionPlace(e.target.value)}
                    placeholder="e.g. Delhi"
                  />
                </label>
              </div>
            ) : (
              pickTypeFirst
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">Additional clauses</h3>
            <p className="step-help">
              Optional — any terms specific to this arrangement, beyond what's already covered (for example pets, visitors,
              or house rules). Separate each clause with a blank line.
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={additionalClauses}
              onChange={(e) => setAdditionalClauses(e.target.value)}
              placeholder="e.g. The Tenant shall not keep pets in the Premises without the Landlord's written consent."
            />
            {saveBlock('Save this case')}
          </div>
        )}

        {step === 6 && (
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

        {step === 7 && (
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
                  causeTitleHtml={agreementHtml}
                  sections={draftSections}
                />
                <div className="deadline-card status-warn" style={{ maxWidth: 720, marginTop: 'var(--space-5)' }}>
                  <p className="deadline-label">Before you sign</p>
                  <p className="deadline-body">{config.caveat}</p>
                </div>
                <FilingGuidance forum="subRegistrarRegistration" />
              </>
            ) : (
              pickTypeFirst
            )}
          </div>
        )}
      </WizardShell>
    </div>
  );
}
