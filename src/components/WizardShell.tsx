import type { ReactNode } from 'react';
import type { UserRole } from '../types';
import { useSettings } from '../lib/settings';
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

  return (
    <div className="wizard" data-color-theme={settings.wizard.color}>
      <header className="wizard-header">
        <div>
          <p className="wizard-eyebrow">{governingLaw}</p>
          <h1 className="wizard-title">{title}</h1>
        </div>
        <div className="mode-toggle" role="group" aria-label="Choose who you are">
          <button
            className={mode === 'advocate' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('advocate')}
          >
            I'm an advocate
          </button>
          <button
            className={mode === 'justice_seeker' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('justice_seeker')}
          >
            I'm filing for myself
          </button>
        </div>
      </header>

      <div className="wizard-body">
        <nav className="step-rail" aria-label="Wizard steps">
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

        <div className="step-content">
          {children}
          <div className="step-nav">
            {currentStep > 0 && (
              <button className="step-nav-btn" onClick={() => onStepChange(currentStep - 1)}>
                ← Back
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button className="step-nav-btn primary" onClick={() => onStepChange(currentStep + 1)}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
