import { useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { causeListCourts, type CauseListCourt } from '../data/causeListCourts';
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

/** Free directory of every court's own cause-list page — no automatic fetching/search, no
 *  Anthropic call, so there's nothing here that needs a Pro subscription. The interactive
 *  fetch/upload/search flow lives in CauseListProPage instead. */
export function CauseListBasicPage({ onBack, onOpenLogin, onOpenPricing }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const c = t.causeListPage;
  const catLabel = (cat: CauseListCourt['category']) => c.categories[CATEGORY_KEYS[cat]];

  // Supreme Court is a single court, listed directly rather than behind a dropdown — every other
  // category (High Court, NCLT, NCLAT, District Court, DRT) collapses into its own <details>
  // menu instead of dumping 100+ links in one long flat list.
  const supremeCourt = useMemo(() => causeListCourts.filter((c) => c.category === 'Supreme Court'), []);

  const groupedOthers = useMemo(() => {
    const byCategory = new Map<CauseListCourt['category'], CauseListCourt[]>();
    for (const c of causeListCourts) {
      if (c.category === 'Supreme Court') continue;
      if (!byCategory.has(c.category)) byCategory.set(c.category, []);
      byCategory.get(c.category)!.push(c);
    }
    return byCategory;
  }, []);

  return (
    <div className="cl-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <div className="split-card">
      <header className="cl-hero split-left">
        <p className="cl-eyebrow">{c.basic.eyebrow}</p>
        <h1 className="cl-title">{c.basic.title}</h1>
        <p className="cl-sub">{c.basic.sub}</p>
      </header>

      <div className="split-right">

      {!user && (
        <div className="cl-login-gate">
          <p>{c.basic.loginPrompt}</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            {t.nav.logIn}
          </button>
        </div>
      )}

      {user && (
        <div className="cl-directory">
          <PaywallBlock
            onChoosePlan={onOpenPricing}
            label={c.basic.paywallLabel}
            body={c.basic.paywallBody}
          />
          <div className="cl-directory-group">
            <h2 className="cl-directory-heading">{c.categories.supremeCourt}</h2>
            <ul className="cl-directory-list">
              {supremeCourt.map((c) => (
                <li key={c.id} className="cl-directory-item">
                  <a href={c.portalUrl} target="_blank" rel="noopener noreferrer" className="cl-portal-link">
                    {c.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {Array.from(groupedOthers.entries()).map(([category, courts]) => (
            <details key={category} className="cl-directory-dropdown">
              <summary className="cl-directory-dropdown-summary">
                {catLabel(category)} <span className="cl-directory-dropdown-count">({courts.length})</span>
              </summary>
              <ul className="cl-directory-list">
                {courts.map((c) => (
                  <li key={c.id} className="cl-directory-item">
                    <a href={c.portalUrl} target="_blank" rel="noopener noreferrer" className="cl-portal-link">
                      {c.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
