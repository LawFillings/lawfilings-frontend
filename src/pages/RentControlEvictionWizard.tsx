import { useState } from 'react';
import { WizardShell } from '../components/WizardShell';
import { DraftDocument, type DraftSection } from '../components/DraftDocument';
import { FilingGuidance } from '../components/FilingGuidance';
import { LocationSelector } from '../components/LocationSelector';
import { ActReferencePanel } from '../components/ActReferencePanel';
import type { ForumLocation } from '../data/forumLocations';
import {
  buildCauseTitleHtml,
  buildVerificationSection,
  buildFiledByBlock,
  buildDocumentListParagraphs,
  toThatClause,
} from '../lib/legalDocumentFormat';
import { findRelevantActSections, buildCitationParagraphs } from '../lib/actReferenceMatcher';
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

const caseType = caseTypes.find((ct) => ct.id === 'ct-rent-control-eviction')!;

interface StateForumConfig {
  label: string;
  actShortTitle: string;
  forumType: string;
  prayerNoun: string;
  applicantLabel: string;
  respondentLabel: string;
  caseNumberWord: 'Petition' | 'Suit';
}

// Adjudicating authority, party labels, and the case-number convention for each state — picked by
// hand from the actual "protection against eviction"/"eviction of tenants" section text already
// curated in lawLibraryData.ts (see RENT_EVICTION_SECTION_BY_ACT_ID in actReferenceMatcher.ts),
// not guessed. Scoped to the 13 states where this Library has that section sourced — Tamil Nadu,
// Uttarakhand, and a few Union territories use a different, non-Rent-Control-Act tenancy-agreement
// model and are deliberately excluded (see the step-1 help text).
const STATE_FORUMS: Record<string, StateForumConfig> = {
  delhi: {
    label: 'Delhi',
    actShortTitle: 'The Delhi Rent Control Act, 1958',
    forumType: 'rent_controller',
    prayerNoun: 'Rent Controller',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  maharashtra: {
    label: 'Maharashtra',
    actShortTitle: 'The Maharashtra Rent Control Act, 1999',
    forumType: 'civil_court',
    prayerNoun: 'Court',
    applicantLabel: 'PLAINTIFF',
    respondentLabel: 'DEFENDANT',
    caseNumberWord: 'Suit',
  },
  karnataka: {
    label: 'Karnataka',
    actShortTitle: 'The Karnataka Rent Act, 1999',
    forumType: 'civil_court',
    prayerNoun: 'Court',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  'west-bengal': {
    label: 'West Bengal',
    actShortTitle: 'The West Bengal Premises Tenancy Act, 1997',
    forumType: 'civil_judge',
    prayerNoun: 'Court',
    applicantLabel: 'PLAINTIFF',
    respondentLabel: 'DEFENDANT',
    caseNumberWord: 'Suit',
  },
  rajasthan: {
    label: 'Rajasthan',
    actShortTitle: 'The Rajasthan Rent Control Act, 2001',
    forumType: 'rent_tribunal',
    prayerNoun: 'Rent Tribunal',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  'madhya-pradesh': {
    label: 'Madhya Pradesh',
    actShortTitle: 'The Madhya Pradesh Accommodation Control Act, 1961',
    forumType: 'civil_court',
    prayerNoun: 'Court',
    applicantLabel: 'PLAINTIFF',
    respondentLabel: 'DEFENDANT',
    caseNumberWord: 'Suit',
  },
  'uttar-pradesh': {
    label: 'Uttar Pradesh',
    actShortTitle: 'The Uttar Pradesh Urban Buildings (Regulation of Letting, Rent and Eviction) Act, 1972',
    forumType: 'prescribed_authority',
    prayerNoun: 'Prescribed Authority',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  'andhra-pradesh': {
    label: 'Andhra Pradesh',
    actShortTitle: 'The Andhra Pradesh Buildings (Lease, Rent and Eviction) Control Act, 1960',
    forumType: 'rent_controller',
    prayerNoun: 'Rent Controller',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  telangana: {
    label: 'Telangana',
    actShortTitle: 'The Telangana Buildings (Lease, Rent and Eviction) Control Act, 1960',
    forumType: 'rent_controller',
    prayerNoun: 'Rent Controller',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  kerala: {
    label: 'Kerala',
    actShortTitle: 'The Kerala Buildings (Lease and Rent Control) Act, 1965',
    forumType: 'rent_control_court',
    prayerNoun: 'Rent Control Court',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  punjab: {
    label: 'Punjab',
    actShortTitle: 'The East Punjab Urban Rent Restriction Act, 1949',
    forumType: 'rent_controller',
    prayerNoun: 'Rent Controller',
    applicantLabel: 'APPLICANT',
    respondentLabel: 'RESPONDENT',
    caseNumberWord: 'Petition',
  },
  bihar: {
    label: 'Bihar',
    actShortTitle: 'The Bihar Buildings (Lease, Rent and Eviction) Control Act, 1982',
    forumType: 'civil_court',
    prayerNoun: 'Court',
    applicantLabel: 'PLAINTIFF',
    respondentLabel: 'DEFENDANT',
    caseNumberWord: 'Suit',
  },
  'jammu-and-kashmir': {
    label: 'Jammu and Kashmir',
    actShortTitle: 'The Jammu and Kashmir Houses and Shops Rent Control Act, 1966',
    forumType: 'civil_court',
    prayerNoun: 'Court',
    applicantLabel: 'PLAINTIFF',
    respondentLabel: 'DEFENDANT',
    caseNumberWord: 'Suit',
  },
};

const STATE_LOCATIONS: ForumLocation[] = Object.entries(STATE_FORUMS).map(([id, cfg]) => ({
  id,
  label: cfg.label,
  meta: `Before the ${cfg.prayerNoun} — ${cfg.actShortTitle}`,
}));

const GROUND_OPTIONS: { id: string; label: string; prose: string }[] = [
  {
    id: 'arrears',
    label: 'Arrears of rent',
    prose: 'the tenant has neither paid nor tendered the rent legally due and payable, despite a notice of demand served on the tenant',
  },
  {
    id: 'bona_fide',
    label: 'Bona fide personal requirement',
    prose: 'the premises are bona fide required by the landlord for occupation by the landlord or a member of the landlord\'s family',
  },
  {
    id: 'subletting',
    label: 'Unlawful subletting',
    prose: 'the tenant has sub-let, assigned, or otherwise parted with possession of the whole or part of the premises without the landlord\'s written consent',
  },
  {
    id: 'misuse',
    label: 'Change of use / misuse of premises',
    prose: 'the tenant has used the premises for a purpose other than that for which they were let',
  },
  {
    id: 'damage_nuisance',
    label: 'Damage to premises / nuisance',
    prose: 'the tenant has caused substantial damage to the premises, or has created a nuisance, or has done an act inconsistent with the purpose for which the tenancy was granted',
  },
];

interface DocEntry {
  particulars: string;
  pageNo: string;
}

interface SavedContent {
  stateId: string;
  landlordName: string;
  landlordAge: string;
  landlordAddress: string;
  tenantName: string;
  tenantAddress: string;
  premisesAddress: string;
  premisesCity: string;
  monthlyRent: string;
  tenancyStartDate: string;
  purposeOfTenancy: string;
  grounds: string[];
  arrearsAmount: string;
  arrearsPeriod: string;
  noticeDate: string;
  factsNarrative: string;
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
  onOpenLawLibrary?: () => void;
  caseId?: string;
  draftId?: string;
  initialContent?: unknown;
}

const STEPS = [
  'State & parties',
  'Premises, tenancy & grounds',
  'Filing details',
  'Documents (Index)',
  'Preview',
  'Match a style (optional)',
];

export function RentControlEvictionWizard({
  onBack,
  onOpenPricing,
  onOpenLawLibrary,
  caseId: initialCaseId,
  draftId: initialDraftId,
  initialContent,
}: Props) {
  const { user, token } = useAuth();
  const saved = initialContent as Partial<SavedContent> | undefined;
  const [mode, setMode] = useState<UserRole>('advocate');
  const [step, setStep] = useState(0);
  const [stateId, setStateId] = useState(saved?.stateId ?? '');
  const [landlordName, setLandlordName] = useState(saved?.landlordName ?? '');
  const [landlordAge, setLandlordAge] = useState(saved?.landlordAge ?? '');
  const [landlordAddress, setLandlordAddress] = useState(saved?.landlordAddress ?? '');
  const [tenantName, setTenantName] = useState(saved?.tenantName ?? '');
  const [tenantAddress, setTenantAddress] = useState(saved?.tenantAddress ?? '');
  const [premisesAddress, setPremisesAddress] = useState(saved?.premisesAddress ?? '');
  const [premisesCity, setPremisesCity] = useState(saved?.premisesCity ?? '');
  const [monthlyRent, setMonthlyRent] = useState(saved?.monthlyRent ?? '');
  const [tenancyStartDate, setTenancyStartDate] = useState(saved?.tenancyStartDate ?? '');
  const [purposeOfTenancy, setPurposeOfTenancy] = useState(saved?.purposeOfTenancy ?? 'residential');
  const [grounds, setGrounds] = useState<string[]>(saved?.grounds ?? []);
  const toggleGround = (id: string) => setGrounds((cur) => (cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id]));
  const [arrearsAmount, setArrearsAmount] = useState(saved?.arrearsAmount ?? '');
  const [arrearsPeriod, setArrearsPeriod] = useState(saved?.arrearsPeriod ?? '');
  const [noticeDate, setNoticeDate] = useState(saved?.noticeDate ?? '');
  const [factsNarrative, setFactsNarrative] = useState(saved?.factsNarrative ?? '');
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

  const selectedForum = stateId ? STATE_FORUMS[stateId] : undefined;

  const handleSaveDraft = async () => {
    if (!user || !token) return;
    setSaveState('saving');
    setPaywall(false);
    const content: SavedContent & { [WIZARD_CASE_TYPE_KEY]: string } = {
      stateId,
      landlordName,
      landlordAge,
      landlordAddress,
      tenantName,
      tenantAddress,
      premisesAddress,
      premisesCity,
      monthlyRent,
      tenancyStartDate,
      purposeOfTenancy,
      grounds,
      arrearsAmount,
      arrearsPeriod,
      noticeDate,
      factsNarrative,
      advocateName,
      advocateAddress,
      advocatePhone,
      advocateEmail,
      filingPlace,
      filingDate,
      verificationPlace,
      documentEntries,
      [WIZARD_CASE_TYPE_KEY]: 'ct-rent-control-eviction',
    };
    try {
      if (caseId && draftId) {
        await casesClient.updateDraft(caseId, draftId, content, token);
      } else {
        const created = await casesClient.createCase(
          {
            title: `${landlordName || 'Landlord'} vs. ${tenantName || 'Tenant'} — Rent Control Eviction`,
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

  const citationMatches = findRelevantActSections({ causeType: 'rent_eviction', stateLabel: selectedForum?.label });

  const filedByBlock = buildFiledByBlock({
    applicantLines: [landlordName || '[Landlord]', `(${selectedForum?.applicantLabel ?? 'APPLICANT'})`],
    advocateName,
    advocateAddress,
    advocatePhone,
    advocateEmail,
    place: filingPlace,
    date: filingDate,
  });

  const groundParagraphs = grounds
    .map((id) => GROUND_OPTIONS.find((g) => g.id === id))
    .filter((g): g is (typeof GROUND_OPTIONS)[number] => !!g)
    .map((g) => toThatClause(g.prose + '.'));

  const forumNoun = selectedForum?.prayerNoun ?? 'Court';
  const actShortTitle = selectedForum?.actShortTitle ?? "the applicable state Rent Control Act";

  const draftSections: DraftSection[] = [
    {
      heading: 'Particulars of the tenancy',
      paragraphs: [
        toThatClause(
          `the Respondent is a tenant of the Applicant in respect of the premises situated at ${
            premisesAddress || '[premises address]'
          } (hereinafter "the premises"), let out for ${purposeOfTenancy} purposes at a monthly rent of ₹${
            monthlyRent || '[monthly rent]'
          }, the tenancy having commenced on ${tenancyStartDate || '[tenancy start date]'}.`
        ),
      ],
      incomplete: !premisesAddress || !monthlyRent,
    },
    ...(grounds.includes('arrears')
      ? [
          {
            heading: 'Particulars of arrears',
            paragraphs: [
              toThatClause(
                `the Respondent has failed to pay rent amounting to ₹${
                  arrearsAmount || '[arrears amount]'
                }, for the period ${
                  arrearsPeriod || '[arrears period]'
                }, despite a notice of demand served on the Respondent on ${
                  noticeDate || '[notice date]'
                }, and has neither paid nor tendered the said arrears within the time allowed under ${actShortTitle}.`
              ),
            ],
            incomplete: !arrearsAmount || !arrearsPeriod,
          },
        ]
      : []),
    {
      heading: 'Facts',
      paragraphs: [
        toThatClause(
          factsNarrative.trim() ||
            '[Describe the background facts leading up to this petition — how the tenancy came about, and the events giving rise to the grounds for eviction relied upon below]'
        ),
      ],
      incomplete: !factsNarrative.trim(),
      role: 'facts',
    },
    {
      heading: 'Grounds for eviction',
      paragraphs:
        groundParagraphs.length > 0
          ? groundParagraphs
          : [toThatClause('the Respondent is liable to be evicted from the premises on the grounds set out below.')],
      incomplete: grounds.length === 0,
      role: 'grounds',
    },
    ...(citationMatches.length > 0
      ? [{ heading: 'Statutory provisions relied upon', paragraphs: buildCitationParagraphs(citationMatches), role: 'law' as const }]
      : []),
    {
      heading: 'Prayer',
      paragraphs: [
        `It is therefore most respectfully prayed that this Hon'ble ${forumNoun} may be pleased to direct the Respondent to hand over vacant possession of the premises situated at ${
          premisesAddress || '[premises address]'
        } to the Applicant, and to pass any other order(s) as this Hon'ble ${forumNoun} may deem fit and proper in the interest of justice.`,
      ],
    },
    ...buildVerificationSection(landlordName, verificationPlace),
    ...filedByBlock,
  ];

  const causeTitleInfo = {
    forumType: selectedForum?.forumType ?? 'civil_court',
    applicationTitle: caseType.name,
    governingLaw: selectedForum?.actShortTitle,
    applicantName: landlordName,
    applicantLabel: selectedForum?.applicantLabel ?? 'APPLICANT',
    respondentName: tenantName,
    respondentLabel: selectedForum?.respondentLabel ?? 'RESPONDENT',
    caseNumberLine: `Eviction ${selectedForum?.caseNumberWord ?? 'Petition'} No. _____ of ${new Date().getFullYear()}`,
    benchCity: premisesCity || undefined,
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
        `${landlordName || '[Landlord]'} aged about ${landlordAge || '[age]'}, R/o ${
          landlordAddress || '[Address]'
        }, I, the above-named deponent, do hereby solemnly affirm and declare as under:`,
      ],
    },
    {
      unnumbered: true,
      paragraphs: [
        `1. That I am the ${
          selectedForum?.applicantLabel ?? 'Applicant'
        } in the present case, being the landlord of the premises described above, and I am well conversant with the facts and circumstances of the case.`,
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
        governingLaw={selectedForum?.actShortTitle ?? caseType.governingLaw}
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        mode={mode}
        onModeChange={setMode}
      >
        {step === 0 && (
          <div>
            <h3 className="step-heading">State and parties</h3>
            <p className="step-help">
              Which state's Rent Control Act applies depends on where the premises are situated. Tamil Nadu,
              Uttarakhand, and a few Union territories have replaced the classic Rent Control Act model with a
              written, Rent-Authority-registered tenancy agreement instead — this wizard doesn't cover those; check
              this platform's Law Library for the applicable Act if your state isn't listed below.
            </p>
            <LocationSelector
              mode={mode}
              locations={STATE_LOCATIONS}
              value={stateId}
              onSelect={setStateId}
              label="State"
              helpText="The adjudicating authority and case-number convention depend on the state you pick."
              verifyNote="Confirm the current adjudicating authority and applicability of the Act to your premises with the local Bar or registry"
              verifyUrl="https://ecourts.gov.in"
              searchPlaceholder="Type a state…"
            />
            <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-field">
                <span>
                  {mode === 'advocate' ? 'Landlord' : 'Your name'}
                  {mode === 'justice_seeker' && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (you're the landlord in this case)</span>
                  )}
                </span>
                <input type="text" value={landlordName} onChange={(e) => setLandlordName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Landlord's age</span>
                <input type="text" value={landlordAge} onChange={(e) => setLandlordAge(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Landlord's address</span>
                <input type="text" value={landlordAddress} onChange={(e) => setLandlordAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Tenant</span>
                <input type="text" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Tenant's address</span>
                <input type="text" value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)} />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="step-heading">Premises, tenancy, and grounds</h3>
            <div className="form-grid">
              <label className="form-field">
                <span>Premises address</span>
                <input type="text" value={premisesAddress} onChange={(e) => setPremisesAddress(e.target.value)} />
              </label>
              <label className="form-field">
                <span>City where the premises is situated</span>
                <input type="text" value={premisesCity} onChange={(e) => setPremisesCity(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Monthly rent (₹)</span>
                <input type="text" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Tenancy start date</span>
                <input type="date" value={tenancyStartDate} onChange={(e) => setTenancyStartDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Purpose of tenancy</span>
                <select value={purposeOfTenancy} onChange={(e) => setPurposeOfTenancy(e.target.value)}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
            </div>
            <p className="step-help" style={{ marginTop: 'var(--space-4)' }}>
              Tick every ground that applies — the exact clause lettering varies by state, so the Statutory
              Provisions section below cites your state's actual eviction section for you to confirm the ground
              against.
            </p>
            <div>
              {GROUND_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
                >
                  <input type="checkbox" checked={grounds.includes(opt.id)} onChange={() => toggleGround(opt.id)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {grounds.includes('arrears') && (
              <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-field">
                  <span>Arrears amount (₹)</span>
                  <input type="text" value={arrearsAmount} onChange={(e) => setArrearsAmount(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Arrears period (e.g. January 2026 to June 2026)</span>
                  <input type="text" value={arrearsPeriod} onChange={(e) => setArrearsPeriod(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Date the notice of demand was served</span>
                  <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
                </label>
              </div>
            )}
            <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
              <span>Facts</span>
              <textarea
                className="facts-textarea"
                rows={6}
                value={factsNarrative}
                onChange={(e) => setFactsNarrative(e.target.value)}
                placeholder="Describe the background facts leading up to this petition"
              />
            </label>
            <ActReferencePanel
              causeType="rent_eviction"
              stateLabel={selectedForum?.label}
              onOpenLawLibrary={onOpenLawLibrary}
            />
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
              Add each document you're annexing, in the order it will be paginated — including the rent
              agreement/rent receipts and a copy of the notice of demand, where applicable.
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
            <DraftDocument title="Rent Control Eviction Petition — Index" causeTitleHtml={indexCauseTitleHtml} sections={indexSections} />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part II — Petition</h4>
            <DraftDocument
              title="Rent Control Eviction Petition"
              subtitle={`Petition under ${actShortTitle} — ${landlordName || '[Landlord]'} vs. ${tenantName || '[Tenant]'}`}
              causeTitleHtml={causeTitleHtml}
              sections={applyJudgeStyleToSections(draftSections, judgeStyleProfile)}
            />
            <h4 style={{ marginTop: 'var(--space-6)' }}>Part III — Affidavit</h4>
            <DraftDocument
              title="Rent Control Eviction Petition — Affidavit"
              causeTitleHtml={affidavitCauseTitleHtml}
              sections={affidavitSections}
            />

            <FilingGuidance forum="rentControlAuthority" contextLabel={premisesCity || undefined} />

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
