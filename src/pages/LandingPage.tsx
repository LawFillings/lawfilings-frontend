import { newsItems } from '../data/newsItems';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { UspSlider } from '../components/UspSlider';
import { HowItWorks } from '../components/HowItWorks';
import { BrandMark } from '../components/BrandMark';
import { IconGridSection } from '../components/IconGridSection';
import './LandingPage.css';

// One icon per "Why LawFilings" / "Who it's for" item, in the same simple line-icon style
// HowItWorks.tsx uses (24x24, currentColor stroke) — kept local to this file since they're paired
// one-to-one with this page's own copy, not reused elsewhere.
function VerifiedDocIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v5a1 1 0 0 0 1 1h5" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function StackedDocsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8a1 1 0 0 1 1 1v15l-3-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M11 8h4M11 12h4" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function TwoPeopleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M21 20c0-2.5-1.6-4.3-3.8-4.9" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 19h1M12 19h1M16 19h1" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 4 5.8 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.8-4-9s1.5-6.4 4-9Z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 9 10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
      <path d="M22 9v6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M7 21h10" />
      <path d="M5 7h6M13 7h6" />
      <path d="M5 7 2 13a3 3 0 0 0 6 0Z" />
      <path d="M19 7 16 13a3 3 0 0 0 6 0Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.4 7.6 8 9 4.6-1.4 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const WHY_LAWFILINGS_ICONS = [
  <VerifiedDocIcon key="verified" />,
  <StackedDocsIcon key="stacked" />,
  <MapPinIcon key="map" />,
  <TwoPeopleIcon key="people" />,
  <CalculatorIcon key="calc" />,
  <GlobeIcon key="globe" />,
];

const WHO_ITS_FOR_ICONS = [
  <BriefcaseIcon key="briefcase" />,
  <PersonIcon key="person" />,
  <BuildingIcon key="building" />,
  <GraduationCapIcon key="cap" />,
];

// One icon per newsItems entry (src/data/newsItems.ts), in the same order — kept in sync by hand
// since there are only ever a handful of these verified items at a time.
const LAW_NEWS_ICONS = [
  <ClockIcon key="clock" />, // DRAT appeal deadline
  <ScaleIcon key="scale" />, // Consumer Commission jurisdiction
  <ShieldIcon key="shield" />, // DPDP Act timeline
  <VerifiedDocIcon key="verified-news" />, // SARFAESI Act added
];

interface Props {
  onStartFiling: () => void;
  onOpenLawLibrary: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTermsOfService: () => void;
  onOpenGrievanceOfficer: () => void;
}

export function LandingPage({
  onStartFiling,
  onOpenLawLibrary,
  onOpenAbout,
  onOpenContact,
  onOpenPrivacyPolicy,
  onOpenTermsOfService,
  onOpenGrievanceOfficer,
}: Props) {
  const { settings } = useSettings();
  const { color, widgets } = settings.landing;
  const { t } = useLanguage();

  return (
    <div className="landing" data-color-theme={color}>
      <header className="landing-hero starfield-dust">
        <div className="starfield-sparkles landing-hero-sparkles" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span className="starfield-sparkle landing-hero-sparkle" key={i} />
          ))}
        </div>
        <BrandMark size={420} halo wordmark className="landing-hero-watermark" />
        <div className="landing-hero-inner">
          <h1 className="landing-hero-title">
            {t.landing.hero.titleLine1}
            <br />
            {t.landing.hero.titleLine2}
            <br />
            {t.landing.hero.titleLine3}
            <br />
            {t.landing.hero.titleLine4}
          </h1>
          <p className="landing-hero-sub">{t.landing.hero.sub}</p>
          <p className="landing-hero-eyebrow">{t.landing.hero.eyebrow}</p>
          <div className="landing-hero-ctas">
            <button className="landing-cta-primary" onClick={onStartFiling}>
              {t.landing.hero.startFiling}
            </button>
            <button className="landing-cta-secondary-hero" onClick={onOpenLawLibrary}>
              {t.landing.hero.browseActs}
            </button>
          </div>
        </div>
      </header>

      <UspSlider />

      {widgets.howItWorks && <HowItWorks onStartFiling={onStartFiling} />}

      {widgets.whyChooseUs && (
        <IconGridSection
          id="why-choose-us"
          eyebrow={t.landing.whyChooseUs.eyebrow}
          title={t.landing.whyChooseUs.title}
          sub={t.landing.whyChooseUs.sub}
          columns={3}
          background="rgba(243, 227, 197, 0.85)"
          items={t.landing.whyChooseUs.items.map((item, i) => ({
            icon: WHY_LAWFILINGS_ICONS[i],
            title: item.title,
            body: item.body,
          }))}
        />
      )}

      {widgets.whoItsFor && (
        <IconGridSection
          id="who-its-for"
          eyebrow={t.landing.whoItsFor.eyebrow}
          title={t.landing.whoItsFor.title}
          sub={t.landing.whoItsFor.sub}
          columns={4}
          items={t.landing.whoItsFor.items.map((item, i) => ({
            icon: WHO_ITS_FOR_ICONS[i],
            title: item.title,
            body: item.body,
          }))}
        />
      )}

      {widgets.lawLibraryTeaser && (
        <section className="landing-section" id="law-library">
          <p className="landing-section-eyebrow landing-section-eyebrow-centered">{t.landing.actsSection.eyebrow}</p>
          <h2 className="landing-section-title landing-section-title-centered">{t.landing.actsSection.title}</h2>
          <p className="landing-section-sub landing-section-sub-centered">{t.landing.actsSection.sub}</p>
          <div className="landing-section-cta-centered">
            <button className="landing-cta-secondary" onClick={onOpenLawLibrary}>
              {t.landing.actsSection.browseAll}
            </button>
          </div>
        </section>
      )}

      {widgets.news && (
        <IconGridSection
          id="news"
          eyebrow={t.landing.news.eyebrow}
          title={t.landing.news.title}
          sub={t.landing.news.sub}
          columns={2}
          background="rgba(243, 227, 197, 0.85)"
          items={newsItems.map((item, i) => ({
            icon: LAW_NEWS_ICONS[i],
            title: item.title,
            body: item.summary,
            meta: item.date,
          }))}
        />
      )}

      <footer className="landing-footer">
        <div className="landing-footer-col">
          <p className="landing-footer-heading">{t.landing.footer.brand}</p>
          <p className="landing-footer-note">{t.landing.footer.note}</p>
        </div>
        <div className="landing-footer-col">
          <p className="landing-footer-heading">{t.landing.footer.policiesHeading}</p>
          <button className="landing-footer-link" onClick={onOpenPrivacyPolicy}>
            {t.landing.footer.privacyPolicy}
          </button>
          <button className="landing-footer-link" onClick={onOpenTermsOfService}>
            {t.landing.footer.termsOfService}
          </button>
          <button className="landing-footer-link" onClick={onOpenGrievanceOfficer}>
            {t.landing.footer.grievanceOfficer}
          </button>
        </div>
        <div className="landing-footer-col">
          <p className="landing-footer-heading">{t.landing.footer.platformHeading}</p>
          <a href="#law-library">{t.nav.actsAndRules}</a>
          <button className="landing-footer-link" onClick={onStartFiling}>
            {t.landing.footer.startAFiling}
          </button>
          <button className="landing-footer-link" onClick={onOpenAbout}>
            {t.nav.about}
          </button>
          <button className="landing-footer-link" onClick={onOpenContact}>
            {t.nav.contact}
          </button>
        </div>
      </footer>
    </div>
  );
}
