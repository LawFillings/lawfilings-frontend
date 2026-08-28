import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import type { ActCategory } from '../pages/LawLibrary';
import './TopNav.css';

interface Props {
  /** The current screen's `kind` discriminant from App.tsx — used to underline the matching link. */
  activeKind: string;
  onGoHome: () => void;
  onOpenLawLibrary: () => void;
  onOpenLawLibraryCategory: (category: ActCategory) => void;
  onOpenCaseLawSearch: () => void;
  onOpenCourtFeeCalculator: () => void;
  onOpenPricing: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onOpenMyCases: () => void;
  onStartFiling: () => void;
}

/**
 * Persistent horizontal nav bar, sticky below TopMasthead — visible on desktop (see TopNav.css's
 * 860px breakpoint, matching AppSidebar's own). Below that breakpoint AppSidebar's off-canvas
 * drawer (opened via TopMasthead's hamburger, now shown at every width) covers navigation instead,
 * including the account-only items (billing/settings/language/log out) this bar doesn't carry.
 */
export function TopNav({
  activeKind,
  onGoHome,
  onOpenLawLibrary,
  onOpenLawLibraryCategory,
  onOpenCaseLawSearch,
  onOpenCourtFeeCalculator,
  onOpenPricing,
  onOpenAbout,
  onOpenContact,
  onOpenMyCases,
  onStartFiling,
}: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const linkClass = (kind: string) => `top-nav-link${activeKind === kind ? ' active' : ''}`;

  const lawLibraryCategories: [ActCategory, string][] = [
    ['constitution', t.lawLibrary.categoryConstitution],
    ['central', t.lawLibrary.categoryCentralActs],
    ['state', t.lawLibrary.categoryStateActs],
    ['rules', t.lawLibrary.categoryRules],
  ];

  const moreKinds = ['pricing', 'about', 'contact'];
  const moreActive = moreKinds.includes(activeKind);

  return (
    <nav className="top-nav" aria-label={t.nav.home}>
      <div className="top-nav-links">
        <button className={linkClass('landing')} onClick={onGoHome}>
          {t.nav.home}
        </button>

        <div className="top-nav-item-dropdown">
          <button className={linkClass('lawLibrary')} onClick={onOpenLawLibrary}>
            {t.nav.actsAndRules}
            <span className="top-nav-caret" aria-hidden="true">▾</span>
          </button>
          <div className="top-nav-dropdown-menu">
            {lawLibraryCategories.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="top-nav-dropdown-item"
                onClick={() => onOpenLawLibraryCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button className={linkClass('caseLawSearch')} onClick={onOpenCaseLawSearch}>
          {t.nav.caseLaw}
        </button>
        <button className={linkClass('courtFeeCalculator')} onClick={onOpenCourtFeeCalculator}>
          {t.nav.courtFeeCalculator}
        </button>
        {user && (
          <button className={linkClass('myCases')} onClick={onOpenMyCases}>
            {t.nav.myCases}
          </button>
        )}

        <div className="top-nav-item-dropdown">
          <button type="button" className={`top-nav-link${moreActive ? ' active' : ''}`}>
            {t.nav.more}
            <span className="top-nav-caret" aria-hidden="true">▾</span>
          </button>
          <div className="top-nav-dropdown-menu top-nav-dropdown-menu-right">
            <button type="button" className="top-nav-dropdown-item" onClick={onOpenPricing}>
              {t.nav.pricing}
            </button>
            <button type="button" className="top-nav-dropdown-item" onClick={onOpenAbout}>
              {t.nav.about}
            </button>
            <button type="button" className="top-nav-dropdown-item" onClick={onOpenContact}>
              {t.nav.contact}
            </button>
          </div>
        </div>
      </div>

      <button className="top-nav-cta" onClick={onStartFiling}>
        {t.nav.startAFiling}
      </button>
    </nav>
  );
}
