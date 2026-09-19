import { Fragment, useEffect, useRef, useState } from 'react';
import { BrandMark } from './BrandMark';
import './LandingSlideshow.css';

export interface SlideData {
  step?: string;
  title: string;
  body?: string;
  /** Static, repo-authored SVG markup — see slideshowArt.ts. */
  art: string;
}

interface Props {
  ariaLabel: string;
  slides: SlideData[];
  intervalMs?: number;
}

export function LandingSlideshow({ ariaLabel, slides, intervalMs = 8000 }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
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

  return (
    <section
      ref={rootRef}
      className={ready ? 'lf-show is-ready' : 'lf-show'}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-inview={inView}
      data-paused={paused}
      data-hold={hover || focusRing}
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
        if (e.key === 'ArrowRight') go(index + 1);
        else if (e.key === 'ArrowLeft') go(index - 1);
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
              if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
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
                  aria-label={`${i + 1} of ${slides.length}`}
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
            <div className="lf-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="lf-dot"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <div className="lf-btns">
              <button className="lf-btn" type="button" aria-label="Previous slide" onClick={() => go(index - 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                className="lf-btn lf-pause"
                type="button"
                aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                onClick={() => setPaused((p) => !p)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path className="i-pause" d="M9 5v14M15 5v14" />
                  <path className="i-play" d="M8 5l11 7-11 7z" />
                </svg>
              </button>
              <button className="lf-btn" type="button" aria-label="Next slide" onClick={() => go(index + 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div className="lf-bar" aria-hidden="true">
          <i key={index} onAnimationEnd={(e) => e.target === e.currentTarget && go(index + 1)} />
        </div>
      </div>
    </section>
  );
}
