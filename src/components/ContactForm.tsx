import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { fmt } from '../lib/format';
import '../pages/ContactPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

const CATEGORY_KEYS = ['general', 'billing', 'draft', 'account', 'feedback', 'complaint'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The contact/feedback form and its success screen — shared by the Contact page and the home-page
 *  section so both behave identically. */
export function ContactForm({ showNote = true }: { showNote?: boolean } = {}) {
  const { t, language } = useLanguage();
  const { user, token } = useAuth();
  const c = t.contact;

  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: real visitors never see or fill this
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ref: string; emailed: boolean } | null>(null);

  const categoryLabels: Record<CategoryKey, string> = {
    general: c.categoryGeneral,
    billing: c.categoryBilling,
    draft: c.categoryDraft,
    account: c.categoryAccount,
    feedback: c.categoryFeedback,
    complaint: c.categoryComplaint,
  };

  // Editing any field dismisses a stale validation message instead of leaving it on screen.
  const edit = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    if (error) setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    if (!name.trim() || !EMAIL_RE.test(email.trim()) || !category || message.trim().length < 10) {
      setError(c.errorRequired);
      return;
    }
    setError(null);
    setState('sending');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, email, phone, category, message, language, website }),
      });
      if (res.status === 429) throw new Error(c.errorTooMany);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ticketRef) throw new Error(c.errorGeneric);
      setResult({ ref: data.ticketRef, emailed: Boolean(data.emailed) });
      setState('done');
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : c.errorGeneric);
      setState('idle');
    }
  };

  const reset = () => {
    setMessage('');
    setCategory('');
    setResult(null);
    setError(null);
    setState('idle');
  };

  return (
    <div className="contact-formwrap">
      {state === 'done' && result ? (
        <div className="contact-success" role="status">
          <h2 className="contact-success-title">{c.successTitle}</h2>
          <p>{fmt(result.emailed ? c.successBody : c.successBodyNoEmail, { ref: result.ref, email })}</p>
          <button type="button" className="contact-send-btn" onClick={reset}>
            {c.successAnother}
          </button>
        </div>
      ) : (
        <>
          {showNote && <p className="contact-form-note">{c.formNote}</p>}
          <form className="contact-form" onSubmit={submit} noValidate>
            <label className="form-field">
              <span>{c.nameLabel}</span>
              <input type="text" value={name} maxLength={100} autoComplete="name" onChange={edit(setName)} />
            </label>
            <label className="form-field contact-field-gap">
              <span>{c.emailFieldLabel}</span>
              <input type="email" value={email} maxLength={200} autoComplete="email" onChange={edit(setEmail)} />
            </label>
            <label className="form-field contact-field-gap">
              <span>{c.phoneLabel}</span>
              <input type="tel" value={phone} maxLength={25} autoComplete="tel" onChange={edit(setPhone)} />
            </label>
            <label className="form-field contact-field-gap">
              <span>{c.categoryLabel}</span>
              <select value={category} onChange={edit((v) => setCategory(v as CategoryKey | ''))}>
                <option value="">{c.categoryPlaceholder}</option>
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {categoryLabels[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field contact-field-gap">
              <span>{c.messageLabel}</span>
              <textarea className="facts-textarea" rows={6} maxLength={4000} value={message} onChange={edit(setMessage)} />
            </label>
            <input
              className="contact-honeypot"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            {error && (
              <p className="contact-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="contact-send-btn" disabled={state === 'sending'}>
              {state === 'sending' ? c.sending : c.sendButton}
            </button>
            <p className="contact-consent">{c.consentNote}</p>
          </form>
        </>
      )}
    </div>
  );
}
