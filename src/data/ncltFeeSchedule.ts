// NCLT/NCLAT fee schedules — unlike DRT's slab-by-debt-amount fees (drtFeeSchedule.ts), every one
// of these is a flat fee with no amount input needed. Two genuinely separate Schedules apply:
//   - The "SCHEDULE OF FEES" appended to the National Company Law Tribunal Rules, 2016 (S.O. 21st
//     July 2016, Gazette of India Part II Section 3(i)) — Companies Act, 2013 matters only. Verified
//     verbatim against the official gazette text (31 line items, all but the omitted item 28 offered here; item 30 is the ₹1,000 catch-all for
//     "application under any other provisions specifically not mentioned herein above" — this is
//     what a general IA falls under, per Rule 112(2)).
//   - The Schedule appended to the Insolvency and Bankruptcy (Application to Adjudicating Authority)
//     Rules, 2016 (Rule 10(3)) — for CIRP applications under IBC sections 7, 9, and 10. Verified
//     verbatim against the IBBI's own consolidated (amended up to 19.03.2019) text. Note the fee is
//     NOT uniform across the three: an operational creditor (section 9) pays ₹2,000, while a
//     financial creditor (section 7) or the corporate debtor itself (section 10) each pay ₹25,000 —
//     a materially different amount that's easy to get wrong by assuming all three match.
// Compounding of offences (section 441, item 28) is not offered: that item was omitted from the
// Schedule by the NCLT (Second Amendment) Rules, 2019.
// The equivalent official NCLAT Schedule of Fees (also gazette-verified) has only two line items —
// section 218(3) and section 421 appeals — no separate NCLAT interlocutory-application fee, and no
// insolvency-appeal-specific (IBC section 61) line item; see the sourceNote on those entries below
// for what that means for confidence level.

export type NcltApplicationTypeId =
  | 's7'
  | 's9'
  | 's10'
  | 'reply'
  | 'ia_general'
  | 's12a'
  | 'restoration'
  | 'appeal_companies'
  | 'appeal_ibc'
  | 'ia_nclat'
  | 'ca_2_41'
  | 'ca_7_7'
  | 'ca_14_1'
  | 'ca_55_3'
  | 'ca_58_3'
  | 'ca_59'
  | 'ca_62_4'
  | 'ca_71_9'
  | 'ca_71_10'
  | 'ca_73_4'
  | 'ca_74_2'
  | 'ca_97_1'
  | 'ca_98_1'
  | 'ca_119_4'
  | 'ca_130_1'
  | 'ca_131_1'
  | 'ca_140_4'
  | 'ca_140_5'
  | 'ca_169_4'
  | 'ca_213'
  | 'ca_218_1'
  | 'ca_222_1'
  | 'ca_230_12'
  | 'ca_241_1'
  | 'ca_242_4'
  | 'ca_243_1b'
  | 'ca_244_1'
  | 'ca_245'
  | 'certified_copy';

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

const SCHEDULE_RECHECK =
  ' Re-checked on 8 October 2026 against a published compilation of the Schedule as amended (2016, 2019 and 2020 amendments). No fee is payable on a petition, application or interlocutory application filed by the Registrar of Companies, a Regional Director or an officer on behalf of the Central Government (Rule 112 provisos).';

/** One line of the Companies Act, 2013 Schedule of Fees appended to the NCLT Rules, 2016. */
function companiesActItem(item: {
  id: NcltApplicationTypeId;
  label: string;
  governingLaw: string;
  fee: number;
  extraNote?: string;
}): NcltApplicationType {
  return {
    id: item.id,
    label: item.label,
    governingLaw: item.governingLaw,
    fee: item.fee,
    verified: true,
    sourceNote: `${VERIFIED_NCLT}${item.extraNote ? ` ${item.extraNote}` : ''}${SCHEDULE_RECHECK}`,
    lastVerified: '2026-10-08',
  };
}

