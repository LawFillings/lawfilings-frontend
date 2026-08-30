import { useMemo, useState } from 'react';
import type { CaseType, UserRole } from '../types';
import './DeadlineCalculator.css';

interface DeadlineCalculatorProps {
  caseType: CaseType;
  mode: UserRole;
  onDaysSinceChange?: (days: number | null) => void;
  /** Lets a parent that needs the raw trigger date itself (e.g. to prefill it from an uploaded
   *  order's extracted date) control this field instead of the component's own internal state.
   *  Omit both to keep the previous fully-internal behaviour. */
  value?: string;
  onChange?: (value: string) => void;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DeadlineCalculator({ caseType, mode, onDaysSinceChange, value, onChange }: DeadlineCalculatorProps) {
  const [internalTriggerDate, setInternalTriggerDate] = useState('');
  const triggerDate = value !== undefined ? value : internalTriggerDate;

  const daysSince = useMemo(() => {
    if (!triggerDate) return null;
    const served = new Date(triggerDate);
    const today = new Date();
    return Math.floor((today.getTime() - served.getTime()) / 86_400_000);
  }, [triggerDate]);

  const handleChange = (nextValue: string) => {
    if (onChange) onChange(nextValue);
    else setInternalTriggerDate(nextValue);
    if (!nextValue) {
      onDaysSinceChange?.(null);
      return;
    }
    const served = new Date(nextValue);
    const today = new Date();
    onDaysSinceChange?.(Math.floor((today.getTime() - served.getTime()) / 86_400_000));
  };

  if (caseType.deadlineSource === 'tribunal_assigned') {
    return (
      <div className="deadline-card status-warn">
        <p className="deadline-label">No fixed statutory deadline</p>
        <p className="deadline-body">
          {mode === 'advocate'
            ? 'This forum sets the reply deadline case-by-case at the hearing. Confirm the returnable date from the order or notice — do not assume a standard number of days.'
            : 'The Tribunal sets your deadline itself, and it isn’t a fixed number of days written into the law. If you don’t know your exact deadline, get urgent help finding out — guessing here is risky.'}
        </p>
      </div>
    );
  }

  const limitation = caseType.limitationDays ?? 0;
  const extension = caseType.condonableExtensionDays ?? 0;
  const outer = limitation + extension;

  let band: 'safe' | 'warn' | 'danger' = 'safe';
  if (daysSince !== null) {
    if (daysSince > outer) band = 'danger';
    else if (daysSince > limitation) band = 'warn';
  }

  const hardDeadline = triggerDate
    ? new Date(new Date(triggerDate).getTime() + limitation * 86_400_000)
    : null;
  const outerDeadline = triggerDate
    ? new Date(new Date(triggerDate).getTime() + outer * 86_400_000)
    : null;

  return (
    <div>
      <label className="field-label" htmlFor="trigger-date">
        {mode === 'advocate' ? 'Date of service of summons' : 'Date you were served the notice'}
      </label>
      <input
        id="trigger-date"
        type="date"
        className="date-input"
        value={triggerDate}
        onChange={(e) => handleChange(e.target.value)}
      />

      {daysSince !== null && hardDeadline && (
        <div className={`deadline-card status-${band}`}>
          {band === 'safe' && (
            <>
              <p className="deadline-label">Deadline to file</p>
              <p className="deadline-date">{formatDate(hardDeadline)}</p>
              <p className="deadline-body">
                {limitation - daysSince} days remaining under the standard {limitation}-day period.
              </p>
            </>
          )}
          {band === 'warn' && outerDeadline && (
            <>
              <p className="deadline-label">Standard deadline has passed</p>
              <p className="deadline-body">
                You're within the discretionary extension window (up to {formatDate(outerDeadline)}), but this
                requires filing a separate application explaining the delay — it isn't automatic, and the bar is
                genuinely high.
              </p>
            </>
          )}
          {band === 'danger' && (
            <>
              <p className="deadline-label">Filing window has likely closed</p>
              <p className="deadline-body">
                It's been {daysSince} days. Courts have held this deadline is not routinely extendable beyond{' '}
                {outer} days.{' '}
                {mode === 'advocate'
                  ? 'Advise the client on next steps rather than proceeding with a standard draft.'
                  : 'Getting urgent advice on next steps matters more right now than continuing to draft.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
