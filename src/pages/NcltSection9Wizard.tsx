import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { EligibilityGates } from '../components/EligibilityGates';
import { LocationSelector } from '../components/LocationSelector';
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
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { caseTypes, clauses } from '../data/mockData';
import { nclBenchLocations } from '../data/forumLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

const STEPS = [
  'Eligibility',
  'NCLT bench',
  'Corporate debtor',
  'Debt & notice',
  'Documents checklist',
  'Filing details',
  'Index entries',
  'Preview',
];

const caseType = caseTypes.find((ct) => ct.id === 'ct-nclt-s9')!;
const ncltClauses = clauses.filter((c) => c.caseTypeId === 'ct-nclt-s9');
const clauseByCode = (code: string) => ncltClauses.find((c) => c.code === code)!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  benchId: string;
  companyName: string;
  registeredOffice: string;
  natureOfDebt: string;
  defaultAmount: string;
  noticeDate: string;
  deliveryDate: string;
  applicantName: string;
  applicantAge: string;
  applicantAddress: string;
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
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function NcltSection9Wizard({
  onBack,
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
  const [gatesCleared, setGatesCleared] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [benchId, setBenchId] = useState(saved?.benchId ?? '');

  const [companyName, setCompanyName] = useState(saved?.companyName ?? '');
  const [registeredOffice, setRegisteredOffice] = useState(saved?.registeredOffice ?? '');
  const [natureOfDebt, setNatureOfDebt] = useState(saved?.natureOfDebt ?? '');
  const [defaultAmount, setDefaultAmount] = useState(saved?.defaultAmount ?? '');
  const [noticeDate, setNoticeDate] = useState(saved?.noticeDate ?? '');
  const [deliveryDate, setDeliveryDate] = useState(saved?.deliveryDate ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAge, setApplicantAge] = useState(saved?.applicantAge ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
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

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      benchId,
      companyName,
      registeredOffice,
      natureOfDebt,
      defaultAmount,
      noticeDate,
      deliveryDate,
      applicantName,
      applicantAge,
      applicantAddress,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-nclt-s9',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} vs. ${companyName || 'Corporate Debtor'} — NCLT Section 9`,
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

  const selectedBench = nclBenchLocations.find((b) => b.id === benchId);
  const citationMatches = findFixedCaseTypeCitation('ct-nclt-s9');

  const draftSections: DraftSection[] = [
    {
      heading: 'Jurisdiction',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('NCLT-01').bodyTemplate, { debtor_registered_office: registeredOffice }))],
      incomplete: !registeredOffice,
    },
    {
      heading: 'Default and demand notice',
      paragraphs: [
        toThatClause(
          fillTemplate(clauseByCode('NCLT-02').bodyTemplate, {
            default_amount: defaultAmount,
            nature_of_debt: natureOfDebt,
            notice_date: noticeDate,
            delivery_date: deliveryDate,
          })
        ),
      ],
      incomplete: !defaultAmount || !natureOfDebt,
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches) }]
      : []),
    {
      heading: 'Affidavit',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('NCLT-03').bodyTemplate, { applicant_name: applicantName }))],
      incomplete: !applicantName,
    },
    {
      heading: 'Prayer',
      paragraphs: [clauseByCode('NCLT-04').bodyTemplate],
    },
    ...buildVerificationSection(applicantName),
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName: companyName,
    filingCategory: caseType.filingCategory,
  });

  // --- Part I: Index, and Part III: Affidavit — bundled with every Section 9 application. This
  // is a separately executed, sworn closing Affidavit; distinct from the "Affidavit in support"
  // narrative clause (NCLT-03) already inside the application body above. ---
  const filedByBlock = buildFiledByBlock({
    applicantLines: [applicantName || '[Applicant]', '(APPLICANT)'],
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
    applicantName,
    respondentName: companyName,
    filingCategory: caseType.filingCategory,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(applicantName || '[Applicant]')} aged about ${applicantAge || '[age]'}, R/o ${
          applicantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Applicant in the present case, and I am well conversant with the facts and circumstances of the case.',
        `2. That the accompanying ${caseType.name} has been prepared at my instructions, and the contents thereof are true and correct to my knowledge and belief.`,
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
    applicantName,
    respondentName: companyName,
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
        onStepChange={(i) => {
          if (i > 0 && !gatesCleared) return;
          setStep(i);
        }}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">
              {mode === 'advocate' ? 'Statutory eligibility gates' : 'Before we start — a few quick checks'}
            </h3>
            <p className="step-help">
              {mode === 'advocate'
                ? 'These run before drafting begins, since a wrongly-filed Section 9 application risks dismissal.'
                : 'These questions decide whether this is even the right form to file.'}
            </p>
            <EligibilityGates
              gates={caseType.eligibilityGates ?? []}
              onAllClear={() => {
                setGatesCleared(true);
                setStep(1);
              }}
              onBlocked={setBlocked}
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'NCLT bench' : 'Which NCLT should this go to?'}</h3>
            <LocationSelector
              mode={mode}
              locations={nclBenchLocations}
              value={benchId}
              onSelect={setBenchId}
              label="NCLT bench"
              helpText={
                mode === 'advocate'
                  ? 'Jurisdiction follows the corporate debtor’s registered office.'
                  : 'This is based on where the company’s registered office is — not where you are.'
              }
              verifyNote="Sourced directly from nclt.gov.in — still worth a quick check at"
              verifyUrl="https://nclt.gov.in"
              searchPlaceholder="Type a city…"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Corporate debtor details' : 'Details of the company'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Company name</span>
                <input type="text" placeholder="e.g. Goodhealth Industries Pvt. Ltd." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Registered office</span>
                <input type="text" placeholder="Address" value={registeredOffice} onChange={(e) => setRegisteredOffice(e.target.value)} />
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
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Default and demand notice' : 'The debt and your notice'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Nature of debt' : 'What was this for?'}</span>
                <input type="text" placeholder="e.g. Supply of raw materials" value={natureOfDebt} onChange={(e) => setNatureOfDebt(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Amount in default</span>
                <input type="text" placeholder="₹" value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Demand notice date</span>
                <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date delivered</span>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Documents checklist</h3>
            <ul className="doc-checklist">
              <li>Invoice(s) and proof of delivery</li>
              <li>Copy of the Section 8 demand notice and proof of service</li>
              <li>Bank statements showing non-payment</li>
              <li>Affidavit confirming no dispute notice was received</li>
              {mode === 'advocate' && <li>Vakalatnama / Form NCLT-12 (required for any representative to be heard)</li>}
            </ul>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Your age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Your address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
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
            <h3 className="step-heading">Index entries</h3>
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
            <p className="step-help">A filed application is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {caseType.name}</h4>
            <DraftDocument
              title={selectedBench ? `Before the ${selectedBench.label}` : 'Before the National Company Law Tribunal'}
              subtitle={`Application under Section 9, IBC, 2016 — ${applicantName || '[Applicant]'} vs. ${companyName || '[Corporate Debtor]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="nclt" contextLabel={selectedBench?.label} />
          </div>
        )}
      </WizardShell>

      {blocked && step === 0 && (
        <p className="back-link" style={{ marginTop: 0 }}>
          This application can't proceed based on your answers above — see the guidance shown for next steps.
        </p>
      )}
    </div>
  );
}
