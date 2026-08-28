import '../components/DeadlineCalculator.css';

interface Props {
  onChoosePlan: () => void;
}

/** Shown wherever a draft-creation call comes back 402 — the account's 2 free drafts are used
 *  and no subscription is active. One flat rule for every account (see PricingPage) — there is
 *  no longer a role-based distinction or a pay-per-document fallback. */
export function PaywallBlock({ onChoosePlan }: Props) {
  return (
    <div className="deadline-card status-danger">
      <p className="deadline-label">Your 2 free drafts are used</p>
      <p className="deadline-body">Subscribe to keep drafting — plans start at ₹299/month.</p>
      <button className="para-btn" style={{ marginTop: 'var(--space-3)' }} onClick={onChoosePlan}>
        Choose a plan →
      </button>
    </div>
  );
}
