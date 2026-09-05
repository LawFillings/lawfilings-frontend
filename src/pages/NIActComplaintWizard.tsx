import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildCauseTitleHtml, buildVerificationSection, buildDocumentListParagraphs, toThatClause } from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, underlyingDebtNatureOptions, chequeDishonourReasonOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['Cheque & debt details', 'Dishonour & notice', 'Parties', 'Filing details', 'Documents (Index)', 'Preview'];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  debtNature: string | null;
  debtAmount: string;
  chequeNumber: string;
  chequeDate: string;
  chequeAmount: string;
  draweeBank: string;
  draweeBranch: string;
  drawerAccount: string;
  presentationDate: string;
  dishonourDate: string;
  dishonourReason: string | null;
  noticeDate: string;
  noticeReceivedDate: string;
  noticeServiceDetail: string;
  complainantName: string;
  complainantAddress: string;
  accusedName: string;
  accusedAddress: string;
  courtCity: string;
  witnesses: string;
  documentEntries: DocEntry[];
  advocateName: string;
  filingDate: string;
}

const caseType = caseTypes.find((ct) => ct.id === 'ct-ni-act-complaint')!;
const ncClauses = clauses.filter((c) => c.caseTypeId === 'ct-ni-act-complaint');
const clauseByCode = (code: string) => ncClauses.find((c) => c.code === code)!;
const citations = findFixedCaseTypeCitation('ct-ni-act-complaint');

