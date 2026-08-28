import { useLanguage } from '../lib/language';
import './LegalDocPage.css';

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface Props {
  onBack: () => void;
  eyebrow: string;
  title: string;
  effectiveDate?: string;
  intro: string;
  /** Rendered as a highlighted card right after the intro — used by the Grievance Officer page
   *  for the officer's actual name/contact details, which need to stand out from the surrounding
   *  prose rather than read as just another paragraph. */
  highlightCard?: { heading: string; rows: { label: string; value: string }[] };
  sections: LegalSection[];
}

export function LegalDocPage({ onBack, eyebrow, title, effectiveDate, intro, highlightCard, sections }: Props) {
  const { t } = useLanguage();

  return (
    <div className="legal-doc-page">
      <button className="back-link" onClick={onBack} style={{ margin: 0, padding: 0, marginBottom: 'var(--space-5)' }}>
        {t.common.back}
      </button>

      <header className="legal-doc-hero">
        <p className="legal-doc-eyebrow">{eyebrow}</p>
        <h1 className="legal-doc-title">{title}</h1>
        {effectiveDate && <p className="legal-doc-date">{effectiveDate}</p>}
        <p className="legal-doc-intro">{intro}</p>
      </header>

      {highlightCard && (
        <div className="legal-doc-card">
          <h2 className="legal-doc-card-heading">{highlightCard.heading}</h2>
          <dl className="legal-doc-card-grid">
            {highlightCard.rows.map((row) => (
              <div className="legal-doc-card-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {sections.map((section) => (
        <section className="legal-doc-section" key={section.heading}>
          <h2 className="legal-doc-section-heading">{section.heading}</h2>
          {section.paragraphs.map((p, i) => (
            <p className="legal-doc-section-body" key={i}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
