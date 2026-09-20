import { externalLawNewsSites } from "../data/newsItems";
import { useSettings } from "../lib/settings";
import { useLanguage } from "../lib/language";
import { UspSlider } from "../components/UspSlider";
import { HowItWorks } from "../components/HowItWorks";
import { BuiltFor } from "../components/BuiltFor";
import { BrandMark } from "../components/BrandMark";
import { IconGridSection } from "../components/IconGridSection";
import "./LandingPage.css";

// One icon per "Why LawFilings" / "Who it's for" item, in the same simple line-icon style
// HowItWorks.tsx uses (24x24, currentColor stroke) — kept local to this file since they're paired
// one-to-one with this page's own copy, not reused elsewhere.
function VerifiedDocIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3v5a1 1 0 0 0 1 1h5" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function StackedDocsIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3h8a1 1 0 0 1 1 1v15l-3-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M11 8h4M11 12h4" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function TwoPeopleIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M21 20c0-2.5-1.6-4.3-3.8-4.9" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 19h1M12 19h1M16 19h1" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 4 5.8 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.8-4-9s1.5-6.4 4-9Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M7 21h10" />
      <path d="M5 7h6M13 7h6" />
      <path d="M5 7 2 13a3 3 0 0 0 6 0Z" />
      <path d="M19 7 16 13a3 3 0 0 0 6 0Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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

// One icon per t.landing.news.items entry (src/lib/translations/en.ts), in the same order — kept
// in sync by hand since there are only ever a handful of these verified items at a time.
const LAW_NEWS_ICONS = [
  <ClockIcon key="clock" />, // DRAT appeal deadline
  <ScaleIcon key="scale" />, // Consumer Commission jurisdiction
  <ShieldIcon key="shield" />, // DPDP Act timeline
  <VerifiedDocIcon key="verified-news" />, // SARFAESI Act added
];

// Phone-only shortcut tiles to the main sections (the desktop top menu is a hamburger there).
const QUICK_ICONS: Record<string, string[]> = {
  filing: ["M14 3v5a1 1 0 0 0 1 1h5", "M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z", "M9 14h6", "M12 11v6"],
  causeList: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  tools: ["M4 4h16v16H4Z", "M8 8h8", "M8 12h.01", "M12 12h.01", "M16 12h.01", "M8 16h.01", "M12 16h.01", "M16 16h.01"],
  myCases: ["M3 7h18v13H3Z", "M8 7V4h8v3"],
  caseLaw: ["M12 3v18", "M5 7h14", "M5 7l-3 7a3 3 0 0 0 6 0Z", "M19 7l-3 7a3 3 0 0 0 6 0Z"],
  news: ["M4 5h14v14a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2Z", "M18 9h2v9a2 2 0 0 1-2 2", "M8 9h6", "M8 13h6", "M8 17h4"],
};

function QuickIcon({ name }: { name: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {QUICK_ICONS[name].map((d, i) => (
        <path d={d} key={i} />
      ))}
    </svg>
  );
}

interface Props {
  onStartFiling: () => void;
  onOpenLawLibrary: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTermsOfService: () => void;
  onOpenGrievanceOfficer: () => void;
  onOpenCauseList: () => void;
  onOpenLegalTools: () => void;
  onOpenCaseLaw: () => void;
  onOpenMyCases: () => void;
}

