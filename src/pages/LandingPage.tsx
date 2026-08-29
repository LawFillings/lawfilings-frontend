import { acts } from '../data/lawLibraryData';
import { newsItems } from '../data/newsItems';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import { UspSlider } from '../components/UspSlider';
import { HowItWorks } from '../components/HowItWorks';
import { BrandMark } from '../components/BrandMark';
import './LandingPage.css';

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
        <section className="landing-section" id="why-choose-us">
          <p className="landing-section-eyebrow">{t.landing.whyChooseUs.eyebrow}</p>
          <h2 className="landing-section-title">{t.landing.whyChooseUs.title}</h2>
          <p className="landing-section-sub">{t.landing.whyChooseUs.sub}</p>
          <div className="landing-news-grid">
            {t.landing.whyChooseUs.items.map((item) => (
              <div className="landing-news-card" key={item.title}>
                <span className="landing-card-media" aria-hidden="true" />
                <span className="landing-news-tag">{item.tag}</span>
                <p className="landing-news-title">{item.title}</p>
                <p className="landing-news-summary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {widgets.whoItsFor && (
        <section className="landing-section" id="who-its-for">
          <p className="landing-section-eyebrow">{t.landing.whoItsFor.eyebrow}</p>
          <h2 className="landing-section-title">{t.landing.whoItsFor.title}</h2>
          <p className="landing-section-sub">{t.landing.whoItsFor.sub}</p>
          <div className="landing-news-grid">
            {t.landing.whoItsFor.items.map((item) => (
              <div className="landing-news-card" key={item.title}>
                <span className="landing-card-media" aria-hidden="true" />
                <span className="landing-news-tag">{item.tag}</span>
                <p className="landing-news-title">{item.title}</p>
                <p className="landing-news-summary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {widgets.lawLibraryTeaser && (
        <section className="landing-section" id="law-library">
          <p className="landing-section-eyebrow">{t.landing.actsSection.eyebrow}</p>
          <h2 className="landing-section-title">{t.landing.actsSection.title}</h2>
          <p className="landing-section-sub">{t.landing.actsSection.sub}</p>
          <div className="landing-act-grid">
            {acts.map((act) => (
              <button className="landing-act-card" key={act.id} onClick={onOpenLawLibrary}>
                <span className="landing-card-media" aria-hidden="true" />
                <span className="landing-act-tag">
                  {act.jurisdiction.type === 'central' ? 'Central Act' : `State Act — ${act.jurisdiction.state}`}
                </span>
                <span className="landing-act-title">{act.shortTitle}</span>
              </button>
            ))}
          </div>
          <button className="landing-cta-secondary" onClick={onOpenLawLibrary}>
            {t.landing.actsSection.browseAll}
          </button>
        </section>
      )}

      {widgets.news && (
        <section className="landing-section" id="news">
          <p className="landing-section-eyebrow">{t.landing.news.eyebrow}</p>
          <h2 className="landing-section-title">{t.landing.news.title}</h2>
          <p className="landing-section-sub">{t.landing.news.sub}</p>
          <div className="landing-news-grid">
            {newsItems.map((item) => (
              <div className="landing-news-card" key={item.id}>
                <span className="landing-card-media" aria-hidden="true" />
                <span className="landing-news-tag">{item.tag}</span>
                <p className="landing-news-title">{item.title}</p>
                <p className="landing-news-summary">{item.summary}</p>
                <p className="landing-news-date">{item.date}</p>
              </div>
            ))}
          </div>
        </section>
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
