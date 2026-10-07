import { useLanguage } from '../lib/language';
import { ContactForm } from '../components/ContactForm';
import '../styles/split-page.css';
import './ContactPage.css';

const SUPPORT_EMAIL = 'admin@lawfilings.in';
// Shown on the page only when set — add the public support number here once there is one.
const SUPPORT_PHONE: string = '';

interface Props {
  onBack: () => void;
  onOpenPricing: () => void;
  onOpenGrievanceOfficer: () => void;
  onOpenPrivacyPolicy: () => void;
}

/** Contact & Feedback in the site's shared full-width three-panel scheme (see split-page.css):
 *  hero + contact details on the left, the form in the centre, what-happens-next and related pages
 *  on the right. */
export function ContactPage({ onBack, onOpenPricing, onOpenGrievanceOfficer, onOpenPrivacyPolicy }: Props) {
  const { t } = useLanguage();
  const c = t.contact;

  return (
    <div className="contact-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <div className="trio-card">
        <aside className="trio-left">
          <p className="contact-eyebrow">{c.eyebrow}</p>
          <h1 className="contact-title">{c.title}</h1>
          <p className="contact-sub">{c.sub}</p>

          <div className="contact-details">
            <span className="contact-detail-label">{c.emailLabel}</span>
            <a className="contact-detail-value" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            {SUPPORT_PHONE && (
              <>
                <span className="contact-detail-label">{c.phoneLabel.replace(/\s*\(.*\)\s*$/, '')}</span>
                <a className="contact-detail-value" href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}>
                  {SUPPORT_PHONE}
                </a>
              </>
            )}
          </div>
        </aside>

        <main className="trio-center contact-center">
          <ContactForm />
        </main>

        <aside className="trio-right">
          <div className="contact-next">
            <h2 className="contact-next-title">{c.nextTitle}</h2>
            <ol className="contact-next-steps">
              <li>{c.nextStep1}</li>
              <li>{c.nextStep2}</li>
              <li>{c.nextStep3}</li>
            </ol>
          </div>
          <button type="button" className="trio-nudge-card" onClick={onOpenGrievanceOfficer}>
            {t.landing.footer.grievanceOfficer}
          </button>
          <button type="button" className="trio-nudge-card" onClick={onOpenPricing}>
            {t.nav.pricing}
          </button>
          <button type="button" className="trio-nudge-card" onClick={onOpenPrivacyPolicy}>
            {t.landing.footer.privacyPolicy}
          </button>
        </aside>
      </div>
    </div>
  );
}
