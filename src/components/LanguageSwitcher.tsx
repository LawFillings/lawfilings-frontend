import { LANGUAGES, useLanguage } from '../lib/language';
import '../pages/AuthForm.css';

interface Props {
  /** Compact renders a single button that flips to the other language — for nav placement. */
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact, className }: Props) {
  const { language, setLanguage } = useLanguage();

  if (compact) {
    const other = LANGUAGES.find((l) => l.id !== language)!;
    return (
      <button className={className} onClick={() => setLanguage(other.id)} aria-label="Change language">
        {other.label}
      </button>
    );
  }

  return (
    <div className="auth-role-toggle" role="group" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === language ? 'auth-role-btn active' : 'auth-role-btn'}
          onClick={() => setLanguage(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
