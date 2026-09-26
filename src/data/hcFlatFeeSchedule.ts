// High Court flat-fee schedule — covers the 6 HC petition types whose court fee is a fixed rupee
// amount rather than ad valorem (Writ Petition Art. 226/227, Habeas Corpus, Contempt Petition,
// Election Petition, Miscellaneous/Civil Misc. Petition), plus Arbitration & Conciliation Act,
// 1996 Section 37 appeals, which turned out to be too heterogeneous across states (some ad valorem,
// some tiered-by-value, some genuinely unresolved) to give a single computed figure — its entry
// here is informational only (fee is usually null; the real finding is in the note).
//
// Civil Appeal (First Appeal), Second Appeal, Letters Patent Appeal, and Review Petition are NOT
// in this file — they're ad valorem (Court Fees Act Schedule I Article 1 explicitly covers "plaint
// or memorandum of appeal" at the same rate), so they reuse the existing per-state ad valorem
// schedule in courtFeeSlabs.ts. Review Petition is the one exception that still needed dedicated
// data here: most states charge a FRACTION of the ad valorem appeal fee (see HcReviewRule), but
// Bihar & Jharkhand charge a flat ₹500 regardless of value, which the ad-valorem path can't express.
//
// This is a genuinely hard research area: state Court Fees Acts are old, amended piecemeal over
// decades, and several were only found via a High Court's own published practice document rather
// than the bare Act itself (which can lag behind current practice, or vice versa). Every entry
// below is either a verbatim citation, an explicit reasoned inference (residuary clause by
// elimination), or an honest "not found" — verified 2026-09-26 via a dedicated research pass per
// state (bare Act / gazette text wherever obtainable, cross-checked against a High Court's own
// practice document where one exists). Treat unverified/null entries as a starting point for
// confirming with that High Court's own registry, not as a filed-and-forget figure.

export type HcFlatTypeId =
  | 'writ-226'
  | 'writ-227'
  | 'habeas-corpus'
  | 'contempt'
  | 'election-petition'
  | 'arbitration-s37'
  | 'misc-petition';

export const HC_FLAT_TYPES: { id: HcFlatTypeId; label: string }[] = [
  { id: 'writ-226', label: 'Writ Petition (Article 226)' },
  { id: 'writ-227', label: 'Writ Petition (Article 227)' },
  { id: 'habeas-corpus', label: 'Habeas Corpus Petition' },
  { id: 'contempt', label: 'Contempt Petition' },
  { id: 'election-petition', label: 'Election Petition' },
  { id: 'arbitration-s37', label: 'Arbitration Appeal (Section 37)' },
  { id: 'misc-petition', label: 'Miscellaneous Petition (MP/CMP)' },
];

/** The 3 ad valorem HC appeal types reuse the existing per-state ad valorem schedule directly
 *  (courtFeeSlabs.ts) — same computation as a District Court plaint, since Schedule I Article 1
 *  charges a memorandum of appeal at the same rate as a plaint. Review Petition is also ad
 *  valorem-based (a fraction of the appeal fee) but needs the per-state HcReviewRule above, since
 *  the fraction/threshold/flat-fee rule varies by state. */
export type HcAdValoremTypeId = 'civil-appeal-first' | 'second-appeal' | 'lpa';
export type HcTypeId = HcAdValoremTypeId | 'review' | HcFlatTypeId;

export const HC_AD_VALOREM_TYPES: { id: HcAdValoremTypeId; label: string }[] = [
  { id: 'civil-appeal-first', label: 'Civil Appeal (First Appeal from a District Court decree)' },
  { id: 'second-appeal', label: 'Second Appeal (CPC, S.100)' },
  { id: 'lpa', label: 'Letters Patent Appeal (Intra-Court Appeal)' },
];

export const HC_TYPE_OPTIONS: { id: HcTypeId; label: string; kind: 'ad-valorem' | 'review' | 'flat' }[] = [
  ...HC_AD_VALOREM_TYPES.map((t) => ({ ...t, kind: 'ad-valorem' as const })),
  { id: 'review', label: 'Review Petition (Civil)', kind: 'review' as const },
  ...HC_FLAT_TYPES.map((t) => ({ ...t, kind: 'flat' as const })),
];

export interface HcFlatFeeEntry {
  fee: number | null;
  /** Only set for the handful of states (Gujarat, Maharashtra) that charge a different, usually
   *  lower, fee for an Article 226 petition solely enforcing a Part III fundamental right. */
  fundamentalRightsFee?: number;
  /** True where the figure is per-petitioner rather than per-petition. */
  perPetitioner?: boolean;
  verified: boolean;
  note: string;
}

