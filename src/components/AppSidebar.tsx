import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark } from './BrandMark';
import type { ActCategory } from '../pages/LawLibrary';
import './AppSidebar.css';

interface Props {
  /** Only true while the landing page itself is showing — gates the two same-page scroll anchors
   * ("How it works" / "News"), which only make sense while LandingPage's own sections are mounted. */
  isLandingPage: boolean;
  /** Mobile drawer open/close is owned by App.tsx now, since TopMasthead's hamburger button and
   * this drawer are siblings that both need it — see App.tsx. */
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onGoHome: () => void;
  onOpenLawLibrary: () => void;
  onOpenLawLibraryCategory: (category: ActCategory) => void;
  onOpenCaseLawSearch: () => void;
  onOpenCourtFeeCalculator: () => void;
  onOpenTranslateDocument: () => void;
  onOpenCauseList: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onOpenMyCases: () => void;
  onOpenPricing: () => void;
  onOpenBilling: () => void;
  onStartFiling: () => void;
}

/**
 * Persistent left-hand navigation, present on every screen (unlike the old landing-page-only
 * nav bar). Collapses to a slide-in drawer behind TopMasthead's hamburger toggle below the mobile
 * breakpoint — see AppSidebar.css for the two layout modes. Carries its own brand mark at the top
 * (same asset as TopMasthead's, just larger and with its wordmark on), since this drawer has no
 * other "LawFilings" labelling of its own.
 */
export function AppSidebar({
  isLandingPage,
  isMobileMenuOpen,
  onCloseMobileMenu,
  onGoHome,
  onOpenLawLibrary,
  onOpenLawLibraryCategory,
  onOpenCaseLawSearch,
  onOpenCourtFeeCalculator,
  onOpenTranslateDocument,
  onOpenCauseList,
  onOpenAbout,
  onOpenContact,
  onOpenSettings,
  onOpenLogin,
  onOpenMyCases,
  onOpenPricing,
  onOpenBilling,
  onStartFiling,
}: Props) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isLawLibraryExpanded, setIsLawLibraryExpanded] = useState(false);

  const close = onCloseMobileMenu;
  const go = (fn: () => void) => () => {
    fn();
    close();
  };
  const goToCategory = (category: ActCategory) => () => {
    onOpenLawLibraryCategory(category);
    close();
  };

  const lawLibraryCategories: [ActCategory, string][] = [
    ['constitution', t.lawLibrary.categoryConstitution],
    ['central', t.lawLibrary.categoryCentralActs],
    ['state', t.lawLibrary.categoryStateActs],
    ['rules', t.lawLibrary.categoryRules],
  ];

  return (
    <>
      {isMobileMenuOpen && <div className="app-sidebar-backdrop" onClick={close} />}

      <aside className={isMobileMenuOpen ? 'app-sidebar open' : 'app-sidebar'}>
        <div className="app-sidebar-header">
          <button className="app-sidebar-brand" onClick={go(onGoHome)} aria-label={t.landing.logo}>
            <BrandMark size={72} wordmark className="app-sidebar-brand-mark" />
          </button>
          <button className="app-mobile-close-btn" onClick={close} aria-label={t.nav.closeMenu}>
            ×
          </button>
        </div>

        <nav className="app-sidebar-links">
          <button className="app-sidebar-link" onClick={go(onGoHome)}>
            {t.nav.home}
          </button>
          <button
            className="app-sidebar-link app-sidebar-expand-btn"
            aria-expanded={isLawLibraryExpanded}
            onClick={() => setIsLawLibraryExpanded((open) => !open)}
          >
            {t.nav.actsAndRules}
            <span className="app-sidebar-expand-caret" aria-hidden="true">
              {isLawLibraryExpanded ? '▾' : '▸'}
            </span>
          </button>
          {isLawLibraryExpanded && (
            <div className="app-sidebar-submenu">
              <button className="app-sidebar-link app-sidebar-sublink" onClick={go(onOpenLawLibrary)}>
                {t.lawLibrary.title}
              </button>
              {lawLibraryCategories.map(([value, label]) => (
                <button key={value} className="app-sidebar-link app-sidebar-sublink" onClick={goToCategory(value)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="app-sidebar-link" onClick={go(onOpenCaseLawSearch)}>
            {t.nav.caseLaw}
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenCourtFeeCalculator)}>
            {t.nav.courtFeeCalculator}
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenTranslateDocument)}>
            {t.nav.translateDocument}
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenCauseList)}>
            Cause List
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenPricing)}>
            {t.nav.pricing}
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenAbout)}>
            {t.nav.about}
          </button>
          <button className="app-sidebar-link" onClick={go(onOpenContact)}>
            {t.nav.contact}
          </button>
          {isLandingPage && (
            <>
              <a className="app-sidebar-link" href="#how-it-works" onClick={close}>
                {t.nav.howItWorks}
              </a>
              <a className="app-sidebar-link" href="#news" onClick={close}>
                {t.nav.news}
              </a>
            </>
          )}
        </nav>

        <div className="app-sidebar-divider" />

        <nav className="app-sidebar-links">
          {user ? (
            <>
              <button className="app-sidebar-link" onClick={go(onOpenMyCases)}>
                {t.nav.myCases}
              </button>
              <button className="app-sidebar-link" onClick={go(onOpenBilling)}>
                {t.nav.billing}
              </button>
              <button className="app-sidebar-link" onClick={go(logout)}>
                {t.nav.logOut}
              </button>
            </>
          ) : (
            <button className="app-sidebar-link" onClick={go(onOpenLogin)}>
              {t.nav.logIn}
            </button>
          )}
        </nav>

        <button className="app-sidebar-cta" onClick={go(onStartFiling)}>
          {t.nav.startAFiling}
        </button>

        <div className="app-sidebar-footer">
          <LanguageSwitcher compact className="app-sidebar-link" />
          <button className="app-sidebar-settings" onClick={go(onOpenSettings)} aria-label={t.nav.pageSettings}>
            ⚙
          </button>
        </div>
      </aside>
    </>
  );
}
