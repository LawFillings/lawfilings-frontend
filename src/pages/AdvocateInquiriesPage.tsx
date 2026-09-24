import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/language';
import { getMyInquiries, markInquiryRead, type AdvocateInquiry } from '../lib/advocateDirectoryClient';
import './FindAdvocatePage.css';
import './AdvocateInquiriesPage.css';

interface Props {
  onBack: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function AdvocateInquiriesPage({ onBack }: Props) {
  const { t } = useLanguage();
  const ai = t.advocateDirectory.inquiries;
  const { user, token } = useAuth();
  const [inquiries, setInquiries] = useState<AdvocateInquiry[] | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyInquiries(token)
      .then(setInquiries)
      .catch(() => setInquiries([]));
  }, [token]);

  const handleOpen = (inq: AdvocateInquiry) => {
    if (inq.status === 'new' && token) {
      markInquiryRead(inq.id, token).catch(() => {});
      setInquiries((list) => list?.map((x) => (x.id === inq.id ? { ...x, status: 'read' } : x)) ?? list);
    }
  };

  if (user?.role !== 'advocate') {
    return (
      <div className="fa-page">
        <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0 }}>
          {t.common.back}
        </button>
        <p className="step-help">{t.advocateDirectory.advocateOnly}</p>
      </div>
    );
  }

  return (
    <div className="fa-page ai-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>
      <h1 className="mal-title">{ai.title}</h1>
      <p className="step-help">{ai.intro}</p>

      {inquiries === null && <p className="step-help">{t.common.loading}</p>}
      {inquiries !== null && inquiries.length === 0 && (
        <p className="step-help">{ai.noInquiries}</p>
      )}

      <div className="ai-list">
        {inquiries?.map((inq) => (
          <div key={inq.id} className={inq.status === 'new' ? 'ai-card ai-card-new' : 'ai-card'} onClick={() => handleOpen(inq)}>
            <div className="ai-card-head">
              <span className="ai-card-name">
                {inq.senderName}
                {inq.status === 'new' && <span className="ai-badge">{ai.newBadge}</span>}
              </span>
              <span className="ai-card-date">{formatDate(inq.createdAt)}</span>
            </div>
            <p className="ai-card-contact">
              {[inq.senderEmail, inq.senderPhone].filter(Boolean).join(' · ') || ai.noContact}
              {inq.forumType ? ` · ${inq.forumType}` : ''}
              {inq.state ? ` · ${inq.state}` : ''}
            </p>
            <p className="ai-card-message">{inq.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
