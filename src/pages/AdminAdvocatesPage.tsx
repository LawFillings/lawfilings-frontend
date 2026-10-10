import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import * as adminClient from '../lib/adminClient';
import type { AdvocateReview, VerificationStatus } from '../lib/adminClient';
import './MyCasesPage.css';
import './AuthForm.css';

interface Props {
  onBack: () => void;
}

const TABS: { id: VerificationStatus; label: string }[] = [
  { id: 'pending', label: 'Awaiting review' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
];

/** Only an http(s) link is rendered as a clickable URL — the value came from a signup form. */
function safeLink(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Operator-only queue for advocate verification. An advocate signs up with a Bar Council number,
 * state and a link to their enrolment certificate; they only count as "verified" (and can only be
 * listed in Find an Advocate) once approved here. Each decision emails the advocate.
 */
export function AdminAdvocatesPage({ onBack }: Props) {
  const { token } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('pending');
  const [rows, setRows] = useState<AdvocateReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setRows(null);
    setError(null);
    adminClient
      .listAdvocateReviews(status, token)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [token, status]);

  const decide = async (id: string, decision: 'verified' | 'rejected') => {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await adminClient.decideAdvocateVerification(id, decision, token);
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the decision');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="my-cases-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        Back
      </button>

      <header className="my-cases-hero">
        <p className="my-cases-eyebrow">Admin</p>
        <h1 className="my-cases-title">Advocate verification</h1>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={status === tab.id ? 'case-detail-chip active' : 'case-detail-chip'}
            onClick={() => setStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}
      {!rows && !error && <p className="step-help">Loading…</p>}
      {rows && rows.length === 0 && (
        <div className="my-cases-empty">
          <p>No advocate accounts in this list.</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="my-cases-list">
          {rows.map((r) => {
            const link = safeLink(r.verificationDocUrl);
            return (
              <div className="my-cases-row" key={r.id} style={{ cursor: 'default' }}>
                <span className="my-cases-row-title">{r.fullName}</span>
                <span className="my-cases-row-meta">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ''} · signed up {new Date(r.createdAt).toLocaleDateString()}
                </span>
                <span className="my-cases-row-meta">
                  Enrolment no. <strong>{r.barCouncilNo ?? '—'}</strong> · {r.barState ?? 'State not given'}
                </span>
                <span className="my-cases-row-meta">
                  {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      Open enrolment certificate
                    </a>
                  ) : (
                    'No usable certificate link'
                  )}
                </span>
                {status === 'pending' && (
                  <span style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="para-btn"
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, 'verified')}
                    >
                      {busyId === r.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="para-btn"
                      disabled={busyId === r.id}
                      onClick={() => decide(r.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
