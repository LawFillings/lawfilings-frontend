import { useState } from 'react';
import { requestPasswordReset } from '../lib/authClient';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import './AuthForm.css';

interface Props {
  onBack: () => void;
  onBackToLogin: () => void;
  initialEmail?: string;
}

export function ForgotPasswordPage({ onBack, onBackToLogin, initialEmail = '' }: Props) {
  const { t, language } = useLanguage();
  const r = t.auth.recovery;
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim(), language);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : r.sendError);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">{r.sentTitle}</p>
          <p className="auth-sub">{fmt(r.sentBody, { email })}</p>
          <button className="auth-submit" type="button" onClick={onBackToLogin}>
            {r.backToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>
      <header className="auth-hero">
        <h1 className="auth-title">{r.forgotTitle}</h1>
        <p className="auth-sub">{r.forgotSub}</p>
      </header>

      <div className="auth-card">
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{r.email}</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? r.sending : r.sendLink}
          </button>
        </form>
      </div>

      <p className="auth-switch">
        <button onClick={onBackToLogin}>{r.backToLogin}</button>
      </p>
    </div>
  );
}
