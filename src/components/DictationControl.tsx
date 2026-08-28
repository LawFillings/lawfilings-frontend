import { useDictation } from '../lib/useDictation';
import { useLanguage } from '../lib/language';
import './DictationControl.css';

/**
 * A single floating mic button, mounted once at the app shell level, that dictates into
 * whichever text input/textarea the user last focused — see useDictation.ts for why this is one
 * global control rather than a mic icon wired into every field individually.
 */
export function DictationControl() {
  const { language, t } = useLanguage();
  const { isSupported, isListening, hasTarget, toggle } = useDictation(language === 'hi' ? 'hi-IN' : 'en-IN');

  return (
    <button
      type="button"
      className={isListening ? 'dictation-fab listening' : 'dictation-fab'}
      onClick={toggle}
      disabled={!isSupported || (!hasTarget && !isListening)}
      title={
        !isSupported
          ? t.dictation.unsupported
          : isListening
            ? t.dictation.stop
            : hasTarget
              ? t.dictation.start
              : t.dictation.noField
      }
      aria-label={isSupported ? (isListening ? t.dictation.stop : t.dictation.start) : t.dictation.unsupported}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 11a7 7 0 0 1-14 0M12 18v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isListening && <span className="dictation-fab-pulse" aria-hidden="true" />}
    </button>
  );
}
