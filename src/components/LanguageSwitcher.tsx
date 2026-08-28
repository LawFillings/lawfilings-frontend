import { LANGUAGES, useLanguage } from '../lib/language';
import '../pages/AuthForm.css';

interface Props {
  /** Compact renders a dropdown of all languages, current one selected — for nav placement. */
  compact?: boolean;
  className?: string;
}

export function LanguageSwitcher({ compact, className }: Props) {
  const { language, setLanguage } = useLanguage();

  if (compact) {
    return (
      <select
        className={className}
        value={language}
        onChange={(e) => setLanguage(e.target.value as (typeof LANGUAGES)[number]['id'])}
        aria-label="Change language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
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
