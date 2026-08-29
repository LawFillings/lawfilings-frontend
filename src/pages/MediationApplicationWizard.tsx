import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { buildCauseTitleHtml, buildVerificationSection, toThatClause } from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { fillTemplate } from '../lib/template';
import { caseTypes, clauses, mediationDisputeNatureOptions } from '../data/mockData';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import type { CheckoutIntent } from './CheckoutScreen';
import type { UserRole } from '../types';

const STEPS = ['Dispute check', 'Parties', 'Facts of dispute', 'Claim & jurisdiction', 'Filing details', 'Preview'];

const caseType = caseTypes.find((ct) => ct.id === 'ct-mediation-application')!;
const maClauses = clauses.filter((c) => c.caseTypeId === 'ct-mediation-application');
const clauseByCode = (code: string) => maClauses.find((c) => c.code === code)!;
const citations = findFixedCaseTypeCitation('ct-mediation-application');

interface Props {
  onBack: () => void;
  onOpenCheckout: (intent: CheckoutIntent) => void;
  onOpenPricing: () => void;
}

export function MediationApplicationWizard({ onBack, onOpenCheckout, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [needsUrgentRelief, setNeedsUrgentRelief] = useState<boolean | null>(null);
  const [disputeNature, setDisputeNature] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [oppositePartyNames, setOppositePartyNames] = useState('');
  const [oppositePartyAddress, setOppositePartyAddress] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultDate, setDefaultDate] = useState('');
  const [resolutionAttempt, setResolutionAttempt] = useState('');
  const [additionalFacts, setAdditionalFacts] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [jurisdictionPlace, setJurisdictionPlace] = useState('');
  const [district, setDistrict] = useState('');
  const [feeReference, setFeeReference] = useState('');
  const [advocateName, setAdvocateName] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);

  const disputeNatureLabel = mediationDisputeNatureOptions.find((o) => o.id === disputeNature)?.label ?? '';
  const oppositePartyList = oppositePartyNames
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content = {
      needsUrgentRelief,
      disputeNature,
      applicantName,
      applicantAddress,
      applicantPhone,
      applicantEmail,
      oppositePartyNames,
      oppositePartyAddress,
      transactionDate,
      transactionAmount,
      defaultDescription,
      defaultDate,
      resolutionAttempt,
      additionalFacts,
      claimAmount,
      jurisdictionPlace,
      district,
      feeReference,
      advocateName,
      filingDate,
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `Mediation Application — ${applicantName || 'Applicant'} vs ${oppositePartyList[0] || 'Opposite Party'}`,
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

  const draftSections: DraftSection[] = [
    {
      heading: 'Details of parties',
      paragraphs: [
        toThatClause(
          `Applicant: ${applicantName || '[Applicant Name]'}, ${applicantAddress || '[Applicant Address]'}${
            applicantPhone ? `, Phone: ${applicantPhone}` : ''
          }${applicantEmail ? `, Email: ${applicantEmail}` : ''}.`
        ),
        toThatClause(
          `Opposite party: ${oppositePartyList.join('; ') || '[Opposite Party Name]'}, ${
            oppositePartyAddress || '[Opposite Party Address]'
          }.`
        ),
      ],
    },
    {
      heading: 'Detail of dispute',
      paragraphs: [
        fillTemplate(clauseByCode('MA-01').bodyTemplate, {
          dispute_nature: disputeNatureLabel.toLowerCase(),
          transaction_date: transactionDate,
          transaction_amount: transactionAmount,
        }),
        fillTemplate(clauseByCode('MA-02').bodyTemplate, {
          default_description: defaultDescription,
          default_date: defaultDate,
        }),
        fillTemplate(clauseByCode('MA-03').bodyTemplate, { resolution_attempt: resolutionAttempt }),
        ...(additionalFacts.trim() ? [additionalFacts.trim()] : []),
      ].map(toThatClause),
      incomplete: !disputeNature || !transactionDate || !transactionAmount || !defaultDescription,
    },
    ...(citations.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citations) }]
      : []),
    {
      heading: 'Quantum of claim',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('MA-04').bodyTemplate, { claim_amount: claimAmount }))],
      incomplete: !claimAmount,
    },
    {
      heading: 'Territorial jurisdiction',
      paragraphs: [toThatClause(fillTemplate(clauseByCode('MA-05').bodyTemplate, { jurisdiction_place: jurisdictionPlace }))],
      incomplete: !jurisdictionPlace,
    },
    {
      heading: 'Details of fee paid',
      paragraphs: [
        toThatClause(
          `An amount of Rs. 1,000/- has been paid to the Authority as the fee for this application, vide ${
            feeReference || '[Demand Draft / online transaction reference]'
          }, in accordance with Rule 3(1) of the Commercial Courts (Pre-Institution Mediation and Settlement) Rules, 2018.`
        ),
      ],
    },
    {
      heading: 'Prayer',
      paragraphs: [
        'It is therefore prayed that notice of this application may kindly be sent to the opposite party so that pre-institution mediation between the parties may take place at the earliest, in accordance with Section 12A of the Commercial Courts Act, 2015.',
      ],
    },
    ...buildVerificationSection(applicantName, district),
    {
      unnumbered: true,
      align: 'right' as const,
      paragraphs: [
        'Submitted by,',
        applicantName || '[Applicant Name]',
        mode === 'advocate' && advocateName ? `Through Counsel, ${advocateName}` : '',
        `Date: ${filingDate || '[Date]'}`,
      ].filter(Boolean),
    },
  ];

  const causeTitleHtml = buildCauseTitleHtml({
    forumType: 'mediation_authority',
    applicationTitle: 'Application for Pre-Institution Mediation',
    governingLaw: 'Section 12A, Commercial Courts Act, 2015',
    applicantName,
    respondentName: oppositePartyList[0] || '',
    respondentEntries: oppositePartyList.length > 0 ? oppositePartyList : undefined,
    benchCity: district || undefined,
    bodyHeading: 'FORM-1 — MEDIATION APPLICATION (SEE RULE 3(1), SCHEDULE-I)',
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
            <h3 className="step-heading">Before you start</h3>
            <p className="step-help">
              Section 12A of the Commercial Courts Act, 2015 requires pre-institution mediation for a commercial
              dispute — unless the suit contemplates urgent interim relief (e.g. an injunction), in which case you
              may file directly in the Commercial Court instead.
            </p>
            <div className="grounds-grid">
              <button
                className={needsUrgentRelief === false ? 'ground-card active' : 'ground-card'}
                onClick={() => setNeedsUrgentRelief(false)}
              >
                No — this application is the right first step
              </button>
              <button
                className={needsUrgentRelief === true ? 'ground-card active' : 'ground-card'}
                onClick={() => setNeedsUrgentRelief(true)}
              >
                Yes — I need urgent interim relief
              </button>
            </div>
            {needsUrgentRelief === true && (
              <div className="deadline-card status-warn" style={{ maxWidth: 560, marginTop: 'var(--space-5)' }}>
                <p className="deadline-label">Worth confirming before filing</p>
                <p className="deadline-body">
                  If you genuinely need urgent interim relief, Section 12A does not require pre-institution mediation
                  — you may file the suit directly in the Commercial Court. Continue here only if you'd still like to
                  attempt mediation first.
                </p>
              </div>
            )}
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              What kind of commercial dispute is this?
            </h3>
            <div className="grounds-grid">
              {mediationDisputeNatureOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={disputeNature === opt.id ? 'ground-card active' : 'ground-card'}
                  onClick={() => setDisputeNature(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">{mode === 'advocate' ? 'Applicant' : 'Your details'}</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant name' : 'Your name'}</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Phone</span>
                <input type="text" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Email</span>
                <input type="text" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} />
              </label>
            </div>
            <h3 className="step-heading" style={{ marginTop: 'var(--space-5)' }}>
              Opposite party
            </h3>
            <p className="step-help">One name per line if there is more than one opposite party.</p>
            <div className="form-grid">
              <label className="form-field">
                <span>Name(s)</span>
                <textarea
                  className="facts-textarea"
                  rows={3}
                  value={oppositePartyNames}
                  onChange={(e) => setOppositePartyNames(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Address</span>
                <input type="text" value={oppositePartyAddress} onChange={(e) => setOppositePartyAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">Facts of the dispute</h3>
            <p className="step-help">
              Answer these and we'll compose the "Detail of dispute" paragraphs Form-1 requires.
            </p>
            <div className="form-grid">
              <label className="form-field">
                <span>Date the transaction/facility was entered into or sanctioned</span>
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Amount involved (₹)</span>
                <input type="text" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>What did the opposite party fail to do, or what breach occurred?</span>
              <input
                type="text"
                value={defaultDescription}
                onChange={(e) => setDefaultDescription(e.target.value)}
                placeholder="e.g. the opposite party failed to repay the outstanding installments"
              />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>Date of default/breach (or when it became apparent)</span>
                <input type="date" value={defaultDate} onChange={(e) => setDefaultDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>What was tried before filing this application?</span>
                <input
                  type="text"
                  value={resolutionAttempt}
                  onChange={(e) => setResolutionAttempt(e.target.value)}
                  placeholder="e.g. repeated requests and a legal notice dated ___"
                />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Anything else relevant? (optional)</span>
              <textarea
                className="facts-textarea"
                rows={3}
                value={additionalFacts}
                onChange={(e) => setAdditionalFacts(e.target.value)}
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
            <h3 className="step-heading">Claim and jurisdiction</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Amount in dispute (₹)</span>
                <input type="text" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place where the opposite party resides/works for gain, or the cause of action arose</span>
                <input type="text" value={jurisdictionPlace} onChange={(e) => setJurisdictionPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>District (for the Authority's address)</span>
                <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Filing details</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Fee payment reference (DD number or online transaction ID — Rs. 1,000)</span>
                <input type="text" value={feeReference} onChange={(e) => setFeeReference(e.target.value)} />
              </label>
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
            <DraftDocument
              title={caseType.name}
              subtitle={`${applicantName || '[Applicant]'} vs ${oppositePartyList[0] || '[Opposite Party]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={draftSections}
            />

            <FilingGuidance forum="mediationAuthority" />
          </div>
        )}
      </WizardShell>
    </div>
  );
}
