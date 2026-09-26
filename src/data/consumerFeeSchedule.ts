// Consumer Commission fee schedule — unlike DRT/NCLT's slab/flat fees, only the Consumer
// Complaint itself carries a prescribed fee, keyed to the value of the goods or services paid
// for plus the compensation claimed (not the pecuniary jurisdiction tier a complaint happens to
// fall into — the same value-based table applies regardless of which of the three Commissions
// hears it). Governed by Rule 7 of the Consumer Protection (Consumer Disputes Redressal
// Commissions) Rules, 2020. Rule 7 has been substituted twice since (by the Consumer Protection
// (Consumer Disputes Redressal Commissions) Amendment Rules, 2022, and again by a 2023 amendment)
// but the value tiers and fee amounts verified here were independently confirmed against both an
// original-2020-Rules source and a source specifically describing the post-2023-amendment table —
// the two landed on identical figures, so this table is the one currently in force.
//
// Rule 7, by its own heading, prescribes a fee for "making complaints" only. No fee provision was
// found — in Rule 7, in the Consumer Protection (Consumer Commission Procedure) Regulations, 2020,
// or elsewhere — for an Execution Application, a Revision Petition, or an Interlocutory
// Application; these are treated as nil-fee below, flagged as an absence-of-fee finding rather
// than a confirmed "fee is zero" line item, since a negative (no fee exists) is inherently harder
// to fully rule out than a positive (a fee of this amount exists) — confirm with the Commission's
// registry before relying on this for a filing.

export type ConsumerApplicationTypeId = 'complaint' | 'execution' | 'written_version' | 'revision' | 'ia_general';

export interface ConsumerApplicationType {
  id: ConsumerApplicationTypeId;
  label: string;
  governingLaw: string;
  /** True when this type needs the "value of goods/services + compensation claimed" figure to
   *  compute a fee; false for a flat (here, always nil) fee that doesn't depend on any amount. */
  needsAmount: boolean;
  sourceNote: string;
  lastVerified: string;
}

const NO_FEE_FOUND =
  'No fee provision was found for this application type in Rule 7 of the Consumer Protection (Consumer Disputes Redressal Commissions) Rules, 2020 (which by its own heading prescribes a fee for "making complaints" only) or in the Consumer Protection (Consumer Commission Procedure) Regulations, 2020 — treated as nil, but confirm with the Commission’s registry before relying on this for a filing.';

export const CONSUMER_APPLICATION_TYPES: ConsumerApplicationType[] = [
  {
    id: 'complaint',
    label: 'Consumer Complaint',
    governingLaw: 'Consumer Protection (Consumer Disputes Redressal Commissions) Rules, 2020, Rule 7',
    needsAmount: true,
    sourceNote:
      'Verified against two independent sources — one describing the original 2020 table and one specifically describing the table as it stands after the 2023 amendment — which give identical value tiers and fee amounts, despite Rule 7 having been substituted twice (2022 and 2023) in between. The fee depends only on the value of goods/services paid for plus compensation claimed, not on which of the three Commissions the complaint is filed in.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'execution',
    label: 'Execution Application',
    governingLaw: 'Consumer Protection Act, 2019, Sections 71–72',
    needsAmount: false,
    sourceNote: NO_FEE_FOUND,
    lastVerified: '2026-09-26',
  },
  {
    id: 'written_version',
    label: 'Written Version — reply to Consumer Complaint',
    governingLaw: 'Consumer Protection Act, 2019, Section 38(2)(a) and 38(3)',
    needsAmount: false,
    sourceNote:
      'No fee — a written version is a response to a complaint, not itself a fee-bearing application under Rule 7.',
    lastVerified: '2026-09-26',
  },
  {
    id: 'revision',
    label: 'Revision Petition (State over District)',
    governingLaw: 'Consumer Protection Act, 2019, Section 47(1)(b)',
    needsAmount: false,
    sourceNote: NO_FEE_FOUND,
    lastVerified: '2026-09-26',
  },
  {
    id: 'ia_general',
    label: 'Interlocutory Application (IA) — general',
    governingLaw: 'Consumer Protection Act, 2019 / Regulations',
    needsAmount: false,
    sourceNote: NO_FEE_FOUND,
    lastVerified: '2026-09-26',
  },
];

/** Rule 7's table: an ordered list of (upper bound in ₹, fee) tiers. The value is compared against
 *  each tier's max in turn; the first tier the value doesn't exceed applies. The last tier (₹7,500)
 *  has no upper bound. */
const COMPLAINT_FEE_TIERS: { max: number | null; fee: number }[] = [
  { max: 500_000, fee: 0 },
  { max: 1_000_000, fee: 200 },
  { max: 2_000_000, fee: 400 },
  { max: 5_000_000, fee: 1_000 },
  { max: 10_000_000, fee: 2_000 },
  { max: 20_000_000, fee: 2_500 },
  { max: 40_000_000, fee: 3_000 },
  { max: 60_000_000, fee: 4_000 },
  { max: 80_000_000, fee: 5_000 },
  { max: 100_000_000, fee: 6_000 },
  { max: null, fee: 7_500 },
];

export interface ConsumerFeeResult {
  fee: number;
}

export function calculateConsumerFee(typeId: ConsumerApplicationTypeId, value: number): ConsumerFeeResult | null {
  if (typeId !== 'complaint') return { fee: 0 };
  if (!Number.isFinite(value) || value < 0) return null;
  for (const tier of COMPLAINT_FEE_TIERS) {
    if (tier.max === null || value <= tier.max) return { fee: tier.fee };
  }
  return null;
}
