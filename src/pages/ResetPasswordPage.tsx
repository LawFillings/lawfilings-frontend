import { useState } from 'react';
import { resetPassword } from '../lib/authClient';
import { useLanguage } from '../lib/language';
import './AuthForm.css';

interface Props {
  token: string;
  onDone: () => void;
  onRequestNew: () => void;
}

export function ResetPasswordPage({ token, onDone, onRequestNew }: Props) {
  const { t } = useLanguage();
  const r = t.auth.recovery;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [linkBad, setLinkBad] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(r.passwordTooShort);
    if (password !== confirm) return setError(r.mismatch);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch {
      setLinkBad(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">{r.doneTitle}</p>
          <p className="auth-sub">{r.doneBody}</p>
          <button className="auth-submit" type="button" onClick={onDone}>
            {t.auth.login.submit}
          </button>
        </div>
      </div>
    );
  }

  if (linkBad) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-error">{r.linkInvalid}</div>
          <button className="auth-submit" type="button" onClick={onRequestNew}>
            {r.requestNew}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <header className="auth-hero">
        <h1 className="auth-title">{r.resetTitle}</h1>
        <p className="auth-sub">{r.resetSub}</p>
      </header>

      <div className="auth-card">
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{r.newPassword}</span>
              <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{r.confirmPassword}</span>
              <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
          </div>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? r.submitting : r.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
