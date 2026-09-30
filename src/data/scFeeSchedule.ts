// Supreme Court fee schedule — unlike the High Court (17 separate state Acts), the Supreme Court
// has one central fee schedule for the whole country: the Third Schedule ("Table of Court Fees")
// to the Supreme Court Rules, 2013. Verified 2026-09-26 verbatim against the official Rules text
// (Part I "Original Jurisdiction", Part II "Appellate Jurisdiction", Part III "Miscellaneous", and
// the Part IV "Subject Categories" list plus the Note listing fee-exempt matters), read directly
// from the Supreme Court of India's own PDF — every figure below traces to that primary text, not
// a secondary summary, and several independently-checkable figures matched a practitioner
// secondary source exactly, further increasing confidence.
//
// Two features of this schedule that don't exist in the other calculators on this page:
//   - Several matters are genuinely exempt from court fee altogether: criminal SLPs/appeals/writs/
//     transfer petitions, and Contempt Petitions under the Rules to Regulate Proceedings for
//     Contempt of the Supreme Court, 1975.
//   - A "Part IV" list of ~80 specialised subject categories (direct/indirect tax, company law,
//     arbitration, labour, rent control, etc.) is charged a HIGHER fee than an ordinary civil
//     matter, both for the flat Special Leave Petition fee and for the ad valorem "after notice"
//     appeal fee — this platform simplifies that long list to a single yes/no toggle rather than
//     asking the user to pick a specific subject code.

export type ScApplicationTypeId =
  | 'slp-civil'
  | 'slp-criminal'
  | 'writ-32'
  | 'review'
  | 'curative'
  | 'transfer-petition'
  | 'contempt'
  | 'nclat-appeal'
  | 'appeal-certificate-civil'
  | 'appeal-certificate-criminal'
  | 'ia-general'
  | 'ma-general';

export type ScFeeKind = 'flat' | 'toggle' | 'ad-valorem' | 'derivative';

export interface ScApplicationType {
  id: ScApplicationTypeId;
  label: string;
  governingLaw: string;
  kind: ScFeeKind;
  /** kind: 'flat' */
  flatFee?: number;
  /** kind: 'toggle' — a single yes/no question that switches between two flat fees. */
  toggleLabel?: string;
  toggleYesLabel?: string;
  toggleNoLabel?: string;
  feeIfYes?: number;
  feeIfNo?: number;
  /** kind: 'ad-valorem' — always needs a value; the tier table is either fixed, or (for the one
   *  case type that can go either way) chosen by a yes/no toggle over the Part IV subject list. */
  fixedTierTable?: 'general' | 'part4';
  toggleForTierTable?: { label: string; yesLabel: string; noLabel: string };
  sourceNote: string;
  lastVerified: string;
}

const THIRD_SCHEDULE = 'Supreme Court Rules, 2013, Third Schedule (Table of Court Fees)';
const CRIMINAL_EXEMPT =
  `Verbatim from the ${THIRD_SCHEDULE}, Part III, Note (ii): "No Court fee shall be payable on the following cases: ... Criminal cases (SLPs/Appeals/WPs/TPs (etc.)."`;

