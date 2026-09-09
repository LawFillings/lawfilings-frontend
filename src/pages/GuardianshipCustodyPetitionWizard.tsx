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
import { caseTypes } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-guardianship-custody-petition')!;

type GuardianshipType = 'person' | 'property' | 'both' | null;

const GUARDIANSHIP_TYPE_OPTIONS: { id: GuardianshipType; label: string }[] = [
  { id: 'person', label: "Guardian of the minor's person (custody, care, upbringing)" },
  { id: 'property', label: "Guardian of the minor's property only" },
  { id: 'both', label: "Guardian of both the minor's person and property" },
];

function guardianshipPrayerText(type: GuardianshipType, minorName: string): string {
  const name = minorName || '[Minor]';
  switch (type) {
    case 'person':
      return `appoint/declare the Petitioner as guardian of the person of the minor ${name}`;
    case 'property':
      return `appoint/declare the Petitioner as guardian of the property of the minor ${name}`;
    case 'both':
      return `appoint/declare the Petitioner as guardian of the person and property of the minor ${name}`;
    default:
      return `appoint/declare the Petitioner as guardian of the minor ${name}`;
  }
}

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  petitionerRelation: string;
  minorName: string;
  minorSex: string;
  minorDob: string;
  minorResidence: string;
  respondentName: string;
  respondentAddress: string;
  guardianshipType: GuardianshipType;
  factsNarrative: string;
  propertyNarrative: string;
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
  'Parties & minor',
  'Grounds & welfare factors',
  "Minor's property",
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function GuardianshipCustodyPetitionWizard({
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
  const [petitionerName, setPetitionerName] = useState(saved?.petitionerName ?? '');
  const [petitionerAge, setPetitionerAge] = useState(saved?.petitionerAge ?? '');
  const [petitionerAddress, setPetitionerAddress] = useState(saved?.petitionerAddress ?? '');
  const [petitionerRelation, setPetitionerRelation] = useState(saved?.petitionerRelation ?? '');
  const [minorName, setMinorName] = useState(saved?.minorName ?? '');
  const [minorSex, setMinorSex] = useState(saved?.minorSex ?? '');
  const [minorDob, setMinorDob] = useState(saved?.minorDob ?? '');
  const [minorResidence, setMinorResidence] = useState(saved?.minorResidence ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [guardianshipType, setGuardianshipType] = useState<GuardianshipType>(saved?.guardianshipType ?? null);
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [propertyNarrative, setPropertyNarrative] = useState(saved?.propertyNarrative ?? '');
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
      petitionerName,
      petitionerAge,
      petitionerAddress,
      petitionerRelation,
      minorName,
      minorSex,
      minorDob,
      minorResidence,
      respondentName,
      respondentAddress,
      guardianshipType,
      factsNarrative,
      propertyNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-guardianship-custody-petition',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} — Guardianship/Custody of ${minorName || 'Minor'}`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-guardianship-custody-petition');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-guardianship-custody-petition');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [petitionerName || '[Petitioner]', '(PETITIONER)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the minor and the parties',
      paragraphs: [
        toThatClause(
          `the minor ${minorName || '[Minor]'}, ${minorSex || '[sex]'}, born on ${
            minorDob || '[date of birth]'
          }, ordinarily resides at ${minorResidence || '[ordinary residence]'}, and the Petitioner ${
            petitionerName || '[Petitioner]'
          } is the ${petitionerRelation || '[relationship to the minor]'} of the minor and is desirous of being appointed/declared the guardian of the minor.`
        ),
      ],
      incomplete: !petitionerRelation || !minorName,
    },
    {
      heading: 'Facts and grounds',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            "[Describe the causes leading to this application, the Petitioner's qualifications and existing relationship with the minor, and why the Petitioner's appointment serves the minor's welfare]"
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    ...(guardianshipType === 'property' || guardianshipType === 'both'
      ? [
          {
            heading: "Particulars of the minor's property",
            paragraphs: [
              toThatClause(
                propertyNarrative.trim() ||
                  '[State the nature, situation, and approximate value of the property of the minor]'
              ),
            ],
            incomplete: !propertyNarrative.trim(),
          },
        ]
      : []),
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to ${guardianshipPrayerText(
          guardianshipType,
          minorName
        )}, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of the welfare of the minor.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'family_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    respondentName,
    caseNumberLine: `G. & W. Case No. _____ of ${new Date().getFullYear()}`,
    benchCity: filingPlace || undefined,
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
        `${petitionerName || '[Petitioner]'} aged about ${petitionerAge || '[age]'}, R/o ${
          petitionerAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Petitioner in the present case, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying petition has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">Parties and the minor</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Petitioner' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Petitioner in this case)</span>
                  )}
                </span>
                <input type="text" value={petitionerName} onChange={(e) => setPetitionerName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner's age</span>
                <input type="text" value={petitionerAge} onChange={(e) => setPetitionerAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner's address</span>
                <input type="text" value={petitionerAddress} onChange={(e) => setPetitionerAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner's relationship to the minor (e.g. mother, grandfather, uncle)</span>
                <input type="text" value={petitionerRelation} onChange={(e) => setPetitionerRelation(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Minor's name</span>
                <input type="text" value={minorName} onChange={(e) => setMinorName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Minor's sex</span>
                <input type="text" value={minorSex} onChange={(e) => setMinorSex(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Minor's date of birth</span>
                <input type="date" value={minorDob} onChange={(e) => setMinorDob(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Minor's ordinary residence</span>
                <input type="text" value={minorResidence} onChange={(e) => setMinorResidence(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent, if any (e.g. other parent objecting)</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p className="step-help">What kind of guardianship are you seeking?</p>
              {GUARDIANSHIP_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input
                    type="radio"
                    name="guardianshipType"
                    checked={guardianshipType === opt.id}
                    onChange={() => setGuardianshipType(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              Section 19 of the Act bars the Court from appointing a guardian of the person of a minor whose father
              or mother is living and fit — if the Respondent is such a parent, your facts must address their
              fitness, or this will need to proceed as a custody matter incidental to a matrimonial case instead.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Grounds and welfare factors</h3>
            <p className="step-help">
              Section 17 directs the Court to weigh the minor's age, sex and religion, the character and capacity
              of the proposed guardian, nearness of kin, the wishes of a deceased parent (if any), and the minor's
              own preference if old enough to form one — cover what applies.
            </p>
            <textarea
              className="facts-textarea"
              rows={7}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe the causes leading to this application, the Petitioner's qualifications and existing relationship with the minor, and why the Petitioner's appointment serves the minor's welfare"
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

        {step === 2 && (
          <div>
            <h3 className="step-heading">Minor's property</h3>
            {guardianshipType === 'property' || guardianshipType === 'both' ? (
              <>
                <p className="step-help">
                  Section 10 requires the nature, situation, and approximate value of the minor's property.
                </p>
                <textarea
                  className="facts-textarea"
                  rows={5}
                  value={propertyNarrative}
                  onChange={(e) => setPropertyNarrative(e.target.value)}
                  placeholder="State the nature, situation, and approximate value of the property of the minor"
                />
              </>
            ) : (
              <p className="step-help">
                You selected guardianship of the person only, so this step doesn't apply — click Continue. If you
                also need guardianship of the minor's property, go back and change your answer on step 1.
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
            <p className="step-help">A filed petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Guardianship/Custody Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Guardianship/Custody Petition"
              subtitle={`Petition under Section 7, Guardians and Wards Act, 1890 — ${petitionerName || '[Petitioner]'} re: ${minorName || '[Minor]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Guardianship/Custody Petition — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="familyCourt" contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Declaration of willingness to act
              </p>
              <p className="deadline-body">
                Section 10(3) requires the application to be accompanied by a declaration of the proposed guardian's
                willingness to act, signed by them and attested by at least two witnesses — annex it as one of your
                documents above; it isn't drafted automatically here.
              </p>
            </div>

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

        {step === 6 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
