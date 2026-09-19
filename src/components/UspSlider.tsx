import { useLanguage } from '../lib/language';
import { LandingSlideshow } from './LandingSlideshow';
import { offersArt } from './slideshowArt';

/** Hero slideshow: what the platform offers (copy: t.landing.uspSlider). */
export function UspSlider() {
  const { t } = useLanguage();
  // Display order: drafts, wizards, coverage, tracking, statutes. The translation files keep their
  // original order (statutes first), so the reorder is applied here for every language.
  const ORDER = [4, 1, 2, 3, 0];
  const src = t.landing.uspSlider.slides;
  const art = offersArt(t.landing.slideshow.art);
  const slides = ORDER.map((i) => ({ title: src[i].title, body: src[i].body, art: art[i] }));
  return <LandingSlideshow ariaLabel={t.landing.uspSlider.ariaLabel} slides={slides} />;
}
