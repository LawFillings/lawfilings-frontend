import { useLanguage } from '../lib/language';
import './LandingVideo.css';

// Explainer videos exist for these site languages; every other language shows the English one.
const VIDEO_LANGUAGES = ['en', 'hi'];

interface Props {
  /** File stem under /videos: `<base>-<lang>.mp4` and `poster-<base>-<lang>.jpg` (the default,
   *  'explainer', keeps the original `poster-<lang>.jpg` name). */
  base?: string;
  /** Site languages that have their own cut of this video; every other language gets English. */
  languages?: string[];
  id?: string;
  ariaLabel?: string;
}

/**
 * The landing hero's explainer video (what LawFilings offers + how it works), replacing the two
 * slideshows. Captions are burned into the picture, so no separate text track is attached.
 * Rebuild with tools/video/ when the copy or the narration voice changes.
 */
export function LandingVideo({ base = 'explainer', languages = VIDEO_LANGUAGES, id = 'how-it-works', ariaLabel }: Props = {}) {
  const { t, language } = useLanguage();
  const lang = languages.includes(language) ? language : 'en';
  const poster = base === 'explainer' ? `/videos/poster-${lang}.jpg` : `/videos/poster-${base}-${lang}.jpg`;
  return (
    <div className="landing-video" id={id}>
      <video
        key={lang}
        className="landing-video-player"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={ariaLabel ?? t.landing.uspSlider.ariaLabel}
      >
        <source src={`/videos/${base}-${lang}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}
