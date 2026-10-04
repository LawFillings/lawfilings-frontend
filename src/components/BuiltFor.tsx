import { useLanguage } from '../lib/language';
import { LandingVideo } from './LandingVideo';
import './BuiltFor.css';

/** "Built for" section: the cartoon video about who LawFilings is for (English and Hindi cuts; see pickVideoLanguage for who sees which). The earlier audience slideshow was removed — its slides, art and
 *  translated copy are still in git history, slideshowArt.ts (builtForArt) and t.landing.whoItsFor. */
export function BuiltFor() {
  const { t } = useLanguage();
  return (
    <section className="landing-builtfor" id="who-its-for">
      <div className="landing-builtfor-inner">
        <div className="landing-builtfor-video">
          <LandingVideo base="builtfor" languages={['en', 'hi', 'pa', 'mr']} id="built-for-video" ariaLabel={t.landing.whoItsFor.eyebrow} />
        </div>
      </div>
    </section>
  );
}
