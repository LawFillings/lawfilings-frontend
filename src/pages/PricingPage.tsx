import { useAuth } from '../lib/auth';
import type { PlanId } from '../lib/billingClient';
import './AuthForm.css';
import './PricingPage.css';

const PLANS: { id: PlanId; label: string; priceLabel: string }[] = [
  { id: 'monthly', label: 'Monthly', priceLabel: '₹299 / month' },
  { id: 'quarterly', label: 'Quarterly', priceLabel: '₹699 / quarter' },
  { id: 'half_yearly', label: 'Half-yearly', priceLabel: '₹1,199 / half-year' },
  { id: 'yearly', label: 'Annual', priceLabel: '₹1,999 / year' },
];

interface Props {
  onBack: () => void;
  onSelectPlan: (plan: PlanId) => void;
  onOpenLogin: () => void;
}

export function PricingPage({ onBack, onSelectPlan, onOpenLogin }: Props) {
  const { user } = useAuth();

  const handleSelect = (plan: PlanId) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    onSelectPlan(plan);
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
          Every account gets its first 2 drafts free on sign up. After that, one of the plans
          below unlocks unlimited drafting — the same pricing for everyone, whether you're an
          advocate or filing on your own behalf.
        </p>
      </header>

      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <div className="pricing-card" key={plan.id}>
            <p className="pricing-card-label">{plan.label}</p>
            <p className="pricing-card-price">{plan.priceLabel}</p>
            <button className="auth-submit" onClick={() => handleSelect(plan.id)}>
              Choose {plan.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
