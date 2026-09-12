import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { caseTypes } from '../data/mockData';
import { districtCourtStates, districtCourtDistrictsByState } from '../data/districtCourtLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-suit-foreclosure-mortgage')!;

type MortgageType = 'conditional_sale_or_foreclosure_anomalous' | 'simple_or_other';

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  plaintiffName: string;
  plaintiffAge: string;
  plaintiffAddress: string;
  defendantName: string;
  defendantAddress: string;
  mortgageDeedDetails: string;
  propertyDescription: string;
  principalAmount: string;
  mortgageType: MortgageType;
  amountDue: string;
  moneyDueDate: string;
  factsNarrative: string;
  suitValuation: string;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  filingDate: string;
  verificationPlace: string;
  documentEntries: DocEntry[];
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'State',
  'District court',
  'The mortgage',
  'Type of mortgage',
  'Facts & limitation',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function ForeclosureMortgageSuitWizard({
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
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [districtId, setDistrictId] = useState(saved?.districtId ?? '');
  const [plaintiffName, setPlaintiffName] = useState(saved?.plaintiffName ?? '');
  const [plaintiffAge, setPlaintiffAge] = useState(saved?.plaintiffAge ?? '');
  const [plaintiffAddress, setPlaintiffAddress] = useState(saved?.plaintiffAddress ?? '');
  const [defendantName, setDefendantName] = useState(saved?.defendantName ?? '');
  const [defendantAddress, setDefendantAddress] = useState(saved?.defendantAddress ?? '');
  const [mortgageDeedDetails, setMortgageDeedDetails] = useState(saved?.mortgageDeedDetails ?? '');
  const [propertyDescription, setPropertyDescription] = useState(saved?.propertyDescription ?? '');
  const [principalAmount, setPrincipalAmount] = useState(saved?.principalAmount ?? '');
  const [mortgageType, setMortgageType] = useState<MortgageType>(saved?.mortgageType ?? 'simple_or_other');
  const [amountDue, setAmountDue] = useState(saved?.amountDue ?? '');
  const [moneyDueDate, setMoneyDueDate] = useState(saved?.moneyDueDate ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [suitValuation, setSuitValuation] = useState(saved?.suitValuation ?? '');
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [advocateAddress, setAdvocateAddress] = useState(saved?.advocateAddress ?? '');
  const [advocatePhone, setAdvocatePhone] = useState(saved?.advocatePhone ?? '');
  const [advocateEmail, setAdvocateEmail] = useState(saved?.advocateEmail ?? '');
  const [filingPlace, setFilingPlace] = useState(saved?.filingPlace ?? '');
  const [filingDate, setFilingDate] = useState(saved?.filingDate ?? '');
  const [verificationPlace, setVerificationPlace] = useState(saved?.verificationPlace ?? '');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>(saved?.documentEntries ?? []);
  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);
  const [judgeStyleProfile, setJudgeStyleProfile] = useState<JudgeStyleProfile | null>(null);

  const selectedState = districtCourtStates.find((s) => s.id === stateId);
  const districts = stateId ? districtCourtDistrictsByState[stateId] ?? [] : [];
  const selectedDistrict = districts.find((d) => d.id === districtId);
  const isForeclosure = mortgageType === 'conditional_sale_or_foreclosure_anomalous';

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      districtId,
      plaintiffName,
      plaintiffAge,
      plaintiffAddress,
      defendantName,
      defendantAddress,
      mortgageDeedDetails,
      propertyDescription,
      principalAmount,
      mortgageType,
      amountDue,
      moneyDueDate,
      factsNarrative,
      suitValuation,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-suit-foreclosure-mortgage',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Suit for ${isForeclosure ? 'Foreclosure' : 'Sale'} of Mortgaged Property`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-suit-foreclosure-mortgage');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [plaintiffName || '[Plaintiff]', '(PLAINTIFF)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'The mortgage',
      paragraphs: [
        toThatClause(
          `by ${
            mortgageDeedDetails.trim() || '[mortgage deed details — date, type of mortgage, registration number]'
          }, the Defendant mortgaged to the Plaintiff the property described as ${
            propertyDescription.trim() || '[describe the mortgaged property]'
          }, to secure repayment of a principal sum of ${principalAmount.trim() || '[principal amount]'}`
        ),
      ],
      incomplete: !mortgageDeedDetails.trim() || !propertyDescription.trim(),
    },
    {
      heading: 'Facts',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe the circumstances of default — when the mortgage-money fell due, and how the Defendant has failed to repay it despite demand]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: isForeclosure ? 'Right to foreclosure' : 'Right to sale',
      paragraphs: [
        toThatClause(
          isForeclosure
            ? `the mortgage is a mortgage by conditional sale/an anomalous mortgage under which the Plaintiff is entitled to foreclose, the mortgage-money of ${
                amountDue.trim() || '[amount due]'
              } has become due and remains unpaid, and the Plaintiff is entitled, under Section 67 of the Transfer of Property Act, 1882, to a decree that the Defendant be absolutely debarred of his right to redeem the said property`
            : `the mortgage-money of ${
                amountDue.trim() || '[amount due]'
              } has become due and remains unpaid despite demand, and the Plaintiff is entitled, under Section 67 of the Transfer of Property Act, 1882, to a decree that the said property be sold and the sale proceeds applied towards satisfaction of the amount due, with the Defendant remaining liable for any balance`
        ),
      ],
      incomplete: !amountDue.trim(),
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Limitation',
      paragraphs: [
        toThatClause(
          isForeclosure
            ? `this suit is filed within thirty years of ${
                moneyDueDate ? new Date(moneyDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date the money became due]'
              }, being the date the mortgage-money became due, and is therefore within the time prescribed by Article 63 of the Limitation Act, 1963`
            : `this suit is filed within twelve years of ${
                moneyDueDate ? new Date(moneyDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date the money became due]'
              }, being the date the mortgage-money became due, and is therefore within the time prescribed by Article 62 of the Limitation Act, 1963`
        ),
      ],
      incomplete: !moneyDueDate,
    },
    {
      heading: 'Valuation',
      paragraphs: [
        toThatClause(
          `the suit is valued at ${
            suitValuation.trim() || '[state the valuation]'
          } for the purposes of court fee and jurisdiction, and the requisite court fee has been paid thereon`
        ),
      ],
      incomplete: !suitValuation.trim(),
    },
    {
      heading: 'Prayer',
      paragraphs: [
        isForeclosure
          ? `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree that, unless the Defendant pays into Court the sum of ${
              amountDue.trim() || '[amount due]'
            } together with interest and costs within such period as this Hon'ble Court may fix, the Defendant shall be absolutely debarred of his right to redeem the mortgaged property, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`
          : `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree that, unless the Defendant pays into Court the sum of ${
              amountDue.trim() || '[amount due]'
            } together with interest and costs within such period as this Hon'ble Court may fix, the mortgaged property be sold and the sale proceeds applied towards satisfaction of the amount due, with the Defendant remaining personally liable for any balance, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(plaintiffName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: plaintiffName,
    respondentName: defendantName,
    benchCity: selectedDistrict?.label,
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
        `${plaintiffName || '[Plaintiff]'} aged about ${plaintiffAge || '[age]'}, R/o ${
          plaintiffAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Plaintiff in the present suit, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying plaint has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        ← Back to all filings
      </button>
      <WizardShell
        title={isForeclosure ? 'Suit for Foreclosure of Mortgaged Property' : 'Suit for Sale of Mortgaged Property'}
        governingLaw={caseType.governingLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">Which state is the suit in?</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label="State"
              helpText="The district list depends on the state you pick."
              verifyNote="State list is stable and complete. District-level detail for the chosen state is shown next —"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which district court?</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label="District"
                helpText={`Districts of ${selectedState.label}. Territorial jurisdiction follows where the mortgaged property is situated, or where the Defendant resides/carries on business.`}
                verifyNote="District list sourced from current public records — district boundaries are occasionally revised by state notification; confirm the correct court at"
                verifyUrl="https://ecourts.gov.in"
                searchPlaceholder="Type a district…"
              />
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">The mortgage and parties</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Plaintiff (mortgagee)' : 'Your name'}</span>
                <input type="text" value={plaintiffName} onChange={(e) => setPlaintiffName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Plaintiff's age</span>
                <input type="text" value={plaintiffAge} onChange={(e) => setPlaintiffAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Plaintiff's address</span>
                <input type="text" value={plaintiffAddress} onChange={(e) => setPlaintiffAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Defendant (mortgagor)' : 'Other party'}</span>
                <input type="text" value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Defendant's address</span>
                <input type="text" value={defendantAddress} onChange={(e) => setDefendantAddress(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Mortgage deed details (date, registration number)</span>
              <input type="text" value={mortgageDeedDetails} onChange={(e) => setMortgageDeedDetails(e.target.value)} />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Description of the mortgaged property</span>
              <textarea className="facts-textarea" rows={3} value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 320 }}>
              <span>Principal amount secured by the mortgage</span>
              <input type="text" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} placeholder="₹" />
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">What type of mortgage is this?</h3>
            <p className="step-help">
              This matters a lot — under Section 67 of the Transfer of Property Act, 1882, you are entitled to only
              ONE of these two reliefs, never both, depending on the mortgage type. Check the mortgage deed's own
              wording carefully before choosing.
            </p>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="mortgage-type"
                    checked={mortgageType === 'simple_or_other'}
                    onChange={() => setMortgageType('simple_or_other')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  Simple mortgage, English/registered mortgage, or equitable mortgage by deposit of title deeds —
                  you're entitled to a suit for SALE
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="mortgage-type"
                    checked={mortgageType === 'conditional_sale_or_foreclosure_anomalous'}
                    onChange={() => setMortgageType('conditional_sale_or_foreclosure_anomalous')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  Mortgage by conditional sale, or an anomalous mortgage whose deed itself gives a right to foreclose
                  — you're entitled to a suit for FORECLOSURE
                </span>
              </label>
            </div>
            <p className="step-help">
              An usufructuary mortgagee (whose only right is to retain possession and collect rents/profits until
              repaid) gets neither remedy under this section — if that's your situation, this wizard isn't the
              right fit.
            </p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Facts, amount due, and limitation</h3>
            <label className="form-field">
              <span>Facts — circumstances of the mortgage and the default</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe when the mortgage-money fell due, and how the Defendant has failed to repay it despite demand"
              />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>Amount now due</span>
                <input type="text" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} placeholder="₹" />
              </label>
              <label className="form-field">
                <span>Date the mortgage-money became due</span>
                <input type="date" value={moneyDueDate} onChange={(e) => setMoneyDueDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Suit valuation (for court fee)</span>
                <input type="text" value={suitValuation} onChange={(e) => setSuitValuation(e.target.value)} placeholder="₹" />
              </label>
            </div>
            <p className="step-help">
              {isForeclosure
                ? 'A foreclosure suit has a generous 30-year limitation period (Article 63, Limitation Act, 1963) — but do not delay filing simply because you can.'
                : 'A suit for sale must be filed within 12 years of the money becoming due (Article 62, Limitation Act, 1963) — noticeably shorter than foreclosure’s 30 years.'}
            </p>
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
              <label className="form-field">
                <span>Place of verification</span>
                <input type="text" value={verificationPlace} onChange={(e) => setVerificationPlace(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">
              Add each document you're annexing — typically a copy of the mortgage deed and proof of the demand for
              repayment — in the order it will be paginated.
            </p>
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
            <p className="step-help">A filed suit is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Suit for Foreclosure/Sale of Mortgaged Property — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Plaint</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Suit for ${isForeclosure ? 'Foreclosure' : 'Sale'} of Mortgaged Property — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Suit for Foreclosure/Sale of Mortgaged Property — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="districtCourt" contextLabel={selectedDistrict?.label} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Do you want to match your draft with a particular style?
              </p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, or to follow a sample application's format, go to the next
                step and upload it there — that's a paid, on-demand feature, not included by default.
              </p>
            </div>
          </div>
        )}

        {step === 8 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
