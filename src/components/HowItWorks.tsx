import { useLanguage } from '../lib/language';
import { LandingSlideshow } from './LandingSlideshow';
import { howArt } from './slideshowArt';
import './HowItWorks.css';

interface Props {
  onStartFiling: () => void;
}

export function HowItWorks({ onStartFiling }: Props) {
  const { t } = useLanguage();
  const hw = t.landing.howItWorks;
  const art = howArt(t.landing.slideshow.art);
  // Intro slide (eyebrow + title), then one slide per step.
  const slides = [
    { step: hw.eyebrow, title: hw.title, art: art[0] },
    ...hw.steps.map((s, i) => ({
      step: `${i + 1} / ${hw.steps.length}`,
      title: s.title,
      body: s.body,
      art: art[i + 1],
    })),
  ];

  return (
    <section className="landing-howitworks" id="how-it-works">
      <div className="landing-howitworks-inner">
        <LandingSlideshow
          ariaLabel={hw.eyebrow}
          slides={slides}
          action={
            <button className="landing-cta-secondary" onClick={onStartFiling}>
              {hw.cta}
            </button>
          }
        />
      </div>
    </section>
  );
}
