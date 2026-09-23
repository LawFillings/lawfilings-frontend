import { useEffect, useState } from 'react';
import { forums } from '../data/mockData';
import { districtCourtStates } from '../data/districtCourtLocations';
import { LANGUAGES } from '../lib/language';
import { listAdvocates, type AdvocateListing } from '../lib/advocateDirectoryClient';
import { ApiError } from '../lib/apiError';
import { SearchableSelect } from '../components/SearchableSelect';
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
        setError(err instanceof ApiError ? err.message : "Couldn't load the directory — please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [forumType, state, language]);

  return (
    <div className="fa-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        Back
      </button>

      <div className="split-card">
        <header className="fa-hero split-left">
          <p className="fa-eyebrow">Find an advocate</p>
          <h1 className="fa-title">Verified advocates, browsable free</h1>
          <p className="fa-sub">
            Advocates listed here have opted in and verified their Bar Council enrolment with LawFilings. Send an
            inquiry directly to one — your message goes only to them.
          </p>

          <div className="fa-filters">
            <SearchableSelect
              label="Court / forum"
              placeholder="Any forum"
              noMatches="No match"
              selectedKey={forumType || undefined}
              options={[{ key: '', label: 'Any forum' }, ...forums.map((f) => ({ key: f.forumType, label: f.name }))]}
              onSelect={setForumType}
            />
            <SearchableSelect
              label="State"
              placeholder="Any state"
              noMatches="No match"
              selectedKey={state || undefined}
              options={[{ key: '', label: 'Any state' }, ...districtCourtStates.map((s) => ({ key: s.id, label: s.label }))]}
              onSelect={setState}
            />
            <SearchableSelect
              label="Language"
              placeholder="Any language"
              noMatches="No match"
              selectedKey={language || undefined}
              options={[{ key: '', label: 'Any language' }, ...LANGUAGES.map((l) => ({ key: l.id, label: l.label }))]}
              onSelect={setLanguage}
            />
          </div>
        </header>

        <div className="fa-results split-right">
          {error && <div className="fa-error">{error}</div>}
          {results === null && !error && <p className="step-help">Loading…</p>}
          {results !== null && results.length === 0 && !error && (
            <p className="step-help">No advocates match those filters yet — try broadening them.</p>
          )}
          {results?.map((a) => (
            <button key={a.id} type="button" className="fa-card" onClick={() => onOpenAdvocate(a.id)}>
              <div className="fa-card-head">
                <span className="fa-card-name">{a.fullName}</span>
                {a.practicingSinceYear && (
                  <span className="fa-card-years">
                    {new Date().getFullYear() - a.practicingSinceYear}+ yrs
                  </span>
                )}
              </div>
              <p className="fa-card-meta">
                {[a.city, districtCourtStates.find((s) => s.id === a.practiceState)?.label ?? a.practiceState]
                  .filter(Boolean)
                  .join(', ')}
                {a.barState ? ` · Bar Council of ${a.barState}` : ''}
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
