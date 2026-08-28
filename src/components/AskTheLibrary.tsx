import { useEffect, useState } from 'react';
import { acts } from '../data/lawLibraryData';
import { askLibrary, askGeneral, logSearchGap, type ActQaTurn } from '../lib/lawLibraryAiClient';
import { searchLibrarySections } from '../lib/searchLibrarySections';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import './AskAboutAct.css';

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * The single global Q&A entry point for the Law Library — always visible below the
 * Constitution/Acts dropdown, independent of whatever Act or Part (if any) is currently open.
 * Replaces the earlier per-Act "Ask about this Act" panel: since the search underneath already
 * looked across the whole Library whenever the currently-open Act/Part didn't cover a question,
 * keeping a second, per-page copy of the same panel added no capability, only duplicate UI and
 * duplicate places a question could be typed — a cost/complexity call, not a capability change.
 *
 * Two distinct answer modes render differently on purpose: a 'grounded' turn is traceable to
 * verbatim sourced Act text; a 'general' turn is the model's own knowledge, offered only when the
 * grounded search comes up empty, and always shown with its own badge/disclaimer so the two are
 * never visually interchangeable.
 */
interface Props {
  onOpenLogin: () => void;
}

export function AskTheLibrary({ onOpenLogin }: Props) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const copy = t.lawLibrary.askAi;
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ActQaTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Set only right after a zero-search-match miss, so the "get a general answer" offer appears
  // exactly once for the question that triggered it, not permanently once any miss has occurred.
  const [offerGeneralFor, setOfferGeneralFor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [loading]);

  const historyForApi = () => turns.map((turn) => ({ question: turn.question, answer: turn.answer }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setOfferGeneralFor(null);

    const matches = searchLibrarySections(trimmed);
    if (matches.length === 0) {
      logSearchGap(trimmed);
      await askGeneralFor(trimmed);
      return;
    }

    const result = await askLibrary(matches, trimmed, historyForApi(), language);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTurns((prev) => [
      ...prev,
      {
        question: trimmed,
        answer: result.answer,
        citedSections: result.citedSections,
        answeredFromProvidedText: result.answeredFromProvidedText,
        mode: 'grounded',
      },
    ]);
    if (!result.answeredFromProvidedText) {
      setOfferGeneralFor(trimmed);
    }
    setQuestion('');
  };

  const askGeneralFor = async (q: string) => {
    setLoading(true);
    setError(null);
    setOfferGeneralFor(null);

    const result = await askGeneral(q, historyForApi(), language);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTurns((prev) => [
      ...prev,
      { question: q, answer: result.answer, citedSections: [], answeredFromProvidedText: false, mode: 'general' },
    ]);
    setQuestion('');
  };

  return (
    <div className="aaa-panel">
      <p className="aaa-heading">{copy.heading}</p>
      <p className="aaa-intro">{copy.intro}</p>

      {!user && (
        <div className="aaa-login-gate">
          <p>{copy.logInPrompt}</p>
          <button type="button" className="para-btn" onClick={onOpenLogin}>
            {t.common.logIn}
          </button>
        </div>
      )}

      {user && turns.length > 0 && (
        <div className="aaa-turns">
          {turns.map((turn, i) => (
            <div className={`aaa-turn${turn.mode === 'general' ? ' aaa-turn-general' : ''}`} key={i}>
              {turn.mode === 'general' && <span className="aaa-general-badge">{copy.generalInfoBadge}</span>}
              <p className="aaa-question">{turn.question}</p>
              <p className="aaa-answer">
                {turn.mode === 'grounded' && !turn.answeredFromProvidedText
                  ? `${turn.answer} ${copy.notInText}`
                  : turn.answer}
              </p>
              {turn.mode === 'general' && <p className="aaa-general-disclaimer">{copy.generalInfoDisclaimer}</p>}
              {turn.citedSections.length > 0 && (
                <p className="aaa-cited">
                  {copy.citedSections}{' '}
                  {turn.citedSections.map((citation, ci) => {
                    const citedAct = acts.find((a) => a.shortTitle === citation.actShortTitle);
                    const label = `${citation.actShortTitle} §${citation.sectionNo}`;
                    return citedAct ? (
                      <a
                        className="aaa-cited-chip"
                        key={`${citation.actShortTitle}-${citation.sectionNo}-${ci}`}
                        href={citedAct.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="aaa-cited-chip" key={`${citation.actShortTitle}-${citation.sectionNo}-${ci}`}>
                        {label}
                      </span>
                    );
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {user && error && <p className="aaa-error">{error}</p>}

      {user && offerGeneralFor && !loading && (
        <div className="aaa-general-offer">
          <p>{copy.generalInfoOffer}</p>
          <button type="button" className="para-btn" onClick={() => askGeneralFor(offerGeneralFor)}>
            {copy.generalInfoButton}
          </button>
        </div>
      )}

      {user && (
        <form className="aaa-form" onSubmit={submit}>
          <input
            type="text"
            className="aaa-input"
            placeholder={copy.placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="aaa-submit"
            disabled={loading || question.trim().length === 0}
            aria-label={loading ? copy.asking : copy.submit}
          >
            {loading ? (
              <span className="aaa-submit-timer">
                <span className="aaa-spinner" aria-hidden="true" />
                {formatElapsed(elapsedSeconds)}
              </span>
            ) : (
              copy.submit
            )}
          </button>
        </form>
      )}

      {user && turns.length > 0 && (
        <button type="button" className="aaa-clear" onClick={() => setTurns([])}>
          {copy.clear}
        </button>
      )}
    </div>
  );
}
