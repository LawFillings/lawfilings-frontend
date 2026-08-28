import { useLanguage } from '../lib/language';
import './AboutPage.css';

interface Props {
  onBack: () => void;
  onStartFiling: () => void;
}

export function AboutPage({ onBack, onStartFiling }: Props) {
  const { t } = useLanguage();

  return (
    <div className="about-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="about-hero">
        <p className="about-eyebrow">{t.about.eyebrow}</p>
        <h1 className="about-title">{t.about.title}</h1>
        <p className="about-intro">{t.about.intro}</p>
      </header>

      <section className="about-block">
        <h2 className="about-block-heading">{t.about.visionHeading}</h2>
        <p className="about-block-body">{t.about.vision}</p>
      </section>

      <section className="about-block">
        <h2 className="about-block-heading">{t.about.missionHeading}</h2>
        <p className="about-block-body">{t.about.mission}</p>
      </section>

      <button className="landing-cta-primary" onClick={onStartFiling}>
        {t.about.cta}
      </button>
    </div>
  );
}
