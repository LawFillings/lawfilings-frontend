import { useState } from 'react';
import { useLanguage } from '../lib/language';
import './ContactPage.css';

// There's no backend endpoint to receive a submitted form yet, so this page is deliberately built
// around mailto: (opens the visitor's own email client with the message pre-filled) rather than
// pretending to submit somewhere that doesn't exist.
const SUPPORT_EMAIL = 'admin@lawfilings.in';

interface Props {
  onBack: () => void;
}

export function ContactPage({ onBack }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Message from ${name || 'LawFilings site'}`
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="contact-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="contact-hero">
        <p className="contact-eyebrow">{t.contact.eyebrow}</p>
        <h1 className="contact-title">{t.contact.title}</h1>
        <p className="contact-sub">{t.contact.sub}</p>
      </header>

      <div className="contact-email-row">
        <span className="contact-email-label">{t.contact.emailLabel}</span>
        <a className="contact-email-value" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </div>

      <p className="contact-form-note">{t.contact.formNote}</p>

      <div className="contact-form">
        <label className="form-field">
          <span>{t.contact.nameLabel}</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field" style={{ marginTop: 'var(--space-4)' }}>
          <span>{t.contact.messageLabel}</span>
          <textarea className="facts-textarea" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <a className="contact-send-btn" href={mailtoHref}>
          {t.contact.sendButton}
        </a>
      </div>
    </div>
  );
}
