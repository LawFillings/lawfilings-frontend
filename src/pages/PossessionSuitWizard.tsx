import { useMemo, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  withPeriod,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { findPossessionCitations, buildCitationParagraphs } from '../lib/actReferenceMatcher';
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
import '../components/DeadlineCalculator.css';

const caseType = caseTypes.find((ct) => ct.id === 'ct-suit-possession')!;

type Basis = 'title' | 'prior_possession' | 'tenant_eviction';

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
  propertyDescription: string;
  basis: Basis | null;
  dispossessionDate: string;
  noticeToQuitDate: string;
  tenancyType: 'monthly' | 'yearly' | null;
  factsNarrative: string;
  reliefSought: string;
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
  'Parties & property',
  'Basis for possession',
  'Facts & relief',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

const BASIS_OPTIONS: { id: Basis; label: string }[] = [
  { id: 'title', label: "You have title to the property, but the Defendant is wrongfully occupying it" },
  { id: 'prior_possession', label: 'You were in possession and were wrongfully dispossessed within the last 6 months' },
  { id: 'tenant_eviction', label: 'The Defendant is your tenant, whose lease/tenancy has ended and who will not vacate' },
];

export function PossessionSuitWizard({
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
  const [propertyDescription, setPropertyDescription] = useState(saved?.propertyDescription ?? '');
  const [basis, setBasis] = useState<Basis | null>(saved?.basis ?? null);
  const [dispossessionDate, setDispossessionDate] = useState(saved?.dispossessionDate ?? '');
  const [noticeToQuitDate, setNoticeToQuitDate] = useState(saved?.noticeToQuitDate ?? '');
  const [tenancyType, setTenancyType] = useState<'monthly' | 'yearly' | null>(saved?.tenancyType ?? null);
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [reliefSought, setReliefSought] = useState(saved?.reliefSought ?? '');
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

  // Section 6(2) SRA's 6-month window is strict and not extendable under the Limitation Act —
  // mirrors DeadlineCalculator.tsx's own safe/warn/danger banding, computed inline here since this
  // is keyed off a user-picked "basis", not a CaseType.deadlineSource.
  const daysSinceDispossession = useMemo(() => {
    if (!dispossessionDate) return null;
    const then = new Date(dispossessionDate);
    const today = new Date();
    return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
  }, [dispossessionDate]);
  const SIX_MONTHS_DAYS = 183;
  const dispossessionBand: 'safe' | 'warn' | 'danger' | null =
    daysSinceDispossession === null ? null : daysSinceDispossession > SIX_MONTHS_DAYS ? 'danger' : daysSinceDispossession > 150 ? 'warn' : 'safe';

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
      propertyDescription,
      basis,
      dispossessionDate,
      noticeToQuitDate,
      tenancyType,
      factsNarrative,
      reliefSought,
      suitValuation,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-suit-possession',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Suit for Possession`,
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

  const citationMatches = findPossessionCitations({
    basedOnTitle: basis === 'title',
    basedOnPriorPossession: basis === 'prior_possession',
    tenantHoldingOver: basis === 'tenant_eviction',
  });

  const groundsParagraph = (() => {
    if (basis === 'title') {
      return "the Plaintiff has a better title to the suit property than the Defendant, and is accordingly entitled to recover possession of it in the manner provided by the Code of Civil Procedure, 1908, within the meaning of Section 5 of the Specific Relief Act, 1963";
    }
    if (basis === 'prior_possession') {
      return `the Plaintiff was in settled possession of the suit property and was dispossessed of it without the Plaintiff's consent and otherwise than in due course of law on ${
        dispossessionDate || '[date]'
      }, and this suit is filed within six months of that dispossession, within the meaning of Section 6 of the Specific Relief Act, 1963`;
    }
    if (basis === 'tenant_eviction') {
      return `the Defendant's tenancy over the suit property, being ${
        tenancyType === 'yearly' ? 'a tenancy from year to year' : 'a tenancy from month to month'
      }, was determined by a notice to quit dated ${
        noticeToQuitDate || '[date]'
      } duly served on the Defendant under Section 106 of the Transfer of Property Act, 1882, and the lease accordingly stands determined under Section 111(h) of that Act, but the Defendant has failed and neglected to vacate and hand over vacant possession`;
    }
    return '[Select the basis on which possession is claimed]';
  })();

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
      heading: 'Particulars of the parties and the property',
      paragraphs: [
        toThatClause(
          `the Plaintiff, ${withPeriod(plaintiffName || '[Plaintiff]')}, seeks recovery of possession of ${
            propertyDescription.trim() || '[describe the property]'
          }, presently in the occupation of the Defendant, ${withPeriod(defendantName || '[Defendant]')}.`
        ),
      ],
      incomplete: !propertyDescription.trim(),
    },
    {
      heading: 'Facts constituting the cause of action',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe the facts leading to this suit]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds for recovery of possession',
      paragraphs: [toThatClause(groundsParagraph)],
      incomplete: basis === null,
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree for possession directing the Defendant to hand over vacant and peaceful possession of the suit property to the Plaintiff${
          reliefSought.trim() ? `, and ${reliefSought.trim()}` : ''
        }, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
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
        `${withPeriod(plaintiffName || '[Plaintiff]')} aged about ${plaintiffAge || '[age]'}, R/o ${
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
                helpText={`Districts of ${selectedState.label}. A possession suit over immovable property is filed where the property is situated.`}
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
            <h3 className="step-heading">Parties and the property</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Plaintiff' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Plaintiff in this case)</span>
                  )}
                </span>
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
                <span>{mode === 'advocate' ? 'Defendant' : 'Other party'}</span>
                <input type="text" value={defendantName} onChange={(e) => setDefendantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Defendant's address</span>
                <input type="text" value={defendantAddress} onChange={(e) => setDefendantAddress(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Describe the property</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={propertyDescription}
                onChange={(e) => setPropertyDescription(e.target.value)}
                placeholder="e.g. the residential property bearing House No. 22, Model Town, along with its appurtenant land"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Basis for possession</h3>
            <p className="step-help">Pick whichever fits — this changes what the wizard asks next and what's cited.</p>
            <div className="grounds-grid">
              {BASIS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={basis === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setBasis(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {basis === 'prior_possession' && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <label className="field-label" htmlFor="dispossession-date">
                  Date of dispossession
                </label>
                <input
                  id="dispossession-date"
                  type="date"
                  className="date-input"
                  value={dispossessionDate}
                  onChange={(e) => setDispossessionDate(e.target.value)}
                />
                {dispossessionBand && (
                  <div className={`deadline-card status-${dispossessionBand}`} style={{ marginTop: 'var(--space-4)', maxWidth: 480 }}>
                    <p className="deadline-label">
                      {dispossessionBand === 'danger'
                        ? 'Likely time-barred'
                        : dispossessionBand === 'warn'
                          ? 'Close to the six-month limit'
                          : 'Within the six-month window'}
                    </p>
                    <p className="deadline-body">
                      {daysSinceDispossession} days have passed since dispossession. Section 6(2) of the Specific
                      Relief Act, 1963 bars this suit after six months from the date of dispossession — this limit is
                      strict and not extendable, unlike ordinary limitation periods.
                      {dispossessionBand === 'danger' && ' File the title-based suit under Section 5 instead — go back and change the basis above.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {basis === 'tenant_eviction' && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <h3 className="step-heading" style={{ fontSize: '17px' }}>
                  Tenancy and notice to quit
                </h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Type of tenancy</span>
                    <select
                      value={tenancyType ?? ''}
                      onChange={(e) => setTenancyType((e.target.value || null) as 'monthly' | 'yearly' | null)}
                    >
                      <option value="">Select…</option>
                      <option value="monthly">Month to month (non-agricultural purpose)</option>
                      <option value="yearly">Year to year (agricultural/manufacturing purpose)</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Date of notice to quit</span>
                    <input type="date" value={noticeToQuitDate} onChange={(e) => setNoticeToQuitDate(e.target.value)} />
                  </label>
                </div>
                <p className="step-help">
                  Under Section 106 of the Transfer of Property Act, 1882, a monthly tenancy needs 15 days' notice, a
                  yearly tenancy needs 6 months' notice — each expiring with the end of a month/year of the tenancy.
                  If a state Rent Control Act applies to this tenancy, its own eviction grounds and procedure govern
                  instead — confirm which regime applies before relying on this alone.
                </p>
              </div>
            )}

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
            <h3 className="step-heading">Facts and relief</h3>
            <label className="form-field">
              <span>Facts constituting the cause of action</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the events leading to this suit, in chronological order"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Any further relief sought, beyond possession (optional)</span>
              <textarea
                className="facts-textarea"
                rows={2}
                value={reliefSought}
                onChange={(e) => setReliefSought(e.target.value)}
                placeholder="e.g. 'the Defendant be directed to pay mesne profits at the rate of Rs. 20,000 per month from the date of the suit until delivery of possession'"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 320 }}>
              <span>Suit valuation (for court fee)</span>
              <input type="text" value={suitValuation} onChange={(e) => setSuitValuation(e.target.value)} placeholder="₹" />
            </label>
            <p className="step-help">
              Court fee for a possession suit is usually ad valorem — on the property's market value, or on annual
              rental value for a tenancy — depending on your state's Court Fees Act. Use the Court Fee Calculator on
              this platform, or confirm with the filing registry.
            </p>
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
            <DraftDocument title="Suit for Possession — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Plaint</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Suit for Possession — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Suit for Possession — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

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
