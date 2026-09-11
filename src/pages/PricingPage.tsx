import { useAuth } from '../lib/auth';
import type { PlanId, TierId } from '../lib/billingClient';
import './AuthForm.css';
import './PricingPage.css';

const BASE_PLANS: { id: PlanId; label: string; priceLabel: string }[] = [
  { id: 'monthly', label: 'Monthly', priceLabel: '₹499 / month' },
  { id: 'quarterly', label: 'Quarterly', priceLabel: '₹1,199 / quarter' },
  { id: 'half_yearly', label: 'Half-yearly', priceLabel: '₹1,999 / half-year' },
  { id: 'yearly', label: 'Annual', priceLabel: '₹3,499 / year' },
];

const PRO_PLANS: { id: PlanId; label: string; priceLabel: string }[] = [
  { id: 'monthly', label: 'Monthly', priceLabel: '₹999 / month' },
  { id: 'quarterly', label: 'Quarterly', priceLabel: '₹2,499 / quarter' },
  { id: 'half_yearly', label: 'Half-yearly', priceLabel: '₹4,499 / half-year' },
  { id: 'yearly', label: 'Annual', priceLabel: '₹6,999 / year' },
];

interface Props {
  onBack: () => void;
  onSelectPlan: (plan: PlanId, tier: TierId) => void;
  onOpenLogin: () => void;
}

export function PricingPage({ onBack, onSelectPlan, onOpenLogin }: Props) {
  const { user } = useAuth();

  const handleSelect = (plan: PlanId, tier: TierId) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    onSelectPlan(plan, tier);
  };

  return (
    <div className="pricing-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        ← Back
      </button>
      <header className="auth-hero">
        <p className="auth-eyebrow">Pricing</p>
        <h1 className="auth-title">Simple, transparent pricing</h1>
        <p className="auth-sub">
          Every account gets its first 2 drafts free on sign up. Base unlocks unlimited drafting —
          the same pricing for everyone, whether you're an advocate or filing on your own behalf.
          Pro adds cause-list lookups and document translation on top.
        </p>
      </header>

      <h2 className="pricing-tier-heading">Base</h2>
      <p className="pricing-tier-sub">
        Unlimited drafting, drafting-assist suggestions, and the Law Library — plus a directory of every
        court's own cause-list page to search yourself.
      </p>
      <div className="pricing-grid">
        {BASE_PLANS.map((plan) => (
          <div className="pricing-card" key={plan.id}>
            <p className="pricing-card-label">{plan.label}</p>
            <p className="pricing-card-price">{plan.priceLabel}</p>
            <button className="auth-submit" onClick={() => handleSelect(plan.id, 'base')}>
              Choose {plan.label}
            </button>
          </div>
        ))}
      </div>

      <h2 className="pricing-tier-heading">Pro</h2>
      <p className="pricing-tier-sub">
        Everything in Base, plus automatic cause-list fetching/search by your name and document translation
        (fair-use monthly limits apply).
      </p>
      <div className="pricing-grid">
        {PRO_PLANS.map((plan) => (
          <div className="pricing-card pricing-card-pro" key={plan.id}>
            <p className="pricing-card-label">{plan.label}</p>
            <p className="pricing-card-price">{plan.priceLabel}</p>
            <button className="auth-submit" onClick={() => handleSelect(plan.id, 'pro')}>
              Choose {plan.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
