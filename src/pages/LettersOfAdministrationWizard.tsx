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

const caseType = caseTypes.find((ct) => ct.id === 'ct-letters-of-administration')!;

type CourtLevel = 'district_court' | 'high_court';

const COURT_LEVEL_OPTIONS: { id: CourtLevel; label: string; help: string }[] = [
  {
    id: 'district_court',
    label: 'District Judge',
    help: 'The usual forum, wherever the deceased had a fixed place of abode or property.',
  },
  {
    id: 'high_court',
    label: 'High Court (Original Side)',
    help: "In Mumbai, Chennai, and Kolkata, this jurisdiction is exercised by the High Court's Original Side instead of a District Judge.",
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  courtLevel: CourtLevel | null;
  petitionerName: string;
  petitionerAge: string;
  petitionerAddress: string;
  relationshipToDeceased: string;
  deceasedName: string;
  dateOfDeath: string;
  placeOfDeath: string;
  ordinaryResidence: string;
  familyRelatives: string;
  rightClaimed: string;
  assetsDescription: string;
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
  'Court & petitioner',
  'Deceased & family details',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function LettersOfAdministrationWizard({
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
  const [petitionerName, setPetitionerName] = useState(saved?.petitionerName ?? '');
  const [petitionerAge, setPetitionerAge] = useState(saved?.petitionerAge ?? '');
  const [petitionerAddress, setPetitionerAddress] = useState(saved?.petitionerAddress ?? '');
  const [relationshipToDeceased, setRelationshipToDeceased] = useState(saved?.relationshipToDeceased ?? '');
  const [deceasedName, setDeceasedName] = useState(saved?.deceasedName ?? '');
  const [dateOfDeath, setDateOfDeath] = useState(saved?.dateOfDeath ?? '');
  const [placeOfDeath, setPlaceOfDeath] = useState(saved?.placeOfDeath ?? '');
  const [ordinaryResidence, setOrdinaryResidence] = useState(saved?.ordinaryResidence ?? '');
  const [familyRelatives, setFamilyRelatives] = useState(saved?.familyRelatives ?? '');
  const [rightClaimed, setRightClaimed] = useState(saved?.rightClaimed ?? '');
  const [assetsDescription, setAssetsDescription] = useState(saved?.assetsDescription ?? '');
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
      petitionerName,
      petitionerAge,
      petitionerAddress,
      relationshipToDeceased,
      deceasedName,
      dateOfDeath,
      placeOfDeath,
      ordinaryResidence,
      familyRelatives,
      rightClaimed,
      assetsDescription,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-letters-of-administration',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitionerName || 'Petitioner'} — Letters of Administration re. estate of ${deceasedName || 'Deceased'}`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-letters-of-administration');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-letters-of-administration');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [petitionerName || '[Petitioner]', '(PETITIONER)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const courtNoun = courtLevel === 'high_court' ? 'High Court' : 'District Judge';

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the deceased',
      paragraphs: [
        toThatClause(
          `${deceasedName || '[Name of the deceased]'} (hereinafter "the deceased") died intestate on ${
            dateOfDeath || '[date of death]'
          } at ${placeOfDeath || '[place of death]'}, and at the time of his/her death had a fixed place of abode, or property, at ${
            ordinaryResidence || '[address within the jurisdiction of this Hon\'ble Court]'
          }, within the jurisdiction of this Hon'ble ${courtNoun}.`
        ),
      ],
      incomplete: !deceasedName || !dateOfDeath || !ordinaryResidence,
    },
    {
      heading: 'Family and other relatives of the deceased',
      paragraphs: [
        toThatClause(
          familyRelatives.trim() ||
            "[List the deceased's family or other relatives and their respective residences]"
        ),
      ],
      incomplete: !familyRelatives.trim(),
      role: 'facts',
    },
    {
      heading: 'Right in which the Petitioner claims',
      paragraphs: [
        toThatClause(
          rightClaimed.trim() ||
            '[State the right in which the Petitioner claims, e.g. as a Class I legal heir of the deceased under the applicable law of succession, entitled to the administration of the estate]'
        ),
      ],
      incomplete: !rightClaimed.trim(),
    },
    {
      heading: 'Assets of the estate',
      paragraphs: [
        toThatClause(
          assetsDescription.trim() ||
            "[Describe the amount and nature of the assets likely to come to the Petitioner's hands as administrator]"
        ),
      ],
      incomplete: !assetsDescription.trim(),
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
        `It is therefore most respectfully prayed that this Hon'ble ${courtNoun} may be pleased to grant Letters of Administration of the estate of the deceased ${
          deceasedName || '[Deceased]'
        } to the Petitioner, and to pass any other order(s) as this Hon'ble ${courtNoun} may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(petitionerName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: courtLevel ?? 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: petitionerName,
    applicantLabel: 'PETITIONER',
    respondentName: '',
    noRespondent: true,
    caseNumberLine: `Letters of Administration Case No. _____ of ${new Date().getFullYear()}`,
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
        `1. That I am the Petitioner in the present case, being the ${
          relationshipToDeceased.trim() || '[relationship]'
        } of the deceased, and I am well conversant with the facts and circumstances of the case.`,
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
            <h3 className="step-heading">Court and petitioner</h3>
            <p className="step-help">
              Use this when the deceased left no Will (or no surviving named executor) — if there is a Will and a
              surviving named executor, use Probate instead.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              {COURT_LEVEL_OPTIONS.map((opt) => (
                <label key={opt.id} style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="radio"
                      name="courtLevel"
                      checked={courtLevel === opt.id}
                      onChange={() => setCourtLevel(opt.id)}
                    />
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
              <label className="form-field">
                <span>Petitioner's relationship to the deceased (e.g. son, daughter, spouse)</span>
                <input
                  type="text"
                  value={relationshipToDeceased}
                  onChange={(e) => setRelationshipToDeceased(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Deceased and family details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Name of the deceased</span>
                <input type="text" value={deceasedName} onChange={(e) => setDeceasedName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of death</span>
                <input type="date" value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of death</span>
                <input type="text" value={placeOfDeath} onChange={(e) => setPlaceOfDeath(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Deceased's fixed place of abode / property (within the Court's jurisdiction)</span>
                <input type="text" value={ordinaryResidence} onChange={(e) => setOrdinaryResidence(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Family or other relatives of the deceased, and their respective residences</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={familyRelatives}
                onChange={(e) => setFamilyRelatives(e.target.value)}
                placeholder="e.g. Ramesh Kumar (son), residing at ...; Sunita Devi (widow), residing at ..."
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Right in which the Petitioner claims</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={rightClaimed}
                onChange={(e) => setRightClaimed(e.target.value)}
                placeholder="e.g. as the son and one of the Class I legal heirs of the deceased under the Hindu Succession Act, 1956, entitled to the administration of the estate"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Assets likely to come to the Petitioner's hands as administrator</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={assetsDescription}
                onChange={(e) => setAssetsDescription(e.target.value)}
                placeholder="e.g. immovable property at ..., valued at approx. ₹...; bank balances of approx. ₹...; shares and other securities valued at approx. ₹..."
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
              Add each document you're annexing, in the order it will be paginated — including the death certificate
              of the deceased and any documents proving your relationship to them.
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
            <DraftDocument
              title="Letters of Administration Petition — Index"
              causeTitleHtml={indexCauseTitleHtml}
              sections={indexSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Letters of Administration Petition"
              subtitle={`Petition under Section 278, The Indian Succession Act, 1925 — re. estate of ${
                deceasedName || '[Deceased]'
              }`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument
              title="Letters of Administration Petition — Affidavit"
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance
              forum={courtLevel === 'high_court' ? 'highCourtOriginal' : 'districtCourt'}
              contextLabel={filingPlace || undefined}
            />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
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
