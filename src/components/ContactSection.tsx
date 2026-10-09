import { useLanguage } from '../lib/language';
import { ContactForm } from './ContactForm';
import './ContactSection.css';

const SUPPORT_EMAIL = 'admin@lawfilings.in';

/** "Have a question or feedback?" band at the bottom of the home page, above the footer, so a
 *  visitor can write to us without hunting through a menu. Same form (and tickets) as the
 *  Contact & Feedback page. */
export function ContactSection() {
  const { t } = useLanguage();
  const c = t.contact;
  return (
    <section className="landing-contact" id="contact-feedback">
      <div className="landing-contact-inner">
        <ContactForm
          variant="landing"
          intro={
            <>
              <p className="landing-contact-eyebrow">{c.eyebrow}</p>
              <h2 className="landing-contact-title">{c.homeTitle}</h2>
              <p className="landing-contact-sub">{c.formNote}</p>
              <a className="landing-contact-email" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </>
          }
        />
      </div>
    </section>
  );
}
