import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchCauseList, type CauseListEntry } from '../lib/causeListClient';
import { causeListCourts, type CauseListCourt } from '../data/causeListCourts';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import './CauseListPage.css';

interface Props {
  onBack: () => void;
  onOpenLogin: () => void;
  onOpenPricing: () => void;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

const KEYWORD_STORAGE_KEY = 'causeListKeyword';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CauseListPage({ onBack, onOpenLogin, onOpenPricing }: Props) {
  const { user, token } = useAuth();

  const [courtId, setCourtId] = useState(causeListCourts[0]?.id ?? '');
  const [date, setDate] = useState(todayIso());
  const [keyword, setKeyword] = useState(() => {
    try {
      return localStorage.getItem(KEYWORD_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [scope, setScope] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [entries, setEntries] = useState<CauseListEntry[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const court = useMemo(() => causeListCourts.find((c) => c.id === courtId) ?? null, [courtId]);

  const grouped = useMemo(() => {
    const byCategory = new Map<CauseListCourt['category'], CauseListCourt[]>();
    for (const c of causeListCourts) {
      if (!byCategory.has(c.category)) byCategory.set(c.category, []);
      byCategory.get(c.category)!.push(c);
    }
    return byCategory;
  }, []);

  const updateKeyword = (value: string) => {
    setKeyword(value);
    try {
      localStorage.setItem(KEYWORD_STORAGE_KEY, value);
    } catch {
      // Private-browsing/storage-full failures just mean the keyword isn't remembered next visit
      // — no worse than not having tried.
    }
  };

  const runExtraction = async (source: { source: 'fetch'; scope?: string } | { source: 'upload'; file: File }) => {
    if (!token || !court) return;
    setStatus('loading');
    setError(null);
    setPaywall(false);
    setEntries(null);
    try {
      const result = await fetchCauseList({ courtId: court.id, date, ...source }, token);
      setEntries(result);
      setStatus('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(true);
        setStatus('error');
      } else if (err instanceof ApiError) {
        setError(err.message);
        setStatus('error');
      } else {
        setError(err instanceof Error ? err.message : "Couldn't process that — please try again.");
        setStatus('error');
      }
    }
  };

  const handleFileSelected = (file: File) => {
    runExtraction({ source: 'upload', file });
  };

  const matchedEntries = useMemo(() => {
    if (!entries) return [];
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((e) => e.advocates.toLowerCase().includes(q));
  }, [entries, keyword]);

  const otherEntries = useMemo(() => {
    if (!entries) return [];
    const q = keyword.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => !e.advocates.toLowerCase().includes(q));
  }, [entries, keyword]);

  return (
    <div className="cl-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        Back
      </button>

      <header className="cl-hero">
        <p className="cl-eyebrow">Daily cause list</p>
        <h1 className="cl-title">Find your matters on today's cause list</h1>
        <p className="cl-sub">
          Pick a court and date. For most courts you'll download the list yourself (the source sites gate this
          behind a captcha) and upload it here — we'll read it and pull out every matter, with yours highlighted.
        </p>
      </header>

      {!user && (
        <div className="cl-login-gate">
          <p>Log in to use the cause-list lookup.</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            Log in
          </button>
        </div>
      )}

      {user && (
        <div className="cl-form">
          <label className="field-label" htmlFor="cl-court">
            Court / Bench
          </label>
          <select
            id="cl-court"
            className="cl-select"
            value={courtId}
            onChange={(e) => {
              setCourtId(e.target.value);
              setScope('');
              setEntries(null);
              setStatus('idle');
              setError(null);
            }}
          >
            {Array.from(grouped.entries()).map(([category, courts]) => (
              <optgroup key={category} label={category}>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <label className="field-label" htmlFor="cl-date" style={{ marginTop: 'var(--space-4)' }}>
            Date
          </label>
          <input id="cl-date" type="date" className="cl-select" value={date} onChange={(e) => setDate(e.target.value)} />

          <label className="field-label" htmlFor="cl-keyword" style={{ marginTop: 'var(--space-4)' }}>
            Your name (as it appears on cause lists)
          </label>
          <input
            id="cl-keyword"
            type="text"
            className="cl-select"
            placeholder="e.g. A. Sharma"
            value={keyword}
            onChange={(e) => updateKeyword(e.target.value)}
          />
          <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
            Matters are matched by this name appearing in the cause list's own advocate column — check spelling
            variants if you don't see an expected matter.
          </p>

          {court?.tier === 'auto' && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <button
                type="button"
                className="auth-submit"
                onClick={() => runExtraction({ source: 'fetch' })}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Fetching…' : `Fetch ${court.name}'s list for this date`}
              </button>
            </div>
          )}

          {court?.tier === 'auto-scoped' && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <label className="field-label" htmlFor="cl-scope">
                {court.scopeLabel}
              </label>
              <input
                id="cl-scope"
                type="text"
                className="cl-select"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
              <button
                type="button"
                className="auth-submit"
                style={{ marginTop: 'var(--space-3)' }}
                onClick={() => runExtraction({ source: 'fetch', scope: scope.trim() })}
                disabled={status === 'loading' || !scope.trim()}
              >
                {status === 'loading' ? 'Fetching…' : `Fetch ${court.name}'s list for this date`}
              </button>
            </div>
          )}

          {court?.tier === 'manual' && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <a href={court.portalUrl} target="_blank" rel="noopener noreferrer" className="cl-portal-link">
                Open {court.name}'s cause list page ↗
              </a>
              <p className="step-help" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                Download the list for {date} from there (you may need to solve a captcha), then upload it below.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="file-input-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleFileSelected(file);
                }}
              />
              <button
                type="button"
                className="para-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Reading…' : 'Upload cause list (PDF, JPG, or PNG)'}
              </button>
            </div>
          )}

          {error && <p className="cl-error">{error}</p>}
          {paywall && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <PaywallBlock onChoosePlan={onOpenPricing} />
            </div>
          )}

          {entries && (
            <div className="cl-result">
              <h2 className="cl-result-heading">
                {entries.length === 0
                  ? 'No matters could be read from that document.'
                  : `${entries.length} matter${entries.length === 1 ? '' : 's'} found${
                      keyword.trim() ? `, ${matchedEntries.length} matching "${keyword.trim()}"` : ''
                    }`}
              </h2>

              {entries.length > 0 && (
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>Item No.</th>
                      <th>Case No.</th>
                      <th>Parties</th>
                      <th>Advocate(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedEntries.map((e, i) => (
                      <tr key={`m-${i}`} className="cl-row-match">
                        <td>{e.itemNo}</td>
                        <td>{e.caseNo}</td>
                        <td>{e.parties}</td>
                        <td>{e.advocates}</td>
                      </tr>
                    ))}
                    {otherEntries.map((e, i) => (
                      <tr key={`o-${i}`}>
                        <td>{e.itemNo}</td>
                        <td>{e.caseNo}</td>
                        <td>{e.parties}</td>
                        <td>{e.advocates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
