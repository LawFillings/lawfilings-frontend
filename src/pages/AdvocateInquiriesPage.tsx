import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
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
          Back
        </button>
        <p className="step-help">This page is for advocate accounts.</p>
      </div>
    );
  }

  return (
    <div className="fa-page ai-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        Back
      </button>
      <h1 className="mal-title">Inquiries</h1>
      <p className="step-help">Messages sent to you through your directory listing.</p>

      {inquiries === null && <p className="step-help">Loading…</p>}
      {inquiries !== null && inquiries.length === 0 && (
        <p className="step-help">No inquiries yet — they'll show up here once someone contacts you from the directory.</p>
      )}

      <div className="ai-list">
        {inquiries?.map((inq) => (
          <div key={inq.id} className={inq.status === 'new' ? 'ai-card ai-card-new' : 'ai-card'} onClick={() => handleOpen(inq)}>
            <div className="ai-card-head">
              <span className="ai-card-name">
                {inq.senderName}
                {inq.status === 'new' && <span className="ai-badge">New</span>}
              </span>
              <span className="ai-card-date">{formatDate(inq.createdAt)}</span>
            </div>
            <p className="ai-card-contact">
              {[inq.senderEmail, inq.senderPhone].filter(Boolean).join(' · ') || 'No contact on file'}
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
