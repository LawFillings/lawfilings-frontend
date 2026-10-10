import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { isAdmin as fetchIsAdmin } from '../lib/adminClient';
import { useLanguage } from '../lib/language';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark } from './BrandMark';
import './TopMasthead.css';


interface Props {
  onGoHome: () => void;
  onOpenCaseLawSearch: () => void;
  onOpenLogin: () => void;
  onOpenBilling: () => void;
  onOpenSettings: () => void;
  onOpenAdminGaps: () => void;
  onOpenAdminAdvocates: () => void;
  onOpenMyAdvocateListing: () => void;
  onOpenAdvocateInquiries: () => void;
  onToggleMobileMenu: () => void;
}

/**
 * The site's single full-width masthead — brand on the left, search/account on the right — sticky
 * above everything else, including the sidebar (see AppSidebar.css's --masthead-height offset).
 * The hamburger button here drives AppSidebar's mobile drawer; that open/close state lives in
 * App.tsx since this component and the drawer are siblings, not parent/child.
 */
export function TopMasthead({
  onGoHome,
  onOpenCaseLawSearch,
  onOpenLogin,
  onOpenBilling,
  onOpenSettings,
  onOpenAdminGaps,
  onOpenAdminAdvocates,
  onOpenMyAdvocateListing,
  onOpenAdvocateInquiries,
  onToggleMobileMenu,
}: Props) {
  const { user, token, logout } = useAuth();
  const { t } = useLanguage();

  // Whether to show the admin entries is the server's call (GET /api/admin/whoami, gated by the
  // same ADMIN_EMAIL check as every admin route) — real access control is always enforced there.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);
    if (user && token) {
      fetchIsAdmin(token).then((ok) => {
        if (!cancelled) setIsAdmin(ok);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id, token]);

  // The account menu opens on hover/focus with a mouse (CSS), but a phone has no hover — so tapping
  // the button toggles it too, and a tap elsewhere (or Escape) closes it again.
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: Event) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);
  const pick = (fn: () => void) => () => {
    setAccountOpen(false);
    fn();
  };

  return (
    <header className="top-masthead">
      <div className="top-masthead-starfield starfield-dust" aria-hidden="true" />
      <div className="starfield-sparkles top-masthead-sparkles" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span className="starfield-sparkle top-masthead-sparkle" key={i} />
        ))}
      </div>
      <div className="top-masthead-left">
        <button className="top-masthead-menu-btn" onClick={onToggleMobileMenu} aria-label={t.nav.openMenu}>
          ☰
        </button>
        <button className="top-masthead-logo" onClick={onGoHome}>
          <BrandMark size={44} wordmark className="top-masthead-brand-mark" />
          {t.landing.logo}
        </button>
      </div>
      <div className="top-masthead-center" aria-hidden="true">
        {/* Three separate items, side by side — scales, a court hammer facing the briefcase, lawyers on the right. */}
        <svg viewBox="0 0 32 32" width="28" height="28" className="top-masthead-icon">
          {/* Fixed base and stand — does not animate. */}
          <line x1="11" y1="29" x2="21" y2="29" stroke="var(--accent-gold-soft)" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="29" x2="16" y2="10" stroke="var(--accent-gold-soft)" strokeWidth="2" strokeLinecap="round" />

          {/* Swinging beam + empty pans — rotates around the pivot at (16, 10). Pans hang from
              two strings each, landing on the pan's corners, matching the LawFilings mark. */}
          <g className="top-masthead-scale-beam">
            <line x1="4" y1="10" x2="28" y2="10" stroke="var(--accent-gold-soft)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="4" y1="10" x2="0" y2="20" stroke="var(--accent-gold)" strokeWidth="0.8" />
            <line x1="4" y1="10" x2="8" y2="20" stroke="var(--accent-gold)" strokeWidth="0.8" />
            <line x1="28" y1="10" x2="24" y2="20" stroke="var(--accent-gold)" strokeWidth="0.8" />
            <line x1="28" y1="10" x2="32" y2="20" stroke="var(--accent-gold)" strokeWidth="0.8" />
            <path d="M0 20 a4 4 0 0 0 8 0" fill="none" stroke="var(--accent-gold)" strokeWidth="1.2" />
            <path d="M24 20 a4 4 0 0 0 8 0" fill="none" stroke="var(--accent-gold)" strokeWidth="1.2" />
          </g>

          <circle cx="16" cy="10" r="1.6" fill="var(--accent-gold-soft)" />
        </svg>

        <svg viewBox="0 0 32 32" width="26" height="26" className="top-masthead-icon">
          {/* Fixed sounding block — does not animate. */}
          <rect x="9" y="25" width="14" height="3.5" rx="1" fill="var(--accent-gold-soft)" />
          {/* Gavel head + handle — strikes down onto the block. */}
          <g className="top-masthead-gavel-strike">
            <rect x="12" y="12.5" width="10" height="5" rx="1.3" transform="rotate(-40 17 15)" fill="var(--accent-gold-soft)" />
            <line x1="19.3" y1="17.3" x2="25" y2="23" stroke="var(--accent-gold-soft)" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>

        <svg viewBox="0 0 32 32" width="26" height="26" className="top-masthead-icon top-masthead-icon-bob">
          {/* Lawyers, represented as a briefcase. */}
          <path
            d="M13 11.5 v-1.7 a1.2 1.2 0 0 1 1.2-1.2 h3.6 a1.2 1.2 0 0 1 1.2 1.2 v1.7"
            fill="none"
            stroke="var(--accent-gold-soft)"
            strokeWidth="1.4"
          />
          <rect x="6" y="11.5" width="20" height="14" rx="2" fill="none" stroke="var(--accent-gold-soft)" strokeWidth="1.6" />
          <line x1="6" y1="17.5" x2="26" y2="17.5" stroke="var(--accent-gold-soft)" strokeWidth="1.2" />
          <rect x="14.5" y="16" width="3" height="3" rx="0.6" fill="var(--accent-gold-soft)" />
        </svg>
      </div>
      <div className="top-masthead-right">
        <button className="top-masthead-btn" onClick={onOpenCaseLawSearch}>
          {t.nav.search}
        </button>
        <div ref={accountRef} className={user ? 'top-masthead-account' : 'top-masthead-account is-guest'}>
          {user ? (
            <button
              type="button"
              className="top-masthead-btn top-masthead-btn-primary"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
            >
              {t.nav.accountMenu}
              <span className="top-masthead-account-caret" aria-hidden="true">▾</span>
            </button>
          ) : (
            <button className="top-masthead-btn top-masthead-btn-primary" onClick={onOpenLogin}>
              {t.nav.logIn}
              <span className="top-masthead-account-caret" aria-hidden="true">▾</span>
            </button>
          )}
          <div className={accountOpen ? 'top-masthead-account-menu open' : 'top-masthead-account-menu'} aria-label={t.nav.accountMenu}>
            <LanguageSwitcher compact className="top-masthead-account-menu-item" />
            <button className="top-masthead-account-menu-item" onClick={pick(onOpenSettings)}>
              {t.nav.pageSettings}
            </button>
            {isAdmin && (
              <>
                <button className="top-masthead-account-menu-item" onClick={pick(onOpenAdminGaps)}>
                  Library gaps
                </button>
                <button className="top-masthead-account-menu-item" onClick={pick(onOpenAdminAdvocates)}>
                  Advocate verification
                </button>
              </>
            )}
            {user?.role === 'advocate' && (
              <button className="top-masthead-account-menu-item" onClick={pick(onOpenMyAdvocateListing)}>
                {t.advocateDirectory.myListing.title}
              </button>
            )}
            {user?.role === 'advocate' && (
              <button className="top-masthead-account-menu-item" onClick={pick(onOpenAdvocateInquiries)}>
                {t.advocateDirectory.inquiries.title}
              </button>
            )}
            {user && (
              <button className="top-masthead-account-menu-item" onClick={pick(onOpenBilling)}>
                {t.nav.billing}
              </button>
            )}
            {user && (
              <button className="top-masthead-account-menu-item" onClick={pick(logout)}>
                {t.nav.logOut}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
