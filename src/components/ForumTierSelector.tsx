import { useState } from 'react';
import type { JurisdictionRule, UserRole } from '../types';
import './ForumTierSelector.css';

interface ForumTierSelectorProps {
  rule: JurisdictionRule;
  mode: UserRole;
  onValueChange?: (value: number) => void;
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export function ForumTierSelector({ rule, mode, onValueChange }: ForumTierSelectorProps) {
  const [value, setValue] = useState(500000);

  if (rule.ruleType !== 'pecuniary_tier' || !rule.tiers) {
    return (
      <div className="deadline-card status-warn">
        <p className="deadline-body">This forum doesn't use a claim-value tier for jurisdiction — a different selector applies.</p>
      </div>
    );
  }

  const matchedTier = rule.tiers.find(
    (t) => (t.min === undefined || value >= t.min) && (t.max === undefined || value < t.max)
  );

  const handleChange = (v: number) => {
    setValue(v);
    onValueChange?.(v);
  };

  return (
    <div>
      <label className="field-label" htmlFor="claim-value">
        {mode === 'advocate' ? 'Value of consideration paid' : 'How much did you pay for the goods or service?'}
      </label>
      <input
        id="claim-value"
        type="range"
        min={10000}
        max={50000000}
        step={10000}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="tier-slider"
      />
      <div className="tier-value-row">
        <span>Amount</span>
        <span className="tier-value">{formatINR(value)}</span>
      </div>

      {matchedTier && (
        <div className="tier-result">
          <p className="tier-result-label">Recommended forum</p>
          <p className="tier-result-name">{matchedTier.forumLabel}</p>
          {rule.note && <p className="tier-result-note">{rule.note}</p>}
        </div>
      )}
    </div>
  );
}
