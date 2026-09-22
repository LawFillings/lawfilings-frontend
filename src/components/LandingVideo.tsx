import { useLanguage } from '../lib/language';
import './LandingVideo.css';

// Explainer videos exist for these site languages; every other language shows the English one.
const VIDEO_LANGUAGES = ['en', 'hi'];

/**
 * The landing hero's explainer video (what LawFilings offers + how it works), replacing the two
 * slideshows. Captions are burned into the picture, so no separate text track is attached.
 * Rebuild with tools/video/ when the copy or the narration voice changes.
 */
export function LandingVideo() {
  const { t, language } = useLanguage();
  const lang = VIDEO_LANGUAGES.includes(language) ? language : 'en';
  return (
    <div className="landing-video" id="how-it-works">
      <video
        key={lang}
        className="landing-video-player"
        controls
        playsInline
        preload="metadata"
        poster={`/videos/poster-${lang}.jpg`}
        aria-label={t.landing.uspSlider.ariaLabel}
      >
        <source src={`/videos/explainer-${lang}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}
