import { useEffect, useRef, useState } from 'react';
import { detectThirdPartyMentions, type ThirdPartyMention } from '../lib/apiClient';
import { useSettings } from '../lib/settings';
import './ThirdPartyNudge.css';

interface ThirdPartyNudgeProps {
  text: string;
  knownPartyNames: string[];
  /** How long to wait after typing stops before checking, in ms */
  debounceMs?: number;
}

/**
 * Watches a free-text field and, after the user pauses typing, checks for mentions of people
 * who aren't already declared as parties to the case. Never blocks or edits the text — this is
 * awareness, not moderation. Fails silently if the backend/AI copilot is unavailable.
 */
export function ThirdPartyNudge({ text, knownPartyNames, debounceMs = 1500 }: ThirdPartyNudgeProps) {
  const { settings } = useSettings();
  const enabled = settings.wizard.widgets.thirdPartyNudge;
  const [mentions, setMentions] = useState<ThirdPartyMention[]>([]);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setDismissed(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (text.trim().length < 10) {
        setMentions([]);
        return;
      }
      setChecking(true);
      const result = await detectThirdPartyMentions(text, knownPartyNames);
      setMentions(result);
      setChecking(false);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!enabled) return null;

  if (dismissed || mentions.length === 0) {
    return checking ? <p className="tpn-checking">Checking for other people mentioned…</p> : null;
  }

  return (
    <div className="tpn-card">
      <div className="tpn-header">
        <p className="tpn-title">Other people mentioned</p>
        <button className="tpn-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          ×
        </button>
      </div>
      <p className="tpn-body">
        This is normal for a factual account, but their details are now part of your filing — worth
        double-checking you've named them accurately and only where necessary.
      </p>
      <ul className="tpn-list">
        {mentions.map((m, i) => (
          <li key={i} className="tpn-item">
            <span className="tpn-name">{m.mentionedText}</span>
            <span className="tpn-context">"{m.context}"</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
