import { Fragment, useEffect, useState } from 'react';
import { SettingsProvider } from '../lib/settings';
import { LanguageProvider, useLanguage } from '../lib/language';
import { BrandMark } from '../components/BrandMark';
import { offersArt, howArt } from '../components/slideshowArt';
import shotDraftPreview from '../../tools/video/screens/draft-preview.png';
import shotDeadline from '../../tools/video/screens/deadline.png';
import shotHomePicker from '../../tools/video/screens/home-picker.png';
import shotMyCases from '../../tools/video/screens/my-cases.png';
import shotLawLibrary from '../../tools/video/screens/law-library.png';
import shotUploadStep from '../../tools/video/screens/upload-step.png';
import shotPartiesStep from '../../tools/video/screens/parties-step.png';

// Real screenshots of the app itself (mock-authed local build, same code as lawfilings.in — see
// tools/video/capture.mjs), flown in over each matching slide's own art for a moment as proof
// the slide isn't just an illustration. One shot can suit more than one slide.
const SHOTS: Record<string, string> = {
  hero0: shotDraftPreview,
  hero1: shotDeadline,
  hero2: shotHomePicker,
  hero3: shotMyCases,
  hero4: shotLawLibrary,
  step0: shotPartiesStep,
  step1: shotUploadStep,
  step2: shotDeadline,
  step3: shotDraftPreview,
};

// Which edge each slide's screenshot flies in from (and exits toward the opposite edge) — varied
// per slide, cycling right/top/left/bottom, so nine slides in a row don't all move the same way.
const SHOT_DIR: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
  hero0: 'right',
  hero1: 'top',
  hero2: 'left',
  hero3: 'bottom',
  hero4: 'right',
  step0: 'top',
  step1: 'left',
  step2: 'bottom',
  step3: 'right',
};
import '../components/LandingSlideshow.css';
import './storyboard.css';

/**
 * Frame-by-frame renderer for the landing-page explainer video (dev tool, not part of the site).
 * It reuses the real slideshow markup, CSS and artwork so the video matches the live slides, and
 * exposes window.__seek(seconds) so a driver script can scrub to any moment and screenshot it.
 * Scenes and timing come from window.__SB (written by the video build script).
 */
// A slide's own scene length, so its screenshot's fly-in/hold/fly-out timing always matches how
// long that slide is actually on screen, regardless of playback order.
function sceneDuration(scenes: Scene[], key: string): number {
  const scene = scenes.find((sc) => sc.key === key);
  return scene ? scene.end - scene.start : 6;
}

interface Scene {
  key: string;
  start: number;
  end: number;
  caption: string;
}
declare global {
  interface Window {
    __SB?: { scenes: Scene[] };
    __seek?: (t: number) => Promise<void>;
  }
}

function Frame() {
  const { t } = useLanguage();
  const scenes = window.__SB?.scenes ?? [];
  const [active, setActive] = useState(0);
  const [caption, setCaption] = useState('');

  const art = offersArt(t.landing.slideshow.art);
  const how = howArt(t.landing.slideshow.art);
  const src = t.landing.uspSlider.slides;
  const hw = t.landing.howItWorks;
  const ORDER = [4, 1, 2, 3, 0];
  const slides: Record<string, { step?: string; title: string; body?: string; art: string }> = {};
  ORDER.forEach((i, n) => {
    slides[`hero${n}`] = { title: src[i].title, body: src[i].body, art: art[i] };
  });
  slides.howIntro = { step: hw.eyebrow, title: hw.title, art: how[0] };
  hw.steps.forEach((s, i) => {
    slides[`step${i}`] = { step: `${i + 1} / ${hw.steps.length}`, title: s.title, body: s.body, art: how[i + 1] };
  });

  useEffect(() => {
    let current = -1;
    window.__seek = async (time: number) => {
      let idx = scenes.findIndex((s) => time >= s.start && time < s.end);
      if (idx < 0) idx = time < (scenes[0]?.start ?? 0) ? 0 : scenes.length - 1;
      if (idx !== current) {
        current = idx;
        setActive(idx);
        setCaption(scenes[idx].caption);
        // Let React commit and the browser start the new slide's animations.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const local = Math.max(0, time - scenes[idx].start) * 1000;
      void document.body.offsetHeight;
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = local;
      }
    };
    return () => {
      delete window.__seek;
    };
  }, [scenes]);

  const scene = scenes[active];
  const isCustom = scene?.key === 'intro' || scene?.key === 'outro';

  return (
    <div className="sb-root">
      <section className="lf-show is-ready" data-inview="true" data-hold="true">
        <div className="lf-frame sb-frame">
          <BrandMark size={460} halo wordmark className="lf-watermark" />
          <div className="lf-inner sb-inner">
            <div className="lf-stage">
              {Object.entries(slides).map(([key, s]) => (
                <article key={key} className={scene?.key === key ? 'lf-slide is-active' : 'lf-slide'}>
                  <div className="lf-copy">
                    {s.step && <p className="lf-step">{s.step}</p>}
                    <h3 className="lf-title">
                      {s.title
                        .trim()
                        .split(/\s+/)
                        .map((w, wi, arr) => (
                          <Fragment key={wi}>
                            <span className="w" style={{ ['--i' as string]: wi }}>
                              <span>{w}</span>
                            </span>
                            {wi < arr.length - 1 ? ' ' : null}
                          </Fragment>
                        ))}
                    </h3>
                    <span className="lf-rule" />
                    {s.body && <p className="lf-body">{s.body}</p>}
                  </div>
                  <div className="lf-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.art }} />
                  {SHOTS[key] && (
                    <div
                      className={`sb-shot sb-shot-${SHOT_DIR[key] ?? 'right'}`}
                      style={{ ['--sdur' as string]: `${sceneDuration(scenes, key)}s` }}
                      aria-hidden="true"
                    >
                      <div className="sb-shot-bar">
                        <i />
                        <i />
                        <i />
                        <em>lawfilings.in</em>
                      </div>
                      <img src={SHOTS[key]} alt="" />
                    </div>
                  )}
                </article>
              ))}
              {isCustom && (
                <article className="lf-slide is-active sb-hero" key={scene.key}>
                  <div className="sb-hero-inner">
                    <BrandMark size={190} wordmark />
                    <p className="lf-title sb-hero-line">
                      {scene.key === 'intro' ? t.landing.hero.eyebrow : t.landing.hero.startFiling.replace(/\s*[→←]\s*$/, '')}
                    </p>
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="sb-caption" dir="auto">
        {caption}
      </div>
    </div>
  );
}

export function Storyboard() {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <Frame />
      </LanguageProvider>
    </SettingsProvider>
  );
}
