import '../components/DeadlineCalculator.css';

interface Props {
  onChoosePlan: () => void;
  /** Overrides the default "free drafts used" framing — e.g. for a feature (like judge style
   *  analysis) that's paid-only from the start, with no free allowance to exhaust. */
  label?: string;
  body?: string;
}

/** Shown wherever a paid action comes back 402. Default copy matches the original "the account's
 *  2 free drafts are used" case (see PricingPage) — pass `label`/`body` to describe a different
 *  reason the same paid-plan prompt is showing. */
export function PaywallBlock({ onChoosePlan, label, body }: Props) {
  return (
    <div className="deadline-card status-danger">
      <p className="deadline-label">{label ?? 'Your 2 free drafts are used'}</p>
      <p className="deadline-body">{body ?? 'Subscribe to keep drafting — plans start at ₹299/month.'}</p>
      <button className="para-btn" style={{ marginTop: 'var(--space-3)' }} onClick={onChoosePlan}>
        Choose a plan →
      </button>
    </div>
  );
}
