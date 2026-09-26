// NCLT/NCLAT fee schedules — unlike DRT's slab-by-debt-amount fees (drtFeeSchedule.ts), every one
// of these is a flat fee with no amount input needed. Two genuinely separate Schedules apply:
//   - The "SCHEDULE OF FEES" appended to the National Company Law Tribunal Rules, 2016 (S.O. 21st
//     July 2016, Gazette of India Part II Section 3(i)) — Companies Act, 2013 matters only. Verified
//     verbatim against the official gazette text (31 line items; item 30 is the ₹1,000 catch-all for
//     "application under any other provisions specifically not mentioned herein above" — this is
//     what a general IA falls under, per Rule 112(2)).
//   - The Schedule appended to the Insolvency and Bankruptcy (Application to Adjudicating Authority)
//     Rules, 2016 (Rule 10(3)) — for CIRP applications under IBC sections 7, 9, and 10. Verified
//     verbatim against the IBBI's own consolidated (amended up to 19.03.2019) text. Note the fee is
//     NOT uniform across the three: an operational creditor (section 9) pays ₹2,000, while a
//     financial creditor (section 7) or the corporate debtor itself (section 10) each pay ₹25,000 —
//     a materially different amount that's easy to get wrong by assuming all three match.
// The equivalent official NCLAT Schedule of Fees (also gazette-verified) has only two line items —
// section 218(3) and section 421 appeals — no separate NCLAT interlocutory-application fee, and no
// insolvency-appeal-specific (IBC section 61) line item; see the sourceNote on those entries below
// for what that means for confidence level.

export type NcltApplicationTypeId =
  | 's9'
  | 'reply'
  | 'ia_general'
  | 's12a'
  | 'restoration'
  | 'appeal_companies'
  | 'appeal_ibc'
  | 'ia_nclat';

export interface NcltApplicationType {
  id: NcltApplicationTypeId;
  label: string;
  governingLaw: string;
  /** Every NCLT/NCLAT item is a flat fee — this is what the calculator shows immediately, no
   *  amount input needed. */
  fee: number | null;
  /** True for the confirmed items (verbatim against an official gazette/IBBI text); false where
   *  the figure shown is the best-available inference, not a confirmed Schedule line item. */
  verified: boolean;
  sourceNote: string;
  lastVerified: string;
}

const VERIFIED_NCLT =
  'Verified verbatim against the official gazette Schedule of Fees, National Company Law Tribunal Rules, 2016 (21 July 2016, as published in the Gazette of India, Part II, Section 3(i)).';
const VERIFIED_IBC_AA =
  'Verified verbatim against the Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016, Schedule (Rule 10(3)), IBBI’s own consolidated text (amended up to 19.03.2019).';
const VERIFIED_NCLAT =
  'Verified verbatim against the official gazette Schedule of Fees, National Company Law Appellate Tribunal Rules, 2016.';

export const NCLT_APPLICATION_TYPES: NcltApplicationType[] = [
  {
    id: 's9',
    label: 'Section 9 IBC — Operational Creditor CIRP Application',
    governingLaw: 'Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016, Rule 10(3) and Schedule',
    fee: 2_000,
    verified: true,
    sourceNote: `${VERIFIED_IBC_AA} Note this is materially different from the fee for a financial creditor's section 7 application or the corporate debtor's own section 10 application, which are each ₹25,000 under the same Schedule — the three are not uniform.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 'reply',
    label: 'Reply by Corporate Debtor to Section 7/9/10 application',
    governingLaw: 'National Company Law Tribunal Rules, 2016',
    fee: 0,
    verified: true,
    sourceNote:
      'No fee — a reply is a response to an application, not itself a fee-bearing petition or application under the Schedule of Fees.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'ia_general',
    label: 'Interlocutory Application (IA) — general',
    governingLaw: 'National Company Law Tribunal Rules, 2016, Rule 112(2) and Schedule of Fees, item 30',
    fee: 1_000,
    verified: true,
    sourceNote: `${VERIFIED_NCLT} Rule 112(2) ties every interlocutory application's fee to this Schedule; the Schedule has no IA-specific line, so it falls under item 30's catch-all — "application under any other provisions specifically not mentioned herein above" — ₹1,000.`,
    lastVerified: '2026-09-26',
  },
  {
    id: 's12a',
    label: 'Section 12A — Withdrawal of admitted CIRP application',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016, Section 12A',
    fee: 1_000,
    verified: false,
    sourceNote:
      'Section 12A did not exist when the original NCLT/IBC Adjudicating Authority fee Schedules were notified (it was inserted later, in 2018) and no dedicated fee line for it was found in either Schedule during this research pass — the ₹1,000 shown is the general Rule 112(2) catch-all rate, not a confirmed section-12A-specific figure. Confirm the current fee with the NCLT registry before filing.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'restoration',
    label: 'Restoration Application',
    governingLaw: 'National Company Law Tribunal Rules, 2016',
    fee: 1_000,
    verified: false,
    sourceNote:
      'No dedicated "restoration" fee line was found in the official Schedule of Fees during this research pass — the ₹1,000 shown is the general Rule 112(2) catch-all rate, not a confirmed restoration-specific figure. Confirm the current fee with the NCLT registry before filing.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'appeal_companies',
    label: 'Appeal to NCLAT — company law matters (Section 421)',
    governingLaw: 'Companies Act, 2013, Section 421; National Company Law Appellate Tribunal Rules, 2016',
    fee: 5_000,
    verified: true,
    sourceNote: VERIFIED_NCLAT,
    lastVerified: '2026-09-26',
  },
  {
    id: 'appeal_ibc',
    label: 'Appeal to NCLAT — insolvency matters (Section 61 IBC)',
    governingLaw: 'Insolvency and Bankruptcy Code, 2016, Section 61; National Company Law Appellate Tribunal Rules, 2016',
    fee: 5_000,
    verified: false,
    sourceNote:
      'The official NCLAT Schedule of Fees has only two line items — section 218(3) (₹1,000) and section 421 company-law appeals (₹5,000) — no separate line for an insolvency appeal under IBC section 61. The ₹5,000 shown assumes the same general appeal rate applies, but (as with the IBC Adjudicating Authority Rules setting their own separate Schedule for section 7/9/10 applications) a similarly separate, not-yet-located Schedule may govern section 61 appeals specifically. Confirm with the NCLAT registry before filing.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'ia_nclat',
    label: 'Interlocutory Application (IA) — NCLAT appeal',
    governingLaw: 'National Company Law Appellate Tribunal Rules, 2016',
    fee: null,
    verified: false,
    sourceNote:
      'The official NCLAT Schedule of Fees has no separate interlocutory-application line item at all (only section 218(3) and section 421 appeals are listed) — confirm the current IA fee, if any, with the NCLAT registry before filing.',
    lastVerified: '2026-09-26',
  },
];
