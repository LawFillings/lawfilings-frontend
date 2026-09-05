import { useEffect, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { ForumTierSelector } from '../components/ForumTierSelector';
import { LocationSelector } from '../components/LocationSelector';
import { ThirdPartyNudge } from '../components/ThirdPartyNudge';
import { PrecedentPanel } from '../components/PrecedentPanel';
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
import { fillTemplate } from '../lib/template';
import { findConsumerJurisdictionCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { fetchPrecedents, type PrecedentRecord } from '../lib/precedentsClient';
import { caseTypes, clauses, disputeTypeOptions, reliefOptions } from '../data/mockData';
import { consumerStateLocations } from '../data/forumLocations';
import { CC_COMPLAINT_CASE_TYPE_ID } from '../data/backendCaseTypeIds';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

// A precedent is only safe to cite in an exported filing once it's a real, sourced judgment —
// the `precedents` table also holds inert "[PLACEHOLDER — UNVERIFIED]" rows seeded so the
// panel-during-drafting feature could be built before every case type had real case law sourced.
// Never cite one of those, even if it has slipped through to the panel. `court` and `summary` are
// both required too — the drafted paragraph is a "That the Hon'ble [court] ... has held that
// [summary]" pleading averment (see below), which needs both to form a real sentence.
function isVerifiedPrecedent(p: PrecedentRecord): boolean {
  return (
    Boolean(p.citation) &&
    Boolean(p.court) &&
    Boolean(p.summary) &&
    Boolean(p.sourceUrl) &&
    !p.caseTitle.startsWith('[PLACEHOLDER')
  );
}

const STEPS = ['Dispute type', 'Forum', 'Location', 'Facts', 'Relief', 'Filing details', 'Documents', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-cc-complaint')!;
const ccClauses = clauses.filter((c) => c.caseTypeId === 'ct-cc-complaint');
const clauseByCode = (code: string) => ccClauses.find((c) => c.code === code)!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  disputeType: string | null;
  claimValue: number;
  stateId: string;
  district: string;
  facts: string;
  relief: string | null;
  complainantName: string;
  opponentName: string;
  complainantAge: string;
  complainantAddress: string;
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
  onOpenCaseLawSearch?: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function ConsumerComplaintWizard({
  onBack,
  onOpenCaseLawSearch,
  onOpenCheckout,
  onOpenPricing,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [disputeType, setDisputeType] = useState<string | null>(saved?.disputeType ?? null);
  const [claimValue, setClaimValue] = useState(saved?.claimValue ?? 500000);
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [district, setDistrict] = useState(saved?.district ?? '');
  const [facts, setFacts] = useState(saved?.facts ?? '');
  const [relief, setRelief] = useState<string | null>(saved?.relief ?? null);
  const [complainantName, setComplainantName] = useState(saved?.complainantName ?? '');
  const [opponentName, setOpponentName] = useState(saved?.opponentName ?? '');
  const [complainantAge, setComplainantAge] = useState(saved?.complainantAge ?? '');
  const [complainantAddress, setComplainantAddress] = useState(saved?.complainantAddress ?? '');
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
  const [precedents, setPrecedents] = useState<PrecedentRecord[]>([]);
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      disputeType,
      claimValue,
      stateId,
      district,
      facts,
      relief,
      complainantName,
      opponentName,
      complainantAge,
      complainantAddress,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-cc-complaint',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${complainantName || 'Complainant'} vs. ${opponentName || 'Opposite Party'} — Consumer Complaint`,
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

  useEffect(() => {
    fetchPrecedents(CC_COMPLAINT_CASE_TYPE_ID).then(setPrecedents);
  }, []);

  const matchedTier = caseType.jurisdictionRule?.tiers?.find(
    (t) => (t.min === undefined || claimValue >= t.min) && (t.max === undefined || claimValue < t.max)
  );
  const isNational = matchedTier?.forumLabel === 'National Commission';
  const selectedState = consumerStateLocations.find((s) => s.id === stateId);

  const reliefLabel = reliefOptions.find((r) => r.id === relief)?.label;
  const citationMatches = findConsumerJurisdictionCitation(matchedTier?.forumLabel);
  const verifiedPrecedents = precedents.filter(isVerifiedPrecedent);

  const draftSections: DraftSection[] = [
    {
      heading: 'Jurisdiction',
      paragraphs: [toThatClause(clauseByCode('CC-01').bodyTemplate)],
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    {
      heading: 'Statement of facts',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('CC-02').bodyTemplate, { facts_narrative: facts }))],
      incomplete: !facts,
    },
    ...(verifiedPrecedents.length > 0
      ? [
          {
            heading: 'Case law relied upon',
            // Same "That the Hon'ble [Court] in [Case], [Citation], has held that [holding]."
            // pleading-averment convention as buildCaseLawParagraphs (actReferenceMatcher.ts) —
            // and, per that convention, the source URL stays out of the drafted text itself.
            paragraphs: verifiedPrecedents.map(
              (p) => `That the Hon'ble ${p.court} in ${p.caseTitle}, ${p.citation}, has held that ${p.summary}`
            ),
          },
        ]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [fillTemplate(clauseByCode('CC-03').bodyTemplate, { relief_sought: reliefLabel?.toLowerCase() })],
      incomplete: !relief,
    },
    ...buildVerificationSection(complainantName),
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: complainantName,
    respondentName: opponentName,
    filingCategory: caseType.filingCategory,
  });

  const documentTitle = isNational
    ? 'Before the National Consumer Disputes Redressal Commission'
    : selectedState
    ? `Before the ${matchedTier?.forumLabel ?? 'Consumer Commission'}, ${selectedState.label.replace('State Consumer Commission, ', '')}${district ? `, ${district} District` : ''}`
    : `Before the ${matchedTier?.forumLabel ?? 'Consumer Commission'}`;

  // --- Part I: Index, and Part III: Affidavit — bundled with every Complaint. ---
  const filedByBlock = buildFiledByBlock({
    applicantLines: [complainantName || '[Complainant]', '(COMPLAINANT)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });
  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...filedByBlock,
  ];
  const indexCauseTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    applicantName: complainantName,
    respondentName: opponentName,
    filingCategory: caseType.filingCategory,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(complainantName || '[Complainant]')} aged about ${complainantAge || '[age]'}, R/o ${
          complainantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Complainant in the present case, and I am well conversant with the facts and circumstances of the case.',
        '2. That the accompanying Complaint has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.',
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
  const affidavitCauseTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    applicantName: complainantName,
    respondentName: opponentName,
    filingCategory: caseType.filingCategory,
    bodyHeading: 'AFFIDAVIT',
  });

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
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Select dispute category' : 'What kind of problem are you dealing with?'}
            </h3>
            <div className="grounds-grid">
              {disputeTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={disputeType === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setDisputeType(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <PrecedentPanel caseTypeId={CC_COMPLAINT_CASE_TYPE_ID} onOpenCaseLawSearch={onOpenCaseLawSearch} />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Pecuniary jurisdiction' : 'Where should this be filed?'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Jurisdiction is based on value of consideration paid, not compensation claimed.'
                : 'This is based on how much you paid, not how much you’re asking for back.'}
            </p>
            {caseType.jurisdictionRule && (
              <ForumTierSelector rule={caseType.jurisdictionRule} mode={mode} onValueChange={setClaimValue} />
            )}
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Complainant' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the Complainant in this case)</span>
                  )}
                </span>
                <input type="text" value={complainantName} onChange={(e) => setComplainantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Opposite party</span>
                <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Territorial jurisdiction' : 'Which state?'}</h3>
            {isNational ? (
              <p className="step-help">
                The National Commission sits in New Delhi — there's only one, so no location selection is
                needed here.
              </p>
            ) : (
              <>
                <LocationSelector
                  mode={mode}
                  locations={consumerStateLocations}
                  value={stateId}
                  onSelect={setStateId}
                  label={mode === 'advocate' ? 'State' : 'Which state is this in?'}
                  helpText={
                    mode === 'advocate'
                      ? 'Based on where the opposite party resides/carries on business, or where the cause of action arose.'
                      : 'Usually the state where you or the seller/service provider is located.'
                  }
                  verifyNote="Standard list of Indian states and Union Territories — confirm your specific Commission's current address at"
                  verifyUrl="https://consumeraffairs.nic.in"
                  searchPlaceholder="Type a state…"
                />
                {matchedTier?.forumLabel === 'District Commission' && (
                  <div style={{ marginTop: 'var(--space-4)', maxWidth: 420 }}>
                    <label className="form-field">
                      <span>
                        {mode === 'advocate' ? 'District' : 'Which district?'}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                          {' '}
                          (full district list not yet available — type it directly)
                        </span>
                      </span>
                      <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Pune" />
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Statement of facts' : 'Tell us what happened'}</h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'Chronological statement of material facts.'
                : 'Write it in your own words — this gets turned into the formal statement of facts automatically.'}
            </p>
            <textarea
              className="facts-textarea"
              rows={6}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              placeholder={
                mode === 'advocate'
                  ? 'On [date], the Complainant purchased...'
                  : 'I bought a washing machine on... it stopped working after...'
              }
            />
            <ThirdPartyNudge text={facts} knownPartyNames={[complainantName, opponentName].filter(Boolean)} />
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Relief sought' : 'What do you want the commission to order?'}
            </h3>
            <div className="grounds-grid">
              {reliefOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={relief === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setRelief(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Your age</span>
                <input type="text" value={complainantAge} onChange={(e) => setComplainantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Your address</span>
                <input type="text" value={complainantAddress} onChange={(e) => setComplainantAddress(e.target.value)} />
              </label>
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
              <div key={i} className="form-grid" style={{ marginBottom: 'var(--space-3)' }}>
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
                <button className="para-btn" onClick={() => removeDocumentEntry(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button className="para-btn" onClick={addDocumentEntry}>
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
            <p className="step-help">A filed Complaint is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Complaint — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Complaint</h4>
            <DraftDocument
              title={documentTitle}
              subtitle={`Complaint under Section 35, Consumer Protection Act, 2019 — ${complainantName || '[Complainant]'} vs. ${opponentName || '[Opposite Party]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Complaint — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance
              forum="consumerCommission"
              contextLabel={
                isNational
                  ? 'National Consumer Disputes Redressal Commission'
                  : `${matchedTier?.forumLabel ?? 'Consumer Commission'}${district ? `, ${district} District` : ''}`
              }
            />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
