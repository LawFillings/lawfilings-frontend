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

const caseType = caseTypes.find((ct) => ct.id === 'ct-arbitration-s34-setting-aside')!;

type CourtLevel = 'district_court' | 'high_court';

const COURT_LEVEL_OPTIONS: { id: CourtLevel; label: string; help: string }[] = [
  { id: 'district_court', label: 'Principal Civil Court of the district', help: 'For arbitrations other than international commercial arbitration.' },
  { id: 'high_court', label: 'High Court', help: 'For an international commercial arbitration.' },
];

const GROUND_OPTIONS: { id: string; label: string; prose: string }[] = [
  {
    id: 'incapacity',
    label: 'A party was under some incapacity',
    prose: 'a party to the arbitration agreement was under some incapacity',
  },
  {
    id: 'invalid_agreement',
    label: 'The arbitration agreement is not valid under the applicable law',
    prose: 'the arbitration agreement is not valid under the law to which the parties have subjected it, or, failing any indication thereon, under the law for the time being in force',
  },
  {
    id: 'no_proper_notice',
    label: 'The Applicant was not given proper notice, or was otherwise unable to present its case',
    prose: 'the Applicant was not given proper notice of the appointment of the arbitrator or of the arbitral proceedings, or was otherwise unable to present its case',
  },
  {
    id: 'beyond_scope',
    label: 'The award deals with a dispute beyond the scope of the submission to arbitration',
    prose: 'the arbitral award deals with a dispute not contemplated by, or not falling within the terms of, the submission to arbitration, or contains decisions on matters beyond the scope of the submission to arbitration',
  },
  {
    id: 'improper_composition',
    label: "The composition of the tribunal or the arbitral procedure was not in accordance with the parties' agreement",
    prose: 'the composition of the arbitral tribunal or the arbitral procedure was not in accordance with the agreement of the parties, or, failing such agreement, was not in accordance with Part I of the Act',
  },
  {
    id: 'not_arbitrable',
    label: 'The subject-matter of the dispute is not capable of settlement by arbitration',
    prose: 'the subject-matter of the dispute is not capable of settlement by arbitration under the law for the time being in force',
  },
  {
    id: 'public_policy',
    label: 'The award is in conflict with the public policy of India',
    prose: 'the arbitral award is in conflict with the public policy of India, in that its making was induced or affected by fraud or corruption, or it is in contravention with the fundamental policy of Indian law, or it is in conflict with the most basic notions of morality or justice',
  },
  {
    id: 'patent_illegality',
    label: 'The award is vitiated by patent illegality appearing on the face of the award',
    prose: 'the arbitral award is vitiated by patent illegality appearing on the face of the award',
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  courtLevel: CourtLevel | null;
  courtName: string;
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
  respondentName: string;
  respondentAddress: string;
  arbitratorName: string;
  awardDate: string;
  receiptDate: string;
  natureOfDispute: string;
  grounds: string[];
  factsNarrative: string;
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
  'Court & parties',
  'Impugned award & grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function ArbitrationS34Wizard({
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
  const [courtLevel, setCourtLevel] = useState<CourtLevel | null>(saved?.courtLevel ?? null);
  const [courtName, setCourtName] = useState(saved?.courtName ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [arbitratorName, setArbitratorName] = useState(saved?.arbitratorName ?? '');
  const [awardDate, setAwardDate] = useState(saved?.awardDate ?? '');
  const [receiptDate, setReceiptDate] = useState(saved?.receiptDate ?? '');
  const [natureOfDispute, setNatureOfDispute] = useState(saved?.natureOfDispute ?? '');
  const [grounds, setGrounds] = useState<string[]>(saved?.grounds ?? []);
  const toggleGround = (id: string) => setGrounds((cur) => (cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id]));
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
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
      courtName,
      applicantName,
      applicantAge,
      applicantAddress,
      respondentName,
      respondentAddress,
      arbitratorName,
      awardDate,
      receiptDate,
      natureOfDispute,
      grounds,
      factsNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-arbitration-s34-setting-aside',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${respondentName || 'Respondent'} — Arbitration S.34 Application`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-arbitration-s34-setting-aside');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-arbitration-s34-setting-aside');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const groundParagraphs = grounds
    .map((id) => GROUND_OPTIONS.find((g) => g.id === id))
    .filter((g): g is (typeof GROUND_OPTIONS)[number] => !!g)
    .map((g) => toThatClause(g.prose + '.'));

  const courtNoun = courtLevel === 'high_court' ? 'High Court' : 'Court';

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the impugned award',
      paragraphs: [
        toThatClause(
          `the arbitral award dated ${awardDate || '[date]'}, passed by ${
            arbitratorName || '[name of the sole/presiding arbitrator or tribunal]'
          } in the arbitration between the Applicant ${applicantName || '[Applicant]'} and the Respondent ${
            respondentName || '[Respondent]'
          } concerning ${natureOfDispute.trim() || '[describe the nature of the dispute]'}, was received by the Applicant on ${
            receiptDate || '[date]'
          }, and is sought to be set aside by this application, which is filed within the period of limitation prescribed by section 34(3) of the Arbitration and Conciliation Act, 1996.`
        ),
      ],
      incomplete: !awardDate || !receiptDate,
    },
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the background facts of the arbitration and the proceedings leading up to the impugned award]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds for setting aside',
      paragraphs:
        groundParagraphs.length > 0
          ? groundParagraphs
          : [toThatClause('the impugned award is liable to be set aside under section 34 of the Arbitration and Conciliation Act, 1996.')],
      incomplete: grounds.length === 0,
      role: 'grounds',
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
        `It is therefore most respectfully prayed that this Hon'ble ${courtNoun} may be pleased to set aside the arbitral award dated ${
          awardDate || '[date]'
        }, and pass any other order(s) as this Hon'ble ${courtNoun} may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(applicantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: courtLevel ?? 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    applicantLabel: 'APPLICANT',
    respondentName,
    respondentLabel: 'RESPONDENT',
    caseNumberLine: `Arb. Case No. _____ of ${new Date().getFullYear()}`,
    benchCity: courtName || filingPlace || undefined,
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
            <h3 className="step-heading">Court and parties</h3>
            <p className="step-help">
              Which "Court" has jurisdiction depends on whether this is an international commercial arbitration.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              {COURT_LEVEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}
                >
                  <input
                    type="radio"
                    name="courtLevel"
                    checked={courtLevel === opt.id}
                    onChange={() => setCourtLevel(opt.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    <br />
                    <span style={{ color: 'var(--text-muted)' }}>{opt.help}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="form-grid">
              <label className="form-field">
                <span>City/place where the Court is located</span>
                <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} />
              </label>
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
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Impugned award and grounds</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Name of the arbitrator(s)/tribunal</span>
                <input type="text" value={arbitratorName} onChange={(e) => setArbitratorName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of the award</span>
                <input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date the Applicant received the award</span>
                <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Nature of the dispute</span>
                <input type="text" value={natureOfDispute} onChange={(e) => setNatureOfDispute(e.target.value)} />
              </label>
            </div>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              Tick every ground that applies — an award can only be set aside on one or more of these grounds under
              section 34(2)/(2A).
            </p>
            <div>
              {GROUND_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={grounds.includes(opt.id)} onChange={() => toggleGround(opt.id)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the background facts of the arbitration and the proceedings leading up to the impugned award"
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">
              Add each document you're annexing, in the order it will be paginated — including a certified copy of
              the arbitral award, and the notice to the Respondent required under section 34(5).
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

        {step === 4 && (
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
            <DraftDocument title="Arbitration S.34 Application — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title="Application to Set Aside Arbitral Award"
              subtitle={`Application under Section 34, Arbitration and Conciliation Act, 1996 — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Arbitration S.34 Application — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum={courtLevel === 'high_court' ? 'highCourtOriginal' : 'districtCourt'} contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Prior notice and limitation
              </p>
              <p className="deadline-body">
                Section 34(5) requires this application to be preceded by a notice to the Respondent, accompanied by
                an affidavit endorsing compliance — annex both as documents above. Section 34(3) bars this
                application after three months from receipt of the award (extendable by a further thirty days only
                on sufficient cause) — confirm you are within time before filing.
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

        {step === 5 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