// Only these two grounds are what Section 138 itself contemplates — see chequeDishonourReasonOptions.
const STATUTORY_DISHONOUR_REASONS = ['funds_insufficient', 'exceeds_arrangement'];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  /** Set when resuming an existing saved draft rather than starting a new one. */
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function NIActComplaintWizard({
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
  const [debtNature, setDebtNature] = useState<string | null>(saved?.debtNature ?? null);
  const [debtAmount, setDebtAmount] = useState(saved?.debtAmount ?? '');
  const [chequeNumber, setChequeNumber] = useState(saved?.chequeNumber ?? '');
  const [chequeDate, setChequeDate] = useState(saved?.chequeDate ?? '');
  const [chequeAmount, setChequeAmount] = useState(saved?.chequeAmount ?? '');
  const [draweeBank, setDraweeBank] = useState(saved?.draweeBank ?? '');
  const [draweeBranch, setDraweeBranch] = useState(saved?.draweeBranch ?? '');
  const [drawerAccount, setDrawerAccount] = useState(saved?.drawerAccount ?? '');
  const [presentationDate, setPresentationDate] = useState(saved?.presentationDate ?? '');
  const [dishonourDate, setDishonourDate] = useState(saved?.dishonourDate ?? '');
  const [dishonourReason, setDishonourReason] = useState<string | null>(saved?.dishonourReason ?? null);
  const [noticeDate, setNoticeDate] = useState(saved?.noticeDate ?? '');
  const [noticeReceivedDate, setNoticeReceivedDate] = useState(saved?.noticeReceivedDate ?? '');
  const [noticeServiceDetail, setNoticeServiceDetail] = useState(saved?.noticeServiceDetail ?? 'due service of the notice');
  const [complainantName, setComplainantName] = useState(saved?.complainantName ?? '');
  const [complainantAddress, setComplainantAddress] = useState(saved?.complainantAddress ?? '');
  const [accusedName, setAccusedName] = useState(saved?.accusedName ?? '');
  const [accusedAddress, setAccusedAddress] = useState(saved?.accusedAddress ?? '');
  const [courtCity, setCourtCity] = useState(saved?.courtCity ?? '');
  const [witnesses, setWitnesses] = useState(saved?.witnesses ?? '');
  const [documentEntries, setDocumentEntries] = useState<DocEntry[]>(saved?.documentEntries ?? []);
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [filingDate, setFilingDate] = useState(saved?.filingDate ?? '');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const addDocumentEntry = () => setDocumentEntries((d) => [...d, { particulars: '', pageNo: '' }]);
  const removeDocumentEntry = (i: number) => setDocumentEntries((d) => d.filter((_, idx) => idx !== i));
  const updateDocumentEntry = (i: number, patch: Partial<DocEntry>) =>
    setDocumentEntries((d) => d.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));

  const debtNatureLabel = underlyingDebtNatureOptions.find((o) => o.id === debtNature)?.label ?? '';
  const dishonourReasonLabel = chequeDishonourReasonOptions.find((o) => o.id === dishonourReason)?.label ?? '';
  const dishonourIsNonStatutory = dishonourReason !== null && !STATUTORY_DISHONOUR_REASONS.includes(dishonourReason);

  let timingNote: string | null = null;
  if (noticeReceivedDate) {
    const received = new Date(noticeReceivedDate);
    if (!Number.isNaN(received.getTime())) {
      const payByDate = addDays(received, 15);
      const complaintByDate = addMonths(payByDate, 1);
      timingNote = `Payment was due by ${formatDate(payByDate)} (15 days from receipt of notice). If unpaid by then, this complaint should be filed by ${formatDate(
        complaintByDate
      )} — one month from the date the cause of action arose (Section 142(1)(b)). A later filing needs the Court's satisfaction that there was sufficient cause for the delay.`;
    }
  }

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      debtNature,
      debtAmount,
      chequeNumber,
      chequeDate,
      chequeAmount,
      draweeBank,
      draweeBranch,
      drawerAccount,
      presentationDate,
      dishonourDate,
      dishonourReason,
      noticeDate,
      noticeReceivedDate,
      noticeServiceDetail,
      complainantName,
      complainantAddress,
      accusedName,
      accusedAddress,
      courtCity,
      witnesses,
      documentEntries,
      advocateName,
      filingDate,
      [WIZARD_CASE_TYPE_KEY]: 'ct-ni-act-complaint',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `NI Act Complaint — ${complainantName || 'Complainant'} vs ${accusedName || 'Accused'}`,
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

  const witnessList = witnesses.split('\n').map((w) => w.trim()).filter(Boolean);

  // Shared closing signature — reused as-is on the Index page's own last section, matching the
  // convention that each part of a filed bundle carries the same "filed by" block.
  const closingBlock: DraftSection = {
    unnumbered: true,
    align: 'right' as const,
    paragraphs: [
      'Complainant',
      mode === 'advocate' && advocateName ? `Through Counsel, ${advocateName}` : '',
      `Date: ${filingDate || '[Date]'}`,
    ].filter(Boolean),
  };

  const draftSections: DraftSection[] = [
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          fillTemplate(clauseByCode('NC-01').bodyTemplate, {
            debt_amount: debtAmount,
            debt_nature: debtNatureLabel.toLowerCase(),
            cheque_number: chequeNumber,
            cheque_date: chequeDate,
            cheque_amount: chequeAmount,
            drawee_bank: draweeBank,
            drawee_branch: draweeBranch,
            drawer_account: drawerAccount,
          })
        ),
        toThatClause(
          fillTemplate(clauseByCode('NC-02').bodyTemplate, {
            presentation_date: presentationDate,
            dishonour_date: dishonourDate,
            dishonour_reason: dishonourReasonLabel,
          })
        ),
        toThatClause(
          fillTemplate(clauseByCode('NC-03').bodyTemplate, {
            notice_date: noticeDate,
            notice_service_detail: noticeServiceDetail,
          })
        ),
        toThatClause(clauseByCode('NC-04').bodyTemplate),
      ],
      incomplete: !debtNature || !chequeNumber || !chequeDate || !dishonourDate || !noticeDate,
    },
    ...(citations.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citations) }]
      : []),
    {
      heading: 'Jurisdiction',
      paragraphs: [
        toThatClause(
          `The cheque was issued, presented, and dishonoured, and the notice under Section 138 was issued, within the territorial jurisdiction of this Hon'ble Court at ${
            courtCity || '[City]'
          }, which is accordingly competent to entertain, try, and decide this complaint.`
        ),
      ],
    },
    {
      heading: 'List of witnesses',
      unnumbered: true,
      paragraphs:
        witnessList.length > 0 ? witnessList.map((w, i) => `${i + 1}. ${w}`) : ['[Add witnesses in the Parties step]'],
    },
    {
      heading: 'List of documents relied upon',
      unnumbered: true,
      paragraphs:
        documentEntries.length > 0
          ? documentEntries.map((e, i) => `${i + 1}. ${e.particulars || '[Particulars]'}`)
          : ['[Add documents in the Documents step]'],
    },
    {
      heading: 'Prayer',
      paragraphs: [
        "It is therefore prayed that the accused may kindly be summoned, tried, and punished according to law for the offence punishable under Section 138 of the Negotiable Instruments Act, 1881, and that the accused be directed to pay compensation to the complainant, and such other order(s) as this Hon'ble Court may deem fit and proper in the interest of justice.",
      ],
    },
    closingBlock,
  ];

  const causeTitleInfo = {
    forumType: 'magistrate_court',
    applicationTitle: 'Complaint under Sections 138 & 142, Negotiable Instruments Act, 1881',
    applicantName: complainantName,
    respondentName: accusedName,
    benchCity: courtCity || undefined,
    applicantLabel: 'COMPLAINANT',
    respondentLabel: 'ACCUSED',
  };
  const causeTitleHtml = buildCauseTitleHtml(causeTitleInfo);
  const indexCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'INDEX' });
  const affidavitCauseTitleHtml = buildCauseTitleHtml({ ...causeTitleInfo, bodyHeading: 'AFFIDAVIT' });

  const indexSections: DraftSection[] = [
    { heading: 'Index', unnumbered: true, paragraphs: buildDocumentListParagraphs(documentEntries) },
    closingBlock,
  ];

  // The complainant is the deponent — same convention as every other affidavit on this platform:
  // a separate document affirming the accompanying complaint's contents, plus its own Verification.
  const affidavitSections: DraftSection[] = [
    {
      unnumbered: true,
      paragraphs: [
        `I, ${complainantName || '[Complainant]'}, R/o ${
          complainantAddress || '[Address]'
        }, the deponent above named, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the Complainant in the present case and am well conversant with the facts of the case, and am competent to swear this Affidavit.`,
        `2. That the accompanying Complaint has been prepared at my instructions, the contents of which have been explained to me and are true and correct to the best of my knowledge and belief. The same may be read as part and parcel of this Affidavit and is not repeated herein for the sake of brevity.`,
      ],
    },
    { unnumbered: true, align: 'right', paragraphs: ['DEPONENT'] },
    ...buildVerificationSection(complainantName, courtCity),
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
            <h3 className="step-heading">What was the underlying debt, and the cheque issued for it?</h3>
            <div className="grounds-grid">
              {underlyingDebtNatureOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={debtNature === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setDebtNature(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>Amount owed (₹)</span>
                <input type="text" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Cheque number</span>
                <input type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Cheque date</span>
                <input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Cheque amount (₹)</span>
                <input type="text" value={chequeAmount} onChange={(e) => setChequeAmount(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Drawee bank</span>
                <input type="text" value={draweeBank} onChange={(e) => setDraweeBank(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Branch</span>
                <input type="text" value={draweeBranch} onChange={(e) => setDraweeBranch(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Drawer's account number</span>
                <input type="text" value={drawerAccount} onChange={(e) => setDrawerAccount(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Dishonour and notice</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Date presented for encashment</span>
                <input type="date" value={presentationDate} onChange={(e) => setPresentationDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of dishonour memo</span>
                <input type="date" value={dishonourDate} onChange={(e) => setDishonourDate(e.target.value)} />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Reason for dishonour
            </h3>
            <div className="grounds-grid">
              {chequeDishonourReasonOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={dishonourReason === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setDishonourReason(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {dishonourIsNonStatutory && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Worth confirming before filing</p>
                <p className="deadline-body">
                  Section 138 itself only names "insufficient funds" and "exceeds arrangement" as dishonour grounds.
                  "{dishonourReasonLabel}" can still support a complaint, but confirm it squarely fits — an accused
                  can otherwise argue the cheque wasn't dishonoured for want of funds.
                </p>
              </div>
            )}
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>Date of Section 138 notice</span>
                <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date notice was received by the accused (if known)</span>
                <input type="date" value={noticeReceivedDate} onChange={(e) => setNoticeReceivedDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Service detail</span>
                <input
                  type="text"
                  value={noticeServiceDetail}
                  onChange={(e) => setNoticeServiceDetail(e.target.value)}
                  placeholder="e.g. due service of the notice, which was never returned undelivered"
                />
              </label>
            </div>
            {timingNote && (
              <div className="deadline-card" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Filing window</p>
                <p className="deadline-body">{timingNote}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Complainant and accused' : 'You and the accused'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Complainant name' : 'Your name'}</span>
                <input type="text" value={complainantName} onChange={(e) => setComplainantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Complainant address</span>
                <input type="text" value={complainantAddress} onChange={(e) => setComplainantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Accused name</span>
                <input type="text" value={accusedName} onChange={(e) => setAccusedName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Accused address</span>
                <input type="text" value={accusedAddress} onChange={(e) => setAccusedAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Court city</span>
                <input type="text" value={courtCity} onChange={(e) => setCourtCity(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Witnesses (one per line)</span>
              <textarea className="facts-textarea" rows={3} value={witnesses} onChange={(e) => setWitnesses(e.target.value)} />
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              {mode === 'advocate' && (
                <label className="form-field">
                  <span>Advocate name</span>
                  <input type="text" value={advocateName} onChange={(e) => setAdvocateName(e.target.value)} />
                </label>
              )}
              <label className="form-field">
                <span>Date of filing</span>
                <input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
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
                      placeholder="e.g. Original cheque"
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

        {step === 5 && (
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
            <p className="step-help">A filed complaint is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Complaint — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Complaint</h4>
            <DraftDocument
              title={courtCity ? `In the Court of the Judicial Magistrate First Class, ${courtCity}` : caseType.name}
              subtitle={`${complainantName || '[Complainant]'} vs ${accusedName || '[Accused]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument
              title="Complaint — Affidavit"
              subtitle={complainantName || '[Complainant]'}
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance forum="criminalCourt" />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
