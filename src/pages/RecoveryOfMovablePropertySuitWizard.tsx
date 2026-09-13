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

const caseType = caseTypes.find((ct) => ct.id === 'ct-suit-recovery-movable-property')!;

const S8_GROUNDS = [
  { key: 'agentOrTrustee', label: 'The Defendant holds it as my agent or trustee (S.8(a))' },
  { key: 'moneyInadequate', label: 'Money compensation would not adequately replace this specific item (S.8(b))' },
  { key: 'damageHardToAscertain', label: 'The actual damage from its loss would be extremely difficult to ascertain (S.8(c))' },
  { key: 'wrongfullyTransferred', label: 'Its possession was wrongfully transferred away from me (S.8(d))' },
] as const;

type S8GroundKey = (typeof S8_GROUNDS)[number]['key'];

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
  entitlementNarrative: string;
  selectedS8Grounds: S8GroundKey[];
  possessionNarrative: string;
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
  'The property',
  'Grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function RecoveryOfMovablePropertySuitWizard({
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
  const [entitlementNarrative, setEntitlementNarrative] = useState(saved?.entitlementNarrative ?? '');
  const [selectedS8Grounds, setSelectedS8Grounds] = useState<S8GroundKey[]>(saved?.selectedS8Grounds ?? []);
  const toggleS8Ground = (key: S8GroundKey) =>
    setSelectedS8Grounds((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  const [possessionNarrative, setPossessionNarrative] = useState(saved?.possessionNarrative ?? '');
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
      entitlementNarrative,
      selectedS8Grounds,
      possessionNarrative,
      suitValuation,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-suit-recovery-movable-property',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Recovery of Movable Property`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-suit-recovery-movable-property');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [plaintiffName || '[Plaintiff]', '(PLAINTIFF)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const s8GroundLabels = S8_GROUNDS.filter((g) => selectedS8Grounds.includes(g.key)).map((g) => g.label);

  const draftSections: DraftSection[] = [
    {
      heading: 'The property',
      paragraphs: [
        toThatClause(
          `the Plaintiff is entitled to the possession of the following specific movable property, presently in the possession of the Defendant: ${
            propertyDescription.trim() || '[describe the specific item — make, model, distinguishing features, or other identifying particulars]'
          }`
        ),
      ],
      incomplete: !propertyDescription.trim(),
    },
    {
      heading: "The Plaintiff's entitlement",
      paragraphs: [
        toThatClause(
          entitlementNarrative.trim() ||
            '[Describe the basis of the Plaintiff\'s right to possession — ownership, a special or temporary right, or a beneficial interest as a trust beneficiary]'
        ),
      ],
      incomplete: !entitlementNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'How the Defendant came to possess it, and grounds for specific delivery',
      paragraphs: [
        toThatClause(
          `${
            possessionNarrative.trim() || '[Describe how and when the Defendant came into possession of the property, and why the Plaintiff wants the property returned rather than accept compensation]'
          }${
            s8GroundLabels.length > 0
              ? `; further, under section 8 of the Specific Relief Act, 1963, the Defendant is liable to deliver the property specifically because: ${s8GroundLabels.join('; ')}`
              : ''
          }`
        ),
      ],
      incomplete: !possessionNarrative.trim(),
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
            suitValuation.trim() || '[state the valuation, based on the value of the property]'
          } for the purposes of court fee and jurisdiction, and the requisite court fee has been paid thereon`
        ),
      ],
      incomplete: !suitValuation.trim(),
    },
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to direct the Defendant to specifically deliver to the Plaintiff the movable property described above, or, in the alternative, to pay its value as may be assessed by this Hon'ble Court, together with damages for its wrongful detention, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
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
                helpText={`Districts of ${selectedState.label}.`}
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
            <h3 className="step-heading">The property and parties</h3>
            <label className="form-field">
              <span>Describe the property</span>
              <textarea className="facts-textarea" rows={3} value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} placeholder="e.g. one Maruti Suzuki Swift, Registration No. DL-01-AB-1234, Chassis No. ..." />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>What is your entitlement to it?</span>
              <textarea className="facts-textarea" rows={3} value={entitlementNarrative} onChange={(e) => setEntitlementNarrative(e.target.value)} placeholder="e.g. I am the registered owner, having purchased it on ... under invoice/sale deed dated ..." />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Plaintiff' : 'Your name'}</span>
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
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Possession and grounds for specific delivery</h3>
            <label className="form-field">
              <span>How did the Defendant come to possess it, and why do you want the item itself back?</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={possessionNarrative}
                onChange={(e) => setPossessionNarrative(e.target.value)}
                placeholder="Describe how and when the Defendant took/retained possession, and why money compensation wouldn't be an adequate substitute for this specific item"
              />
            </label>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              Select any of the following that apply — these strengthen your case for the Court ordering specific
              delivery of the item itself, under Section 8, rather than leaving you to a money decree.
            </p>
            <div className="form-grid">
              {S8_GROUNDS.map((g) => (
                <label className="form-field" key={g.key}>
                  <span>
                    <input
                      type="checkbox"
                      checked={selectedS8Grounds.includes(g.key)}
                      onChange={() => toggleS8Ground(g.key)}
                      style={{ marginRight: 'var(--space-2)' }}
                    />
                    {g.label}
                  </span>
                </label>
              ))}
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

        {step === 4 && (
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
                <span>Suit valuation (for court fee)</span>
                <input type="text" value={suitValuation} onChange={(e) => setSuitValuation(e.target.value)} placeholder="₹" />
              </label>
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

        {step === 5 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">
              Add each document you're annexing — typically proof of ownership/entitlement, and any correspondence
              demanding return of the property — in the order it will be paginated.
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
            <p className="step-help">A filed suit is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Suit for Recovery of Specific Movable Property — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Plaint</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Suit for Recovery of Specific Movable Property — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Suit for Recovery of Specific Movable Property — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

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

        {step === 7 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
