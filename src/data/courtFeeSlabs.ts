// Ad valorem court fee schedules — one entry per state/UT the platform currently files in
// (matching the District Court wizards' existing Northern-states coverage, plus Gujarat and
// Telangana/AP whose Court Fees Acts are already sourced in the Law Library). Adding a new state
// or updating a rate after an amendment is a data-only change here — see calculateCourtFee() in
// ../lib/courtFee.ts for the (unchanged) logic that reads this table.

/** One value-range tier of a state's ad valorem schedule. `from`/`base` chain tier-to-tier so the
 *  fee stays continuous at each boundary — `base` is what the fee equals exactly at `from`. */
export interface CourtFeeSlabTier {
  /** Lower bound of this tier, in rupees — equal to the previous tier's `upTo`, or 0 for the first. */
  from: number;
  /** Upper bound of this tier, in rupees (inclusive). `null` marks the final, open-ended tier. */
  upTo: number | null;
  /** The fee already payable at `from`, before this tier's marginal rate is added. */
  base: number;
  /** Marginal rate applied to the value above `from` within this tier (0.025 = 2.5%). 0 for a
   *  flat/fixed-fee tier. */
  rate: number;
  /** Suit value is rounded up to the nearest multiple of this before the rate is applied —
   *  reflects that court fee is paid via stamps of fixed denominations. Omit for no rounding. */
  roundTo?: number;
}

export interface CourtFeeSchedule {
  id: string;
  /** States sharing one unamended legacy Act (e.g. post-bifurcation states) are grouped under a
   *  single schedule, matching how they're actually filed under today. */
  stateLabel: string;
  governingLaw: string;
  tiers: CourtFeeSlabTier[];
  /** Absolute ceiling on the payable fee, if the Act specifies one — several states cap ad valorem
   *  fee regardless of how large the suit value is. */
  cap?: number;
  lastVerified: string;
  sourceNote: string;
}

const VERIFY_CAVEAT =
  'Compiled from a secondary practitioner reference, not yet independently checked against Schedule I of the Act — confirm the computed figure before relying on it for a filing.';