export interface HcReviewRule {
  kind: 'fraction-with-threshold' | 'fraction-flat' | 'flat-fee' | 'unresolved';
  /** fraction-with-threshold only: half the ad valorem appeal fee if filed before/within this many
   *  days of the decree, full fee if filed on/after. */
  thresholdDays?: number;
  /** flat-fee only: a fixed rupee amount regardless of the underlying case's value. */
  flatFee?: number;
  note: string;
}

export interface HcStateSchedule {
  /** Matches a courtFeeSchedules id in courtFeeSlabs.ts — the same per-state ad valorem schedule
   *  used for Civil Appeal, Second Appeal, Letters Patent Appeal, and (fractionally) Review. */
  scheduleId: string;
  reviewRule: HcReviewRule;
  fees: Record<HcFlatTypeId, HcFlatFeeEntry>;
  /** State-level caveat that doesn't belong to any one fee type — e.g. a governing-Act correction,
   *  or why the whole state is unresolved. */
  overallNote?: string;
}

const HALF_90 = (governingLaw: string): HcReviewRule => ({
  kind: 'fraction-with-threshold',
  thresholdDays: 90,
  note: `Half the ad valorem appeal fee if filed before the 90th day from the decree/order, full fee if filed on or after — ${governingLaw}.`,
});

const HALF_FLAT = (governingLaw: string): HcReviewRule => ({
  kind: 'fraction-flat',
  note: `A flat half of the ad valorem appeal fee, regardless of when it's filed — ${governingLaw}.`,
});

