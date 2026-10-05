import { useAuth } from '../lib/auth';
import type { PlanId, TierId } from '../lib/billingClient';
import './AuthForm.css';
import './PricingPage.css';

interface PlanOption {
  id: PlanId;
  label: string;
  priceLabel: string;
  /** Effective monthly cost and saving versus paying month by month — shown under longer plans. */
  perMonth?: string;
}

const BASE_PLANS: PlanOption[] = [
  { id: 'monthly', label: 'Monthly', priceLabel: '₹499 / month' },
  { id: 'quarterly', label: 'Quarterly', priceLabel: '₹1,199 / quarter', perMonth: '≈ ₹400 a month · save 20%' },
  { id: 'yearly', label: 'Annual', priceLabel: '₹3,499 / year', perMonth: '≈ ₹292 a month · save 42%' },
];

const PRO_PLANS: PlanOption[] = [
  { id: 'monthly', label: 'Monthly', priceLabel: '₹999 / month' },
  { id: 'quarterly', label: 'Quarterly', priceLabel: '₹2,499 / quarter', perMonth: '≈ ₹833 a month · save 17%' },
  { id: 'yearly', label: 'Annual', priceLabel: '₹6,999 / year', perMonth: '≈ ₹583 a month · save 42%' },
];

// What each tier actually unlocks (see requireProTier in the backend: Pro adds cause-list fetching
// and document translation; everything else below is Base). Keep this in step with the backend.
const BASE_BENEFITS = [
  'Unlimited drafts — no per-draft limits',
  '40+ kinds of filings across District Courts, High Courts, the Supreme Court, DRT, NCLT, Consumer Commissions and tax tribunals',
  'Real assembled drafts you can print or download as PDF or Word',
  'Upload a notice or agreement and the fields fill themselves in',
  'Drafting-assist suggestions, and match a judge’s drafting style',
  'Step-by-step filing guidance with the official e-filing links',
  'Law Library: 300+ Acts and the Constitution, sourced from primary text',
  'Save your cases, track their status and reopen any draft later',
];

const PRO_BENEFITS = [
  'Everything in Base, plus:',
  'Cause lists fetched and searched by your name automatically, from the courts’ own pages',
  'Translate a judgment or document into your language',
  'Fair-use monthly limits apply to the two Pro features',
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
        Back
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
            <p className="pricing-card-permonth">{plan.perMonth ?? ' '}</p>
            <button className="auth-submit" onClick={() => handleSelect(plan.id, 'base')}>
              Choose {plan.label}
            </button>
            <ul className="pricing-benefits">
              {BASE_BENEFITS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
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
            <p className="pricing-card-permonth">{plan.perMonth ?? ' '}</p>
            <button className="auth-submit" onClick={() => handleSelect(plan.id, 'pro')}>
              Choose {plan.label}
            </button>
            <ul className="pricing-benefits">
              {PRO_BENEFITS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
