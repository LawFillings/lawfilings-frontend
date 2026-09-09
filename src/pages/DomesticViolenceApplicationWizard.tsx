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
  findDomesticViolenceCitations,
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-domestic-violence-application')!;

const ABUSE_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'physical', label: 'Physical abuse (bodily pain, harm, assault, criminal force)' },
  { id: 'sexual', label: 'Sexual abuse' },
  { id: 'verbal_emotional', label: 'Verbal and emotional abuse (insults, humiliation, threats)' },
  { id: 'economic', label: 'Economic abuse (deprivation of resources, disposal of assets, denial of access)' },
];

const RELIEF_OPTIONS: { id: string; label: string }[] = [
  { id: 'protectionOrder', label: 'Protection order — restrain further acts of domestic violence (S.18)' },
  { id: 'residenceOrder', label: "Residence order — protect the Applicant's right to reside in the shared household (S.19)" },
  { id: 'monetaryRelief', label: 'Monetary relief — loss of earnings, medical expenses, maintenance, etc. (S.20)' },
  { id: 'custodyOrder', label: 'Custody order — temporary custody of a child/children (S.21)' },
  { id: 'compensationOrder', label: 'Compensation order — damages for mental torture and emotional distress (S.22)' },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  respondentName: string;
  respondentAddress: string;
  domesticRelationship: string;
  abuseTypes: string[];
  factsNarrative: string;
  reliefs: string[];
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
  'Parties & relationship',
  'Facts of domestic violence',
  'Reliefs sought',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

const RELIEF_PRAYER_TEXT: Record<string, string> = {
  protectionOrder: 'pass a protection order under section 18 restraining the Respondent from committing any further act of domestic violence',
  residenceOrder: "pass a residence order under section 19 protecting the Applicant's right to reside in the shared household",
  monetaryRelief: 'direct the Respondent to pay monetary relief under section 20 to meet the expenses and losses suffered by the Applicant',
  custodyOrder: 'grant temporary custody of the minor child/children to the Applicant under section 21',
  compensationOrder: 'direct the Respondent to pay compensation and damages under section 22 for the injuries, mental torture, and emotional distress caused',
};

/** Noun-phrase form of each relief, for the "Reliefs sought" section's "the Applicant seeks ..."
 * sentences — kept separate from RELIEF_PRAYER_TEXT's verb-phrase form (for "...may be pleased to
 * ...") rather than derived from it by stripping a leading verb, since that broke down for reliefs
 * whose prayer sentence doesn't start with a bare "pass "/"grant ". */
const RELIEF_SOUGHT_TEXT: Record<string, string> = {
  protectionOrder: 'a protection order under section 18 restraining the Respondent from committing any further act of domestic violence',
  residenceOrder: "a residence order under section 19 protecting her right to reside in the shared household",
  monetaryRelief: 'monetary relief under section 20 to meet the expenses and losses suffered as a result of the domestic violence',
  custodyOrder: 'temporary custody of the minor child/children under section 21',
  compensationOrder: 'compensation and damages under section 22 for the injuries, mental torture, and emotional distress caused',
};

export function DomesticViolenceApplicationWizard({
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
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [domesticRelationship, setDomesticRelationship] = useState(saved?.domesticRelationship ?? '');
  const [abuseTypes, setAbuseTypes] = useState<string[]>(saved?.abuseTypes ?? []);
  const toggleAbuseType = (id: string) =>
    setAbuseTypes((cur) => (cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id]));
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [reliefs, setReliefs] = useState<string[]>(saved?.reliefs ?? []);
  const toggleRelief = (id: string) => setReliefs((cur) => (cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id]));
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
      applicantName,
      applicantAge,
      applicantAddress,
      respondentName,
      respondentAddress,
      domesticRelationship,
      abuseTypes,
      factsNarrative,
      reliefs,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-domestic-violence-application',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${respondentName || 'Respondent'} — Domestic Violence Act Application`,
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

  const citationMatches = findDomesticViolenceCitations({
    protectionOrder: reliefs.includes('protectionOrder'),
    residenceOrder: reliefs.includes('residenceOrder'),
    monetaryRelief: reliefs.includes('monetaryRelief'),
    custodyOrder: reliefs.includes('custodyOrder'),
    compensationOrder: reliefs.includes('compensationOrder'),
  });
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-domestic-violence-application');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const abuseTypeLabels = ABUSE_TYPE_OPTIONS.filter((o) => abuseTypes.includes(o.id)).map((o) => o.label.split(' (')[0].toLowerCase());
  const abuseTypeProse =
    abuseTypeLabels.length > 0
      ? abuseTypeLabels.length === 1
        ? abuseTypeLabels[0]
        : `${abuseTypeLabels.slice(0, -1).join(', ')} and ${abuseTypeLabels[abuseTypeLabels.length - 1]}`
      : '[type(s) of abuse]';

  const reliefSentences = reliefs.map((r) => RELIEF_PRAYER_TEXT[r]).filter(Boolean);
  const prayerText =
    reliefSentences.length > 0
      ? `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to ${reliefSentences.join(
          ', '
        )}, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`
      : `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to grant such relief(s) under the Protection of Women from Domestic Violence Act, 2005 as this Hon'ble Court may deem fit and proper in the interest of justice.`;

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the parties and the domestic relationship',
      paragraphs: [
        toThatClause(
          `the Applicant ${applicantName || '[Applicant]'} is, or has been, in a domestic relationship with the Respondent ${
            respondentName || '[Respondent]'
          }, the Respondent being the Applicant's ${domesticRelationship || '[relationship]'}, and the parties have lived together in a shared household.`
        ),
      ],
      incomplete: !domesticRelationship,
    },
    {
      heading: 'Facts constituting domestic violence',
      paragraphs: [
        toThatClause(
          `the Respondent has subjected the Applicant to ${abuseTypeProse} within the meaning of section 3 of the Protection of Women from Domestic Violence Act, 2005.`
        ),
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the specific incidents of domestic violence, with dates, so far as they can be recalled]'
        ),
      ],
      incomplete: abuseTypes.length === 0 || !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Reliefs sought',
      paragraphs:
        reliefs.length > 0
          ? reliefs.map((r) => toThatClause(`the Applicant seeks ${RELIEF_SOUGHT_TEXT[r]}.`))
          : [toThatClause('the Applicant seeks such relief(s) under the Act as this Hon\'ble Court may deem fit.')],
      incomplete: reliefs.length === 0,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [prayerText],
    },
    ...buildVerificationSection(applicantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'family_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    applicantLabel: 'APPLICANT',
    respondentName,
    caseNumberLine: `D.V.C. No. _____ of ${new Date().getFullYear()}`,
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
        `${applicantName || '[Applicant]'} aged about ${applicantAge || '[age]'}, R/o ${
          applicantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Applicant in the present case, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying application has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">Parties and domestic relationship</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Applicant' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Applicant in this case)</span>
                  )}
                </span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's relationship to Applicant (e.g. husband, mother-in-law, brother)</span>
                <input type="text" value={domesticRelationship} onChange={(e) => setDomesticRelationship(e.target.value)} />
              </label>
            </div>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              The Respondent need not be an adult male — following <em>Hiral P. Harsora v. Kusum Narottamdas Harsora</em>,
              a female relative, or one who has not yet attained majority, may also be named.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Facts of domestic violence</h3>
            <p className="step-help">Tick every type of abuse that applies — each becomes a pleaded averment under section 3.</p>
            <div>
              {ABUSE_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={abuseTypes.includes(opt.id)} onChange={() => toggleAbuseType(opt.id)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts constituting domestic violence</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the specific incidents of domestic violence, with dates, so far as they can be recalled"
              />
            </label>
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
            <h3 className="step-heading">Reliefs sought</h3>
            <p className="step-help">Tick every relief you want — you can request more than one at the same time.</p>
            <div>
              {RELIEF_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={reliefs.includes(opt.id)} onChange={() => toggleRelief(opt.id)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
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
            <DraftDocument title="Domestic Violence Act Application — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title="Domestic Violence Act Application"
              subtitle={`Application under Section 12, Protection of Women from Domestic Violence Act, 2005 — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Domestic Violence Act Application — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="familyCourt" contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Filed before a Magistrate, often via a Protection Officer
              </p>
              <p className="deadline-body">
                An application under this Act is filed before a Judicial Magistrate of the First Class or Metropolitan
                Magistrate (in practice, often heard by the Family Court where one is constituted for the area) — and
                you, or a Protection Officer on your behalf, may present it. Consider contacting your district's
                Protection Officer first; they can help prepare a Domestic Incident Report, which the Magistrate must
                consider before passing any order.
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
