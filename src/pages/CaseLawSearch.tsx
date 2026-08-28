import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { searchCaseLaw, type CaseLawResult, type CourtCategory } from '../lib/caseLawClient';
import './CaseLawSearch.css';

// Indian Kanoon's headline field may contain search-term highlight markup (e.g. <b> tags) and
// HTML entities (e.g. &quot;) — strip/decode rather than rendering as HTML, since this is
// third-party content we don't control.
function stripHtml(text: string): string {
  const withoutTags = text.replace(/<[^>]*>/g, '');
  return withoutTags
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

interface Props {
  onBack: () => void;
  onOpenLogin: () => void;
}

export function CaseLawSearch({ onBack, onOpenLogin }: Props) {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [courtCategory, setCourtCategory] = useState<CourtCategory | undefined>(undefined);
  const [results, setResults] = useState<CaseLawResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courtCategories: { value: CourtCategory | undefined; label: string }[] = [
    { value: undefined, label: t.caseLawSearch.courtCategoryAll },
    { value: 'supreme_court', label: t.caseLawSearch.courtCategorySupremeCourt },
    { value: 'high_courts', label: t.caseLawSearch.courtCategoryHighCourts },
    { value: 'tribunals', label: t.caseLawSearch.courtCategoryTribunals },
  ];

  const runSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchCaseLaw(query.trim(), token, courtCategory);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.caseLawSearch.searchFailed);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cls-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="cls-hero">
        <p className="cls-eyebrow">{t.caseLawSearch.eyebrow}</p>
        <h1 className="cls-title">{t.caseLawSearch.title}</h1>
        <p className="cls-sub">{t.caseLawSearch.sub}</p>
      </header>

      {!user && (
        <div className="cls-empty">
          <p>{t.caseLawSearch.logInPrompt}</p>
          <button className="para-btn" onClick={onOpenLogin}>
            {t.common.logIn}
          </button>
        </div>
      )}

      {user && (
        <>
          <form className="cls-search-form" onSubmit={runSearch}>
            <input
              type="text"
              className="cls-search-input"
              placeholder={t.caseLawSearch.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="cls-search-btn" disabled={loading || !query.trim()}>
              {loading ? t.caseLawSearch.searching : t.caseLawSearch.search}
            </button>
          </form>

          <div className="cls-court-filter" role="group" aria-label={t.caseLawSearch.courtCategoryLabel}>
            {courtCategories.map((c) => (
              <button
                type="button"
                key={c.label}
                className={courtCategory === c.value ? 'cls-court-pill active' : 'cls-court-pill'}
                onClick={() => setCourtCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {error && <div className="auth-error">{error}</div>}

          {!error && results !== null && results.length === 0 && (
            <p className="step-help">{t.caseLawSearch.noResults}</p>
          )}

          {results && results.length > 0 && (
            <div className="cls-results">
              {results.map((r) => (
                <div className="cls-result-card" key={r.docId}>
                  <p className="cls-result-title">{r.title}</p>
                  <p className="cls-result-meta">{[r.court, r.date, r.citation].filter(Boolean).join(' · ')}</p>
                  {r.snippet && <p className="cls-result-snippet">{stripHtml(r.snippet)}</p>}
                  <a className="cls-result-link" href={r.indianKanoonUrl} target="_blank" rel="noreferrer">
                    {t.caseLawSearch.viewFullJudgment}
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
