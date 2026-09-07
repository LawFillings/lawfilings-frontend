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
  withPeriod,
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-suit-declaration')!;

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
  legalCharacterOrRight: string;
  seekingFurtherRelief: 'yes' | 'no' | null;
  furtherReliefSought: string;
  noFurtherReliefReason: string;
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
  'Parties & right claimed',
  'Consequential relief',
  'Facts',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function DeclarationSuitWizard({
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
  const [legalCharacterOrRight, setLegalCharacterOrRight] = useState(saved?.legalCharacterOrRight ?? '');
  const [seekingFurtherRelief, setSeekingFurtherRelief] = useState<'yes' | 'no' | null>(saved?.seekingFurtherRelief ?? null);
  const [furtherReliefSought, setFurtherReliefSought] = useState(saved?.furtherReliefSought ?? '');
  const [noFurtherReliefReason, setNoFurtherReliefReason] = useState(saved?.noFurtherReliefReason ?? '');
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
      legalCharacterOrRight,
      seekingFurtherRelief,
      furtherReliefSought,
      noFurtherReliefReason,
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
      [WIZARD_CASE_TYPE_KEY]: 'ct-suit-declaration',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Suit for Declaration`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-suit-declaration');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [plaintiffName || '[Plaintiff]', '(PLAINTIFF)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const declarationPrayerClause = `it is declared that the Plaintiff is ${
    legalCharacterOrRight.trim() || '[state the legal character or right claimed]'
  }`;
  const furtherReliefPrayerClause =
    seekingFurtherRelief === 'yes' && furtherReliefSought.trim() ? `, and that ${furtherReliefSought.trim()}` : '';

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the parties and the right claimed',
      paragraphs: [
        toThatClause(
          `the Plaintiff, ${withPeriod(plaintiffName || '[Plaintiff]')}, is ${
            legalCharacterOrRight.trim() || '[describe the legal character or right claimed]'
          }, which title/right the Defendant, ${withPeriod(defendantName || '[Defendant]')}, denies, or is interested to deny.`
        ),
      ],
      incomplete: !legalCharacterOrRight.trim(),
    },
    {
      heading: 'Facts constituting the cause of action',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe the facts leading to this suit]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Consequential relief',
      paragraphs: [
        toThatClause(
          seekingFurtherRelief === 'yes'
            ? `the Plaintiff, being able to seek further relief than a mere declaration of title, also seeks ${
                furtherReliefSought.trim() || '[state the further relief sought]'
              }, in compliance with the proviso to Section 34 of the Specific Relief Act, 1963`
            : seekingFurtherRelief === 'no'
              ? `the Plaintiff is not able to seek any further relief than a mere declaration of title, ${
                  noFurtherReliefReason.trim() || '[explain why no further relief is available or necessary]'
                }, and this suit is therefore maintainable as a suit for a bare declaration under Section 34 of the Specific Relief Act, 1963`
              : '[Answer whether further relief beyond a mere declaration is being sought]'
        ),
      ],
      incomplete: seekingFurtherRelief === null,
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree whereby ${declarationPrayerClause}${furtherReliefPrayerClause}, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
      incomplete: !legalCharacterOrRight.trim(),
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
                helpText={`Districts of ${selectedState.label}. Territorial jurisdiction follows where the defendant resides/carries on business, or where the property/cause of action is situated.`}
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
            <h3 className="step-heading">Parties and the right claimed</h3>
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
              <span>What legal character, status, or right does the Plaintiff want declared?</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={legalCharacterOrRight}
                onChange={(e) => setLegalCharacterOrRight(e.target.value)}
                placeholder="e.g. the sole and absolute owner of the immovable property bearing Plot No. 45, Sector 12, by virtue of the registered sale deed dated ..."
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Consequential relief</h3>
            <p className="step-help">
              Section 34's proviso bars a bare declaration where the Plaintiff is able to seek further relief — such as
              possession, injunction, or recovery — and omits to do so. Answer carefully; this is a common ground on
              which declaration suits are dismissed.
            </p>
            <div className="grounds-grid">
              <button
                className={seekingFurtherRelief === 'yes' ? 'ground-card active' : 'ground-card'}
                onClick={() => setSeekingFurtherRelief('yes')}
              >
                Yes — I can and will seek further relief in this same suit
              </button>
              <button
                className={seekingFurtherRelief === 'no' ? 'ground-card active' : 'ground-card'}
                onClick={() => setSeekingFurtherRelief('no')}
              >
                No — a bare declaration is all that's available or needed
              </button>
            </div>
            {seekingFurtherRelief === 'yes' && (
              <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                <span>What further relief are you seeking, along with the declaration?</span>
                <textarea
                  className="facts-textarea"
                  rows={3}
                  value={furtherReliefSought}
                  onChange={(e) => setFurtherReliefSought(e.target.value)}
                  placeholder="e.g. 'possession of the suit property be also handed over to the Plaintiff'"
                />
              </label>
            )}
            {seekingFurtherRelief === 'no' && (
              <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
                <span>Why is a bare declaration all that's available or needed?</span>
                <textarea
                  className="facts-textarea"
                  rows={3}
                  value={noFurtherReliefReason}
                  onChange={(e) => setNoFurtherReliefReason(e.target.value)}
                  placeholder="e.g. 'since the Plaintiff is already in settled possession of the suit property and no further relief is presently necessary'"
                />
              </label>
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
            <h3 className="step-heading">Facts</h3>
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
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 320 }}>
              <span>Suit valuation (for court fee)</span>
              <input type="text" value={suitValuation} onChange={(e) => setSuitValuation(e.target.value)} placeholder="₹" />
            </label>
            <p className="step-help">
              Court fee for a declaration suit depends on your state's Court Fees Act and whether further relief is
              also claimed — often a fixed fee for a bare declaration, ad valorem when combined with further relief
              like possession. Use the Court Fee Calculator on this platform, or confirm with the filing registry.
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
            <DraftDocument title="Suit for Declaration — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Plaint</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the District Court, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Suit for Declaration — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Suit for Declaration — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

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
