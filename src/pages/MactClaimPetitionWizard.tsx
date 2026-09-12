import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { LocationSelector } from '../components/LocationSelector';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-mact-claim-petition')!;

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface CompensationHead {
  headName: string;
  amount: string;
}

interface SavedContent {
  stateId: string;
  districtId: string;
  accidentDate: string;
  accidentPlace: string;
  vehicleRegNo: string;
  driverName: string;
  driverAddress: string;
  ownerName: string;
  ownerAddress: string;
  insurerName: string;
  insurerAddress: string;
  isDeathCase: boolean;
  claimantName: string;
  claimantAge: string;
  claimantAddress: string;
  relationToVictim: string;
  victimName: string;
  victimAge: string;
  victimOccupation: string;
  victimMonthlyIncome: string;
  factsNarrative: string;
  injuryOrDeathDetails: string;
  compensationHeads: CompensationHead[];
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

const STEPS = [
  'State',
  'District court',
  'The accident',
  'Parties',
  'Victim & compensation',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

function defaultCompensationHeads(): CompensationHead[] {
  return [
    { headName: 'Loss of dependency / loss of income', amount: '' },
    { headName: 'Medical expenses', amount: '' },
    { headName: 'Loss of estate', amount: '' },
    { headName: 'Loss of consortium', amount: '' },
    { headName: 'Funeral expenses', amount: '' },
  ];
}

function parseAmount(v: string): number {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / 86_400_000);
}

export function MactClaimPetitionWizard({
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
  const [accidentDate, setAccidentDate] = useState(saved?.accidentDate ?? '');
  const [accidentPlace, setAccidentPlace] = useState(saved?.accidentPlace ?? '');
  const [vehicleRegNo, setVehicleRegNo] = useState(saved?.vehicleRegNo ?? '');
  const [driverName, setDriverName] = useState(saved?.driverName ?? '');
  const [driverAddress, setDriverAddress] = useState(saved?.driverAddress ?? '');
  const [ownerName, setOwnerName] = useState(saved?.ownerName ?? '');
  const [ownerAddress, setOwnerAddress] = useState(saved?.ownerAddress ?? '');
  const [insurerName, setInsurerName] = useState(saved?.insurerName ?? '');
  const [insurerAddress, setInsurerAddress] = useState(saved?.insurerAddress ?? '');
  const [isDeathCase, setIsDeathCase] = useState(saved?.isDeathCase ?? false);
  const [claimantName, setClaimantName] = useState(saved?.claimantName ?? '');
  const [claimantAge, setClaimantAge] = useState(saved?.claimantAge ?? '');
  const [claimantAddress, setClaimantAddress] = useState(saved?.claimantAddress ?? '');
  const [relationToVictim, setRelationToVictim] = useState(saved?.relationToVictim ?? '');
  const [victimName, setVictimName] = useState(saved?.victimName ?? '');
  const [victimAge, setVictimAge] = useState(saved?.victimAge ?? '');
  const [victimOccupation, setVictimOccupation] = useState(saved?.victimOccupation ?? '');
  const [victimMonthlyIncome, setVictimMonthlyIncome] = useState(saved?.victimMonthlyIncome ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
  const [injuryOrDeathDetails, setInjuryOrDeathDetails] = useState(saved?.injuryOrDeathDetails ?? '');
  const [compensationHeads, setCompensationHeads] = useState<CompensationHead[]>(saved?.compensationHeads ?? defaultCompensationHeads());
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
  const addCompensationHead = () => setCompensationHeads((c) => [...c, { headName: '', amount: '' }]);
  const removeCompensationHead = (i: number) => setCompensationHeads((c) => c.filter((_, idx) => idx !== i));
  const updateCompensationHead = (i: number, patch: Partial<CompensationHead>) =>
    setCompensationHeads((c) => c.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)));
  const [caseId, setCaseId] = useState<string | null>(initialCaseId ?? null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [paywall, setPaywall] = useState(false);
  const [judgeStyleProfile, setJudgeStyleProfile] = useState<JudgeStyleProfile | null>(null);

  const selectedState = districtCourtStates.find((s) => s.id === stateId);
  const districts = stateId ? districtCourtDistrictsByState[stateId] ?? [] : [];
  const selectedDistrict = districts.find((d) => d.id === districtId);
  const totalCompensation = compensationHeads.reduce((sum, h) => sum + parseAmount(h.amount), 0);
  const daysSinceAccident = daysSince(accidentDate);

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      districtId,
      accidentDate,
      accidentPlace,
      vehicleRegNo,
      driverName,
      driverAddress,
      ownerName,
      ownerAddress,
      insurerName,
      insurerAddress,
      isDeathCase,
      claimantName,
      claimantAge,
      claimantAddress,
      relationToVictim,
      victimName,
      victimAge,
      victimOccupation,
      victimMonthlyIncome,
      factsNarrative,
      injuryOrDeathDetails,
      compensationHeads,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-mact-claim-petition',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${claimantName || 'Claimant'} vs. ${driverName || 'Respondents'} — Motor Accident Claims Petition`,
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

  const citationMatches = findFixedCaseTypeCitation('ct-mact-claim-petition');
  const caseLawMatches = findFixedCaseTypeCaseLaw('ct-mact-claim-petition');

  const filedByBlock = buildFiledByBlock({
    applicantLines: [claimantName || '[Claimant]', '(CLAIMANT/PETITIONER)'],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const victimRef = victimName.trim() || (isDeathCase ? '[Deceased]' : claimantName.trim() || '[Claimant]');

  const draftSections: DraftSection[] = [
    {
      heading: 'The accident',
      paragraphs: [
        toThatClause(
          `on ${accidentDate ? new Date(accidentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '[date]'}, at ${
            accidentPlace.trim() || '[place of accident]'
          }, the offending vehicle bearing registration No. ${
            vehicleRegNo.trim() || '[registration number]'
          }, driven by the Respondent No. 1 and owned by the Respondent No. 2, insured with the Respondent No. 3, was involved in a road accident which resulted in the ${
            isDeathCase ? `death of ${victimRef}` : `injury of ${victimRef}`
          }, due to the rash and negligent driving of the Respondent No. 1`
        ),
      ],
      incomplete: !accidentDate || !accidentPlace.trim() || !vehicleRegNo.trim(),
    },
    {
      heading: 'Facts constituting rash and negligent driving',
      paragraphs: [toThatClause(factsNarrative.trim() || '[Describe, in chronological order, exactly how the accident occurred and how the Respondent No. 1 was rash or negligent]')],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: isDeathCase ? 'The deceased and the dependency of the Claimant' : 'The injuries sustained',
      paragraphs: [
        toThatClause(
          `${victimRef}, aged about ${victimAge || '[age]'}, was working as ${
            victimOccupation.trim() || '[occupation]'
          } earning approximately ${
            victimMonthlyIncome.trim() || '[monthly income]'
          } per month${
            isDeathCase
              ? `, and the Claimant, being the ${relationToVictim.trim() || '[relation]'} of the deceased, was dependent on this income`
              : ''
          }; ${injuryOrDeathDetails.trim() || (isDeathCase ? '[describe the cause and circumstances of death, medical treatment if any]' : '[describe the nature of the injuries sustained and the medical treatment undergone]')}`
        ),
      ],
      incomplete: !victimAge.trim() || !injuryOrDeathDetails.trim(),
      role: 'facts',
    },
    {
      heading: 'Heads of compensation claimed',
      paragraphs: [
        ...compensationHeads
          .filter((h) => h.headName.trim())
          .map((h, i) => `${i + 1}. ${h.headName.trim()}: ${h.amount.trim() ? formatINR(parseAmount(h.amount)) : '[amount]'}`),
        `Total compensation claimed: ${formatINR(totalCompensation)}`,
      ],
      incomplete: compensationHeads.every((h) => !h.amount.trim()),
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
        `It is therefore most respectfully prayed that this Hon'ble Tribunal may be pleased to award compensation of ${formatINR(
          totalCompensation
        )}, together with interest thereon at such rate as this Hon'ble Tribunal deems fit, jointly and severally against the Respondents, along with the costs of this petition, and pass any other order(s) as this Hon'ble Tribunal may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(claimantName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: 'district_court',
    applicationTitle: caseType.name,
    governingLaw: caseType.governingLaw,
    applicantName: claimantName,
    respondentName: driverName,
    respondentEntries: [
      driverName || '[Respondent No. 1 — Driver]',
      ownerName || '[Respondent No. 2 — Owner]',
      insurerName || '[Respondent No. 3 — Insurer]',
    ],
    applicantLabel: 'CLAIMANT/PETITIONER',
    respondentLabel: 'RESPONDENT',
    caseNumberLine: `M.A.C.P. NO. _____ OF ${new Date().getFullYear()}`,
    benchCity: selectedDistrict?.label,
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
        `${claimantName || '[Claimant]'} aged about ${claimantAge || '[age]'}, R/o ${
          claimantAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        '1. That I am the Claimant/Petitioner in the present petition, and I am well conversant with the facts and circumstances of the case.',
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
            <h3 className="step-heading">Which state is the Claims Tribunal in?</h3>
            <LocationSelector
              mode={mode}
              locations={districtCourtStates}
              value={stateId}
              onSelect={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              label="State"
              helpText="File with the Claims Tribunal for the area where the accident occurred, or where you live/carry on business, or where any Respondent resides — your choice."
              verifyNote="State list is stable and complete. District-level detail for the chosen state is shown next —"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Which district?</h3>
            {selectedState ? (
              <LocationSelector
                mode={mode}
                locations={districts}
                value={districtId}
                onSelect={setDistrictId}
                label="District"
                helpText={`Districts of ${selectedState.label}. In most States, the District Judge of this district also sits as the Motor Accident Claims Tribunal.`}
                verifyNote="District list sourced from current public records — confirm which judicial officer is currently notified as the Claims Tribunal for this district at"
                verifyUrl="https://ecourts.gov.in"
                searchPlaceholder="Type a district…"
              />
            ) : (
              <p className="step-help">Go back and pick a state first.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="step-heading">The accident</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Date of accident</span>
                <input type="date" value={accidentDate} onChange={(e) => setAccidentDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Place of accident</span>
                <input type="text" value={accidentPlace} onChange={(e) => setAccidentPlace(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Offending vehicle's registration number</span>
                <input type="text" value={vehicleRegNo} onChange={(e) => setVehicleRegNo(e.target.value)} />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts — exactly how did the accident happen?</span>
              <textarea
                className="facts-textarea"
                rows={5}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the manner of driving, speed, traffic conditions, and how the Respondent No. 1's rashness or negligence caused the accident"
              />
            </label>
            {daysSinceAccident !== null && (
              <div className={`deadline-card status-${daysSinceAccident > 180 ? 'danger' : daysSinceAccident > 150 ? 'warn' : 'safe'}`} style={{ marginTop: 'var(--space-4)' }}>
                {daysSinceAccident > 180 ? (
                  <>
                    <p className="deadline-label">Six-month filing window has likely closed</p>
                    <p className="deadline-body">
                      It's been {daysSinceAccident} days since the accident. Since 1 April 2022, section 166(3) of the
                      Motor Vehicles Act, 1988 bars the Tribunal from entertaining a claim petition filed more than
                      six months after the accident, with no power to condone the delay — get urgent advice before
                      proceeding, and confirm whether this amendment applies to an accident of this date at all.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="deadline-label">{180 - daysSinceAccident} days remaining under the 6-month period</p>
                    <p className="deadline-body">
                      File as soon as possible — this deadline currently has no condonation for delay, unlike most
                      other limitation periods on this platform.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="step-heading">Parties</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Driver (Respondent No. 1)</span>
                <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Driver's address</span>
                <input type="text" value={driverAddress} onChange={(e) => setDriverAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Owner (Respondent No. 2)</span>
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Owner's address</span>
                <input type="text" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Insurance company (Respondent No. 3)</span>
                <input type="text" value={insurerName} onChange={(e) => setInsurerName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Insurer's address</span>
                <input type="text" value={insurerAddress} onChange={(e) => setInsurerAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>{mode === 'advocate' ? 'Claimant/Petitioner' : 'Your name'}</span>
                <input type="text" value={claimantName} onChange={(e) => setClaimantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Claimant's age</span>
                <input type="text" value={claimantAge} onChange={(e) => setClaimantAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Claimant's address</span>
                <input type="text" value={claimantAddress} onChange={(e) => setClaimantAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="step-heading">The victim and compensation</h3>
            <label className="form-field" style={{ marginBottom: 'var(--space-4)' }}>
              <span>
                <input type="checkbox" checked={isDeathCase} onChange={(e) => setIsDeathCase(e.target.checked)} style={{ marginRight: 'var(--space-2)' }} />
                This is a death claim (the accident resulted in death)
              </span>
            </label>
            {isDeathCase && (
              <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-field">
                  <span>Name of the deceased</span>
                  <input type="text" value={victimName} onChange={(e) => setVictimName(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Claimant's relationship to the deceased</span>
                  <input type="text" value={relationToVictim} onChange={(e) => setRelationToVictim(e.target.value)} placeholder="e.g. widow, son, dependent parent" />
                </label>
              </div>
            )}
            <div className="form-grid">
              <label className="form-field">
                <span>{isDeathCase ? "Deceased's age at the time of death" : "Claimant's age at the time of the accident"}</span>
                <input type="text" value={victimAge} onChange={(e) => setVictimAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Occupation</span>
                <input type="text" value={victimOccupation} onChange={(e) => setVictimOccupation(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Monthly income</span>
                <input type="text" value={victimMonthlyIncome} onChange={(e) => setVictimMonthlyIncome(e.target.value)} placeholder="₹" />
              </label>
            </div>
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>{isDeathCase ? 'Cause of death and medical treatment, if any' : 'Nature of injuries and medical treatment undergone'}</span>
              <textarea
                className="facts-textarea"
                rows={4}
                value={injuryOrDeathDetails}
                onChange={(e) => setInjuryOrDeathDetails(e.target.value)}
              />
            </label>

            <p className="field-label" style={{ marginTop: 'var(--space-5)' }}>
              Heads of compensation claimed
            </p>
            {compensationHeads.map((h, i) => (
              <div key={i} className="form-grid" style={{ marginBottom: 'var(--space-2)' }}>
                <label className="form-field">
                  <span>Head</span>
                  <input type="text" value={h.headName} onChange={(e) => updateCompensationHead(i, { headName: e.target.value })} />
                </label>
                <label className="form-field">
                  <span>Amount</span>
                  <input type="text" value={h.amount} onChange={(e) => updateCompensationHead(i, { amount: e.target.value })} placeholder="₹" />
                </label>
                <button type="button" className="para-btn" onClick={() => removeCompensationHead(i)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="para-btn" onClick={addCompensationHead}>
              + Add head
            </button>
            <p className="step-help" style={{ marginTop: 'var(--space-3)' }}>
              Total compensation claimed: <strong>{formatINR(totalCompensation)}</strong> — the multiplier method and
              standardised future-prospects addition from <em>National Insurance Co. Ltd. v. Pranay Sethi</em>, (2017)
              16 SCC 680, apply to computing loss of dependency/income; this platform does not compute that figure
              for you.
            </p>

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
            <p className="step-help">
              Add each document you're annexing — typically the FIR, post-mortem/medical reports, the vehicle's RC
              and insurance policy copy, income proof, and (for a death claim) the death certificate and legal heir
              certificate — in the order it will be paginated.
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
            <p className="step-help">A filed petition is a bundle of separate documents — each below downloads as its own PDF.</p>
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part I — Index</h4>
            <DraftDocument title="Motor Accident Claims Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Claim Petition</h4>
            <DraftDocument
              title={selectedDistrict ? `Before the Motor Accident Claims Tribunal, ${selectedDistrict.label}` : caseType.name}
              subtitle={`Motor Accident Claims Petition — ${claimantName || '[Claimant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument title="Motor Accident Claims Petition — Affidavit" causeTitleHtml={affidavitCauseTitleHtml} sections={affidavitSections} />

            <FilingGuidance forum="districtCourt" contextLabel={selectedDistrict?.label} />

            <div className="deadline-card status-warn" style={{ marginTop: 'var(--space-6)' }}>
              <p
                className="deadline-label"
                style={{ fontSize: '16px', fontWeight: 700, opacity: 1, textTransform: 'none', letterSpacing: 'normal' }}
              >
                Do you want to match your draft with a particular style?
              </p>
              <p className="deadline-body">
                This is the standard draft. If you'd like the sections above reordered to match how a particular
                judge or bench is used to reading one, or to follow a sample application's format, go to the next
                step and upload it there — that's a paid, on-demand feature, not included by default.
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
