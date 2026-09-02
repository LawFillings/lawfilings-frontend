import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import * as adminClient from '../lib/adminClient';
import type { LibraryGap } from '../lib/adminClient';
import './MyCasesPage.css';
import './AuthForm.css';

interface Props {
  onBack: () => void;
}

const REASON_LABELS: Record<LibraryGap['reason'], string> = {
  no_search_matches: 'No matching sections found',
  model_declined: 'Sections found, but none answered it',
};

/**
 * Operator-only view of library_question_gaps — real questions the Ask tool couldn't answer
 * from sourced text, newest first. This is the prioritized backlog for what to source into the
 * Law Library next; dismiss an entry once it's been sourced (or judged not worth sourcing).
 */
export function AdminGapsPage({ onBack }: Props) {
  const { token } = useAuth();
  const [gaps, setGaps] = useState<LibraryGap[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    adminClient
      .getLibraryGaps(token)
      .then(setGaps)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(load, [token]);

  const handleDismiss = async (id: string) => {
    if (!token) return;
    setDismissing(id);
    try {
      await adminClient.dismissLibraryGap(id, token);
      setGaps((prev) => prev?.filter((g) => g.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally {
      setDismissing(null);
    }
  };

  return (
    <div className="my-cases-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        ← Back
      </button>

      <header className="my-cases-hero">
        <p className="my-cases-eyebrow">Admin</p>
        <h1 className="my-cases-title">Constitution & Key Statutes gaps</h1>
      </header>

      {error && <div className="auth-error">{error}</div>}
      {!gaps && !error && <p className="step-help">Loading…</p>}

      {gaps && gaps.length === 0 && (
        <div className="my-cases-empty">
          <p>No outstanding gaps — every question the Ask tool has seen was either answered from sourced text or hasn't been asked yet.</p>
        </div>
      )}

      {gaps && gaps.length > 0 && (
        <div className="my-cases-list">
          {gaps.map((gap) => (
            <div className="my-cases-row" key={gap.id} style={{ cursor: 'default' }}>
              <span className="my-cases-row-title">{gap.question}</span>
              <span className="my-cases-row-meta">
                <span className={`my-cases-status-badge tone-${gap.reason === 'no_search_matches' ? 'neutral' : 'warn'}`}>
                  {REASON_LABELS[gap.reason]}
                </span>
                <span> · {new Date(gap.createdAt).toLocaleString()}</span>
              </span>
              <button
                type="button"
                className="para-btn"
                style={{ marginTop: 'var(--space-2)' }}
                onClick={() => handleDismiss(gap.id)}
                disabled={dismissing === gap.id}
              >
                {dismissing === gap.id ? 'Dismissing…' : 'Dismiss'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
