import { ApiError } from './apiError';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export type PlanId = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'cancelled' | 'halted';

export interface BillingStatus {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: PlanId | null;
  subscriptionCurrentPeriodEnd: string | null;
  freeDraftsRemaining: number;
}

export interface PaymentRecord {
  id: string;
  kind: 'subscription_charge';
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  amountPaise: number;
  currency: string;
  plan: PlanId | null;
  createdAt: string;
}

function mapStatus(raw: any): BillingStatus {
  return {
    subscriptionStatus: raw.subscriptionStatus,
    subscriptionPlan: raw.subscriptionPlan,
    subscriptionCurrentPeriodEnd: raw.subscriptionCurrentPeriodEnd,
    freeDraftsRemaining: raw.freeDraftsRemaining,
  };
}

function mapPayment(raw: any): PaymentRecord {
  return {
    id: raw.id,
    kind: raw.kind,
    status: raw.status,
    amountPaise: raw.amount_paise,
    currency: raw.currency,
    plan: raw.plan,
    createdAt: raw.created_at,
  };
}

async function request(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/billing${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export async function getBillingStatus(token: string): Promise<BillingStatus> {
  const data = await request('/status', token);
  return mapStatus(data);
}

export async function getBillingHistory(token: string): Promise<PaymentRecord[]> {
  const data = await request('/history', token);
  return data.map(mapPayment);
}

export interface SubscriptionOrder {
  subscriptionId: string;
  keyId: string;
}

export async function createSubscription(plan: PlanId, token: string): Promise<SubscriptionOrder> {
  return request('/subscription', token, { method: 'POST', body: JSON.stringify({ plan }) });
}

export async function verifySubscription(
  razorpaySubscriptionId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  token: string
) {
  return request('/subscription/verify', token, {
    method: 'POST',
    body: JSON.stringify({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature }),
  });
}

export async function cancelSubscription(token: string) {
  return request('/subscription/cancel', token, { method: 'POST' });
}
