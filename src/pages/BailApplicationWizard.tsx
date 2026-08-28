import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildCauseTitleHtml, buildFiledByBlock, buildDocumentListParagraphs } from '../lib/legalDocumentFormat';
import { findBailCitations, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, bailTypeOptions, courtLevelOptions, bailGroundsOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

const STEPS = ['Bail type', 'Court', 'Case & FIR details', 'Grounds for bail', 'Filing details', 'Documents (Index)', 'Preview'];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

const caseType = caseTypes.find((ct) => ct.id === 'ct-bail-application')!;
const baClauses = clauses.filter((c) => c.caseTypeId === 'ct-bail-application');
const clauseByCode = (code: string) => baClauses.find((c) => c.code === code)!;

// Keyed by exactly the citation-matcher's own bail-type union — see actReferenceMatcher.ts's
// findBailCitations. Only regular bail actually varies by court: filed before a Magistrate it's
// governed by Section 480 alone; filed before the Sessions Court/High Court it also engages
// Section 483's special powers (and that court's extra procedural conditions for serious offences).
function getBailCaveat(
  bailType: 'regular' | 'anticipatory' | null,
  courtLevel: string | null
): string | null {
  if (bailType === 'anticipatory') {
    return 'Anticipatory bail can only be granted by the High Court or Court of Session (BNSS Section 482) — never a Magistrate. It is barred entirely for offences under Sections 65 and 70(2) of the Bharatiya Nyaya Sanhita, 2023 (aggravated sexual-offence provisions).';
  }
  if (bailType === 'regular' && courtLevel === 'magistrate_court') {
    return "Under BNSS Section 480(1), a Magistrate cannot grant bail for an offence punishable with death or life imprisonment, except in special circumstances (the accused is a child, a woman, sick, or infirm) or for other special reasons the Court records. For offences punishable with death/life imprisonment/7 or more years, the Public Prosecutor must be given an opportunity of hearing before bail is granted.";
  }
  if (bailType === 'regular' && (courtLevel === 'sessions_court' || courtLevel === 'high_court')) {
    return 'Under BNSS Section 483, the Court must give notice of this application to the Public Prosecutor before granting bail if the offence is exclusively triable by the Court of Session or is punishable with life imprisonment — and, for offences under Sections 65/70(2) of the Bharatiya Nyaya Sanhita, 2023, notice to the Public Prosecutor and the presence of the informant at the hearing are both mandatory.';
  }
  return null;
}

// Bail applications are almost always filed through an advocate on the accused's behalf, so the
// first-person "I am already arrested" framing is wrong in advocate mode — it reads as if the
// advocate themselves is the accused. Swap to third-person "the client" framing there instead.
function bailTypeLabel(id: 'regular' | 'anticipatory', mode: UserRole): string {
  if (mode === 'advocate') {
    return id === 'regular'
      ? 'Regular bail — the client is already arrested / in custody'
      : 'Anticipatory bail — the client fears arrest and has not yet been arrested';
  }
  return id === 'regular'
    ? 'Regular bail — I am already arrested / in custody'
    : 'Anticipatory bail — I fear arrest and have not yet been arrested';
}

interface Props {
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function BailApplicationWizard({ onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [bailType, setBailType] = useState<'regular' | 'anticipatory' | null>(null);
  const [courtLevel, setCourtLevel] = useState<string | null>(null);
  const [benchCity, setBenchCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantAge, setApplicantAge] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [firNumber, setFirNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [bnsSections, setBnsSections] = useState('');
  const [firFacts, setFirFacts] = useState('');
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>([]);
  const [additionalGrounds, setAdditionalGrounds] = useState('');
  const [jurisdictionArea, setJurisdictionArea] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [advocateAddress, setAdvocateAddress] = useState('');
  const [advocatePhone, setAdvocatePhone] = useState('');
  const [advocateEmail, setAdvocateEmail] = useState('');
  const [filingPlace, setFilingPlace] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const toggleGround = (id: string) =>
    setSelectedGrounds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  const availableCourtOptions =
    bailType === 'anticipatory' ? courtLevelOptions.filter((o) => o.id !== 'magistrate_court') : courtLevelOptions;

  const citationBailType: 'regular' | 'regular_sessions' | 'anticipatory' | null =
    bailType === 'anticipatory'
      ? 'anticipatory'
      : bailType === 'regular' && (courtLevel === 'sessions_court' || courtLevel === 'high_court')
        ? 'regular_sessions'
        : bailType === 'regular'
          ? 'regular'
          : null;

  const applicationTitle = bailType === 'anticipatory' ? 'Anticipatory Bail Application' : 'Bail Application';
  const caveat = getBailCaveat(bailType, courtLevel);
  const citations = findBailCitations(citationBailType);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = {
      bailType,
      courtLevel,
      benchCity,
      stateName,
      applicantName,
      applicantAge,
      applicantAddress,
      firNumber,
      policeStation,
      bnsSections,
      firFacts,
      selectedGrounds,
      additionalGrounds,
      jurisdictionArea,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      documentEntries,
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicationTitle} — ${applicantName || 'Applicant'}`,
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

  const prayerText =
    bailType === 'anticipatory'
      ? `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to direct that, in the event of arrest, the Applicant be released on bail, on such terms and conditions as this Hon'ble Court may deem fit and proper.`
      : `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to release the Applicant on bail in connection with FIR No. ${
          firNumber || '[FIR No.]'
        }, on such terms and conditions as this Hon'ble Court may deem fit and proper.`;

  const selectedGroundSentences = bailGroundsOptions
    .filter((g) => selectedGrounds.includes(g.id))
    .map((g) => g.sentence);
  const groundsParagraphs = [...selectedGroundSentences, ...(additionalGrounds.trim() ? [additionalGrounds.trim()] : [])];

  // Self-filing applicants sign in their own name; an advocate-filed application signs the
  // Applicant's name followed by "THROUGH" and the advocate's own block — buildFiledByBlock
  // matches the convention used across the platform's other cause-title-based filings.
  const closingSections: DraftSection[] =
    mode === 'advocate'
      ? buildFiledByBlock({
          applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
          advocateName,
          advocateAddress,
          advocatePhone,
          advocateEmail,
          place: filingPlace,
          date: filingDate,
        })
      : [
          {
            unnumbered: true,
            align: 'right' as const,
            paragraphs: [
              applicantName || '[Applicant]',
              '(APPLICANT — IN PERSON)',
              `Place: ${filingPlace || '[Place]'}`,
              `Date: ${filingDate || '[Date]'}`,
            ],
          },
        ];

  const draftSections: DraftSection[] = [
    {
      heading: 'Case details',
      paragraphs: [fillTemplate(clauseByCode('BA-01').bodyTemplate, { fir_number: firNumber, police_station: policeStation, bns_sections: bnsSections })],
      incomplete: !firNumber || !policeStation || !bnsSections,
    },
    {
      heading: 'Facts alleged in the FIR',
      paragraphs: [firFacts.trim() || '[Describe the facts/allegations mentioned in the FIR]'],
      incomplete: !firFacts.trim(),
    },
    ...(citations.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citations) }]
      : []),
    {
      heading: 'Grounds for bail',
      paragraphs: groundsParagraphs.length > 0 ? groundsParagraphs : ['[Select grounds for bail]'],
      incomplete: groundsParagraphs.length === 0,
    },
    {
      heading: 'Undertaking',
      paragraphs: [fillTemplate(clauseByCode('BA-03').bodyTemplate, { jurisdiction_area: jurisdictionArea })],
      incomplete: !jurisdictionArea,
    },
    {
      heading: 'Prayer',
      paragraphs: [prayerText],
      incomplete: !firNumber && bailType !== 'anticipatory',
    },
    ...closingSections,
  ];

  const causeTitleInfo = {
    forumType: courtLevel ?? 'sessions_court',
    applicationTitle,
    applicantName,
    respondentName: `State of ${stateName || '[State]'}`,
    benchCity: benchCity || undefined,
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
  };
  const causeTitleHtml = buildCauseTitleHtml(causeTitleInfo);
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'AFFIDAVIT' });
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'INDEX' });
  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...closingSections,
  ];

  // Bail applications (regular or anticipatory) are conventionally supported by an affidavit of
  // the applicant verifying the facts — a separate document, same convention already used for
  // Written Statement/Review/IA/MA/Appeal wizards elsewhere on this platform.
  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `I, ${applicantName || '[Applicant]'}, aged about ${applicantAge || '[age]'}, R/o ${
          applicantAddress || '[Address]'
        }, the deponent above named, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Applicant in the present case and am well conversant with the facts of the case, and am competent to swear this Affidavit.`,
        `2. That the accompanying ${applicationTitle} has been prepared at my instructions, the contents of which have been explained to me and are true and correct to the best of my knowledge and belief. The same may be read as part and parcel of this Affidavit and is not repeated herein for the sake of brevity.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${filingPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of my above Affidavit are true and correct and nothing material has been concealed therefrom.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
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
            <h3 className="step-heading">What kind of bail application is this?</h3>
            <div className="grounds-grid">
              {bailTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={bailType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => {
                    setBailType(opt.id as 'regular' | 'anticipatory');
                    if (opt.id === 'anticipatory' && courtLevel === 'magistrate_court') setCourtLevel(null);
                  }}
                >
                  {bailTypeLabel(opt.id as 'regular' | 'anticipatory', mode)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which court?</h3>
            {bailType === 'anticipatory' && (
              <p className="step-help">
                Anticipatory bail can only be granted by the Sessions Court or High Court — a Magistrate has no
                power to grant it.
              </p>
            )}
            <div className="grounds-grid">
              {availableCourtOptions.map((opt) => (
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
            {caveat && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Worth confirming before filing</p>
                <p className="deadline-body">{caveat}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Applicant and case details' : 'Your details and the case'}</h3>
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
                <span>Age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
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
                <input
                  type="text"
                  value={bnsSections}
                  onChange={(e) => setBnsSections(e.target.value)}
                  placeholder="e.g. 318(4), 336(3)"
                />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts / allegations mentioned in the FIR</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={firFacts}
                onChange={(e) => setFirFacts(e.target.value)}
                placeholder="Summarize what the FIR alleges against the applicant"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Grounds for bail</h3>
            <p className="step-help">Tick every ground that applies — each becomes a sentence in the application.</p>
            <div>
              {bailGroundsOptions.map((g) => (
                <label
                  key={g.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={selectedGrounds.includes(g.id)} onChange={() => toggleGround(g.id)} />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Anything else? (optional)</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={additionalGrounds}
                onChange={(e) => setAdditionalGrounds(e.target.value)}
                placeholder="Add any other ground specific to this case"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 480 }}>
              <span>Jurisdiction area (for the undertaking not to leave without permission)</span>
              <input
                type="text"
                value={jurisdictionArea}
                onChange={(e) => setJurisdictionArea(e.target.value)}
                placeholder="e.g. the State of Maharashtra"
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
                    <PaywallBlock
                      onChoosePlan={onOpenPricing}
                    />
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
                <span>Place of filing</span>
                <input type="text" value={filingPlace} onChange={(e) => setFilingPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of filing</span>
                <input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
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
                    <PaywallBlock
                      onChoosePlan={onOpenPricing}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="step-help" style={{ marginBottom: 'var(--space-4)' }}>
                Log in to save this draft and come back to it later.
              </p>
            )}
            <p className="step-help">A filed {applicationTitle} is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${applicationTitle} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {applicationTitle}</h4>
            <DraftDocument
              title={benchCity ? `Before the ${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : caseType.name}
              subtitle={`${applicationTitle} — ${applicantName || '[Applicant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument
              title={`${applicationTitle} — Affidavit`}
              subtitle={applicantName || '[Applicant]'}
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance
              forum="criminalCourt"
              contextLabel={
                benchCity ? `${courtLevelOptions.find((o) => o.id === courtLevel)?.label ?? 'Court'}, ${benchCity}` : undefined
              }
            />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
