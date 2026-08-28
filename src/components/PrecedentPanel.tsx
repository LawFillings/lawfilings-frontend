import { useEffect, useState } from 'react';
import { fetchPrecedents, type PrecedentRecord } from '../lib/precedentsClient';
import { useSettings } from '../lib/settings';
import './PrecedentPanel.css';

interface PrecedentPanelProps {
  caseTypeId: string;
  onOpenCaseLawSearch?: () => void;
}

/**
 * Shows curated case-law precedents relevant to the current case type, fetched once on mount.
 * Never blocks drafting — if the backend is unavailable or nothing is curated yet, this renders
 * nothing. Modeled on ThirdPartyNudge's fetch/dismiss/degrade-gracefully shape.
 */
export function PrecedentPanel({ caseTypeId, onOpenCaseLawSearch }: PrecedentPanelProps) {
  const { settings } = useSettings();
  const enabled = settings.wizard.widgets.casePrecedents;
  const [precedents, setPrecedents] = useState<PrecedentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchPrecedents(caseTypeId)
      .then(setPrecedents)
      .finally(() => setLoading(false));
  }, [enabled, caseTypeId]);

  if (!enabled || dismissed) return null;
  if (loading) return <p className="pp-checking">Checking for relevant case law…</p>;
  if (precedents.length === 0) return null;

  return (
    <div className="pp-card">
      <div className="pp-header">
        <p className="pp-title">Relevant case law</p>
        <button className="pp-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          ×
        </button>
      </div>
      <ul className="pp-list">
        {precedents.map((p) => (
          <li className="pp-item" key={p.id}>
            <span className="pp-case-title">{p.caseTitle}</span>
            <span className="pp-meta">
              {[p.citation, p.court, p.year].filter(Boolean).join(' · ')}
            </span>
            {p.summary && <span className="pp-summary">{p.summary}</span>}
            {p.sourceUrl && (
              <a className="pp-source" href={p.sourceUrl} target="_blank" rel="noreferrer">
                View source →
              </a>
            )}
          </li>
        ))}
      </ul>
      {onOpenCaseLawSearch && (
        <button className="pp-search-link" onClick={onOpenCaseLawSearch}>
          Search more case law →
        </button>
      )}
    </div>
  );
}
