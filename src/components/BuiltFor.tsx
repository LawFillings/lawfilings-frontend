import { useLanguage } from '../lib/language';
import { LandingSlideshow } from './LandingSlideshow';
import { builtForArt } from './slideshowArt';
import './HowItWorks.css';

/** "Built for" audiences as a slideshow: an intro slide, then one slide per audience. The copy is
 *  the existing, already-translated t.landing.whoItsFor (its "sub" line refers to cards, so it's
 *  not used here). */
export function BuiltFor() {
  const { t } = useLanguage();
  const w = t.landing.whoItsFor;
  const slides = [
    { step: w.eyebrow, title: w.title, art: builtForArt[0] },
    ...w.items.map((item, i) => ({ step: item.tag, title: item.title, body: item.body, art: builtForArt[i + 1] })),
  ];
  return (
    <section className="landing-howitworks landing-builtfor" id="who-its-for">
      <div className="landing-howitworks-inner">
        <LandingSlideshow ariaLabel={w.eyebrow} slides={slides} />
      </div>
    </section>
  );
}
