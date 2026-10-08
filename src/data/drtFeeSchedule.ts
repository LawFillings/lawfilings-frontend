// DRT/DRAT fee schedules — unlike the ad valorem Court-fees Act, 1870 tables in courtFeeSlabs.ts,
// these are flat/slab fees keyed to the amount of debt due, prescribed under two entirely separate
// Rules depending on which DRT wizard the fee is for:
//   - Rule 7, Debts Recovery Tribunal (Procedure) Rules, 1993 — OA, Review, IA/MA, and the DRAT
//     appeal against an OA-based DRT order (Recovery of Debts and Bankruptcy Act, 1993, section 20).
//   - Rule 13, Security Interest (Enforcement) Rules, 2002 — the SA under SARFAESI Act section 17,
//     where the fee additionally depends on whether the applicant is the borrower or another
//     aggrieved party, and the DRAT appeal against an SA-based order (SARFAESI Act section 18)
//     which rule 13(3) makes chargeable at the same rate as the original SA.
// Verified 2026-09-26 against two independent secondary sources quoting each Rule's text, then
// re-checked 2026-10-08 against published texts of Rule 7(2) (Indian Kanoon), Rule 13(2) (Legitquest)
// and DRAT Rule 8(2) (DRAT's own Procedure Rules page, via search extract) — all figures and caps
// agreed. Still published compilations, not the gazette itself: confirm before relying on them.
// Note the DRAT appeal fee comes from Rule 8(2) of the DRAT (Procedure) Rules, 1994, not Rule 7 of
// the DRT Rules (whose three-slab item concerns appeals against a Recovery Officer's order).

export type DrtApplicationTypeId = 'oa' | 'sa' | 'review' | 'ia_ma' | 'drat_appeal' | 'ro_appeal';

export interface DrtApplicationType {
  id: DrtApplicationTypeId;
  label: string;
  governingLaw: string;
  /** True when this type needs the "amount of debt due" figure to compute a fee; false for a flat
   *  fee that doesn't depend on any amount (e.g. an IA/MA). */
  needsAmount: boolean;
  sourceNote: string;
  lastVerified: string;
}

export const DRT_APPLICATION_TYPES: DrtApplicationType[] = [
  {
    id: 'oa',
    label: 'Original Application (OA) for debt recovery',
    governingLaw: 'Debts Recovery Tribunal (Procedure) Rules, 1993, Rule 7(1)(a)',
    needsAmount: true,
    sourceNote:
      '₹12,000 up to ₹10 lakh of debt, then ₹1,000 for every lakh (or part of a lakh) above ₹10 lakh, subject to a maximum of ₹1,50,000. Re-checked 2026-10-08 against a published text of Rule 7(2) and tribunal FAQ pages — the figures and the ₹1,50,000 cap agree. A published compilation, not the gazette itself: confirm the computed figure before filing.',
    lastVerified: '2026-10-08',
  },
  {
    id: 'sa',
    label: 'Securitisation Application (SA) under SARFAESI section 17',
    governingLaw: 'Security Interest (Enforcement) Rules, 2002, Rule 13(2)',
    needsAmount: true,
    sourceNote:
      'Borrower: ₹500 per lakh (or part) below ₹10 lakh; ₹5,000 plus ₹250 per lakh (or part) above ₹10 lakh, maximum ₹1,00,000. Any other aggrieved person: ₹125 per lakh below ₹10 lakh; ₹1,250 plus ₹125 per lakh above, maximum ₹50,000. Re-checked 2026-10-08 against a published text of Rule 13(2) — figures and caps agree; a published compilation, not the gazette itself, so confirm before filing. An appeal to DRAT against an SA order (SARFAESI section 18) is chargeable at this same rate, under Rule 13(3).',
    lastVerified: '2026-10-08',
  },
  {
    id: 'review',
    label: 'Review Application',
    governingLaw: 'Debts Recovery Tribunal (Procedure) Rules, 1993, Rule 7(1)(3)',
    needsAmount: true,
    sourceNote:
      'The fee for reviewing an interim order is a flat ₹125, regardless of amount. For a final order, it is 50% of the fee payable on the original OA for that amount of debt, capped at ₹15,000 (a review to correct a clerical or arithmetical mistake is excluded). Re-checked 2026-10-08 against a published text of Rule 7(2).',
    lastVerified: '2026-10-08',
  },
  {
    id: 'ia_ma',
    label: 'Interlocutory (IA) / Miscellaneous (MA) Application',
    governingLaw: 'Debts Recovery Tribunal (Procedure) Rules, 1993, Rule 7(1)(4)',
    needsAmount: false,
    sourceNote:
      'A flat ₹250 regardless of amount (confirmed 2026-10-08 against a published text of Rule 7(2)) — the Rules only define this fee for an Interlocutory Application; a Miscellaneous Application is charged the same rate in practice, but that specific equivalence is not independently confirmed against the Rules’ own text.',
    lastVerified: '2026-10-08',
  },
  {
    id: 'drat_appeal',
    label: 'Appeal to DRAT against a DRT order (from an OA)',
    governingLaw: 'Recovery of Debts and Bankruptcy Act, 1993, Section 20; Debts Recovery Appellate Tribunal (Procedure) Rules, 1994, Rule 8(2)',
    needsAmount: true,
    sourceNote:
      'Three flat slabs by the amount of debt as determined by the DRT (including interest, per the DRAT’s own FAQ): below ₹10 lakh ₹12,000; ₹10 lakh to below ₹30 lakh ₹20,000; ₹30 lakh or more ₹30,000 — Rule 8(2), Debts Recovery Appellate Tribunal (Procedure) Rules, 1994. Re-checked 2026-10-08 against a published text of that Rule; a compilation, not the gazette itself, so confirm before filing. This is the fee for appealing a DRT order made on an OA; an appeal against an order made on an SA (SARFAESI section 18) is charged at the SA rate instead — use the Securitisation Application option above for that.',
    lastVerified: '2026-10-08',
  },
  {
    id: 'ro_appeal',
    label: 'Appeal to the DRT against a Recovery Officer’s order (Section 30)',
    governingLaw: 'Recovery of Debts and Bankruptcy Act, 1993, Sections 30 and 30A; Debts Recovery Tribunal (Procedure) Rules, 1993, Rule 7(2)',
    needsAmount: true,
    sourceNote:
      'Three flat slabs by the amount of debt due, the same amounts as a DRAT appeal: below ₹10 lakh ₹12,000; ₹10 lakh to below ₹30 lakh ₹20,000; ₹30 lakh or more ₹30,000. Checked 2026-10-08 against a published text of Rule 7(2) and tribunal FAQ pages (which describe the slab as the amount appealed against); a compilation, not the gazette itself — confirm which amount your registry applies before filing. Separately, under Section 30A (inserted 2016) an appeal by a person who owes a debt to a bank or financial institution is not entertained unless that person deposits 50% of the debt as determined by the Tribunal — that pre-deposit is a deposit in addition to this fee, shown separately below it as 50% of the amount you enter (the Tribunal applies it to the debt as it determines it; the Section 30A text found has no power to reduce it).',
    lastVerified: '2026-10-08',
  },
];