export const courtFeeSchedules: CourtFeeSchedule[] = [
  {
    id: 'delhi',
    stateLabel: 'Delhi & Chandigarh',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Delhi)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 100, base: 0, rate: 0.1, roundTo: 5 },
      { from: 0, upTo: 500, base: 0, rate: 0.1, roundTo: 10 },
      { from: 500, upTo: 890, base: 75, rate: 0.15, roundTo: 10 },
      { from: 890, upTo: 900, base: 135.5, rate: 0 },
      { from: 900, upTo: 910, base: 136.5, rate: 0 },
      { from: 910, upTo: 1000, base: 136.5, rate: 0.15, roundTo: 10 },
      { from: 1000, upTo: 5000, base: 150, rate: 0.122, roundTo: 100 },
      { from: 5000, upTo: 10000, base: 638, rate: 0.0976, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 1126, rate: 0.073, roundTo: 500 },
      { from: 20000, upTo: 30000, base: 1856, rate: 0.0488, roundTo: 1000 },
      { from: 30000, upTo: 50000, base: 2344, rate: 0.0244, roundTo: 2000 },
      { from: 50000, upTo: null, base: 2832, rate: 0.00976, roundTo: 5000 },
    ],
  },
  {
    id: 'up-uttarakhand',
    stateLabel: 'Uttar Pradesh & Uttarakhand',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Uttar Pradesh)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 100, base: 0, rate: 0.1, roundTo: 5 },
      { from: 100, upTo: 300, base: 10, rate: 0.125, roundTo: 10 },
      { from: 300, upTo: 500, base: 35, rate: 0.15, roundTo: 10 },
      { from: 500, upTo: 1000, base: 65, rate: 0.225, roundTo: 10 },
      { from: 1000, upTo: 5000, base: 177.5, rate: 0.12, roundTo: 100 },
      { from: 5000, upTo: 10000, base: 657.5, rate: 0.1, roundTo: 200 },
      { from: 10000, upTo: 10500, base: 1157.5, rate: 0.076, roundTo: 500 },
      { from: 10500, upTo: 11000, base: 1195.5, rate: 0.074, roundTo: 500 },
      { from: 11000, upTo: null, base: 1232.5, rate: 0.075, roundTo: 500 },
    ],
  },
  {
    id: 'rajasthan',
    stateLabel: 'Rajasthan',
    governingLaw: 'The Rajasthan Court Fees and Suits Valuation Act, 1961',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 15000, base: 0, rate: 0.025 },
      { from: 15000, upTo: 75000, base: 375, rate: 0.075 },
      { from: 75000, upTo: 250000, base: 4875, rate: 0.07 },
      { from: 250000, upTo: 500000, base: 17125, rate: 0.065 },
      { from: 500000, upTo: 750000, base: 33375, rate: 0.06 },
      { from: 750000, upTo: 1000000, base: 48375, rate: 0.055 },
      { from: 1000000, upTo: 1500000, base: 62125, rate: 0.05 },
      { from: 1500000, upTo: 2000000, base: 87125, rate: 0.045 },
      { from: 2000000, upTo: 2500000, base: 109625, rate: 0.04 },
      { from: 2500000, upTo: 3000000, base: 129625, rate: 0.035 },
      { from: 3000000, upTo: 4000000, base: 147125, rate: 0.03 },
      { from: 4000000, upTo: 10000000, base: 177125, rate: 0.025 },
      { from: 10000000, upTo: 15000000, base: 327125, rate: 0.02 },
      { from: 15000000, upTo: 20000000, base: 427125, rate: 0.015 },
      { from: 20000000, upTo: 30000000, base: 502125, rate: 0.01 },
      { from: 30000000, upTo: null, base: 602125, rate: 0.005 },
    ],
  },
  {
    id: 'punjab',
    stateLabel: 'Punjab',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Punjab)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 10000, base: 0, rate: 0.025 },
      { from: 10000, upTo: 20000, base: 250, rate: 0.035 },
      { from: 20000, upTo: 30000, base: 600, rate: 0.045 },
      { from: 30000, upTo: 40000, base: 1050, rate: 0.055 },
      { from: 40000, upTo: 50000, base: 1600, rate: 0.065 },
      { from: 50000, upTo: 60000, base: 2250, rate: 0.075 },
      { from: 60000, upTo: 75000, base: 3000, rate: 0.065 },
      { from: 75000, upTo: 100000, base: 3975, rate: 0.055 },
      { from: 100000, upTo: 200000, base: 5350, rate: 0.035 },
      { from: 200000, upTo: null, base: 8850, rate: 0.0225 },
    ],
  },
  {
    id: 'haryana',
    stateLabel: 'Haryana',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Haryana)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 15000, base: 0, rate: 0.025 },
      { from: 15000, upTo: 27000, base: 375, rate: 0.035 },
      { from: 27000, upTo: 39000, base: 795, rate: 0.045 },
      { from: 39000, upTo: 51000, base: 1335, rate: 0.055 },
      { from: 51000, upTo: 63000, base: 1995, rate: 0.065 },
      { from: 63000, upTo: 75000, base: 2775, rate: 0.075 },
      { from: 75000, upTo: 500000, base: 3675, rate: 0.065 },
      { from: 500000, upTo: 1000000, base: 31300, rate: 0.055 },
      { from: 1000000, upTo: 2000000, base: 58800, rate: 0.045 },
      { from: 2000000, upTo: 3000000, base: 103800, rate: 0.035 },
      { from: 3000000, upTo: 4500000, base: 138800, rate: 0.025 },
      { from: 4500000, upTo: 6000000, base: 176300, rate: 0.015 },
      { from: 6000000, upTo: 7500000, base: 198800, rate: 0.005 },
      { from: 7500000, upTo: null, base: 206300, rate: 0.005, roundTo: 5000 },
    ],
  },
  {
    id: 'himachal-pradesh',
    stateLabel: 'Himachal Pradesh',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Himachal Pradesh)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 100, base: 0, rate: 0.2, roundTo: 5 },
      { from: 100, upTo: 500, base: 20, rate: 0.1, roundTo: 10 },
      { from: 500, upTo: 1000, base: 60, rate: 0.2, roundTo: 10 },
      { from: 1000, upTo: 5000, base: 160, rate: 0.15, roundTo: 100 },
      { from: 5000, upTo: 10000, base: 760, rate: 0.1, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 1260, rate: 0.08, roundTo: 500 },
      { from: 20000, upTo: 30000, base: 2060, rate: 0.05, roundTo: 1000 },
      { from: 30000, upTo: 50000, base: 2560, rate: 0.025, roundTo: 2000 },
      { from: 50000, upTo: null, base: 3060, rate: 0.01, roundTo: 5000 },
    ],
  },
  {
    id: 'jammu-kashmir',
    stateLabel: 'Jammu and Kashmir',
    governingLaw: 'The Jammu and Kashmir Court-fees Act, Schedule I',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 50000,
    tiers: [
      { from: 0, upTo: 1000, base: 0, rate: 0.1, roundTo: 100 },
      { from: 1000, upTo: 7500, base: 100, rate: 0.08, roundTo: 100 },
      { from: 7500, upTo: 10000, base: 620, rate: 0.064, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 780, rate: 0.06, roundTo: 500 },
      { from: 20000, upTo: 50000, base: 1380, rate: 0.05, roundTo: 1000 },
      { from: 50000, upTo: 100000, base: 2880, rate: 0.07, roundTo: 5000 },
      { from: 100000, upTo: 200000, base: 6380, rate: 0.074, roundTo: 5000 },
      { from: 200000, upTo: 300000, base: 13780, rate: 0.042, roundTo: 5000 },
      { from: 300000, upTo: null, base: 17980, rate: 0.01, roundTo: 10000 },
    ],
  },
  {
    id: 'gujarat',
    stateLabel: 'Gujarat',
    governingLaw: 'The Gujarat Court-fees Act, 2004',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 75000,
    tiers: [
      { from: 0, upTo: 10000, base: 0, rate: 0.1, roundTo: 100 },
      { from: 10000, upTo: 20000, base: 1000, rate: 0.05, roundTo: 5000 },
      { from: 20000, upTo: 21000, base: 1525, rate: 0 },
      { from: 21000, upTo: 30000, base: 1525, rate: 0.075, roundTo: 1000 },
      { from: 30000, upTo: 32000, base: 2375, rate: 0 },
      { from: 32000, upTo: 34000, base: 2500, rate: 0 },
      { from: 34000, upTo: 50000, base: 2500, rate: 0.075, roundTo: 2000 },
      { from: 50000, upTo: 75000, base: 3700, rate: 0.06, roundTo: 5000 },
      { from: 75000, upTo: 100000, base: 5950, rate: 0 },
      { from: 100000, upTo: 1000000, base: 5950, rate: 0.02, roundTo: 100000 },
      { from: 1000000, upTo: 2000000, base: 23950, rate: 0.012, roundTo: 200000 },
      { from: 2000000, upTo: null, base: 35950, rate: 0.005, roundTo: 100000 },
    ],
  },
  {
    id: 'telangana-ap',
    stateLabel: 'Telangana & Andhra Pradesh',
    governingLaw: 'The Andhra Pradesh Court-fees and Suits Valuation Act, 1956',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 15000, base: 0, rate: 0.025 },
      { from: 15000, upTo: 75000, base: 375, rate: 0.075 },
      { from: 75000, upTo: 250000, base: 4875, rate: 0.07 },
      { from: 250000, upTo: 500000, base: 17125, rate: 0.065 },
      { from: 500000, upTo: 750000, base: 33375, rate: 0.06 },
      { from: 750000, upTo: 1000000, base: 48375, rate: 0.055 },
      { from: 1000000, upTo: 1500000, base: 62125, rate: 0.05 },
      { from: 1500000, upTo: 2000000, base: 87125, rate: 0.045 },
      { from: 2000000, upTo: 2500000, base: 109625, rate: 0.04 },
      { from: 2500000, upTo: 3000000, base: 129625, rate: 0.035 },
      { from: 3000000, upTo: 4000000, base: 147125, rate: 0.03 },
      { from: 4000000, upTo: 5000000, base: 177125, rate: 0.025 },
      { from: 5000000, upTo: 6000000, base: 202125, rate: 0.02 },
      { from: 6000000, upTo: 7000000, base: 222125, rate: 0.015 },
      { from: 7000000, upTo: 8000000, base: 237125, rate: 0.01 },
      { from: 8000000, upTo: null, base: 247125, rate: 0.015 },
    ],
  },
  {
    id: 'maharashtra',
    stateLabel: 'Maharashtra',
    governingLaw: 'The Bombay Court-fees Act, 1959 (as applicable to Maharashtra)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 300000,
    tiers: [
      { from: 0, upTo: 1000, base: 200, rate: 0 },
      { from: 1000, upTo: 5000, base: 200, rate: 0.12, roundTo: 100 },
      { from: 5000, upTo: 10000, base: 680, rate: 0.15, roundTo: 100 },
      { from: 10000, upTo: 20000, base: 1430, rate: 0.15, roundTo: 500 },
      { from: 20000, upTo: 30000, base: 2930, rate: 0.1, roundTo: 1000 },
      { from: 30000, upTo: 50000, base: 3930, rate: 0.05, roundTo: 2000 },
      { from: 50000, upTo: 100000, base: 4930, rate: 0.03, roundTo: 5000 },
      { from: 100000, upTo: 1100000, base: 6430, rate: 0.02, roundTo: 10000 },
      { from: 1100000, upTo: null, base: 26430, rate: 0.012, roundTo: 100000 },
    ],
  },
  {
    id: 'karnataka',
    stateLabel: 'Karnataka',
    governingLaw: 'The Karnataka Court Fees and Suits Valuation Act, 1958',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 15000, base: 0, rate: 0.025 },
      { from: 15000, upTo: 75000, base: 375, rate: 0.075 },
      { from: 75000, upTo: 250000, base: 4875, rate: 0.07 },
      { from: 250000, upTo: 500000, base: 17125, rate: 0.065 },
      { from: 500000, upTo: 750000, base: 33375, rate: 0.06 },
      { from: 750000, upTo: 1000000, base: 48375, rate: 0.055 },
      { from: 1000000, upTo: 1500000, base: 62125, rate: 0.05 },
      { from: 1500000, upTo: 2000000, base: 87125, rate: 0.045 },
      { from: 2000000, upTo: 2500000, base: 109625, rate: 0.04 },
      { from: 2500000, upTo: 3000000, base: 129625, rate: 0.035 },
      { from: 3000000, upTo: 4000000, base: 147125, rate: 0.03 },
      { from: 4000000, upTo: 5000000, base: 177125, rate: 0.025 },
      { from: 5000000, upTo: 6000000, base: 202125, rate: 0.02 },
      { from: 6000000, upTo: 7000000, base: 222125, rate: 0.015 },
      { from: 7000000, upTo: 8000000, base: 237125, rate: 0.01 },
      { from: 8000000, upTo: null, base: 247125, rate: 0.015 },
    ],
  },
  {
    id: 'tamil-nadu',
    stateLabel: 'Tamil Nadu',
    governingLaw: 'The Tamil Nadu Court-fees and Suits Valuation Act, 1955',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 5, base: 0.4, rate: 0 },
      { from: 0, upTo: 100, base: 0, rate: 0.08, roundTo: 5 },
      { from: 100, upTo: null, base: 8, rate: 0.075, roundTo: 10 },
    ],
  },
  {
    id: 'kerala',
    stateLabel: 'Kerala',
    governingLaw: 'The Kerala Court Fees and Suits Valuation Act, 1959',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 100, base: 4, rate: 0 },
      { from: 0, upTo: 15000, base: 0, rate: 0.04, roundTo: 100 },
      { from: 15000, upTo: 50000, base: 600, rate: 0.08, roundTo: 100 },
      { from: 50000, upTo: 1000000, base: 3400, rate: 0.1, roundTo: 100 },
      { from: 1000000, upTo: 10000000, base: 98400, rate: 0.08, roundTo: 100 },
      { from: 10000000, upTo: null, base: 818400, rate: 0.01, roundTo: 100 },
    ],
  },
  {
    id: 'madhya-pradesh',
    stateLabel: 'Madhya Pradesh',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Madhya Pradesh)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 150000,
    tiers: [
      { from: 0, upTo: 833, base: 100, rate: 0 },
      { from: 0, upTo: 500000, base: 0, rate: 0.12 },
      { from: 500000, upTo: 1000000, base: 60000, rate: 0.07 },
      { from: 1000000, upTo: null, base: 95000, rate: 0.03 },
    ],
  },
  {
    id: 'bihar-jharkhand',
    stateLabel: 'Bihar & Jharkhand',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Bihar and Jharkhand)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 50000,
    tiers: [
      { from: 0, upTo: 100, base: 0, rate: 0.2, roundTo: 5 },
      { from: 100, upTo: 1000, base: 20, rate: 0.2, roundTo: 10 },
      { from: 1000, upTo: 5000, base: 200, rate: 0.16, roundTo: 100 },
      { from: 5000, upTo: 10000, base: 840, rate: 0.128, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 1480, rate: 0.096, roundTo: 500 },
      { from: 20000, upTo: 30000, base: 2440, rate: 0.064, roundTo: 1000 },
      { from: 30000, upTo: 50000, base: 3080, rate: 0.032, roundTo: 2000 },
      { from: 50000, upTo: null, base: 3720, rate: 0.016, roundTo: 5000 },
    ],
  },
  {
    id: 'west-bengal',
    stateLabel: 'West Bengal',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to West Bengal)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    cap: 50000,
    tiers: [
      { from: 0, upTo: 1000, base: 0, rate: 0.1, roundTo: 100 },
      { from: 1000, upTo: 7500, base: 100, rate: 0.08, roundTo: 100 },
      { from: 7500, upTo: 10000, base: 620, rate: 0.064, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 780, rate: 0.06, roundTo: 500 },
      { from: 20000, upTo: 50000, base: 1380, rate: 0.05, roundTo: 1000 },
      { from: 50000, upTo: 100000, base: 2880, rate: 0.07, roundTo: 5000 },
      { from: 100000, upTo: 200000, base: 6380, rate: 0.074, roundTo: 5000 },
      { from: 200000, upTo: 300000, base: 13780, rate: 0.042, roundTo: 5000 },
      { from: 300000, upTo: null, base: 17980, rate: 0.01, roundTo: 10000 },
    ],
  },
  {
    id: 'odisha',
    stateLabel: 'Odisha',
    governingLaw: 'The Court-fees Act, 1870, Schedule I (as applicable to Odisha)',
    lastVerified: '2026-08-15',
    sourceNote: VERIFY_CAVEAT,
    tiers: [
      { from: 0, upTo: 100, base: 0, rate: 0.07, roundTo: 5 },
      { from: 100, upTo: 500, base: 7, rate: 0.1, roundTo: 10 },
      { from: 500, upTo: 1000, base: 47, rate: 0.11, roundTo: 10 },
      { from: 1000, upTo: 7500, base: 102, rate: 0.075, roundTo: 100 },
      { from: 7500, upTo: 10000, base: 589.5, rate: 0.06, roundTo: 250 },
      { from: 10000, upTo: 20000, base: 739.5, rate: 0.045, roundTo: 500 },
      { from: 20000, upTo: 30000, base: 1189.5, rate: 0.03, roundTo: 1000 },
      { from: 30000, upTo: 50000, base: 1489.5, rate: 0.015, roundTo: 2000 },
      { from: 50000, upTo: null, base: 1789.5, rate: 0.02, roundTo: 5000 },
    ],
  },
];
