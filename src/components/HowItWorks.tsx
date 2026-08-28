import { Fragment, type ReactNode } from 'react';
import './HowItWorks.css';

interface Step {
  title: string;
  body: string;
  icon: ReactNode;
}

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v5a1 1 0 0 0 1 1h5" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function StepArrow() {
  return (
    <svg className="howitworks-arrow-svg" width="40" height="16" viewBox="0 0 40 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8h34M28 2l7 6-7 6" />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    title: 'Answer plain questions',
    body: 'No legal jargon required — we ask what happened, and switch to precise legal language only when an advocate is filing.',
    icon: <ChatIcon />,
  },
  {
    title: 'We catch deadlines and gaps',
    body: "A live deadline calculator, jurisdiction checks, and eligibility gates run before you draft — not after you've wasted time on the wrong form.",
    icon: <CalendarIcon />,
  },
  {
    title: 'Get your assembled draft',
    body: 'A real, formatted document — no placeholder brackets left for you to fill in by hand — downloadable as a PDF.',
    icon: <DocumentIcon />,
  },
];

interface Props {
  onStartFiling: () => void;
}

export function HowItWorks({ onStartFiling }: Props) {
  return (
    <section className="landing-howitworks" id="how-it-works">
      <div className="landing-howitworks-inner">
        <p className="landing-section-eyebrow landing-section-eyebrow-centered">How it works</p>
        <h2 className="landing-section-title landing-section-title-centered">Three steps, not a blank page</h2>

        <div className="howitworks-flow">
          {STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <div className="howitworks-step">
                <span className="howitworks-icon">{step.icon}</span>
                <p className="howitworks-step-title">{step.title}</p>
                <p className="howitworks-step-body">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <span className="howitworks-arrow" aria-hidden="true">
                  <StepArrow />
                </span>
              )}
            </Fragment>
          ))}
        </div>

        <div className="landing-howitworks-cta">
          <button className="landing-cta-secondary" onClick={onStartFiling}>
            Try the DRT Written Statement flow →
          </button>
        </div>
      </div>
    </section>
  );
}
