import { courtFeeSchedules, type CourtFeeSchedule } from '../data/courtFeeSlabs';

export type { CourtFeeSchedule };
export { courtFeeSchedules };

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export interface CourtFeeResult {
  fee: number;
  /** True when the Act's cap brought the fee down below what the slab formula alone would give. */
  capped: boolean;
}

/** Walks a schedule's tiers to find the one the suit value falls in, then applies that tier's
 *  base + marginal rate (rounding the value up to the tier's stamp denomination first, if set).
 *  Returns null for a non-existent schedule or a non-positive suit value. */
export function calculateCourtFee(scheduleId: string, suitValue: number): CourtFeeResult | null {
  const schedule = courtFeeSchedules.find((s) => s.id === scheduleId);
  if (!schedule || !Number.isFinite(suitValue) || suitValue <= 0) return null;

  const tier = schedule.tiers.find((t) => t.upTo === null || suitValue <= t.upTo);
  if (!tier) return null;

  const roundedValue = tier.roundTo ? ceilTo(suitValue, tier.roundTo) : suitValue;
  const rawFee = tier.base + tier.rate * (roundedValue - tier.from);
  const fee = schedule.cap !== undefined ? Math.min(rawFee, schedule.cap) : rawFee;

  return { fee: Math.round(fee * 100) / 100, capped: schedule.cap !== undefined && fee < rawFee };
}
