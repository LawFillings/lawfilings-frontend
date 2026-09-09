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
  findAncillaryReliefCitations,
} from '../lib/actReferenceMatcher';
import { caseTypes, divorceGroundsOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const STEPS = [
  'Parties & marriage',
  'Facts',
  'Grounds',
  'Ancillary reliefs',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  respondentName: string;
  respondentAddress: string;
  marriageDate: string;
  marriagePlace: string;
  childrenDetails: string;
  factsNarrative: string;
  selectedGrounds: string[];
  wantMaintenancePendenteLite: boolean;
  wantPermanentAlimony: boolean;
  wantCustody: boolean;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingPlace: string;
  filingDate: string;
  verificationPlace: string;
  documentEntries: DocEntry[];
}

const caseType = caseTypes.find((ct) => ct.id === 'ct-judicial-separation')!;

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function JudicialSeparationWizard({
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
  const [respondentName, setRespondentName] = useState(saved?.respondentName ?? '');
  const [respondentAddress, setRespondentAddress] = useState(saved?.respondentAddress ?? '');
  const [marriageDate, setMarriageDate] = useState(saved?.marriageDate ?? '');
  const [marriagePlace, setMarriagePlace] = useState(saved?.marriagePlace ?? '');
  const [childrenDetails, setChildrenDetails] = useState(saved?.childrenDetails ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>(saved?.selectedGrounds ?? []);
  const [wantMaintenancePendenteLite, setWantMaintenancePendenteLite] = useState(saved?.wantMaintenancePendenteLite ?? false);
  const [wantPermanentAlimony, setWantPermanentAlimony] = useState(saved?.wantPermanentAlimony ?? false);
  const [wantCustody, setWantCustody] = useState(saved?.wantCustody ?? false);
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

  const toggleGround = (id: string) =>
    setSelectedGrounds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      petitionerName,
      petitionerAge,
      petitionerAddress,
      respondentName,
      respondentAddress,
      marriageDate,
      marriagePlace,
      childrenDetails,
      factsNarrative,
      selectedGrounds,
      wantMaintenancePendenteLite,
      wantPermanentAlimony,
      wantCustody,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-judicial-separation',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} vs. ${respondentName || 'Respondent'} — Judicial Separation`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-judicial-separation');
  const ancillaryCitationMatches = findAncillaryReliefCitations({
    maintenancePendenteLite: wantMaintenancePendenteLite,
    permanentAlimony: wantPermanentAlimony,
    custody: wantCustody,
  });

  const selectedGroundSentences = divorceGroundsOptions
    .filter((g) => selectedGrounds.includes(g.id))
    .map((g) => g.sentence);

  const ancillaryReliefPhrases = [
    wantMaintenancePendenteLite ? 'maintenance pendente lite and expenses of the proceedings under section 24 of the Act' : null,
    wantPermanentAlimony ? 'permanent alimony and maintenance under section 25 of the Act' : null,
    wantCustody ? 'custody of the minor child(ren) of the marriage under section 26 of the Act' : null,
  ].filter((p): p is string => p !== null);

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
      heading: 'Particulars of the parties and the marriage',
      paragraphs: [
        toThatClause(
          `The Petitioner ${petitionerName || '[Petitioner]'} and the Respondent ${
            respondentName || '[Respondent]'
          } were married at ${marriagePlace || '[place]'} on ${marriageDate || '[date]'}, according to Hindu rites and ceremonies.`
        ),
        ...(childrenDetails.trim() ? [toThatClause(`Of the said marriage, ${childrenDetails.trim()}`)] : []),
      ],
      incomplete: !marriageDate || !marriagePlace,
    },
    {
      heading: 'Facts constituting the cause of action',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe the facts leading to this petition]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds for judicial separation',
      paragraphs:
        selectedGroundSentences.length > 0
          ? selectedGroundSentences.map(toThatClause)
          : ['[Select the grounds relied upon]'],
      incomplete: selectedGroundSentences.length === 0,
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    ...(ancillaryReliefPhrases.length > 0
      ? [
          {
            heading: 'Ancillary reliefs sought',
            paragraphs: [toThatClause(`The Petitioner further seeks ${ancillaryReliefPhrases.join(', ')}.`)],
          },
        ]
      : []),
    ...(ancillaryCitationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon (ancillary reliefs)', paragraphs: buildCitationParagraphs(ancillaryCitationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to pass a decree of judicial separation between the Petitioner and the Respondent under section 10 of the Hindu Marriage Act, 1955${
          ancillaryReliefPhrases.length > 0 ? `, grant the Petitioner ${ancillaryReliefPhrases.join(', ')}` : ''
        }, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'family_court',
    applicationTitle: 'Judicial Separation Petition',
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    respondentName,
    caseNumberLine: `HMA No. _____ of ${new Date().getFullYear()}`,
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
        '2. That the accompanying Petition has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
            <h3 className="step-heading">{mode === 'advocate' ? 'Parties and marriage' : 'You, your spouse, and your marriage'}</h3>
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
                <span>{mode === 'advocate' ? 'Respondent' : 'Your spouse'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Respondent's address</span>
                <input type="text" value={respondentAddress} onChange={(e) => setRespondentAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of marriage</span>
                <input type="date" value={marriageDate} onChange={(e) => setMarriageDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of marriage</span>
                <input type="text" value={marriagePlace} onChange={(e) => setMarriagePlace(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Children of the marriage (if any)</span>
              <textarea
                className="facts-textarea"
                rows={2}
                value={childrenDetails}
                onChange={(e) => setChildrenDetails(e.target.value)}
                placeholder="e.g. two children were born — a son aged 8 and a daughter aged 5, both currently residing with the Petitioner"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Facts constituting the cause of action' : 'What happened?'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Chronological statement of the facts supporting the grounds you will select next.'
                : 'Write it in your own words — this gets turned into the formal statement of facts automatically.'}
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe the marital history and events supporting the grounds for judicial separation"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Grounds for judicial separation</h3>
            <p className="step-help">
              Section 10 lets you rely on the same grounds as a divorce petition — tick every ground that applies.
            </p>
            <div>
              {divorceGroundsOptions.map((g) => (
                <label
                  key={g.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={selectedGrounds.includes(g.id)} onChange={() => toggleGround(g.id)} />
                  <span>{g.label}</span>
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Ancillary reliefs</h3>
            <p className="step-help">Optional — any of these can be sought alongside the decree of judicial separation itself.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input
                type="checkbox"
                checked={wantMaintenancePendenteLite}
                onChange={(e) => setWantMaintenancePendenteLite(e.target.checked)}
              />
              <span>Maintenance pendente lite (during the proceedings)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <input type="checkbox" checked={wantPermanentAlimony} onChange={(e) => setWantPermanentAlimony(e.target.checked)} />
              <span>Permanent alimony and maintenance</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input type="checkbox" checked={wantCustody} onChange={(e) => setWantCustody(e.target.checked)} />
              <span>Custody of the minor child(ren)</span>
            </label>
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
                    <PaywallBlock onChoosePlan={onOpenPricing} />
                  </div>
                )}
              </div>
            ) : (
              <p className="step-help" style={{ marginBottom: 'var(--space-4)' }}>
                Log in to save this draft and come back to it later.
              </p>
            )}
            <p className="step-help">A filed Petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Judicial Separation Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Judicial Separation Petition"
              subtitle={`Petition under Section 10, Hindu Marriage Act, 1955 — ${petitionerName || '[Petitioner]'} vs. ${respondentName || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Judicial Separation Petition — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="familyCourt" contextLabel={filingPlace || undefined} />

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