export const SC_APPLICATION_TYPES: ScApplicationType[] = [
  {
    id: 'slp-civil',
    label: 'Special Leave Petition (Civil, Article 136)',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entries 1–2`,
    kind: 'toggle',
    toggleLabel: 'Does this matter fall under a specialised Part IV subject category (e.g. direct/indirect tax, company law/NCLT-NCLAT, arbitration, labour, rent control)?',
    toggleYesLabel: 'Yes',
    toggleNoLabel: 'No, an ordinary civil matter',
    feeIfYes: 5_000,
    feeIfNo: 1_500,
    sourceNote: `Verbatim: "Petition for special leave to appeal other than petitions for which Court fee has been distinctly prescribed" = ₹1,500 at institution; "Petition for special leave to appeal in the matters falling in any of subject categories mentioned in Part IV" = ₹5,000 at institution. Part IV lists around 80 specialised subject codes (tax, company law, arbitration, labour, rent control, etc.) rather than a single category — this toggle simplifies that list to a yes/no question.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'slp-criminal',
    label: 'Special Leave Petition (Criminal, Article 136)',
    governingLaw: THIRD_SCHEDULE,
    kind: 'flat',
    flatFee: 0,
    sourceNote: CRIMINAL_EXEMPT,
    lastVerified: '2026-09-26',
  },
  {
    id: 'writ-32',
    label: 'Writ Petition (Article 32)',
    governingLaw: `${THIRD_SCHEDULE}, Part I`,
    kind: 'toggle',
    toggleLabel: 'Is this a habeas corpus petition?',
    toggleYesLabel: 'Yes',
    toggleNoLabel: 'No',
    feeIfYes: 0,
    feeIfNo: 500,
    sourceNote: `Verbatim: "Petitions under Article 32 of the Constitution other than petitions for habeas corpus and petitions arising out of criminal proceedings" = ₹500. Habeas corpus is explicitly carved out of that rate and no separate figure is given for it elsewhere in the Schedule — read together with Part III's exemption for criminal matters, it is treated here as nil-fee.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'review',
    label: 'Review Petition',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entry 6`,
    kind: 'derivative',
    sourceNote: `Verbatim: "Application for review of judgment or order of Court — The same fee as was paid on the original proceedings." There is no separate figure to compute here — the fee is whatever you paid when you first filed the matter now being reviewed.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'curative',
    label: 'Curative Petition',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entry 7`,
    kind: 'derivative',
    sourceNote: `Verbatim: "Curative Petition — The same fee as was paid on the original proceedings." As with a Review Petition, there is no separate figure to compute — it matches whatever was paid on the underlying matter.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'transfer-petition',
    label: 'Transfer Petition (Civil)',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entry 9`,
    kind: 'toggle',
    toggleLabel: 'Does this arise from a matrimonial dispute?',
    toggleYesLabel: 'Yes',
    toggleNoLabel: 'No',
    feeIfYes: 500,
    feeIfNo: 2_500,
    sourceNote: `Verbatim: "Transfer petitions other than the petitions arising out of Matrimonial Disputes — ₹2,500 per matter to be transferred" and "Transfer Petitions arising out of Matrimonial Disputes — ₹500 per matter to be transferred."`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'contempt',
    label: 'Contempt Petition (Supreme Court)',
    governingLaw: THIRD_SCHEDULE,
    kind: 'flat',
    flatFee: 0,
    sourceNote: `Verbatim from Part III, Note (v): "No Court fee shall be payable on ... Contempt Petitions filed under the Rules to Regulate Proceedings for Contempt of the Supreme Court, 1975."`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'nclat-appeal',
    label: 'Statutory Appeal from NCLAT (S.423)',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entry 4; Part IV, category 10 (Company Law, MRTP, TRAI, SEBI, IDRAI & RBI)`,
    kind: 'ad-valorem',
    fixedTierTable: 'part4',
    sourceNote: `This is a statutory appeal (not a discretionary Special Leave Petition), so it is charged at the "after notice" ad valorem rate directly. It falls under Part IV's company-law subject category (item 1003, "matters arising out of orders of Company Law Board" — the NCLAT is the Company Law Board's statutory successor), so the higher Part-IV tier table applies: ₹5,000 up to ₹1,00,000 in dispute, then ₹1,000 per additional ₹50,000 up to ₹20,00,000, then ₹1,000 per additional ₹1,00,000 above that, capped at ₹25,00,000.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'appeal-certificate-civil',
    label: 'Civil Appeal (Certificate, Article 132/133)',
    governingLaw: `${THIRD_SCHEDULE}, Part II, entries 3–4`,
    kind: 'ad-valorem',
    toggleForTierTable: {
      label: 'Does this matter fall under a specialised Part IV subject category (e.g. direct/indirect tax, company law, arbitration, labour, rent control)?',
      yesLabel: 'Yes',
      noLabel: 'No, an ordinary civil matter',
    },
    sourceNote: `This is an as-of-right appeal (following a High Court certificate under Article 134A), not a discretionary Special Leave Petition, so it is charged at the "after notice" ad valorem rate directly rather than the flat SLP-at-institution fee. Ordinary matters: ₹1,500 up to ₹50,000 in dispute, then ₹500 per additional ₹50,000, capped at ₹10,00,000. Part IV subject-category matters: ₹5,000 up to ₹1,00,000, then ₹1,000 per additional ₹50,000 up to ₹20,00,000, then ₹1,000 per additional ₹1,00,000 above that, capped at ₹25,00,000.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'appeal-certificate-criminal',
    label: 'Criminal Appeal (Article 134)',
    governingLaw: THIRD_SCHEDULE,
    kind: 'flat',
    flatFee: 0,
    sourceNote: CRIMINAL_EXEMPT,
    lastVerified: '2026-09-26',
  },
  {
    id: 'ia-general',
    label: 'Interlocutory Application (IA) — general',
    governingLaw: `${THIRD_SCHEDULE}, Part III`,
    kind: 'flat',
    flatFee: 100,
    sourceNote: `Verbatim: "Every application to the court...not specially provided for" = ₹100. An Interlocutory Application is made on notice to the other side, so the ₹200 ad-interim-ex-parte rate (for applications where no notice is given) doesn't apply.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'ma-general',
    label: 'Miscellaneous Application (MA) — general',
    governingLaw: `${THIRD_SCHEDULE}, Part III`,
    kind: 'flat',
    flatFee: 100,
    sourceNote: `Same Part III residuary rate as an Interlocutory Application (₹100) — a Miscellaneous Application is also made on notice to the other side, so the ₹200 ex-parte rate doesn't apply.`,
    lastVerified: '2026-09-26',
  },
];

/** Part II, entry 3: base ₹1,500 up to ₹50,000 in dispute, then +₹500 per additional ₹50,000 (or
 *  part), capped at a total fee of ₹10,00,000. */
function generalAfterNoticeFee(value: number): number {
  if (value <= 50_000) return 1_500;
  const units = Math.ceil((value - 50_000) / 50_000);
  return Math.min(1_500 + units * 500, 1_000_000);
}

/** Part II, entry 4: base ₹5,000 up to ₹1,00,000, then +₹1,000 per additional ₹50,000 (or part)
 *  up to ₹20,00,000, then +₹1,000 per additional ₹1,00,000 (or part) above that, capped at a total
 *  fee of ₹25,00,000. */
function part4AfterNoticeFee(value: number): number {
  if (value <= 100_000) return 5_000;
  if (value <= 2_000_000) {
    const units = Math.ceil((value - 100_000) / 50_000);
    return Math.min(5_000 + units * 1_000, 2_500_000);
  }
  const feeAt20Lakh = 5_000 + Math.ceil((2_000_000 - 100_000) / 50_000) * 1_000;
  const units = Math.ceil((value - 2_000_000) / 100_000);
  return Math.min(feeAt20Lakh + units * 1_000, 2_500_000);
}

export function calculateScAdValoremFee(tierTable: 'general' | 'part4', value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return tierTable === 'part4' ? part4AfterNoticeFee(value) : generalAfterNoticeFee(value);
}
