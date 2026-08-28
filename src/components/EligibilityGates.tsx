import { useState } from 'react';
import type { EligibilityGate } from '../types';
import './EligibilityGates.css';

interface GateResult {
  status: 'blocked' | 'warned';
  message: string;
}

interface EligibilityGatesProps {
  gates: EligibilityGate[];
  onAllClear?: () => void;
  onBlocked?: (blocked: boolean) => void;
}

export function EligibilityGates({ gates, onAllClear, onBlocked }: EligibilityGatesProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, GateResult>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const evaluate = (gate: EligibilityGate, rawValue: string) => {
    let result: GateResult | null = null;

    if (gate.kind === 'yes_no') {
      const v = rawValue as 'yes' | 'no';
      if (gate.blockOnAnswer && v === gate.blockOnAnswer) {
        result = { status: 'blocked', message: gate.blockMessage ?? 'This doesn’t meet the requirements to proceed.' };
      } else if (gate.warnOnAnswer && v === gate.warnOnAnswer) {
        result = { status: 'warned', message: gate.warnMessage ?? 'Proceed carefully — this needs extra attention.' };
      }
    } else if (gate.kind === 'number') {
      const num = Number(rawValue);
      if (gate.blockBelow !== undefined && num < gate.blockBelow) {
        result = { status: 'blocked', message: gate.blockBelowMessage ?? 'This value is below the required threshold.' };
      }
    }

    const newAnswers = { ...answers, [gate.id]: rawValue };
    setAnswers(newAnswers);

    if (result) {
      setResults((r) => ({ ...r, [gate.id]: result! }));
      if (result.status === 'blocked') {
        setBlocked(true);
        onBlocked?.(true);
        return;
      }
    }

    const nextIndex = activeIndex + 1;
    if (nextIndex >= gates.length) {
      onAllClear?.();
    } else {
      setActiveIndex(nextIndex);
    }
  };

  return (
    <div className="gate-list">
      {gates.slice(0, activeIndex + 1).map((gate, i) => {
        const isAnswered = answers[gate.id] !== undefined;
        const result = results[gate.id];
        const isBlockedHere = result?.status === 'blocked';

        return (
          <div className="gate-item" key={gate.id}>
            <p className="gate-question">{gate.question}</p>
            {gate.helpText && <p className="gate-help">{gate.helpText}</p>}

            {!isAnswered && i === activeIndex && !blocked && (
              <>
                {gate.kind === 'yes_no' ? (
                  <div className="gate-options">
                    <button className="para-btn" onClick={() => evaluate(gate, 'yes')}>
                      Yes
                    </button>
                    <button className="para-btn" onClick={() => evaluate(gate, 'no')}>
                      No
                    </button>
                  </div>
                ) : (
                  <div className="gate-number-row">
                    <input
                      type="number"
                      className="date-input"
                      placeholder="₹"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') evaluate(gate, (e.target as HTMLInputElement).value);
                      }}
                      id={`gate-num-${gate.id}`}
                    />
                    <button
                      className="para-btn"
                      onClick={() => {
                        const el = document.getElementById(`gate-num-${gate.id}`) as HTMLInputElement;
                        evaluate(gate, el.value);
                      }}
                    >
                      Continue
                    </button>
                  </div>
                )}
              </>
            )}

            {isAnswered && (
              <p className="gate-answer">
                Your answer: <strong>{answers[gate.id] === 'yes' ? 'Yes' : answers[gate.id] === 'no' ? 'No' : `₹${Number(answers[gate.id]).toLocaleString('en-IN')}`}</strong>
              </p>
            )}

            {result && (
              <div className={`deadline-card status-${result.status === 'blocked' ? 'danger' : 'warn'}`}>
                <p className="deadline-label">{result.status === 'blocked' ? 'This stops here' : 'Proceed with caution'}</p>
                <p className="deadline-body">{result.message}</p>
              </div>
            )}

            {isBlockedHere && <div className="gate-stop-line" />}
          </div>
        );
      })}
    </div>
  );
}
