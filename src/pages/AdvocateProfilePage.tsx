import { useEffect, useState } from 'react';
import { forums } from '../data/mockData';
import { districtCourtStates } from '../data/districtCourtLocations';
import { LANGUAGES, useLanguage } from '../lib/language';
import { useAuth } from '../lib/auth';
import { getAdvocate, sendAdvocateInquiry, type AdvocateListing } from '../lib/advocateDirectoryClient';
import { ApiError } from '../lib/apiError';
import { fmt } from '../lib/format';
import './FindAdvocatePage.css';
import './AdvocateProfilePage.css';

interface Props {
  advocateId: string;
  onBack: () => void;
}

const FORUM_LABEL: Record<string, string> = Object.fromEntries(forums.map((f) => [f.forumType, f.name]));
const LANGUAGE_LABEL: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.label]));

export function AdvocateProfilePage({ advocateId, onBack }: Props) {
  const { t } = useLanguage();
  const ap = t.advocateDirectory.profile;
  const { token } = useAuth();
  const [advocate, setAdvocate] = useState<AdvocateListing | null | 'error'>(null);
  const [message, setMessage] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    getAdvocate(advocateId)
      .then(setAdvocate)
      .catch(() => setAdvocate('error'));
  }, [advocateId]);

  const handleSend = async () => {
    if (!token || !message.trim()) return;
    setSendState('sending');
    setSendError(null);
    try {
      await sendAdvocateInquiry(advocateId, { message: message.trim() }, token);
      setSendState('sent');
    } catch (err) {
      setSendState('error');
      setSendError(err instanceof ApiError ? err.message : ap.sendError);
    }
  };

  return (
    <div className="fa-page ap-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {ap.backToDirectory}
      </button>

      {advocate === null && <p className="step-help">{t.common.loading}</p>}
      {advocate === 'error' && (
        <div className="fa-error">{ap.notListed}</div>
      )}

      {advocate && advocate !== 'error' && (
        <div className="ap-card">
          <h1 className="ap-name">{advocate.fullName}</h1>
          <p className="ap-meta">
            {[advocate.city, districtCourtStates.find((s) => s.id === advocate.practiceState)?.label ?? advocate.practiceState]
              .filter(Boolean)
              .join(', ')}
            {advocate.barState ? ` · ${fmt(t.advocateDirectory.find.barCouncilOf, { state: advocate.barState })}` : ''}
            {advocate.practicingSinceYear ? ` · ${fmt(ap.practicingSince, { year: advocate.practicingSinceYear })}` : ''}
          </p>

          {advocate.practiceForums.length > 0 && (
            <div className="fa-card-chips">
              {advocate.practiceForums.map((f) => (
                <span className="fa-chip" key={f}>
                  {FORUM_LABEL[f] ?? f}
                </span>
              ))}
            </div>
          )}
          {advocate.languages.length > 0 && (
            <p className="ap-languages">{fmt(ap.speaks, { languages: advocate.languages.map((l) => LANGUAGE_LABEL[l] ?? l).join(', ') })}</p>
          )}
          {advocate.bio && <p className="ap-bio">{advocate.bio}</p>}

          <div className="ap-contact">
            <h2 className="ap-contact-heading">{ap.sendHeading}</h2>
            <p className="step-help">
              {fmt(ap.sendHelp, { name: advocate.fullName })}
            </p>
            {sendState === 'sent' ? (
              <p className="ap-sent">{fmt(ap.sentMessage, { name: advocate.fullName })}</p>
            ) : (
              <>
                <textarea
                  className="ap-textarea"
                  rows={5}
                  maxLength={2000}
                  placeholder={ap.messagePlaceholder}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {sendState === 'error' && sendError && <div className="fa-error">{sendError}</div>}
                <button className="para-btn" onClick={handleSend} disabled={!message.trim() || sendState === 'sending'}>
                  {sendState === 'sending' ? ap.sending : ap.send}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