export const NCLT_APPLICATION_TYPES: NcltApplicationType[] = [
  {
    id: 's7',
    label: 'Section 7 IBC — Financial Creditor CIRP Application',
    governingLaw: 'Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016, Rule 10(3) and Schedule',
    fee: 25_000,
    verified: true,
    sourceNote: `${VERIFIED_IBC_AA} A financial creditor (alone or jointly) pays ₹25,000 — unlike an operational creditor's section 9 application (₹2,000) under the same Schedule.`,
    lastVerified: '2026-10-08',
  },
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
    id: 's10',
    label: 'Section 10 IBC — Corporate Applicant (Corporate Debtor) CIRP Application',
    governingLaw: 'Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016, Rule 10(3) and Schedule',
    fee: 25_000,
    verified: true,
    sourceNote: `${VERIFIED_IBC_AA} A corporate debtor filing its own application pays ₹25,000 — unlike an operational creditor's section 9 application (₹2,000) under the same Schedule.`,
    lastVerified: '2026-10-08',
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
  companiesActItem({
    id: 'ca_2_41',
    label: 'Section 2(41) — Change of financial year',
    governingLaw: 'Companies Act, 2013, section 2(41); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 1',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_7_7',
    label: 'Section 7(7) — Company incorporated by furnishing false or incorrect information',
    governingLaw: 'Companies Act, 2013, section 7(7); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 2',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_14_1',
    label: 'Section 14(1) — Conversion of public company into private company',
    governingLaw: 'Companies Act, 2013, section 14(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 3',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_55_3',
    label: 'Section 55(3) — Issue of further redeemable preference shares',
    governingLaw: 'Companies Act, 2013, section 55(3); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 4',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_58_3',
    label: 'Section 58(3) — Appeal against refusal to register transfer of shares',
    governingLaw: 'Companies Act, 2013, section 58(3); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 5',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_59',
    label: 'Section 59 — Rectification of register of members',
    governingLaw: 'Companies Act, 2013, section 59; National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 6',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_62_4',
    label: 'Section 62(4) — Appeal against Government order fixing terms for conversion of debentures and shares',
    governingLaw: 'Companies Act, 2013, section 62(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 7',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_71_9',
    label: 'Section 71(9) — Petition by debenture trustees',
    governingLaw: 'Companies Act, 2013, section 71(9); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 8',
    fee: 2_000,
  }),
  companiesActItem({
    id: 'ca_71_10',
    label: 'Section 71(10) — Failure to redeem debentures',
    governingLaw: 'Companies Act, 2013, section 71(10); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 9',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_73_4',
    label: 'Section 73(4) — Depositor’s application for repayment of deposit or interest',
    governingLaw: 'Companies Act, 2013, section 73(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 10',
    fee: 500,
    extraNote: 'The description of this item was substituted by the NCLT Amendment Rules, 2016.',
  }),
  companiesActItem({
    id: 'ca_74_2',
    label: 'Section 74(2) — Further time for company to repay deposits',
    governingLaw: 'Companies Act, 2013, section 74(2); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 11',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_97_1',
    label: 'Section 97(1) — Calling of annual general meeting',
    governingLaw: 'Companies Act, 2013, section 97(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 12',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_98_1',
    label: 'Section 98(1) — Calling of general meeting (other than annual)',
    governingLaw: 'Companies Act, 2013, section 98(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 13',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_119_4',
    label: 'Section 119(4) — Inspection of minute books / copy of minutes',
    governingLaw: 'Companies Act, 2013, section 119(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 14',
    fee: 500,
  }),
  companiesActItem({
    id: 'ca_130_1',
    label: 'Section 130(1) — Re-opening of books of account (by a person other than the Central Government, Income Tax authorities, SEBI or another statutory regulator)',
    governingLaw: 'Companies Act, 2013, section 130(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 15',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_131_1',
    label: 'Section 131(1) — Voluntary revision of financial statements or Board’s report',
    governingLaw: 'Companies Act, 2013, section 131(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 16',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_140_4',
    label: 'Section 140(4) — Auditor’s representation not sent to members',
    governingLaw: 'Companies Act, 2013, section 140(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 17',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_140_5',
    label: 'Section 140(5) — Change of auditors (application by any other person concerned)',
    governingLaw: 'Companies Act, 2013, section 140(5); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 18',
    fee: 2_000,
  }),
  companiesActItem({
    id: 'ca_169_4',
    label: 'Section 169(4) — Representation not sent to members',
    governingLaw: 'Companies Act, 2013, section 169(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 19',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_213',
    label: 'Section 213 — Investigation into company affairs',
    governingLaw: 'Companies Act, 2013, section 213; National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 20',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_218_1',
    label: 'Section 218(1) — Approval for action proposed against an employee',
    governingLaw: 'Companies Act, 2013, section 218(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 21',
    fee: 1_000,
  }),
  companiesActItem({
    id: 'ca_222_1',
    label: 'Section 222(1) — Imposition of restrictions on securities',
    governingLaw: 'Companies Act, 2013, section 222(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 22',
    fee: 2_500,
  }),
  companiesActItem({
    id: 'ca_230_12',
    label: 'Section 230(12) — Takeover offer of unlisted companies',
    governingLaw: 'Companies Act, 2013, section 230(12); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 22A',
    fee: 5_000,
    extraNote: 'This item was inserted by the NCLT Amendment Rules, 2020 (3 February 2020).',
  }),
  companiesActItem({
    id: 'ca_241_1',
    label: 'Section 241(1) — Oppression and mismanagement',
    governingLaw: 'Companies Act, 2013, section 241(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 23',
    fee: 10_000,
  }),
  companiesActItem({
    id: 'ca_242_4',
    label: 'Section 242(4) — Regulating the conduct of the company',
    governingLaw: 'Companies Act, 2013, section 242(4); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 24',
    fee: 2_500,
  }),
  companiesActItem({
    id: 'ca_243_1b',
    label: 'Section 243(1)(b) — Appointment as Managing Director',
    governingLaw: 'Companies Act, 2013, section 243(1)(b); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 25',
    fee: 5_000,
  }),
  companiesActItem({
    id: 'ca_244_1',
    label: 'Section 244(1) — Waiver of the clause (a)/(b) eligibility requirement for an oppression or mismanagement application',
    governingLaw: 'Companies Act, 2013, section 244(1); National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 26',
    fee: 2_500,
  }),
  companiesActItem({
    id: 'ca_245',
    label: 'Section 245 — Class action suits',
    governingLaw: 'Companies Act, 2013, section 245; National Company Law Tribunal Rules, 2016, Rule 112 and Schedule of Fees, item 27',
    fee: 5_000,
  }),
  {
    id: 'certified_copy',
    label: 'Certified true copy of a final order, for a non-party (Rule 50) — per page',
    governingLaw: 'National Company Law Tribunal Rules, 2016, Rule 50 and Schedule of Fees, item 31',
    fee: 5,
    verified: true,
    sourceNote: `${VERIFIED_NCLT} This is ₹5 per page, not a flat fee for the whole copy. The item was inserted by the NCLT (Amendment) Rules, 2016 (notification of 20 December 2016); it applies to parties other than the concerned parties.`,
    lastVerified: '2026-10-08',
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
