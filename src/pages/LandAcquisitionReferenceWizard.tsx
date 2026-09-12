import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { buildNoticeLetterHtml, buildDocumentListParagraphs, toThatClause } from '../lib/legalDocumentFormat';
import { findFixedCaseTypeCitation, buildCitationParagraphs } from '../lib/actReferenceMatcher';
import { caseTypes } from '../data/mockData';
import { districtCourtStates, districtCourtDistrictsByState } from '../data/districtCourtLocations';
import { useAuth } from '../lib/auth';
import * as casesClient from '../lib/casesClient';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import { WIZARD_CASE_TYPE_KEY } from '../lib/draftResume';
import { JudgeStyleStep } from '../components/JudgeStyleStep';
import { applyJudgeStyleToSections } from '../lib/judgeStyle';
import type { JudgeStyleProfile } from '../lib/judgeStyleClient';
import type { UserRole } from '../types';

const caseType = caseTypes.find((ct) => ct.id === 'ct-land-acquisition-reference')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

type LimitationScenario = 'present_at_award' | 'not_present';

interface SavedContent {
  stateId: string;
  districtId: string;
  collectorAddress: string;
  notificationDetails: string;
  landDescription: string;
  awardNumber: string;
  awardDate: string;
  collectorAwardedAmount: string;
  claimedCompensationAmount: string;
  groundMeasurement: boolean;
  groundCompensation: boolean;
  groundPersonsEntitled: boolean;
  groundApportionment: boolean;
  groundsNarrative: string;
  limitationScenario: LimitationScenario;
  noticeReceivedDate: string;
  applicantName: string;
  applicantAddress: string;
  advocateName: string;
  advocateAddress: string;
  advocatePhone: string;
  advocateEmail: string;
  filingDate: string;
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
  'State',
  'District (Collector’s office)',
  'The acquisition & award',
  'Grounds of objection',
  'Limitation & parties',
  'Documents & filing details',
  'Preview',
  'Match a style (optional)',
];

