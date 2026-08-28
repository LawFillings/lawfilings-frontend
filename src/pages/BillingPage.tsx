import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import * as billingClient from '../lib/billingClient';
import type { BillingStatus, PaymentRecord, SubscriptionStatus } from '../lib/billingClient';
import './MyCasesPage.css';
import './AuthForm.css';
import './BillingPage.css';

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  onOpenLogin: () => void;
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  none: 'No active subscription',
  active: 'Subscribed',
  past_due: 'Payment past due',
  cancelled: 'Cancelled',
  halted: 'Payments halted',
};

const STATUS_TONE: Record<SubscriptionStatus, 'warn' | 'safe' | 'neutral'> = {
  none: 'neutral',
  active: 'safe',
  past_due: 'warn',
  cancelled: 'neutral',
  halted: 'warn',
};

export function BillingPage({ onBack, onOpenPricing, onOpenLogin }: Props) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<PaymentRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    Promise.all([billingClient.getBillingStatus(token), billingClient.getBillingHistory(token)])
      .then(([s, h]) => {
        setStatus(s);
        setHistory(h);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load billing info'));
  }, [user, token]);

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      await billingClient.cancelSubscription(token);
      const s = await billingClient.getBillingStatus(token);
      setStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="my-cases-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        ← Back
      </button>

      <header className="my-cases-hero">
        <p className="my-cases-eyebrow">Your account</p>
        <h1 className="my-cases-title">Billing</h1>
      </header>

      {!user && (
        <div className="my-cases-empty">
          <p>Log in to see your billing.</p>
          <button className="para-btn" onClick={onOpenLogin}>
            Log in
          </button>
        </div>
      )}

      {user && error && <div className="auth-error">{error}</div>}

      {user && !status && !error && <p className="step-help">Loading…</p>}

      {user && status && (
        <>
          <div className="billing-status-card">
            <span className={`my-cases-status-badge tone-${STATUS_TONE[status.subscriptionStatus]}`}>
              {STATUS_LABELS[status.subscriptionStatus]}
            </span>
            {status.subscriptionPlan && <p className="step-help">Plan: {status.subscriptionPlan}</p>}
            {status.subscriptionCurrentPeriodEnd && (
              <p className="step-help">Renews {new Date(status.subscriptionCurrentPeriodEnd).toLocaleDateString()}</p>
            )}
            <p className="step-help">Free drafts remaining: {status.freeDraftsRemaining}</p>

            {status.subscriptionStatus === 'active' ? (
              <button className="para-btn" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            ) : (
              <button className="para-btn" onClick={onOpenPricing}>
                Choose a plan →
              </button>
            )}
          </div>

          <h2 className="my-cases-title" style={{ fontSize: 19, marginTop: 'var(--space-6)' }}>
            Payment history
          </h2>
          {history && history.length === 0 && <p className="step-help">No payments yet.</p>}
          {history && history.length > 0 && (
            <div className="my-cases-list">
              {history.map((p) => (
                <div className="my-cases-row" key={p.id} style={{ cursor: 'default' }}>
                  <span className="my-cases-row-title">Subscription ({p.plan})</span>
                  <span className="my-cases-row-meta">
                    <span
                      className={`my-cases-status-badge tone-${
                        p.status === 'captured' ? 'safe' : p.status === 'failed' ? 'warn' : 'neutral'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span>
                      {' '}
                      · ₹{(p.amountPaise / 100).toFixed(2)} · {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
