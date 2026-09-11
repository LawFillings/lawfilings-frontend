import { useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { causeListCourts, type CauseListCourt } from '../data/causeListCourts';
import { PaywallBlock } from '../components/PaywallBlock';
import './CauseListPage.css';

interface Props {
  onBack: () => void;
  onOpenLogin: () => void;
  onOpenPricing: () => void;
}

/** Free directory of every court's own cause-list page — no automatic fetching/search, no
 *  Anthropic call, so there's nothing here that needs a Pro subscription. The interactive
 *  fetch/upload/search flow lives in CauseListProPage instead. */
export function CauseListBasicPage({ onBack, onOpenLogin, onOpenPricing }: Props) {
  const { user } = useAuth();

  const grouped = useMemo(() => {
    const byCategory = new Map<CauseListCourt['category'], CauseListCourt[]>();
    for (const c of causeListCourts) {
      if (!byCategory.has(c.category)) byCategory.set(c.category, []);
      byCategory.get(c.category)!.push(c);
    }
    return byCategory;
  }, []);

  return (
    <div className="cl-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        Back
      </button>

      <header className="cl-hero">
        <p className="cl-eyebrow">Daily cause list — Basic</p>
        <h1 className="cl-title">Browse cause lists by court</h1>
        <p className="cl-sub">
          Links to every court's own official cause-list page, grouped by court. Open the one you need and search
          it yourself. Want it fetched, searched by your name, and tabulated automatically instead? That's Cause
          List (Pro).
        </p>
      </header>

      {!user && (
        <div className="cl-login-gate">
          <p>Log in to use the cause-list directory.</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            Log in
          </button>
        </div>
      )}

      {user && (
        <div className="cl-directory">
          <PaywallBlock
            onChoosePlan={onOpenPricing}
            label="Want this done automatically?"
            body="Upgrade to Pro to have LawFilings fetch a court's list, search it for your name, and tabulate it — instead of browsing and searching it yourself below."
          />
          {Array.from(grouped.entries()).map(([category, courts]) => (
            <div key={category} className="cl-directory-group">
              <h2 className="cl-directory-heading">{category}</h2>
              <ul className="cl-directory-list">
                {courts.map((c) => (
                  <li key={c.id} className="cl-directory-item">
                    <a href={c.portalUrl} target="_blank" rel="noopener noreferrer" className="cl-portal-link">
                      {c.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
