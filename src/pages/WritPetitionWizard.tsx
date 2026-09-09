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

const caseType = caseTypes.find((ct) => ct.id === 'ct-writ-petition-226')!;

type WritType = 'mandamus' | 'certiorari' | 'prohibition' | 'quo_warranto' | 'habeas_corpus';

const WRIT_OPTIONS: { id: WritType; label: string; help: string }[] = [
  {
    id: 'mandamus',
    label: 'Mandamus',
    help: "To direct a public authority to perform a public duty it has failed or refused to perform.",
  },
  {
    id: 'certiorari',
    label: 'Certiorari',
    help: 'To quash an order, decision, or proceeding of a court, tribunal, or authority acting judicially or quasi-judicially.',
  },
  {
    id: 'prohibition',
    label: 'Prohibition',
    help: 'To restrain a court, tribunal, or authority from continuing proceedings it has no jurisdiction to conduct.',
  },
  {
    id: 'quo_warranto',
    label: 'Quo Warranto',
    help: 'To challenge the authority of a person purporting to hold a public office.',
  },
  {
    id: 'habeas_corpus',
    label: 'Habeas Corpus',
    help: 'To produce a person believed to be illegally detained before the Court, and secure their release.',
  },
];

const GROUND_OPTIONS: { id: string; label: string; prose: string }[] = [
  {
    id: 'natural_justice',
    label: 'Violation of principles of natural justice',
    prose: 'the impugned action/order was passed in violation of the principles of natural justice, without affording the Petitioner a fair opportunity of being heard',
  },
  {
    id: 'jurisdiction',
    label: 'Action without jurisdiction or in excess of jurisdiction',
    prose: 'the Respondent(s) acted without jurisdiction, or in excess of the jurisdiction vested in them by law',
  },
  {
    id: 'fundamental_rights',
    label: 'Violation of fundamental rights (Part III of the Constitution)',
    prose: "the impugned action/order violates the Petitioner's fundamental rights guaranteed under Part III of the Constitution of India",
  },
  {
    id: 'arbitrary',
    label: 'Arbitrary, unreasonable, or mala fide exercise of power',
    prose: 'the impugned action/order is arbitrary, unreasonable, and constitutes a mala fide and colourable exercise of power',
  },
  {
    id: 'non_application_of_mind',
    label: 'Non-application of mind / failure to consider relevant material',
    prose: 'the impugned action/order discloses non-application of mind, and a failure to consider material relevant to the decision',
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  writType: WritType | null;
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  respondentEntries: string[];
  impugnedAction: string;
  impugnedDate: string;
  passedBy: string;
  specificDirection: string;
  detainedPersonName: string;
  officeOrPosition: string;
  alternativeRemedyNote: string;
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
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'Court & parties',
  'Grievance & grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function WritPetitionWizard({
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
  const [writType, setWritType] = useState<WritType | null>(saved?.writType ?? null);
  const [petitionerName, setPetitionerName] = useState(saved?.petitionerName ?? '');
  const [petitionerAge, setPetitionerAge] = useState(saved?.petitionerAge ?? '');
  const [petitionerAddress, setPetitionerAddress] = useState(saved?.petitionerAddress ?? '');
  const [respondentEntries, setRespondentEntries] = useState<string[]>(saved?.respondentEntries ?? ['']);
  const addRespondent = () => setRespondentEntries((r) => [...r, '']);
  const removeRespondent = (i: number) => setRespondentEntries((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  const updateRespondent = (i: number, value: string) => setRespondentEntries((r) => r.map((entry, idx) => (idx === i ? value : entry)));
  const [impugnedAction, setImpugnedAction] = useState(saved?.impugnedAction ?? '');
  const [impugnedDate, setImpugnedDate] = useState(saved?.impugnedDate ?? '');
  const [passedBy, setPassedBy] = useState(saved?.passedBy ?? '');
  const [specificDirection, setSpecificDirection] = useState(saved?.specificDirection ?? '');
  const [detainedPersonName, setDetainedPersonName] = useState(saved?.detainedPersonName ?? '');
  const [officeOrPosition, setOfficeOrPosition] = useState(saved?.officeOrPosition ?? '');
  const [alternativeRemedyNote, setAlternativeRemedyNote] = useState(saved?.alternativeRemedyNote ?? '');
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

  const filledRespondents = respondentEntries.filter((r) => r.trim().length > 0);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      writType,
      petitionerName,
      petitionerAge,
      petitionerAddress,
      respondentEntries,
      impugnedAction,
      impugnedDate,
      passedBy,
      specificDirection,
      detainedPersonName,
      officeOrPosition,
      alternativeRemedyNote,
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
      [WIZARD_CASE_TYPE_KEY]: 'ct-writ-petition-226',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} vs. ${filledRespondents[0] || 'Respondent'} — Writ Petition`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-writ-petition-226');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [petitionerName || '[Petitioner]', '(PETITIONER)'],
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

  const writLabel = WRIT_OPTIONS.find((w) => w.id === writType)?.label ?? 'appropriate writ';

  const prayerText = (() => {
    switch (writType) {
      case 'certiorari':
        return `issue a writ of Certiorari, or any other appropriate writ, order, or direction, calling for the records relating to ${
          impugnedAction || '[the impugned action/order]'
        } dated ${impugnedDate || '[date]'} passed by ${passedBy || '[the authority]'}, and quashing the same`;
      case 'prohibition':
        return `issue a writ of Prohibition, or any other appropriate writ, order, or direction, prohibiting ${
          filledRespondents[0] || 'the Respondent(s)'
        } from ${specificDirection || '[the action sought to be prohibited]'}`;
      case 'quo_warranto':
        return `issue a writ of Quo Warranto, or any other appropriate writ, order, or direction, calling upon ${
          filledRespondents[0] || 'the Respondent'
        } to show under what authority he/she continues to hold or act in ${
          officeOrPosition || '[the office/position]'
        }, and to remove the said Respondent therefrom`;
      case 'habeas_corpus':
        return `issue a writ of Habeas Corpus, or any other appropriate writ, order, or direction, directing ${
          filledRespondents[0] || 'the Respondent(s)'
        } to produce the body of ${detainedPersonName || '[name of the detenu]'} before this Hon'ble Court, and to set him/her at liberty forthwith`;
      case 'mandamus':
      default:
        return `issue a writ of Mandamus, or any other appropriate writ, order, or direction, directing ${
          filledRespondents[0] || 'the Respondent(s)'
        } to ${specificDirection || '[the direction sought]'}`;
    }
  })();

  const draftSections: DraftSection[] = [
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the background facts leading up to this petition — the events, the impugned action/order/inaction, and how it affects the Petitioner]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    ...(writType === 'certiorari'
      ? [
          {
            heading: 'Particulars of the impugned order',
            paragraphs: [
              toThatClause(
                `the impugned ${impugnedAction || '[order/action]'} dated ${
                  impugnedDate || '[date]'
                }, passed by ${passedBy || '[the authority]'}, is illegal, without jurisdiction, and liable to be quashed.`
              ),
            ],
          },
        ]
      : []),
    {
      heading: 'Alternative remedy',
      paragraphs: [
        toThatClause(
          alternativeRemedyNote.trim() ||
            'the Petitioner has no other equally efficacious alternative remedy, and this Hon\'ble Court\'s writ jurisdiction is the appropriate remedy in the facts and circumstances of the present case'
        ),
      ],
    },
    {
      heading: 'Grounds',
      paragraphs:
        groundParagraphs.length > 0
          ? groundParagraphs
          : [toThatClause('the impugned action/order is liable to be interfered with by this Hon\'ble Court in exercise of its writ jurisdiction.')],
      incomplete: grounds.length === 0,
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to ${prayerText}, and to pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'high_court',
    applicationTitle: `Writ Petition (${writLabel})`,
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    applicantLabel: 'PETITIONER',
    respondentName: filledRespondents[0] || '',
    respondentEntries: filledRespondents.length > 1 ? filledRespondents : undefined,
    respondentLabel: 'RESPONDENT',
    caseNumberLine: `W.P. No. _____ of ${new Date().getFullYear()}`,
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
            <h3 className="step-heading">Court and parties</h3>
            <p className="step-help">
              Which writ fits depends on your grievance — pick the one that matches, or the closest one; petitions
              conventionally also pray "or any other appropriate writ" so the Court isn't limited to only the one
              named.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              {WRIT_OPTIONS.map((opt) => (
                <label key={opt.id} style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input type="radio" name="writType" checked={writType === opt.id} onChange={() => setWritType(opt.id)} />
                    <span style={{ fontWeight: 600 }}>{opt.label}</span>
                  </div>
                  <span style={{ marginLeft: 24, color: 'var(--text-muted)', fontSize: '14px' }}>{opt.help}</span>
                </label>
              ))}
            </div>
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
            </div>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <span className="field-label">Respondent(s) — typically the State/Government authority concerned</span>
              {respondentEntries.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    value={r}
                    placeholder={`Respondent No. ${i + 1}`}
                    onChange={(e) => updateRespondent(i, e.target.value)}
                  />
                  <button type="button" className="para-btn" onClick={() => removeRespondent(i)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="para-btn" onClick={addRespondent}>
                + Add respondent
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Grievance and grounds</h3>
            {writType === 'certiorari' && (
              <div className="form-grid">
                <label className="form-field">
                  <span>Nature of the impugned order/action</span>
                  <input type="text" value={impugnedAction} onChange={(e) => setImpugnedAction(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Date of the impugned order/action</span>
                  <input type="date" value={impugnedDate} onChange={(e) => setImpugnedDate(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Authority/court/tribunal that passed it</span>
                  <input type="text" value={passedBy} onChange={(e) => setPassedBy(e.target.value)} />
                </label>
              </div>
            )}
            {(writType === 'mandamus' || writType === 'prohibition') && (
              <label className="form-field">
                <span>{writType === 'mandamus' ? 'What the Respondent should be directed to do' : 'What the Respondent should be prohibited from doing'}</span>
                <input type="text" value={specificDirection} onChange={(e) => setSpecificDirection(e.target.value)} />
              </label>
            )}
            {writType === 'quo_warranto' && (
              <label className="form-field">
                <span>The public office/position in question</span>
                <input type="text" value={officeOrPosition} onChange={(e) => setOfficeOrPosition(e.target.value)} />
              </label>
            )}
            {writType === 'habeas_corpus' && (
              <label className="form-field">
                <span>Name of the person detained</span>
                <input type="text" value={detainedPersonName} onChange={(e) => setDetainedPersonName(e.target.value)} />
              </label>
            )}
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Why writ jurisdiction, and not an alternative remedy (if any exists)</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={alternativeRemedyNote}
                onChange={(e) => setAlternativeRemedyNote(e.target.value)}
                placeholder="e.g. no other equally efficacious remedy exists; or the case falls within a recognised exception (violation of fundamental rights, want of jurisdiction, violation of natural justice)"
              />
            </label>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              Tick every ground that applies:
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
                placeholder="Describe the background facts leading up to this petition"
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
              Add each document you're annexing, in the order it will be paginated — including a copy of the
              impugned order/action, and any representation made before filing this petition.
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
            <p className="step-help">A filed petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Writ Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Writ Petition"
              subtitle={`Petition under Article 226 of the Constitution of India (${writLabel}) — ${
                petitionerName || '[Petitioner]'
              } vs. ${filledRespondents[0] || '[Respondent]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Writ Petition — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="highCourtOriginal" contextLabel={filingPlace || undefined} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                No fixed statutory deadline
              </p>
              <p className="deadline-body">
                Article 226 has no fixed limitation period, but courts apply the doctrine of laches — unreasonable,
                unexplained delay in approaching the Court can itself defeat an otherwise good petition. File as
                promptly as possible, and be ready to explain any delay.
              </p>
            </div>

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-4)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Do you want to match your draft with a particular style?
              </p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, or to follow a sample petition's format, go to the next
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
