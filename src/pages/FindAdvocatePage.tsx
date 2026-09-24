import { useEffect, useState } from 'react';
import { forums } from '../data/mockData';
import { districtCourtStates } from '../data/districtCourtLocations';
import { LANGUAGES, useLanguage } from '../lib/language';
import { listAdvocates, type AdvocateListing } from '../lib/advocateDirectoryClient';
import { ApiError } from '../lib/apiError';
import { SearchableSelect } from '../components/SearchableSelect';
import { fmt } from '../lib/format';
import '../styles/split-page.css';
import './FindAdvocatePage.css';

interface Props {
  onBack: () => void;
  onOpenAdvocate: (id: string) => void;
  initialForumType?: string;
  initialState?: string;
}

const FORUM_LABEL: Record<string, string> = Object.fromEntries(forums.map((f) => [f.forumType, f.name]));

export function FindAdvocatePage({ onBack, onOpenAdvocate, initialForumType, initialState }: Props) {
  const { t } = useLanguage();
  const fa = t.advocateDirectory.find;
  const [forumType, setForumType] = useState(initialForumType ?? '');
  const [state, setState] = useState(initialState ?? '');
  const [language, setLanguage] = useState('');
  const [results, setResults] = useState<AdvocateListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listAdvocates({ forumType: forumType || undefined, state: state || undefined, language: language || undefined })
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setError(err instanceof ApiError ? err.message : fa.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [forumType, state, language]);

  return (
    <div className="fa-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <div className="split-card">
        <header className="fa-hero split-left">
          <p className="fa-eyebrow">{fa.eyebrow}</p>
          <h1 className="fa-title">{fa.title}</h1>
          <p className="fa-sub">{fa.sub}</p>

          <div className="fa-filters">
            <SearchableSelect
              label={fa.forumLabel}
              placeholder={fa.anyForum}
              noMatches={fa.noMatch}
              selectedKey={forumType || undefined}
              options={[{ key: '', label: fa.anyForum }, ...forums.map((f) => ({ key: f.forumType, label: f.name }))]}
              onSelect={setForumType}
            />
            <SearchableSelect
              label={fa.stateLabel}
              placeholder={fa.anyState}
              noMatches={fa.noMatch}
              selectedKey={state || undefined}
              options={[{ key: '', label: fa.anyState }, ...districtCourtStates.map((s) => ({ key: s.id, label: s.label }))]}
              onSelect={setState}
            />
            <SearchableSelect
              label={fa.languageLabel}
              placeholder={fa.anyLanguage}
              noMatches={fa.noMatch}
              selectedKey={language || undefined}
              options={[{ key: '', label: fa.anyLanguage }, ...LANGUAGES.map((l) => ({ key: l.id, label: l.label }))]}
              onSelect={setLanguage}
            />
          </div>
        </header>

        <div className="fa-results split-right">
          {error && <div className="fa-error">{error}</div>}
          {results === null && !error && <p className="step-help">{t.common.loading}</p>}
          {results !== null && results.length === 0 && !error && (
            <p className="step-help">{fa.noResults}</p>
          )}
          {results?.map((a) => (
            <button key={a.id} type="button" className="fa-card" onClick={() => onOpenAdvocate(a.id)}>
              <div className="fa-card-head">
                <span className="fa-card-name">{a.fullName}</span>
                {a.practicingSinceYear && (
                  <span className="fa-card-years">
                    {fmt(fa.yearsSuffix, { n: new Date().getFullYear() - a.practicingSinceYear })}
                  </span>
                )}
              </div>
              <p className="fa-card-meta">
                {[a.city, districtCourtStates.find((s) => s.id === a.practiceState)?.label ?? a.practiceState]
                  .filter(Boolean)
                  .join(', ')}
                {a.barState ? ` · ${fmt(fa.barCouncilOf, { state: a.barState })}` : ''}
              </p>
              {a.practiceForums.length > 0 && (
                <div className="fa-card-chips">
                  {a.practiceForums.map((f) => (
                    <span className="fa-chip" key={f}>
                      {FORUM_LABEL[f] ?? f}
                    </span>
                  ))}
                </div>
              )}
              {a.bio && <p className="fa-card-bio">{a.bio}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
