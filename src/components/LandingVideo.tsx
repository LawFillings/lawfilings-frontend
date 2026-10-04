import { useLanguage } from '../lib/language';
import './LandingVideo.css';

// Which cuts of the explainer exist. Visitors get their own language's cut when there is one; English,
// Telugu and Malayalam (no cut yet) get English; every other language without its own cut gets Hindi.
export const VIDEO_LANGUAGES = ['en', 'hi', 'pa', 'mr', 'ta', 'kn', 'gu'];
const ENGLISH_CUT_LANGUAGES = ['en', 'te', 'ml'];

export function pickVideoLanguage(language: string, available: string[]): string {
  if (available.includes(language)) return language;
  if (ENGLISH_CUT_LANGUAGES.includes(language)) return 'en';
  return available.includes('hi') ? 'hi' : 'en';
}

interface Props {
  /** File stem under /videos: `<base>-<lang>.mp4` and `poster-<base>-<lang>.jpg` (the default,
   *  'explainer', keeps the original `poster-<lang>.jpg` name). */
  base?: string;
  /** Cuts of this video that exist, e.g. ['en', 'hi']; see pickVideoLanguage for who sees which. */
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
  const lang = pickVideoLanguage(language, languages);
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