/** Rule 7(1)(a)/(b): flat ₹12,000 up to ₹10 lakh, then +₹1,000 per lakh (or part) above
 *  ₹10 lakh, capped at ₹1,50,000. */
function oaFee(debtDue: number): number {
  if (debtDue <= 1_000_000) return 12_000;
  const excessLakhs = Math.ceil((debtDue - 1_000_000) / 100_000);
  return Math.min(12_000 + excessLakhs * 1_000, 150_000);
}

/** Rule 13(2): borrower and non-borrower each pay a flat rate per lakh (or part) up to ₹10
 *  lakh, then a base plus a lower marginal rate per lakh (or part) above ₹10 lakh, each with
 *  its own cap. */
function saFee(debtDue: number, isBorrower: boolean): number {
  if (debtDue <= 0) return 0;
  if (debtDue <= 1_000_000) {
    const lakhs = Math.ceil(debtDue / 100_000);
    return lakhs * (isBorrower ? 500 : 125);
  }
  const excessLakhs = Math.ceil((debtDue - 1_000_000) / 100_000);
  return isBorrower
    ? Math.min(5_000 + excessLakhs * 250, 100_000)
    : Math.min(1_250 + excessLakhs * 125, 50_000);
}

/** Three flat slabs by amount of debt, not a continuous formula like the OA fee. Used for a DRAT
 *  appeal (DRAT Rules, Rule 8(2)) and for an appeal against a Recovery Officer's order (DRT Rules,
 *  Rule 7(2)) — different rules, same amounts. */
function appealSlabFee(debtDue: number): number {
  if (debtDue < 1_000_000) return 12_000;
  if (debtDue < 3_000_000) return 20_000;
  return 30_000;
}

export interface DrtFeeInput {
  typeId: DrtApplicationTypeId;
  debtDue: number;
  /** Only meaningful for 'sa'. */
  isBorrower: boolean;
  /** Only meaningful for 'review'. */
  reviewOf: 'interim' | 'final';
}

export interface DrtFeeResult {
  fee: number;
  capped: boolean;
}

/** Mirrors calculateCourtFee()'s shape in ../lib/courtFee.ts so the calculator page can render
 *  both kinds of result the same way, even though the underlying fee logic is unrelated. */
export function calculateDrtFee(input: DrtFeeInput): DrtFeeResult | null {
  const { typeId, debtDue, isBorrower, reviewOf } = input;

  if (typeId === 'ia_ma') return { fee: 250, capped: false };

  if (!Number.isFinite(debtDue) || debtDue <= 0) return null;

  if (typeId === 'oa') {
    const fee = oaFee(debtDue);
    return { fee, capped: fee === 150_000 && debtDue > 1_000_000 };
  }

  if (typeId === 'sa') {
    const fee = saFee(debtDue, isBorrower);
    const cap = isBorrower ? 100_000 : 50_000;
    return { fee, capped: fee === cap && debtDue > 1_000_000 };
  }

  if (typeId === 'review') {
    if (reviewOf === 'interim') return { fee: 125, capped: false };
    const halfOa = oaFee(debtDue) / 2;
    const fee = Math.min(halfOa, 15_000);
    return { fee, capped: fee === 15_000 && halfOa > 15_000 };
  }

  if (typeId === 'drat_appeal' || typeId === 'ro_appeal') {
    return { fee: appealSlabFee(debtDue), capped: false };
  }

  return null;
}
