import { useState } from 'react';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import { courtFeeSchedules, calculateCourtFee, type CourtFeeResult } from '../lib/courtFee';
import '../styles/split-page.css';
import './CourtFeeCalculatorPage.css';

interface Props {
  onBack: () => void;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(iso: string, lang: string) {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Date(iso).toLocaleDateString(`${lang}-IN`, opts);
  } catch {
    return new Date(iso).toLocaleDateString('en-IN', opts);
  }
}

export function CourtFeeCalculatorPage({ onBack }: Props) {
  const { t, language } = useLanguage();
  const c = t.courtFeePage;
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

      <div className="trio-card">
        <aside className="trio-left">
          <p className="cfc-eyebrow">{c.eyebrow}</p>
          <h1 className="cfc-title">{c.title}</h1>
          <p className="cfc-sub">{fmt(c.sub, { count: courtFeeSchedules.length })}</p>
        </aside>

        <main className="trio-center">
          <div className="cfc-form">
            <label className="field-label" htmlFor="cfc-state">
              {c.stateLabel}
            </label>
            <select id="cfc-state" className="cfc-select" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
              {courtFeeSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stateLabel}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="cfc-value" style={{ marginTop: 'var(--space-4)' }}>
              {c.valueLabel}
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
                  <span className="cfc-result-label">{c.feePayable}</span>
                  <span className="cfc-result-value">{formatINR(result.fee)}</span>
                </div>
                {result.capped && (
                  <p className="cfc-cap-note">
                    {fmt(c.capNote, { state: schedule.stateLabel, cap: formatINR(schedule.cap!) })}
                  </p>
                )}
              </div>
            )}

            {hasValue && !result && <p className="step-help">{c.invalidValue}</p>}
          </div>
        </main>

        <aside className="trio-right">
          <div className="trio-nudge-card cfc-source-note">
            {fmt(c.under, { law: schedule.governingLaw })} {schedule.sourceNote}
            <br />
            {fmt(c.lastChecked, { date: formatDate(schedule.lastVerified, language) })}
          </div>
        </aside>
      </div>
    </div>
  );
}
