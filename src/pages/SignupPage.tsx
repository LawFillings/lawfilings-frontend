import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import type { UserRole } from '../types';
import './AuthForm.css';

interface Props {
  onBack: () => void;
  onSignedUp: (role: UserRole) => void;
  onSwitchToLogin: () => void;
}

export function SignupPage({ onBack, onSignedUp, onSwitchToLogin }: Props) {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const [role, setRole] = useState<UserRole>('advocate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [barCouncilNo, setBarCouncilNo] = useState('');
  const [barState, setBarState] = useState('');
  const [verificationDocUrl, setVerificationDocUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t.auth.signup.passwordMismatch);
      return;
    }
    setSubmitting(true);
    try {
      const details =
        role === 'advocate'
          ? { barCouncilNo, barState, verificationDocUrl: verificationDocUrl || undefined }
          : undefined;
      await signup(fullName, email, password, role, details);
      setSignedUp(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.signup.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  if (signedUp) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-eyebrow">{t.auth.signup.verifyEmailTitle}</p>
          <p className="auth-sub">{t.auth.signup.verifyEmailBody(email)}</p>
          <button className="auth-submit" type="button" onClick={() => onSignedUp(role)}>
            {t.auth.signup.continue}
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
        <p className="auth-eyebrow">{t.auth.signup.eyebrow}</p>
        <h1 className="auth-title">{t.auth.signup.title}</h1>
        <p className="auth-sub">{t.auth.signup.sub}</p>
      </header>

      <div className="auth-card">
        <div className="auth-role-toggle" role="group" aria-label="I am a...">
          <button
            type="button"
            className={role === 'advocate' ? 'auth-role-btn active' : 'auth-role-btn'}
            onClick={() => setRole('advocate')}
          >
            {t.auth.signup.advocate}
          </button>
          <button
            type="button"
            className={role === 'justice_seeker' ? 'auth-role-btn active' : 'auth-role-btn'}
            onClick={() => setRole('justice_seeker')}
          >
            {t.auth.signup.justiceSeeker}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>{t.auth.signup.fullName}</span>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{t.auth.signup.email}</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="form-field">
              <span>{t.auth.signup.password}</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>{t.auth.signup.confirmPassword}</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            {role === 'advocate' && (
              <>
                <label className="form-field">
                  <span>{t.auth.signup.barCouncilNo}</span>
                  <input
                    type="text"
                    required
                    value={barCouncilNo}
                    onChange={(e) => setBarCouncilNo(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>{t.auth.signup.barState}</span>
                  <input
                    type="text"
                    required
                    placeholder={t.auth.signup.barStatePlaceholder}
                    value={barState}
                    onChange={(e) => setBarState(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>
                    {t.auth.signup.verificationDocUrl}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> {t.auth.signup.optional}</span>
                  </span>
                  <input
                    type="text"
                    placeholder={t.auth.signup.verificationDocPlaceholder}
                    value={verificationDocUrl}
                    onChange={(e) => setVerificationDocUrl(e.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? t.auth.signup.submitting : t.auth.signup.submit}
          </button>
        </form>
      </div>

      <p className="auth-switch">
        {t.auth.signup.alreadyHaveAccount} <button onClick={onSwitchToLogin}>{t.auth.signup.logIn}</button>
      </p>
    </div>
  );
}
