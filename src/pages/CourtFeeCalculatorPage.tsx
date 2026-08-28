import { useState } from 'react';
import { useLanguage } from '../lib/language';
import { courtFeeSchedules, calculateCourtFee, type CourtFeeResult } from '../lib/courtFee';
import './CourtFeeCalculatorPage.css';

interface Props {
  onBack: () => void;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function CourtFeeCalculatorPage({ onBack }: Props) {
  const { t } = useLanguage();
  const [scheduleId, setScheduleId] = useState(courtFeeSchedules[0].id);
  const [suitValue, setSuitValue] = useState('');

  const schedule = courtFeeSchedules.find((s) => s.id === scheduleId)!;
  const numeric = Number(suitValue.replace(/[^0-9.]/g, ''));
  const hasValue = suitValue.length > 0 && !Number.isNaN(numeric) && numeric > 0;
  const result: CourtFeeResult | null = hasValue ? calculateCourtFee(scheduleId, numeric) : null;

  return (
    <div className="cfc-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="cfc-hero">
        <p className="cfc-eyebrow">Ad valorem court fee</p>
        <h1 className="cfc-title">Court Fee Calculator</h1>
        <p className="cfc-sub">
          Estimates the ad valorem court fee payable on a civil suit's value, state by state — covering{' '}
          {courtFeeSchedules.length} schedules across India's states and union territories.
        </p>
      </header>

      <div className="cfc-form">
        <label className="field-label" htmlFor="cfc-state">
          State
        </label>
        <select id="cfc-state" className="cfc-select" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          {courtFeeSchedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stateLabel}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="cfc-value" style={{ marginTop: 'var(--space-4)' }}>
          Value of the suit
        </label>
        <input
          id="cfc-value"
          type="text"
          className="date-input"
          placeholder="₹"
          value={suitValue}
          onChange={(e) => setSuitValue(e.target.value)}
        />

        {hasValue && result && (
          <div className="cfc-result">
            <div className="cfc-result-row">
              <span className="cfc-result-label">Court fee payable</span>
              <span className="cfc-result-value">{formatINR(result.fee)}</span>
            </div>
            {result.capped && (
              <p className="cfc-cap-note">
                Capped — {schedule.stateLabel}'s Act limits the maximum ad valorem fee to {formatINR(schedule.cap!)},
                regardless of suit value.
              </p>
            )}
            <p className="cfc-provision">
              Under {schedule.governingLaw}. {schedule.sourceNote}
              <br />
              Last checked {new Date(schedule.lastVerified).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.
            </p>
          </div>
        )}

        {hasValue && !result && <p className="step-help">Enter a suit value greater than zero.</p>}
      </div>
    </div>
  );
}