export function LandingPage({
  onStartFiling,
  onOpenLawLibrary,
  onOpenAbout,
  onOpenContact,
  onOpenPrivacyPolicy,
  onOpenTermsOfService,
  onOpenGrievanceOfficer,
  onOpenCauseList,
  onOpenLegalTools,
  onOpenCaseLaw,
  onOpenMyCases,
}: Props) {
  const { settings } = useSettings();
  const { color, widgets } = settings.landing;
  const { t } = useLanguage();

  return (
    <div className="landing" data-color-theme={color}>
      <header className="landing-hero starfield-dust">
        <div
          className="starfield-sparkles landing-hero-sparkles"
          aria-hidden="true"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <span className="starfield-sparkle landing-hero-sparkle" key={i} />
          ))}
        </div>
        <BrandMark
          size={420}
          halo
          wordmark
          className="landing-hero-watermark"
        />
        <div className="landing-hero-grid">
          <div className="landing-hero-slideshow">
            <UspSlider />
          </div>
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
            <p className="landing-hero-sub landing-hero-sub-full">{t.landing.hero.sub}</p>
            <p className="landing-hero-sub landing-hero-sub-short">{t.landing.hero.subShort}</p>
            <nav className="landing-quick" aria-label={t.landing.hero.startFiling}>
              {[
                { key: 'filing', label: t.nav.startAFiling, onClick: onStartFiling },
                { key: 'causeList', label: t.nav.causeList, onClick: onOpenCauseList },
                { key: 'tools', label: t.nav.legalTools, onClick: onOpenLegalTools },
                { key: 'myCases', label: t.nav.myCases, onClick: onOpenMyCases },
                { key: 'caseLaw', label: t.nav.caseLaw, onClick: onOpenCaseLaw },
                {
                  key: 'news',
                  label: t.landing.news.eyebrow,
                  onClick: () => document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                },
              ].map((q) => (
                <button type="button" className="landing-quick-tile" key={q.key} onClick={q.onClick}>
                  <QuickIcon name={q.key} />
                  <span>{q.label}</span>
                </button>
              ))}
            </nav>
            <p className="landing-hero-eyebrow">{t.landing.hero.eyebrow}</p>
            <div className="landing-hero-ctas">
              <button className="landing-cta-primary" onClick={onStartFiling}>
                {t.landing.hero.startFiling}
              </button>
              <button
                className="landing-cta-secondary-hero"
                onClick={onOpenLawLibrary}
              >
                {t.landing.hero.browseActs}
              </button>
            </div>
          </div>
        </div>
      </header>

      {widgets.howItWorks && <HowItWorks onStartFiling={onStartFiling} />}

      {widgets.whyChooseUs && (
        <IconGridSection
          id="why-choose-us"
          eyebrow={t.landing.whyChooseUs.eyebrow}
          title={t.landing.whyChooseUs.title}
          sub={t.landing.whyChooseUs.sub}
          columns={3}
          background="rgba(150, 175, 205, 0.4)"
          items={t.landing.whyChooseUs.items.map((item, i) => ({
            icon: WHY_LAWFILINGS_ICONS[i],
            title: item.title,
            body: item.body,
          }))}
        />
      )}

      {widgets.whoItsFor && <BuiltFor />}

      {widgets.news && (
        <IconGridSection
          id="news"
          eyebrow={t.landing.news.eyebrow}
          title={t.landing.news.title}
          sub={t.landing.news.sub}
          columns={2}
          background="rgba(150, 175, 205, 0.4)"
          items={t.landing.news.items.map((item, i) => ({
            icon: LAW_NEWS_ICONS[i],
            title: item.title,
            body: item.summary,
            meta: item.date,
          }))}
          footer={
            <>
              {t.landing.news.moreSourcesLabel}
              <span className="icon-grid-footer-links">
                {externalLawNewsSites.map((site) => (
                  <a
                    key={site.name}
                    className="icon-grid-footer-link"
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {site.name} ↗
                  </a>
                ))}
              </span>
            </>
          }
        />
      )}

      <footer className="landing-footer">
        <div className="landing-footer-col">
          <p className="landing-footer-heading">{t.landing.footer.brand}</p>
          <p className="landing-footer-note">{t.landing.footer.note}</p>
        </div>
        <div className="landing-footer-col">
          <p className="landing-footer-heading">
            {t.landing.footer.policiesHeading}
          </p>
          <button className="landing-footer-link" onClick={onOpenPrivacyPolicy}>
            {t.landing.footer.privacyPolicy}
          </button>
          <button
            className="landing-footer-link"
            onClick={onOpenTermsOfService}
          >
            {t.landing.footer.termsOfService}
          </button>
          <button
            className="landing-footer-link"
            onClick={onOpenGrievanceOfficer}
          >
            {t.landing.footer.grievanceOfficer}
          </button>
        </div>
        <div className="landing-footer-col">
          <p className="landing-footer-heading">
            {t.landing.footer.platformHeading}
          </p>
          <button className="landing-footer-link" onClick={onOpenLawLibrary}>
            {t.nav.actsAndRules}
          </button>
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
