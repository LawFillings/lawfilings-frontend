import { useRef, useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DeadlineCalculator } from '../components/DeadlineCalculator';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance, forumTypeToFilingForum } from '../components/FilingGuidance';
import {
  buildCauseTitleHtml,
  buildPrayerSection,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  splitIntoParagraphs,
  withPeriod,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { extractTextFromPdf, NoTextLayerError } from '../lib/pdfTextExtraction';
import { extractTribunalOrderFromText, extractConsumerComplaintFromText } from '../lib/documentExtractionClient';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/apiError';
import type { CaseType, UserRole } from '../types';

// The case types that reference an existing Tribunal ORDER, where uploading it can prefill the
// applicant/respondent names, the connected case number, and (where a deadline step exists) the
// order date. IA/MA-general reference a pending case rather than a specific order, and NCLT Reply
// reads a live application rather than an order — out of scope for this pass. See
// ct-cc-written-version below for the one non-order source document (a Consumer Complaint).
const ORDER_UPLOAD_CASE_TYPE_IDS = new Set(['ct-drt-review', 'ct-nclt-restoration', 'ct-nclt-12a']);
const COMPLAINT_UPLOAD_CASE_TYPE_ID = 'ct-cc-written-version';

interface Props {
  caseType: CaseType;
  onBack: () => void;
}

interface DocEntry {
  particulars: string;
  pageNo: string;
}

export function GenericCaseWizard({ caseType, onBack }: Props) {
  const { token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [applicantName, setApplicantName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [parentCaseNumber, setParentCaseNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [details, setDetails] = useState('');
  const [reliefSought, setReliefSought] = useState('');

  const [applicantAge, setApplicantAge] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [advocateAddress, setAdvocateAddress] = useState('');
  const [advocatePhone, setAdvocatePhone] = useState('');
  const [advocateEmail, setAdvocateEmail] = useState('');
  const [filingPlace, setFilingPlace] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [verificationPlace, setVerificationPlace] = useState('');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>([]);
  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  const hasDeadline = caseType.deadlineSource !== undefined;
  // Every case type routed through this shared wizard is filed with a tribunal or commission
  // (DRT, NCLT, Consumer Commission) — all bundle with an Index page first and an Affidavit page
  // last, matching the convention established for OA/SA.
  const STEPS = ['Details', ...(hasDeadline ? ['Deadline'] : []), 'What you’re asking for', 'Filing details', 'Documents', 'Preview'];
  const contentStepIndex = hasDeadline ? 2 : 1;
  const filingDetailsStepIndex = contentStepIndex + 1;
  const documentsStepIndex = filingDetailsStepIndex + 1;
  const previewStepIndex = STEPS.length - 1;

  const isOrderUpload = ORDER_UPLOAD_CASE_TYPE_IDS.has(caseType.id);
  const isComplaintUpload = caseType.id === COMPLAINT_UPLOAD_CASE_TYPE_ID;
  const [extractState, setExtractState] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
  const [extractError, setExtractError] = useState<string | null>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);

  const handleSourceFileSelected = async (file: File) => {
    if (!token) return;
    setExtractState('extracting');
    setExtractError(null);
    try {
      const text = await extractTextFromPdf(file);
      if (isOrderUpload) {
        const extracted = await extractTribunalOrderFromText(text, token);
        if (extracted.applicantName && !applicantName) setApplicantName(extracted.applicantName);
        if (extracted.respondentName && !respondentName) setRespondentName(extracted.respondentName);
        if (extracted.caseNumber && !parentCaseNumber) setParentCaseNumber(extracted.caseNumber);
        if (extracted.orderDate && !orderDate) setOrderDate(extracted.orderDate);
      } else if (isComplaintUpload) {
        const extracted = await extractConsumerComplaintFromText(text, token);
        if (extracted.complainantName && !applicantName) setApplicantName(extracted.complainantName);
        if (extracted.oppositePartyName && !respondentName) setRespondentName(extracted.oppositePartyName);
        if (extracted.complaintNumber && !parentCaseNumber) setParentCaseNumber(extracted.complaintNumber);
      }
      setExtractState('done');
    } catch (err) {
      if (err instanceof NoTextLayerError) {
        setExtractError(
          'This looks like a scanned document — text extraction only works with text-based PDFs for now. Try running it through a free online OCR/text-conversion tool and re-uploading the result, or fill in the details below manually.'
        );
      } else if (err instanceof ApiError && err.status === 402) {
        setExtractError('This feature needs an active plan — see Pricing, or fill in the details below manually.');
      } else if (err instanceof ApiError) {
        setExtractError(err.message);
      } else {
        setExtractError("Couldn't read that file — please make sure it's a PDF and try again.");
      }
      setExtractState('error');
    }
  };

  const groundsParagraphs = splitIntoParagraphs(details);
  const draftSections: DraftSection[] = [
    {
      paragraphs: groundsParagraphs.length > 0 ? groundsParagraphs.map(toThatClause) : ['Details not yet entered.'],
      incomplete: !details,
    },
    buildPrayerSection(reliefSought, caseType.forumType),
    ...buildVerificationSection(applicantName),
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: caseType.forumType,
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName,
    respondentName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: caseType.parentRequired ? 'CONNECTED CASE' : undefined,
    parentCaseNumber: caseType.parentRequired ? parentCaseNumber : undefined,
  });

  // --- Index (Part I) and Affidavit (Part III) — only built/shown for DRT filings ---
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
    respondentName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: caseType.parentRequired ? 'CONNECTED CASE' : undefined,
    parentCaseNumber: caseType.parentRequired ? parentCaseNumber : undefined,
    bodyHeading: 'INDEX',
  });

  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `${withPeriod(applicantName || '[Applicant]')} aged about ${applicantAge || '[age]'}, R/o ${applicantAddress || '[Address]'}, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Applicant in the present case, as such I am well conversant with the facts of the present case and competent to swear this Affidavit.`,
        `2. That the accompanying ${caseType.name} has been prepared at my instructions, the contents of which have been explained to me in the vernacular language which I understand and the same may be read as part and parcel of this Affidavit as the same has not been repeated herein for the sake of brevity. I have gone through the same and it is true and correct.`,
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
    respondentName,
    filingCategory: caseType.filingCategory,
    parentCaseLabel: caseType.parentRequired ? 'CONNECTED CASE' : undefined,
    parentCaseNumber: caseType.parentRequired ? parentCaseNumber : undefined,
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
            <h3 className="step-heading">Details</h3>
            {caseType.plainLanguageSummary && mode === 'justice_seeker' && (
              <p className="step-help">{caseType.plainLanguageSummary}</p>
            )}
            {(isOrderUpload || isComplaintUpload) && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <input
                  ref={sourceFileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleSourceFileSelected(file);
                  }}
                />
                <button
                  type="button"
                  className="para-btn"
                  onClick={() => sourceFileInputRef.current?.click()}
                  disabled={extractState === 'extracting'}
                >
                  {extractState === 'extracting'
                    ? 'Reading…'
                    : isOrderUpload
                      ? 'Fill from order (PDF)'
                      : 'Fill from Consumer Complaint (PDF)'}
                </button>
                <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
                  Only text-based PDFs are supported for now, not scanned copies. This fills in blank fields
                  below — review everything before continuing.
                </p>
                {extractState === 'done' && (
                  <p className="step-help" style={{ color: 'var(--status-safe-text)', margin: 'var(--space-1) 0 0' }}>
                    Filled in from the document — please check these before continuing.
                  </p>
                )}
                {extractState === 'error' && extractError && (
                  <p className="step-help" style={{ color: 'var(--status-danger-text)', margin: 'var(--space-1) 0 0' }}>
                    {extractError}
                  </p>
                )}
              </div>
            )}
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
                <span>{mode === 'advocate' ? 'Respondent / Opposite Party' : 'Other party'}</span>
                <input type="text" value={respondentName} onChange={(e) => setRespondentName(e.target.value)} />
              </label>
              {caseType.parentRequired && (
                <label className="form-field">
                  <span>{mode === 'advocate' ? 'Parent case / OA / CP number' : 'Which case is this connected to?'}</span>
                  <input type="text" value={parentCaseNumber} onChange={(e) => setParentCaseNumber(e.target.value)} />
                </label>
              )}
            </div>
          </div>
        )}

        {hasDeadline && step === 1 && (
          <div>
            <h3 className="step-heading">Deadline</h3>
            <DeadlineCalculator caseType={caseType} mode={mode} value={orderDate} onChange={setOrderDate} />
          </div>
        )}

        {step === contentStepIndex && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Grounds' : 'Why are you asking for this?'}</h3>
            <textarea
              className="facts-textarea"
              rows={6}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain the facts and reasons — separate paragraphs with a blank line, they'll be numbered as pleaded paragraphs"
            />
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              {mode === 'advocate' ? 'Relief sought' : 'What do you want the tribunal/commission to do?'}
            </h3>
            <textarea
              className="facts-textarea"
              rows={3}
              value={reliefSought}
              onChange={(e) => setReliefSought(e.target.value)}
              placeholder="e.g. 'condone the delay of 15 days in filing the accompanying application'"
            />
          </div>
        )}

        {step === filingDetailsStepIndex && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Applicant's age</span>
                <input type="text" value={applicantAge} onChange={(e) => setApplicantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's address</span>
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

        {step === documentsStepIndex && (
          <div>
            <h3 className="step-heading">Documents (Index)</h3>
            <p className="step-help">Add each document you're annexing, in the order it will be paginated.</p>
            {documentEntries.map((d, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Particulars</span>
                    <input type="text" value={d.particulars} onChange={(e) => updateDocumentEntry(i, { particulars: e.target.value })} />
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

        {step === previewStepIndex && (
          <div>
            <h3 className="step-heading">Preview</h3>
            <p className="step-help">A filed {caseType.name} is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title={`${caseType.name} — Index`} causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — {caseType.name}</h4>
            <DraftDocument
              title={caseType.name}
              subtitle={`${caseType.governingLaw} — ${applicantName || '[Applicant]'} vs. ${respondentName || '[Respondent]'}${parentCaseNumber ? ` — in ${parentCaseNumber}` : ''}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title={`${caseType.name} — Affidavit`} causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum={forumTypeToFilingForum(caseType.forumType)} />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
