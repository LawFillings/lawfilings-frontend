import { useEffect, useState } from 'react';
import { useLanguage } from '../lib/language';
import './UspSlider.css';

const INTERVAL_MS = 5000;

export function UspSlider() {
  const { t } = useLanguage();
  const slides = t.landing.uspSlider.slides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const slide = slides[index];

  return (
    <section
      className="usp-slider"
      aria-label={t.landing.uspSlider.ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="usp-slider-inner">
        <div className="usp-slide" key={index}>
          <p className="usp-slide-title">{slide.title}</p>
          <p className="usp-slide-body">{slide.body}</p>
        </div>
        <div className="usp-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === index ? 'usp-dot active' : 'usp-dot'}
              aria-label={`Show slide ${i + 1} of ${slides.length}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
