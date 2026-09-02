import { useMemo, useState } from 'react';
import { findRelevantActSections } from '../lib/actReferenceMatcher';
import { useSettings } from '../lib/settings';
import './ActReferencePanel.css';

interface ActReferencePanelProps {
  causeType?: string | null;
  stateLabel?: string;
  onOpenLawLibrary?: () => void;
}

/**
 * Shows the specific Act provision(s) relevant to the wizard's current selections — e.g. the
 * dismissal-of-suit clause in the applicable state's Money-Lenders Act when the user picks
 * "unpaid loan" as the cause of action. Purely local/synchronous (no backend call), since the
 * source data already lives in lawLibraryData.ts. Renders nothing if there's no curated match,
 * or if the user has dismissed it for this session.
 */
export function ActReferencePanel({ causeType, stateLabel, onOpenLawLibrary }: ActReferencePanelProps) {
  const { settings } = useSettings();
  const enabled = settings.wizard.widgets.actReferences;
  const [dismissed, setDismissed] = useState(false);

  const matches = useMemo(() => findRelevantActSections({ causeType, stateLabel }), [causeType, stateLabel]);

  if (!enabled || dismissed || matches.length === 0) return null;

  return (
    <div className="arp-card">
      <div className="arp-header">
        <p className="arp-title">Relevant Act provisions</p>
        <button className="arp-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          ×
        </button>
      </div>
      <ul className="arp-list">
        {matches.map(({ act, section }) => (
          <li className="arp-item" key={`${act.id}-${section.sectionNo}`}>
            <span className="arp-act-title">{act.shortTitle}</span>
            <span className="arp-section-heading">
              Section {section.sectionNo} — {section.heading}
            </span>
            <span className="arp-section-text">{section.text}</span>
          </li>
        ))}
      </ul>
      {onOpenLawLibrary && (
        <button className="arp-library-link" onClick={onOpenLawLibrary}>
          Read the full Act in Constitution & Key Statutes →
        </button>
      )}
    </div>
  );
}
