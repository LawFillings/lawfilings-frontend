import { type ReactNode } from 'react';
import { useLanguage } from '../lib/language';
import './HowItWorks.css';

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
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

const ICONS: ReactNode[] = [<ChatIcon key="chat" />, <UploadIcon key="upload" />, <CalendarIcon key="cal" />, <DocumentIcon key="doc" />];

interface Props {
  onStartFiling: () => void;
}

export function HowItWorks({ onStartFiling }: Props) {
  const { t } = useLanguage();
  const steps = t.landing.howItWorks.steps;

  return (
    <section className="landing-howitworks" id="how-it-works">
      <div className="landing-howitworks-inner">
        <p className="landing-section-eyebrow landing-section-eyebrow-centered">{t.landing.howItWorks.eyebrow}</p>
        <h2 className="landing-section-title landing-section-title-centered">{t.landing.howItWorks.title}</h2>

        <div className="howitworks-flow">
          {steps.map((step, i) => (
            <div className="howitworks-step" key={step.title}>
              <span className="howitworks-icon">{ICONS[i]}</span>
              <p className="howitworks-step-title">{step.title}</p>
              <p className="howitworks-step-body">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="landing-howitworks-cta">
          <button className="landing-cta-secondary" onClick={onStartFiling}>
            {t.landing.howItWorks.cta}
          </button>
        </div>
      </div>
    </section>
  );
}
