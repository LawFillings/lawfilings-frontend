import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import './AuthForm.css';

interface Props {
  onBack: () => void;
  onLoggedIn: () => void;
  onSwitchToSignup: () => void;
}

export function LoginPage({ onBack, onLoggedIn, onSwitchToSignup }: Props) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.login.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>
      <header className="auth-hero">
        <p className="auth-eyebrow">{t.auth.login.eyebrow}</p>
        <h1 className="auth-title">{t.auth.login.title}</h1>
        <p className="auth-sub">{t.auth.login.sub}</p>
      </header>

      <div className="auth-card">
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{t.auth.login.email}</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{t.auth.login.password}</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </div>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? t.auth.login.submitting : t.auth.login.submit}
          </button>
        </form>
      </div>

      <p className="auth-switch">
        {t.auth.login.noAccount} <button onClick={onSwitchToSignup}>{t.auth.login.signUp}</button>
      </p>
    </div>
  );
}
