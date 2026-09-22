import { Fragment, useEffect, useState } from 'react';
import { SettingsProvider } from '../lib/settings';
import { LanguageProvider, useLanguage } from '../lib/language';
import { BrandMark } from '../components/BrandMark';
import { offersArt, howArt } from '../components/slideshowArt';
import '../components/LandingSlideshow.css';
import './storyboard.css';

/**
 * Frame-by-frame renderer for the landing-page explainer video (dev tool, not part of the site).
 * It reuses the real slideshow markup, CSS and artwork so the video matches the live slides, and
 * exposes window.__seek(seconds) so a driver script can scrub to any moment and screenshot it.
 * Scenes and timing come from window.__SB (written by the video build script).
 */
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
