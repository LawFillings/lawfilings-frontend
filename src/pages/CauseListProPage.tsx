import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import { fetchCauseList, type CauseListEntry } from '../lib/causeListClient';
import { causeListCourts, type CauseListCourt } from '../data/causeListCourts';
import { ApiError } from '../lib/apiError';
import { PaywallBlock } from '../components/PaywallBlock';
import '../styles/split-page.css';
import './CauseListPage.css';

const CATEGORY_KEYS = {
  'Supreme Court': 'supremeCourt',
  'High Court': 'highCourt',
  'District Court': 'districtCourt',
  DRT: 'drt',
  DRAT: 'drat',
  NCLT: 'nclt',
  NCLAT: 'nclat',
} as const;

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

/** Automatic fetch/upload + Claude extraction + name-search, for every court in the catalog —
 *  Pro-only, enforced server-side (requireProTier/checkProBudget in the backend's causeList.ts).
 *  A non-Pro account reaching this page still sees the full form; submitting is what surfaces the
 *  402 paywall below, same pattern as judge-style analysis elsewhere on the platform. The free,
 *  no-extraction alternative is CauseListBasicPage (a plain directory of each court's own page). */
export function CauseListProPage({ onBack, onOpenLogin, onOpenPricing }: Props) {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const c = t.causeListPage;
  const p = c.pro;
  const catLabel = (cat: CauseListCourt['category']) => c.categories[CATEGORY_KEYS[cat]];

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
  const [paywall, setPaywall] = useState<'pro_required' | 'usage_cap_reached' | null>(null);
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
    setPaywall(null);
    setEntries(null);
    try {
      const result = await fetchCauseList({ courtId: court.id, date, ...source }, token);
      setEntries(result);
      setStatus('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(err.body?.reason === 'usage_cap_reached' ? 'usage_cap_reached' : 'pro_required');
        setStatus('error');
      } else if (err instanceof ApiError) {
        setError(err.message);
        setStatus('error');
      } else {
        setError(err instanceof Error ? err.message : p.genericError);
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
        {t.common.back}
      </button>

      <div className="split-card">
      <header className="cl-hero split-left">
        <p className="cl-eyebrow">{p.eyebrow}</p>
        <h1 className="cl-title">{p.title}</h1>
        <p className="cl-sub">{p.sub}</p>
      </header>

      <div className="split-right">

      {!user && (
        <div className="cl-login-gate">
          <p>{p.loginPrompt}</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            {t.nav.logIn}
          </button>
        </div>
      )}

      {user && (
        <div className="cl-form">
          <label className="field-label" htmlFor="cl-court">
            {p.courtLabel}
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
              <optgroup key={category} label={catLabel(category)}>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <label className="field-label" htmlFor="cl-date" style={{ marginTop: 'var(--space-4)' }}>
            {p.dateLabel}
          </label>
          <input id="cl-date" type="date" className="cl-select" value={date} onChange={(e) => setDate(e.target.value)} />

          <label className="field-label" htmlFor="cl-keyword" style={{ marginTop: 'var(--space-4)' }}>
            {p.nameLabel}
          </label>
          <input
            id="cl-keyword"
            type="text"
            className="cl-select"
            placeholder={p.namePlaceholder}
            value={keyword}
            onChange={(e) => updateKeyword(e.target.value)}
          />
          <p className="step-help" style={{ margin: 'var(--space-2) 0 0' }}>
            {p.nameHelp}
          </p>

          {court?.tier === 'auto' && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <button
                type="button"
                className="auth-submit"
                onClick={() => runExtraction({ source: 'fetch' })}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? p.fetching : fmt(p.fetchButton, { court: court.name })}
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
                {status === 'loading' ? p.fetching : fmt(p.fetchButton, { court: court.name })}
              </button>
            </div>
          )}

          {court?.tier === 'manual' && (
            <div style={{ marginTop: 'var(--space-5)' }}>
              <a href={court.portalUrl} target="_blank" rel="noopener noreferrer" className="cl-portal-link">
                {fmt(p.openPortal, { court: court.name })}
              </a>
              <p className="step-help" style={{ margin: 'var(--space-2) 0 var(--space-3)' }}>
                {fmt(p.manualHelp, { date })}
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
                {status === 'loading' ? p.reading : p.uploadButton}
              </button>
            </div>
          )}

          {error && <p className="cl-error">{error}</p>}
          {paywall && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <PaywallBlock
                onChoosePlan={onOpenPricing}
                label={paywall === 'usage_cap_reached' ? p.paywallUsageLabel : p.paywallProLabel}
                body={paywall === 'usage_cap_reached' ? p.paywallUsageBody : p.paywallProBody}
              />
            </div>
          )}

          {entries && (
            <div className="cl-result">
              <h2 className="cl-result-heading">
                {entries.length === 0
                  ? p.noMatters
                  : fmt(entries.length === 1 ? p.mattersFoundOne : p.mattersFound, { n: entries.length }) +
                    (keyword.trim() ? fmt(p.matchingSuffix, { m: matchedEntries.length, kw: keyword.trim() }) : '')}
              </h2>

              {entries.length > 0 && (
                <table className="cl-table">
                  <thead>
                    <tr>
                      <th>{p.colItemNo}</th>
                      <th>{p.colCaseNo}</th>
                      <th>{p.colParties}</th>
                      <th>{p.colAdvocates}</th>
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
      </div>
    </div>
  );
}
