import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance, forumTypeToFilingForum } from '../components/FilingGuidance';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-injunction-temporary')!;

const GROUND_OPTIONS = [
  {
    id: 'waste-damage-alienation',
    label: 'The suit property is in danger of being wasted, damaged, or alienated by the Defendant, or sold in execution of a decree',
    sentence:
      'the property in dispute in the suit is in danger of being wasted, damaged, or alienated by the Defendant, or wrongfully sold in execution of a decree, within the meaning of Order XXXIX, Rule 1(a) of the Code of Civil Procedure, 1908',
  },
  {
    id: 'defraud-creditors',
    label: 'The Defendant threatens or intends to remove or dispose of property to defraud creditors',
    sentence:
      'the Defendant threatens, or intends, to remove or dispose of his property with a view to defrauding his creditors, within the meaning of Order XXXIX, Rule 1(b) of the Code of Civil Procedure, 1908',
  },
  {
    id: 'dispossession',
    label: 'The Defendant threatens to dispossess the Plaintiff, or otherwise cause injury, in relation to the suit property',
    sentence:
      'the Defendant threatens to dispossess the Plaintiff, or otherwise cause injury to the Plaintiff, in relation to the property in dispute in the suit, within the meaning of Order XXXIX, Rule 1(c) of the Code of Civil Procedure, 1908',
  },
  {
    id: 'breach-of-contract',
    label: 'To restrain a breach of contract, or a repetition/continuance of an injury of any kind',
    sentence:
      'the Defendant is committing, or threatens to commit, a breach of contract, or an injury of any kind, which the Plaintiff seeks to restrain under Order XXXIX, Rule 2 of the Code of Civil Procedure, 1908',
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  plaintiffName: string;
  plaintiffAge: string;
  plaintiffAddress: string;
  defendantName: string;
  defendantAddress: string;
  parentSuitNumber: string;
  courtName: string;
  propertyDescription: string;
  selectedGrounds: string[];
  primaFacieCase: string;
  balanceOfConvenience: string;
  irreparableInjury: string;
  reliefSought: string;
  exParteRequested: boolean;
  urgencyReason: string;
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
  'Parties & suit',
  'Subject matter',
  'Grounds',
  'Prima facie case',
  'Balance of convenience',
  'Irreparable injury',
  'Relief sought',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function TemporaryInjunctionWizard({
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
  const [plaintiffName, setPlaintiffName] = useState(saved?.plaintiffName ?? '');
  const [plaintiffAge, setPlaintiffAge] = useState(saved?.plaintiffAge ?? '');
  const [plaintiffAddress, setPlaintiffAddress] = useState(saved?.plaintiffAddress ?? '');
  const [defendantName, setDefendantName] = useState(saved?.defendantName ?? '');
  const [defendantAddress, setDefendantAddress] = useState(saved?.defendantAddress ?? '');
  const [parentSuitNumber, setParentSuitNumber] = useState(saved?.parentSuitNumber ?? '');
  const [courtName, setCourtName] = useState(saved?.courtName ?? '');
  const [propertyDescription, setPropertyDescription] = useState(saved?.propertyDescription ?? '');
  const [selectedGrounds, setSelectedGrounds] = useState<string[]>(saved?.selectedGrounds ?? []);
  const [primaFacieCase, setPrimaFacieCase] = useState(saved?.primaFacieCase ?? '');
  const [balanceOfConvenience, setBalanceOfConvenience] = useState(saved?.balanceOfConvenience ?? '');
  const [irreparableInjury, setIrreparableInjury] = useState(saved?.irreparableInjury ?? '');
  const [reliefSought, setReliefSought] = useState(saved?.reliefSought ?? '');
  const [exParteRequested, setExParteRequested] = useState(saved?.exParteRequested ?? false);
  const [urgencyReason, setUrgencyReason] = useState(saved?.urgencyReason ?? '');
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
      plaintiffName,
      plaintiffAge,
      plaintiffAddress,
      defendantName,
      defendantAddress,
      parentSuitNumber,
      courtName,
      propertyDescription,
      selectedGrounds,
      primaFacieCase,
      balanceOfConvenience,
      irreparableInjury,
      reliefSought,
      exParteRequested,
      urgencyReason,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-injunction-temporary',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${plaintiffName || 'Plaintiff'} vs. ${defendantName || 'Defendant'} — Temporary Injunction Application`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-injunction-temporary');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-injunction-temporary');
  const selectedGroundSentences = GROUND_OPTIONS.filter((g) => selectedGrounds.includes(g.id)).map((g) => g.sentence);

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
      heading: 'Particulars of the suit and the parties',
      paragraphs: [
        toThatClause(
          `the Plaintiff, ${plaintiffName || '[Plaintiff]'} has instituted the above-numbered suit against the Defendant, ${
            defendantName || '[Defendant]'
          }, before this Hon'ble Court${courtName ? ` at ${courtName}` : ''}, which is pending disposal.`
        ),
        ...(propertyDescription.trim()
          ? [toThatClause(`the subject matter of the suit, in respect of which this application is filed, is ${propertyDescription.trim()}`)]
          : []),
      ],
      incomplete: !propertyDescription.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds for the temporary injunction',
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
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prima facie case',
      paragraphs: [toThatClause(primaFacieCase.trim() || '[Explain why the Plaintiff has a prima facie case]')],
      incomplete: !primaFacieCase.trim(),
    },
    {
      heading: 'Balance of convenience',
      paragraphs: [
        toThatClause(
          balanceOfConvenience.trim() || '[Explain why the balance of convenience lies in favour of granting the injunction]'
        ),
      ],
      incomplete: !balanceOfConvenience.trim(),
    },
    {
      heading: 'Irreparable injury',
      paragraphs: [
        toThatClause(irreparableInjury.trim() || '[Explain the irreparable injury/loss the Plaintiff will suffer if the injunction is refused]'),
      ],
      incomplete: !irreparableInjury.trim(),
    },
    ...(exParteRequested
      ? [
          {
            heading: 'Reasons for seeking ad-interim ex-parte relief',
            paragraphs: [
              toThatClause(
                urgencyReason.trim() ||
                  '[Explain why the object of granting the injunction would be defeated by the delay involved in giving prior notice to the Defendant]'
              ),
              `The Plaintiff undertakes to comply with the requirements of Order XXXIX, Rule 3 of the Code of Civil Procedure, 1908, by delivering to the Defendant, immediately after any ex-parte order is passed, a copy of this application together with the supporting affidavit, the plaint, and the documents relied upon, and by filing an affidavit of such service before this Hon'ble Court.`,
            ],
            incomplete: !urgencyReason.trim(),
          },
        ]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to${
          exParteRequested ? ', by way of ad-interim ex-parte order,' : ''
        } grant a temporary injunction restraining the Defendant, ${reliefSought.trim() || '[describe the specific act to be restrained]'}, until the disposal of the suit or until further orders, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
      incomplete: !reliefSought.trim(),
    },
    ...buildVerificationSection(plaintiffName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'district_court',
    applicationTitle: 'Temporary Injunction Application',
    governingLaw: caseType.governingLaw,
    applicantName: plaintiffName,
    respondentName: defendantName,
    caseNumberLine: `I.A. No. _____ of ${new Date().getFullYear()}`,
    parentCaseLabel: 'SUIT',
    parentCaseNumber: parentSuitNumber,
    benchCity: courtName || undefined,
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
            <h3 className="step-heading">Parties and the pending suit</h3>
            <p className="step-help">This application is filed within an already-instituted civil suit.</p>
            <div className="form-grid">
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Plaintiff' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Plaintiff in this suit)</span>
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
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Suit number' : 'Your suit number'}</span>
                <input
                  type="text"
                  value={parentSuitNumber}
                  onChange={(e) => setParentSuitNumber(e.target.value)}
                  placeholder="e.g. O.S. No. 123 of 2026"
                />
              </label>
              <label className="form-field">
                <span>Court where the suit is pending</span>
                <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Subject matter of the suit</h3>
            <p className="step-help">Describe the property, contract, or right in dispute that this application concerns.</p>
            <textarea
              className="facts-textarea"
              rows={5}
              value={propertyDescription}
              onChange={(e) => setPropertyDescription(e.target.value)}
              placeholder="e.g. the immovable property bearing Plot No. 45, Sector 12, which is the subject matter of the suit for specific performance"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Grounds</h3>
            <p className="step-help">Tick every ground that applies — each becomes a pleaded averment.</p>
            <div>
              {GROUND_OPTIONS.map((g) => (
                <label
                  key={g.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGrounds.includes(g.id)}
                    onChange={() => toggleGround(g.id)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Prima facie case</h3>
            <p className="step-help">
              Explain why the Plaintiff is likely to succeed in the suit on the facts as they currently stand — courts
              require this to be shown before granting a temporary injunction.
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={primaFacieCase}
              onChange={(e) => setPrimaFacieCase(e.target.value)}
              placeholder="Explain the strength of the Plaintiff's case on the material currently on record"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Balance of convenience</h3>
            <p className="step-help">Explain why greater hardship would result to the Plaintiff if the injunction is refused than to the Defendant if it is granted.</p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={balanceOfConvenience}
              onChange={(e) => setBalanceOfConvenience(e.target.value)}
              placeholder="Explain who would suffer greater hardship depending on whether the injunction is granted or refused"
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

        {step === 5 && (
          <div>
            <h3 className="step-heading">Irreparable injury</h3>
            <p className="step-help">Explain the loss or injury the Plaintiff would suffer that cannot adequately be compensated in money.</p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={irreparableInjury}
              onChange={(e) => setIrreparableInjury(e.target.value)}
              placeholder="Explain why monetary compensation would not be an adequate remedy if the injunction is refused"
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 className="step-heading">Relief sought</h3>
            <label className="form-field">
              <span>What should the Defendant be restrained from doing?</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={reliefSought}
                onChange={(e) => setReliefSought(e.target.value)}
                placeholder="e.g. 'from selling, alienating, or creating any third-party interest in the suit property'"
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              <input type="checkbox" checked={exParteRequested} onChange={(e) => setExParteRequested(e.target.checked)} />
              <span>
                Seek an ad-interim ex-parte order (without prior notice to the Defendant) under the proviso to Order XXXIX,
                Rule 3, CPC
              </span>
            </label>
            {exParteRequested && (
              <label className="form-field" style={{ marginTop: 'var(--space-3)' }}>
                <span>Why would notice to the Defendant defeat the object of the injunction?</span>
                <textarea
                  className="facts-textarea"
                  rows={3}
                  value={urgencyReason}
                  onChange={(e) => setUrgencyReason(e.target.value)}
                  placeholder="e.g. the Defendant is likely to alienate the property the moment notice of this application is received"
                />
              </label>
            )}
          </div>
        )}

        {step === 7 && (
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

        {step === 8 && (
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

        {step === 9 && (
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
            <DraftDocument title="Temporary Injunction Application — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Application</h4>
            <DraftDocument
              title="Temporary Injunction Application"
              subtitle={`Application under Order XXXIX, Rules 1 & 2, CPC — ${plaintiffName || '[Plaintiff]'} vs. ${defendantName || '[Defendant]'}${parentSuitNumber ? ` — in ${parentSuitNumber}` : ''}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Temporary Injunction Application — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum={forumTypeToFilingForum(caseType.forumType)} contextLabel={filingPlace || undefined} />

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

        {step === 10 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
