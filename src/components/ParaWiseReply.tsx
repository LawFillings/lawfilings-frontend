import { useState } from 'react';
import type { ParaResponse } from '../types';
import './ParaWiseReply.css';

interface Allegation {
  id: number;
  text: string;
}

interface ParaWiseReplyProps {
  allegations: Allegation[];
  value?: Record<number, ParaResponse>;
  onChange?: (responses: Record<number, ParaResponse>) => void;
}

const OPTIONS: Exclude<ParaResponse, null>[] = ['Admit', 'Deny', 'No knowledge'];

export function ParaWiseReply({ allegations, value, onChange }: ParaWiseReplyProps) {
  const [internal, setInternal] = useState<Record<number, ParaResponse>>({});
  const responses = value ?? internal;

  const setResponse = (id: number, response: ParaResponse) => {
    const next = { ...responses, [id]: response };
    if (onChange) onChange(next);
    else setInternal(next);
  };

  return (
    <div className="para-list">
      {allegations.map((a) => (
        <div className="para-row" key={a.id}>
          <p className="para-text">{a.text}</p>
          <div className="para-options">
            {OPTIONS.map((opt) => (
              <button
                key={opt}
                className={responses[a.id] === opt ? 'para-btn active' : 'para-btn'}
                onClick={() => setResponse(a.id, opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
