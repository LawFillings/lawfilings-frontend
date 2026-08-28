import { useEffect, useState } from 'react';
import './UspSlider.css';

interface Slide {
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    title: 'A real Law Library, always free',
    body: 'The Constitution of India, and the actual text of the Consumer Protection Act, RDDBFI Act, SARFAESI Act, and IBC — sourced directly from India Code.',
  },
  {
    title: 'Wizards built on real procedure',
    body: 'Deadline calculators, jurisdiction checks, and eligibility gates run before you draft, not after you’ve wasted time on the wrong form.',
  },
  {
    title: 'Now covering District Courts',
    body: 'Money recovery and summary suits for Delhi, Jammu & Kashmir, Punjab, Haryana, Himachal Pradesh, Uttar Pradesh, and Rajasthan.',
  },
  {
    title: 'Track your case yourself',
    body: 'Save a case and add status updates over time, entered by you — no dependency on an external court portal.',
  },
  {
    title: 'A real, assembled draft',
    body: 'Clause-templated documents, downloadable as a PDF — no placeholder brackets left for you to fill in by hand.',
  },
];

const INTERVAL_MS = 5000;

export function UspSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <section
      className="usp-slider"
      aria-label="Why this platform"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="usp-slider-inner">
        <div className="usp-slide" key={index}>
          <p className="usp-slide-title">{slide.title}</p>
          <p className="usp-slide-body">{slide.body}</p>
        </div>
        <div className="usp-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={i === index ? 'usp-dot active' : 'usp-dot'}
              aria-label={`Show slide ${i + 1} of ${SLIDES.length}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
