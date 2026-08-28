import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import * as billingClient from '../lib/billingClient';
import type { PlanId } from '../lib/billingClient';
import { ApiError } from '../lib/apiError';
import './AuthForm.css';

export interface CheckoutIntent {
  type: 'subscription';
  plan: PlanId;
}

interface Props {
  intent: CheckoutIntent;
  onBack: () => void;
  onSuccess: () => void;
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Card details never touch this component or our backend — Razorpay's Checkout.js is a hosted,
 * PCI-compliant widget; we only ever receive back a subscription/payment ID plus a signature to
 * verify server-side.
 */
export function CheckoutScreen({ intent, onBack, onSuccess }: Props) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    const run = async () => {
      setStatus('loading');
      setError(null);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error('Could not load the payment provider — check your connection and try again.');
        if (cancelled) return;

        const subscription = await billingClient.createSubscription(intent.plan, token);
        if (cancelled) return;
        const rzp = new (window as any).Razorpay({
          key: subscription.keyId,
          subscription_id: subscription.subscriptionId,
          name: 'LawFilings',
          description: `${intent.plan} subscription`,
          prefill: { email: user.email, name: user.fullName },
          handler: async (response: any) => {
            try {
              await billingClient.verifySubscription(
                response.razorpay_subscription_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
                token
              );
              onSuccess();
            } catch (err) {
              setStatus('error');
              setError(err instanceof Error ? err.message : 'Payment verification failed');
            }
          },
          modal: { ondismiss: () => setStatus('ready') },
        });
        setStatus('ready');
        rzp.open();
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  return (
    <div className="auth-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        ← Back
      </button>
      <header className="auth-hero">
        <p className="auth-eyebrow">Checkout</p>
        <h1 className="auth-title">Subscribe</h1>
      </header>

      {status === 'loading' && <p className="step-help">Opening secure checkout…</p>}
      {status === 'error' && <div className="auth-error">{error ?? 'Payment could not be started — try again shortly.'}</div>}
      {status === 'ready' && <p className="step-help">Complete payment in the window that opened.</p>}
    </div>
  );
}
