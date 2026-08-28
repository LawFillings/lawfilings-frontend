import { useState } from 'react';
import type { UserRole } from '../types';
import './DepositCalculator.css';

interface DebtThresholdSelectorProps {
  thresholdAmount: number;
  thresholdLabel: string;
  mode: UserRole;
  onValueChange?: (value: number) => void;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export function DebtThresholdSelector({ thresholdAmount, thresholdLabel, mode, onValueChange }: DebtThresholdSelectorProps) {
  const [amount, setAmount] = useState('');
  const numeric = Number(amount.replace(/[^0-9.]/g, ''));
  const hasValue = amount.length > 0 && !Number.isNaN(numeric) && numeric > 0;
  const meetsThreshold = hasValue && numeric >= thresholdAmount;

  const handleChange = (v: string) => {
    setAmount(v);
    onValueChange?.(Number(v.replace(/[^0-9.]/g, '')));
  };

  return (
    <div>
      <label className="field-label" htmlFor="debt-amount">
        {mode === 'advocate' ? 'Total outstanding debt' : 'How much is the total outstanding debt?'}
      </label>
      <input id="debt-amount" type="text" className="date-input" placeholder="₹" value={amount} onChange={(e) => handleChange(e.target.value)} />

      {hasValue && (
        <div className={`deadline-card status-${meetsThreshold ? 'safe' : 'danger'}`} style={{ marginTop: 'var(--space-5)', maxWidth: 420 }}>
          {meetsThreshold ? (
            <>
              <p className="deadline-label">Meets the threshold</p>
              <p className="deadline-body">
                {formatINR(numeric)} is above the {thresholdLabel} minimum — this forum has jurisdiction.
              </p>
            </>
          ) : (
            <>
              <p className="deadline-label">Below the threshold</p>
              <p className="deadline-body">
                {formatINR(numeric)} is below the {thresholdLabel} minimum. This forum may not have jurisdiction — a civil court may be the correct route instead.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