export const HC_STATE_SCHEDULES: Record<string, HcStateSchedule> = {
  delhi: {
    scheduleId: 'delhi',
    reviewRule: HALF_90('Court-fees Act, 1870, Schedule I, Articles 4 & 5 (as applicable to Delhi)'),
    fees: {
      'writ-226': { fee: 50, verified: true, note: 'Schedule II, Article 1(d)(iia), Court-fees Act 1870 as extended to Delhi. Verbatim, cross-verified against the Punjab & Haryana High Court’s own published fee table.' },
      'writ-227': { fee: 2.65, verified: true, note: 'No separate Article 227 item exists — falls to the residuary Article 1(d)(iii). Cross-verified: the P&H HC’s fee table separately lists this as "Civil Revision" at ₹2.65.' },
      'habeas-corpus': { fee: 2.65, verified: true, note: 'Explicitly excluded from the ₹50 writ-fee clause ("other than petition for habeas corpus"), so it falls to the residuary Article 1(d)(iii). Cross-verified against the P&H HC fee table.' },
      contempt: { fee: 2.65, verified: true, note: 'No dedicated contempt article exists — falls to the residuary Article 1(d)(iii). Cross-verified against the P&H HC fee table.' },
      'election-petition': { fee: 2.65, verified: false, note: 'No dedicated election-petition article exists in Delhi’s Schedule II at all — this is the residuary rate, not a confirmed election-specific figure.' },
      'arbitration-s37': { fee: null, verified: false, note: 'No provision in the Act references the 1996 Act. The closest analogue is the general memorandum-of-appeal item (Schedule II, Article 11(b) = ₹5.25), but this is an informed guess, not a confirmed rate — confirm before filing.' },
      'misc-petition': { fee: 2.65, verified: true, note: 'Residuary Article 1(d)(iii), verbatim.' },
    },
    overallNote: 'A 2012 Delhi-specific amendment set much higher fees (₹250/₹500) but was struck down by the Delhi High Court on 9.10.2013, with the SLP against that dismissed by the Supreme Court on 12.11.2013 — the pre-2012 figures above are what’s actually in force today. Several online sources still quote the struck-down 2012 figures; don’t use them.',
  },
  'up-uttarakhand': {
    scheduleId: 'up-uttarakhand',
    reviewRule: HALF_90('Court-fees Act, 1870, Schedule I, Articles 4 & 5 (as applicable to UP)'),
    fees: {
      'writ-226': { fee: 100, verified: true, note: 'Schedule II, Article 1(e)(2), Court-fees Act 1870 as amended for UP. Verbatim.' },
      'writ-227': { fee: 100, verified: true, note: 'Same clause as Article 226 — UP’s Act literally reads "Under Article 226 or Article 227," charging both the same rate.' },
      'habeas-corpus': { fee: 0, verified: true, note: 'Explicitly exempted by name — proviso (i) to Article 1(e): "No Court fee shall be payable...for writs in the nature of habeas corpus." A genuinely different (more generous) outcome than most other states, which merely charge a small residuary fee rather than exempting it outright.' },
      contempt: { fee: 5, verified: false, note: 'No dedicated contempt article — residuary Article 1(e)(5), inferred.' },
      'election-petition': { fee: 5, verified: false, note: 'Article 22 covers only local-body elections (Municipal Board/Zila Parishad/Nagar Mahapalika office-holders, ₹25–₹200); no provision for a Representation of the People Act 1951 petition — falls to the residuary Article 1(e)(5).' },
      'arbitration-s37': { fee: null, verified: false, note: 'Article 11-A prices a memorandum of appeal under Section 39 of the (old) Arbitration Act, 1940: ₹15 up to ₹5,000 in dispute, ₹100 above that. Not confirmed as the figure actually applied to a modern Section 37 (1996 Act) appeal — confirm before filing.' },
      'misc-petition': { fee: 5, verified: true, note: 'Residuary Article 1(e)(5), verbatim.' },
    },
  },
  rajasthan: {
    scheduleId: 'rajasthan',
    reviewRule: HALF_FLAT('Rajasthan Court Fees and Suits Valuation Act, 1961, Schedule I, Article 5'),
    fees: {
      'writ-226': { fee: 25, verified: true, note: 'Schedule II, Article 11(r), Rajasthan Court Fees and Suits Valuation Act, 1961 (as amended by Rajasthan Act 26/1987). Verbatim.' },
      'writ-227': { fee: 25, verified: true, note: 'Same clause as Article 226 — the Act groups both together in Article 11(r).' },
      'habeas-corpus': { fee: 2, verified: true, note: 'Explicitly excluded from Article 11(r); falls to the residuary Article 11(s). Independently matches a secondary-source figure, increasing confidence.' },
      contempt: { fee: 2, verified: false, note: 'The word "contempt" never appears in this Act — residuary Article 11(s), inferred.' },
      'election-petition': { fee: 2, verified: false, note: 'Article 11(t) covers only local-authority elections (₹50–₹250 by office); no Representation of the People Act 1951 provision — falls to residuary Article 11(s).' },
      'arbitration-s37': { fee: null, verified: false, note: 'Schedule I Article 4 prices a memorandum of appeal under Section 39 of the (old) Arbitration Act, 1940: ₹15 up to ₹5,000 in dispute, ₹100 above that. Not confirmed for a modern Section 37 (1996 Act) appeal.' },
      'misc-petition': { fee: 2, verified: true, note: 'Article 11(s), verbatim.' },
    },
    overallNote: 'These fixed-fee figures trace to Rajasthan’s 1987 amendment Acts (26/1987, 7/1987) — no more recent revision was found, but a further increase since 1987 can’t be ruled out.',
  },
  punjab: {
    scheduleId: 'punjab',
    reviewRule: HALF_90('Punjab & Haryana High Court’s own published Court Fee Table'),
    fees: {
      'writ-226': { fee: 50, perPetitioner: true, verified: true, note: 'Punjab & Haryana High Court’s own official "Court Fee Table": "Civil Writ Petition (CWP): Rs. 50 per Petitioner."' },
      'writ-227': { fee: 2.65, verified: true, note: 'Same table, listed as "Civil Revision (CR) filed under Article 227."' },
      'habeas-corpus': { fee: 2.65, verified: true, note: 'Same table, under "Criminal Writ Petition (Parole and Habeas Corpus)" — this rate applies if the petitioner is on bail; no fee at all if the petitioner is already in custody.' },
      contempt: { fee: 2.65, verified: true, note: 'Same table: "Contempt Petition (COCP) — Rs. 2.65."' },
      'election-petition': { fee: 2.65, verified: false, note: 'The High Court’s own table has no dedicated election-petition line — this is a best-estimate residuary figure, not confirmed.' },
      'arbitration-s37': { fee: null, verified: false, note: 'The High Court’s own table states this fee is set by an internal Court circular (Correction Slip No. 45, dated 8.9.2003) whose text could not be located — genuinely unresolved.' },
      'misc-petition': { fee: 2.65, verified: true, note: 'Same table: "Civil Misc. Application (CM) — Rs. 2.65."' },
    },
    overallNote: 'Punjab currently runs on the un-amended 1870 Act because Punjab’s own 2009 Second Amendment Act (which would have raised these rates) remains under a 2013 judicial stay — per the High Court’s own published table.',
  },
  haryana: {
    scheduleId: 'haryana',
    reviewRule: HALF_90('Punjab & Haryana High Court’s own published Court Fee Table'),
    fees: {
      'writ-226': { fee: 50, perPetitioner: true, verified: true, note: 'Per the Punjab & Haryana High Court’s own shared Court Fee Table (same figure as Punjab).' },
      'writ-227': { fee: 2.65, verified: true, note: 'Same shared table, "Civil Revision (CR) filed under Article 227."' },
      'habeas-corpus': { fee: 2.65, verified: true, note: 'Same shared table — applies if the petitioner is on bail; no fee if already in custody.' },
      contempt: { fee: 2.65, verified: true, note: 'Same shared table: "Contempt Petition (COCP) — Rs. 2.65."' },
      'election-petition': { fee: 2.65, verified: false, note: 'No dedicated election-petition line found — best-estimate residuary figure.' },
      'arbitration-s37': { fee: null, verified: false, note: 'Governed by an internal Court circular whose text could not be located — unresolved.' },
      'misc-petition': { fee: 2.65, verified: true, note: 'Same shared table: "Civil Misc. Application (CM) — Rs. 2.65."' },
    },
    overallNote: 'Two independent research passes disagree here: the P&H High Court’s own published Court Fee Table (used above) shows Haryana sharing Punjab’s figures, but a separate reading of Haryana’s own bare-Act Schedule II text found materially higher rates (Article 226 ≈ ₹100, a residuary item ≈ ₹5). The Court’s own practical table is used here as the more current, practice-facing source, but this conflict is unresolved — confirm with the Haryana bench of the P&H High Court before filing.',
  },
  'himachal-pradesh': {
    scheduleId: 'himachal-pradesh',
    reviewRule: HALF_90('Himachal Pradesh Court Fees Act, 1968, First Schedule, Articles 3 & 4'),
    fees: {
      'writ-226': { fee: 50, verified: true, note: 'Second Schedule, Article 1(d)(iii): "under Article 226...other than petitions for habeas corpus and petitions arising out of criminal proceedings." Verbatim from the bare Act.' },
      'writ-227': { fee: 2.65, verified: false, note: 'Not separately named — falls to the residuary Article 1(d)(iv), inferred.' },
      'habeas-corpus': { fee: 2.65, verified: false, note: 'Expressly carved out of the Article 226 clause, so it falls to residuary Article 1(d)(iv) — fairly confident inference, exact figure not separately named.' },
      contempt: { fee: 2.65, verified: false, note: 'This 1968 Act predates the Contempt of Courts Act, 1971 and was never amended to add a contempt article — falls to residuary.' },
      'election-petition': { fee: 2.65, verified: false, note: 'No election-petition article exists in this Act at all — falls to residuary.' },
      'arbitration-s37': { fee: null, verified: false, note: 'The Act only prices an application under Section 20 of the old Arbitration Act, 1940 (₹13) — never updated for the 1996 Act. Genuinely unresolved.' },
      'misc-petition': { fee: 2.65, verified: true, note: 'Residuary Article 1(d)(iv), verbatim.' },
    },
  },
  'jammu-kashmir': {
    scheduleId: 'jammu-kashmir',
    reviewRule: { kind: 'unresolved', note: 'Which Act currently governs is itself unresolved — see the state-level note.' },
    fees: {
      'writ-226': { fee: null, verified: false, note: 'See the state-level note — genuinely unresolved which Act currently governs.' },
      'writ-227': { fee: null, verified: false, note: 'See the state-level note.' },
      'habeas-corpus': { fee: null, verified: false, note: 'See the state-level note.' },
      contempt: { fee: null, verified: false, note: 'See the state-level note.' },
      'election-petition': { fee: null, verified: false, note: 'See the state-level note.' },
      'arbitration-s37': { fee: null, verified: false, note: 'See the state-level note.' },
      'misc-petition': { fee: null, verified: false, note: 'See the state-level note.' },
    },
    overallNote: 'Genuinely unresolved which Act currently governs. J&K’s own pre-2019 Court-Fees Act (Samvat 1977/1920 A.D.) has no article at all for Article 226/227 writs, habeas corpus, contempt, election petitions, or the 1996 Arbitration Act — its writ jurisdiction ran under a different constitutional provision (J&K Constitution Section 103), not Article 226. The central Court-fees Act, 1870 was extended to the UT of J&K in 2020, but the companion Adaptation Order that would have repealed the old local Act does not appear to have done so — leaving live doubt over whether the old Act, the newly-extended 1870 Act, or some combination currently governs these fees. Confirm directly with the J&K & Ladakh High Court registry before filing any of these petition types.',
  },
  gujarat: {
    scheduleId: 'gujarat',
    reviewRule: HALF_90('Gujarat Court-Fees Act, 2004, Schedule I, Articles 8 & 9'),
    fees: {
      'writ-226': { fee: 100, fundamentalRightsFee: 50, verified: true, note: 'Schedule II, Article 1(f)(i) (₹100, not for enforcement of a Part III fundamental right) and 1(f)(ii) (₹50, if it is). Verbatim from the Gujarat Court-Fees Act, 2004 — this Act, not the Bombay Court-fees Act 1959, has governed Gujarat since 2004 (it expressly repealed the 1959 Act’s application here).' },
      'writ-227': { fee: 50, verified: true, note: 'Grouped with the fundamental-rights Article 226 rate in the same clause, Article 1(f)(ii).' },
      'habeas-corpus': { fee: 50, verified: false, note: 'Not separately named, but habeas corpus invokes Article 21 (a Part III right) so it should fall under the ₹50 fundamental-rights clause — reasoned inference, not an explicit line item.' },
      contempt: { fee: 20, verified: false, note: 'No dedicated contempt article — residuary Article 1(f)(iii), inferred.' },
      'election-petition': { fee: 20, verified: false, note: 'A specific Article 33 covers only local-body elections (₹50–₹500); no provision for a Representation of the People Act 1951 petition was found — falls to residuary Article 1(f)(iii).' },
      'arbitration-s37': { fee: null, verified: false, note: 'Only a Section 8 application (₹100, Article 18(a)) is provided for — no Section 37 appeal provision was found. Genuinely unresolved.' },
      'misc-petition': { fee: 20, verified: true, note: 'Residuary Article 1(f)(iii), verbatim.' },
    },
  },
  maharashtra: {
    scheduleId: 'maharashtra',
    reviewRule: { kind: 'fraction-with-threshold', thresholdDays: 30, note: 'Half the ad valorem appeal fee if filed within 30 days of the decree, full fee if filed on or after — Bombay Court-fees Act, 1959, Schedule I, Articles 8 & 9. Note the threshold here is 30 days, not the 90 days used by most other states.' },
    fees: {
      'writ-226': { fee: 625, fundamentalRightsFee: 1250, verified: true, note: 'Schedule II, Article 1(e)(i) (₹625, not for enforcement of a Part III fundamental right) and 1(e)(ii) (₹1,250, if it is) — verbatim from Maharashtra Act X of 2018. Note this state charges MORE, not less, for a fundamental-rights writ, the opposite of Gujarat’s split.' },
      'writ-227': { fee: 1250, verified: true, note: 'Grouped with the fundamental-rights Article 226 rate, Article 1(e)(ii).' },
      'habeas-corpus': { fee: 1250, verified: false, note: 'Not separately named — inferred to fall under the fundamental-rights clause (habeas corpus invokes Article 21).' },
      contempt: { fee: 100, verified: false, note: 'No dedicated contempt article — residuary Article 1(e)(iii), inferred.' },
      'election-petition': { fee: null, verified: false, note: 'Article 33 covers only local-body elections (Sarpanch/Panchayat/Municipal/Mayoral); no Representation of the People Act 1951 provision was found.' },
      'arbitration-s37': { fee: null, verified: false, note: 'Only a Section 34 (set-aside-award) application is priced (½ ad valorem on the award value, Article 3A, inserted 2010) — no Section 37 appeal provision found.' },
      'misc-petition': { fee: 100, verified: true, note: 'Residuary Article 1(e)(iii), verbatim.' },
    },
  },
  karnataka: {
    scheduleId: 'karnataka',
    reviewRule: HALF_90('Karnataka Court Fees and Suits Valuation Act, 1958, Schedule I, Articles 5 & 5A'),
    fees: {
      'writ-226': { fee: 100, verified: true, note: 'Schedule II, Article 11(s). Verbatim from the bare Act, but a listed 2015 amendment (Act 9/2015) could not be independently checked — this figure may be stale.' },
      'writ-227': { fee: 100, verified: true, note: 'Same clause, Article 11(s). Same 2015-amendment caveat applies.' },
      'habeas-corpus': { fee: 2, verified: false, note: 'Article 11(s) explicitly excludes "the writ of Habeas Corpus" from the ₹100 rate, implying a separate, lower fee — the residuary Article 11(u) figure (₹2) is verbatim, but its application to habeas corpus is inferred.' },
      contempt: { fee: 12, verified: false, note: 'No dedicated contempt article — residuary Article 11(m), inferred. Same possible-2015-amendment staleness caveat.' },
      'election-petition': { fee: null, verified: false, note: 'Article 11(v) covers only local-body elections (Taluk Board/Panchayat/Municipal/Mayoral); no Representation of the People Act 1951 provision found.' },
      'arbitration-s37': { fee: null, verified: false, note: 'Article 4 only prices an appeal under the old Arbitration Act, 1940 — no Section 37 (1996 Act) provision found.' },
      'misc-petition': { fee: 12, verified: true, note: 'Residuary Article 11(m), verbatim (same possible-staleness caveat).' },
    },
  },
  'tamil-nadu': {
    scheduleId: 'tamil-nadu',
    reviewRule: HALF_FLAT('Tamil Nadu Court-Fees and Suits Valuation Act, 1955, Schedule I, Article 5'),
    fees: {
      'writ-226': { fee: 750, verified: true, note: 'Schedule II, Article 11, writ-petition clause — set by the Tamil Nadu Court-Fees and Suits Valuation (Second Amendment) Act, 2021, reduced from ₹1,000 after a Madras High Court interim order dated 31.3.2021. High confidence, full amendment history verified.' },
      'writ-227': { fee: 750, verified: true, note: 'Same clause as Article 226 — Tamil Nadu does not distinguish the two.' },
      'habeas-corpus': { fee: 10, verified: false, note: 'Excluded from the ₹750 clause; falls to a residuary rate last confirmed at ₹10 by the 2003 amendment — not confirmed whether later amendments (which only touched the main writ clause) revised this too.' },
      contempt: { fee: 10, verified: false, note: 'No dedicated contempt article — same residuary rate as habeas corpus, inferred.' },
      'election-petition': { fee: null, verified: false, note: 'The election-petition clause covers only local bodies (Panchayat ₹250, Municipal/Corporation ₹1,000, Mayor/Chairman ₹2,500); no Representation of the People Act 1951 provision found.' },
      'arbitration-s37': { fee: null, verified: true, note: 'Unusually, Tamil Nadu’s Act explicitly prices this: Schedule II, Article 4, "Memorandum of appeal under the Arbitration and Conciliation Act, 1996" — 5% ad valorem of the value in dispute. This is the clearest Section 37 finding across all 17 states, but shown here as a rate rather than a computed figure since no confirmed cap was found.' },
      'misc-petition': { fee: 10, verified: false, note: 'Same residuary rate as habeas corpus/contempt.' },
    },
  },
  kerala: {
    scheduleId: 'kerala',
    reviewRule: HALF_FLAT('Kerala Court Fees and Suits Valuation Act, 1959, Schedule I, Article 5'),
    fees: {
      'writ-226': { fee: 100, perPetitioner: true, verified: false, note: 'Kerala’s Schedule II appears to have no dedicated Article 226/227 provision at all — this is the general "Original petition...High Court" residuary rate, Article 11(l)(iii).' },
      'writ-227': { fee: 100, perPetitioner: true, verified: false, note: 'Same residuary provision as Article 226 — no dedicated clause found.' },
      'habeas-corpus': { fee: 100, perPetitioner: true, verified: false, note: 'Same residuary provision — no distinct habeas corpus figure found.' },
      contempt: { fee: 100, verified: true, note: 'Article 11(l)(iv), inserted by Kerala Act 2/2003: "for Contempt of Court Cases in the High Court — One hundred rupees." Explicit, dedicated provision — the clearest contempt figure found across all 17 states.' },
      'election-petition': { fee: 250, verified: true, note: 'Article 11(u)(v), inserted by Kerala Act 12/1969: "election petition presented to the High Court under section 80A of the Representation of the People Act, 1951 — Two hundred and fifty rupees." The only state found with an explicit, dedicated Representation of the People Act provision (every other state’s election-petition article covers local bodies only).' },
      'arbitration-s37': { fee: null, verified: false, note: 'Only Section 34 set-aside applications (tiered ₹50/₹150/₹400 by value) and foreign-award enforcement are priced — no Section 37 provision found.' },
      'misc-petition': { fee: null, verified: false, note: 'Genuinely unresolved between two candidate residuary provisions: Article 11(g) at ₹2, or Article 11(l)(iii) at ₹100 per petitioner — the bare-Act text doesn’t make clear which one a general Section 151 CMP falls under.' },
    },
  },
  'madhya-pradesh': {
    scheduleId: 'madhya-pradesh',
    reviewRule: { kind: 'unresolved', note: 'No current, consolidated MP Schedule text was located — see the state-level note.' },
    fees: {
      'writ-226': { fee: null, verified: false, note: 'No current, consolidated Schedule II text for Madhya Pradesh could be located despite an exhaustive search — see the state-level note.' },
      'writ-227': { fee: null, verified: false, note: 'Same sourcing gap as Article 226.' },
      'habeas-corpus': { fee: null, verified: false, note: 'Same sourcing gap.' },
      contempt: { fee: null, verified: false, note: 'Same sourcing gap.' },
      'election-petition': { fee: null, verified: false, note: 'Same sourcing gap.' },
      'arbitration-s37': { fee: null, verified: false, note: 'Same sourcing gap.' },
      'misc-petition': { fee: null, verified: false, note: 'Same sourcing gap.' },
    },
    overallNote: 'A real, documented sourcing gap, not a shortcut: several narrow MP amendment Acts (2008, 2011, 2012/2013, 2017) were found and read in full, confirming Schedule I/II exist and are numbered similarly to other 1870-Act states, but no source gave the actual current rupee figures for these 8 items — the MP High Court’s own online fee calculator only computes ad valorem fees for appeals, not fixed-fee petitions, and indiacode.nic.in could not be reached. Confirm directly with the MP High Court registry before filing any of these petition types.',
  },
  'bihar-jharkhand': {
    scheduleId: 'bihar-jharkhand',
    reviewRule: { kind: 'flat-fee', flatFee: 500, note: 'A flat ₹500 regardless of the underlying case’s value — Schedule II, Item 11, Court Fees (Bihar Amendment) Act, 2007 (Act 4/2008), continued in near-identical wording by the Court Fees (Jharkhand Amendment) Act, 2022 (Act 14/2023). This is a genuinely different structure from every other state’s Review Petition fee, which is a fraction of the ad valorem appeal fee — Bihar/Jharkhand charge one flat rate no matter the case’s value.' },
    fees: {
      'writ-226': { fee: 500, verified: true, note: 'Schedule II, Item 1(2)(i)(a) — ₹1,000 if filed as a Public Interest Litigation. Verbatim, confirmed identically in both Bihar’s 2007 Act and Jharkhand’s 2022 Act.' },
      'writ-227': { fee: 500, verified: true, note: 'Same clause as Article 226 — no separate figure.' },
      'habeas-corpus': { fee: 500, verified: true, note: 'Unlike most other states, Bihar/Jharkhand’s Act has NO exclusion for habeas corpus — it is charged the same ₹500 rate as an ordinary writ petition. Verbatim, confirmed in both states’ Acts.' },
      contempt: { fee: 0, verified: true, note: 'No fee — Rule 3(vi), Contempt of Courts (Patna High Court) Rules, 1985, continued for Jharkhand under the Bihar Reorganisation Act, 2000. This traces to the High Court’s own Contempt Rules, not the Court Fees Act itself.' },
      'election-petition': { fee: 20, verified: true, note: 'Confirmed via the Jharkhand High Court’s own official practice document (Civil Stamp Reporting, 2019), which explicitly resolves this route as covering Representation of the People Act 1951 (Parliament/Assembly) petitions. A separate ₹2,000 payment is also required, but that is the central Act’s Section 117 security deposit, not a court fee — don’t conflate the two. Bihar’s own equivalent wasn’t independently found but is likely the same given the near-identical Acts.' },
      'arbitration-s37': { fee: 250, verified: true, note: 'Confirmed via the Jharkhand High Court’s own practice document, which explicitly cites "Section 37(1)(b)/37(2)(a) of the Arbitration and Conciliation Act, 1996" — the strongest Section 37 confirmation found across all 17 states. Bihar’s own equivalent wasn’t independently found but is likely the same.' },
      'misc-petition': { fee: 20, verified: false, note: 'Jharkhand’s own practice document gives ₹20, but Bihar’s bare-Act residuary clause reads ₹250 for "other applications" — a real, unresolved divergence between the two states’ current practice; confirm with the specific High Court bench before filing.' },
    },
  },
  'west-bengal': {
    scheduleId: 'west-bengal',
    reviewRule: HALF_90('West Bengal Court-Fees Act, 1970, Schedule I, Articles 4 & 5'),
    fees: {
      'writ-226': { fee: 100, verified: false, note: 'Schedule II, Item 1(k)(i) (1985-text). The Act was materially renumbered by later amendments (2002, 2006) whose full text couldn’t be obtained — this figure may now be higher under the current numbering.' },
      'writ-227': { fee: 100, verified: false, note: 'Item 1(k)(v) (1985-text). Same renumbering caveat as Article 226.' },
      'habeas-corpus': { fee: 0, verified: true, note: 'Schedule II, Item 1(k)(ii): "for writs in the nature of habeas corpus — No fee." An explicit, dedicated nil-fee provision, not silence — confirmed verbatim.' },
      contempt: { fee: 120, verified: false, note: 'No dedicated contempt article — falls to the residuary "original petition" item, confirmed CURRENT at ₹120 by a 2024 Calcutta High Court judgment (up from ₹20 in the 1985 text). The rupee figure is verbatim-current; its application to contempt specifically is inferred.' },
      'election-petition': { fee: null, verified: false, note: 'The Act’s only election-petition items cover local-body elections (Municipal Commissioner, Zilla Parishad, ₹15) — no Representation of the People Act 1951 provision found. Likely falls to the ₹120 residuary rate, but unconfirmed.' },
      'arbitration-s37': { fee: null, verified: true, note: 'Unusually, West Bengal’s Act does explicitly reference the 1996 Act by name — Entry 14 prices a memorandum of appeal under "Sections 37 and 50" of the 1996 Act, confirmed via the 2024 judgment’s own text — but that judgment doesn’t quote Entry 14’s actual rupee amount. (A separate, different entry — 1(10) — covers Section 12/34 applications at ₹100–₹5,000 by award value; don’t substitute that figure for Entry 14.)' },
      'misc-petition': { fee: 120, verified: true, note: 'Schedule II, Entry 2(c): "an original petition not otherwise provided for...chargeable with court fees of Rs. 120." Confirmed verbatim as current by a 2024 Calcutta High Court judgment that turned on this exact figure — the strongest-sourced figure in this state’s table.' },
    },
    overallNote: 'The governing Act is the West Bengal Court-Fees Act, 1970 (Act X of 1970) — it expressly repealed the central 1870 Act’s application to West Bengal (Section 50(1)), so citations to "the Court-fees Act, 1870, as applicable to West Bengal" are outdated.',
  },
  odisha: {
    scheduleId: 'odisha',
    reviewRule: HALF_90('Court-fees Act, 1870, Schedule I, Articles 4 & 5 (unmodified by any Odisha amendment found)'),
    fees: {
      'writ-226': { fee: null, verified: false, note: 'Odisha’s 1992/1993 amendments repurposed the old writ-adjacent article (1(d)) to cover only CPC Section 115 revisions — a genuinely different structure than assumed. The residuary rate is ₹4, and most plausibly (but not confirmedly) covers a general writ petition too.' },
      'writ-227': { fee: null, verified: false, note: 'Same open question as Article 226 — plausibly the same ₹4 residuary rate, unconfirmed.' },
      'habeas-corpus': { fee: null, verified: false, note: 'The High Court’s own Rules structurally exclude habeas corpus from the general writ chapter (a separate chapter and case-type label, "WPCRL") — confirming the exclusion pattern, but no rupee figure for it was found.' },
      contempt: { fee: 0, verified: true, note: 'Orissa High Court Rules, Chapter XVII, Rule 3(c): "No court-fee shall be charged on any such petition." Verbatim from the High Court’s own official Rules — confirmed with high confidence.' },
      'election-petition': { fee: null, verified: false, note: 'Genuinely unresolved — no bare-Act or gazette figure located. (Some web search results quote ₹50/₹150 figures, but these couldn’t be traced to any actual statute or gazette and are treated as unverified, not fact.)' },
      'arbitration-s37': { fee: null, verified: false, note: 'The High Court’s own Rules do formally recognise Section 37 appeals as a case type ("ARBA (ICA)"), but no fee schedule article was found for it.' },
      'misc-petition': { fee: null, verified: false, note: 'Same open question as Article 226/227 — plausibly the ₹4 residuary rate, unconfirmed.' },
    },
  },
  'telangana-ap': {
    scheduleId: 'telangana-ap',
    reviewRule: HALF_FLAT('Andhra Pradesh Court-fees and Suits Valuation Act, 1956, Schedule I, Article 5'),
    fees: {
      'writ-226': { fee: 100, verified: true, note: 'Schedule II, Article 11(s), Andhra Pradesh Court-fees and Suits Valuation Act, 1956 — shared, unamended in its fee amounts, by both Telangana and Andhra Pradesh since the 2014 bifurcation. Verbatim.' },
      'writ-227': { fee: 100, verified: true, note: 'Same clause as Article 226 — the Act literally groups both together.' },
      'habeas-corpus': { fee: 0, verified: true, note: 'Explicitly excluded from Article 11(s) by name, and judicially confirmed as fee-exempt (C. Bollayya v. State of A.P., AP High Court, 1978, citing this exclusion plus a separate exemption for a petition by a person in custody). High confidence for the detained person themself; slightly less certain for a petition filed by a third party on their behalf.' },
      contempt: { fee: null, verified: false, note: 'No dedicated contempt article found in the Act or in the High Court’s own procedural Rules — genuinely unresolved.' },
      'election-petition': { fee: null, verified: false, note: 'Article 11(v) covers only local-body elections (₹25–₹200); no Representation of the People Act 1951 provision found.' },
      'arbitration-s37': { fee: null, verified: false, note: 'The Act was never updated for the 1996 Act — only old Arbitration Act, 1940 figures exist (₹15–₹200 by value, Schedule I Article 4). No confirmed current practice for a 1996-Act Section 37 appeal.' },
      'misc-petition': { fee: 10, verified: true, note: 'Andhra Pradesh High Court’s own Appellate Side Rules, Rule 54-C (as amended 2013/2014): "A Court fee of Rs.10/- shall be affixed to the Miscellaneous petitions and applications" — supersedes the older bare-Act figure of ₹20. Confirmed current for Telangana (which retained the Hyderabad High Court seat); not independently confirmed the Amaravati-seated AP High Court kept the identical figure post-2019 split.' },
    },
    overallNote: 'No fee-amount divergence was found between Telangana and Andhra Pradesh for any of these items — both states have separately amended procedural sections of the shared 1956 Act (payment-mode modernisation, in 2020 and 2024 respectively) without touching the fee schedule itself.',
  },
};
