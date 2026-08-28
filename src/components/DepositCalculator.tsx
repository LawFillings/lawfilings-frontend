import { useState } from 'react';
import type { DepositRequirement, UserRole } from '../types';
import './DepositCalculator.css';

interface DepositCalculatorProps {
  deposit: DepositRequirement;
  mode: UserRole;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export function DepositCalculator({ deposit, mode }: DepositCalculatorProps) {
  const [amount, setAmount] = useState('');
  const numeric = Number(amount.replace(/[^0-9.]/g, ''));
  const hasValue = amount.length > 0 && !Number.isNaN(numeric) && numeric > 0;

  const fullDeposit = hasValue ? Math.round((numeric * deposit.pct) / 100) : null;
  const reducedDeposit =
    hasValue && deposit.reducibleToPct ? Math.round((numeric * deposit.reducibleToPct) / 100) : null;

  return (
    <div>
      <label className="field-label" htmlFor="deposit-base">
        {mode === 'advocate' ? deposit.basis : 'The amount your deposit is calculated on'}
      </label>
      <input
        id="deposit-base"
        type="text"
        className="date-input"
        placeholder="₹"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {hasValue && fullDeposit !== null && (
        <div className="deposit-result">
          <div className="deposit-row">
            <span className="deposit-row-label">Standard deposit ({deposit.pct}%)</span>
            <span className="deposit-row-value">{formatINR(fullDeposit)}</span>
          </div>
          {reducedDeposit !== null && (
            <div className="deposit-row deposit-row-reduced">
              <span className="deposit-row-label">
                Possible reduced deposit ({deposit.reducibleToPct}%)
                {deposit.reductionAt && <span className="deposit-row-note"> — {deposit.reductionAt}</span>}
              </span>
              <span className="deposit-row-value">{formatINR(reducedDeposit)}</span>
            </div>
          )}
          <p className="deposit-provision">
            Under {deposit.provision}.{' '}
            {deposit.note ?? 'Confirm this percentage against the current statutory text before relying on it — these figures are amended from time to time.'}
          </p>
        </div>
      )}
    </div>
  );
}
