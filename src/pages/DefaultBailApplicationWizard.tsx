import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  toThatClause,
} from '../lib/legalDocumentFormat';
import {
  findFixedCaseTypeCitation,
  buildCitationParagraphs,
  findFixedCaseTypeCaseLaw,
  buildCaseLawParagraphs,
} from '../lib/actReferenceMatcher';
import { caseTypes, courtLevelOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-application-default-bail')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  courtLevel: string | null;
  benchCity: string;
  stateName: string;
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  firNumber: string;
  policeStation: string;
  bnsSections: string;
  arrestDate: string;
  offenceTier: 'ninety' | 'sixty' | '';
  chargesheetFiled: boolean;
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
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'Court',
  'Custody & chargesheet',
  'Applicant details',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

function addDays(dateStr: string, days: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function DefaultBailApplicationWizard({
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
  const [courtLevel, setCourtLevel] = useState<string | null>(saved?.courtLevel ?? null);
  const [benchCity, setBenchCity] = useState(saved?.benchCity ?? '');
  const [stateName, setStateName] = useState(saved?.stateName ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [firNumber, setFirNumber] = useState(saved?.firNumber ?? '');
  const [policeStation, setPoliceStation] = useState(saved?.policeStation ?? '');
  const [bnsSections, setBnsSections] = useState(saved?.bnsSections ?? '');
  const [arrestDate, setArrestDate] = useState(saved?.arrestDate ?? '');
  const [offenceTier, setOffenceTier] = useState<'ninety' | 'sixty' | ''>(saved?.offenceTier ?? '');
  const [chargesheetFiled, setChargesheetFiled] = useState(saved?.chargesheetFiled ?? false);
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

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      courtLevel,
      benchCity,
      stateName,
      applicantName,
      applicantAge,
      applicantAddress,
      firNumber,
      policeStation,
      bnsSections,
      arrestDate,
      offenceTier,
      chargesheetFiled,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-application-default-bail',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} — Application for Default Bail`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-application-default-bail');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-application-default-bail');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const entitlementDays = offenceTier === 'ninety' ? 90 : offenceTier === 'sixty' ? 60 : null;
  const entitlementDate = entitlementDays ? addDays(arrestDate, entitlementDays) : null;

  const draftSections: DraftSection[] = [
    {
      heading: 'Case details',
      paragraphs: [
        toThatClause(
          `the Applicant was arrested on ${arrestDate || '[date]'} in connection with FIR No. ${
            firNumber || '[FIR No.]'
          } registered at ${policeStation || '[Police Station]'} under ${bnsSections || '[sections]'} of the Bharatiya Nyaya Sanhita, 2023, and has since been in custody`
        ),
      ],
      incomplete: !firNumber.trim() || !policeStation.trim() || !arrestDate,
    },
    {
      heading: 'Chargesheet not filed within the statutory period',
      paragraphs: [
        toThatClause(
          entitlementDays
            ? `the investigating agency has failed to file a chargesheet/complaint within the ${entitlementDays}-day period prescribed by Section 187(3) of the Bharatiya Nagarik Suraksha Sanhita, 2023${
                entitlementDate ? `, which expired on ${entitlementDate}` : ''
              }, and the Applicant is prepared to furnish bail`
            : '[Select whether the offence carries death/life/10+ years, or a lesser sentence, to compute the applicable 90-day or 60-day period]'
        ),
      ],
      incomplete: !entitlementDays,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to release the Applicant on bail as a matter of right under Section 187(3) of the Bharatiya Nagarik Suraksha Sanhita, 2023, on such terms and conditions as this Hon'ble Court may deem fit and proper, the Applicant being prepared to furnish bail forthwith.`,
      ],
    },
    ...buildVerificationSection(applicantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: courtLevel ?? 'magistrate_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName: `State of ${stateName || '[State]'}`,
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    benchCity: benchCity || undefined,
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
        `${applicantName || '[Applicant]'} aged about ${applicantAge || '[age]'}, R/o ${
          applicantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Applicant in the present application, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying application has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent'] },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of my above Affidavit are true and correct and nothing material has been concealed therefrom.`,
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
            <h3 className="step-heading">Which court?</h3>
            <div className="grounds-grid">
              {courtLevelOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={courtLevel === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setCourtLevel(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>City</span>
                <input type="text" value={benchCity} onChange={(e) => setBenchCity(e.target.value)} />
              </label>
              <label className="form-field">
                <span>State</span>
                <input type="text" value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="e.g. Maharashtra" />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Custody and the chargesheet deadline</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>FIR No.</span>
                <input type="text" value={firNumber} onChange={(e) => setFirNumber(e.target.value)} placeholder="e.g. 245/2026" />
              </label>
              <label className="form-field">
                <span>Police Station</span>
                <input type="text" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Sections (Bharatiya Nyaya Sanhita, 2023)</span>
                <input type="text" value={bnsSections} onChange={(e) => setBnsSections(e.target.value)} placeholder="e.g. 318(4), 336(3)" />
              </label>
              <label className="form-field">
                <span>Date of arrest</span>
                <input type="date" value={arrestDate} onChange={(e) => setArrestDate(e.target.value)} />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              How is the offence punishable?
            </h3>
            <div className="grounds-grid">
              <button
                className={offenceTier === 'ninety' ? 'ground-card active' : 'ground-card'}
                onClick={() => setOffenceTier('ninety')}
              >
                Death, life imprisonment, or imprisonment of 10 years or more (90-day limit)
              </button>
              <button
                className={offenceTier === 'sixty' ? 'ground-card active' : 'ground-card'}
                onClick={() => setOffenceTier('sixty')}
              >
                Any other offence (60-day limit)
              </button>
            </div>
            {entitlementDate && (
              <div className="deadline-card status-safe" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Chargesheet due by</p>
                <p className="deadline-body">{entitlementDate} — if no chargesheet has been filed by then, default bail becomes available.</p>
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <input type="checkbox" checked={chargesheetFiled} onChange={(e) => setChargesheetFiled(e.target.checked)} />
              <span>A chargesheet/complaint has already been filed</span>
            </label>
            {chargesheetFiled && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-4)' }}>
                <p className="deadline-label">This right may no longer be available</p>
                <p className="deadline-body">
                  The right to default bail lapses the moment a chargesheet or complaint is actually filed, even if
                  the Court hasn't yet taken cognizance of it. Confirm the chargesheet was filed after, not before,
                  the deadline above.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Applicant details' : 'Your details'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant' : 'Your name'}</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
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

        {step === 3 && (
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

        {step === 4 && (
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
            <p className="step-help">A filed application is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title={benchCity ? `Before the ${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : caseType.name}
              subtitle={`${caseType.name} — ${applicantName || '[Applicant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance
              forum="criminalCourt"
              contextLabel={benchCity ? `${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : undefined}
            />
          </div>
        )}

        {step === 6 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
