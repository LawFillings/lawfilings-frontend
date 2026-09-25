import { useEffect, useRef, type ReactNode } from 'react';
import type { UserRole } from '../types';
import { useSettings } from '../lib/settings';
import { useLanguage } from '../lib/language';
import './WizardShell.css';

interface WizardShellProps {
  title: string;
  governingLaw: string;
  steps: string[];
  currentStep: number;
  onStepChange: (i: number) => void;
  mode: UserRole;
  onModeChange: (m: UserRole) => void;
  children: ReactNode;
}

export function WizardShell({
  title,
  governingLaw,
  steps,
  currentStep,
  onStepChange,
  mode,
  onModeChange,
  children,
}: WizardShellProps) {
  const { settings } = useSettings();
  const { t } = useLanguage();

  // The step content is swapped wholesale on step change, but the page's scroll position doesn't
  // reset — if the previous step was scrolled down, advancing to a shorter step can land you
  // scrolled past all of its content, which looks exactly like the click did nothing.
  const stepContentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    stepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStep]);

  return (
    <div className="wizard" data-color-theme={settings.wizard.color}>
      <header className="wizard-header">
        <div className="wizard-header-title">
          <p className="wizard-eyebrow">{governingLaw}</p>
          <h1 className="wizard-title">{title}</h1>
        </div>
        <div className="mode-toggle" role="group" aria-label={t.wizardShared.modeGroupLabel}>
          <button
            className={mode === 'advocate' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('advocate')}
          >
            {t.wizardShared.modeAdvocate}
          </button>
          <button
            className={mode === 'justice_seeker' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('justice_seeker')}
          >
            {t.wizardShared.modeJusticeSeeker}
          </button>
        </div>
      </header>

      <div className="wizard-body">
        <nav className="step-rail" aria-label={t.wizardShared.stepsNavLabel}>
          {steps.map((s, i) => (
            <button
              key={s}
              className={i === currentStep ? 'step-item active' : i < currentStep ? 'step-item done' : 'step-item'}
              onClick={() => onStepChange(i)}
              disabled={i > currentStep}
            >
              <span className="step-number">{i + 1}</span>
              <span className="step-label">{s}</span>
            </button>
          ))}
        </nav>

        <div className="step-content" ref={stepContentRef}>
          {children}
          <div className="step-nav">
            {currentStep > 0 && (
              <button className="step-nav-btn" onClick={() => onStepChange(currentStep - 1)}>
                {t.common.back}
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button className="step-nav-btn primary" onClick={() => onStepChange(currentStep + 1)}>
                {t.wizardShared.continueButton}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
