import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import './LandingSlideshow.css';

export interface SlideData {
  step?: string;
  title: string;
  body?: string;
  /** Static, repo-authored SVG markup — see slideshowArt.ts. */
  art: string;
}

// BCP-47 tags for the browser's built-in speech voices, by site language.
const SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', gu: 'gu-IN', as: 'as-IN', bn: 'bn-IN', mr: 'mr-IN',
  ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', or: 'or-IN', ur: 'ur-PK',
};

/** A voice installed on this device for the given site language, if any. Reading aloud uses the
 *  browser's own speech engine (nothing is sent anywhere), so which languages work depends on the
 *  voices the device ships with. */
function findVoice(language: string): SpeechSynthesisVoice | null {
  const base = (SPEECH_LANG[language] ?? language).split('-')[0].toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const matches = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().split('-')[0] === base);
  const preferred = SPEECH_LANG[language]?.toLowerCase();
  return matches.find((v) => v.lang.replace('_', '-').toLowerCase() === preferred) ?? matches[0] ?? null;
}

// Only one slideshow reads at a time: starting one stops whichever was reading.
let stopActiveReader: (() => void) | null = null;

interface Props {
  ariaLabel: string;
  slides: SlideData[];
  intervalMs?: number;
  /** Optional call-to-action shown at the bottom-right of the frame, on every slide. */
  action?: ReactNode;
}

export function LandingSlideshow({ ariaLabel, slides, intervalMs = 8000, action }: Props) {
  const { t, language } = useLanguage();
  const sc = t.landing.slideshow;
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const goRef = useRef<(n: number) => void>(() => {});
  // Read through refs so a parent re-render (new `slides` array identity) doesn't restart the speech.
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const leaveTimer = useRef<number | undefined>(undefined);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    setReady(true);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => setInView(e.isIntersecting)), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const go = (n: number) => {
    const next = (n + slides.length) % slides.length;
    if (next === index) return;
    setLeaving(index);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setLeaving(null), 600);
    setIndex(next);
  };

  goRef.current = go;

  // Reads the current slide aloud, then moves on to the next, until the last slide or until stopped.
  useEffect(() => {
    if (!reading) return;
    const synth = window.speechSynthesis;
    let stale = false;
    const slide = slidesRef.current[index];
    const utterance = new SpeechSynthesisUtterance([slide.title, slide.body].filter(Boolean).join('. '));
    const voice = findVoice(language);
    if (voice) utterance.voice = voice;
    utterance.lang = SPEECH_LANG[language] ?? language;
    utterance.onend = () => {
      if (stale) return;
      // Read through to the last slide, then stop rather than looping forever.
      if (index >= slidesRef.current.length - 1) setReading(false);
      else goRef.current(index + 1);
    };
    utterance.onerror = (e) => {
      // 'interrupted'/'canceled' just mean a newer utterance or a stop replaced this one.
      if (!stale && e.error !== 'interrupted' && e.error !== 'canceled') setReading(false);
    };
    synth.cancel();
    synth.speak(utterance);
    return () => {
      stale = true;
      synth.cancel();
    };
  }, [reading, index, language]);

  useEffect(
    () => () => {
      if (canSpeak) window.speechSynthesis.cancel();
    },
    [canSpeak]
  );

  const toggleReading = () => {
    if (reading) {
      setReading(false);
      return;
    }
    setNoVoice(false);
    if (!findVoice(language)) {
      // The voice list can load late on some browsers — try once more shortly before giving up.
      window.speechSynthesis.getVoices();
      if (!findVoice(language)) {
        setNoVoice(true);
        return;
      }
    }
    stopActiveReader?.();
    stopActiveReader = () => setReading(false);
    setReading(true);
  };

  return (
    <section
      ref={rootRef}
      className={ready ? 'lf-show is-ready' : 'lf-show'}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-inview={inView}
      data-paused={paused}
      data-hold={hover || focusRing || reading}
      style={{ ['--lf-interval' as string]: `${intervalMs}ms` }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      onFocus={(e) => {
        try {
          setFocusRing((e.target as HTMLElement).matches(':focus-visible'));
        } catch {
          setFocusRing(false);
        }
      }}
      onBlur={() => setFocusRing(false)}
      onKeyDown={(e) => {
        const rtl = document.documentElement.dir === 'rtl';
        if (e.key === 'ArrowRight') go(index + (rtl ? -1 : 1));
        else if (e.key === 'ArrowLeft') go(index + (rtl ? 1 : -1));
      }}
    >
      <div className="lf-frame">
        <BrandMark size={460} halo wordmark className="lf-watermark" />
        <div className="lf-inner">
          <div
            className="lf-stage"
            aria-live={paused ? 'polite' : 'off'}
            onPointerDown={(e) => {
              startX.current = e.clientX;
            }}
            onPointerCancel={() => {
              startX.current = null;
            }}
            onPointerUp={(e) => {
              if (startX.current === null) return;
              const dx = e.clientX - startX.current;
              startX.current = null;
              if (Math.abs(dx) > 50) go(index + ((dx < 0) !== (document.documentElement.dir === 'rtl') ? 1 : -1));
            }}
          >
            {slides.map((s, i) => {
              const cls = i === index ? 'lf-slide is-active' : i === leaving ? 'lf-slide is-leaving' : 'lf-slide';
              const words = s.title.trim().split(/\s+/);
              return (
                <article
                  key={i}
                  className={cls}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={fmt(sc.slideOf, { n: i + 1, total: slides.length })}
                  aria-hidden={i === index ? undefined : true}
                  inert={i !== index}
                >
                  <div className="lf-copy">
                    {s.step && <p className="lf-step">{s.step}</p>}
                    <h3 className="lf-title">
                      {words.map((w, wi) => (
                        <Fragment key={wi}>
                          <span className="w" style={{ ['--i' as string]: wi }}>
                            <span>{w}</span>
                          </span>
                          {wi < words.length - 1 ? ' ' : null}
                        </Fragment>
                      ))}
                    </h3>
                    <span className="lf-rule" />
                    {s.body && <p className="lf-body">{s.body}</p>}
                  </div>
                  <div className="lf-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.art }} />
                </article>
              );
            })}
          </div>

          <div className="lf-controls">
            <div className="lf-controls-start">
            <div className="lf-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="lf-dot"
                  aria-label={fmt(sc.goToSlide, { n: i + 1 })}
                  aria-current={i === index}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            {canSpeak && (
              <button
                type="button"
                className="lf-listen"
                aria-pressed={reading}
                onClick={toggleReading}
                title={reading ? sc.stopListening : sc.listen}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {reading ? (
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                  ) : (
                    <>
                      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M18.5 6a9 9 0 0 1 0 12" />
                    </>
                  )}
                </svg>
                <span>{reading ? sc.stopListening : sc.listen}</span>
              </button>
            )}
            </div>
            {action && <div className="lf-action">{action}</div>}
          </div>
          {noVoice && (
            <p className="lf-novoice" role="status">
              {sc.noVoice}
            </p>
          )}
        </div>
        <div className="lf-bar" aria-hidden="true">
          <i key={index} onAnimationEnd={(e) => e.target === e.currentTarget && go(index + 1)} />
        </div>
      </div>
    </section>
  );
}