export function LandAcquisitionReferenceWizard({
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
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [districtId, setDistrictId] = useState(saved?.districtId ?? '');
  const [collectorAddress, setCollectorAddress] = useState(saved?.collectorAddress ?? '');
  const [notificationDetails, setNotificationDetails] = useState(saved?.notificationDetails ?? '');
  const [landDescription, setLandDescription] = useState(saved?.landDescription ?? '');
  const [awardNumber, setAwardNumber] = useState(saved?.awardNumber ?? '');
  const [awardDate, setAwardDate] = useState(saved?.awardDate ?? '');
  const [collectorAwardedAmount, setCollectorAwardedAmount] = useState(saved?.collectorAwardedAmount ?? '');
  const [claimedCompensationAmount, setClaimedCompensationAmount] = useState(saved?.claimedCompensationAmount ?? '');
  const [groundMeasurement, setGroundMeasurement] = useState(saved?.groundMeasurement ?? false);
  const [groundCompensation, setGroundCompensation] = useState(saved?.groundCompensation ?? true);
  const [groundPersonsEntitled, setGroundPersonsEntitled] = useState(saved?.groundPersonsEntitled ?? false);
  const [groundApportionment, setGroundApportionment] = useState(saved?.groundApportionment ?? false);
  const [groundsNarrative, setGroundsNarrative] = useState(saved?.groundsNarrative ?? '');
  const [limitationScenario, setLimitationScenario] = useState<LimitationScenario>(saved?.limitationScenario ?? 'present_at_award');
  const [noticeReceivedDate, setNoticeReceivedDate] = useState(saved?.noticeReceivedDate ?? '');
  const [applicantName, setApplicantName] = useState(saved?.applicantName ?? '');
  const [applicantAddress, setApplicantAddress] = useState(saved?.applicantAddress ?? '');
  const [advocateName, setAdvocateName] = useState(saved?.advocateName ?? '');
  const [advocateAddress, setAdvocateAddress] = useState(saved?.advocateAddress ?? '');
  const [advocatePhone, setAdvocatePhone] = useState(saved?.advocatePhone ?? '');
  const [advocateEmail, setAdvocateEmail] = useState(saved?.advocateEmail ?? '');
  const [filingDate, setFilingDate] = useState(saved?.filingDate ?? '');
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

  const selectedState = districtCourtStates.find((s) => s.id === stateId);
  const districts = stateId ? districtCourtDistrictsByState[stateId] ?? [] : [];
  const selectedDistrict = districts.find((d) => d.id === districtId);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      districtId,
      collectorAddress,
      notificationDetails,
      landDescription,
      awardNumber,
      awardDate,
      collectorAwardedAmount,
      claimedCompensationAmount,
      groundMeasurement,
      groundCompensation,
      groundPersonsEntitled,
      groundApportionment,
      groundsNarrative,
      limitationScenario,
      noticeReceivedDate,
      applicantName,
      applicantAddress,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingDate,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-land-acquisition-reference',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${applicantName || 'Applicant'} — Land Acquisition Reference`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-land-acquisition-reference');

  const selectedGrounds = [
    groundMeasurement && 'the measurement of the land',
    groundCompensation && 'the amount of the compensation',
    groundPersonsEntitled && 'the persons to whom the compensation is payable',
    groundApportionment && 'the apportionment of the compensation among the persons interested',
  ].filter((g): g is string => Boolean(g));

  const groundsList = selectedGrounds.length > 0 ? selectedGrounds.join('; ') : '[select at least one ground of objection]';

  const draftSections: DraftSection[] = [
    {
      heading: 'The acquisition and the Collector’s award',
      paragraphs: [
        toThatClause(
          `pursuant to ${
            notificationDetails.trim() || '[notification details — Section 4/6/11 notification number and date]'
          }, the land described as ${
            landDescription.trim() || '[survey number, village, area]'
          }, belonging to/in which the undersigned is interested, was acquired, and the Land Acquisition Collector passed Award No. ${
            awardNumber.trim() || '[award number]'
          } dated ${
            awardDate ? new Date(awardDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[award date]'
          }, awarding compensation of ${collectorAwardedAmount.trim() || '[amount awarded by the Collector]'}`
        ),
      ],
      incomplete: !landDescription.trim() || !awardNumber.trim() || !awardDate,
    },
    {
      heading: 'Grounds of objection',
      paragraphs: [
        toThatClause(`the undersigned has not accepted the said award, and objects to ${groundsList}`),
        toThatClause(groundsNarrative.trim() || '[explain, in detail, why the award is objected to on the selected ground(s)]'),
      ],
      incomplete: selectedGrounds.length === 0 || !groundsNarrative.trim(),
      role: 'grounds',
    },
    {
      heading: 'Compensation claimed',
      paragraphs: [
        toThatClause(
          `whereas the Collector has awarded ${
            collectorAwardedAmount.trim() || '[amount]'
          }, the undersigned claims compensation of ${
            claimedCompensationAmount.trim() || '[amount claimed]'
          }, which is a true and fair valuation of the acquired land and interests`
        ),
      ],
      incomplete: !claimedCompensationAmount.trim(),
    },
    {
      heading: 'Limitation',
      paragraphs: [
        toThatClause(
          limitationScenario === 'present_at_award'
            ? "this application is made within six weeks from the date of the Collector's award, the undersigned having been present or represented before the Collector when the award was made, and is therefore within the time prescribed by section 18(2)(a) of the Land Acquisition Act, 1894"
            : `this application is made within six weeks of receipt of the notice from the Collector under section 12(2) (received on ${
                noticeReceivedDate ? new Date(noticeReceivedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date notice received]'
              }), or within six months from the date of the award, whichever period first expires, and is therefore within the time prescribed by section 18(2)(b) of the Land Acquisition Act, 1894`
        ),
      ],
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Annexures',
      paragraphs: buildDocumentListParagraphs(documentEntries),
    },
    {
      heading: 'Request',
      paragraphs: [
        `In view of the above, it is most respectfully requested that this application be referred by the Collector to the Court under section 18 of the Land Acquisition Act, 1894, for determination of ${groundsList}, and that the compensation be determined and enhanced to ${
          claimedCompensationAmount.trim() || '[amount claimed]'
        }, or such other sum as the Court may deem just, together with solatium, interest, and other statutory benefits as admissible in law.`,
      ],
    },
    {
      unnumbered: true,
      align: 'right' as const,
      paragraphs: [
        'Yours faithfully,',
        applicantName || '[Applicant]',
        mode === 'advocate' ? 'Through Advocate' : '',
      ].filter(Boolean),
    },
  ];

  const letterHtml = buildNoticeLetterHtml({
    senderName: mode === 'advocate' ? advocateName : applicantName,
    senderAddress: mode === 'advocate' ? advocateAddress : applicantAddress,
    senderPhone: advocatePhone,
    senderEmail: advocateEmail,
    date: filingDate,
    recipientName: 'The Land Acquisition Collector',
    recipientAddress: collectorAddress || (selectedDistrict ? `${selectedDistrict.label} District` : '[District]'),
    subject: 'Application under Section 18 of the Land Acquisition Act, 1894 for Reference to Court',
    clientName: mode === 'advocate' ? applicantName : undefined,
    clientAddress: mode === 'advocate' ? applicantAddress : undefined,
    openingLineEnding: 'I/we do hereby submit the following application, under section 18 of the Land Acquisition Act, 1894, requiring that the matter be referred to the Court:',
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
            <h3 className="step-heading">Which state is the acquired land in?</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label="State"
              helpText="This application goes to the Land Acquisition Collector for the district where the land lies, who then refers it to the District Court if you're not satisfied with the response."
              verifyNote="State list is stable and complete. District-level detail for the chosen state is shown next —"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which district's Collector made the award?</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label="District"
                helpText={`Districts of ${selectedState.label}. The Reference, once made, is heard by the District Judge of this district.`}
                verifyNote="District list sourced from current public records — confirm the correct Land Acquisition Collector's office at"
                verifyUrl="https://ecourts.gov.in"
                searchPlaceholder="Type a district…"
              />
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Collector's office address (if you have the exact address)</span>
              <input type="text" value={collectorAddress} onChange={(e) => setCollectorAddress(e.target.value)} placeholder="Optional — defaults to the district name" />
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">The acquisition and the Collector's award</h3>
            <label className="form-field">
              <span>Notification details (Section 4/6/11 notification number and date)</span>
              <input type="text" value={notificationDetails} onChange={(e) => setNotificationDetails(e.target.value)} />
            </label>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Description of the land (survey number, village, area)</span>
              <textarea className="facts-textarea" rows={3} value={landDescription} onChange={(e) => setLandDescription(e.target.value)} />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>Award number</span>
                <input type="text" value={awardNumber} onChange={(e) => setAwardNumber(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Date of award</span>
                <input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Amount awarded by the Collector</span>
                <input type="text" value={collectorAwardedAmount} onChange={(e) => setCollectorAwardedAmount(e.target.value)} placeholder="₹" />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Grounds of objection</h3>
            <p className="step-help">Section 18 allows an objection on one or more of these grounds — select all that apply.</p>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={groundMeasurement} onChange={(e) => setGroundMeasurement(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  The measurement of the land
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={groundCompensation} onChange={(e) => setGroundCompensation(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  The amount of compensation
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={groundPersonsEntitled} onChange={(e) => setGroundPersonsEntitled(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  The persons to whom compensation is payable
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input type="checkbox" checked={groundApportionment} onChange={(e) => setGroundApportionment(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                  The apportionment among persons interested
                </span>
              </label>
            </div>
            <label className="form-field">
              <span>Explain, in detail, why the award is objected to</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={groundsNarrative}
                onChange={(e) => setGroundsNarrative(e.target.value)}
                placeholder="e.g. comparable sales of similarly-situated land in the vicinity around the notification date show a materially higher market value than what the Collector allowed"
              />
            </label>
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>Compensation you are claiming</span>
                <input type="text" value={claimedCompensationAmount} onChange={(e) => setClaimedCompensationAmount(e.target.value)} placeholder="₹" />
              </label>
            </div>
            <p className="step-help">
              Under section 25, the Court cannot award more than what you claim here, however strong your case — so
              claim the full amount you believe is fair, not a conservative estimate.
            </p>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">Limitation and parties</h3>
            <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="limitation-scenario"
                    checked={limitationScenario === 'present_at_award'}
                    onChange={() => setLimitationScenario('present_at_award')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  I was present/represented before the Collector when the award was made
                </span>
              </label>
              <label className="form-field">
                <span>
                  <input
                    type="radio"
                    name="limitation-scenario"
                    checked={limitationScenario === 'not_present'}
                    onChange={() => setLimitationScenario('not_present')}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  I was not present — I received a separate notice of the award
                </span>
              </label>
            </div>
            {limitationScenario === 'present_at_award' ? (
              <p className="step-help">
                You must file this application within <strong>six weeks from the date of the award</strong> ({awardDate || '[award date]'}).
              </p>
            ) : (
              <>
                <label className="form-field" style={{ maxWidth: 320 }}>
                  <span>Date you received the Collector's notice</span>
                  <input type="date" value={noticeReceivedDate} onChange={(e) => setNoticeReceivedDate(e.target.value)} />
                </label>
                <p className="step-help">
                  File within <strong>six weeks of receiving that notice, or six months from the date of the award,
                  whichever comes first</strong> — the earlier deadline controls.
                </p>
              </>
            )}
            <div className="form-grid" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Applicant (person interested)' : 'Your name'}</span>
                <input type="text" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Applicant's address</span>
                <input type="text" value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} />
              </label>
            </div>
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
            <h3 className="step-heading">Documents and filing details</h3>
            <p className="step-help">List the documents you're attaching — typically a copy of the award, the acquisition notification, and title documents.</p>
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

            {mode === 'advocate' && (
              <>
                <h3 className="step-heading" style={{ marginTop: 'var(--space-6)' }}>
                  Advocate details
                </h3>
                <div className="form-grid">
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
                </div>
              </>
            )}
            <label className="form-field" style={{ marginTop: 'var(--space-4)', maxWidth: 320 }}>
              <span>Date of this application</span>
              <input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
            </label>
          </div>
        )}

        {step === 6 && (
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
              title="Application under Section 18, Land Acquisition Act, 1894"
              subtitle={`${applicantName || '[Applicant]'} — Land Acquisition Reference`}
              causeTitleHtml={letterHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p className="deadline-label">Where this goes</p>
              <p className="deadline-body">
                Submit this application at the Land Acquisition Collector's office for the district where the land
                lies — not at the court registry. The Collector then decides whether to refer it to the District
                Court under section 19; once referred, the matter is registered and heard there as a Land
                Acquisition Reference case.
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
                This is the standard draft. If you'd like the sections above reordered to match a sample
                application's format, go to the next step and upload it there — that's a paid, on-demand feature,
                not included by default.
              </p>
            </div>
          </div>
        )}

        {step === 7 && (
          <JudgeStyleStep profile={judgeStyleProfile} onProfileReady={setJudgeStyleProfile} onOpenPricing={onOpenPricing} />
        )}
      </WizardShell>
    </div>
  );
}
