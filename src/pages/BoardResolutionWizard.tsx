import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { buildResolutionHtml, buildResolutionClosing, splitIntoParagraphs } from '../lib/legalDocumentFormat';
import { caseTypes, boardResolutionPurposeOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import type { UserRole } from '../types';

const STEPS = ['Purpose', 'Company & meeting details', 'Resolution text', 'Certification', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-board-resolution')!;

// A starting "RESOLVED THAT" clause per common purpose, matching the framing of the corresponding
// row in boardResolutionPurposeOptions — the user can freely edit it afterwards, so this is a
// head start rather than a fixed per-type template like DEED_TYPE_CONFIGS.
const RESOLUTION_STARTERS: Record<string, string> = {
  bank_account:
    'RESOLVED THAT a current account be and is hereby opened/operated with [Bank Name], [Branch], and that [Name(s)/Designation(s)] be and are hereby authorised, singly/jointly, to operate the said account, sign cheques, and give instructions on behalf of the Company.',
  authorised_signatory:
    'RESOLVED THAT [Name], [Designation], be and is hereby authorised to sign, execute, and deliver documents, agreements, and correspondence on behalf of the Company in relation to [matter/purpose].',
  borrowing:
    'RESOLVED THAT consent of the Board be and is hereby accorded, under section 179(3)(d) of the Companies Act, 2013, to borrow a sum not exceeding ₹[amount] from [Lender], on the terms and conditions set out in [loan agreement/sanction letter], and that [Name], [Designation], be and is hereby authorised to execute all documents necessary to give effect to this resolution.',
  loan_guarantee:
    'RESOLVED THAT consent of the Board be and is hereby accorded, under section 179(3)(f) of the Companies Act, 2013, to grant a loan/guarantee/security of ₹[amount] to/on behalf of [Recipient], on the terms and conditions set out in [agreement], and that [Name], [Designation], be and is hereby authorised to execute all documents necessary to give effect to this resolution.',
  investment:
    'RESOLVED THAT consent of the Board be and is hereby accorded, under section 179(3)(e) of the Companies Act, 2013, to invest a sum not exceeding ₹[amount] of the Company\'s funds in [instrument/entity], and that [Name], [Designation], be and is hereby authorised to execute all documents necessary to give effect to this resolution.',
  financial_statements:
    "RESOLVED THAT the financial statements of the Company for the financial year ended [date], comprising the Balance Sheet, Statement of Profit and Loss, Cash Flow Statement, and the Board's Report, as placed before the Board, be and are hereby approved, and that [Name], [Designation], be and is hereby authorised to sign the same on behalf of the Board, under section 179(3)(g) of the Companies Act, 2013.",
  other: '',
};

interface SavedContent {
  purpose: string | null;
  companyName: string;
  cin: string;
  registeredOffice: string;
  meetingDate: string;
  meetingTime: string;
  meetingPlace: string;
  resolutionText: string;
  additionalResolutions: string;
  certifierName: string;
  certifierRole: string;
}

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

export function BoardResolutionWizard({
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
  const [purpose, setPurpose] = useState<string | null>(saved?.purpose ?? null);
  const [companyName, setCompanyName] = useState(saved?.companyName ?? '');
  const [cin, setCin] = useState(saved?.cin ?? '');
  const [registeredOffice, setRegisteredOffice] = useState(saved?.registeredOffice ?? '');
  const [meetingDate, setMeetingDate] = useState(saved?.meetingDate ?? '');
  const [meetingTime, setMeetingTime] = useState(saved?.meetingTime ?? '');
  const [meetingPlace, setMeetingPlace] = useState(saved?.meetingPlace ?? '');
  const [resolutionText, setResolutionText] = useState(saved?.resolutionText ?? '');
  const [additionalResolutions, setAdditionalResolutions] = useState(saved?.additionalResolutions ?? '');
  const [certifierName, setCertifierName] = useState(saved?.certifierName ?? '');
  const [certifierRole, setCertifierRole] = useState(saved?.certifierRole ?? 'Director');
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      purpose,
      companyName,
      cin,
      registeredOffice,
      meetingDate,
      meetingTime,
      meetingPlace,
      resolutionText,
      additionalResolutions,
      certifierName,
      certifierRole,
      [WIZARD_CASE_TYPE_KEY]: 'ct-board-resolution',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `Board Resolution — ${companyName || 'Company'}`,
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

  const resolutionHtml = buildResolutionHtml({
    documentTitle: 'BOARD RESOLUTION',
    companyName,
    cin,
    registeredOffice,
    meetingDate,
    meetingTime,
    meetingPlace,
  });

  const draftSections: DraftSection[] = [
    {
      heading: 'Resolved',
      paragraphs: resolutionText ? splitIntoParagraphs(resolutionText) : ['[The RESOLVED clause(s) for this Board Resolution]'],
      incomplete: !resolutionText,
    },
    ...(additionalResolutions.trim()
      ? [{ heading: 'Further resolved', paragraphs: splitIntoParagraphs(additionalResolutions) }]
      : []),
    ...buildResolutionClosing(certifierName, certifierRole),
  ];

  return (
    <div>
      <button className="back-link" onClick={onBack}>
        Back to all filings
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
            <h3 className="step-heading">What is this resolution for?</h3>
            <p className="step-help">
              This just picks a starting point for the RESOLVED clause below — you can edit it freely, or write your
              own from scratch.
            </p>
            <div className="grounds-grid">
              {boardResolutionPurposeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={purpose === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => {
                    setPurpose(opt.id);
                    if (!resolutionText.trim()) setResolutionText(RESOLUTION_STARTERS[opt.id] ?? '');
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="deadline-card status-warn" style={{ maxWidth: 620, marginTop: 'var(--space-5)' }}>
              <p className="deadline-label">Worth knowing before you rely on this</p>
              <p className="deadline-body">
                Section 179(3) of the Companies Act, 2013 lists matters — including borrowing, investing company
                funds, granting a loan/guarantee, and approving financial statements — that the Board can only
                exercise by a resolution passed at a meeting, not by circulation. Some resolutions must separately be
                reported to the Registrar in Form MGT-14 within 30 days of being passed (private companies are
                exempt for ordinary section 179(3) matters, but only while current on their annual filings) — confirm
                whether this resolution needs an MGT-14 filing before relying on it.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Company &amp; meeting details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Company name</span>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>CIN</span>
                <input type="text" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="e.g. U12345MH2020PTC123456" />
              </label>
              <label className="form-field">
                <span>Registered office</span>
                <input type="text" value={registeredOffice} onChange={(e) => setRegisteredOffice(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of Board meeting</span>
                <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Time of meeting</span>
                <input type="text" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} placeholder="e.g. 11:00 A.M." />
              </label>
              <label className="form-field">
                <span>Place of meeting</span>
                <input type="text" value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Resolution text</h3>
            <p className="step-help">
              The operative "RESOLVED THAT..." clause(s). Separate multiple resolutions with a blank line — each
              becomes its own numbered clause.
            </p>
            <textarea
              className="facts-textarea"
              rows={8}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="RESOLVED THAT..."
            />
            <label className="form-field" style={{ display: 'block', marginTop: 'var(--space-4)' }}>
              <span>Further resolutions (optional)</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={additionalResolutions}
                onChange={(e) => setAdditionalResolutions(e.target.value)}
                placeholder="RESOLVED FURTHER THAT..."
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

        {step === 3 && (
          <div>
            <h3 className="step-heading">Certification</h3>
            <p className="step-help">
              A certified true copy of a Board Resolution is conventionally certified by a Director or the Company
              Secretary (Companies Act, 2013, section 118), even before the meeting's minutes are formally signed.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>Certified by (name)</span>
                <input type="text" value={certifierName} onChange={(e) => setCertifierName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Designation</span>
                <select value={certifierRole} onChange={(e) => setCertifierRole(e.target.value)}>
                  <option value="Director">Director</option>
                  <option value="Managing Director">Managing Director</option>
                  <option value="Company Secretary">Company Secretary</option>
                </select>
              </label>
            </div>
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
            <DraftDocument
              title="BOARD RESOLUTION"
              subtitle={companyName || '[Company Name]'}
              causeTitleHtml={resolutionHtml}
              sections={draftSections}
            />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
