import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  withPeriod,
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-divorce-mutual-consent')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  petitioner1Name: string;
  petitioner1Age: string;
  petitioner1Address: string;
  petitioner2Name: string;
  petitioner2Age: string;
  petitioner2Address: string;
  marriageDate: string;
  marriagePlace: string;
  childrenDetails: string;
  separationDate: string;
  factsNarrative: string;
  maintenanceTerms: string;
  custodyTerms: string;
  assetsTerms: string;
  requestWaiver: boolean;
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

export function MutualConsentDivorceWizard({
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
  const [petitioner1Name, setPetitioner1Name] = useState(saved?.petitioner1Name ?? '');
  const [petitioner1Age, setPetitioner1Age] = useState(saved?.petitioner1Age ?? '');
  const [petitioner1Address, setPetitioner1Address] = useState(saved?.petitioner1Address ?? '');
  const [petitioner2Name, setPetitioner2Name] = useState(saved?.petitioner2Name ?? '');
  const [petitioner2Age, setPetitioner2Age] = useState(saved?.petitioner2Age ?? '');
  const [petitioner2Address, setPetitioner2Address] = useState(saved?.petitioner2Address ?? '');
  const [marriageDate, setMarriageDate] = useState(saved?.marriageDate ?? '');
  const [marriagePlace, setMarriagePlace] = useState(saved?.marriagePlace ?? '');
  const [childrenDetails, setChildrenDetails] = useState(saved?.childrenDetails ?? '');
  const [separationDate, setSeparationDate] = useState(saved?.separationDate ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [maintenanceTerms, setMaintenanceTerms] = useState(saved?.maintenanceTerms ?? '');
  const [custodyTerms, setCustodyTerms] = useState(saved?.custodyTerms ?? '');
  const [assetsTerms, setAssetsTerms] = useState(saved?.assetsTerms ?? '');
  const [requestWaiver, setRequestWaiver] = useState(saved?.requestWaiver ?? false);
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

  // Bundled with every Mutual Consent Divorce filing. A conditional extra document (Waiver
  // Application) is appended only if requestWaiver is checked — same pattern AppealWizard.tsx
  // uses for its optional Deposit step.
  const STEPS = [
    'Petitioners & marriage',
    'Living separately',
    'Facts',
    'Terms of settlement',
    'Grounds',
    'Filing details',
    'Documents (Index)',
    'Preview',
    'Judge style (optional)',
  ];

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      petitioner1Name,
      petitioner1Age,
      petitioner1Address,
      petitioner2Name,
      petitioner2Age,
      petitioner2Address,
      marriageDate,
      marriagePlace,
      childrenDetails,
      separationDate,
      factsNarrative,
      maintenanceTerms,
      custodyTerms,
      assetsTerms,
      requestWaiver,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-divorce-mutual-consent',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${petitioner1Name || 'Petitioner No. 1'} & ${petitioner2Name || 'Petitioner No. 2'} — Mutual Consent Divorce`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-divorce-mutual-consent');
  const caseLawMatches = requestWaiver ? findFixedCaseTypeCaseLaw('ct-divorce-mutual-consent') : [];

  const settlementLines = [
    maintenanceTerms.trim() ? `Maintenance/alimony: ${maintenanceTerms.trim()}` : null,
    custodyTerms.trim() ? `Custody and visitation: ${custodyTerms.trim()}` : null,
    assetsTerms.trim() ? `Streedhan, gifts, and division of assets: ${assetsTerms.trim()}` : null,
  ].filter((l): l is string => l !== null);

  const filedByBlock = buildFiledByBlock({
    applicantLines: [
      petitioner1Name || '[Petitioner No. 1]',
      '(PETITIONER NO. 1)',
      petitioner2Name || '[Petitioner No. 2]',
      '(PETITIONER NO. 2)',
    ],
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
          `Petitioner No. 1, ${withPeriod(petitioner1Name || '[Petitioner No. 1]')} and Petitioner No. 2, ${withPeriod(
            petitioner2Name || '[Petitioner No. 2]'
          )} were married at ${marriagePlace || '[place]'} on ${marriageDate || '[date]'}, according to Hindu rites and ceremonies.`
        ),
        ...(childrenDetails.trim() ? [toThatClause(`Of the said marriage, ${childrenDetails.trim()}`)] : []),
      ],
      incomplete: !marriageDate || !marriagePlace,
    },
    {
      heading: 'Living separately',
      paragraphs: [
        toThatClause(
          `The parties have been living separately since ${separationDate || '[date]'}, have not been able to live together, and have mutually agreed that the marriage should be dissolved.`
        ),
      ],
      incomplete: !separationDate,
    },
    {
      heading: 'Statement of no collusion',
      paragraphs: [
        toThatClause(
          'The consent of the parties to this petition has not been obtained by force, fraud, or undue influence, and this petition is not the result of any collusion between the parties.'
        ),
      ],
    },
    {
      heading: 'Facts leading to the mutual consent',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe the marital discord and any reconciliation attempts]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Terms of settlement',
      paragraphs:
        settlementLines.length > 0
          ? settlementLines.map(toThatClause)
          : ['[Add the agreed terms of settlement in the Terms of settlement step]'],
      incomplete: settlementLines.length === 0,
    },
    {
      heading: 'Grounds for decree of divorce by mutual consent',
      paragraphs: [
        toThatClause(
          'The parties have been living separately for a period of one year or more, have not been able to live together, and have mutually agreed that the marriage should be dissolved, as required under section 13B(1) of the Hindu Marriage Act, 1955.'
        ),
        ...(requestWaiver
          ? [
              toThatClause(
                'The parties jointly request that the minimum six-month waiting period under section 13B(2) of the Act be waived, since the parties have already been living separately for a substantial period and there is no possibility of reconciliation.'
              ),
            ]
          : []),
      ],
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
        `It is therefore most respectfully prayed that this Hon'ble Court may be pleased to dissolve the marriage between Petitioner No. 1 and Petitioner No. 2 by a decree of divorce by mutual consent under section 13B of the Hindu Marriage Act, 1955${
          requestWaiver ? ', waive the minimum six-month waiting period under sub-section (2)' : ''
        }, incorporate the terms of settlement recorded above into the decree, and pass any other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.`,
      ],
    },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `We, ${withPeriod(petitioner1Name || '[Petitioner No. 1]')} (Petitioner No. 1) and ${withPeriod(
          petitioner2Name || '[Petitioner No. 2]'
        )} (Petitioner No. 2), do hereby verify that the contents of the foregoing petition are true and correct to the best of our respective knowledge and belief, and that nothing material has been concealed therefrom.`,
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()}.`,
      ],
    },
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'family_court',
    applicationTitle: 'Mutual Consent Divorce Petition',
    governingLaw: caseType.governingLaw,
    applicantName: petitioner1Name,
    applicantEntries: [petitioner1Name || '[Petitioner No. 1]', petitioner2Name || '[Petitioner No. 2]'],
    respondentName: '',
    noRespondent: true,
    caseNumberLine: `HMA (MC) No. _____ of ${new Date().getFullYear()}`,
    benchCity: filingPlace || undefined,
  };
  const causeTitleHtml = buildCauseTitleHtml(causeTitleInfo);
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'INDEX' });
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'JOINT AFFIDAVIT' });
  const waiverCauseTitleHtml = buildCauseTitleHtml({
    ...causeTitleInfo,
    bodyHeading: 'APPLICATION FOR WAIVER OF THE PERIOD UNDER SECTION 13B(2)',
  });

  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    ...filedByBlock,
  ];

  // A joint affidavit sworn by both petitioners — bespoke two-deponent block composed here rather
  // than a shared-lib change, since only this wizard needs it (see BailApplicationWizard.tsx for
  // the equivalent single-deponent pattern this mirrors).
  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `We, ${withPeriod(petitioner1Name || '[Petitioner No. 1]')} aged about ${petitioner1Age || '[age]'}, R/o ${
          petitioner1Address || '[Address]'
        } (Petitioner No. 1), and ${withPeriod(petitioner2Name || '[Petitioner No. 2]')} aged about ${
          petitioner2Age || '[age]'
        }, R/o ${petitioner2Address || '[Address]'} (Petitioner No. 2), the above-named deponents, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That we are the Petitioners in the present case, and we are well conversant with the facts and circumstances of the case.',
        '2. That the accompanying Petition has been prepared at our joint instructions, and the contents thereof are true and correct to our respective knowledge and belief.',
        '3. That our consent to this petition is free, voluntary, and has not been obtained by force, fraud, or undue influence.',
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent (Petitioner No. 1)'] },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent (Petitioner No. 2)'] },
    {
      heading: 'Verification',
      headingAlign: 'center',
      unnumbered: true,
      paragraphs: [
        `Verified at ${verificationPlace || '[Place]'} on this _____ day of _____, ${new Date().getFullYear()} that the contents of our above Affidavit are true and correct and no part of the same is false and nothing material has been concealed therefrom.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent (Petitioner No. 1)'] },
    { unnumbered: true, align: 'right', paragraphs: ['Deponent (Petitioner No. 2)'] },
  ];

  const waiverSections: DraftSection[] = [
    {
      paragraphs: [
        toThatClause(
          'The petitioners have filed the accompanying petition under section 13B of the Hindu Marriage Act, 1955 for divorce by mutual consent.'
        ),
        toThatClause(
          `The parties have been living separately since ${separationDate || '[date]'}, well in excess of the one-year period required under sub-section (1).`
        ),
        toThatClause(
          'All efforts at mediation and reconciliation between the parties have failed, and there is no possibility of the parties reconciling.'
        ),
        toThatClause(
          'The parties have already settled all ancillary issues between them, as recorded in the terms of settlement annexed to the accompanying petition.'
        ),
      ],
    },
    ...(caseLawMatches.length > 0
      ? [{ heading: 'Case law relied upon', paragraphs: buildCaseLawParagraphs(caseLawMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        "It is therefore most respectfully prayed that this Hon'ble Court may be pleased to waive the minimum six-month waiting period under section 13B(2) of the Hindu Marriage Act, 1955 and proceed to record the parties' statements and pass a decree of divorce by mutual consent forthwith.",
      ],
    },
    ...filedByBlock,
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
            <h3 className="step-heading">Petitioners and marriage</h3>
            <p className="step-help">A mutual consent petition is filed jointly by both spouses as co-petitioners.</p>
            <div className="form-grid">
              <label className="form-field">
                <span>Petitioner No. 1</span>
                <input type="text" value={petitioner1Name} onChange={(e) => setPetitioner1Name(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner No. 1's age</span>
                <input type="text" value={petitioner1Age} onChange={(e) => setPetitioner1Age(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner No. 1's address</span>
                <input type="text" value={petitioner1Address} onChange={(e) => setPetitioner1Address(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner No. 2</span>
                <input type="text" value={petitioner2Name} onChange={(e) => setPetitioner2Name(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner No. 2's age</span>
                <input type="text" value={petitioner2Age} onChange={(e) => setPetitioner2Age(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Petitioner No. 2's address</span>
                <input type="text" value={petitioner2Address} onChange={(e) => setPetitioner2Address(e.target.value)} />
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
                placeholder="e.g. two children were born — a son aged 8 and a daughter aged 5"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Living separately</h3>
            <p className="step-help">
              Section 13B(1) requires the parties to have lived separately for at least one year before this
              petition can be filed.
            </p>
            <label className="form-field" style={{ maxWidth: 320 }}>
              <span>Date the parties started living separately</span>
              <input type="date" value={separationDate} onChange={(e) => setSeparationDate(e.target.value)} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Facts leading to the mutual consent</h3>
            <textarea
              className="facts-textarea"
              rows={6}
              value={factsNarrative}
              onChange={(e) => setFactsNarrative(e.target.value)}
              placeholder="Describe the marital discord and any reconciliation attempts that led to this joint decision"
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Terms of settlement</h3>
            <p className="step-help">The terms both parties have already agreed on, to be incorporated into the decree.</p>
            <label className="form-field">
              <span>Maintenance / alimony (one-time or periodic, or "none")</span>
              <textarea
                className="facts-textarea"
                rows={2}
                value={maintenanceTerms}
                onChange={(e) => setMaintenanceTerms(e.target.value)}
                placeholder="e.g. a one-time payment of ₹10,00,000 in full and final settlement"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-3)' }}>
              <span>Custody and visitation (if there are children)</span>
              <textarea
                className="facts-textarea"
                rows={2}
                value={custodyTerms}
                onChange={(e) => setCustodyTerms(e.target.value)}
                placeholder="e.g. custody with Petitioner No. 1, visitation rights to Petitioner No. 2 on alternate weekends"
              />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-3)' }}>
              <span>Streedhan, gifts, and division of assets</span>
              <textarea
                className="facts-textarea"
                rows={2}
                value={assetsTerms}
                onChange={(e) => setAssetsTerms(e.target.value)}
                placeholder="e.g. Petitioner No. 2 has already returned all streedhan articles to Petitioner No. 1"
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

        {step === 4 && (
          <div>
            <h3 className="step-heading">Grounds</h3>
            <p className="step-help">
              Section 13B(1)'s grounds (living separately, unable to live together, mutual agreement) are pleaded
              automatically from what you've already entered.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input type="checkbox" checked={requestWaiver} onChange={(e) => setRequestWaiver(e.target.checked)} />
              <span>
                Request waiver of the six-month cooling-off period under section 13B(2) (per{' '}
                <em>Amardeep Singh v. Harveen Kaur</em>, (2017) 8 SCC 746) — adds a separate waiver application to
                the filing bundle
              </span>
            </label>
          </div>
        )}

        {step === 5 && (
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

        {step === 6 && (
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
            <DraftDocument title="Mutual Consent Divorce Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Mutual Consent Divorce Petition"
              subtitle={`Petition under Section 13B, Hindu Marriage Act, 1955 — ${petitioner1Name || '[Petitioner No. 1]'} & ${petitioner2Name || '[Petitioner No. 2]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Joint Affidavit</h4>
            <DraftDocument title="Mutual Consent Divorce Petition — Joint Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            {requestWaiver && (
              <>
                <h4 style={{ marginTop: 'var(--space-6)' }}>Part IV — Application for Waiver of Section 13B(2) Period</h4>
                <DraftDocument
                  title="Application for Waiver of the Period Under Section 13B(2)"
                  causeTitleHtml={waiverCauseTitleHtml}
                  sections={waiverSections}
                />
              </>
            )}

            <FilingGuidance forum="familyCourt" contextLabel={filingPlace || undefined} />

            <div className="deadline-card" style={{ marginTop: 'var(--space-6)' }}>
              <p className="deadline-label">Want this matched to a specific judge's style?</p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, go to the next step and upload 1–3 of their judgments —
                that's a paid, on-demand feature, not included by default.
              </p>
            </div>
          </div>
        )}

        {step === 8 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
